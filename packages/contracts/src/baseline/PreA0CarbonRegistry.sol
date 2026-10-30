// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IHalo2Verifier} from "../CarbonRegistry.sol";

/// @title PreA0CarbonRegistry
/// @notice Legacy pre-amendment registry implementation retained permanently as historical test evidence.
/// @dev In this pre-A0 version, `issuanceNullifier` was defined as `keccak256(abi.encode(geoCommitment, vintageYear, creditType))`.
///      Because `geoCommitment` embedded the client-chosen `salt`, two registries using different salts for the SAME
///      physical geohash8 plot generated different nullifiers, allowing cross-registry double issuance (the "salt-dodge" hole).
///      Furthermore, `vintageYear` was unconstrained, permitting future vintage relabeling (the "vintage-relabel" hole).
contract PreA0CarbonRegistry is ERC1155, AccessControl {
    bytes32 public constant REGISTRY_ROLE = keccak256("REGISTRY_ROLE");

    IHalo2Verifier public immutable verifier;
    bytes32 public immutable modelHash;
    uint256 public nextSerialId = 1;

    struct Project {
        bytes32 projectId;
        bytes32 geoCommitment;
        string evidenceCid;
        address registrar;
        bool exists;
    }

    struct CreditBatch {
        uint256 serialId;
        bytes32 projectId;
        bytes32 issuanceNullifier;
        bytes32 dataCommitment;
        uint256 amount;
        uint16 vintageYear;
        uint8 creditType;
        bool exists;
    }

    mapping(bytes32 => Project) public projects;
    mapping(uint256 => CreditBatch) public batches;
    mapping(bytes32 => bool) public issuanceNullifierSpent;
    mapping(bytes32 => bool) public claimNullifierSpent;

    event ProjectRegistered(bytes32 indexed projectId, bytes32 indexed geoCommitment, address indexed registrar, string evidenceCid);
    event Issued(bytes32 indexed issuanceNullifier, bytes32 indexed projectId, uint256 amount, uint16 vintageYear, uint8 creditType, string evidenceCid);

    error ZeroAddress();
    error InvalidProjectParameters();
    error ProjectAlreadyRegistered(bytes32 projectId);
    error ProjectNotFound(bytes32 projectId);
    error InvalidIssuanceAmount();
    error InvalidZKProof();
    error IssuanceNullifierAlreadySpent(bytes32 issuanceNullifier);

    constructor(address verifierAddress, bytes32 circuitModelHash, address admin)
        ERC1155("ipfs://vericarbon-pre-a0/{id}.json")
    {
        if (verifierAddress == address(0) || admin == address(0)) revert ZeroAddress();
        verifier = IHalo2Verifier(verifierAddress);
        modelHash = circuitModelHash;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRY_ROLE, admin);
    }

    function computeGeoCommitment(bytes8 geohash8, bytes32 salt) external pure returns (bytes32) {
        return keccak256(abi.encode(geohash8, salt));
    }

    function computeIssuanceNullifier(bytes32 geoCommitment, uint16 vintageYear, uint8 creditType)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(geoCommitment, vintageYear, creditType));
    }

    function registerProject(bytes32 projectId, bytes32 geoCommitment, string calldata evidenceCid)
        external
        onlyRole(REGISTRY_ROLE)
    {
        if (projectId == bytes32(0) || geoCommitment == bytes32(0) || bytes(evidenceCid).length == 0) {
            revert InvalidProjectParameters();
        }
        if (projects[projectId].exists) revert ProjectAlreadyRegistered(projectId);

        projects[projectId] = Project({
            projectId: projectId,
            geoCommitment: geoCommitment,
            evidenceCid: evidenceCid,
            registrar: msg.sender,
            exists: true
        });

        emit ProjectRegistered(projectId, geoCommitment, msg.sender, evidenceCid);
    }

    function issue(
        bytes32 projectId,
        uint16 vintageYear,
        uint8 creditType,
        uint256 amount,
        bytes32 dataCommitment,
        bytes calldata ezklProof
    ) external onlyRole(REGISTRY_ROLE) returns (uint256 serialId) {
        Project storage proj = projects[projectId];
        if (!proj.exists) revert ProjectNotFound(projectId);
        if (amount == 0) revert InvalidIssuanceAmount();

        uint256[] memory instances = new uint256[](3);
        instances[0] = uint256(modelHash);
        instances[1] = uint256(dataCommitment);
        instances[2] = amount;

        try verifier.verifyProof(ezklProof, instances) returns (bool ok) {
            if (!ok) revert InvalidZKProof();
        } catch {
            revert InvalidZKProof();
        }

        bytes32 issuanceNullifier = computeIssuanceNullifier(proj.geoCommitment, vintageYear, creditType);
        if (issuanceNullifierSpent[issuanceNullifier]) {
            revert IssuanceNullifierAlreadySpent(issuanceNullifier);
        }
        issuanceNullifierSpent[issuanceNullifier] = true;

        serialId = nextSerialId++;
        batches[serialId] = CreditBatch({
            serialId: serialId,
            projectId: projectId,
            issuanceNullifier: issuanceNullifier,
            dataCommitment: dataCommitment,
            amount: amount,
            vintageYear: vintageYear,
            creditType: creditType,
            exists: true
        });

        _mint(msg.sender, serialId, amount, "");
        emit Issued(issuanceNullifier, projectId, amount, vintageYear, creditType, proj.evidenceCid);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
