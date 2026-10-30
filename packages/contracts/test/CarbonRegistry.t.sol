// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Halo2Verifier} from "../src/verifiers/Halo2Verifier.sol";
import {CarbonRegistry} from "../src/CarbonRegistry.sol";
import {BaselineCentralRegistry} from "../src/baseline/BaselineCentralRegistry.sol";

/// @title CarbonRegistryHandler
/// @notice Stateful invariant-testing handler exercising `registerProject`, `issue`, and `retireAmounts`
///         against the real `Halo2Verifier` and `CarbonRegistry`.
contract CarbonRegistryHandler is Test {
    CarbonRegistry public immutable registry;
    bytes public validProof;
    bytes32 public immutable validDataCommitment;
    uint256 public immutable validAmount;

    address public immutable registrar;
    uint256 public issuedBatchCount;

    constructor(
        CarbonRegistry _registry,
        bytes memory _validProof,
        bytes32 _validDataCommitment,
        uint256 _validAmount,
        address _registrar
    ) {
        registry = _registry;
        validProof = _validProof;
        validDataCommitment = _validDataCommitment;
        validAmount = _validAmount;
        registrar = _registrar;
    }

    /// @notice Fuzzed handler action: registers a new project and issues a verified batch.
    function actionIssue(uint64 plotSeed, uint16 vintageOffset, uint8 creditType) external {
        bytes8 geohash8 = bytes8(uint64(0x367a393030303030) ^ plotSeed);
        bytes32 salt = keccak256(abi.encodePacked("handler-salt", plotSeed));
        bytes32 geoCommitment = registry.computeGeoCommitment(geohash8, salt);
        uint16 vintageYear = uint16(2000 + (uint256(vintageOffset) % 50));

        bytes32 nullifier = registry.computeIssuanceNullifier(geoCommitment, vintageYear, creditType);
        if (registry.issuanceNullifierSpent(nullifier)) {
            return;
        }

        bytes32 projectId = keccak256(abi.encodePacked("proj", plotSeed, vintageYear, creditType));
        (, , , , bool exists) = registry.projects(projectId);
        if (exists) {
            return;
        }

        vm.startPrank(registrar);
        registry.registerProject(projectId, geoCommitment, "ipfs://bafybeivericarbonbundle");
        registry.issue(projectId, vintageYear, creditType, validAmount, validDataCommitment, validProof);
        vm.stopPrank();

        issuedBatchCount++;
    }

    /// @notice Fuzzed handler action: retires a partial or full balance from an existing batch.
    function actionRetire(uint256 batchSeed, uint256 burnFraction, uint8 claimType, bytes32 beneficiarySalt)
        external
    {
        if (issuedBatchCount == 0) {
            return;
        }
        uint256 serialId = (batchSeed % issuedBatchCount) + 1;
        uint256 bal = registry.balanceOf(registrar, serialId);
        if (bal == 0) {
            return;
        }

        bytes32 beneficiaryCommitment = keccak256(abi.encodePacked("beneficiary", beneficiarySalt, serialId));
        (,, bytes32 issuanceNullifier,,,,,) = registry.batches(serialId);
        bytes32 claimNullifier =
            registry.computeClaimNullifier(issuanceNullifier, registrar, claimType, beneficiaryCommitment);
        if (registry.claimNullifierSpent(claimNullifier)) {
            return;
        }

        uint256 burnAmount = (burnFraction % bal) + 1;
        uint256[] memory serialIds = new uint256[](1);
        serialIds[0] = serialId;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = burnAmount;

        vm.prank(registrar);
        registry.retireAmounts(serialIds, amounts, claimType, beneficiaryCommitment);
    }
}

