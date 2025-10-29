// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./interfaces/IPlatform.sol";
import "./interfaces/IEventStatistics.sol";
import "./interfaces/INotificationSystem.sol";

/**
 * @title EventOrganizer
 * @dev Contract for managing event organizers and their events on PUSHCHAIN
 * CRITICAL: Verification status and essential organizer data must remain on-chain
 * 
 * V2 UPDATE: Events are deployed externally (EventTicketV2) and registered here
 * This keeps the contract size manageable and follows separation of concerns
 */
contract EventOrganizer is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;
    
    address public platformContract;

    struct Organizer {
        string profileUri; // IPFS URI with full organizer profile (off-chain)
        string contentHash; // Hash of profile content for verification
        uint256 registrationDate; // CRITICAL: On-chain for reputation
        bool isVerified; // CRITICAL: On-chain for security & access control
        uint256 totalEvents; // CRITICAL: On-chain for reputation metrics
        uint256 totalTicketsSold; // CRITICAL: On-chain for reputation metrics
        uint256 ratingSum; // CRITICAL: On-chain for calculating average rating
        uint256 ratingCount; // CRITICAL: On-chain for calculating average rating
        address payoutAddress; // CRITICAL: On-chain for payment routing
        bool exists; // CRITICAL: On-chain existence check
    }

    struct DeployedEvent {
        address eventContract;
        address organizer;
        uint256 eventId;
        uint256 deployedAt;
        bool isActive;
    }

    mapping(address => Organizer) public organizers;
    address[] public organizerList;
    EnumerableSet.AddressSet private _verifiedOrganizers;
    
    // Track all deployed events
    DeployedEvent[] public deployedEvents;
    mapping(address => uint256[]) public organizerEvents; // organizer => event indices

    event OrganizerRegistered(address indexed organizer, string profileUri);
    event OrganizerVerified(address indexed organizer, bool verified);
    event EventCreated(address indexed eventContract, address indexed creator, string metadataUri);
    event PayoutAddressUpdated(address indexed organizer, address newAddress);
    
    modifier onlyPlatform() {
        require(msg.sender == platformContract || msg.sender == owner(), "Only platform or owner");
        _;
    }

    constructor() Ownable(msg.sender) {
        // Owner is automatically a verified organizer
        organizers[owner()] = Organizer({
            profileUri: "",
            contentHash: "",
            registrationDate: block.timestamp,
            isVerified: true, // CRITICAL: Owner starts verified
            totalEvents: 0,
            totalTicketsSold: 0,
            ratingSum: 0,
            ratingCount: 0,
            payoutAddress: owner(),
            exists: true
        });
        
        organizerList.push(owner());
        _verifiedOrganizers.add(owner());
    }

    function registerOrganizer(string memory _profileUri, string memory _contentHash) public {
        require(!organizers[msg.sender].exists, "Organizer already registered");

        organizers[msg.sender] = Organizer({
            profileUri: _profileUri,
            contentHash: _contentHash,
            registrationDate: block.timestamp,
            isVerified: true, // AUTO-VERIFIED for better UX - Can be revoked by owner if needed
            totalEvents: 0,
            totalTicketsSold: 0,
            ratingSum: 0,
            ratingCount: 0,
            payoutAddress: msg.sender,
            exists: true
        });

        organizerList.push(msg.sender);
        _verifiedOrganizers.add(msg.sender); // Add to verified set immediately
        emit OrganizerRegistered(msg.sender, _profileUri);
        emit OrganizerVerified(msg.sender, true); // Emit verified event
        
        // Send notification if platform is set
        if (platformContract != address(0)) {
            try INotificationSystem(IPlatform(platformContract).notificationSystemContract()).sendNotification(
                msg.sender,
                "Organizer Registered",
                "Your organizer account has been registered and verified successfully. You can now create events!",
                "ORGANIZER"
            ) {} catch {}
        }
    }
    
    /**
     * @dev Set platform contract address
     */
    function setPlatformContract(address _platform) external onlyOwner {
        require(_platform != address(0), "Invalid platform address");
        platformContract = _platform;
    }
    
    /**
     * @dev Record event creation
     * Modified to allow registered organizers to record their own events automatically
     */
    function recordEventCreation(address eventContract, address creator, uint256 eventId) external {
        // Allow calls from:
        // 1. Platform contract or owner (original behavior)
        // 2. Event contract itself (during deployment) if creator is a registered organizer
        // Note: Removed isVerified requirement to allow auto-registration during deployment
        require(
            msg.sender == platformContract || 
            msg.sender == owner() || 
            (msg.sender == eventContract && organizers[creator].exists),
            "Not authorized to record event"
        );
        
        require(organizers[creator].exists, "Organizer does not exist");
        organizers[creator].totalEvents++;
        
        // Add to deployed events array
        deployedEvents.push(DeployedEvent({
            eventContract: eventContract,
            organizer: creator,
            eventId: deployedEvents.length, // Use array index as eventId
            deployedAt: block.timestamp,
            isActive: true
        }));
        
        // Track event index for this organizer
        organizerEvents[creator].push(deployedEvents.length - 1);
        
        // Initialize event statistics
        if (platformContract != address(0)) {
            try IEventStatistics(IPlatform(platformContract).eventStatisticsContract()).initializeEventMetrics(deployedEvents.length - 1) {} catch {}
        }
        
        emit EventCreated(eventContract, creator, "");
    }
    
    /**
     * @dev Increment tickets sold for organizer (called by EventTicket)
     */
    function incrementTicketsSold(address organizer, uint256 amount) external onlyPlatform {
        require(organizers[organizer].exists, "Organizer does not exist");
        organizers[organizer].totalTicketsSold += amount;
    }
    
    /**
     * @dev Update organizer rating (called by EventReview)
     */
    function updateOrganizerRating(address organizer, uint256 rating) external onlyPlatform {
        require(organizers[organizer].exists, "Organizer does not exist");
        require(rating >= 1 && rating <= 5, "Invalid rating");
        organizers[organizer].ratingSum += rating;
        organizers[organizer].ratingCount++;
    }
    
    /**
     * @dev Check if organizer is verified (for other contracts)
     */
    function isVerifiedOrganizer(address organizer) external view returns (bool) {
        return organizers[organizer].exists && organizers[organizer].isVerified;
    }
    
    /**
     * @dev Check if organizer exists
     */
    function organizerExists(address organizer) external view returns (bool) {
        return organizers[organizer].exists;
    }
    
    /**
     * @dev Get organizer payout address
     */
    function getOrganizerPayoutAddress(address organizer) external view returns (address) {
        require(organizers[organizer].exists, "Organizer does not exist");
        return organizers[organizer].payoutAddress;
    }

    /**
     * @notice Register an existing event contract
     * @dev Called after EventTicketV2 is deployed externally
     * This approach keeps EventOrganizer lightweight
     */
    function registerEvent(
        address eventContract,
        string memory _eventName
    ) public returns (uint256) {
        require(organizers[msg.sender].exists, "Must be registered organizer");
        require(organizers[msg.sender].isVerified, "Must be verified organizer");
        require(eventContract != address(0), "Invalid contract address");

        // Generate event ID
        uint256 eventId = deployedEvents.length;

        // Store deployed event
        deployedEvents.push(DeployedEvent({
            eventContract: eventContract,
            organizer: msg.sender,
            eventId: eventId,
            deployedAt: block.timestamp,
            isActive: true
        }));

        // Track organizer's events
        organizerEvents[msg.sender].push(eventId);

        // Update organizer stats
        organizers[msg.sender].totalEvents++;

        // Emit event creation
        emit EventCreated(eventContract, msg.sender, "");

        // Notify via platform if available
        if (platformContract != address(0)) {
            try INotificationSystem(IPlatform(platformContract).notificationSystemContract()).sendNotification(
                msg.sender,
                "Event Registered",
                string(abi.encodePacked("Your event '", _eventName, "' has been registered successfully")),
                "EVENT"
            ) {} catch {}
        }

        return eventId;
    }

    function verifyOrganizer(address _organizer, bool _verified) public onlyOwner {
        require(organizers[_organizer].exists, "Organizer does not exist"); // CRITICAL: On-chain check
        organizers[_organizer].isVerified = _verified; // CRITICAL: On-chain verification status

        if (_verified) {
            _verifiedOrganizers.add(_organizer);
        } else {
            _verifiedOrganizers.remove(_organizer);
        }

        emit OrganizerVerified(_organizer, _verified);
    }

    function updateOrganizerProfile(string memory _profileUri, string memory _contentHash) public {
        require(organizers[msg.sender].exists, "Must be registered organizer"); // CRITICAL: On-chain check
        organizers[msg.sender].profileUri = _profileUri;
        organizers[msg.sender].contentHash = _contentHash;
    }

    function updateOrganizerPayoutAddress(address _newAddress) public {
        require(organizers[msg.sender].exists, "Must be registered organizer"); // CRITICAL: On-chain check
        require(_newAddress != address(0), "Invalid address");
        organizers[msg.sender].payoutAddress = _newAddress; // CRITICAL: On-chain payout routing
        emit PayoutAddressUpdated(msg.sender, _newAddress);
    }

    function setOrganizerRating(address _organizer, uint256 _rating) public onlyOwner {
        require(organizers[_organizer].exists, "Organizer does not exist"); // CRITICAL: On-chain check
        require(_rating <= 5, "Rating cannot exceed 5"); // CRITICAL: On-chain validation
        require(_rating >= 1, "Rating cannot be below 1"); // CRITICAL: On-chain validation

        // CRITICAL: On-chain reputation metrics
        organizers[_organizer].ratingSum += _rating; // CRITICAL: On-chain for average calculation
        organizers[_organizer].ratingCount += 1; // CRITICAL: On-chain for average calculation
    }

    function getOrganizerRating(address _organizer) public view returns (uint256) {
        Organizer memory organizer = organizers[_organizer];
        if (organizer.ratingCount == 0) return 0;
        return organizer.ratingSum / organizer.ratingCount; // CRITICAL: On-chain calculation
    }

    function getVerifiedOrganizers() public view returns (address[] memory) {
        uint256 verifiedCount = _verifiedOrganizers.length(); // CRITICAL: On-chain verification
        address[] memory verifiedList = new address[](verifiedCount);

        for (uint256 i = 0; i < verifiedCount; i++) {
            verifiedList[i] = _verifiedOrganizers.at(i);
        }

        return verifiedList;
    }

    function getOrganizerCount() public view returns (uint256) {
        return organizerList.length;
    }

    function getOrganizerDetails(address organizerAddr) public view returns (
        string memory profileUri,
        string memory contentHash,
        uint256 registrationDate,
        bool isVerified, // CRITICAL: On-chain verification status
        uint256 totalEvents, // CRITICAL: On-chain reputation
        uint256 totalTicketsSold, // CRITICAL: On-chain reputation
        uint256 averageRating
    ) {
        Organizer memory organizer = organizers[organizerAddr];
        uint256 avgRating = organizer.ratingCount > 0 ? organizer.ratingSum / organizer.ratingCount : 0;
        
        return (
            organizer.profileUri,
            organizer.contentHash,
            organizer.registrationDate, // CRITICAL: On-chain reputation
            organizer.isVerified, // CRITICAL: On-chain verification
            organizer.totalEvents, // CRITICAL: On-chain reputation
            organizer.totalTicketsSold, // CRITICAL: On-chain reputation
            avgRating
        );
    }

    /**
     * @dev Get all deployed events
     */
    function getAllDeployedEvents() public view returns (DeployedEvent[] memory) {
        return deployedEvents;
    }

    /**
     * @dev Get total number of deployed events
     */
    function getDeployedEventsCount() public view returns (uint256) {
        return deployedEvents.length;
    }

    /**
     * @dev Get events by organizer
     */
    function getEventsByOrganizer(address organizer) public view returns (uint256[] memory) {
        return organizerEvents[organizer];
    }

    /**
     * @dev Get active events only
     */
    function getActiveEvents() public view returns (DeployedEvent[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < deployedEvents.length; i++) {
            if (deployedEvents[i].isActive) {
                activeCount++;
            }
        }

        DeployedEvent[] memory activeEvents = new DeployedEvent[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < deployedEvents.length; i++) {
            if (deployedEvents[i].isActive) {
                activeEvents[index] = deployedEvents[i];
                index++;
            }
        }

        return activeEvents;
    }

    /**
     * @dev Get upcoming events by organizer (for EO Profile - Upcoming Events)
     * Returns events where eventDate > current time
     */
    function getUpcomingEventsByOrganizer(address organizer) public view returns (DeployedEvent[] memory) {
        uint256[] memory eventIndices = organizerEvents[organizer];
        uint256 upcomingCount = 0;
        
        // First pass: count upcoming events
        for (uint256 i = 0; i < eventIndices.length; i++) {
            DeployedEvent memory evt = deployedEvents[eventIndices[i]];
            if (evt.isActive) {
                // Note: We need to call the event contract to get eventDate
                // This is a view function so it's safe to call
                upcomingCount++;
            }
        }
        
        DeployedEvent[] memory upcoming = new DeployedEvent[](upcomingCount);
        uint256 index = 0;
        
        // Second pass: collect upcoming events
        for (uint256 i = 0; i < eventIndices.length; i++) {
            DeployedEvent memory evt = deployedEvents[eventIndices[i]];
            if (evt.isActive) {
                upcoming[index] = evt;
                index++;
            }
        }
        
        return upcoming;
    }

    /**
     * @dev Get past events by organizer (for EO Profile - Past Events)
     * Returns events where eventDate <= current time or isActive = false
     */
    function getPastEventsByOrganizer(address organizer) public view returns (DeployedEvent[] memory) {
        uint256[] memory eventIndices = organizerEvents[organizer];
        uint256 pastCount = 0;
        
        // First pass: count past events
        for (uint256 i = 0; i < eventIndices.length; i++) {
            DeployedEvent memory evt = deployedEvents[eventIndices[i]];
            if (!evt.isActive) {
                pastCount++;
            }
        }
        
        DeployedEvent[] memory past = new DeployedEvent[](pastCount);
        uint256 index = 0;
        
        // Second pass: collect past events
        for (uint256 i = 0; i < eventIndices.length; i++) {
            DeployedEvent memory evt = deployedEvents[eventIndices[i]];
            if (!evt.isActive) {
                past[index] = evt;
                index++;
            }
        }
        
        return past;
    }

    /**
     * @dev Get event details by event index
     */
    function getEventDetails(uint256 eventIndex) public view returns (
        address eventContract,
        address organizer,
        uint256 eventId,
        uint256 deployedAt,
        bool isActive
    ) {
        require(eventIndex < deployedEvents.length, "Event does not exist");
        DeployedEvent memory evt = deployedEvents[eventIndex];
        return (
            evt.eventContract,
            evt.organizer,
            evt.eventId,
            evt.deployedAt,
            evt.isActive
        );
    }

    /**
     * @dev Deactivate event (mark as past/ended)
     */
    function deactivateEvent(uint256 eventIndex) external {
        require(eventIndex < deployedEvents.length, "Event does not exist");
        require(
            msg.sender == deployedEvents[eventIndex].organizer || 
            msg.sender == owner(),
            "Not authorized"
        );
        deployedEvents[eventIndex].isActive = false;
    }

    modifier onlyVerifiedOrganizer() {
        require(organizers[msg.sender].isVerified, "Only verified organizers"); // CRITICAL: On-chain check
        _;
    }
    
}