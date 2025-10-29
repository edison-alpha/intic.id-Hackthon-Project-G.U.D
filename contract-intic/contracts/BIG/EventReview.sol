// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPlatform.sol";
import "./interfaces/IEventStatistics.sol";
import "./interfaces/IEventOrganizer.sol";
import "./interfaces/IUserProfile.sol";

/**
 * @title EventReview
 * @dev Contract for managing event reviews and ratings
 * CRITICAL: Rating data must remain on-chain for reputation systems
 */
contract EventReview is Ownable {
    address public platformContract;
    struct Review {
        address reviewer; // CRITICAL: On-chain for identity
        uint256 eventId; // CRITICAL: On-chain for indexing
        uint256 rating; // CRITICAL: On-chain for reputation (1-5 scale)
        string reviewUri; // IPFS URI with full review content (off-chain)
        string contentHash; // Hash of review content for verification
        uint256 timestamp; // CRITICAL: On-chain for audit trail
        uint256 helpfulCount; // CRITICAL: On-chain for review quality
        bool exists; // CRITICAL: On-chain existence check
    }

    struct EventStats {
        uint256 totalReviews; // CRITICAL: On-chain for reputation
        uint256 totalRatingSum; // CRITICAL: On-chain for average calculation
        uint256 averageRating; // CRITICAL: On-chain for reputation
        mapping(address => bool) hasReviewed; // CRITICAL: On-chain to prevent duplicate reviews
    }

    mapping(bytes32 => Review) public reviews; // keccak256(eventId, reviewer) => Review - CRITICAL: On-chain
    mapping(uint256 => EventStats) public eventStats; // eventId => EventStats - CRITICAL: On-chain
    bytes32[] public reviewIds; // CRITICAL: On-chain review tracking

    event ReviewCreated(address indexed reviewer, uint256 indexed eventId, uint256 rating, string reviewUri);
    event ReviewUpdated(address indexed reviewer, uint256 indexed eventId, uint256 rating, string reviewUri);
    event ReviewHelpful(address indexed user, bytes32 indexed reviewId);
    
    modifier onlyPlatformOrOwner() {
        require(
            msg.sender == platformContract || 
            msg.sender == owner() || 
            (platformContract != address(0) && IPlatform(platformContract).isAuthorizedContract(msg.sender)),
            "Not authorized"
        );
        _;
    }

    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Set platform contract address
     */
    function setPlatformContract(address _platform) external onlyOwner {
        require(_platform != address(0), "Invalid platform address");
        platformContract = _platform;
    }

    /**
     * @dev Create a new review for an event
     * CRITICAL: Rating data on-chain for reputation system
     */
    function createReview(
        uint256 eventId,
        uint256 rating, // CRITICAL: On-chain rating
        string memory reviewUri, // Off-chain content
        string memory contentHash
    ) public {
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5"); // CRITICAL: On-chain validation
        require(bytes(reviewUri).length > 0, "Review URI cannot be empty");
        require(bytes(contentHash).length > 0, "Content hash cannot be empty");
        require(!eventStats[eventId].hasReviewed[msg.sender], "Already reviewed this event"); // CRITICAL: On-chain check

        bytes32 reviewId = keccak256(abi.encodePacked(eventId, msg.sender)); // CRITICAL: On-chain indexing
        require(!reviews[reviewId].exists, "Review already exists"); // CRITICAL: On-chain check

        reviews[reviewId] = Review({
            reviewer: msg.sender, // CRITICAL: On-chain identity
            eventId: eventId, // CRITICAL: On-chain indexing
            rating: rating, // CRITICAL: On-chain rating
            reviewUri: reviewUri,
            contentHash: contentHash,
            timestamp: block.timestamp, // CRITICAL: On-chain audit trail
            helpfulCount: 0,
            exists: true
        });

        reviewIds.push(reviewId); // CRITICAL: On-chain tracking

        // Update event stats - CRITICAL: On-chain reputation
        EventStats storage stats = eventStats[eventId]; // CRITICAL: On-chain stats
        stats.totalReviews++; // CRITICAL: On-chain reputation
        stats.totalRatingSum += rating; // CRITICAL: On-chain for average calculation
        stats.averageRating = stats.totalRatingSum / stats.totalReviews; // CRITICAL: On-chain reputation
        stats.hasReviewed[msg.sender] = true; // CRITICAL: On-chain to prevent duplicates

        emit ReviewCreated(msg.sender, eventId, rating, reviewUri);
        
        // Platform integration - update statistics and user profile
        if (platformContract != address(0)) {
            // Update event statistics
            try IEventStatistics(IPlatform(platformContract).eventStatisticsContract()).updateAverageRating(
                eventId,
                stats.averageRating,
                stats.totalReviews
            ) {} catch {}
            
            // Mark as reviewed in user profile
            try IUserProfile(IPlatform(platformContract).userProfileContract()).markEventReviewed(msg.sender, eventId) {} catch {}
            
            // Update user rating
            try IUserProfile(IPlatform(platformContract).userProfileContract()).updateRating(msg.sender, rating) {} catch {}
        }
    }

    /**
     * @dev Update an existing review - CRITICAL: Rating stays on-chain
     */
    function updateReview(
        uint256 eventId,
        uint256 newRating, // CRITICAL: On-chain rating
        string memory newReviewUri,
        string memory newContentHash
    ) public {
        require(newRating >= 1 && newRating <= 5, "Rating must be between 1 and 5"); // CRITICAL: On-chain validation
        require(bytes(newReviewUri).length > 0, "Review URI cannot be empty");
        require(bytes(newContentHash).length > 0, "Content hash cannot be empty");

        bytes32 reviewId = keccak256(abi.encodePacked(eventId, msg.sender)); // CRITICAL: On-chain indexing
        Review storage review = reviews[reviewId];
        require(review.exists, "Review does not exist"); // CRITICAL: On-chain check
        require(review.reviewer == msg.sender, "Only the original reviewer can update"); // CRITICAL: On-chain check

        // Update event stats by removing old rating and adding new one - CRITICAL: On-chain reputation
        EventStats storage stats = eventStats[eventId]; // CRITICAL: On-chain stats
        stats.totalRatingSum = stats.totalRatingSum - review.rating + newRating; // CRITICAL: On-chain calculation
        stats.averageRating = stats.totalRatingSum / stats.totalReviews; // CRITICAL: On-chain reputation

        // Update the review - CRITICAL: On-chain data
        review.rating = newRating; // CRITICAL: On-chain rating
        review.reviewUri = newReviewUri;
        review.contentHash = newContentHash;
        review.timestamp = block.timestamp; // CRITICAL: On-chain audit trail

        emit ReviewUpdated(msg.sender, eventId, newRating, newReviewUri);
    }

    /**
     * @dev Mark a review as helpful - CRITICAL: On-chain for review quality
     */
    function markReviewHelpful(uint256 eventId, address reviewer) public {
        bytes32 reviewId = keccak256(abi.encodePacked(eventId, reviewer)); // CRITICAL: On-chain indexing
        require(reviews[reviewId].exists, "Review does not exist"); // CRITICAL: On-chain check
        require(reviews[reviewId].reviewer != msg.sender, "Cannot mark your own review as helpful"); // CRITICAL: On-chain check

        reviews[reviewId].helpfulCount++; // CRITICAL: On-chain quality metric
        emit ReviewHelpful(msg.sender, reviewId);
    }

    /**
     * @dev Get review by event ID and reviewer - CRITICAL: On-chain access
     */
    function getReview(uint256 eventId, address reviewer) public view returns (
        address _reviewer, // CRITICAL: On-chain identity
        uint256 _eventId, // CRITICAL: On-chain indexing
        uint256 _rating, // CRITICAL: On-chain rating
        string memory _reviewUri,
        string memory _contentHash,
        uint256 _timestamp, // CRITICAL: On-chain audit trail
        uint256 _helpfulCount // CRITICAL: On-chain quality metric
    ) {
        bytes32 reviewId = keccak256(abi.encodePacked(eventId, reviewer)); // CRITICAL: On-chain indexing
        Review memory review = reviews[reviewId];
        require(review.exists, "Review does not exist"); // CRITICAL: On-chain check

        return (
            review.reviewer, // CRITICAL: On-chain identity
            review.eventId, // CRITICAL: On-chain indexing
            review.rating, // CRITICAL: On-chain rating
            review.reviewUri,
            review.contentHash,
            review.timestamp, // CRITICAL: On-chain audit trail
            review.helpfulCount // CRITICAL: On-chain quality metric
        );
    }

    /**
     * @dev Get event statistics - CRITICAL: On-chain reputation
     */
    function getEventStats(uint256 eventId) public view returns (
        uint256 totalReviews, // CRITICAL: On-chain reputation
        uint256 averageRating, // CRITICAL: On-chain reputation
        uint256 totalRatingSum // CRITICAL: On-chain for calculation
    ) {
        EventStats storage stats = eventStats[eventId];
        return (
            stats.totalReviews, // CRITICAL: On-chain reputation
            stats.averageRating, // CRITICAL: On-chain reputation
            stats.totalRatingSum // CRITICAL: On-chain calculation
        );
    }

    /**
     * @dev Check if a user has reviewed an event - CRITICAL: On-chain check
     */
    function hasUserReviewed(uint256 eventId, address user) public view returns (bool) {
        return eventStats[eventId].hasReviewed[user]; // CRITICAL: On-chain check
    }

    /**
     * @dev Get all reviews for an event (metadata only) - CRITICAL: On-chain access
     */
    function getReviewsForEvent(uint256 eventId, uint256 offset, uint256 limit) 
        public 
        view 
        returns (
            address[] memory reviewers, // CRITICAL: On-chain identity
            uint256[] memory ratings, // CRITICAL: On-chain ratings
            string[] memory reviewUris,
            string[] memory contentHashes,
            uint256[] memory timestamps, // CRITICAL: On-chain audit trail
            uint256[] memory helpfulCounts // CRITICAL: On-chain quality metrics
        ) 
    {
        // Count reviews for this event - CRITICAL: On-chain counting
        uint256 totalReviews = 0;
        for (uint i = 0; i < reviewIds.length; i++) {
            if (reviews[reviewIds[i]].eventId == eventId) { // CRITICAL: On-chain check
                totalReviews++;
            }
        }

        // Determine the actual limit
        uint256 actualLimit = limit;
        if (offset + limit > totalReviews) {
            actualLimit = totalReviews - offset;
        }
        if (totalReviews < offset) {
            actualLimit = 0;
        }

        // Initialize return arrays
        reviewers = new address[](actualLimit);
        ratings = new uint256[](actualLimit);
        reviewUris = new string[](actualLimit);
        contentHashes = new string[](actualLimit);
        timestamps = new uint256[](actualLimit);
        helpfulCounts = new uint256[](actualLimit);

        uint256 currentIndex = 0;
        uint256 reviewIndex = 0;

        for (uint i = 0; i < reviewIds.length; i++) {
            if (reviews[reviewIds[i]].eventId == eventId) { // CRITICAL: On-chain indexing
                if (reviewIndex >= offset && currentIndex < actualLimit) {
                    Review memory review = reviews[reviewIds[i]];
                    reviewers[currentIndex] = review.reviewer; // CRITICAL: On-chain identity
                    ratings[currentIndex] = review.rating; // CRITICAL: On-chain rating
                    reviewUris[currentIndex] = review.reviewUri;
                    contentHashes[currentIndex] = review.contentHash;
                    timestamps[currentIndex] = review.timestamp; // CRITICAL: On-chain audit trail
                    helpfulCounts[currentIndex] = review.helpfulCount; // CRITICAL: On-chain quality metric
                    currentIndex++;
                }
                reviewIndex++;
                if (currentIndex >= actualLimit) {
                    break;
                }
            }
        }
    }

    /**
     * @dev Get total number of reviews - CRITICAL: On-chain metric
     */
    function getTotalReviews() public view returns (uint256) {
        return reviewIds.length; // CRITICAL: On-chain tracking
    }

    /**
     * @dev Get all review IDs - CRITICAL: On-chain access
     */
    function getAllReviewIds() public view returns (bytes32[] memory) {
        return reviewIds; // CRITICAL: On-chain tracking
    }
}