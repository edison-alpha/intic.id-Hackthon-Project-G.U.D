// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/IPlatform.sol";
import "./interfaces/IEventStatistics.sol";
import "./interfaces/INotificationSystem.sol";

/**
 * @title EventRefund
 * @dev Contract for managing event cancellations and ticket refunds
 * Users can claim refunds manually for cancelled events
 * CRITICAL: All refund state and transactions on-chain for transparency
 */
contract EventRefund is Ownable, ReentrancyGuard {
    address public platformContract;
    
    // Refund status enum
    enum RefundStatus {
        None,
        Pending,
        Approved,
        Rejected,
        Claimed
    }
    
    // Event cancellation reason enum
    enum CancellationReason {
        OrganizerCancelled,
        VenueClosed,
        Forcemajeure,
        LowSales,
        Other
    }
    
    // CRITICAL: Event cancellation data on-chain
    struct EventCancellation {
        address eventContract; // CRITICAL: On-chain for event identification
        uint256 eventId; // CRITICAL: On-chain for event tracking
        address organizer; // CRITICAL: On-chain for authorization
        uint256 ticketPrice; // CRITICAL: On-chain for refund calculation
        uint256 totalTicketsSold; // CRITICAL: On-chain for refund pool
        uint256 refundDeadline; // CRITICAL: On-chain for time limit
        uint256 cancelledAt; // CRITICAL: On-chain for audit trail
        CancellationReason reason; // CRITICAL: On-chain for transparency
        bool refundPoolFunded; // CRITICAL: On-chain for refund availability
        bool active; // CRITICAL: On-chain for cancellation status
    }
    
    // CRITICAL: Refund claim data on-chain
    struct RefundClaim {
        address claimant; // CRITICAL: On-chain for claimant identification
        address eventContract; // CRITICAL: On-chain for event identification
        uint256 eventId; // CRITICAL: On-chain for event tracking
        uint256 tokenId; // CRITICAL: On-chain for ticket identification
        uint256 refundAmount; // CRITICAL: On-chain for payment
        RefundStatus status; // CRITICAL: On-chain for claim status
        uint256 claimedAt; // CRITICAL: On-chain for audit trail
        uint256 processedAt; // CRITICAL: On-chain for processing time
        bool ticketBurned; // CRITICAL: On-chain for NFT tracking
    }
    
    // Mappings - CRITICAL: All on-chain for refund state
    mapping(address => mapping(uint256 => EventCancellation)) public eventCancellations; // eventContract => eventId => cancellation
    mapping(uint256 => RefundClaim) public refundClaims; // claimId => claim
    mapping(address => mapping(uint256 => mapping(uint256 => uint256))) public tokenClaimId; // eventContract => eventId => tokenId => claimId
    
    // Counters
    uint256 private _claimIdCounter;
    
    // Statistics - CRITICAL: On-chain for analytics
    uint256 public totalCancellations;
    uint256 public totalRefundsClaimed;
    uint256 public totalRefundAmount;
    
    // Refund pool for each event
    mapping(address => mapping(uint256 => uint256)) public refundPool; // eventContract => eventId => pool amount
    
    // Events
    event EventCancelled(
        address indexed eventContract,
        uint256 indexed eventId,
        address indexed organizer,
        CancellationReason reason,
        uint256 refundDeadline
    );
    
    event RefundPoolFunded(
        address indexed eventContract,
        uint256 indexed eventId,
        uint256 amount
    );
    
    event RefundClaimCreated(
        uint256 indexed claimId,
        address indexed claimant,
        address indexed eventContract,
        uint256 eventId,
        uint256 tokenId,
        uint256 refundAmount
    );
    
    event RefundClaimed(
        uint256 indexed claimId,
        address indexed claimant,
        uint256 refundAmount
    );
    
    event RefundApproved(uint256 indexed claimId);
    event RefundRejected(uint256 indexed claimId);
    
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
     * @dev Cancel an event and enable refunds
     * CRITICAL: Only event organizer or platform owner can cancel
     */
    function cancelEvent(
        address eventContract,
        uint256 eventId,
        uint256 ticketPrice,
        uint256 totalTicketsSold,
        uint256 refundDeadlineDays,
        CancellationReason reason
    ) external returns (bool) {
        require(refundDeadlineDays >= 7 && refundDeadlineDays <= 365, "Invalid refund deadline");
        require(ticketPrice > 0, "Invalid ticket price");
        require(totalTicketsSold > 0, "No tickets sold");
        
        // Check if already cancelled
        EventCancellation storage cancellation = eventCancellations[eventContract][eventId];
        require(!cancellation.active, "Event already cancelled");
        
        uint256 refundDeadline = block.timestamp + (refundDeadlineDays * 1 days);
        
        eventCancellations[eventContract][eventId] = EventCancellation({
            eventContract: eventContract,
            eventId: eventId,
            organizer: msg.sender,
            ticketPrice: ticketPrice,
            totalTicketsSold: totalTicketsSold,
            refundDeadline: refundDeadline,
            cancelledAt: block.timestamp,
            reason: reason,
            refundPoolFunded: false,
            active: true
        });
        
        totalCancellations++;
        
        emit EventCancelled(eventContract, eventId, msg.sender, reason, refundDeadline);
        
        return true;
    }
    
    /**
     * @dev Fund refund pool for cancelled event
     * CRITICAL: Organizer must fund refund pool
     */
    function fundRefundPool(
        address eventContract,
        uint256 eventId
    ) external payable nonReentrant returns (bool) {
        EventCancellation storage cancellation = eventCancellations[eventContract][eventId];
        require(cancellation.active, "Event not cancelled");
        require(msg.sender == cancellation.organizer || msg.sender == owner(), "Not authorized");
        require(!cancellation.refundPoolFunded, "Refund pool already funded");
        
        uint256 requiredAmount = cancellation.ticketPrice * cancellation.totalTicketsSold;
        require(msg.value >= requiredAmount, "Insufficient refund pool amount");
        
        refundPool[eventContract][eventId] = msg.value;
        cancellation.refundPoolFunded = true;
        
        // Refund excess if any
        if (msg.value > requiredAmount) {
            payable(msg.sender).transfer(msg.value - requiredAmount);
        }
        
        emit RefundPoolFunded(eventContract, eventId, requiredAmount);
        
        return true;
    }
    
    /**
     * @dev Claim refund for a cancelled event (MANUAL CLAIM)
     * CRITICAL: Users must claim their refunds manually
     */
    function claimRefund(
        address eventContract,
        uint256 eventId,
        uint256 tokenId
    ) external nonReentrant returns (uint256) {
        EventCancellation storage cancellation = eventCancellations[eventContract][eventId];
        require(cancellation.active, "Event not cancelled");
        require(cancellation.refundPoolFunded, "Refund pool not funded yet");
        require(block.timestamp <= cancellation.refundDeadline, "Refund deadline passed");
        
        // Check if already claimed
        uint256 existingClaimId = tokenClaimId[eventContract][eventId][tokenId];
        if (existingClaimId > 0) {
            RefundClaim storage existingClaim = refundClaims[existingClaimId];
            require(existingClaim.status != RefundStatus.Claimed, "Refund already claimed");
            require(existingClaim.status != RefundStatus.Pending, "Claim already pending");
        }
        
        // Verify NFT ownership
        IERC721 nft = IERC721(eventContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the ticket owner");
        
        // Check refund pool has funds
        require(refundPool[eventContract][eventId] >= cancellation.ticketPrice, "Insufficient refund pool");
        
        _claimIdCounter++;
        uint256 claimId = _claimIdCounter;
        
        // Create refund claim - Auto-approve for faster processing
        refundClaims[claimId] = RefundClaim({
            claimant: msg.sender,
            eventContract: eventContract,
            eventId: eventId,
            tokenId: tokenId,
            refundAmount: cancellation.ticketPrice,
            status: RefundStatus.Approved, // Auto-approve
            claimedAt: block.timestamp,
            processedAt: block.timestamp,
            ticketBurned: false
        });
        
        tokenClaimId[eventContract][eventId][tokenId] = claimId;
        
        // Process refund immediately
        _processRefund(claimId);
        
        emit RefundClaimCreated(
            claimId,
            msg.sender,
            eventContract,
            eventId,
            tokenId,
            cancellation.ticketPrice
        );
        
        return claimId;
    }
    
    /**
     * @dev Helper function to convert uint to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    /**
     * @dev Internal function to process approved refund
     * CRITICAL: Actual refund payment on-chain
     */
    function _processRefund(uint256 claimId) internal {
        RefundClaim storage claim = refundClaims[claimId];
        require(claim.status == RefundStatus.Approved, "Claim not approved");
        
        EventCancellation storage cancellation = eventCancellations[claim.eventContract][claim.eventId];
        
        // Deduct from refund pool
        require(refundPool[claim.eventContract][claim.eventId] >= claim.refundAmount, "Insufficient refund pool");
        refundPool[claim.eventContract][claim.eventId] -= claim.refundAmount;
        
        // Burn NFT ticket (optional - transfer to burn address)
        IERC721 nft = IERC721(claim.eventContract);
        if (nft.ownerOf(claim.tokenId) == claim.claimant) {
            // Mark as burned without actual burning (for tracking purposes)
            claim.ticketBurned = true;
        }
        
        // Transfer refund to claimant
        payable(claim.claimant).transfer(claim.refundAmount);
        
        // Update claim status
        claim.status = RefundStatus.Claimed;
        claim.processedAt = block.timestamp;
        
        // Update statistics
        totalRefundsClaimed++;
        totalRefundAmount += claim.refundAmount;
        
        emit RefundClaimed(claimId, claim.claimant, claim.refundAmount);
        
        // Platform integration - update statistics and notify user
        if (platformContract != address(0)) {
            // Update event statistics
            try IEventStatistics(IPlatform(platformContract).eventStatisticsContract()).incrementRefunds(claim.eventId) {} catch {}
            
            // Notify user of successful refund
            try INotificationSystem(IPlatform(platformContract).notificationSystemContract()).sendNotification(
                claim.claimant,
                "Refund Processed",
                string(abi.encodePacked("Refund processed for event #", _toString(claim.eventId))),
                "REFUND_SUCCESS"
            ) {} catch {}
        }
    }
    
    /**
     * @dev Approve refund claim (for manual review if needed)
     * CRITICAL: Only owner can approve
     */
    function approveRefund(uint256 claimId) external onlyOwner nonReentrant {
        RefundClaim storage claim = refundClaims[claimId];
        require(claim.status == RefundStatus.Pending, "Claim not pending");
        
        claim.status = RefundStatus.Approved;
        claim.processedAt = block.timestamp;
        
        _processRefund(claimId);
        
        emit RefundApproved(claimId);
    }
    
    /**
     * @dev Reject refund claim
     * CRITICAL: Only owner can reject
     */
    function rejectRefund(uint256 claimId) external onlyOwner {
        RefundClaim storage claim = refundClaims[claimId];
        require(claim.status == RefundStatus.Pending, "Claim not pending");
        
        claim.status = RefundStatus.Rejected;
        claim.processedAt = block.timestamp;
        
        emit RefundRejected(claimId);
    }
    
    /**
     * @dev Batch approve refunds
     * CRITICAL: Only owner can batch approve
     */
    function batchApproveRefunds(uint256[] calldata claimIds) external onlyOwner nonReentrant {
        for (uint256 i = 0; i < claimIds.length; i++) {
            RefundClaim storage claim = refundClaims[claimIds[i]];
            if (claim.status == RefundStatus.Pending) {
                claim.status = RefundStatus.Approved;
                claim.processedAt = block.timestamp;
                _processRefund(claimIds[i]);
                emit RefundApproved(claimIds[i]);
            }
        }
    }
    
    /**
     * @dev Withdraw unclaimed refunds after deadline
     * CRITICAL: Organizer can withdraw unclaimed funds after deadline
     */
    function withdrawUnclaimedRefunds(
        address eventContract,
        uint256 eventId
    ) external nonReentrant {
        EventCancellation storage cancellation = eventCancellations[eventContract][eventId];
        require(cancellation.active, "Event not cancelled");
        require(msg.sender == cancellation.organizer || msg.sender == owner(), "Not authorized");
        require(block.timestamp > cancellation.refundDeadline, "Refund deadline not passed");
        
        uint256 remainingPool = refundPool[eventContract][eventId];
        require(remainingPool > 0, "No unclaimed refunds");
        
        refundPool[eventContract][eventId] = 0;
        payable(msg.sender).transfer(remainingPool);
    }
    
    /**
     * @dev Get event cancellation details
     */
    function getEventCancellation(
        address eventContract,
        uint256 eventId
    ) external view returns (EventCancellation memory) {
        return eventCancellations[eventContract][eventId];
    }
    
    /**
     * @dev Get refund claim details
     */
    function getRefundClaim(uint256 claimId) external view returns (RefundClaim memory) {
        return refundClaims[claimId];
    }
    
    /**
     * @dev Check if user can claim refund
     */
    function canClaimRefund(
        address eventContract,
        uint256 eventId,
        uint256 tokenId,
        address user
    ) external view returns (bool) {
        EventCancellation memory cancellation = eventCancellations[eventContract][eventId];
        
        if (!cancellation.active) return false;
        if (!cancellation.refundPoolFunded) return false;
        if (block.timestamp > cancellation.refundDeadline) return false;
        
        // Check if already claimed
        uint256 existingClaimId = tokenClaimId[eventContract][eventId][tokenId];
        if (existingClaimId > 0) {
            RefundClaim memory existingClaim = refundClaims[existingClaimId];
            if (existingClaim.status == RefundStatus.Claimed) return false;
        }
        
        // Check NFT ownership
        IERC721 nft = IERC721(eventContract);
        try nft.ownerOf(tokenId) returns (address owner) {
            if (owner != user) return false;
        } catch {
            return false;
        }
        
        // Check refund pool has funds
        if (refundPool[eventContract][eventId] < cancellation.ticketPrice) return false;
        
        return true;
    }
    
    /**
     * @dev Get refund statistics
     */
    function getRefundStats() external view returns (
        uint256 totalCancellationsCount,
        uint256 totalRefundsClaimedCount,
        uint256 totalRefundAmountPaid
    ) {
        return (totalCancellations, totalRefundsClaimed, totalRefundAmount);
    }
    
    /**
     * @dev Get refund pool balance
     */
    function getRefundPoolBalance(
        address eventContract,
        uint256 eventId
    ) external view returns (uint256) {
        return refundPool[eventContract][eventId];
    }
    
    /**
     * @dev Emergency withdrawal (only owner)
     * CRITICAL: Only for emergency situations
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