/// @title CarbonRegistryTest
/// @notice Unit, Fraud-Scenario (1–6), Baseline Demonstration, Fuzz, and Invariant tests for `CarbonRegistry`.
contract CarbonRegistryTest is StdInvariant, Test {
    using stdJson for string;

    Halo2Verifier internal verifier;
    CarbonRegistry internal registry;
    BaselineCentralRegistry internal baseline;
    CarbonRegistryHandler internal handler;

    address internal admin = makeAddr("admin");
    address internal registryA = makeAddr("registryA");
    address internal registryB = makeAddr("registryB");
    address internal unauthorizedUser = makeAddr("unauthorizedUser");

    bytes internal fixtureProof;
    bytes32 internal fixtureModelHash;
    bytes32 internal fixtureDataCommitment;
    uint256 internal fixtureClaimedAmount;

    bytes8 internal constant SAMPLE_GEOHASH8 = bytes8("6z900000");
    bytes32 internal constant SAMPLE_SALT =
        0x336a0957067d3dcc1bd8e7f99b8f335927e6568939d0055ea5c7ae8517ad30a0;
    string internal constant SAMPLE_CID = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

    function setUp() public {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/../../services/zk/artifacts/proof.json");
        string memory json = vm.readFile(path);

        fixtureProof = json.readBytes(".hex_proof");
        bytes32[] memory rawOutputs = json.readBytes32Array(".pretty_public_inputs.outputs[0]");
        require(rawOutputs.length == 3, "Expected 3 public instances");

        fixtureModelHash = rawOutputs[0];
        fixtureDataCommitment = rawOutputs[1];
        fixtureClaimedAmount = uint256(rawOutputs[2]);

        verifier = new Halo2Verifier();
        registry = new CarbonRegistry(address(verifier), fixtureModelHash, admin);
        baseline = new BaselineCentralRegistry(admin);

        bytes32 regRole = registry.REGISTRY_ROLE();
        vm.startPrank(admin);
        registry.grantRole(regRole, registryA);
        registry.grantRole(regRole, registryB);
        baseline.grantRole(baseline.REGISTRY_ROLE(), registryA);
        baseline.grantRole(baseline.REGISTRY_ROLE(), registryB);
        vm.stopPrank();

        handler = new CarbonRegistryHandler(
            registry, fixtureProof, fixtureDataCommitment, fixtureClaimedAmount, registryA
        );
        targetContract(address(handler));
    }

    // =========================================================================
    // 1. Unit Tests: Happy Path, Role Enforcement, Proof Verification Failure
    // =========================================================================

    /// @notice Verifies the end-to-end happy path: project registration, ZK-verified credit issuance,
    ///         and full credit batch retirement with nullifier recording.
    function test_Unit_HappyPath_RegisterIssueAndRetire() public {
        bytes32 projectId = keccak256("vc-tapajos-001");
        bytes32 geoCommitment = registry.computeGeoCommitment(SAMPLE_GEOHASH8, SAMPLE_SALT);
        uint16 vintageYear = 2024;
        uint8 creditType = 1;

        vm.startPrank(registryA);
        registry.registerProject(projectId, geoCommitment, SAMPLE_CID);

        uint256 serialId = registry.issue(
            projectId, vintageYear, creditType, fixtureClaimedAmount, fixtureDataCommitment, fixtureProof
        );
        assertEq(serialId, 1);
        assertEq(registry.balanceOf(registryA, serialId), fixtureClaimedAmount);
        assertEq(registry.totalIssued(serialId), fixtureClaimedAmount);

        bytes32 expectedIssuanceNullifier =
            registry.computeIssuanceNullifier(geoCommitment, vintageYear, creditType);
        assertTrue(registry.issuanceNullifierSpent(expectedIssuanceNullifier));

        uint256[] memory serialIds = new uint256[](1);
        serialIds[0] = serialId;
        uint8 claimType = 1;
        bytes32 beneficiaryCommitment = keccak256("corp-net-zero-2024");

        registry.retire(serialIds, claimType, beneficiaryCommitment);
        vm.stopPrank();

        assertEq(registry.balanceOf(registryA, serialId), 0);
        assertEq(registry.totalRetired(serialId), fixtureClaimedAmount);

        bytes32 expectedClaimNullifier = registry.computeClaimNullifier(
            expectedIssuanceNullifier, registryA, claimType, beneficiaryCommitment
        );
        assertTrue(registry.claimNullifierSpent(expectedClaimNullifier));
    }

    /// @notice Verifies that callers without `REGISTRY_ROLE` cannot register projects or issue credits.
    function test_Unit_RoleEnforcement_UnauthorizedCallerReverts() public {
        bytes32 projectId = keccak256("unauthorized-project");
        bytes32 geoCommitment = registry.computeGeoCommitment(SAMPLE_GEOHASH8, SAMPLE_SALT);
        bytes32 regRole = registry.REGISTRY_ROLE();

        vm.startPrank(unauthorizedUser);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, unauthorizedUser, regRole
            )
        );
        registry.registerProject(projectId, geoCommitment, SAMPLE_CID);

        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, unauthorizedUser, regRole
            )
        );
        registry.issue(projectId, 2024, 1, fixtureClaimedAmount, fixtureDataCommitment, fixtureProof);
        vm.stopPrank();
    }

    /// @notice Verifies that a corrupted Halo2 proof reverts with `InvalidZKProof`.
    function test_Unit_ProofVerificationFailure_Reverts() public {
        bytes32 projectId = keccak256("vc-tapajos-corrupt");
        bytes32 geoCommitment = registry.computeGeoCommitment(SAMPLE_GEOHASH8, SAMPLE_SALT);

        bytes memory corruptedProof = bytes.concat(fixtureProof);
        corruptedProof[32] = bytes1(uint8(corruptedProof[32]) ^ 0xff);

        vm.startPrank(registryA);
        registry.registerProject(projectId, geoCommitment, SAMPLE_CID);

        vm.expectRevert(CarbonRegistry.InvalidZKProof.selector);
        registry.issue(projectId, 2024, 1, fixtureClaimedAmount, fixtureDataCommitment, corruptedProof);
        vm.stopPrank();
    }

    // =========================================================================
    // 2. Six Explicit Fraud Scenario Tests (Named After Each Attack)
    // =========================================================================

    /// @notice Fraud Scenario (1): Cross-registry double issuance of the same `geoCommitment` + `vintageYear`
    ///         across two distinct registries (`registryA` and `registryB`) MUST revert.
    function test_Attack1_CrossRegistryDoubleIssuanceSameGeoCommitmentAndVintage_Reverts() public {
        bytes32 geoCommitment = registry.computeGeoCommitment(SAMPLE_GEOHASH8, SAMPLE_SALT);
        uint16 vintageYear = 2024;
        uint8 creditType = 1;

        bytes32 projectInRegistryA = keccak256("verra-project-101");
        bytes32 projectInRegistryB = keccak256("gold-standard-project-909");

        // Registry A registers and issues credits for the land parcel in 2024
        vm.startPrank(registryA);
        registry.registerProject(projectInRegistryA, geoCommitment, SAMPLE_CID);
        registry.issue(
            projectInRegistryA, vintageYear, creditType, fixtureClaimedAmount, fixtureDataCommitment, fixtureProof
        );
        vm.stopPrank();

        // Registry B registers the exact same land parcel under a different projectId and attempts
        // to issue credits for the same 2024 vintage. Because issuanceNullifier excludes registryId,
        // it collides on expectedNullifier and reverts!
        bytes32 expectedNullifier = registry.computeIssuanceNullifier(geoCommitment, vintageYear, creditType);

        vm.startPrank(registryB);
        registry.registerProject(projectInRegistryB, geoCommitment, SAMPLE_CID);
        vm.expectRevert(
            abi.encodeWithSelector(CarbonRegistry.IssuanceNullifierAlreadySpent.selector, expectedNullifier)
        );
        registry.issue(
            projectInRegistryB, vintageYear, creditType, fixtureClaimedAmount, fixtureDataCommitment, fixtureProof
        );
        vm.stopPrank();
    }

    /// @notice Fraud Scenario (2): Double issuance within a single registry (both with identical amount
    ///         and with a different amount) MUST revert.
    function test_Attack2_SameRegistryDoubleIssuanceDifferentAmounts_Reverts() public {
        bytes32 projectId = keccak256("vc-single-registry-dup");
        bytes32 geoCommitment = registry.computeGeoCommitment(SAMPLE_GEOHASH8, SAMPLE_SALT);
        uint16 vintageYear = 2024;
        uint8 creditType = 1;

        vm.startPrank(registryA);
        registry.registerProject(projectId, geoCommitment, SAMPLE_CID);
        registry.issue(
            projectId, vintageYear, creditType, fixtureClaimedAmount, fixtureDataCommitment, fixtureProof
        );

        // Attempt 2a: Re-issuing within the same registry with a modified amount reverts in ZK check
        vm.expectRevert(CarbonRegistry.InvalidZKProof.selector);
        registry.issue(
            projectId, vintageYear, creditType, fixtureClaimedAmount - 10, fixtureDataCommitment, fixtureProof
        );

        // Attempt 2b: Re-issuing within the same registry even with a valid proof reverts on issuanceNullifier
        bytes32 expectedNullifier = registry.computeIssuanceNullifier(geoCommitment, vintageYear, creditType);
        vm.expectRevert(
            abi.encodeWithSelector(CarbonRegistry.IssuanceNullifierAlreadySpent.selector, expectedNullifier)
        );
        registry.issue(
            projectId, vintageYear, creditType, fixtureClaimedAmount, fixtureDataCommitment, fixtureProof
        );
        vm.stopPrank();
    }

    /// @notice Fraud Scenario (3): Replay of an identical retirement (`claimNullifier` collision) MUST revert
    ///         even when the claimant still holds remaining unburned credits of that batch.
    function test_Attack3_ReplayIdenticalRetirement_Reverts() public {
        bytes32 projectId = keccak256("vc-replay-retire");
        bytes32 geoCommitment = registry.computeGeoCommitment(SAMPLE_GEOHASH8, SAMPLE_SALT);
        uint16 vintageYear = 2024;
        uint8 creditType = 1;

        vm.startPrank(registryA);
        registry.registerProject(projectId, geoCommitment, SAMPLE_CID);
        uint256 serialId = registry.issue(
            projectId, vintageYear, creditType, fixtureClaimedAmount, fixtureDataCommitment, fixtureProof
        );

        uint256[] memory serialIds = new uint256[](1);
        serialIds[0] = serialId;
        uint256[] memory partialAmounts = new uint256[](1);
        partialAmounts[0] = 200; // Retire 200 out of 544 so registryA still holds 344 tokens

        uint8 claimType = 1;
        bytes32 beneficiaryCommitment = keccak256("acme-scope1-claim-2024");

        // First retirement succeeds and records claimNullifier
        registry.retireAmounts(serialIds, partialAmounts, claimType, beneficiaryCommitment);

        bytes32 issuanceNullifier = registry.computeIssuanceNullifier(geoCommitment, vintageYear, creditType);
        bytes32 expectedClaimNullifier = registry.computeClaimNullifier(
            issuanceNullifier, registryA, claimType, beneficiaryCommitment
        );

        // Replaying the identical retirement parameters reverts with ClaimNullifierAlreadySpent
        vm.expectRevert(
            abi.encodeWithSelector(CarbonRegistry.ClaimNullifierAlreadySpent.selector, expectedClaimNullifier)
        );
        registry.retireAmounts(serialIds, partialAmounts, claimType, beneficiaryCommitment);
        vm.stopPrank();
    }

    /// @notice Fraud Scenario (4): Retiring/claiming against a non-existent issuance `serialId` MUST revert.
    function test_Attack4_ClaimAgainstNonExistentIssuance_Reverts() public {
        uint256 nonExistentSerialId = 999;
        uint256[] memory serialIds = new uint256[](1);
        serialIds[0] = nonExistentSerialId;

        vm.prank(registryA);
        vm.expectRevert(
            abi.encodeWithSelector(CarbonRegistry.BatchDoesNotExist.selector, nonExistentSerialId)
        );
        registry.retire(serialIds, 1, keccak256("beneficiary"));
    }

    /// @notice Fraud Scenario (5): Submitting an evidence/vintage `dataCommitment` that does not match
    ///         the feature commitment bound inside `ezklProof` MUST revert.
    function test_Attack5_EvidenceVintageMismatchVsDataCommitment_Reverts() public {
        bytes32 projectId = keccak256("vc-mismatched-data");
        bytes32 geoCommitment = registry.computeGeoCommitment(SAMPLE_GEOHASH8, SAMPLE_SALT);
        bytes32 mismatchedDataCommitment = bytes32(uint256(fixtureDataCommitment) + 1);

        vm.startPrank(registryA);
        registry.registerProject(projectId, geoCommitment, SAMPLE_CID);

        vm.expectRevert(CarbonRegistry.InvalidZKProof.selector);
        registry.issue(
            projectId, 2024, 1, fixtureClaimedAmount, mismatchedDataCommitment, fixtureProof
        );
        vm.stopPrank();
    }

    /// @notice Fraud Scenario (6): Inflating the claimed `amount` above the model output bound
    ///         proved in `ezklProof` MUST revert.
    function test_Attack6_AmountInflationAboveModelOutput_Reverts() public {
        bytes32 projectId = keccak256("vc-inflated-amount");
        bytes32 geoCommitment = registry.computeGeoCommitment(SAMPLE_GEOHASH8, SAMPLE_SALT);
        uint256 inflatedAmount = fixtureClaimedAmount + 100;

        vm.startPrank(registryA);
        registry.registerProject(projectId, geoCommitment, SAMPLE_CID);

        vm.expectRevert(CarbonRegistry.InvalidZKProof.selector);
        registry.issue(projectId, 2024, 1, inflatedAmount, fixtureDataCommitment, fixtureProof);
        vm.stopPrank();
    }

    // =========================================================================
    // 3. Baseline Demonstration Test: Attack (1) SUCCEEDS on BaselineCentralRegistry
    // =========================================================================

    /// @notice Demonstrates that the exact same cross-registry double-issuance attack from Scenario (1)
    ///         SUCCEEDS on `BaselineCentralRegistry` (which lacks a global cross-registry nullifier set).
    function test_BaselineDemo_CrossRegistryDoubleIssuanceSucceedsOnBaselineRegistry() public {
        bytes32 geoCommitment = registry.computeGeoCommitment(SAMPLE_GEOHASH8, SAMPLE_SALT);
        uint16 vintageYear = 2024;
        uint8 creditType = 1;

        bytes32 projectInRegistryA = keccak256("verra-project-101");
        bytes32 projectInRegistryB = keccak256("gold-standard-project-909");

        // Registry A registers and issues 544 credits for the land parcel in 2024
        vm.startPrank(registryA);
        baseline.registerProject(projectInRegistryA, geoCommitment, SAMPLE_CID);
        uint256 batchA = baseline.issue(projectInRegistryA, vintageYear, creditType, fixtureClaimedAmount);
        vm.stopPrank();

        // Registry B registers the SAME geoCommitment under its own projectId and issues another 544 credits
        // for the SAME 2024 vintage. This INTENTIONALLY SUCCEEDS on BaselineCentralRegistry because prior
        // registry designs lack a registry-agnostic geospatial issuanceNullifier!
        vm.startPrank(registryB);
        baseline.registerProject(projectInRegistryB, geoCommitment, SAMPLE_CID);
        uint256 batchB = baseline.issue(projectInRegistryB, vintageYear, creditType, fixtureClaimedAmount);
        vm.stopPrank();

        assertEq(baseline.balanceOf(registryA, batchA), fixtureClaimedAmount);
        assertEq(baseline.balanceOf(registryB, batchB), fixtureClaimedAmount);
        assertEq(
            baseline.totalIssued(batchA) + baseline.totalIssued(batchB),
            fixtureClaimedAmount * 2,
            "Intentional baseline vulnerability: 2x credits minted for identical land + vintage"
        );
    }

    // =========================================================================
    // 4. Fuzz Tests
    // =========================================================================

    /// @notice Fuzz test verifying that distinct valid `(geohash8, salt, vintageYear, creditType)` tuples
    ///         never collide on `issuanceNullifier`.
    function testFuzz_RandomValidIssuancesNeverCollideOnNullifier(
        bytes8 geohashA,
        bytes32 saltA,
        uint16 vintageA,
        uint8 creditTypeA,
        bytes8 geohashB,
        bytes32 saltB,
        uint16 vintageB,
        uint8 creditTypeB
    ) public view {
        vm.assume(
            geohashA != geohashB || saltA != saltB || vintageA != vintageB || creditTypeA != creditTypeB
        );

        bytes32 geoA = registry.computeGeoCommitment(geohashA, saltA);
        bytes32 geoB = registry.computeGeoCommitment(geohashB, saltB);

        bytes32 nullifierA = registry.computeIssuanceNullifier(geoA, vintageA, creditTypeA);
        bytes32 nullifierB = registry.computeIssuanceNullifier(geoB, vintageB, creditTypeB);

        assertNotEq(nullifierA, nullifierB, "Distinct issuances must never collide on issuanceNullifier");
    }

    // =========================================================================
    // 5. Stateful Invariant Tests
    // =========================================================================

    /// @notice Invariant 1: `totalRetired[tokenId] <= totalIssued[tokenId]` for every issued batch.
    function invariant_TotalRetiredNeverExceedsTotalIssued() public view {
        uint256 maxSerial = registry.nextSerialId();
        for (uint256 tokenId = 1; tokenId < maxSerial; ++tokenId) {
            assertLe(
                registry.totalRetired(tokenId),
                registry.totalIssued(tokenId),
                "Invariant violated: totalRetired > totalIssued"
            );
        }
    }

    /// @notice Invariant 2: No `claimNullifier` is ever recorded twice.
    function invariant_NoClaimNullifierRecordedTwice() public view {
        uint256 count = registry.recordedClaimNullifierCount();
        for (uint256 i = 0; i < count; ++i) {
            bytes32 ni = registry.recordedClaimNullifierAt(i);
            assertTrue(registry.claimNullifierSpent(ni));
            for (uint256 j = i + 1; j < count; ++j) {
                bytes32 nj = registry.recordedClaimNullifierAt(j);
                assertNotEq(ni, nj, "Invariant violated: duplicate claimNullifier recorded");
            }
        }
    }
}
