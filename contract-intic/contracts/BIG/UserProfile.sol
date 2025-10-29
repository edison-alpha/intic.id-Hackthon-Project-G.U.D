// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPlatform.sol";

/**
 * @title UserProfile
 * @dev Contract for managing user profiles with PUSHCHAIN Universal Execution Account (UEA) support
 * CRITICAL: Core identity and UEA data must remain on-chain for PUSHCHAIN functionality
 */
contract UserProfile is Ownable {
    address public platformContract;
    struct Profile {
        string profileUri; // IPFS URI with full profile (off-chain)
        string contentHash; // Hash of profile content for verification
        uint256 joinDate; // CRITICAL: On-chain for reputation
        uint256 totalTickets; // CRITICAL: On-chain for user metrics
        uint256 totalEventsAttended; // CRITICAL: On-chain for reputation
        uint256 ratingSum; // CRITICAL: On-chain for calculating average rating
        uint256 ratingCount; // CRITICAL: On-chain for calculating average rating
        bool exists; // CRITICAL: On-chain existence check
    }

    struct UserActivity {
        uint256[] ticketIds; // CRITICAL: On-chain for user history
        uint256[] eventIds; // CRITICAL: On-chain for user history
        mapping(uint256 => bool) hasReviewedEvent; // CRITICAL: On-chain for review tracking
    }

    mapping(address => Profile) public profiles;
    mapping(address => UserActivity) internal userActivities;
    address[] public userList;

    // CRITICAL FOR PUSHCHAIN UEA: Core identity data on-chain
    mapping(address => bool) public isUniversalAccount; // CRITICAL: On-chain for UEA
    mapping(address => address[]) public linkedAccounts; // CRITICAL: On-chain for cross-chain identity

    event ProfileCreated(address indexed user, string profileUri);
    event ProfileUpdated(address indexed user, string field);
    event AccountLinked(address indexed universalAccount, address indexed linkedAccount);
    event AccountUnlinked(address indexed universalAccount, address indexed linkedAccount);
    
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
        // Contract owner is considered a universal account by default - CRITICAL for PUSHCHAIN
        isUniversalAccount[msg.sender] = true; // CRITICAL: On-chain for UEA
    }
    
    /**
     * @dev Set platform contract address
     */
    function setPlatformContract(address _platform) external onlyOwner {
        require(_platform != address(0), "Invalid platform address");
        platformContract = _platform;
    }
    
    /**
     * @dev Create profile (can be called by user or platform contracts)
     */
    function createProfile(address user, string memory _profileUri, string memory _contentHash) external {
        require(!profiles[user].exists, "Profile already exists");
        require(msg.sender == user || msg.sender == platformContract || msg.sender == owner(), "Not authorized");
        
        _createProfile(user, _profileUri, _contentHash);
    }
    
    /**
     * @dev Internal function to create profile
     */
    function _createProfile(address user, string memory _profileUri, string memory _contentHash) internal {
        profiles[user] = Profile({
            profileUri: _profileUri,
            contentHash: _contentHash,
            joinDate: block.timestamp,
            totalTickets: 0,
            totalEventsAttended: 0,
            ratingSum: 0,
            ratingCount: 0,
            exists: true
        });

        userList.push(user);
        emit ProfileCreated(user, _profileUri);
    }
    
    /**
     * @dev Check if profile exists
     */
    function profileExists(address user) external view returns (bool) {
        return profiles[user].exists;
    }
    
    /**
     * @dev Add ticket to user (called by EventTicket contract)
     */
    function addTicket(address user, uint256 ticketId, uint256 eventId) external onlyPlatformOrOwner {
        if (!profiles[user].exists) {
            _createProfile(user, "", "");
        }
        
        userActivities[user].ticketIds.push(ticketId);
        
        // Add event if not already added
        bool eventExists = false;
        uint256[] storage events = userActivities[user].eventIds;
        for (uint256 i = 0; i < events.length; i++) {
            if (events[i] == eventId) {
                eventExists = true;
                break;
            }
        }
        if (!eventExists) {
            userActivities[user].eventIds.push(eventId);
        }
        
        profiles[user].totalTickets++;
    }
    
    /**
     * @dev Add event attended (called by EventTicket when ticket is used)
     */
    function addEventAttended(address user, uint256 eventId) external onlyPlatformOrOwner {
        if (!profiles[user].exists) {
            _createProfile(user, "", "");
        }
        
        profiles[user].totalEventsAttended++;
    }
    
    /**
     * @dev Update user rating (called by EventReview)
     */
    function updateRating(address user, uint256 rating) external onlyPlatformOrOwner {
        require(profiles[user].exists, "Profile does not exist");
        require(rating >= 1 && rating <= 5, "Invalid rating");
        
        profiles[user].ratingSum += rating;
        profiles[user].ratingCount++;
    }
    
    /**
     * @dev Mark event as reviewed
     */
    function markEventReviewed(address user, uint256 eventId) external onlyPlatformOrOwner {
        if (!profiles[user].exists) {
            _createProfile(user, "", "");
        }
        userActivities[user].hasReviewedEvent[eventId] = true;
    }
    
    /**
     * @dev Check if user has reviewed event
     */
    function hasReviewedEvent(address user, uint256 eventId) external view returns (bool) {
        return userActivities[user].hasReviewedEvent[eventId];
    }

    function registerProfile(string memory _profileUri, string memory _contentHash) public {
    }

    /**
     * @dev Create or update user profile
     * CRITICAL: Core existence check on-chain
     */
    function createOrUpdateProfile(
        string memory _profileUri,
        string memory _contentHash
    ) public {
        if (!profiles[msg.sender].exists) {
            // New profile - CRITICAL: On-chain data
            profiles[msg.sender] = Profile({
                profileUri: _profileUri,
                contentHash: _contentHash,
                joinDate: block.timestamp, // CRITICAL: On-chain reputation
                totalTickets: 0,
                totalEventsAttended: 0,
                ratingSum: 0,
                ratingCount: 0,
                exists: true // CRITICAL: On-chain existence
            });
            userList.push(msg.sender); // CRITICAL: On-chain user tracking
            isUniversalAccount[msg.sender] = true; // CRITICAL: On-chain for PUSHCHAIN UEA
            emit ProfileCreated(msg.sender, _profileUri);
        } else {
            // Update existing profile
            profiles[msg.sender].profileUri = _profileUri;
            profiles[msg.sender].contentHash = _contentHash;
            emit ProfileUpdated(msg.sender, "profile");
        }
    }

    /**
     * @dev Update profile URI and content hash
     */
    function updateProfileUri(string memory _profileUri, string memory _contentHash) public {
        require(profiles[msg.sender].exists, "Profile does not exist"); // CRITICAL: On-chain check
        profiles[msg.sender].profileUri = _profileUri;
        profiles[msg.sender].contentHash = _contentHash;
        emit ProfileUpdated(msg.sender, "profileUri");
    }

    /**
     * @dev Record a ticket purchase - CRITICAL: On-chain for user metrics
     */
    function recordTicketPurchase(uint256 ticketId) public {
        require(profiles[msg.sender].exists, "Profile does not exist"); // CRITICAL: On-chain check
        profiles[msg.sender].totalTickets++; // CRITICAL: On-chain user metrics
        userActivities[msg.sender].ticketIds.push(ticketId); // CRITICAL: On-chain activity tracking
    }

    /**
     * @dev Record attendance at an event - CRITICAL: On-chain for reputation
     */
    function recordEventAttendance(uint256 eventId) public {
        require(profiles[msg.sender].exists, "Profile does not exist"); // CRITICAL: On-chain check
        profiles[msg.sender].totalEventsAttended++; // CRITICAL: On-chain reputation
        userActivities[msg.sender].eventIds.push(eventId); // CRITICAL: On-chain activity tracking
    }

    /**
     * @dev Set user rating for an event - CRITICAL: On-chain for reputation system
     */
    function setEventRating(uint256 eventId, uint256 rating) public {
        require(profiles[msg.sender].exists, "Profile does not exist"); // CRITICAL: On-chain check
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5"); // CRITICAL: On-chain validation
        require(!userActivities[msg.sender].hasReviewedEvent[eventId], "Already reviewed this event"); // CRITICAL: On-chain check

        // CRITICAL: On-chain reputation metrics
        profiles[msg.sender].ratingSum += rating; // CRITICAL: On-chain for average calculation
        profiles[msg.sender].ratingCount += 1; // CRITICAL: On-chain for average calculation
        userActivities[msg.sender].hasReviewedEvent[eventId] = true; // CRITICAL: On-chain review tracking
    }

    /**
     * @dev Get user's average rating - CRITICAL: On-chain calculation
     */
    function getUserRating(address user) public view returns (uint256) {
        Profile memory profile = profiles[user];
        if (profile.ratingCount == 0) return 0;
        return profile.ratingSum / profile.ratingCount; // CRITICAL: On-chain calculation
    }

    /**
     * @dev Link an account from another chain - CRITICAL: On-chain for PUSHCHAIN UEA
     */
    function linkAccount(address otherChainAccount) public {
        require(isUniversalAccount[msg.sender], "Only universal accounts can link other accounts"); // CRITICAL: On-chain UEA check
        require(otherChainAccount != address(0), "Invalid account address"); // CRITICAL: On-chain validation

        // Check if this account is already linked - CRITICAL: On-chain check
        for (uint i = 0; i < linkedAccounts[msg.sender].length; i++) {
            if (linkedAccounts[msg.sender][i] == otherChainAccount) {
                return; // Already linked
            }
        }

        linkedAccounts[msg.sender].push(otherChainAccount); // CRITICAL: On-chain cross-chain identity
        emit AccountLinked(msg.sender, otherChainAccount);
    }

    /**
     * @dev Unlink an account from the universal account - CRITICAL: On-chain for UEA
     */
    function unlinkAccount(address otherChainAccount) public {
        require(isUniversalAccount[msg.sender], "Only universal accounts can unlink other accounts"); // CRITICAL: On-chain UEA check
        require(otherChainAccount != address(0), "Invalid account address"); // CRITICAL: On-chain validation

        for (uint i = 0; i < linkedAccounts[msg.sender].length; i++) {
            if (linkedAccounts[msg.sender][i] == otherChainAccount) {
                // Move the last element to this position - CRITICAL: On-chain cross-chain identity
                linkedAccounts[msg.sender][i] = linkedAccounts[msg.sender][linkedAccounts[msg.sender].length - 1];
                linkedAccounts[msg.sender].pop();
                emit AccountUnlinked(msg.sender, otherChainAccount);
                break;
            }
        }
    }

    /**
     * @dev Get all linked accounts for a universal account - CRITICAL: On-chain UEA data
     */
    function getLinkedAccounts(address universalAccount) public view returns (address[] memory) {
        return linkedAccounts[universalAccount]; // CRITICAL: On-chain UEA data
    }

    /**
     * @dev Add a universal account - CRITICAL: On-chain for PUSHCHAIN UEA
     */
    function addUniversalAccount(address account) public onlyOwner {
        require(account != address(0), "Invalid account address"); // CRITICAL: On-chain validation
        isUniversalAccount[account] = true; // CRITICAL: On-chain for PUSHCHAIN UEA
    }

    /**
     * @dev Remove a universal account - CRITICAL: On-chain for UEA management
     */
    function removeUniversalAccount(address account) public onlyOwner {
        require(account != msg.sender, "Cannot remove owner account"); // CRITICAL: On-chain validation
        isUniversalAccount[account] = false; // CRITICAL: On-chain UEA management
    }

    /**
     * @dev Get user profile details - CRITICAL: On-chain access
     */
    function getProfile(address user) public view returns (
        string memory profileUri,
        string memory contentHash,
        uint256 joinDate, // CRITICAL: On-chain reputation
        uint256 totalTickets, // CRITICAL: On-chain metrics
        uint256 totalEventsAttended, // CRITICAL: On-chain reputation
        uint256 averageRating
    ) {
        Profile memory profile = profiles[user];
        return (
            profile.profileUri,
            profile.contentHash,
            profile.joinDate, // CRITICAL: On-chain reputation
            profile.totalTickets, // CRITICAL: On-chain metrics
            profile.totalEventsAttended, // CRITICAL: On-chain reputation
            profile.ratingCount > 0 ? profile.ratingSum / profile.ratingCount : 0 // CRITICAL: On-chain calculation
        );
    }

    /**
     * @dev Get total number of users - CRITICAL: On-chain metric
     */
    function getUserCount() public view returns (uint256) {
        return userList.length; // CRITICAL: On-chain user tracking
    }

    /**
     * @dev Get user activity details - CRITICAL: On-chain activity tracking
     */
    function getUserActivity(address user) public view returns (
        uint256[] memory ticketIds,
        uint256[] memory eventIds
    ) {
        UserActivity storage activity = userActivities[user];
        return (activity.ticketIds, activity.eventIds); // CRITICAL: On-chain activity tracking
    }
}