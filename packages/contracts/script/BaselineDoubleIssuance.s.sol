// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {BaselineCentralRegistry} from "../src/baseline/BaselineCentralRegistry.sol";

/// @title BaselineDoubleIssuanceScript
/// @notice Demonstrates that without a global cross-registry geospatial nullifier set,
///         two independent registries (or projects) can issue credits for the EXACT SAME
///         land parcel (`geoCommitment`) and vintage year.
contract BaselineDoubleIssuanceScript is Script {
    bytes8 public constant SHARED_GEOHASH8 = bytes8("6z900000");
    bytes32 public constant SHARED_SALT = keccak256("shared-plot-salt-2024");
    uint16 public constant SHARED_VINTAGE = 2024;
    uint8 public constant SHARED_CREDIT_TYPE = 1;
    uint256 public constant CLAIMED_AMOUNT = 544;

    uint256 internal constant REG_A_KEY = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    uint256 internal constant REG_B_KEY = 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a;

    function _issueA(BaselineCentralRegistry baseline, bytes32 geoCommitment) internal returns (uint256 batchA) {
        bytes32 projectA = keccak256("verra-tapajos-101");
        vm.startBroadcast(REG_A_KEY);
        baseline.registerProject(projectA, geoCommitment, "ipfs://bafybeiverra101bundle");
        batchA = baseline.issue(projectA, SHARED_VINTAGE, SHARED_CREDIT_TYPE, CLAIMED_AMOUNT);
        vm.stopBroadcast();
    }

    function _issueB(BaselineCentralRegistry baseline, bytes32 geoCommitment) internal returns (uint256 batchB) {
        bytes32 projectB = keccak256("goldstandard-tapajos-909");
        vm.startBroadcast(REG_B_KEY);
        baseline.registerProject(projectB, geoCommitment, "ipfs://bafybeigoldstandard909bundle");
        batchB = baseline.issue(projectB, SHARED_VINTAGE, SHARED_CREDIT_TYPE, CLAIMED_AMOUNT);
        vm.stopBroadcast();
    }

    function run()
        external
        returns (
            address baselineAddress,
            uint256 batchA,
            uint256 batchB,
            uint256 totalMinted
        )
    {
        uint256 adminPrivateKey = vm.envOr(
            "DEPLOYER_PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        address admin = vm.addr(adminPrivateKey);
        address regA = vm.addr(REG_A_KEY);
        address regB = vm.addr(REG_B_KEY);

        vm.startBroadcast(adminPrivateKey);
        BaselineCentralRegistry baseline = new BaselineCentralRegistry(admin);
        baseline.grantRole(baseline.REGISTRY_ROLE(), regA);
        baseline.grantRole(baseline.REGISTRY_ROLE(), regB);
        vm.stopBroadcast();

        bytes32 sharedGeoCommitment = keccak256(abi.encode(SHARED_GEOHASH8, SHARED_SALT));

        batchA = _issueA(baseline, sharedGeoCommitment);
        batchB = _issueB(baseline, sharedGeoCommitment);

        baselineAddress = address(baseline);
        totalMinted = baseline.totalIssued(batchA) + baseline.totalIssued(batchB);

        console2.log("Baseline Central Registry deployed at:", baselineAddress);
        console2.log("Registry A Batch ID:", batchA);
        console2.log("Registry B Batch ID:", batchB);
        console2.log("Total double-issued credits for same land:", totalMinted);

        require(totalMinted == CLAIMED_AMOUNT * 2, "Double issuance failed to mint 2x credits");
    }
}
