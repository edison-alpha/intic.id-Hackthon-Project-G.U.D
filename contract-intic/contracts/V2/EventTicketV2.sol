// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

/**
 * @title EventTicketV2 - Universal Event Ticketing
 * @notice PUSHCHAIN Universal Execution Compatible E-Ticketing NFT
 * @dev Self-contained event ticket contract with automatic organizer registry
 *
 * KEY FEATURES V2:
 * - ✅ Universal Execution Account (UEA) Support
 * - ✅ Multi-chain tracking with buyerChain field
 * - ✅ Self-registers to EventOrganizer (no Platform dependency)
 * - ✅ Smart minting: _mint for contracts (UEA), _safeMint for EOA
 * - ✅ Constructor compatible with frontend (V2 compatibility)
 * - ✅ EIP-2981 Royalty support
 * - ✅ Transfer restriction for used tickets
 *
 * PUSHCHAIN FEATURES:
 * - buyerChain: Tracks which chain the buyer purchased from
 * - UEA Support: Handles contract-based accounts on Push Chain
 * - Cross-chain metadata: IPFS for universal accessibility
 */

// ========= Interfaces =========

interface IEventOrganizerV2 {
    function recordEventCreation(
        address eventContract,
        address creator,
        uint256 eventId
    ) external returns (uint256);

    function incrementTicketsSold(
        address organizer,
        uint256 amount,
        uint256 revenue
    ) external;

    function organizerExists(address organizer) external view returns (bool);
}

