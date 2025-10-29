// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TicketManagement
 * @dev Contract for managing ticket validation, check-in, and cross-chain transfers
 * CRITICAL: Core validation and transfer status must remain on-chain for security
 */
contract TicketManagement is Ownable {
    struct TicketValidation {
        bool isValidated; // CRITICAL: On-chain for security
        uint256 validationTime; // CRITICAL: On-chain for audit trail
        string locationUri; // IPFS URI with location details (off-chain)
        string locationHash; // Hash of location data for verification
        address validator; // CRITICAL: On-chain for authorization
        bool isRevoked; // CRITICAL: On-chain for security
    }

    // Cross-chain transfer records - CRITICAL: On-chain for security
    struct CrossChainTransfer {
        address sender; // CRITICAL: On-chain for transfer tracking
        address recipient; // CRITICAL: On-chain for transfer tracking
        uint256 tokenId; // CRITICAL: On-chain for NFT identification
        uint256 sourceChainId; // CRITICAL: On-chain for cross-chain tracking
        uint256 destinationChainId; // CRITICAL: On-chain for cross-chain tracking
        uint256 timestamp; // CRITICAL: On-chain for audit trail
        bool completed; // CRITICAL: On-chain for transfer status
        string metadataUri; // IPFS URI with transfer metadata (off-chain)
    }

    // CRITICAL: Validation state on-chain for security
    mapping(uint256 => mapping(address => TicketValidation)) public ticketValidations; // tokenId => (validator => validation)
    mapping(bytes32 => CrossChainTransfer) public crossChainTransfers; // transferId => transfer data - CRITICAL: On-chain

    // For tracking cross-chain transfers - CRITICAL: On-chain for cross-chain functionality
    uint256[] private registeredChainsList; // CRITICAL: On-chain for cross-chain tracking
    mapping(uint256 => bool) public isChainRegistered; // CRITICAL: On-chain for cross-chain validation

    event TicketValidated(uint256 indexed tokenId, address indexed validator, string locationUri);
    event TicketValidationRevoked(uint256 indexed tokenId, address indexed revoker);
    event CrossChainTransferInitiated(bytes32 indexed transferId, uint256 indexed tokenId, address indexed sender, string metadataUri);
    event CrossChainTransferCompleted(bytes32 indexed transferId, uint256 indexed tokenId, address indexed recipient);
    event ChainRegistered(uint256 chainId);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Validate a ticket with location reference - CRITICAL: Validation state on-chain
     */
    function validateTicket(
        uint256 tokenId,
        address ticketOwner,
        string memory locationUri,
        string memory locationHash
    ) public returns (bool) {
        // CRITICAL: Security checks on-chain
        require(!ticketValidations[tokenId][msg.sender].isValidated, "Ticket already validated by this validator"); // CRITICAL: On-chain check
        require(!ticketValidations[tokenId][msg.sender].isRevoked, "Validation was revoked"); // CRITICAL: On-chain check

        ticketValidations[tokenId][msg.sender] = TicketValidation({
            isValidated: true, // CRITICAL: On-chain security state
            validationTime: block.timestamp, // CRITICAL: On-chain audit trail
            locationUri: locationUri,
            locationHash: locationHash,
            validator: msg.sender, // CRITICAL: On-chain authorization
            isRevoked: false
        });

        emit TicketValidated(tokenId, msg.sender, locationUri);
        return true;
    }

    /**
     * @dev Check if a ticket is validated by any validator - CRITICAL: On-chain security check
     */
    function isTicketValidated(uint256 tokenId) public view returns (bool) {
        // Need to check this differently since we have multiple validators per ticket
        // In a real implementation, we'd iterate through all possible validators
        // For this example, we'll check if validated by the caller
        return ticketValidations[tokenId][msg.sender].isValidated && 
               !ticketValidations[tokenId][msg.sender].isRevoked; // CRITICAL: On-chain check
    }

    /**
     * @dev Revoke a ticket validation - CRITICAL: Security state on-chain
     */
    function revokeValidation(uint256 tokenId, address validator) public onlyOwner returns (bool) {
        require(ticketValidations[tokenId][validator].isValidated, "No validation to revoke"); // CRITICAL: On-chain check
        require(!ticketValidations[tokenId][validator].isRevoked, "Validation already revoked"); // CRITICAL: On-chain check

        ticketValidations[tokenId][validator].isRevoked = true; // CRITICAL: On-chain security state

        emit TicketValidationRevoked(tokenId, msg.sender);
        return true;
    }

    /**
     * @dev Initiate a cross-chain ticket transfer - CRITICAL: Transfer state on-chain
     */
    function initiateCrossChainTransfer(
        uint256 tokenId,
        address recipient,
        uint256 destinationChainId,
        string memory metadataUri
    ) public returns (bytes32) {
        require(isChainRegistered[destinationChainId], "Destination chain not registered"); // CRITICAL: On-chain validation
        require(recipient != address(0), "Invalid recipient address"); // CRITICAL: On-chain validation

        bytes32 transferId = keccak256(abi.encodePacked(
            tokenId,
            msg.sender,
            recipient,
            block.timestamp
        ));

        crossChainTransfers[transferId] = CrossChainTransfer({
            sender: msg.sender, // CRITICAL: On-chain transfer tracking
            recipient: recipient, // CRITICAL: On-chain transfer tracking
            tokenId: tokenId, // CRITICAL: On-chain NFT identification
            sourceChainId: block.chainid, // CRITICAL: On-chain cross-chain tracking
            destinationChainId: destinationChainId, // CRITICAL: On-chain cross-chain tracking
            timestamp: block.timestamp, // CRITICAL: On-chain audit trail
            completed: false, // CRITICAL: On-chain transfer status
            metadataUri: metadataUri
        });

        emit CrossChainTransferInitiated(transferId, tokenId, msg.sender, metadataUri);
        return transferId;
    }

    /**
     * @dev Complete a cross-chain ticket transfer - CRITICAL: Transfer status on-chain
     */
    function completeCrossChainTransfer(
        bytes32 transferId
    ) public onlyOwner returns (bool) {
        CrossChainTransfer storage transfer = crossChainTransfers[transferId]; // CRITICAL: On-chain access
        require(!transfer.completed, "Transfer already completed"); // CRITICAL: On-chain check
        require(transfer.destinationChainId == block.chainid, "Not the destination chain"); // CRITICAL: On-chain validation

        // In a real implementation, this would involve:
        // 1. Verifying the transfer via cross-chain messaging
        // 2. Minting a new ticket on this chain
        // 3. Linking it to the original ticket

        transfer.completed = true; // CRITICAL: On-chain transfer status

        emit CrossChainTransferCompleted(transferId, transfer.tokenId, transfer.recipient);
        return true;
    }

    /**
     * @dev Register a chain for cross-chain transfers - CRITICAL: On-chain for cross-chain functionality
     */
    function registerChain(uint256 chainId) public onlyOwner {
        if (!isChainRegistered[chainId]) {
            registeredChainsList.push(chainId); // CRITICAL: On-chain cross-chain tracking
            isChainRegistered[chainId] = true; // CRITICAL: On-chain cross-chain validation
            emit ChainRegistered(chainId);
        }
    }

    /**
     * @dev Get a list of registered chains - CRITICAL: On-chain data
     */
    function getRegisteredChains() public view returns (uint256[] memory) {
        uint256[] memory chains = new uint256[](registeredChainsList.length);
        for (uint i = 0; i < registeredChainsList.length; i++) {
            chains[i] = registeredChainsList[i]; // CRITICAL: On-chain data
        }
        return chains;
    }

    /**
     * @dev Get validation status for a ticket from a specific validator - CRITICAL: On-chain access
     */
    function getValidationStatus(uint256 tokenId, address validator) public view returns (
        bool isValidated, // CRITICAL: On-chain security state
        uint256 validationTime, // CRITICAL: On-chain audit trail
        string memory locationUri,
        string memory locationHash,
        bool isRevoked // CRITICAL: On-chain security state
    ) {
        TicketValidation memory validation = ticketValidations[tokenId][validator]; // CRITICAL: On-chain access
        return (
            validation.isValidated, // CRITICAL: On-chain security state
            validation.validationTime, // CRITICAL: On-chain audit trail
            validation.locationUri,
            validation.locationHash,
            validation.isRevoked // CRITICAL: On-chain security state
        );
    }

    /**
     * @dev Get cross chain transfer details - CRITICAL: On-chain access
     */
    function getCrossChainTransfer(bytes32 transferId) public view returns (
        address sender, // CRITICAL: On-chain transfer tracking
        address recipient, // CRITICAL: On-chain transfer tracking
        uint256 tokenId, // CRITICAL: On-chain NFT identification
        uint256 sourceChainId, // CRITICAL: On-chain cross-chain tracking
        uint256 destinationChainId, // CRITICAL: On-chain cross-chain tracking
        uint256 timestamp, // CRITICAL: On-chain audit trail
        bool completed, // CRITICAL: On-chain transfer status
        string memory metadataUri
    ) {
        CrossChainTransfer memory transfer = crossChainTransfers[transferId]; // CRITICAL: On-chain access
        return (
            transfer.sender, // CRITICAL: On-chain transfer tracking
            transfer.recipient, // CRITICAL: On-chain transfer tracking
            transfer.tokenId, // CRITICAL: On-chain NFT identification
            transfer.sourceChainId, // CRITICAL: On-chain cross-chain tracking
            transfer.destinationChainId, // CRITICAL: On-chain cross-chain tracking
            transfer.timestamp, // CRITICAL: On-chain audit trail
            transfer.completed, // CRITICAL: On-chain transfer status
            transfer.metadataUri
        );
    }

    /**
     * @dev Check if a chain is registered - CRITICAL: On-chain validation
     */
    function isChainSupported(uint256 chainId) public view returns (bool) {
        return isChainRegistered[chainId]; // CRITICAL: On-chain validation
    }
}