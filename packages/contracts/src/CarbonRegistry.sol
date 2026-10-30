// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title IHalo2Verifier
/// @notice Interface for the ezkl-generated Halo2 KZG verifier contract.
interface IHalo2Verifier {
    /// @notice Verifies a Halo2 proof against public circuit instances.
    /// @param proof Raw Halo2 transcript bytes.
    /// @param instances Public circuit instances `[modelHash, dataCommitment, claimedAmount]`.
    /// @return verified True if the proof and public instances satisfy the circuit constraints.
    function verifyProof(bytes calldata proof, uint256[] calldata instances) external returns (bool verified);
}

/// @title CarbonRegistry
/// @notice Zero-knowledge verifiable carbon credit registry with cross-registry geospatial issuance
///         and claim nullifiers.
/// @dev Core contribution of the VeriCarbon manuscript:
///      - `geoCommitment := keccak256(abi.encode(geohash8, salt))`
///      - `issuanceNullifier := keccak256(abi.encode(geoCommitment, vintageYear, creditType))`
///        (Deliberately EXCLUDES `registryId` so cross-registry double issuance of the same
///        land parcel and vintage year collides and reverts.)
///      - `claimNullifier := keccak256(abi.encode(issuanceNullifier, claimant, claimType, beneficiaryCommitment))`
///      - Issuance requires a valid `ezkl` Halo2 proof verified on-chain over public inputs
///        `[modelHash, dataCommitment, claimedAmount]`.
contract CarbonRegistry is ERC1155, AccessControl {
    /// @notice Role granted to authorized carbon credit registries (multiple registries supported).
    bytes32 public constant REGISTRY_ROLE = keccak256("REGISTRY_ROLE");

    /// @notice Deployed ezkl Halo2 verifier contract.
    IHalo2Verifier public immutable verifier;

    /// @notice Fixed circuit modelHash public instance bound to the verified ONNX biomass model.
    bytes32 public immutable modelHash;

    /// @notice Next monotonically increasing ERC1155 tokenId (serial batch ID, starting at 1).
    uint256 public nextSerialId = 1;

    /// @notice Metadata stored for each registered carbon project.
    struct Project {
        bytes32 projectId;
        bytes32 geoCommitment;
        string evidenceCid;
        address registrar;
        bool exists;
    }

    /// @notice Metadata stored for each issued ERC1155 credit batch (`tokenId = serialId`).
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

    /// @notice Mapping from `projectId` to registered project metadata.
    mapping(bytes32 => Project) public projects;

    /// @notice Mapping from ERC1155 `serialId` (`tokenId`) to issued batch metadata.
    mapping(uint256 => CreditBatch) public batches;

    /// @notice Global cross-registry issuance nullifier set (`issuanceNullifier => spent`).
    mapping(bytes32 => bool) public issuanceNullifierSpent;

    /// @notice Global retirement/claim nullifier set (`claimNullifier => spent`).
    mapping(bytes32 => bool) public claimNullifierSpent;

    /// @notice Optional treasury override per registry operator (`registrar => treasuryAddress`).
    mapping(address => address) public registryTreasury;

    /// @notice Total credits issued per `serialId` (`tokenId`).
    mapping(uint256 => uint256) public totalIssued;

    /// @notice Total credits retired (burned) per `serialId` (`tokenId`).
    mapping(uint256 => uint256) public totalRetired;

    /// @dev Array of all recorded claimNullifiers for invariant verification.
    bytes32[] internal _recordedClaimNullifiers;

    /// @notice Emitted when a registry registers a project with its geospatial commitment and IPFS CID.
    /// @param projectId Unique project identifier.
    /// @param geoCommitment `keccak256(abi.encode(geohash8, salt))`.
    /// @param registrar Address of the `REGISTRY_ROLE` operator registering the project.
    /// @param evidenceCid IPFS CID of the off-chain evidence bundle.
    event ProjectRegistered(
        bytes32 indexed projectId,
        bytes32 indexed geoCommitment,
        address indexed registrar,
        string evidenceCid
    );

    /// @notice Emitted when verified carbon credits are issued for a project and vintage.
    /// @param issuanceNullifier `keccak256(abi.encode(geoCommitment, vintageYear, creditType))`.
    /// @param projectId Registered project identifier.
    /// @param amount Number of credits minted into the new serial batch.
    /// @param vintageYear Vintage year of the carbon credits.
    /// @param creditType Credit classification enum value.
    /// @param evidenceCid IPFS CID of the audited evidence bundle.
    event Issued(
        bytes32 indexed issuanceNullifier,
        bytes32 indexed projectId,
        uint256 amount,
        uint16 vintageYear,
        uint8 creditType,
        string evidenceCid
    );

    /// @notice Emitted when a credit holder retires/claims credits and records a claimNullifier.
    /// @param claimNullifier `keccak256(abi.encode(issuanceNullifier, claimant, claimType, beneficiaryCommitment))`.
    /// @param serialIds Array of ERC1155 batch serial IDs retired in the call.
    /// @param claimType Claim classification (e.g., 1 = voluntary offset retirement, 2 = compliance surrender).
    event Claimed(bytes32 indexed claimNullifier, uint256[] serialIds, uint8 claimType);

    error ZeroAddress();
    error InvalidProjectParameters();
    error ProjectAlreadyRegistered(bytes32 projectId);
    error ProjectNotFound(bytes32 projectId);
    error InvalidIssuanceAmount();
    error InvalidZKProof();
    error IssuanceNullifierAlreadySpent(bytes32 issuanceNullifier);
    error EmptySerialBatchList();
    error InvalidBeneficiaryCommitment();
    error BatchDoesNotExist(uint256 serialId);
    error ClaimNullifierAlreadySpent(bytes32 claimNullifier);
    error InsufficientBatchBalance(uint256 serialId);
    error ArrayLengthMismatch();

    /// @notice Initializes the VeriCarbon registry with the Halo2 verifier and circuit modelHash.
    /// @param verifierAddress Address of the deployed `Halo2Verifier` contract.
    /// @param circuitModelHash Public circuit constant representing the verified ONNX model hash.
    /// @param admin Initial `DEFAULT_ADMIN_ROLE` and `REGISTRY_ROLE` holder.
    constructor(address verifierAddress, bytes32 circuitModelHash, address admin)
        ERC1155("ipfs://vericarbon/{id}.json")
    {
        if (verifierAddress == address(0) || admin == address(0)) {
            revert ZeroAddress();
        }
        verifier = IHalo2Verifier(verifierAddress);
        modelHash = circuitModelHash;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRY_ROLE, admin);
    }

    /// @notice Computes the geospatial commitment per `AGENT.md`: `keccak256(abi.encode(geohash8, salt))`.
    /// @param geohash8 8-byte ASCII geohash of the project AOI centroid.
    /// @param salt 32-byte client-generated random salt disclosed in the IPFS evidence bundle.
    /// @return geoCommitment Resulting 32-byte commitment hash.
    function computeGeoCommitment(bytes8 geohash8, bytes32 salt) external pure returns (bytes32 geoCommitment) {
        return keccak256(abi.encode(geohash8, salt));
    }

    /// @notice Computes the cross-registry issuance nullifier per `AGENT.md`:
    ///         `keccak256(abi.encode(geoCommitment, vintageYear, creditType))`.
    /// @dev Deliberately excludes `registryId` so any two registries attempting to issue credits
    ///      for the same land parcel and vintage year collide on this nullifier.
    /// @param geoCommitment Geospatial commitment of the land parcel.
    /// @param vintageYear Credit vintage year.
    /// @param creditType Credit type identifier.
    /// @return issuanceNullifier Resulting 32-byte issuance nullifier.
    function computeIssuanceNullifier(bytes32 geoCommitment, uint16 vintageYear, uint8 creditType)
        public
        pure
        returns (bytes32 issuanceNullifier)
    {
        return keccak256(abi.encode(geoCommitment, vintageYear, creditType));
    }

    /// @notice Computes the retirement/claim nullifier per `AGENT.md`:
    ///         `keccak256(abi.encode(issuanceNullifier, claimant, claimType, beneficiaryCommitment))`.
    /// @param issuanceNullifier Issuance nullifier of the underlying credit batch.
    /// @param claimant Address retiring/claiming the credits.
    /// @param claimType Claim classification code.
    /// @param beneficiaryCommitment Commitment to the retirement beneficiary statement.
    /// @return claimNullifier Resulting 32-byte claim nullifier.
    function computeClaimNullifier(
        bytes32 issuanceNullifier,
        address claimant,
        uint8 claimType,
        bytes32 beneficiaryCommitment
    ) public pure returns (bytes32 claimNullifier) {
        return keccak256(abi.encode(issuanceNullifier, claimant, claimType, beneficiaryCommitment));
    }

    /// @notice Configures the receiving treasury address for a `REGISTRY_ROLE` operator.
    /// @param registrar Address of the registry operator.
    /// @param treasury Treasury address that receives minted credit batches.
    function setRegistryTreasury(address registrar, address treasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (registrar == address(0) || treasury == address(0)) {
            revert ZeroAddress();
        }
        registryTreasury[registrar] = treasury;
    }

    /// @notice Registers a carbon project with its geospatial commitment and IPFS evidence CID.
    /// @param projectId Unique 32-byte project identifier.
    /// @param geoCommitment `keccak256(abi.encode(geohash8, salt))` commitment to the project plot.
    /// @param evidenceCid IPFS CID string referencing the off-chain evidence bundle.
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

        projects[projectId] = Project({
            projectId: projectId,
            geoCommitment: geoCommitment,
            evidenceCid: evidenceCid,
            registrar: msg.sender,
            exists: true
        });

        emit ProjectRegistered(projectId, geoCommitment, msg.sender, evidenceCid);
    }

    /// @notice Issues verifiable carbon credits after verifying the on-chain ezkl Halo2 proof and
    ///         recording the cross-registry issuance nullifier.
    /// @param projectId Registered project identifier.
    /// @param vintageYear Vintage year of the credits.
    /// @param creditType Credit type code.
    /// @param amount Claimed credit amount (verified against `model(preimage(dataCommitment))` in-circuit).
    /// @param dataCommitment Circuit feature commitment bound in the ezkl proof public inputs.
    /// @param ezklProof Halo2 proof bytes verified by `Halo2Verifier`.
    /// @return serialId Newly minted ERC1155 batch token ID.
    function issue(
        bytes32 projectId,
        uint16 vintageYear,
        uint8 creditType,
        uint256 amount,
        bytes32 dataCommitment,
        bytes calldata ezklProof
    ) external onlyRole(REGISTRY_ROLE) returns (uint256 serialId) {
        Project storage proj = projects[projectId];
        if (!proj.exists) {
            revert ProjectNotFound(projectId);
        }
        if (amount == 0) {
            revert InvalidIssuanceAmount();
        }

        // (a) Verify ezklProof against the deployed Halo2Verifier with public inputs:
        //     [modelHash, dataCommitment, amount]
        uint256[] memory instances = new uint256[](3);
        instances[0] = uint256(modelHash);
        instances[1] = uint256(dataCommitment);
        instances[2] = amount;

        try verifier.verifyProof(ezklProof, instances) returns (bool ok) {
            if (!ok) {
                revert InvalidZKProof();
            }
        } catch {
            revert InvalidZKProof();
        }

        // (b) Compute issuanceNullifier per AGENT.md formula (excludes registryId!)
        bytes32 issuanceNullifier = computeIssuanceNullifier(proj.geoCommitment, vintageYear, creditType);

        // (c) Require !issuanceNullifierSpent[issuanceNullifier], then set true
        if (issuanceNullifierSpent[issuanceNullifier]) {
            revert IssuanceNullifierAlreadySpent(issuanceNullifier);
        }
        issuanceNullifierSpent[issuanceNullifier] = true;

        // (d) Mint ERC1155 batch to registry treasury
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
        totalIssued[serialId] += amount;

        address treasury = registryTreasury[msg.sender];
        if (treasury == address(0)) {
            treasury = msg.sender;
        }
        _mint(treasury, serialId, amount, "");

        // (e) Emit Issued event
        emit Issued(issuanceNullifier, projectId, amount, vintageYear, creditType, proj.evidenceCid);
    }

    /// @notice Retires (burns) the caller's full balance of each specified credit batch serial ID
    ///         and records a unique `claimNullifier` per batch.
    /// @param serialIds Array of ERC1155 batch `serialId`s to retire.
    /// @param claimType Claim classification code.
    /// @param beneficiaryCommitment Commitment to the retirement beneficiary identity/statement.
    function retire(uint256[] calldata serialIds, uint8 claimType, bytes32 beneficiaryCommitment) external {
        if (serialIds.length == 0) {
            revert EmptySerialBatchList();
        }
        if (beneficiaryCommitment == bytes32(0)) {
            revert InvalidBeneficiaryCommitment();
        }

        for (uint256 i = 0; i < serialIds.length; ++i) {
            uint256 serialId = serialIds[i];
            CreditBatch storage batch = batches[serialId];
            if (!batch.exists) {
                revert BatchDoesNotExist(serialId);
            }

            bytes32 claimNullifier =
                computeClaimNullifier(batch.issuanceNullifier, msg.sender, claimType, beneficiaryCommitment);
            if (claimNullifierSpent[claimNullifier]) {
                revert ClaimNullifierAlreadySpent(claimNullifier);
            }

            uint256 burnAmount = balanceOf(msg.sender, serialId);
            if (burnAmount == 0) {
                revert InsufficientBatchBalance(serialId);
            }

            claimNullifierSpent[claimNullifier] = true;
            _recordedClaimNullifiers.push(claimNullifier);
            totalRetired[serialId] += burnAmount;

            _burn(msg.sender, serialId, burnAmount);
            emit Claimed(claimNullifier, serialIds, claimType);
        }
    }

    /// @notice Retires (burns) explicit partial or full amounts of each specified credit batch serial ID
    ///         and records a unique `claimNullifier` per batch.
    /// @param serialIds Array of ERC1155 batch `serialId`s to retire.
    /// @param amounts Array of credit quantities to burn for each corresponding `serialId`.
    /// @param claimType Claim classification code.
    /// @param beneficiaryCommitment Commitment to the retirement beneficiary identity/statement.
    function retireAmounts(
        uint256[] calldata serialIds,
        uint256[] calldata amounts,
        uint8 claimType,
        bytes32 beneficiaryCommitment
    ) external {
        if (serialIds.length == 0) {
            revert EmptySerialBatchList();
        }
        if (serialIds.length != amounts.length) {
            revert ArrayLengthMismatch();
        }
        if (beneficiaryCommitment == bytes32(0)) {
            revert InvalidBeneficiaryCommitment();
        }

        for (uint256 i = 0; i < serialIds.length; ++i) {
            uint256 serialId = serialIds[i];
            uint256 burnAmount = amounts[i];
            CreditBatch storage batch = batches[serialId];
            if (!batch.exists) {
                revert BatchDoesNotExist(serialId);
            }

            bytes32 claimNullifier =
                computeClaimNullifier(batch.issuanceNullifier, msg.sender, claimType, beneficiaryCommitment);
            if (claimNullifierSpent[claimNullifier]) {
                revert ClaimNullifierAlreadySpent(claimNullifier);
            }
            if (burnAmount == 0 || balanceOf(msg.sender, serialId) < burnAmount) {
                revert InsufficientBatchBalance(serialId);
            }

            claimNullifierSpent[claimNullifier] = true;
            _recordedClaimNullifiers.push(claimNullifier);
            totalRetired[serialId] += burnAmount;

            _burn(msg.sender, serialId, burnAmount);
            emit Claimed(claimNullifier, serialIds, claimType);
        }
    }

    /// @notice Returns the total number of recorded claim nullifiers.
    /// @return count Number of recorded claim nullifiers.
    function recordedClaimNullifierCount() external view returns (uint256 count) {
        return _recordedClaimNullifiers.length;
    }

    /// @notice Returns the recorded claim nullifier at index `idx`.
    /// @param idx Array index in `_recordedClaimNullifiers`.
    /// @return claimNullifier Recorded 32-byte claim nullifier.
    function recordedClaimNullifierAt(uint256 idx) external view returns (bytes32 claimNullifier) {
        return _recordedClaimNullifiers[idx];
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