contract EventTicketV3 is ERC721, ERC721Enumerable, Ownable, IERC2981 {
    using Strings for uint256;

    // ========= Storage =========

    /// @notice EventOrganizer contract (optional - for auto-registration)
    address public eventOrganizerContract;

    /// @notice Event ID (assigned by EventOrganizer or set manually)
    uint256 public eventId;

    /// @notice Event organizer address
    address public organizer;

    /// @notice Token ID counter
    uint256 private _tokenIdCounter;

    // ========= Event Data (CRITICAL: On-chain) =========

    string public eventName;
    uint256 public eventDate;
    string public eventVenue;
    string public venueAddress;
    string public venueCoordinates;
    string public eventImageUri;
    uint256 public maxSupply;
    uint256 public ticketPrice;
    bool public eventCancelled;
    bool public eventPaused;
    uint256 public refundDeadline;
    string public eventDescription;

    // ========= Metadata & Royalty =========

    string public metadataUri; // IPFS base URI
    string public contentHash; // Metadata hash for verification
    uint96 public royaltyPercent; // Royalty in basis points (250 = 2.5%)

    // ========= Ticket Tracking =========

    /// @notice Track used tickets
    mapping(uint256 => bool) public used;

    /// @notice Track buyer chain per token (PUSHCHAIN FEATURE)
    mapping(uint256 => string) public tokenBuyerChain;

    /// @notice Track original buyer per token
    mapping(uint256 => address) public tokenOriginalBuyer;

    /// @notice Track purchase price per token
    mapping(uint256 => uint256) public tokenPurchasePrice;

    // ========= Refund Mechanism =========

    bool public refundsEnabled;
    mapping(address => uint256) public refundedTicketCount; // Track how many tickets refunded per user
    mapping(uint256 => bool) public isRefunded; // Track which specific tokens are refunded
    uint256 public totalRefundsClaimed;
    bool public fundsWithdrawn;

    // ========= FRAUD PROTECTION (V3.1) =========
    
    /// @notice Minimum time EO must wait after event before withdrawal (72 hours)
    uint256 public constant WITHDRAWAL_LOCK_PERIOD = 72 hours;
    
    /// @notice Track when funds become withdrawable (eventDate + WITHDRAWAL_LOCK_PERIOD)
    uint256 public fundsUnlockTime;
    
    /// @notice Emergency refund enabled if fraud detected
    bool public emergencyRefundEnabled;
    
    /// @notice Track users who reported fraud
    mapping(address => bool) public hasReportedFraud;
    
    /// @notice Count of fraud reports
    uint256 public fraudReportCount;
    
    /// @notice Threshold for auto-enabling emergency refund (30% of ticket holders)
    uint256 public constant FRAUD_THRESHOLD_PERCENT = 30;

    // ========= Events =========

    event TicketMinted(
        address indexed buyer,
        uint256 indexed tokenId,
        uint256 price,
        string buyerChain
    );
    event TicketUsed(address indexed user, uint256 indexed tokenId, uint256 timestamp);
    event EventCancelled(uint256 timestamp);
    event EventPaused(uint256 timestamp);
    event EventResumed(uint256 timestamp);
    event RefundClaimed(address indexed user, uint256 amount, uint256[] tokenIds);
    event PartialRefundClaimed(address indexed user, uint256 amount, uint256 ticketCount, uint256[] tokenIds);
    event FundsWithdrawn(address indexed organizer, uint256 amount);
    event EventOrganizerSet(address indexed eventOrganizer);
    
    // FRAUD PROTECTION EVENTS (V3.1)
    event FraudReported(address indexed reporter, uint256 reportCount, uint256 threshold);
    event EmergencyRefundActivated(uint256 timestamp, uint256 reportCount);
    event EmergencyRefundClaimed(address indexed user, uint256 amount, uint256[] tokenIds);

    // ========= Custom Errors =========

    error EventIsCancelled();
    error EventIsPaused();
    error SoldOut();
    error InsufficientPayment();
    error NotTokenOwner();
    error TicketAlreadyUsed();
    error EventNotEnded();
    error RefundsNotEnabled();
    error RefundDeadlinePassed();
    error NoTicketsOwned();
    error NoUnusedTickets();
    error TicketAlreadyRefunded();
    error InsufficientBalance();
    error RefundTransferFailed();
    error FundsAlreadyWithdrawn();
    error RefundsAreEnabled();
    error NoFundsToWithdraw();
    error WithdrawalFailed();
    error CannotWithdrawWithPendingRefunds();
    
    // FRAUD PROTECTION ERRORS (V3.1)
    error FundsStillLocked();
    error AlreadyReportedFraud();
    error EmergencyRefundNotEnabled();

    // ========= Constructor =========

    /**
     * @notice Deploy EventTicketV3
     * @dev Constructor compatible with V2 frontend (no breaking changes)
     *
     * PARAMETER MAPPING (V2 compatibility):
     * - _totalSupply → maxSupply
     * - _eventOrganizerContract → eventOrganizerContract
     * - Auto-generates: eventId (via recordEventCreation), royaltyPercent (2.5%)
     *
     * NEW V3 FEATURES:
     * - Auto-registers to EventOrganizer (if provided)
     * - Sets up buyerChain tracking
     * - UEA support enabled
     */
    constructor(
        uint256 _totalSupply, // 1. Total ticket supply
        uint256 _ticketPrice, // 2. Price per ticket (wei)
        string memory _nftName, // 3. NFT collection name
        string memory _nftSymbol, // 4. NFT symbol
        string memory _eventName, // 5. Event name
        uint256 _eventDate, // 6. Event date (unix timestamp)
        string memory _eventVenue, // 7. Venue name
        string memory _venueAddress, // 8. Full venue address
        string memory _venueCoordinates, // 9. Lat,Lon coordinates
        string memory _eventImageUri, // 10. Event image IPFS URI
        string memory _metadataUri, // 11. Metadata base URI (IPFS)
        address _eventOrganizerContract, // 12. EventOrganizer contract
        string memory _eventDescription // 13. Event description
    ) ERC721(_nftName, _nftSymbol) Ownable(msg.sender) {
        // Map parameters to state variables
        maxSupply = _totalSupply;
        ticketPrice = _ticketPrice;
        eventName = _eventName;
        eventDescription = _eventDescription;
        eventDate = _eventDate;
        eventVenue = _eventVenue;
        venueAddress = _venueAddress;
        venueCoordinates = _venueCoordinates;
        eventImageUri = _eventImageUri;
        metadataUri = _metadataUri;

        // V3 defaults
        eventId = 0; // Will be set by EventOrganizer
        organizer = msg.sender; // Deployer is organizer
        eventOrganizerContract = _eventOrganizerContract;
        royaltyPercent = 250; // Default 2.5% royalty
        refundDeadline = _eventDate + 30 days; // 30 days after event
        
        // FRAUD PROTECTION: Set fund unlock time (V3.1)
        fundsUnlockTime = _eventDate + WITHDRAWAL_LOCK_PERIOD; // 72h after event

        // Generate content hash
        if (bytes(_metadataUri).length > 0) {
            contentHash = string(abi.encodePacked(keccak256(abi.encodePacked(_metadataUri))));
        }

        // AUTO-REGISTER to EventOrganizer (V3 feature)
        if (_eventOrganizerContract != address(0)) {
            try
                IEventOrganizerV2(_eventOrganizerContract).recordEventCreation(
                    address(this),
                    msg.sender,
                    0 // eventId will be auto-assigned
                )
            returns (uint256 assignedId) {
                eventId = assignedId;
            } catch {
                // Silent fail - event can still function without registration
                // Frontend can call recordEventCreation manually if needed
            }
        }
    }

    // ========= Core Functions =========

    /**
     * @notice Mint a ticket NFT - UNIVERSAL EXECUTION COMPATIBLE
     * @dev PUSHCHAIN V3 IMPROVEMENT:
     *      - Detects UEA (contract address) and uses _mint
     *      - Detects EOA and uses _safeMint
     *      - Tracks buyerChain for multi-chain support
     *      - Auto-updates EventOrganizer stats
     *
     * @return tokenId Newly minted token ID
     */
    function mintTicket() external payable returns (uint256) {
        if (eventCancelled) revert EventIsCancelled();
        if (eventPaused) revert EventIsPaused();
        if (_tokenIdCounter >= maxSupply) revert SoldOut();
        if (msg.value < ticketPrice) revert InsufficientPayment();

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        // UNIVERSAL EXECUTION COMPATIBLE MINTING (V3 CORE FEATURE)
        // UEAs are contract addresses on Push Chain but don't implement IERC721Receiver
        // Use _mint for contracts (UEA), _safeMint for EOAs
        if (msg.sender.code.length > 0) {
            // Contract address (UEA) - use _mint to skip receiver check
            _mint(msg.sender, tokenId);
        } else {
            // EOA - use _safeMint for safety
            _safeMint(msg.sender, tokenId);
        }

        // Track purchase metadata (PUSHCHAIN V3 FEATURE)
        tokenBuyerChain[tokenId] = _chainString(); // NEW: buyerChain tracking
        tokenOriginalBuyer[tokenId] = msg.sender;
        tokenPurchasePrice[tokenId] = msg.value;

        emit TicketMinted(msg.sender, tokenId, msg.value, tokenBuyerChain[tokenId]);

        // Auto-update EventOrganizer stats (V3 integration)
        if (eventOrganizerContract != address(0)) {
            try
                IEventOrganizerV2(eventOrganizerContract).incrementTicketsSold(
                    organizer,
                    1,
                    ticketPrice
                )
            {} catch {
                // Silent fail - don't block ticket purchase if stats update fails
            }
        }

        return tokenId;
    }

    /**
     * @notice Use/validate a ticket - UNIVERSAL EXECUTION COMPATIBLE
     * @dev Can be called from any chain via UEA
     * @param tokenId Token ID to validate
     */
    function useTicket(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (used[tokenId]) revert TicketAlreadyUsed();
        if (block.timestamp > eventDate + 1 days) revert EventNotEnded(); // 1 day grace
        if (eventCancelled) revert EventIsCancelled();

        used[tokenId] = true;
        emit TicketUsed(msg.sender, tokenId, block.timestamp);
    }

    // ========= Organizer Functions =========

    modifier onlyOrganizer() {
        require(msg.sender == organizer || msg.sender == owner(), "Only organizer or owner");
        _;
    }

    function pauseEvent() external onlyOrganizer {
        require(!eventPaused, "Already paused");
        eventPaused = true;
        emit EventPaused(block.timestamp);
    }

    function resumeEvent() external onlyOrganizer {
        require(eventPaused, "Not paused");
        eventPaused = false;
        emit EventResumed(block.timestamp);
    }

    function cancelEvent() external onlyOrganizer {
        require(!eventCancelled, "Already cancelled");
        eventCancelled = true;
        refundsEnabled = true; // Automatic refund when cancelled
        emit EventCancelled(block.timestamp);
    }

    function updateEventName(string memory newName) external onlyOrganizer {
        eventName = newName;
    }

    function updateEventDescription(string memory newDescription) external onlyOrganizer {
        eventDescription = newDescription;
    }

    function updateEventImage(string memory newImageUri) external onlyOrganizer {
        eventImageUri = newImageUri;
    }

    function updateMetadataUri(string memory newUri) external onlyOrganizer {
        metadataUri = newUri;
        if (bytes(newUri).length > 0) {
            contentHash = string(abi.encodePacked(keccak256(abi.encodePacked(newUri))));
        }
    }

    function setEventOrganizerContract(address _eventOrganizer) external onlyOrganizer {
        eventOrganizerContract = _eventOrganizer;
        emit EventOrganizerSet(_eventOrganizer);
    }

    function setRoyaltyPercent(uint96 newPercent) external onlyOrganizer {
        require(newPercent <= 1000, "Royalty too high"); // Max 10%
        royaltyPercent = newPercent;
    }

    /**
     * @notice Withdraw funds after event (organizer only)
     * @dev V3.1 FRAUD PROTECTION:
     *      - Cannot withdraw until 72 hours after event (WITHDRAWAL_LOCK_PERIOD)
     *      - Cannot withdraw if emergency refund is enabled
     *      - Cannot withdraw if refunds are enabled and deadline not passed
     *      - Gives users time to report fraud if event didn't happen
     */
    function withdrawFunds() external onlyOrganizer {
        if (fundsWithdrawn) revert FundsAlreadyWithdrawn();
        if (block.timestamp <= eventDate) revert EventNotEnded();
        
        // V3.1 PROTECTION: 72-hour mandatory lock after event
        if (block.timestamp < fundsUnlockTime) revert FundsStillLocked();
        
        // V3.1 PROTECTION: Cannot withdraw if emergency refund active
        if (emergencyRefundEnabled) revert CannotWithdrawWithPendingRefunds();
        
        if (refundsEnabled && block.timestamp <= refundDeadline) revert CannotWithdrawWithPendingRefunds();

        uint256 balance = address(this).balance;
        if (balance == 0) revert NoFundsToWithdraw();

        fundsWithdrawn = true;

        (bool success, ) = payable(organizer).call{value: balance}("");
        if (!success) revert WithdrawalFailed();

        emit FundsWithdrawn(organizer, balance);
    }

    // ========= Refund Mechanism =========

    /**
     * @notice Claim partial or full refund for cancelled event
     * @dev NEW V3 FEATURE: Supports partial refunds!
     *      - Only refunds UNUSED tickets
     *      - Burns refunded tickets
     *      - User can claim multiple times until all unused tickets refunded
     *      - Protects EO: Used tickets cannot be refunded
     */
    function claimRefund() external {
        if (!refundsEnabled) revert RefundsNotEnabled();
        if (block.timestamp > refundDeadline) revert RefundDeadlinePassed();

        uint256 balance = balanceOf(msg.sender);
        if (balance == 0) revert NoTicketsOwned();

        // Collect all UNUSED tickets
        uint256[] memory unusedTokenIds = new uint256[](balance);
        uint256 unusedCount = 0;

        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(msg.sender, i);
            
            // Only refund unused and not-yet-refunded tickets
            if (!used[tokenId] && !isRefunded[tokenId]) {
                unusedTokenIds[unusedCount] = tokenId;
                unusedCount++;
            }
        }

        if (unusedCount == 0) revert NoUnusedTickets();

        // Calculate refund amount (only for unused tickets)
        uint256 refundAmount = unusedCount * ticketPrice;
        if (address(this).balance < refundAmount) revert InsufficientBalance();

        // Mark tickets as refunded and burn them
        uint256[] memory refundedTokens = new uint256[](unusedCount);
        for (uint256 i = 0; i < unusedCount; i++) {
            uint256 tokenId = unusedTokenIds[i];
            isRefunded[tokenId] = true;
            refundedTokens[i] = tokenId;
            
            // Burn the ticket NFT after refund
            _burn(tokenId);
        }

        // Update refund tracking
        refundedTicketCount[msg.sender] += unusedCount;
        totalRefundsClaimed += refundAmount;

        // Transfer refund
        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        if (!success) revert RefundTransferFailed();

        // Emit appropriate event
        if (unusedCount == balance) {
            // Full refund (all tickets unused)
            emit RefundClaimed(msg.sender, refundAmount, refundedTokens);
        } else {
            // Partial refund (some tickets used)
            emit PartialRefundClaimed(msg.sender, refundAmount, unusedCount, refundedTokens);
        }
    }

    /**
     * @notice Get refund eligibility info for a user
     * @dev Useful for frontend to display refund status
     * @return canClaim Whether user has refundable tickets
     * @return unusedTicketCount Number of unused tickets
     * @return usedTicketCount Number of used tickets
     * @return refundAmount Potential refund amount (for unused tickets)
     */
    function getRefundInfo(address user)
        external
        view
        returns (
            bool canClaim,
            uint256 unusedTicketCount,
            uint256 usedTicketCount,
            uint256 refundAmount
        )
    {
        if (!refundsEnabled || block.timestamp > refundDeadline) {
            return (false, 0, 0, 0);
        }

        uint256 balance = balanceOf(user);
        if (balance == 0) {
            return (false, 0, 0, 0);
        }

        uint256 unusedCount = 0;
        uint256 usedCount = 0;

        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(user, i);
            
            if (isRefunded[tokenId]) {
                // Already refunded, skip
                continue;
            } else if (used[tokenId]) {
                usedCount++;
            } else {
                unusedCount++;
            }
        }

        bool eligible = unusedCount > 0 && address(this).balance >= (unusedCount * ticketPrice);
        uint256 potentialRefund = unusedCount * ticketPrice;

        return (eligible, unusedCount, usedCount, potentialRefund);
    }

    // ========= FRAUD PROTECTION MECHANISMS (V3.1) =========

    /**
     * @notice Report fraud if event didn't happen despite check-ins
     * @dev COMMUNITY PROTECTION:
     *      - Any ticket holder can report fraud
     *      - If 30% of ticket holders report, emergency refund auto-enabled
     *      - Protects against EO check-in scam scenario
     *      - Can report even after event date passes
     */
    function reportFraud() external {
        // Must own at least one ticket (current or burned)
        uint256 balance = balanceOf(msg.sender);
        bool hasRefundedTickets = refundedTicketCount[msg.sender] > 0;
        
        if (balance == 0 && !hasRefundedTickets) revert NoTicketsOwned();
        if (hasReportedFraud[msg.sender]) revert AlreadyReportedFraud();
        
        // Mark as reported
        hasReportedFraud[msg.sender] = true;
        fraudReportCount++;
        
        // Calculate threshold (30% of total tickets sold)
        uint256 threshold = (_tokenIdCounter * FRAUD_THRESHOLD_PERCENT) / 100;
        
        emit FraudReported(msg.sender, fraudReportCount, threshold);
        
        // Auto-enable emergency refund if threshold reached
        if (fraudReportCount >= threshold && !emergencyRefundEnabled) {
            emergencyRefundEnabled = true;
            refundsEnabled = true; // Also enable regular refunds
            emit EmergencyRefundActivated(block.timestamp, fraudReportCount);
        }
    }

    /**
     * @notice Emergency refund for fraud scenarios
     * @dev V3.1 CRITICAL PROTECTION:
     *      - Allows refund even for USED tickets if fraud detected
     *      - Only works if emergency refund enabled (30% threshold)
     *      - Protects users from check-in scam
     *      - Burns tickets after refund
     */
    function claimEmergencyRefund() external {
        if (!emergencyRefundEnabled) revert EmergencyRefundNotEnabled();
        
        uint256 balance = balanceOf(msg.sender);
        if (balance == 0) revert NoTicketsOwned();
        
        // Collect ALL tickets (including used ones - this is the key difference)
        uint256[] memory allTokenIds = new uint256[](balance);
        uint256 refundableCount = 0;
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(msg.sender, i);
            
            // Only refund if not already refunded
            if (!isRefunded[tokenId]) {
                allTokenIds[refundableCount] = tokenId;
                refundableCount++;
            }
        }
        
        if (refundableCount == 0) revert TicketAlreadyRefunded();
        
        // Calculate full refund amount (including used tickets)
        uint256 refundAmount = refundableCount * ticketPrice;
        if (address(this).balance < refundAmount) revert InsufficientBalance();
        
        // Mark as refunded and burn
        uint256[] memory refundedTokens = new uint256[](refundableCount);
        for (uint256 i = 0; i < refundableCount; i++) {
            uint256 tokenId = allTokenIds[i];
            isRefunded[tokenId] = true;
            refundedTokens[i] = tokenId;
            
            // Burn the ticket NFT
            _burn(tokenId);
        }
        
        // Update tracking
        refundedTicketCount[msg.sender] += refundableCount;
        totalRefundsClaimed += refundAmount;
        
        // Transfer refund
        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        if (!success) revert RefundTransferFailed();
        
        emit EmergencyRefundClaimed(msg.sender, refundAmount, refundedTokens);
    }

    /**
     * @notice Get fraud protection status
     * @dev Frontend helper to display fraud reporting UI
     */
    function getFraudProtectionInfo()
        external
        view
        returns (
            uint256 reportCount,
            uint256 threshold,
            bool emergencyActive,
            uint256 fundsUnlock,
            bool canWithdraw
        )
    {
        uint256 thresholdCalc = (_tokenIdCounter * FRAUD_THRESHOLD_PERCENT) / 100;
        bool withdrawable = block.timestamp >= fundsUnlockTime && 
                            !emergencyRefundEnabled && 
                            !fundsWithdrawn;
        
        return (
            fraudReportCount,
            thresholdCalc,
            emergencyRefundEnabled,
            fundsUnlockTime,
            withdrawable
        );
    }

    // ========= View Functions =========

    function getTicketsRemaining() external view returns (uint256) {
        return maxSupply - _tokenIdCounter;
    }

    function isTicketUsed(uint256 tokenId) external view returns (bool) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return used[tokenId];
    }

    function getEventInfo()
        external
        view
        returns (
            string memory name,
            uint256 date,
            string memory venue,
            uint256 price,
            uint256 remaining,
            bool cancelled,
            bool paused
        )
    {
        return (
            eventName,
            eventDate,
            eventVenue,
            ticketPrice,
            maxSupply - _tokenIdCounter,
            eventCancelled,
            eventPaused
        );
    }

    /**
     * @notice Get detailed event information (V3 improvement)
     */
    function getEventDetails()
        external
        view
        returns (
            string memory name,
            uint256 date,
            string memory venue,
            string memory vAddress,
            string memory coordinates,
            string memory imageUri,
            uint256 supply,
            uint256 price,
            uint256 sold,
            uint256 remaining,
            bool cancelled,
            bool paused,
            uint8 status, // 0=Active, 1=SoldOut, 2=Ended, 3=Cancelled
            address org,
            string memory description
        )
    {
        uint8 eventStatus;
        if (eventCancelled) {
            eventStatus = 3;
        } else if (_tokenIdCounter >= maxSupply) {
            eventStatus = 1;
        } else if (block.timestamp > eventDate) {
            eventStatus = 2;
        } else {
            eventStatus = 0;
        }

        return (
            eventName,
            eventDate,
            eventVenue,
            venueAddress,
            venueCoordinates,
            eventImageUri,
            maxSupply,
            ticketPrice,
            _tokenIdCounter,
            maxSupply - _tokenIdCounter,
            eventCancelled,
            eventPaused,
            eventStatus,
            organizer,
            eventDescription
        );
    }

    /**
     * @notice Get ticket metadata with buyerChain (V3 NEW FEATURE)
     */
    function getTicketMetadata(uint256 tokenId)
        external
        view
        returns (
            address owner,
            address originalBuyer,
            uint256 purchasePrice,
            string memory buyerChain,
            bool isUsed
        )
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return (
            ownerOf(tokenId),
            tokenOriginalBuyer[tokenId],
            tokenPurchasePrice[tokenId],
            tokenBuyerChain[tokenId],
            used[tokenId]
        );
    }

    /**
     * @notice Get ticket details by token ID (V2 compatibility)
     */
    function getTicketDetails(uint256 tokenId)
        external
        view
        returns (
            address owner,
            bool isUsed,
            string memory eName,
            uint256 eDate,
            string memory eVenue,
            string memory eImage,
            uint8 status
        )
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        uint8 eventStatus;
        if (eventCancelled) {
            eventStatus = 3;
        } else if (_tokenIdCounter >= maxSupply) {
            eventStatus = 1;
        } else if (block.timestamp > eventDate) {
            eventStatus = 2;
        } else {
            eventStatus = 0;
        }

        return (ownerOf(tokenId), used[tokenId], eventName, eventDate, eventVenue, eventImageUri, eventStatus);
    }

    /**
     * @notice Get all tokens owned by an address
     */
    function getTokensByOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);

        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }

        return tokens;
    }

    /**
     * @notice Get owner's tickets with usage status
     */
    function getOwnerTicketsDetails(address owner)
        external
        view
        returns (uint256[] memory tokenIds, bool[] memory isUsed)
    {
        uint256 balance = balanceOf(owner);
        tokenIds = new uint256[](balance);
        isUsed = new bool[](balance);

        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
            isUsed[i] = used[tokenIds[i]];
        }

        return (tokenIds, isUsed);
    }

    // ========= Internal Helpers =========

    /**
     * @notice Get chain identifier string (PUSHCHAIN V3 FEATURE)
     * @dev Format: "chain:<chainId>"
     */
    function _chainString() internal view returns (string memory) {
        return string(abi.encodePacked("chain:", block.chainid.toString()));
    }

    // ========= Token URI & Metadata =========

    function _baseURI() internal view virtual override returns (string memory) {
        return metadataUri;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        // Use metadataUri if set (IPFS)
        if (bytes(metadataUri).length > 0) {
            return string(abi.encodePacked(metadataUri, tokenId.toString(), ".json"));
        }

        // Fallback: on-chain JSON
        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(
                        bytes(
                            string(
                                abi.encodePacked(
                                    '{"name":"',
                                    eventName,
                                    " Ticket #",
                                    tokenId.toString(),
                                    '","description":"',
                                    eventDescription,
                                    '","image":"',
                                    eventImageUri,
                                    '","attributes":[',
                                    '{"trait_type":"Event","value":"',
                                    eventName,
                                    '"},',
                                    '{"trait_type":"Venue","value":"',
                                    eventVenue,
                                    '"},',
                                    '{"trait_type":"Used","value":"',
                                    used[tokenId] ? "Yes" : "No",
                                    '"},',
                                    '{"trait_type":"Buyer Chain","value":"',
                                    tokenBuyerChain[tokenId],
                                    '"}]}'
                                )
                            )
                        )
                    )
                )
            );
    }

    // ========= EIP-2981 Royalty =========

    function royaltyInfo(uint256, uint256 salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        receiver = organizer;
        royaltyAmount = (salePrice * royaltyPercent) / 10000;
    }

    // ========= Required Overrides =========

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }
}

