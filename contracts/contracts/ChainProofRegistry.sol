// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ChainProofRegistry - cryptographic registration evidence, not a copyright registry
contract ChainProofRegistry {
    struct Proof {
        bytes32 contentHash;
        address creator;
        uint64 registeredAt;
        string category;
        string licenseName;
        uint32 version;
        string previousIpId;
        bool exists;
    }

    mapping(string => Proof) private proofs;

    event IPRegistered(
        string indexed ipId,
        bytes32 indexed contentHash,
        address indexed creator,
        uint64 timestamp,
        string category,
        string licenseName,
        uint32 version,
        string previousIpId
    );

    function registerIP(
        string calldata ipId,
        bytes32 contentHash,
        string calldata category,
        string calldata licenseName,
        uint32 version,
        string calldata previousIpId
    ) external {
        require(bytes(ipId).length > 0, "IP ID required");
        require(!proofs[ipId].exists, "IP ID already registered");
        proofs[ipId] = Proof(contentHash, msg.sender, uint64(block.timestamp), category, licenseName, version, previousIpId, true);
        emit IPRegistered(ipId, contentHash, msg.sender, uint64(block.timestamp), category, licenseName, version, previousIpId);
    }

    function getProof(string calldata ipId) external view returns (Proof memory) {
        require(proofs[ipId].exists, "Proof not found");
        return proofs[ipId];
    }
}
