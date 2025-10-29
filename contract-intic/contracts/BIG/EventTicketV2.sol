// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "./interfaces/IPlatform.sol";
import "./interfaces/IUserProfile.sol";
import "./interfaces/IEventStatistics.sol";
import "./interfaces/INotificationSystem.sol";
import "./interfaces/IEventOrganizer.sol";

/**
 * @title UniversalEventTicketV2
 * @dev PUSHCHAIN E-Ticketing platform - Universal Execution Compatible
 * 
 * KEY CHANGES FROM V1:
 * - ✅ Removed onlyUniversalAccount modifier (allows EOA and UEA)
 * - ✅ Uses _mint() for contract addresses (UEA support)
 * - ✅ Uses _safeMint() for EOA (safety check)
 * - ✅ Follows Push Chain Universal Execution best practices
 * 
 * CRITICAL: Essential data for contract logic remains on-chain per industry standards
 */
contract UniversalEventTicketV2 is ERC721, ERC721Enumerable, Ownable, IERC2981 {
    
    address public platformContract;
    uint256 public eventId;
    address public organizer;
    
    uint256 private _tokenIdCounter;
    
    // CRITICAL ON-CHAIN DATA
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
    mapping(uint256 => bool) public used;
    uint256 public refundDeadline;
    string public eventDescription;
    
    // Off-chain metadata reference
    string public metadataUri;
    string public contentHash;
    
    uint96 public royaltyPercent;
    
    // Refund mechanism
    bool public refundsEnabled;
    mapping(address => bool) public hasClaimedRefund;
    uint256 public totalRefundsClaimed;
    
    bool public fundsWithdrawn;

    // EVENTS
    event TicketMinted(address indexed buyer, uint256 indexed tokenId, uint256 price);
    event TicketUsed(address indexed user, uint256 indexed tokenId);
    event EventCancelled();
    event EventPaused();
    event EventResumed();
    event RefundClaimed(address indexed user, uint256 amount, uint256[] tokenIds);
    event FundsWithdrawn(address indexed organizer, uint256 amount);

    constructor(
        string memory _eventName,
        string memory _eventDescription,
        uint256 _eventDate,
        string memory _eventVenue,
        string memory _venueAddress,
        string memory _venueCoordinates,
        string memory _eventImageUri,
        uint256 _ticketPrice,
        uint256 _maxSupply,
        uint256 _eventId,
        address _organizer,
        address _platformContract,
        uint96 _royaltyPercent
    ) ERC721(_eventName, "TICKET") Ownable(msg.sender) {
        eventName = _eventName;
        eventDescription = _eventDescription;
        eventDate = _eventDate;
        eventVenue = _eventVenue;
        venueAddress = _venueAddress;
        venueCoordinates = _venueCoordinates;
        eventImageUri = _eventImageUri;
        ticketPrice = _ticketPrice;
        maxSupply = _maxSupply;
        eventId = _eventId;
        organizer = _organizer;
        platformContract = _platformContract;
        royaltyPercent = _royaltyPercent;
        refundDeadline = _eventDate + 30 days;
        
        // AUTO-REGISTER to EventOrganizer (like V1 but with try-catch for safety)
        if (_platformContract != address(0)) {
            try IPlatform(_platformContract).eventOrganizerContract() returns (address eoContract) {
                if (eoContract != address(0)) {
                    try IEventOrganizer(eoContract).recordEventCreation(
                        address(this), 
                        _organizer, 
                        _eventId
                    ) {} catch {
                        // Silent fail - event can still function without registration
                        // Frontend can call recordEventCreation manually if needed
                    }
                }
            } catch {
                // Platform contract doesn't have eventOrganizerContract function
            }
        }
    }

    /**
     * @notice Mint a ticket NFT - UNIVERSAL EXECUTION COMPATIBLE
     * @dev Accepts payments from EOA or UEA (Universal Execution Account)
     * 
     * KEY FEATURES:
     * - No modifier restriction (anyone can mint if they pay)
     * - Smart mint: _safeMint for EOA, _mint for contracts (UEA)
     * - All security checks via require (not modifier)
     */
    function mintTicket() public payable returns (uint256) {
        require(!eventCancelled, "Event has been cancelled");
        require(!eventPaused, "Ticket sales are paused");
        require(_tokenIdCounter < maxSupply, "All tickets have been minted");
        require(msg.value >= ticketPrice, "Insufficient payment amount");

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        // UNIVERSAL EXECUTION COMPATIBLE MINTING
        // UEAs are contracts on Push Chain but don't implement IERC721Receiver
        // Use _mint for contracts, _safeMint for EOAs
        if (msg.sender.code.length > 0) {
            _mint(msg.sender, tokenId);
        } else {
            _safeMint(msg.sender, tokenId);
        }

        emit TicketMinted(msg.sender, tokenId, msg.value);
        
        // Platform integration - auto-update related contracts
        if (platformContract != address(0)) {
            try IUserProfile(IPlatform(platformContract).userProfileContract()).addTicket(msg.sender, tokenId, eventId) {} catch {}
            try IEventStatistics(IPlatform(platformContract).eventStatisticsContract()).incrementTicketsSold(eventId, 1) {} catch {}
            try IEventStatistics(IPlatform(platformContract).eventStatisticsContract()).updateRevenue(eventId, ticketPrice) {} catch {}
            try IEventOrganizer(IPlatform(platformContract).eventOrganizerContract()).incrementTicketsSold(organizer, 1) {} catch {}
            try INotificationSystem(IPlatform(platformContract).notificationSystemContract()).sendNotification(
                msg.sender,
                "Ticket Minted",
                string(abi.encodePacked("You successfully purchased a ticket for ", eventName)),
                "TICKET"
            ) {} catch {}
        }

        return tokenId;
    }

    /**
     * @notice Use/validate a ticket - UNIVERSAL EXECUTION COMPATIBLE
     * @dev Can be called from any chain via UEA
     */
    function useTicket(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "Only token owner can use ticket");
        require(!used[tokenId], "Ticket already used");
        require(block.timestamp <= eventDate, "Event has already ended");
        require(!eventCancelled, "Event has been cancelled");

        used[tokenId] = true;
        emit TicketUsed(msg.sender, tokenId);
        
        // Platform integration
        if (platformContract != address(0)) {
            try IUserProfile(IPlatform(platformContract).userProfileContract()).addEventAttended(msg.sender, eventId) {} catch {}
            try INotificationSystem(IPlatform(platformContract).notificationSystemContract()).sendNotification(
                msg.sender,
                "Ticket Used",
                string(abi.encodePacked("Your ticket for ", eventName, " has been validated")),
                "TICKET"
            ) {} catch {}
        }
    }

    // Admin functions (organizer only)
    modifier onlyOrganizer() {
        require(msg.sender == organizer || msg.sender == owner(), "Only organizer or owner");
        _;
    }

    function pauseEvent() external onlyOrganizer {
        require(!eventPaused, "Already paused");
        eventPaused = true;
        emit EventPaused();
    }

    function resumeEvent() external onlyOrganizer {
        require(eventPaused, "Not paused");
        eventPaused = false;
        emit EventResumed();
    }

    function cancelEvent() external onlyOrganizer {
        require(!eventCancelled, "Already cancelled");
        eventCancelled = true;
        refundsEnabled = true;
        emit EventCancelled();
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

    // Refund mechanism
    function claimRefund() external {
        require(refundsEnabled, "Refunds not enabled");
        require(!hasClaimedRefund[msg.sender], "Already claimed refund");
        require(block.timestamp <= refundDeadline, "Refund deadline passed");

        uint256 balance = balanceOf(msg.sender);
        require(balance > 0, "No tickets owned");

        uint256[] memory tokenIds = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(msg.sender, i);
            require(!used[tokenIds[i]], "Cannot refund used ticket");
        }

        uint256 refundAmount = balance * ticketPrice;
        require(address(this).balance >= refundAmount, "Insufficient contract balance");

        hasClaimedRefund[msg.sender] = true;
        totalRefundsClaimed += refundAmount;

        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Refund transfer failed");

        emit RefundClaimed(msg.sender, refundAmount, tokenIds);
    }

    // Organizer withdraws funds after event
    function withdrawFunds() external onlyOrganizer {
        require(!fundsWithdrawn, "Funds already withdrawn");
        require(block.timestamp > eventDate, "Event not ended yet");
        require(!refundsEnabled, "Cannot withdraw with refunds enabled");

        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        fundsWithdrawn = true;

        (bool success, ) = payable(organizer).call{value: balance}("");
        require(success, "Withdrawal failed");

        emit FundsWithdrawn(organizer, balance);
    }

    // View functions
    function getTicketsRemaining() public view returns (uint256) {
        return maxSupply - _tokenIdCounter;
    }

    function isTicketUsed(uint256 tokenId) public view returns (bool) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return used[tokenId];
    }

    function getEventInfo() public view returns (
        string memory name,
        uint256 date,
        string memory venue,
        uint256 price,
        uint256 remaining,
        bool cancelled,
        bool paused
    ) {
        return (
            eventName,
            eventDate,
            eventVenue,
            ticketPrice,
            getTicketsRemaining(),
            eventCancelled,
            eventPaused
        );
    }

    // Required overrides
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
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

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        if (bytes(metadataUri).length > 0) {
            return string(abi.encodePacked(metadataUri, Strings.toString(tokenId), ".json"));
        }
        
        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(
                    bytes(
                        string(
                            abi.encodePacked(
                                '{"name":"',
                                eventName,
                                " Ticket #",
                                Strings.toString(tokenId),
                                '","description":"Event ticket for ',
                                eventName,
                                '","image":"',
                                eventImageUri,
                                '"}'
                            )
                        )
                    )
                )
            )
        );
    }

    // EIP-2981 Royalty
    function royaltyInfo(uint256, uint256 salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        receiver = organizer;
        royaltyAmount = (salePrice * royaltyPercent) / 10000;
    }

    function setRoyaltyPercent(uint96 newPercent) external onlyOrganizer {
        require(newPercent <= 1000, "Royalty too high"); // Max 10%
        royaltyPercent = newPercent;
    }
}

// Base64 encoding library (inline for simplicity)
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

            for {} lt(dataPtr, endPtr) {}
            {
               dataPtr := add(dataPtr, 3)
               let input := mload(dataPtr)
               mstore(resultPtr, shl(248, mload(add(tablePtr, and(shr(18, input), 0x3F)))))
               resultPtr := add(resultPtr, 1)
               mstore(resultPtr, shl(248, mload(add(tablePtr, and(shr(12, input), 0x3F)))))
               resultPtr := add(resultPtr, 1)
               mstore(resultPtr, shl(248, mload(add(tablePtr, and(shr( 6, input), 0x3F)))))
               resultPtr := add(resultPtr, 1)
               mstore(resultPtr, shl(248, mload(add(tablePtr, and(        input,  0x3F)))))
               resultPtr := add(resultPtr, 1)
            }

            switch mod(mload(data), 3)
            case 1 { mstore(sub(resultPtr, 2), shl(240, 0x3d3d)) }
            case 2 { mstore(sub(resultPtr, 1), shl(248, 0x3d)) }
        }

        return result;
    }
}
