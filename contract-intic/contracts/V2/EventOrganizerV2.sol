// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title EventOrganizerV2
 * @notice UNIVERSAL event organizer registry for PUSHCHAIN
 * @dev Self-contained contract - NO Platform dependency
 *
 * KEY IMPROVEMENTS FROM V1:
 * - ✅ Removed all Platform contract dependencies
 * - ✅ Self-contained organizer management
 * - ✅ Direct event recording from EventTicket contracts
 * - ✅ Simplified modifier system
 * - ✅ Auto-verification for better UX
 * - ✅ Universal Execution compatible
 *
 * ARCHITECTURE:
 * - Organizers register themselves (auto-verified)
 * - EventTicket contracts call recordEventCreation() during deployment
 * - EventTicket contracts call incrementTicketsSold() on each sale
 * - No central Platform contract needed
 */
contract EventOrganizerV2 is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    // ========= Data Structures =========

    struct Organizer {
        string profileUri;          // IPFS URI with full profile (off-chain)
        string contentHash;         // Hash of profile content
        uint256 registrationDate;   // CRITICAL: On-chain for reputation
        bool isVerified;            // CRITICAL: On-chain verification status
        uint256 totalEvents;        // CRITICAL: On-chain reputation metric
        uint256 totalTicketsSold;   // CRITICAL: On-chain reputation metric
        uint256 totalRevenue;       // CRITICAL: On-chain revenue tracking (in wei)
        uint256 ratingSum;          // CRITICAL: On-chain for rating calculation
        uint256 ratingCount;        // CRITICAL: On-chain for rating calculation
        address payoutAddress;      // CRITICAL: On-chain payment routing
        bool exists;                // CRITICAL: On-chain existence check
    }

    struct DeployedEvent {
        address eventContract;      // CRITICAL: Event ticket contract address
        address organizer;          // CRITICAL: Event organizer address
        uint256 eventId;            // Event ID (auto-increment)
        uint256 deployedAt;         // Deployment timestamp
        bool isActive;              // Event active status
    }

    // ========= Storage =========

    /// @notice Mapping organizer => Organizer data
    mapping(address => Organizer) public organizers;

    /// @notice Array of all registered organizers
    address[] public organizerList;

    /// @notice Set of verified organizers (for efficient lookups)
    EnumerableSet.AddressSet private _verifiedOrganizers;

    /// @notice Mapping UEA address => Original wallet address
    mapping(address => address) public ueaToOriginal;

    /// @notice Mapping Original wallet address => UEA address
    mapping(address => address) public originalToUea;

    /// @notice Array of all deployed events
    DeployedEvent[] public deployedEvents;

    /// @notice Mapping organizer => array of event indices
    mapping(address => uint256[]) public organizerEvents;

    /// @notice Mapping eventContract => eventId (for quick lookup)
    mapping(address => uint256) public eventContractToId;

    /// @notice Track authorized event contracts (for security)
    mapping(address => bool) public authorizedEventContracts;

    // ========= Custom Errors =========
    error AlreadyRegistered();
    error NotRegistered();
    error NotVerified();
    error InvalidAddress();
    error NotAuthorized();
    error InvalidRating();
    error EventNotFound();
    error UEARequired(); // New: UEA required for universal registration

    // ========= Events =========
    event OrganizerRegistered(address indexed organizer, string profileUri, uint256 timestamp);
    event OrganizerRegisteredWithUEA(
        address indexed ueaAddress, 
        address indexed originalAddress, 
        string profileUri, 
        uint256 timestamp
    );
    event OrganizerVerified(address indexed organizer, bool verified);
    event ProfileUpdated(address indexed organizer, string profileUri);
    event PayoutAddressUpdated(address indexed organizer, address newAddress);
    event EventRecorded(
        uint256 indexed eventId,
        address indexed eventContract,
        address indexed organizer,
        uint256 timestamp
    );
    event TicketsSoldIncremented(address indexed organizer, uint256 amount, uint256 revenue);
    event RatingAdded(address indexed organizer, uint256 rating, address ratedBy);
    event EventDeactivated(uint256 indexed eventId);

    // ========= Constructor =========

    constructor() Ownable(msg.sender) {
        // Owner is automatically a verified organizer
        organizers[owner()] = Organizer({
            profileUri: "",
            contentHash: "",
            registrationDate: block.timestamp,
            isVerified: true,
            totalEvents: 0,
            totalTicketsSold: 0,
            totalRevenue: 0,
            ratingSum: 0,
            ratingCount: 0,
            payoutAddress: owner(),
            exists: true
        });

        organizerList.push(owner());
        _verifiedOrganizers.add(owner());
        emit OrganizerRegistered(owner(), "", block.timestamp);
        emit OrganizerVerified(owner(), true);
    }

    // ========= Modifiers =========

    modifier onlyRegistered() {
        if (!organizers[msg.sender].exists) revert NotRegistered();
        _;
    }

    modifier onlyVerifiedOrganizer() {
        if (!organizers[msg.sender].isVerified) revert NotVerified();
        _;
    }

    // ========= Core Functions =========

    /**
     * @notice Register as an event organizer
     * @dev Auto-verified for better UX (can be revoked by owner if needed)
     *      Supports both standard and UEA registration:
     *      - Standard: Pass address(0) as _originalAddress
     *      - UEA: Pass original wallet address for mapping
     * @param _profileUri IPFS URI with organizer profile
     * @param _contentHash Hash of profile content for verification
     * @param _originalAddress Original wallet address (for UEA registration), or address(0) for standard
     */
    function registerOrganizer(
        string memory _profileUri, 
        string memory _contentHash,
        address _originalAddress
    ) external {
        // msg.sender is the address registering (could be UEA or standard address)
        address registeringAddress = msg.sender;

        // Check if already registered
        if (organizers[registeringAddress].exists) revert AlreadyRegistered();

        // If original address provided, check if it's already registered
        if (_originalAddress != address(0)) {
            if (organizers[_originalAddress].exists) revert AlreadyRegistered();
            
            // REMOVED: Don't check if _originalAddress == registeringAddress
            // For Universal Execution (UEA):
            // - msg.sender will be UEA (e.g., 0xbCC71De0C500c2307d188eFD8e70f5D24dB44431)
            // - _originalAddress will be original wallet (e.g., 0xB5568834C4AbF44384264202Bdf97139944269c7)
            // - They should ALWAYS be different for UEA registration
            // - If they happen to be same (checksum issue), still allow mapping
        }

        // Register with msg.sender as primary address
        organizers[registeringAddress] = Organizer({
            profileUri: _profileUri,
            contentHash: _contentHash,
            registrationDate: block.timestamp,
            isVerified: true, // AUTO-VERIFIED for better UX
            totalEvents: 0,
            totalTicketsSold: 0,
            totalRevenue: 0,
            ratingSum: 0,
            ratingCount: 0,
            payoutAddress: registeringAddress,
            exists: true
        });

        organizerList.push(registeringAddress);
        _verifiedOrganizers.add(registeringAddress);

        // Store UEA <-> Original mapping (if original address provided and different)
        if (_originalAddress != address(0)) {
            ueaToOriginal[registeringAddress] = _originalAddress;
            originalToUea[_originalAddress] = registeringAddress;
            
            emit OrganizerRegisteredWithUEA(registeringAddress, _originalAddress, _profileUri, block.timestamp);
        } else {
            emit OrganizerRegistered(registeringAddress, _profileUri, block.timestamp);
        }

        emit OrganizerVerified(registeringAddress, true);
    }

    /**
     * @notice Record event creation (called by EventTicket during deployment)
     * @dev Can be called by:
     *      1. Owner (admin)
     *      2. Event contract itself (if creator is registered)
     * @param eventContract Address of the deployed event contract
     * @param creator Address of the event creator/organizer
     * @return assignedEventId The assigned event ID
     */
    function recordEventCreation(
        address eventContract,
        address creator,
        uint256 _eventId
    ) external returns (uint256 assignedEventId) {
        // Authorization check:
        // 1. Owner can record any event
        // 2. Event contract can record itself (if creator is registered)
        if (msg.sender != owner()) {
            if (msg.sender != eventContract) revert NotAuthorized();
            
            // Resolve creator to primary address
            address primaryAddr = getPrimaryOrganizerAddress(creator);
            if (!organizers[primaryAddr].exists) revert NotRegistered();
        }

        if (eventContract == address(0)) revert InvalidAddress();
        
        // Resolve creator to primary address
        address primaryAddr = getPrimaryOrganizerAddress(creator);
        if (!organizers[primaryAddr].exists) revert NotRegistered();

        // Increment organizer's event count (use primary address)
        organizers[primaryAddr].totalEvents++;

        // Assign event ID (use array index)
        assignedEventId = deployedEvents.length;

        // Record the event with PRIMARY address (UEA)
        deployedEvents.push(
            DeployedEvent({
                eventContract: eventContract,
                organizer: primaryAddr, // Store primary address (UEA)
                eventId: assignedEventId,
                deployedAt: block.timestamp,
                isActive: true
            })
        );

        // Track event index for this organizer (use primary address)
        organizerEvents[primaryAddr].push(assignedEventId);

        // Map contract address to event ID
        eventContractToId[eventContract] = assignedEventId;

        // Authorize event contract
        authorizedEventContracts[eventContract] = true;

        emit EventRecorded(assignedEventId, eventContract, primaryAddr, block.timestamp);

        return assignedEventId;
    }

    /**
     * @notice Increment tickets sold counter (called by EventTicket on each sale)
     * @dev Can be called by:
     *      1. Owner (admin)
     *      2. Authorized event contracts
     * @param organizer Organizer address
     * @param amount Number of tickets sold
     * @param revenue Revenue from ticket sales (in wei)
     */
    function incrementTicketsSold(
        address organizer,
        uint256 amount,
        uint256 revenue
    ) external {
        // Authorization check:
        // 1. Owner can increment
        // 2. Authorized event contracts can increment
        if (msg.sender != owner()) {
            if (!authorizedEventContracts[msg.sender]) revert NotAuthorized();
        }

        // Resolve to primary address
        address primaryAddr = getPrimaryOrganizerAddress(organizer);
        if (!organizers[primaryAddr].exists) revert NotRegistered();

        organizers[primaryAddr].totalTicketsSold += amount;
        organizers[primaryAddr].totalRevenue += revenue;

        emit TicketsSoldIncremented(primaryAddr, amount, revenue);
    }

    /**
     * @notice Update organizer profile
     * @param _profileUri New IPFS URI
     * @param _contentHash New content hash
     */
    function updateOrganizerProfile(
        string memory _profileUri,
        string memory _contentHash
    ) external onlyRegistered {
        // Get primary address
        address primaryAddr = getPrimaryOrganizerAddress(msg.sender);
        
        organizers[primaryAddr].profileUri = _profileUri;
        organizers[primaryAddr].contentHash = _contentHash;
        emit ProfileUpdated(primaryAddr, _profileUri);
    }

    /**
     * @notice Update payout address
     * @param _newAddress New payout address
     */
    function updateOrganizerPayoutAddress(address _newAddress) external onlyRegistered {
        if (_newAddress == address(0)) revert InvalidAddress();
        
        // Get primary address
        address primaryAddr = getPrimaryOrganizerAddress(msg.sender);
        
        organizers[primaryAddr].payoutAddress = _newAddress;
        emit PayoutAddressUpdated(primaryAddr, _newAddress);
    }

    /**
     * @notice Add rating to organizer
     * @param _organizer Organizer to rate
     * @param _rating Rating (1-5)
     */
    function addOrganizerRating(address _organizer, uint256 _rating) external {
        // Resolve to primary address
        address primaryAddr = getPrimaryOrganizerAddress(_organizer);
        if (!organizers[primaryAddr].exists) revert NotRegistered();
        if (_rating < 1 || _rating > 5) revert InvalidRating();

        organizers[primaryAddr].ratingSum += _rating;
        organizers[primaryAddr].ratingCount++;

        emit RatingAdded(primaryAddr, _rating, msg.sender);
    }

    // ========= Admin Functions =========

    /**
     * @notice Verify or revoke organizer verification (owner only)
     * @param _organizer Organizer address
     * @param _verified Verification status
     */
    function verifyOrganizer(address _organizer, bool _verified) external onlyOwner {
        // Resolve to primary address
        address primaryAddr = getPrimaryOrganizerAddress(_organizer);
        if (!organizers[primaryAddr].exists) revert NotRegistered();

        organizers[primaryAddr].isVerified = _verified;

        if (_verified) {
            _verifiedOrganizers.add(primaryAddr);
        } else {
            _verifiedOrganizers.remove(primaryAddr);
        }

        emit OrganizerVerified(primaryAddr, _verified);
    }

    /**
     * @notice Deactivate event (owner or organizer only)
     * @param eventId Event ID to deactivate
     */
    function deactivateEvent(uint256 eventId) external {
        if (eventId >= deployedEvents.length) revert EventNotFound();

        DeployedEvent storage evt = deployedEvents[eventId];

        if (msg.sender != owner() && msg.sender != evt.organizer) {
            revert NotAuthorized();
        }

        evt.isActive = false;
        emit EventDeactivated(eventId);
    }

    // ========= View Functions =========

    /**
     * @notice Check if organizer is verified
     * @dev Checks both direct address and via UEA/Original mapping
     */
    function isVerifiedOrganizer(address organizer) external view returns (bool) {
        // Check direct address
        if (organizers[organizer].exists && organizers[organizer].isVerified) {
            return true;
        }

        // Check via UEA mapping (if organizer is original address)
        address ueaAddr = originalToUea[organizer];
        if (ueaAddr != address(0) && organizers[ueaAddr].exists && organizers[ueaAddr].isVerified) {
            return true;
        }

        // Check via Original mapping (if organizer is UEA address)
        address originalAddr = ueaToOriginal[organizer];
        if (originalAddr != address(0) && organizers[organizer].exists && organizers[organizer].isVerified) {
            return true;
        }

        return false;
    }

    /**
     * @notice Check if organizer exists
     * @dev Checks both direct address and via UEA/Original mapping
     */
    function organizerExists(address organizer) external view returns (bool) {
        // Check direct address
        if (organizers[organizer].exists) {
            return true;
        }

        // Check via UEA mapping (if organizer is original address)
        address ueaAddr = originalToUea[organizer];
        if (ueaAddr != address(0) && organizers[ueaAddr].exists) {
            return true;
        }

        return false;
    }

    /**
     * @notice Get the primary organizer address (UEA if exists, otherwise the input address)
     * @dev Helper function to resolve UEA <-> Original address
     */
    function getPrimaryOrganizerAddress(address organizer) public view returns (address) {
        // If organizer exists directly, return it
        if (organizers[organizer].exists) {
            return organizer;
        }

        // If organizer is an original address, return the UEA
        address ueaAddr = originalToUea[organizer];
        if (ueaAddr != address(0) && organizers[ueaAddr].exists) {
            return ueaAddr;
        }

        // Otherwise return the input address
        return organizer;
    }

    /**
     * @notice Get organizer payout address
     * @dev Resolves to primary address first
     */
    function getOrganizerPayoutAddress(address organizer) external view returns (address) {
        address primaryAddr = getPrimaryOrganizerAddress(organizer);
        if (!organizers[primaryAddr].exists) revert NotRegistered();
        return organizers[primaryAddr].payoutAddress;
    }

    /**
     * @notice Get organizer rating (average)
     * @dev Resolves to primary address first
     */
    function getOrganizerRating(address _organizer) external view returns (uint256) {
        address primaryAddr = getPrimaryOrganizerAddress(_organizer);
        Organizer memory organizer = organizers[primaryAddr];
        if (organizer.ratingCount == 0) return 0;
        return organizer.ratingSum / organizer.ratingCount;
    }

    /**
     * @notice Get organizer details
     * @dev Resolves to primary address first
     */
    function getOrganizerDetails(address organizerAddr)
        external
        view
        returns (
            string memory profileUri,
            string memory contentHash,
            uint256 registrationDate,
            bool isVerified,
            uint256 totalEvents,
            uint256 totalTicketsSold,
            uint256 totalRevenue,
            uint256 averageRating
        )
    {
        address primaryAddr = getPrimaryOrganizerAddress(organizerAddr);
        Organizer memory organizer = organizers[primaryAddr];
        uint256 avgRating = organizer.ratingCount > 0
            ? organizer.ratingSum / organizer.ratingCount
            : 0;

        return (
            organizer.profileUri,
            organizer.contentHash,
            organizer.registrationDate,
            organizer.isVerified,
            organizer.totalEvents,
            organizer.totalTicketsSold,
            organizer.totalRevenue,
            avgRating
        );
    }

    /**
     * @notice Get all verified organizers
     */
    function getVerifiedOrganizers() external view returns (address[] memory) {
        uint256 verifiedCount = _verifiedOrganizers.length();
        address[] memory verifiedList = new address[](verifiedCount);

        for (uint256 i = 0; i < verifiedCount; i++) {
            verifiedList[i] = _verifiedOrganizers.at(i);
        }

        return verifiedList;
    }

    /**
     * @notice Get total organizer count
     */
    function getOrganizerCount() external view returns (uint256) {
        return organizerList.length;
    }

    /**
     * @notice Get all deployed events
     */
    function getAllDeployedEvents() external view returns (DeployedEvent[] memory) {
        return deployedEvents;
    }

    /**
     * @notice Get total deployed events count
     */
    function getDeployedEventsCount() external view returns (uint256) {
        return deployedEvents.length;
    }

    /**
     * @notice Get events by organizer
     */
    function getEventsByOrganizer(address organizer) external view returns (uint256[] memory) {
        return organizerEvents[organizer];
    }

    /**
     * @notice Get event details
     */
    function getEventDetails(uint256 eventId)
        external
        view
        returns (
            address eventContract,
            address organizer,
            uint256 deployedAt,
            bool isActive
        )
    {
        if (eventId >= deployedEvents.length) revert EventNotFound();
        DeployedEvent memory evt = deployedEvents[eventId];
        return (evt.eventContract, evt.organizer, evt.deployedAt, evt.isActive);
    }

    /**
     * @notice Get active events only
     */
    function getActiveEvents() external view returns (DeployedEvent[] memory) {
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
     * @notice Get event ID by contract address
     */
    function getEventIdByContract(address eventContract) external view returns (uint256) {
        return eventContractToId[eventContract];
    }

    /**
     * @notice Check if event contract is authorized
     */
    function isAuthorizedEventContract(address eventContract) external view returns (bool) {
        return authorizedEventContracts[eventContract];
    }

    /**
     * @notice Get UEA address from original address
     * @param originalAddress Original wallet address
     * @return UEA address (or zero address if not mapped)
     */
    function getUEAFromOriginal(address originalAddress) external view returns (address) {
        return originalToUea[originalAddress];
    }

    /**
     * @notice Get original address from UEA address
     * @param ueaAddress UEA address
     * @return Original wallet address (or zero address if not mapped)
     */
    function getOriginalFromUEA(address ueaAddress) external view returns (address) {
        return ueaToOriginal[ueaAddress];
    }
}