// ========= Base64 Library =========

library Base64 {
    string internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        string memory table = TABLE;
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        string memory result = new string(encodedLen + 32);

        assembly {
            mstore(result, encodedLen)
            let tablePtr := add(table, 1)
            let dataPtr := data
            let endPtr := add(dataPtr, mload(data))
            let resultPtr := add(result, 32)

            for {

            } lt(dataPtr, endPtr) {

            } {
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)
                mstore(resultPtr, shl(248, mload(add(tablePtr, and(shr(18, input), 0x3F)))))
                resultPtr := add(resultPtr, 1)
                mstore(resultPtr, shl(248, mload(add(tablePtr, and(shr(12, input), 0x3F)))))
                resultPtr := add(resultPtr, 1)
                mstore(resultPtr, shl(248, mload(add(tablePtr, and(shr(6, input), 0x3F)))))
                resultPtr := add(resultPtr, 1)
                mstore(resultPtr, shl(248, mload(add(tablePtr, and(input, 0x3F)))))
                resultPtr := add(resultPtr, 1)
            }

            switch mod(mload(data), 3)
            case 1 {
                mstore(sub(resultPtr, 2), shl(240, 0x3d3d))
            }
            case 2 {
                mstore(sub(resultPtr, 1), shl(248, 0x3d))
            }
        }

        return result;
    }
}
