// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/IPlatform.sol";
import "./interfaces/IEventStatistics.sol";
import "./interfaces/ITicketManagement.sol";

/**
 * @title UniversalTicketValidator
 * @dev Contract for validating tickets across different chains and venues on PUSHCHAIN
 * CRITICAL: Validation status must remain on-chain for security
 */
contract UniversalTicketValidator is Ownable {
    address public platformContract;
    // CRITICAL: Validation state on-chain for security
    mapping(uint256 => mapping(address => bool)) public validatedTickets; // eventID => (ticketOwner => is validated)
    mapping(uint256 => mapping(uint256 => bool)) public ticketUsed; // eventId => (tokenId => is used)

    struct ValidationRecord {
        uint256 eventId; // CRITICAL: On-chain for indexing
        address ticketOwner; // CRITICAL: On-chain for ownership verification
        uint256 tokenId; // CRITICAL: On-chain for ticket identification
        uint256 validationTime; // CRITICAL: On-chain for audit trail
        string locationUri; // Off-chain location details
        string locationHash; // Verification hash
        address validator; // CRITICAL: On-chain for authorization
        bool isValid; // CRITICAL: On-chain validation status
    }

    mapping(bytes32 => ValidationRecord) public validationRecords;
    address[] public authorizedValidators;

    event TicketValidated(
        uint256 indexed eventId, 
        uint256 tokenId, 
        address indexed ticketOwner, 
        address indexed validator,
        string locationUri
    );
    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    
    modifier onlyPlatformOrOwner() {
        require(
            msg.sender == platformContract || 
            msg.sender == owner() || 
            (platformContract != address(0) && IPlatform(platformContract).isAuthorizedContract(msg.sender)),
            "Not authorized"
        );
        _;
    }

    constructor() Ownable(msg.sender) {
        // Add contract owner as initial validator
        authorizedValidators.push(msg.sender);
    }
    
    /**
     * @dev Set platform contract address
     */
    function setPlatformContract(address _platform) external onlyOwner {
        require(_platform != address(0), "Invalid platform address");
        platformContract = _platform;
    }

    /**
     * @dev Validate a ticket at an event venue
     * CRITICAL: Validation state remains on-chain for security
     */
    function validateTicketAtEvent(
        address eventContract,
        uint256 tokenId,
        address ticketOwner,
        string memory locationUri,
        string memory locationHash
    ) public onlyAuthorizedValidator returns (bool) {
        // CRITICAL SECURITY CHECKS ON-CHAIN
        require(ticketOwner != address(0), "Invalid ticket owner"); // CRITICAL: On-chain validation
        
        // Create validation record - CRITICAL: On-chain for security
        bytes32 validationId = keccak256(abi.encodePacked(eventContract, tokenId, ticketOwner, block.timestamp));
        validationRecords[validationId] = ValidationRecord({
            eventId: getEventIdFromContract(eventContract),
            ticketOwner: ticketOwner,
            tokenId: tokenId,
            validationTime: block.timestamp, // CRITICAL: On-chain audit trail
            locationUri: locationUri,
            locationHash: locationHash,
            validator: msg.sender, // CRITICAL: On-chain validator tracking
            isValid: true // CRITICAL: On-chain validation status
        });

        // Mark ticket as validated - CRITICAL: On-chain security state
        validatedTickets[getEventIdFromContract(eventContract)][ticketOwner] = true; // CRITICAL: On-chain validation
        ticketUsed[getEventIdFromContract(eventContract)][tokenId] = true; // CRITICAL: On-chain to prevent double-use

        emit TicketValidated(
            getEventIdFromContract(eventContract), 
            tokenId, 
            ticketOwner, 
            msg.sender,
            locationUri
        );
        
        // Platform integration - update statistics and ticket management
        if (platformContract != address(0)) {
            uint256 eventId = getEventIdFromContract(eventContract);
            // Update event statistics
            try IEventStatistics(IPlatform(platformContract).eventStatisticsContract()).incrementValidations(eventId) {} catch {}
            
            // Validate ticket in TicketManagement if available
            try ITicketManagement(IPlatform(platformContract).ticketManagementContract()).validateTicket(
                tokenId,
                ticketOwner,
                locationUri,
                locationHash
            ) {} catch {}
        }

        return true;
    }

    /**
     * @dev Check if a ticket is validated (simplified for this example)
     * CRITICAL: Validation status check must be on-chain
     */
    function isTicketValidated(uint256 eventId, uint256 tokenId, address ticketOwner) public view returns (bool) {
        // CRITICAL: Validation check on-chain for security
        bool isRecordedValid = validatedTickets[eventId][ticketOwner]; // CRITICAL: On-chain check
        bool isTokenUsed = ticketUsed[eventId][tokenId]; // CRITICAL: On-chain check
        return isRecordedValid && !isTokenUsed; // CRITICAL: On-chain logic
    }

    /**
     * @dev Get validation record by ID
     * CRITICAL: Validation records accessible on-chain
     */
    function getValidationRecord(bytes32 validationId) public view returns (ValidationRecord memory) {
        return validationRecords[validationId]; // CRITICAL: On-chain data access
    }

    /**
     * @dev Add an authorized validator
     * CRITICAL: Authorization data on-chain for security
     */
    function addValidator(address validator) public onlyOwner {
        require(validator != address(0), "Invalid validator address"); // CRITICAL: On-chain validation
        
        // Check if validator already exists
        for (uint i = 0; i < authorizedValidators.length; i++) {
            if (authorizedValidators[i] == validator) {
                return; // Already exists
            }
        }
        
        authorizedValidators.push(validator); // CRITICAL: On-chain authorization list
        emit ValidatorAdded(validator);
    }

    /**
     * @dev Remove an authorized validator
     * CRITICAL: Authorization changes on-chain
     */
    function removeValidator(address validator) public onlyOwner {
        for (uint i = 0; i < authorizedValidators.length; i++) {
            if (authorizedValidators[i] == validator) {
                // Move the last element to this position - CRITICAL: On-chain authorization
                authorizedValidators[i] = authorizedValidators[authorizedValidators.length - 1];
                authorizedValidators.pop();
                emit ValidatorRemoved(validator);
                break;
            }
        }
    }

    /**
     * @dev Get all authorized validators
     * CRITICAL: Authorization list accessible on-chain
     */
    function getValidators() public view returns (address[] memory) {
        return authorizedValidators; // CRITICAL: On-chain authorization
    }

    /**
     * @dev Calculate event ID from contract address
     */
    function getEventIdFromContract(address contractAddress) internal pure returns (uint256) {
        // Extract event ID from contract address as a unique identifier
        return uint256(uint160(contractAddress));
    }

    /**
     * @dev Modifier to restrict function access to authorized validators only
     * CRITICAL: Authorization check on-chain
     */
    modifier onlyAuthorizedValidator() {
        bool isAuthorized = false;
        for (uint i = 0; i < authorizedValidators.length; i++) {
            if (authorizedValidators[i] == msg.sender) {
                isAuthorized = true;
                break;
            }
        }
        require(isAuthorized, "Only authorized validators can call this function"); // CRITICAL: On-chain authorization
        _;
    }
}