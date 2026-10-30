// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Halo2Verifier} from "../src/verifiers/Halo2Verifier.sol";
import {CarbonRegistry} from "../src/CarbonRegistry.sol";
import {BaselineCentralRegistry} from "../src/baseline/BaselineCentralRegistry.sol";

/// @title DeployScript
/// @notice Deploys `Halo2Verifier`, `CarbonRegistry`, and `BaselineCentralRegistry` to Base Sepolia
///         (chainId 84532) using `DEPLOYER_PRIVATE_KEY` and writes deployment addresses + ABIs to
///         `packages/contracts/deployments/` and `packages/sdk/src/abi/`.
contract DeployScript is Script {
    /// @notice Base Sepolia testnet chain ID.
    uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;

    /// @notice Local Foundry Anvil/simulation chain ID.
    uint256 public constant ANVIL_CHAIN_ID = 31337;

    /// @notice Circuit modelHash public instance (`0x78ab` = `241.3359375 * 128` in scale=7).
    bytes32 public constant CIRCUIT_MODEL_HASH = bytes32(uint256(0x78ab));

    error UnsupportedChainId(uint256 chainId);
    error AbiExtractionFailed(string artifactPath);

    /// @notice Executes the deployment of all three VeriCarbon contracts and exports ABIs + addresses.
    /// @return verifier Deployed `Halo2Verifier` instance.
    /// @return registry Deployed `CarbonRegistry` instance.
    /// @return baseline Deployed `BaselineCentralRegistry` instance.
    function run()
        external
        returns (Halo2Verifier verifier, CarbonRegistry registry, BaselineCentralRegistry baseline)
    {
        if (block.chainid != BASE_SEPOLIA_CHAIN_ID && block.chainid != ANVIL_CHAIN_ID) {
            revert UnsupportedChainId(block.chainid);
        }

        uint256 deployerPrivateKey = vm.envOr(
            "DEPLOYER_PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        verifier = new Halo2Verifier();
        registry = new CarbonRegistry(address(verifier), CIRCUIT_MODEL_HASH, deployer);
        baseline = new BaselineCentralRegistry(deployer);

        vm.stopBroadcast();

        string memory root = vm.projectRoot();
        string memory deploymentJson = string.concat(
            "{\n",
            '  "network": "base-sepolia",\n',
            '  "chainId": 84532,\n',
            '  "deployer": "',
            vm.toString(deployer),
            '",\n',
            '  "Halo2Verifier": "',
            vm.toString(address(verifier)),
            '",\n',
            '  "CarbonRegistry": "',
            vm.toString(address(registry)),
            '",\n',
            '  "BaselineCentralRegistry": "',
            vm.toString(address(baseline)),
            '"\n',
            "}\n"
        );

        vm.writeFile(string.concat(root, "/deployments/base-sepolia.json"), deploymentJson);
        vm.writeFile(string.concat(root, "/../sdk/src/abi/addresses.json"), deploymentJson);

        string memory carbonRegistryAbi =
            _extractAbi(string.concat(root, "/out/CarbonRegistry.sol/CarbonRegistry.json"));
        string memory baselineRegistryAbi = _extractAbi(
            string.concat(root, "/out/BaselineCentralRegistry.sol/BaselineCentralRegistry.json")
        );
        string memory halo2VerifierAbi =
            _extractAbi(string.concat(root, "/out/Halo2Verifier.sol/Halo2Verifier.json"));

        vm.writeFile(string.concat(root, "/deployments/CarbonRegistry.abi.json"), carbonRegistryAbi);
        vm.writeFile(
            string.concat(root, "/deployments/BaselineCentralRegistry.abi.json"), baselineRegistryAbi
        );
        vm.writeFile(string.concat(root, "/deployments/Halo2Verifier.abi.json"), halo2VerifierAbi);

        vm.writeFile(string.concat(root, "/../sdk/src/abi/CarbonRegistry.json"), carbonRegistryAbi);
        vm.writeFile(
            string.concat(root, "/../sdk/src/abi/BaselineCentralRegistry.json"), baselineRegistryAbi
        );
        vm.writeFile(string.concat(root, "/../sdk/src/abi/Halo2Verifier.json"), halo2VerifierAbi);

        console2.log("Halo2Verifier deployed at:", address(verifier));
        console2.log("CarbonRegistry deployed at:", address(registry));
        console2.log("BaselineCentralRegistry deployed at:", address(baseline));
    }

    /// @notice Extracts the top-level `"abi"` JSON array from a compiled Foundry artifact JSON file.
    /// @param artifactPath Path to the compiled Foundry artifact JSON file.
    /// @return abiJson Raw JSON array string for the contract ABI.
    function _extractAbi(string memory artifactPath) internal view returns (string memory abiJson) {
        bytes memory raw = bytes(vm.readFile(artifactPath));
        bytes memory needle = bytes(',"bytecode":{');
        uint256 rawLen = raw.length;
        uint256 needleLen = needle.length;
        // Foundry artifact files start with `{"abi":[` (index 7 is `[`)
        uint256 startIdx = 7;
        uint256 endIdx = 0;

        for (uint256 i = startIdx; i + needleLen <= rawLen; i++) {
            bool matched = true;
            for (uint256 j = 0; j < needleLen; j++) {
                if (raw[i + j] != needle[j]) {
                    matched = false;
                    break;
                }
            }
            if (matched) {
                endIdx = i;
                break;
            }
        }

        if (endIdx <= startIdx) {
            revert AbiExtractionFailed(artifactPath);
        }

        bytes memory slice = new bytes(endIdx - startIdx + 1);
        for (uint256 k = 0; k < endIdx - startIdx; k++) {
            slice[k] = raw[startIdx + k];
        }
        slice[endIdx - startIdx] = bytes1("\n");
        abiJson = string(slice);
    }
}
