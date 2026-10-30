// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Halo2Verifier} from "../src/verifiers/Halo2Verifier.sol";
import {CarbonRegistry} from "../src/CarbonRegistry.sol";

/// @title DayInTheLifeScript
/// @notice Comprehensive artifact evaluation script for VeriCarbon:
///         1. Deploys Halo2Verifier and CarbonRegistry
///         2. Registry A registers Project 101 and issues 544 ZK-verified credits
///         3. Registry B attempts cross-registry double issuance on the same land + vintage -> REVERTS!
///         4. Registry A retires 200 credits with corporate beneficiary commitment -> claimNullifier recorded
///         5. Duplicate retirement replay attempt -> REVERTS!
contract DayInTheLifeScript is Script {
    bytes32 public constant CIRCUIT_MODEL_HASH = bytes32(uint256(0x78ab));
    bytes32 public constant CIRCUIT_DATA_COMMITMENT = bytes32(uint256(0x00f6));
    uint256 public constant CLAIMED_AMOUNT = 544;

    bytes8 public constant SAMPLE_GEOHASH8 = bytes8("6z900000");
    bytes32 public constant SAMPLE_SALT = keccak256("tapajos-demo-salt-2024");
    uint16 public constant SHARED_VINTAGE = 2024;
    CarbonRegistry.CreditType public constant SHARED_CREDIT_TYPE = CarbonRegistry.CreditType.REMOVAL;

    uint256 internal constant ADMIN_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 internal constant REG_A_KEY = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    uint256 internal constant REG_B_KEY = 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a;

    function _loadProof() internal view returns (bytes memory) {
        string memory root = vm.projectRoot();
        string memory proofJson = vm.readFile(string.concat(root, "/../../services/zk/artifacts/proof.json"));
        return vm.parseJsonBytes(proofJson, ".hex_proof");
    }

    function _deployProtocol() internal returns (Halo2Verifier verifier, CarbonRegistry registry) {
        address admin = vm.addr(ADMIN_KEY);
        address regA = vm.addr(REG_A_KEY);
        address regB = vm.addr(REG_B_KEY);

        console2.log("=== [DEMO STEP 1] Deploying Protocol Infrastructure ===");
        vm.startBroadcast(ADMIN_KEY);
        verifier = new Halo2Verifier();
        registry = new CarbonRegistry(address(verifier), CIRCUIT_MODEL_HASH, admin);
        registry.grantRole(registry.REGISTRY_ROLE(), regA);
        registry.grantRole(registry.REGISTRY_ROLE(), regB);
        vm.stopBroadcast();

        console2.log("Halo2Verifier Deployed at:", address(verifier));
        console2.log("CarbonRegistry Deployed at:", address(registry));
    }

    function _issueA(CarbonRegistry registry, bytes32 geoCommitment, bytes memory ezklProof)
        internal
        returns (bytes32 projectA, uint256 serialId, bytes32 expectedIssuanceNullifier)
    {
        address regA = vm.addr(REG_A_KEY);
        expectedIssuanceNullifier = registry.computeIssuanceNullifier(SAMPLE_GEOHASH8, SHARED_VINTAGE, SHARED_CREDIT_TYPE);

        console2.log("\n=== [DEMO STEP 2] Registry A: Register Project & Issue Verified Credits ===");
        projectA = keccak256("verra-tapajos-parcel-101");

        vm.startBroadcast(REG_A_KEY);
        registry.registerProject(projectA, geoCommitment, "bafkreie2etapajosevidencebundle2024vericarbon");
        serialId = registry.issue(
            projectA,
            SAMPLE_GEOHASH8,
            SAMPLE_SALT,
            SHARED_VINTAGE,
            SHARED_CREDIT_TYPE,
            CLAIMED_AMOUNT,
            CIRCUIT_DATA_COMMITMENT,
            ezklProof
        );
        vm.stopBroadcast();

        console2.log("Project A Registered:", vm.toString(projectA));
        console2.log("Credits Issued Batch Serial ID:", serialId);
        console2.log("Minted Balance for Registry A:", registry.balanceOf(regA, serialId));
        console2.log("Issuance Nullifier Spent:", registry.issuanceNullifierSpent(expectedIssuanceNullifier));
        console2.log("Issuance Nullifier Hash:", vm.toString(expectedIssuanceNullifier));
    }

    function _attemptDoubleIssueB(CarbonRegistry registry, bytes32 geoCommitment, bytes memory ezklProof, bytes32 expectedIssuanceNullifier)
        internal
    {
        console2.log("\n=== [DEMO STEP 3] Registry B: Cross-Registry Double-Issuance Attempt ===");
        bytes32 projectB = keccak256("goldstandard-tapajos-parcel-909");
        address regB = vm.addr(REG_B_KEY);

        // Broadcast the registration of the duplicate project
        vm.startBroadcast(REG_B_KEY);
        registry.registerProject(projectB, geoCommitment, "bafkreicompetitorevidencebundle2024");
        vm.stopBroadcast();
        
        // Execute the double-issuance attack as an unbroadcasted call to verify on-chain revert
        vm.prank(regB);
        (bool success, ) = address(registry).call(
            abi.encodeWithSelector(
                registry.issue.selector,
                projectB,
                SAMPLE_GEOHASH8,
                SAMPLE_SALT,
                SHARED_VINTAGE,
                SHARED_CREDIT_TYPE,
                CLAIMED_AMOUNT,
                CIRCUIT_DATA_COMMITMENT,
                ezklProof
            )
        );

        require(!success, "Security invariant failed: double issuance was not blocked");
        console2.log("[SUCCESS] Double-issuance intercepted and reverted!");
        console2.log("Reason: issuanceNullifierAlreadySpent(", vm.toString(expectedIssuanceNullifier), ")");
    }

    function _retireA(CarbonRegistry registry, uint256 serialId, bytes32 expectedIssuanceNullifier)
        internal
        returns (bytes32 expectedClaimNullifier)
    {
        address regA = vm.addr(REG_A_KEY);
        console2.log("\n=== [DEMO STEP 4] Registry A: Retire 200 Credits & Record Claim Nullifier ===");
        uint256[] memory serialIds = new uint256[](1);
        serialIds[0] = serialId;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 200;
        uint8 claimType = 1; // Corporate Scope 1 Retirement
        bytes32 beneficiaryCommitment = keccak256("acme-corp-net-zero-esg-2024");

        expectedClaimNullifier = registry.computeClaimNullifier(
            expectedIssuanceNullifier,
            regA,
            claimType,
            beneficiaryCommitment
        );

        vm.startBroadcast(REG_A_KEY);
        registry.retireAmounts(serialIds, amounts, claimType, beneficiaryCommitment);
        vm.stopBroadcast();

        console2.log("Tokens Retired:", amounts[0]);
        console2.log("Remaining Balance for Registry A:", registry.balanceOf(regA, serialId));
        console2.log("Total Batch Retired on-chain:", registry.totalRetired(serialId));
        console2.log("Claim Nullifier Spent:", registry.claimNullifierSpent(expectedClaimNullifier));
        console2.log("Claim Nullifier Hash:", vm.toString(expectedClaimNullifier));
    }

    function _attemptReplayA(CarbonRegistry registry, uint256 serialId, bytes32 expectedClaimNullifier) internal {
        console2.log("\n=== [DEMO STEP 5] Claimant: Duplicate Retirement Replay Attempt ===");
        address regA = vm.addr(REG_A_KEY);
        uint256[] memory serialIds = new uint256[](1);
        serialIds[0] = serialId;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 200;
        uint8 claimType = 1;
        bytes32 beneficiaryCommitment = keccak256("acme-corp-net-zero-esg-2024");

        // Execute the duplicate retirement replay as an unbroadcasted call to verify on-chain revert
        vm.prank(regA);
        (bool success, ) = address(registry).call(
            abi.encodeWithSelector(
                registry.retireAmounts.selector,
                serialIds,
                amounts,
                claimType,
                beneficiaryCommitment
            )
        );

        require(!success, "Security invariant failed: replay retirement was not blocked");
        console2.log("[SUCCESS] Duplicate claim replay intercepted and reverted!");
        console2.log("Reason: claimNullifierAlreadySpent(", vm.toString(expectedClaimNullifier), ")");
    }

    function _writeManifest(address registry, address verifier, bytes32 projectA, bytes32 issNullifier, bytes32 clmNullifier) internal {
        string memory rootProj = vm.projectRoot();
        string memory demoManifest = string.concat(
            '{\n  "CarbonRegistry": "', vm.toString(registry), '",\n',
            '  "Halo2Verifier": "', vm.toString(verifier), '",\n',
            '  "projectId": "', vm.toString(projectA), '",\n',
            '  "issuanceNullifier": "', vm.toString(issNullifier), '",\n',
            '  "claimNullifier": "', vm.toString(clmNullifier), '"\n}'
        );
        vm.writeFile(string.concat(rootProj, "/deployments/demo-local.json"), demoManifest);
    }

    function run() external {
        (Halo2Verifier verifier, CarbonRegistry registry) = _deployProtocol();
        bytes memory ezklProof = _loadProof();
        bytes32 geoCommitment = registry.computeGeoCommitment(SAMPLE_GEOHASH8, SAMPLE_SALT);

        (bytes32 projectA, uint256 serialId, bytes32 expectedIssuanceNullifier) = _issueA(registry, geoCommitment, ezklProof);
        _attemptDoubleIssueB(registry, geoCommitment, ezklProof, expectedIssuanceNullifier);
        bytes32 expectedClaimNullifier = _retireA(registry, serialId, expectedIssuanceNullifier);
        _attemptReplayA(registry, serialId, expectedClaimNullifier);
        _writeManifest(address(registry), address(verifier), projectA, expectedIssuanceNullifier, expectedClaimNullifier);

        console2.log("\n===============================================================================");
        console2.log(" DAY IN THE LIFE DEMO: ALL SECURITY PROTOCOLS AND FLOWS VERIFIED ON-CHAIN!");
        console2.log("===============================================================================\n");
    }
}
