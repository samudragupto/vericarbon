// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Halo2Verifier} from "../src/verifiers/Halo2Verifier.sol";
import {CarbonRegistry} from "../src/CarbonRegistry.sol";
import {BaselineCentralRegistry} from "../src/baseline/BaselineCentralRegistry.sol";
import {PreA0CarbonRegistry} from "../src/baseline/PreA0CarbonRegistry.sol";

/// @title CarbonRegistryHandler
/// @notice Stateful invariant-testing handler exercising `registerProject`, `issue`, and `retireAmounts`
///         against the real `Halo2Verifier` and post-A0 `CarbonRegistry`.
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
    function actionIssue(uint64 plotSeed, uint8 vintageOffset, uint8 creditTypeRaw) external {
        bytes8 geohash8 = bytes8(uint64(0x367a393030303030) ^ plotSeed);
        bytes32 salt = keccak256(abi.encodePacked("handler-salt", plotSeed));
        bytes32 geoCommitment = registry.computeGeoCommitment(geohash8, salt);

        // Bound vintage year to 2000..2024
        uint16 vintageYear = uint16(2000 + (uint256(vintageOffset) % 25));
        CarbonRegistry.CreditType creditType = (creditTypeRaw % 2 == 0)
            ? CarbonRegistry.CreditType.REMOVAL
            : CarbonRegistry.CreditType.REDUCTION;

        bytes32 nullifier = registry.computeIssuanceNullifier(geohash8, vintageYear, creditType);
        if (registry.issuanceNullifierSpent(nullifier)) {
            return;
        }

        bytes32 projectId = keccak256(abi.encodePacked("proj", plotSeed, vintageYear, uint8(creditType)));
        (, , , , bool exists) = registry.projects(projectId);
        if (exists) {
            return;
        }

        vm.startPrank(registrar);
        registry.registerProject(projectId, geoCommitment, "ipfs://bafybeivericarbonbundle");
        registry.issue(
            projectId,
            geohash8,
            salt,
            vintageYear,
            creditType,
            validAmount,
            validDataCommitment,
            validProof
        );
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
/// @notice Comprehensive unit tests, 2 vulnerability hole tests, 7 Attack Matrix tests (A1–A7),
///         baseline demonstration, fuzzing, and stateful invariant suites.
contract CarbonRegistryTest is StdInvariant, Test {
    using stdJson for string;

    Halo2Verifier internal verifier;
    CarbonRegistry internal registry;
    PreA0CarbonRegistry internal preA0Registry;
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

        vm.warp(1730300000); // 2024-10-30 UTC

        verifier = new Halo2Verifier();
        registry = new CarbonRegistry(address(verifier), fixtureModelHash, admin);
        preA0Registry = new PreA0CarbonRegistry(address(verifier), fixtureModelHash, admin);
        baseline = new BaselineCentralRegistry(admin);

        bytes32 regRole = registry.REGISTRY_ROLE();
        vm.startPrank(admin);
        registry.grantRole(regRole, registryA);
        registry.grantRole(regRole, registryB);
        preA0Registry.grantRole(regRole, registryA);
        preA0Registry.grantRole(regRole, registryB);
        baseline.grantRole(baseline.REGISTRY_ROLE(), registryA);
        baseline.grantRole(baseline.REGISTRY_ROLE(), registryB);
        vm.stopPrank();

        handler = new CarbonRegistryHandler(
            registry, fixtureProof, fixtureDataCommitment, fixtureClaimedAmount, registryA
        );
        targetContract(address(handler));
    }

    // =========================================================================
    // 0. Pre-A0 Vulnerability Hole Proof Tests (Retained Permanently as Evidence)
    // =========================================================================

    /// @notice Demonstrates Hole A (Salt-Dodge): same geohash8, different salts across two registries.
    ///         On pre-A0 contracts, issuanceNullifier depends on geoCommitment (embedding salt).
    ///         Therefore, two registries using different salts for the SAME land plot both succeed in issuance.
    /// @dev Demonstrates the hole; retained permanently as evidence.
    function test_HoleA_SaltDodge() public {
        bytes8 sharedGeohash = SAMPLE_GEOHASH8;
        bytes32 saltA = keccak256("registry-a-salt-2024");
        bytes32 saltB = keccak256("registry-b-salt-2024-dodge");
        uint16 vintageYear = 2024;
        uint8 creditType = 1;

        bytes32 geoCommitmentA = preA0Registry.computeGeoCommitment(sharedGeohash, saltA);
        bytes32 geoCommitmentB = preA0Registry.computeGeoCommitment(sharedGeohash, saltB);

        bytes32 projectA = keccak256("verra-parcel-hole-a");
        bytes32 projectB = keccak256("gold-standard-parcel-hole-a");

        vm.startPrank(registryA);
        preA0Registry.registerProject(projectA, geoCommitmentA, SAMPLE_CID);
        uint256 serialA = preA0Registry.issue(
            projectA, vintageYear, creditType, fixtureClaimedAmount, fixtureDataCommitment, fixtureProof
        );
        vm.stopPrank();

        // Registry B uses a DIFFERENT salt for the SAME physical parcel -> SUCCEEDS on pre-A0!
        vm.startPrank(registryB);
        preA0Registry.registerProject(projectB, geoCommitmentB, SAMPLE_CID);
        uint256 serialB = preA0Registry.issue(
            projectB, vintageYear, creditType, fixtureClaimedAmount, fixtureDataCommitment, fixtureProof
        );
        vm.stopPrank();

        assertEq(serialA, 1);
        assertEq(serialB, 2);
        assertEq(preA0Registry.balanceOf(registryA, serialA), fixtureClaimedAmount);
        assertEq(preA0Registry.balanceOf(registryB, serialB), fixtureClaimedAmount);
    }

    /// @notice Demonstrates Hole B (Vintage-Relabel): same geohash8+salt, vintageYear+1.
    ///         On pre-A0 contracts, vintageYear was unconstrained, permitting future vintage relabeling.
    /// @dev Demonstrates the hole; retained permanently as evidence.
    function test_HoleB_VintageRelabel() public {
        bytes32 geoCommitment = preA0Registry.computeGeoCommitment(SAMPLE_GEOHASH8, SAMPLE_SALT);
        bytes32 projectA = keccak256("project-vintage-relabel");

        vm.startPrank(registryA);
        preA0Registry.registerProject(projectA, geoCommitment, SAMPLE_CID);

        uint256 serial2024 = preA0Registry.issue(
            projectA, 2024, 1, fixtureClaimedAmount, fixtureDataCommitment, fixtureProof
        );

        // Pre-A0 allows unconstrained future vintage (e.g. 2099) on the exact same project -> SUCCEEDS!
        uint256 serial2099 = preA0Registry.issue(
            projectA, 2099, 1, fixtureClaimedAmount, fixtureDataCommitment, fixtureProof
        );
        vm.stopPrank();

        assertEq(serial2024, 1);
        assertEq(serial2099, 2);
        assertEq(preA0Registry.balanceOf(registryA, serial2024), fixtureClaimedAmount);
        assertEq(preA0Registry.balanceOf(registryA, serial2099), fixtureClaimedAmount);
    }

    // =========================================================================
    // 1. Unit Tests: Happy Path, Role Enforcement, Proof Verification Failure
    // =========================================================================

    function test_Unit_HappyPath_RegisterIssueAndRetire() public {
        bytes32 projectId = keccak256("vc-tapajos-001");
        bytes32 geoCommitment = registry.computeGeoCommitment(SAMPLE_GEOHASH8, SAMPLE_SALT);
        uint16 vintageYear = 2024;
        CarbonRegistry.CreditType creditType = CarbonRegistry.CreditType.REMOVAL;

        vm.startPrank(registryA);
        registry.registerProject(projectId, geoCommitment, SAMPLE_CID);

        uint256 serialId = registry.issue(
            projectId,
            SAMPLE_GEOHASH8,
            SAMPLE_SALT,
            vintageYear,
            creditType,
            fixtureClaimedAmount,
            fixtureDataCommitment,
            fixtureProof
        );
        assertEq(serialId, 1);
        assertEq(registry.balanceOf(registryA, serialId), fixtureClaimedAmount);
        assertEq(registry.totalIssued(serialId), fixtureClaimedAmount);

        bytes32 expectedIssuanceNullifier =
            registry.computeIssuanceNullifier(SAMPLE_GEOHASH8, vintageYear, creditType);
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
        registry.issue(
            projectId,
            SAMPLE_GEOHASH8,
            SAMPLE_SALT,
            2024,
            CarbonRegistry.CreditType.REMOVAL,
            fixtureClaimedAmount,
            fixtureDataCommitment,
            fixtureProof
        );
        vm.stopPrank();
    }

    function test_Unit_ProofVerificationFailure_Reverts() public {
        bytes32 projectId = keccak256("vc-tapajos-corrupt");
        bytes32 geoCommitment = registry.computeGeoCommitment(SAMPLE_GEOHASH8, SAMPLE_SALT);

        bytes memory corruptedProof = bytes.concat(fixtureProof);
        corruptedProof[32] = bytes1(uint8(corruptedProof[32]) ^ 0xff);

        vm.startPrank(registryA);
        registry.registerProject(projectId, geoCommitment, SAMPLE_CID);

        vm.expectRevert(CarbonRegistry.InvalidZKProof.selector);
        registry.issue(
            projectId,
            SAMPLE_GEOHASH8,
            SAMPLE_SALT,
            2024,
            CarbonRegistry.CreditType.REMOVAL,
            fixtureClaimedAmount,
            fixtureDataCommitment,
            corruptedProof
        );
        vm.stopPrank();
    }

    // =========================================================================
    // 2. Attack Matrix: SEVEN Explicit Fraud Attack Tests (A1–A7)
    // =========================================================================

    /// @notice A1: Cross-registry same (geohash8, vintageYear, creditType) MUST revert.
    function test_A1_CrossRegistrySameParcel_Reverts() public {
        bytes32 geoCommitment = registry.computeGeoCommitment(SAMPLE_GEOHASH8, SAMPLE_SALT);
        uint16 vintageYear = 2024;
        CarbonRegistry.CreditType creditType = CarbonRegistry.CreditType.REMOVAL;

        bytes32 projectInRegistryA = keccak256("verra-project-101");
        bytes32 projectInRegistryB = keccak256("gold-standard-project-909");

        // Registry A registers and issues credits
        vm.startPrank(registryA);
        registry.registerProject(projectInRegistryA, geoCommitment, SAMPLE_CID);
        registry.issue(
            projectInRegistryA,
            SAMPLE_GEOHASH8,
            SAMPLE_SALT,
            vintageYear,
            creditType,
            fixtureClaimedAmount,
            fixtureDataCommitment,
            fixtureProof
        );
        vm.stopPrank();

        // Registry B attempts to issue for the same physical geohash8 parcel and vintage
        bytes32 expectedNullifier = registry.computeIssuanceNullifier(SAMPLE_GEOHASH8, vintageYear, creditType);

        vm.startPrank(registryB);
        registry.registerProject(projectInRegistryB, geoCommitment, SAMPLE_CID);
        vm.expectRevert(
            abi.encodeWithSelector(CarbonRegistry.IssuanceNullifierAlreadySpent.selector, expectedNullifier)
        );
        registry.issue(
            projectInRegistryB,
            SAMPLE_GEOHASH8,
            SAMPLE_SALT,
            vintageYear,
            creditType,
            fixtureClaimedAmount,
            fixtureDataCommitment,
            fixtureProof
        );
        vm.stopPrank();
    }

    /// @notice A2: Same-registry duplicate issuance MUST revert.
    function test_A2_SameRegistryReIssue_Reverts() public {
        bytes32 projectId = keccak256("vc-single-registry-dup");
        bytes32 geoCommitment = registry.computeGeoCommitment(SAMPLE_GEOHASH8, SAMPLE_SALT);
        uint16 vintageYear = 2024;
        CarbonRegistry.CreditType creditType = CarbonRegistry.CreditType.REMOVAL;

        vm.startPrank(registryA);
        registry.registerProject(projectId, geoCommitment, SAMPLE_CID);
        registry.issue(
            projectId,
            SAMPLE_GEOHASH8,
            SAMPLE_SALT,
            vintageYear,
            creditType,
            fixtureClaimedAmount,
            fixtureDataCommitment,
            fixtureProof
        );

        bytes32 expectedNullifier = registry.computeIssuanceNullifier(SAMPLE_GEOHASH8, vintageYear, creditType);
        vm.expectRevert(
            abi.encodeWithSelector(CarbonRegistry.IssuanceNullifierAlreadySpent.selector, expectedNullifier)
        );
        registry.issue(
            projectId,
            SAMPLE_GEOHASH8,
            SAMPLE_SALT,
            vintageYear,
            creditType,
            fixtureClaimedAmount,
            fixtureDataCommitment,
            fixtureProof
        );
        vm.stopPrank();
    }

    /// @notice A3: Salt-Dodge Attack (different salt for same geohash8) MUST revert on post-A0.
    function test_A3_SaltDodge_Reverts() public {
        bytes32 saltA = keccak256("registry-a-salt-2024");
        bytes32 saltB = keccak256("registry-b-salt-dodge-2024");
        uint16 vintageYear = 2024;
        CarbonRegistry.CreditType creditType = CarbonRegistry.CreditType.REMOVAL;

        bytes32 geoCommitmentA = registry.computeGeoCommitment(SAMPLE_GEOHASH8, saltA);
        bytes32 geoCommitmentB = registry.computeGeoCommitment(SAMPLE_GEOHASH8, saltB);

        bytes32 projectA = keccak256("project-a-salt-dodge");
        bytes32 projectB = keccak256("project-b-salt-dodge");

        vm.startPrank(registryA);
        registry.registerProject(projectA, geoCommitmentA, SAMPLE_CID);
        registry.issue(
            projectA,
            SAMPLE_GEOHASH8,
            saltA,
            vintageYear,
            creditType,
            fixtureClaimedAmount,
            fixtureDataCommitment,
            fixtureProof
        );
        vm.stopPrank();

        // Registry B attempts to salt-dodge by registering the same geohash8 with saltB.
        // Post-A0 issuanceNullifier = keccak256(geohash8, vintageYear, creditType), which is SALT-INDEPENDENT.
        // Therefore, it collides on expectedNullifier and REVERTS!
        bytes32 expectedNullifier = registry.computeIssuanceNullifier(SAMPLE_GEOHASH8, vintageYear, creditType);

        vm.startPrank(registryB);
        registry.registerProject(projectB, geoCommitmentB, SAMPLE_CID);
        vm.expectRevert(
            abi.encodeWithSelector(CarbonRegistry.IssuanceNullifierAlreadySpent.selector, expectedNullifier)
        );
        registry.issue(
            projectB,
            SAMPLE_GEOHASH8,
            saltB,
            vintageYear,
            creditType,
            fixtureClaimedAmount,
            fixtureDataCommitment,
            fixtureProof
        );
        vm.stopPrank();
    }

    /// @notice A4: Retirement claim replay MUST revert.
    function test_A4_RetirementReplay_Reverts() public {
        bytes32 projectId = keccak256("vc-replay-retire");
        bytes32 geoCommitment = registry.computeGeoCommitment(SAMPLE_GEOHASH8, SAMPLE_SALT);
        uint16 vintageYear = 2024;
        CarbonRegistry.CreditType creditType = CarbonRegistry.CreditType.REMOVAL;

        vm.startPrank(registryA);
        registry.registerProject(projectId, geoCommitment, SAMPLE_CID);
        uint256 serialId = registry.issue(
            projectId,
            SAMPLE_GEOHASH8,
            SAMPLE_SALT,
            vintageYear,
            creditType,
            fixtureClaimedAmount,
            fixtureDataCommitment,
            fixtureProof
        );

        uint256[] memory serialIds = new uint256[](1);
        serialIds[0] = serialId;
        uint256[] memory partialAmounts = new uint256[](1);
        partialAmounts[0] = 200;

        uint8 claimType = 1;
        bytes32 beneficiaryCommitment = keccak256("acme-scope1-claim-2024");

        registry.retireAmounts(serialIds, partialAmounts, claimType, beneficiaryCommitment);

        bytes32 issuanceNullifier = registry.computeIssuanceNullifier(SAMPLE_GEOHASH8, vintageYear, creditType);
        bytes32 expectedClaimNullifier = registry.computeClaimNullifier(
            issuanceNullifier, registryA, claimType, beneficiaryCommitment
        );

        vm.expectRevert(
            abi.encodeWithSelector(CarbonRegistry.ClaimNullifierAlreadySpent.selector, expectedClaimNullifier)
        );
        registry.retireAmounts(serialIds, partialAmounts, claimType, beneficiaryCommitment);
        vm.stopPrank();
    }

    /// @notice A5: Claim against non-existent issuance batch MUST revert.
    function test_A5_ClaimAgainstNonExistentIssuance_Reverts() public {
        uint256 nonExistentSerialId = 999;
        uint256[] memory serialIds = new uint256[](1);
        serialIds[0] = nonExistentSerialId;

        vm.prank(registryA);
        vm.expectRevert(
            abi.encodeWithSelector(CarbonRegistry.BatchDoesNotExist.selector, nonExistentSerialId)
        );
        registry.retire(serialIds, 1, keccak256("beneficiary"));
    }

    /// @notice A6: Amount inflation above model output proved in ezkl circuit MUST revert.
    function test_A6_AmountInflationAboveModelOutput_Reverts() public {
        bytes32 projectId = keccak256("vc-inflated-amount");
        bytes32 geoCommitment = registry.computeGeoCommitment(SAMPLE_GEOHASH8, SAMPLE_SALT);
        uint256 inflatedAmount = fixtureClaimedAmount + 100;

        vm.startPrank(registryA);
        registry.registerProject(projectId, geoCommitment, SAMPLE_CID);

        vm.expectRevert(CarbonRegistry.InvalidZKProof.selector);
        registry.issue(
            projectId,
            SAMPLE_GEOHASH8,
            SAMPLE_SALT,
            2024,
            CarbonRegistry.CreditType.REMOVAL,
            inflatedAmount,
            fixtureDataCommitment,
            fixtureProof
        );
        vm.stopPrank();
    }

    /// @notice A7: Credit type relabeling / future vintage / salt mismatch MUST revert.
    function test_A7_CreditTypeRelabelOrFutureVintage_Reverts() public {
        bytes32 projectId = keccak256("vc-a7-checks");
        bytes32 geoCommitment = registry.computeGeoCommitment(SAMPLE_GEOHASH8, SAMPLE_SALT);

        vm.startPrank(registryA);
        registry.registerProject(projectId, geoCommitment, SAMPLE_CID);

        // Attempt 7a: Future vintage (e.g. 2099) reverts with InvalidVintageYear
        vm.expectRevert(
            abi.encodeWithSelector(CarbonRegistry.InvalidVintageYear.selector, 2099, registry.getCurrentYear())
        );
        registry.issue(
            projectId,
            SAMPLE_GEOHASH8,
            SAMPLE_SALT,
            2099,
            CarbonRegistry.CreditType.REMOVAL,
            fixtureClaimedAmount,
            fixtureDataCommitment,
            fixtureProof
        );

        // Attempt 7b: Pre-2000 vintage (e.g. 1999) reverts with InvalidVintageYear
        vm.expectRevert(
            abi.encodeWithSelector(CarbonRegistry.InvalidVintageYear.selector, 1999, registry.getCurrentYear())
        );
        registry.issue(
            projectId,
            SAMPLE_GEOHASH8,
            SAMPLE_SALT,
            1999,
            CarbonRegistry.CreditType.REMOVAL,
            fixtureClaimedAmount,
            fixtureDataCommitment,
            fixtureProof
        );

        // Attempt 7c: Salt mismatch against registered geoCommitment reverts with GeoCommitmentMismatch
        bytes32 wrongSalt = keccak256("wrong-salt");
        vm.expectRevert(CarbonRegistry.GeoCommitmentMismatch.selector);
        registry.issue(
            projectId,
            SAMPLE_GEOHASH8,
            wrongSalt,
            2024,
            CarbonRegistry.CreditType.REMOVAL,
            fixtureClaimedAmount,
            fixtureDataCommitment,
            fixtureProof
        );
        vm.stopPrank();
    }

    // =========================================================================
    // 3. Baseline Demonstration Test: A1 AND A3 SUCCEED on BaselineCentralRegistry
    // =========================================================================

    /// @notice Demonstrates that BOTH Attack 1 (cross-registry double issuance) AND Attack 3
    ///         (salt-dodge double issuance) SUCCEED on `BaselineCentralRegistry`.
    function test_BaselineDemo_CrossRegistryAndSaltDodgeDoubleIssuanceSucceedOnBaselineRegistry() public {
        bytes32 geoCommitmentA = registry.computeGeoCommitment(SAMPLE_GEOHASH8, SAMPLE_SALT);
        bytes32 geoCommitmentB = registry.computeGeoCommitment(SAMPLE_GEOHASH8, keccak256("dodged-salt"));
        uint16 vintageYear = 2024;
        uint8 creditType = 1;

        bytes32 projectA = keccak256("verra-project-baseline-demo");
        bytes32 projectB = keccak256("gold-standard-project-baseline-demo");

        // Registry A registers projectA and issues credits
        vm.startPrank(registryA);
        baseline.registerProject(projectA, geoCommitmentA, SAMPLE_CID);
        uint256 batchA = baseline.issue(projectA, vintageYear, creditType, fixtureClaimedAmount);
        vm.stopPrank();

        // Registry B registers projectB on the exact same land (with a different salt) and issues credits.
        // INTENTIONALLY SUCCEEDS on BaselineCentralRegistry because it lacks global geospatial nullifiers!
        vm.startPrank(registryB);
        baseline.registerProject(projectB, geoCommitmentB, SAMPLE_CID);
        uint256 batchB = baseline.issue(projectB, vintageYear, creditType, fixtureClaimedAmount);
        vm.stopPrank();

        assertEq(baseline.balanceOf(registryA, batchA), fixtureClaimedAmount);
        assertEq(baseline.balanceOf(registryB, batchB), fixtureClaimedAmount);
        assertEq(
            baseline.totalIssued(batchA) + baseline.totalIssued(batchB),
            fixtureClaimedAmount * 2,
            "Intentional baseline vulnerability: 2x credits minted for identical parcel"
        );
    }

    // =========================================================================
    // 4. Fuzz Tests
    // =========================================================================

    /// @notice Fuzz test verifying that distinct valid `(geohash8, vintageYear, creditType)` tuples
    ///         never collide on `issuanceNullifier`.
    function testFuzz_RandomValidIssuancesNeverCollideOnNullifier(
        bytes8 geohashA,
        uint16 vintageA,
        uint8 creditTypeRawA,
        bytes8 geohashB,
        uint16 vintageB,
        uint8 creditTypeRawB
    ) public view {
        CarbonRegistry.CreditType creditTypeA = (creditTypeRawA % 2 == 0)
            ? CarbonRegistry.CreditType.REMOVAL
            : CarbonRegistry.CreditType.REDUCTION;
        CarbonRegistry.CreditType creditTypeB = (creditTypeRawB % 2 == 0)
            ? CarbonRegistry.CreditType.REMOVAL
            : CarbonRegistry.CreditType.REDUCTION;

        vm.assume(
            geohashA != geohashB || vintageA != vintageB || creditTypeA != creditTypeB
        );

        bytes32 nullifierA = registry.computeIssuanceNullifier(geohashA, vintageA, creditTypeA);
        bytes32 nullifierB = registry.computeIssuanceNullifier(geohashB, vintageB, creditTypeB);

        assertNotEq(nullifierA, nullifierB, "Distinct issuances must never collide on issuanceNullifier");
    }

    // =========================================================================
    // 5. Stateful Invariant Tests
    // =========================================================================

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
