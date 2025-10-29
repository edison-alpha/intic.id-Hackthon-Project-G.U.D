// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PushChainEticketingPlatform
 * @dev Main contract that orchestrates the entire PUSHCHAIN E-Ticketing platform
 * CRITICAL: Platform operations and configuration remain on-chain for security
 */
contract PushChainEticketingPlatform is Ownable {
    // CRITICAL: Contract addresses on-chain for platform operation
    address public eventOrganizerContract;
    address public universalValidatorContract;
    address public userProfileContract;
    address public eventReviewContract;
    address public notificationSystemContract;
    address public eventStatisticsContract;
    address public ticketManagementContract;
    address public nftMarketplaceContract;
    address public eventRefundContract;

    mapping(string => address) public contractRegistry; // CRITICAL: On-chain for platform operation
    mapping(address => bool) public authorizedContractUpgraders; // CRITICAL: On-chain for security
    
    // Permission system for inter-contract communication
    mapping(address => mapping(string => bool)) public contractPermissions; // contract => permission => allowed
    mapping(address => bool) public authorizedContracts; // Quick check for authorized contracts

    event ContractRegistered(string indexed name, address indexed contractAddress);
    event ContractUpgraded(string indexed name, address indexed oldAddress, address indexed newAddress);
    event PlatformInitialized();
    event PermissionGranted(address indexed contractAddr, string permission);
    event PermissionRevoked(address indexed contractAddr, string permission);

    constructor() Ownable(msg.sender) {
        emit PlatformInitialized();
    }

    /**
     * @dev Register a contract in the platform registry - CRITICAL: On-chain for platform operation
     */
    function registerContract(string memory name, address contractAddress) public onlyOwner {
        require(contractAddress != address(0), "Invalid contract address"); // CRITICAL: On-chain validation
        address oldAddress = contractRegistry[name]; // CRITICAL: On-chain access
        contractRegistry[name] = contractAddress; // CRITICAL: On-chain for platform operation
        
        // Mark as authorized contract
        authorizedContracts[contractAddress] = true;

        // Set the specific contract address - CRITICAL: On-chain for platform operation
        if (keccak256(bytes(name)) == keccak256(bytes("EventOrganizer"))) {
            eventOrganizerContract = contractAddress; // CRITICAL: On-chain for platform operation
        } else if (keccak256(bytes(name)) == keccak256(bytes("UniversalValidator"))) {
            universalValidatorContract = contractAddress; // CRITICAL: On-chain for platform operation
        } else if (keccak256(bytes(name)) == keccak256(bytes("UserProfile"))) {
            userProfileContract = contractAddress; // CRITICAL: On-chain for platform operation
        } else if (keccak256(bytes(name)) == keccak256(bytes("EventReview"))) {
            eventReviewContract = contractAddress; // CRITICAL: On-chain for platform operation
        } else if (keccak256(bytes(name)) == keccak256(bytes("NotificationSystem"))) {
            notificationSystemContract = contractAddress; // CRITICAL: On-chain for platform operation
        } else if (keccak256(bytes(name)) == keccak256(bytes("EventStatistics"))) {
            eventStatisticsContract = contractAddress; // CRITICAL: On-chain for platform operation
        } else if (keccak256(bytes(name)) == keccak256(bytes("TicketManagement"))) {
            ticketManagementContract = contractAddress; // CRITICAL: On-chain for platform operation
        } else if (keccak256(bytes(name)) == keccak256(bytes("NFTMarketplace"))) {
            nftMarketplaceContract = contractAddress;
        } else if (keccak256(bytes(name)) == keccak256(bytes("EventRefund"))) {
            eventRefundContract = contractAddress;
        }

        emit ContractRegistered(name, contractAddress); // CRITICAL: On-chain for audit trail
        
        if (oldAddress != address(0)) {
            emit ContractUpgraded(name, oldAddress, contractAddress); // CRITICAL: On-chain for audit trail
        }
    }

    /**
     * @dev Set up the full platform with all contracts - CRITICAL: On-chain for platform operation
     */
    function setupPlatform(
        address _eventOrganizer,
        address _universalValidator,
        address _userProfile,
        address _eventReview,
        address _notificationSystem,
        address _eventStatistics,
        address _ticketManagement
    ) public onlyOwner {
        registerContract("EventOrganizer", _eventOrganizer); // CRITICAL: On-chain for platform operation
        registerContract("UniversalValidator", _universalValidator); // CRITICAL: On-chain for platform operation
        registerContract("UserProfile", _userProfile); // CRITICAL: On-chain for platform operation
        registerContract("EventReview", _eventReview); // CRITICAL: On-chain for platform operation
        registerContract("NotificationSystem", _notificationSystem); // CRITICAL: On-chain for platform operation
        registerContract("EventStatistics", _eventStatistics); // CRITICAL: On-chain for platform operation
        registerContract("TicketManagement", _ticketManagement); // CRITICAL: On-chain for platform operation
    }
    
    /**
     * @dev Register additional contracts (NFTMarketplace, EventRefund)
     */
    function registerAdditionalContracts(
        address _nftMarketplace,
        address _eventRefund
    ) public onlyOwner {
        registerContract("NFTMarketplace", _nftMarketplace);
        registerContract("EventRefund", _eventRefund);
    }
    
    /**
     * @dev Grant permission to a contract for specific operations
     */
    function grantPermission(address contractAddr, string memory permission) public onlyOwner {
        require(contractAddr != address(0), "Invalid contract address");
        contractPermissions[contractAddr][permission] = true;
        emit PermissionGranted(contractAddr, permission);
    }
    
    /**
     * @dev Revoke permission from a contract
     */
    function revokePermission(address contractAddr, string memory permission) public onlyOwner {
        contractPermissions[contractAddr][permission] = false;
        emit PermissionRevoked(contractAddr, permission);
    }
    
    /**
     * @dev Check if contract has specific permission
     */
    function hasPermission(string memory contractName, address caller) public view returns (bool) {
        address contractAddr = contractRegistry[contractName];
        return contractAddr == caller || contractPermissions[caller][contractName];
    }
    
    /**
     * @dev Check if address is an authorized platform contract
     */
    function isAuthorizedContract(address contractAddr) public view returns (bool) {
        return authorizedContracts[contractAddr];
    }

    /**
     * @dev Add an address that can upgrade contracts - CRITICAL: On-chain for security
     */
    function addContractUpgrader(address upgrader) public onlyOwner {
        require(upgrader != address(0), "Invalid upgrader address"); // CRITICAL: On-chain validation
        authorizedContractUpgraders[upgrader] = true; // CRITICAL: On-chain for security
    }

    /**
     * @dev Remove an address from the contract upgraders list - CRITICAL: On-chain for security
     */
    function removeContractUpgrader(address upgrader) public onlyOwner {
        authorizedContractUpgraders[upgrader] = false; // CRITICAL: On-chain for security
    }

    /**
     * @dev Get the address of a registered contract - CRITICAL: On-chain access
     */
    function getContractAddress(string memory name) public view returns (address) {
        return contractRegistry[name]; // CRITICAL: On-chain access
    }

    /**
     * @dev Get the platform contract addresses - CRITICAL: On-chain access
     */
    function getPlatformContracts() public view returns (
        address eventOrganizer,
        address universalValidator,
        address userProfile,
        address eventReview,
        address notificationSystem,
        address eventStatistics,
        address ticketManagement
    ) {
        return (
            eventOrganizerContract, // CRITICAL: On-chain access
            universalValidatorContract, // CRITICAL: On-chain access
            userProfileContract, // CRITICAL: On-chain access
            eventReviewContract, // CRITICAL: On-chain access
            notificationSystemContract, // CRITICAL: On-chain access
            eventStatisticsContract, // CRITICAL: On-chain access
            ticketManagementContract // CRITICAL: On-chain access
        );
    }
    
    /**
     * @dev Get all platform contract addresses including additional ones
     */
    function getAllPlatformContracts() public view returns (
        address eventOrganizer,
        address universalValidator,
        address userProfile,
        address eventReview,
        address notificationSystem,
        address eventStatistics,
        address ticketManagement,
        address nftMarketplace,
        address eventRefund
    ) {
        return (
            eventOrganizerContract,
            universalValidatorContract,
            userProfileContract,
            eventReviewContract,
            notificationSystemContract,
            eventStatisticsContract,
            ticketManagementContract,
            nftMarketplaceContract,
            eventRefundContract
        );
    }

    /**
     * @dev Check if an address is authorized to upgrade contracts - CRITICAL: On-chain validation
     */
    function isAuthorizedContractUpgrader(address addr) public view returns (bool) {
        return authorizedContractUpgraders[addr]; // CRITICAL: On-chain validation
    }

    /**
     * @dev Function to receive Ether - CRITICAL: On-chain for financial operations
     */
    receive() external payable {
        // This contract might receive funds from various operations
        // Funds are held here temporarily before being distributed
    }

    /**
     * @dev Withdraw funds from the contract - CRITICAL: On-chain for financial operations
     */
    function withdrawFunds(address payable to, uint256 amount) public onlyOwner {
        require(to != address(0), "Invalid recipient address"); // CRITICAL: On-chain validation
        require(amount <= address(this).balance, "Insufficient balance"); // CRITICAL: On-chain validation
        (bool success, ) = to.call{value: amount}(""); // CRITICAL: On-chain financial operation
        require(success, "Transfer failed"); // CRITICAL: On-chain validation
    }

    /**
     * @dev Get the total balance of the platform contract - CRITICAL: On-chain for financial tracking
     */
    function getPlatformBalance() public view returns (uint256) {
        return address(this).balance; // CRITICAL: On-chain financial tracking
    }

    /**
     * @dev Function to pause/unpause platform operations - CRITICAL: On-chain for security
     */
    bool public platformPaused = false; // CRITICAL: On-chain for circuit breaker

    modifier whenNotPaused() {
        require(!platformPaused, "Platform is paused"); // CRITICAL: On-chain security check
        _;
    }

    function pausePlatform() public onlyOwner {
        platformPaused = true; // CRITICAL: On-chain security state
    }

    function unpausePlatform() public onlyOwner {
        platformPaused = false; // CRITICAL: On-chain security state
    }

    /**
     * @dev Emergency function to upgrade a contract - CRITICAL: On-chain for security
     */
    function emergencyUpgradeContract(string memory name, address newContract) public onlyOwner {
        require(newContract != address(0), "Invalid contract address"); // CRITICAL: On-chain validation
        contractRegistry[name] = newContract; // CRITICAL: On-chain for platform operation

        // Update specific contract addresses - CRITICAL: On-chain for platform operation
        if (keccak256(bytes(name)) == keccak256(bytes("EventOrganizer"))) {
            eventOrganizerContract = newContract; // CRITICAL: On-chain for platform operation
        } else if (keccak256(bytes(name)) == keccak256(bytes("UniversalValidator"))) {
            universalValidatorContract = newContract; // CRITICAL: On-chain for platform operation
        } else if (keccak256(bytes(name)) == keccak256(bytes("UserProfile"))) {
            userProfileContract = newContract; // CRITICAL: On-chain for platform operation
        } else if (keccak256(bytes(name)) == keccak256(bytes("EventReview"))) {
            eventReviewContract = newContract; // CRITICAL: On-chain for platform operation
        } else if (keccak256(bytes(name)) == keccak256(bytes("NotificationSystem"))) {
            notificationSystemContract = newContract; // CRITICAL: On-chain for platform operation
        } else if (keccak256(bytes(name)) == keccak256(bytes("EventStatistics"))) {
            eventStatisticsContract = newContract; // CRITICAL: On-chain for platform operation
        } else if (keccak256(bytes(name)) == keccak256(bytes("TicketManagement"))) {
            ticketManagementContract = newContract; // CRITICAL: On-chain for platform operation
        }

        emit ContractUpgraded(name, contractRegistry[name], newContract); // CRITICAL: On-chain for audit trail
    }
}