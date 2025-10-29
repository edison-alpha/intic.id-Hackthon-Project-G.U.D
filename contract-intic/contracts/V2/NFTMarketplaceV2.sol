// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

/**
 * @title NFTMarketplaceV2
 * @notice Universal secondary marketplace for event tickets (NFTs)
 * @dev Self-contained escrow-based marketplace - NO Platform dependency
 *
 * KEY IMPROVEMENTS FROM V1:
 * - ✅ Escrow model: NFT transferred to marketplace on listing
 * - ✅ No Platform contract dependency
 * - ✅ Batch operations (list/cancel multiple tickets)
 * - ✅ Offer system (buyers can make offers)
 * - ✅ EIP-2981 royalty enforcement
 * - ✅ Prevents listing of used tickets
 * - ✅ Secondary market analytics per event
 * - ✅ Seller statistics tracking
 *
 * ARCHITECTURE:
 * - Sellers list by transferring NFT into escrow (this contract)
 * - Buyers purchase with native currency
 * - Marketplace holds NFT until sale or cancellation
 * - Royalties paid to organizer (via EIP-2981)
 */
contract NFTMarketplaceV2 is Ownable, ReentrancyGuard {
    // ========= Data Structures =========

    /// @notice Listing information for a token
    struct Listing {
        uint256 listingId;
        uint256 tokenId;
        address nftContract;
        address seller;
        uint256 price; // Native currency
        bool active;
        uint256 createdAt;
    }

    /// @notice Offer information for a token
    struct Offer {
        uint256 offerId;
        uint256 tokenId;
        address nftContract;
        address offerer;
        uint256 offerAmount;
        uint256 expiresAt;
        bool active;
        uint256 createdAt;
    }

    /// @notice Seller statistics per event
    struct SellerStats {
        uint256 totalListed; // Total tickets ever listed
        uint256 currentlyListed; // Currently active listings
        uint256 totalSold; // Total tickets sold
        uint256 totalRevenue; // Total revenue (before royalties/fees)
        uint256 totalRoyaltiesPaid; // Total royalties paid to organizer
        uint256 totalCanceled; // Total listings canceled
        uint256 firstListingTime; // Timestamp of first listing
        uint256 lastActivityTime; // Timestamp of last activity
    }

    // ========= Storage =========

    /// @notice Platform fee rate in basis points (250 = 2.5%)
    uint256 public platformFeeRate = 250;
    uint256 public constant MAX_PLATFORM_FEE = 1000; // 10% max

    /// @notice Listing counter
    uint256 public listingCounter;

    /// @notice Offer counter
    uint256 public offerCounter;

    /// @notice Listing ID => Listing
    mapping(uint256 => Listing) public listings;

    /// @notice nftContract => tokenId => listingId (0 if not listed)
    mapping(address => mapping(uint256 => uint256)) public tokenToListing;

    /// @notice Offer ID => Offer
    mapping(uint256 => Offer) public offers;

    /// @notice nftContract => tokenId => array of offer IDs
    mapping(address => mapping(uint256 => uint256[])) public tokenOffers;

    /// @notice Track secondary sales per event (eventId => count)
    mapping(uint256 => uint256) public eventSecondarySales;

    /// @notice Track royalties collected per event (eventId => amount)
    mapping(uint256 => uint256) public eventRoyaltiesCollected;

    /// @notice Seller stats: seller => nftContract => SellerStats
    mapping(address => mapping(address => SellerStats)) public sellerStats;

    /// @notice Seller listings: seller => nftContract => listingIds[]
    mapping(address => mapping(address => uint256[])) public sellerListings;

    /// @notice Accumulated platform fees
    uint256 public accumulatedFees;

    /// @notice Total marketplace statistics
    uint256 public totalListings;
    uint256 public totalSales;
    uint256 public totalVolume;

    // ========= Custom Errors =========

    error InvalidInput();
    error NotSeller();
    error NotActive();
    error AlreadyListed();
    error NotListed();
    error TransferFailed();
    error UsedTicket();
    error NotOfferer();
    error OfferExpired();
    error ArrayLengthMismatch();
    error InsufficientPayment();
    error CannotBuyOwnListing();
    error NotTokenOwner();

    // ========= Events =========

    event TicketListed(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed nftContract,
        address seller,
        uint256 price
    );
    event ListingCanceled(uint256 indexed listingId, uint256 indexed tokenId, address indexed nftContract);
    event PriceUpdated(uint256 indexed listingId, uint256 oldPrice, uint256 newPrice);
    event TicketPurchased(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed nftContract,
        address seller,
        address buyer,
        uint256 price,
        address royaltyReceiver,
        uint256 royaltyAmount,
        uint256 platformFee
    );
    event BatchListingCompleted(uint256[] listingIds, uint256[] tokenIds);
    event BatchDelistingCompleted(uint256[] listingIds);
    event OfferMade(
        uint256 indexed offerId,
        uint256 indexed tokenId,
        address indexed nftContract,
        address offerer,
        uint256 amount,
        uint256 expiresAt
    );
    event OfferAccepted(
        uint256 indexed offerId,
        uint256 indexed tokenId,
        address indexed nftContract,
        address seller,
        address offerer,
        uint256 amount
    );
    event OfferCanceled(uint256 indexed offerId, uint256 indexed tokenId, address indexed nftContract);
    event PlatformFeeUpdated(uint256 newFeeRate);

    // ========= Constructor =========

    constructor() Ownable(msg.sender) {}

    // ========= Core Listing Functions =========

    /**
     * @notice List a ticket for sale by transferring it into escrow
     * @param nftContract NFT contract address
     * @param tokenId Token ID to list
     * @param price Sale price in native currency
     * @return listingId Newly created listing ID
     */
    function listTicket(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant returns (uint256 listingId) {
        if (price == 0) revert InvalidInput();
        if (tokenToListing[nftContract][tokenId] != 0) revert AlreadyListed();

        IERC721 nft = IERC721(nftContract);

        // Must be owner
        if (nft.ownerOf(tokenId) != msg.sender) revert NotTokenOwner();

        // Check if ticket is used (if contract supports it)
        try this._isTicketUsed(nftContract, tokenId) returns (bool isUsed) {
            if (isUsed) revert UsedTicket();
        } catch {
            // If check fails, allow listing (contract may not have used() function)
        }

        // Transfer into escrow (requires prior approval from owner)
        nft.transferFrom(msg.sender, address(this), tokenId);

        listingId = ++listingCounter;

        listings[listingId] = Listing({
            listingId: listingId,
            tokenId: tokenId,
            nftContract: nftContract,
            seller: msg.sender,
            price: price,
            active: true,
            createdAt: block.timestamp
        });

        tokenToListing[nftContract][tokenId] = listingId;
        totalListings++;

        // Update seller stats
        SellerStats storage stats = sellerStats[msg.sender][nftContract];
        if (stats.firstListingTime == 0) {
            stats.firstListingTime = block.timestamp;
        }
        stats.totalListed += 1;
        stats.currentlyListed += 1;
        stats.lastActivityTime = block.timestamp;

        sellerListings[msg.sender][nftContract].push(listingId);

        emit TicketListed(listingId, tokenId, nftContract, msg.sender, price);
    }

    /**
     * @notice Cancel an active listing and return the ticket to seller
     * @param listingId Listing ID
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage lst = listings[listingId];
        if (lst.listingId == 0) revert NotListed();
        if (!lst.active) revert NotActive();
        if (lst.seller != msg.sender) revert NotSeller();

        lst.active = false;
        tokenToListing[lst.nftContract][lst.tokenId] = 0;

        // Update seller stats
        SellerStats storage stats = sellerStats[msg.sender][lst.nftContract];
        stats.currentlyListed -= 1;
        stats.totalCanceled += 1;
        stats.lastActivityTime = block.timestamp;

        // Return NFT to seller
        IERC721(lst.nftContract).transferFrom(address(this), lst.seller, lst.tokenId);

        emit ListingCanceled(listingId, lst.tokenId, lst.nftContract);
    }

    /**
     * @notice Update price for an active listing
     * @param listingId Listing ID
     * @param newPrice New price in native currency
     */
    function updatePrice(uint256 listingId, uint256 newPrice) external {
        if (newPrice == 0) revert InvalidInput();
        Listing storage lst = listings[listingId];
        if (lst.listingId == 0) revert NotListed();
        if (!lst.active) revert NotActive();
        if (lst.seller != msg.sender) revert NotSeller();

        uint256 old = lst.price;
        lst.price = newPrice;

        emit PriceUpdated(listingId, old, newPrice);
    }

    /**
     * @notice Buy a listed ticket
     * @dev Pays royalties (EIP-2981) first, then platform fee, then seller
     * @param listingId Listing ID
     */
    function buyTicket(uint256 listingId) external payable nonReentrant {
        Listing storage lst = listings[listingId];
        if (lst.listingId == 0) revert NotListed();
        if (!lst.active) revert NotActive();
        if (msg.value != lst.price) revert InsufficientPayment();
        if (msg.sender == lst.seller) revert CannotBuyOwnListing();

        // Calculate platform fee
        uint256 platformFee = (lst.price * platformFeeRate) / 10000;

        // Get royalty info (EIP-2981)
        (address royaltyReceiver, uint256 royaltyAmount) = _getRoyaltyInfo(
            lst.nftContract,
            lst.tokenId,
            lst.price
        );

        uint256 sellerAmount = lst.price;

        // Pay royalty if applicable
        if (royaltyReceiver != address(0) && royaltyAmount > 0 && royaltyAmount <= lst.price) {
            sellerAmount -= royaltyAmount;
            (bool okR, ) = payable(royaltyReceiver).call{value: royaltyAmount}("");
            if (!okR) revert TransferFailed();

            // Track royalty (try to get eventId if available)
            try this._getEventId(lst.nftContract) returns (uint256 eventId) {
                eventRoyaltiesCollected[eventId] += royaltyAmount;
            } catch {}
        }

        // Deduct platform fee
        if (platformFee > 0) {
            sellerAmount -= platformFee;
            accumulatedFees += platformFee;
        }

        // Pay seller
        (bool okS, ) = payable(lst.seller).call{value: sellerAmount}("");
        if (!okS) revert TransferFailed();

        // Transfer NFT from escrow to buyer
        IERC721(lst.nftContract).transferFrom(address(this), msg.sender, lst.tokenId);

        // Track secondary sale
        try this._getEventId(lst.nftContract) returns (uint256 eventId) {
            eventSecondarySales[eventId] += 1;
        } catch {}

        // Update seller stats
        SellerStats storage stats = sellerStats[lst.seller][lst.nftContract];
        stats.currentlyListed -= 1;
        stats.totalSold += 1;
        stats.totalRevenue += lst.price;
        stats.totalRoyaltiesPaid += royaltyAmount;
        stats.lastActivityTime = block.timestamp;

        // Update global stats
        totalSales++;
        totalVolume += lst.price;

        // Close listing
        lst.active = false;
        tokenToListing[lst.nftContract][lst.tokenId] = 0;

        emit TicketPurchased(
            listingId,
            lst.tokenId,
            lst.nftContract,
            lst.seller,
            msg.sender,
            lst.price,
            royaltyReceiver,
            royaltyAmount,
            platformFee
        );
    }

    // ========= Batch Operations =========

    /**
     * @notice List multiple tickets in a single transaction
     * @param nftContract NFT contract address
     * @param tokenIds Array of token IDs to list
     * @param prices Array of prices (must match tokenIds length)
     * @return listingIds Array of newly created listing IDs
     */
    function batchListTickets(
        address nftContract,
        uint256[] calldata tokenIds,
        uint256[] calldata prices
    ) external nonReentrant returns (uint256[] memory listingIds) {
        uint256 length = tokenIds.length;
        if (length == 0 || length != prices.length) revert ArrayLengthMismatch();

        listingIds = new uint256[](length);
        IERC721 nft = IERC721(nftContract);

        for (uint256 i = 0; i < length; ) {
            uint256 tokenId = tokenIds[i];
            uint256 price = prices[i];

            if (price == 0) revert InvalidInput();
            if (tokenToListing[nftContract][tokenId] != 0) revert AlreadyListed();
            if (nft.ownerOf(tokenId) != msg.sender) revert NotTokenOwner();

            // Check if used
            try this._isTicketUsed(nftContract, tokenId) returns (bool isUsed) {
                if (isUsed) revert UsedTicket();
            } catch {}

            // Transfer into escrow
            nft.transferFrom(msg.sender, address(this), tokenId);

            uint256 listingId = ++listingCounter;

            listings[listingId] = Listing({
                listingId: listingId,
                tokenId: tokenId,
                nftContract: nftContract,
                seller: msg.sender,
                price: price,
                active: true,
                createdAt: block.timestamp
            });

            tokenToListing[nftContract][tokenId] = listingId;
            listingIds[i] = listingId;
            totalListings++;

            // Update seller stats
            SellerStats storage stats = sellerStats[msg.sender][nftContract];
            if (stats.firstListingTime == 0) {
                stats.firstListingTime = block.timestamp;
            }
            stats.totalListed += 1;
            stats.currentlyListed += 1;
            stats.lastActivityTime = block.timestamp;

            sellerListings[msg.sender][nftContract].push(listingId);

            emit TicketListed(listingId, tokenId, nftContract, msg.sender, price);

            unchecked {
                ++i;
            }
        }

        emit BatchListingCompleted(listingIds, tokenIds);
    }

    /**
     * @notice Cancel multiple listings in a single transaction
     * @param listingIds Array of listing IDs to cancel
     */
    function batchCancelListings(uint256[] calldata listingIds) external nonReentrant {
        uint256 length = listingIds.length;
        if (length == 0) revert InvalidInput();

        for (uint256 i = 0; i < length; ) {
            uint256 listingId = listingIds[i];
            Listing storage lst = listings[listingId];

            if (lst.listingId == 0) revert NotListed();
            if (!lst.active) revert NotActive();
            if (lst.seller != msg.sender) revert NotSeller();

            lst.active = false;
            tokenToListing[lst.nftContract][lst.tokenId] = 0;

            // Update seller stats
            SellerStats storage stats = sellerStats[msg.sender][lst.nftContract];
            stats.currentlyListed -= 1;
            stats.totalCanceled += 1;
            stats.lastActivityTime = block.timestamp;

            // Return NFT to seller
            IERC721(lst.nftContract).transferFrom(address(this), lst.seller, lst.tokenId);

            emit ListingCanceled(listingId, lst.tokenId, lst.nftContract);

            unchecked {
                ++i;
            }
        }

        emit BatchDelistingCompleted(listingIds);
    }

    // ========= Offer System =========

    /**
     * @notice Make an offer on a ticket
     * @param nftContract NFT contract address
     * @param tokenId Token ID to make offer on
     * @param expiresAt Unix timestamp when offer expires (0 for no expiration)
     * @return offerId Newly created offer ID
     */
    function makeOffer(
        address nftContract,
        uint256 tokenId,
        uint256 expiresAt
    ) external payable nonReentrant returns (uint256 offerId) {
        if (msg.value == 0) revert InvalidInput();
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert OfferExpired();

        // Token must exist
        IERC721(nftContract).ownerOf(tokenId); // Reverts if doesn't exist

        // Check if used
        try this._isTicketUsed(nftContract, tokenId) returns (bool isUsed) {
            if (isUsed) revert UsedTicket();
        } catch {}

        offerId = ++offerCounter;

        offers[offerId] = Offer({
            offerId: offerId,
            tokenId: tokenId,
            nftContract: nftContract,
            offerer: msg.sender,
            offerAmount: msg.value,
            expiresAt: expiresAt,
            active: true,
            createdAt: block.timestamp
        });

        tokenOffers[nftContract][tokenId].push(offerId);

        emit OfferMade(offerId, tokenId, nftContract, msg.sender, msg.value, expiresAt);
    }

    /**
     * @notice Accept an offer and sell the ticket
     * @param offerId Offer ID to accept
     */
    function acceptOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];

        if (offer.offerId == 0) revert InvalidInput();
        if (!offer.active) revert NotActive();
        if (offer.expiresAt != 0 && offer.expiresAt <= block.timestamp) revert OfferExpired();

        uint256 tokenId = offer.tokenId;
        address nftContract = offer.nftContract;
        IERC721 nft = IERC721(nftContract);
        address owner = nft.ownerOf(tokenId);

        // Must be token owner
        if (owner != msg.sender) revert NotTokenOwner();

        // Check if used
        try this._isTicketUsed(nftContract, tokenId) returns (bool isUsed) {
            if (isUsed) revert UsedTicket();
        } catch {}

        // If listed, cancel the listing
        uint256 listingId = tokenToListing[nftContract][tokenId];
        if (listingId != 0 && listings[listingId].active) {
            listings[listingId].active = false;
            tokenToListing[nftContract][tokenId] = 0;

            // Update seller stats for canceled listing
            SellerStats storage statsCancel = sellerStats[msg.sender][nftContract];
            statsCancel.currentlyListed -= 1;
            statsCancel.totalCanceled += 1;
        }

        // Calculate fees
        uint256 platformFee = (offer.offerAmount * platformFeeRate) / 10000;
        (address royaltyReceiver, uint256 royaltyAmount) = _getRoyaltyInfo(
            nftContract,
            tokenId,
            offer.offerAmount
        );

        uint256 sellerAmount = offer.offerAmount;

        // Pay royalty
        if (royaltyReceiver != address(0) && royaltyAmount > 0 && royaltyAmount <= offer.offerAmount) {
            sellerAmount -= royaltyAmount;
            (bool okR, ) = payable(royaltyReceiver).call{value: royaltyAmount}("");
            if (!okR) revert TransferFailed();

            try this._getEventId(nftContract) returns (uint256 eventId) {
                eventRoyaltiesCollected[eventId] += royaltyAmount;
            } catch {}
        }

        // Deduct platform fee
        if (platformFee > 0) {
            sellerAmount -= platformFee;
            accumulatedFees += platformFee;
        }

        // Pay seller
        (bool okS, ) = payable(msg.sender).call{value: sellerAmount}("");
        if (!okS) revert TransferFailed();

        // Transfer NFT to offerer
        nft.transferFrom(msg.sender, offer.offerer, tokenId);

        // Track secondary sale
        try this._getEventId(nftContract) returns (uint256 eventId) {
            eventSecondarySales[eventId] += 1;
        } catch {}

        // Update seller stats
        SellerStats storage stats = sellerStats[msg.sender][nftContract];
        stats.totalSold += 1;
        stats.totalRevenue += offer.offerAmount;
        stats.totalRoyaltiesPaid += royaltyAmount;
        stats.lastActivityTime = block.timestamp;

        // Update global stats
        totalSales++;
        totalVolume += offer.offerAmount;

        // Close offer
        offer.active = false;

        emit OfferAccepted(offerId, tokenId, nftContract, msg.sender, offer.offerer, offer.offerAmount);
    }

    /**
     * @notice Cancel an offer and refund the offerer
     * @param offerId Offer ID to cancel
     */
    function cancelOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];

        if (offer.offerId == 0) revert InvalidInput();
        if (!offer.active) revert NotActive();
        if (offer.offerer != msg.sender) revert NotOfferer();

        offer.active = false;

        // Refund offerer
        (bool ok, ) = payable(msg.sender).call{value: offer.offerAmount}("");
        if (!ok) revert TransferFailed();

        emit OfferCanceled(offerId, offer.tokenId, offer.nftContract);
    }

    // ========= Admin Functions =========

    /**
     * @notice Update platform fee rate (owner only)
     * @param newFeeRate New fee rate in basis points
     */
    function setPlatformFeeRate(uint256 newFeeRate) external onlyOwner {
        require(newFeeRate <= MAX_PLATFORM_FEE, "Fee rate too high");
        platformFeeRate = newFeeRate;
        emit PlatformFeeUpdated(newFeeRate);
    }

    /**
     * @notice Withdraw accumulated platform fees (owner only)
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");

        accumulatedFees = 0;
        payable(owner()).transfer(amount);
    }

    // ========= View Functions =========

    /**
     * @notice Get all active listings
     */
    function getActiveListings() external view returns (Listing[] memory results) {
        uint256 count;
        for (uint256 i = 1; i <= listingCounter; i++) {
            if (listings[i].active) {
                unchecked {
                    ++count;
                }
            }
        }

        results = new Listing[](count);
        uint256 idx;
        for (uint256 i = 1; i <= listingCounter; i++) {
            if (listings[i].active) {
                results[idx] = listings[i];
                unchecked {
                    ++idx;
                }
            }
        }
    }

    /**
     * @notice Get active offers for a token
     */
    function getActiveOffers(address nftContract, uint256 tokenId)
        external
        view
        returns (Offer[] memory activeOffers)
    {
        uint256[] memory offerIds = tokenOffers[nftContract][tokenId];
        uint256 count = 0;

        for (uint256 i = 0; i < offerIds.length; i++) {
            if (
                offers[offerIds[i]].active &&
                (offers[offerIds[i]].expiresAt == 0 || offers[offerIds[i]].expiresAt > block.timestamp)
            ) {
                count++;
            }
        }

        activeOffers = new Offer[](count);
        uint256 idx = 0;

        for (uint256 i = 0; i < offerIds.length; i++) {
            Offer memory offer = offers[offerIds[i]];
            if (offer.active && (offer.expiresAt == 0 || offer.expiresAt > block.timestamp)) {
                activeOffers[idx++] = offer;
            }
        }
    }

    /**
     * @notice Get seller statistics
     */
    function getSellerStats(address seller, address nftContract)
        external
        view
        returns (SellerStats memory)
    {
        return sellerStats[seller][nftContract];
    }

    /**
     * @notice Get marketplace statistics
     */
    function getMarketplaceStats()
        external
        view
        returns (
            uint256 totalListingsCount,
            uint256 totalSalesCount,
            uint256 totalVolumeAmount,
            uint256 accumulatedFeesAmount
        )
    {
        return (totalListings, totalSales, totalVolume, accumulatedFees);
    }

    /**
     * @notice Get secondary market stats for an event
     */
    function getEventSecondaryMarketStats(uint256 eventId)
        external
        view
        returns (uint256 salesCount, uint256 royaltiesCollected)
    {
        return (eventSecondarySales[eventId], eventRoyaltiesCollected[eventId]);
    }

    // ========= Internal Helpers =========

    /**
     * @notice Get royalty info (EIP-2981)
     */
    function _getRoyaltyInfo(
        address nftContract,
        uint256 tokenId,
        uint256 salePrice
    ) internal view returns (address receiver, uint256 royaltyAmount) {
        try IERC2981(nftContract).royaltyInfo(tokenId, salePrice) returns (
            address _receiver,
            uint256 _royaltyAmount
        ) {
            return (_receiver, _royaltyAmount);
        } catch {
            return (address(0), 0);
        }
    }

    // ========= External View Helpers (for try-catch) =========

    /**
     * @notice Check if ticket is used (external for try-catch)
     */
    function _isTicketUsed(address nftContract, uint256 tokenId) external view returns (bool) {
        // Try to call used() function on ticket contract
        (bool success, bytes memory data) = nftContract.staticcall(
            abi.encodeWithSignature("used(uint256)", tokenId)
        );
        if (success && data.length > 0) {
            return abi.decode(data, (bool));
        }
        return false;
    }

    /**
     * @notice Get event ID from ticket contract (external for try-catch)
     */
    function _getEventId(address nftContract) external view returns (uint256) {
        (bool success, bytes memory data) = nftContract.staticcall(abi.encodeWithSignature("eventId()"));
        if (success && data.length > 0) {
            return abi.decode(data, (uint256));
        }
        return 0;
    }

    // ========= Required for receiving NFTs =========

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    // ========= Receive / Fallback =========

    receive() external payable {}

    fallback() external payable {}
}
