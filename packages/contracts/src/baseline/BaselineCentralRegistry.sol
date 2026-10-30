// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {CarbonRegistry} from "../CarbonRegistry.sol";

/// @title BaselineCentralRegistry
/// @notice Deliberately naive baseline carbon credit registry WITHOUT a global cross-registry
///         geospatial nullifier set or in-circuit ZKML bound verification (modeling prior
///         transfer-log traceability systems in the literature).
/// @dev PURPOSE IN MANUSCRIPT EVALUATION:
///      This contract exists solely as the experimental baseline comparison against `CarbonRegistry`.
///      Because it keys projects only on registry-local `projectId` and lacks a global
///      `issuanceNullifier := keccak256(abi.encode(geoCommitment, vintageYear, creditType))`,
///      two registries (or two project IDs) can issue credits for the exact same `geoCommitment`
///      and `vintageYear` without reverting—demonstrating that cross-registry double-issuance
///      attacks succeed on prior architectures.
contract BaselineCentralRegistry is ERC1155, AccessControl {
    /// @notice Role granted to authorized carbon credit registries.
    bytes32 public constant REGISTRY_ROLE = keccak256("REGISTRY_ROLE");

    /// @notice Next monotonically increasing ERC1155 serial batch ID.
    uint256 public nextSerialId = 1;

    /// @notice Registry-local project metadata (no global geospatial nullifier enforcement).
    struct BaselineProject {
        bytes32 projectId;
        bytes32 geoCommitment;
        string evidenceCid;
        address registrar;
        bool exists;
    }

    /// @notice Mapping from `projectId` to baseline project record.
    mapping(bytes32 => BaselineProject) public projects;

    /// @notice Registry-local duplicate check keyed on `(registrar, projectId, vintageYear)`.
    /// @dev Notice that keying on `(registrar, projectId, vintageYear)` instead of a registry-agnostic
    ///      geospatial nullifier allows cross-registry double issuance of the same land + vintage!
    mapping(bytes32 => bool) public localProjectVintageIssued;

    /// @notice Total credits issued per `serialId`.
    mapping(uint256 => uint256) public totalIssued;

    /// @notice Total credits retired per `serialId`.
    mapping(uint256 => uint256) public totalRetired;

    /// @notice Emitted when a project is registered in the baseline registry.
    /// @param projectId Registry-local project identifier.
    /// @param geoCommitment Geospatial commitment stored as passive metadata only.
    /// @param registrar Address of the registering operator.
    /// @param evidenceCid IPFS CID of the evidence bundle.
    event BaselineProjectRegistered(
        bytes32 indexed projectId,
        bytes32 indexed geoCommitment,
        address indexed registrar,
        string evidenceCid
    );

    /// @notice Emitted when credits are issued in the baseline registry.
    /// @param projectId Registry-local project identifier.
    /// @param serialId Minted ERC1155 token batch ID.
    /// @param amount Number of credits minted.
    /// @param vintageYear Credit vintage year.
    /// @param creditType Credit classification code.
    /// @param evidenceCid IPFS CID of the evidence bundle.
    event BaselineIssued(
        bytes32 indexed projectId,
        uint256 indexed serialId,
        uint256 amount,
        uint16 vintageYear,
        uint8 creditType,
        string evidenceCid
    );

    /// @notice Emitted when credits are retired in the baseline registry.
    /// @param claimant Address retiring the credits.
    /// @param serialIds Batch serial IDs retired.
    /// @param claimType Claim classification code.
    event BaselineRetired(address indexed claimant, uint256[] serialIds, uint8 claimType);

    error ZeroAddress();
    error InvalidProjectParameters();
    error ProjectAlreadyRegistered(bytes32 projectId);
    error ProjectNotFound(bytes32 projectId);
    error LocalVintageAlreadyIssued(bytes32 localKey);
    error InsufficientBalance(uint256 serialId);

    /// @notice Initializes the baseline registry and grants admin/registry roles.
    /// @param admin Initial `DEFAULT_ADMIN_ROLE` and `REGISTRY_ROLE` holder.
    constructor(address admin) ERC1155("ipfs://vericarbon-baseline/{id}.json") {
        if (admin == address(0)) {
            revert ZeroAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRY_ROLE, admin);
    }

    /// @notice Registers a project without global geospatial deduplication.
    /// @param projectId Registry-local project identifier.
    /// @param geoCommitment Geospatial commitment (stored passively, not enforced across registries).
    /// @param evidenceCid IPFS CID string.
    function registerProject(bytes32 projectId, bytes32 geoCommitment, string calldata evidenceCid)
        external
        onlyRole(REGISTRY_ROLE)
    {
        if (projectId == bytes32(0) || geoCommitment == bytes32(0) || bytes(evidenceCid).length == 0) {
            revert InvalidProjectParameters();
        }
        if (projects[projectId].exists) {
            revert ProjectAlreadyRegistered(projectId);
        }

        projects[projectId] = BaselineProject({
            projectId: projectId,
            geoCommitment: geoCommitment,
            evidenceCid: evidenceCid,
            registrar: msg.sender,
            exists: true
        });

        emit BaselineProjectRegistered(projectId, geoCommitment, msg.sender, evidenceCid);
    }

    /// @notice Issues carbon credits using only a local `(registrar, projectId, vintageYear)` check
    ///         (vulnerable to cross-registry double issuance on the same `geoCommitment` + `vintageYear`).
    /// @param projectId Registered project identifier.
    /// @param vintageYear Credit vintage year.
    /// @param creditType Credit type code.
    /// @param amount Number of credits to mint.
    /// @return serialId Newly minted ERC1155 token ID.
    function issue(bytes32 projectId, uint16 vintageYear, uint8 creditType, uint256 amount)
        public
        onlyRole(REGISTRY_ROLE)
        returns (uint256 serialId)
    {
        BaselineProject storage proj = projects[projectId];
        if (!proj.exists) {
            revert ProjectNotFound(projectId);
        }

        bytes32 localKey = keccak256(abi.encode(msg.sender, projectId, vintageYear, creditType));
        if (localProjectVintageIssued[localKey]) {
            revert LocalVintageAlreadyIssued(localKey);
        }
        localProjectVintageIssued[localKey] = true;

        serialId = nextSerialId++;
        totalIssued[serialId] += amount;
        _mint(msg.sender, serialId, amount, "");

        emit BaselineIssued(projectId, serialId, amount, vintageYear, creditType, proj.evidenceCid);
    }

    /// @notice Overload matching CarbonRegistry.issue signature to demonstrate that the baseline
    ///         centralized registry ignores geospatial coordinates and salt, allowing both
    ///         cross-registry double issuance and salt-dodge double issuance to succeed.
    function issue(
        bytes32 projectId,
        bytes8, /* geohash8 */
        bytes32, /* salt */
        uint16 vintageYear,
        CarbonRegistry.CreditType creditType,
        uint256 amount,
        bytes32, /* dataCommitment */
        bytes calldata /* ezklProof */
    ) external onlyRole(REGISTRY_ROLE) returns (uint256 serialId) {
        return issue(projectId, vintageYear, uint8(creditType), amount);
    }

    /// @notice Burns the caller's full balance of each specified serial batch ID (transfer-log traceability only).
    /// @param serialIds Array of ERC1155 batch IDs to burn.
    /// @param claimType Claim classification code.
    function retire(uint256[] calldata serialIds, uint8 claimType) external {
        for (uint256 i = 0; i < serialIds.length; ++i) {
            uint256 serialId = serialIds[i];
            uint256 bal = balanceOf(msg.sender, serialId);
            if (bal == 0) {
                revert InsufficientBalance(serialId);
            }
            totalRetired[serialId] += bal;
            _burn(msg.sender, serialId, bal);
        }
        emit BaselineRetired(msg.sender, serialIds, claimType);
    }

    /// @notice ERC165 interface support check across `ERC1155` and `AccessControl`.
    /// @param interfaceId 4-byte interface identifier.
    /// @return supported True if the interface is supported.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool supported)
    {
        return super.supportsInterface(interfaceId);
    }
}

