// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Halo2Verifier} from "../src/verifiers/Halo2Verifier.sol";
import {CarbonRegistry} from "../src/CarbonRegistry.sol";

/// @title IssueLocalScript
/// @notice Deploys `Halo2Verifier` and `CarbonRegistry` against a local Anvil node,
///         registers a project, issues a credit batch with the real `ezkl` Halo2 proof,
///         and retires part of the batch so `ProjectRegistered`, `Issued`, and `Claimed`
///         events are emitted on-chain for `eval/e2e_local.sh`.
contract IssueLocalScript is Script {
    bytes32 public constant CIRCUIT_MODEL_HASH = bytes32(uint256(0x78ab));
    bytes32 public constant CIRCUIT_DATA_COMMITMENT = bytes32(uint256(0x00f6));
    uint256 public constant CIRCUIT_CLAIMED_AMOUNT = 544;
    bytes32 public constant PROJECT_ID = keccak256("vericarbon-e2e-local-project-2024");
    bytes8 public constant PLOT_GEOHASH8 = bytes8("6z900000");
    bytes32 public constant PLOT_SALT = keccak256("vericarbon-e2e-local-salt-2024");
    bytes32 public constant BENEFICIARY_COMMITMENT = keccak256("vericarbon-e2e-beneficiary-2024");
    uint16 public constant VINTAGE_YEAR = 2024;
    CarbonRegistry.CreditType public constant CREDIT_TYPE = CarbonRegistry.CreditType.REMOVAL;

    function run() external returns (CarbonRegistry registry, bytes32 projectId, bytes32 issuanceNullifier) {
        uint256 deployerPrivateKey = vm.envOr(
            "DEPLOYER_PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        address deployer = vm.addr(deployerPrivateKey);
        bytes memory ezklProof = _loadProof();

        vm.startBroadcast(deployerPrivateKey);

        Halo2Verifier verifier = new Halo2Verifier();
        registry = new CarbonRegistry(address(verifier), CIRCUIT_MODEL_HASH, deployer);

        bytes32 geoCommitment = registry.computeGeoCommitment(PLOT_GEOHASH8, PLOT_SALT);
        issuanceNullifier = registry.computeIssuanceNullifier(PLOT_GEOHASH8, VINTAGE_YEAR, CREDIT_TYPE);

        registry.registerProject(
            PROJECT_ID,
            geoCommitment,
            "bafkreie2elocaltapajosevidencebundle2024vericarbon"
        );
        uint256 serialId = registry.issue(
            PROJECT_ID,
            PLOT_GEOHASH8,
            PLOT_SALT,
            VINTAGE_YEAR,
            CREDIT_TYPE,
            CIRCUIT_CLAIMED_AMOUNT,
            CIRCUIT_DATA_COMMITMENT,
            ezklProof
        );
        _retireSample(registry, serialId);

        vm.stopBroadcast();

        projectId = PROJECT_ID;
        bytes32 claimNullifier = registry.computeClaimNullifier(
            issuanceNullifier,
            deployer,
            0,
            BENEFICIARY_COMMITMENT
        );
        _writeManifest(address(registry), address(verifier), geoCommitment, issuanceNullifier, claimNullifier);
    }

    function _loadProof() internal view returns (bytes memory) {
        string memory root = vm.projectRoot();
        string memory proofJson = vm.readFile(string.concat(root, "/../../services/zk/artifacts/proof.json"));
        return vm.parseJsonBytes(proofJson, ".hex_proof");
    }

    function _retireSample(CarbonRegistry registry, uint256 serialId) internal {
        uint256[] memory serialIds = new uint256[](1);
        serialIds[0] = serialId;
        uint256[] memory retireAmountsList = new uint256[](1);
        retireAmountsList[0] = 100;
        registry.retireAmounts(serialIds, retireAmountsList, 0, BENEFICIARY_COMMITMENT);
    }

    function _writeManifest(
        address registryAddr,
        address verifierAddr,
        bytes32 geoCommitment,
        bytes32 issuanceNullifier,
        bytes32 claimNullifier
    ) internal {
        string memory root = vm.projectRoot();
        string memory localManifest = string.concat(
            "{\n",
            '  "CarbonRegistry": "',
            vm.toString(registryAddr),
            '",\n',
            '  "Halo2Verifier": "',
            vm.toString(verifierAddr),
            '",\n',
            '  "projectId": "',
            vm.toString(PROJECT_ID),
            '",\n',
            '  "geoCommitment": "',
            vm.toString(geoCommitment),
            '",\n',
            '  "issuanceNullifier": "',
            vm.toString(issuanceNullifier),
            '",\n',
            '  "claimNullifier": "',
            vm.toString(claimNullifier),
            '",\n',
            '  "amount": 544,\n',
            '  "vintageYear": 2024\n',
            "}\n"
        );
        vm.writeFile(string.concat(root, "/deployments/anvil-local.json"), localManifest);
        console2.log("Anvil CarbonRegistry:", registryAddr);
    }
}
