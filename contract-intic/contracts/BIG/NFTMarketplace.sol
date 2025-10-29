// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/IPlatform.sol";
import "./interfaces/IUserProfile.sol";

/**
 * @title NFTMarketplace
 * @dev Marketplace for buying and selling event tickets (NFTs)
 * Supports fixed price listings, auctions, and offers
 * CRITICAL: All marketplace state and transactions on-chain for transparency
 */
contract NFTMarketplace is Ownable, ReentrancyGuard {
    address public platformContract;
    
    // Platform fee (in basis points, 250 = 2.5%)
    uint256 public platformFeeRate = 250; // 2.5%
    uint256 public constant MAX_PLATFORM_FEE = 1000; // 10% maximum
    
    // Counter for listings, auctions, and offers
    uint256 private _listingIdCounter;
    uint256 private _auctionIdCounter;
    uint256 private _offerIdCounter;
    
    // CRITICAL: Marketplace data structures on-chain
    struct Listing {
        address seller; // CRITICAL: On-chain for ownership
        address nftContract; // CRITICAL: On-chain for NFT verification
        uint256 tokenId; // CRITICAL: On-chain for NFT identification
        uint256 price; // CRITICAL: On-chain for transaction
        uint256 royaltyPercentage; // CRITICAL: On-chain for creator royalty (in basis points)
        address royaltyRecipient; // CRITICAL: On-chain for royalty distribution
        bool active; // CRITICAL: On-chain for listing status
        uint256 listedAt; // CRITICAL: On-chain for timestamp
    }
    
    struct Auction {
        address seller; // CRITICAL: On-chain for ownership
        address nftContract; // CRITICAL: On-chain for NFT verification
        uint256 tokenId; // CRITICAL: On-chain for NFT identification
        uint256 startPrice; // CRITICAL: On-chain for bidding
        uint256 currentBid; // CRITICAL: On-chain for bidding
        address currentBidder; // CRITICAL: On-chain for bidder tracking
        uint256 endTime; // CRITICAL: On-chain for auction logic
        uint256 royaltyPercentage; // CRITICAL: On-chain for creator royalty
        address royaltyRecipient; // CRITICAL: On-chain for royalty distribution
        bool active; // CRITICAL: On-chain for auction status
        bool ended; // CRITICAL: On-chain for auction completion
    }
    
    struct Offer {
        address buyer; // CRITICAL: On-chain for buyer identification
        address nftContract; // CRITICAL: On-chain for NFT verification
        uint256 tokenId; // CRITICAL: On-chain for NFT identification
        uint256 price; // CRITICAL: On-chain for offer amount
        uint256 expiresAt; // CRITICAL: On-chain for expiration
        bool active; // CRITICAL: On-chain for offer status
    }
    
    struct Sale {
        address seller; // CRITICAL: On-chain for transaction history
        address buyer; // CRITICAL: On-chain for transaction history
        address nftContract; // CRITICAL: On-chain for NFT tracking
        uint256 tokenId; // CRITICAL: On-chain for NFT tracking
        uint256 price; // CRITICAL: On-chain for financial tracking
        uint256 platformFee; // CRITICAL: On-chain for fee tracking
        uint256 royaltyFee; // CRITICAL: On-chain for royalty tracking
        uint256 timestamp; // CRITICAL: On-chain for audit trail
    }
    
    // CRITICAL: All mappings on-chain for marketplace state
    mapping(uint256 => Listing) public listings; // CRITICAL: On-chain listing data
    mapping(uint256 => Auction) public auctions; // CRITICAL: On-chain auction data
    mapping(uint256 => Offer) public offers; // CRITICAL: On-chain offer data
    mapping(uint256 => Sale) public sales; // CRITICAL: On-chain sale history
    
    // Track active listings per NFT
    mapping(address => mapping(uint256 => uint256)) public activeListingId; // nftContract => tokenId => listingId
    mapping(address => mapping(uint256 => uint256)) public activeAuctionId; // nftContract => tokenId => auctionId
    
    // Accumulated fees
    uint256 public accumulatedFees; // CRITICAL: On-chain for platform revenue
    
    // Statistics - CRITICAL: On-chain for analytics
    uint256 public totalListings;
    uint256 public totalSales;
    uint256 public totalVolume;
    
    // Events
    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 royaltyPercentage
    );
    
    event ListingCancelled(uint256 indexed listingId);
    
    event ListingSold(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 price,
        uint256 platformFee,
        uint256 royaltyFee
    );
    
    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 startPrice,
        uint256 endTime
    );
    
    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );
    
    event AuctionEnded(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 finalPrice
    );
    
    event OfferCreated(
        uint256 indexed offerId,
        address indexed buyer,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price
    );
    
    event OfferAccepted(
        uint256 indexed offerId,
        address indexed seller,
        uint256 price
    );
    
    event OfferCancelled(uint256 indexed offerId);
    
    event PlatformFeeUpdated(uint256 newFeeRate);
    
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
     * @dev List a ticket for fixed price sale
     * CRITICAL: All listing data stored on-chain
     */
    function listTicketForSale(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 royaltyPercentage,
        address royaltyRecipient
    ) external nonReentrant returns (uint256) {
        require(price > 0, "Price must be greater than 0");
        require(royaltyPercentage <= 2000, "Royalty cannot exceed 20%"); // Max 20%
        require(royaltyRecipient != address(0), "Invalid royalty recipient");
        
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the NFT owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) || 
            nft.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );
        
        // Check if already listed
        uint256 existingListingId = activeListingId[nftContract][tokenId];
        if (existingListingId > 0 && listings[existingListingId].active) {
            revert("NFT already listed");
        }
        
        _listingIdCounter++;
        uint256 listingId = _listingIdCounter;
        
        listings[listingId] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            royaltyPercentage: royaltyPercentage,
            royaltyRecipient: royaltyRecipient,
            active: true,
            listedAt: block.timestamp
        });
        
        activeListingId[nftContract][tokenId] = listingId;
        totalListings++;
        
        emit ListingCreated(
            listingId,
            msg.sender,
            nftContract,
            tokenId,
            price,
            royaltyPercentage
        );
        
        return listingId;
    }
    
    /**
     * @dev Cancel a listing
     * CRITICAL: Only seller can cancel
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");
        
        listing.active = false;
        activeListingId[listing.nftContract][listing.tokenId] = 0;
        
        emit ListingCancelled(listingId);
    }
    
    /**
     * @dev Buy a listed ticket
     * CRITICAL: Handles payment distribution on-chain
     */
    function buyListing(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(msg.value >= listing.price, "Insufficient payment");
        require(msg.sender != listing.seller, "Cannot buy your own listing");
        
        IERC721 nft = IERC721(listing.nftContract);
        require(nft.ownerOf(listing.tokenId) == listing.seller, "Seller no longer owns NFT");
        
        // Calculate fees - CRITICAL: On-chain fee calculation
        uint256 platformFee = (listing.price * platformFeeRate) / 10000;
        uint256 royaltyFee = (listing.price * listing.royaltyPercentage) / 10000;
        uint256 sellerProceeds = listing.price - platformFee - royaltyFee;
        
        // Transfer NFT to buyer
        nft.safeTransferFrom(listing.seller, msg.sender, listing.tokenId);
        
        // Distribute payments - CRITICAL: On-chain payment distribution
        if (platformFee > 0) {
            accumulatedFees += platformFee;
        }
        
        if (royaltyFee > 0) {
            payable(listing.royaltyRecipient).transfer(royaltyFee);
        }
        
        payable(listing.seller).transfer(sellerProceeds);
        
        // Refund excess payment
        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }
        
        // Record sale - CRITICAL: On-chain transaction history
        uint256 saleId = totalSales++;
        sales[saleId] = Sale({
            seller: listing.seller,
            buyer: msg.sender,
            nftContract: listing.nftContract,
            tokenId: listing.tokenId,
            price: listing.price,
            platformFee: platformFee,
            royaltyFee: royaltyFee,
            timestamp: block.timestamp
        });
        
        totalVolume += listing.price;
        
        // Deactivate listing
        listing.active = false;
        activeListingId[listing.nftContract][listing.tokenId] = 0;
        
        emit ListingSold(listingId, msg.sender, listing.price, platformFee, royaltyFee);
        
        // Platform integration - update user profiles for ticket transfer
        if (platformContract != address(0)) {
            // Add ticket to buyer's profile (eventId = 0 as we don't track events in marketplace)
            try IUserProfile(IPlatform(platformContract).userProfileContract()).addTicket(
                msg.sender,
                listing.tokenId,
                0
            ) {} catch {}
        }
    }
    
    /**
     * @dev Create an auction for a ticket
     * CRITICAL: Auction state on-chain
     */
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 startPrice,
        uint256 duration,
        uint256 royaltyPercentage,
        address royaltyRecipient
    ) external nonReentrant returns (uint256) {
        require(startPrice > 0, "Start price must be greater than 0");
        require(duration >= 1 hours && duration <= 30 days, "Invalid duration");
        require(royaltyPercentage <= 2000, "Royalty cannot exceed 20%");
        require(royaltyRecipient != address(0), "Invalid royalty recipient");
        
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the NFT owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) || 
            nft.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );
        
        // Check if already in auction
        uint256 existingAuctionId = activeAuctionId[nftContract][tokenId];
        if (existingAuctionId > 0 && auctions[existingAuctionId].active) {
            revert("NFT already in auction");
        }
        
        _auctionIdCounter++;
        uint256 auctionId = _auctionIdCounter;
        
        auctions[auctionId] = Auction({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            startPrice: startPrice,
            currentBid: 0,
            currentBidder: address(0),
            endTime: block.timestamp + duration,
            royaltyPercentage: royaltyPercentage,
            royaltyRecipient: royaltyRecipient,
            active: true,
            ended: false
        });
        
        activeAuctionId[nftContract][tokenId] = auctionId;
        
        emit AuctionCreated(auctionId, msg.sender, nftContract, tokenId, startPrice, block.timestamp + duration);
        
        return auctionId;
    }
    
    /**
     * @dev Place a bid on an auction
     * CRITICAL: Bid tracking on-chain
     */
    function placeBid(uint256 auctionId) external payable nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.active, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction has ended");
        require(msg.sender != auction.seller, "Seller cannot bid");
        
        uint256 minBid = auction.currentBid > 0 ? auction.currentBid + (auction.currentBid / 20) : auction.startPrice; // 5% increment
        require(msg.value >= minBid, "Bid too low");
        
        // Refund previous bidder
        if (auction.currentBidder != address(0)) {
            payable(auction.currentBidder).transfer(auction.currentBid);
        }
        
        auction.currentBid = msg.value;
        auction.currentBidder = msg.sender;
        
        emit BidPlaced(auctionId, msg.sender, msg.value);
    }
    
    /**
     * @dev End an auction and transfer NFT
     * CRITICAL: Auction settlement on-chain
     */
    function endAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.active, "Auction not active");
        require(block.timestamp >= auction.endTime, "Auction still ongoing");
        require(!auction.ended, "Auction already ended");
        
        auction.active = false;
        auction.ended = true;
        activeAuctionId[auction.nftContract][auction.tokenId] = 0;
        
        IERC721 nft = IERC721(auction.nftContract);
        
        // If there was a bid
        if (auction.currentBidder != address(0)) {
            require(nft.ownerOf(auction.tokenId) == auction.seller, "Seller no longer owns NFT");
            
            // Calculate fees
            uint256 platformFee = (auction.currentBid * platformFeeRate) / 10000;
            uint256 royaltyFee = (auction.currentBid * auction.royaltyPercentage) / 10000;
            uint256 sellerProceeds = auction.currentBid - platformFee - royaltyFee;
            
            // Transfer NFT to winner
            nft.safeTransferFrom(auction.seller, auction.currentBidder, auction.tokenId);
            
            // Distribute payments
            if (platformFee > 0) {
                accumulatedFees += platformFee;
            }
            
            if (royaltyFee > 0) {
                payable(auction.royaltyRecipient).transfer(royaltyFee);
            }
            
            payable(auction.seller).transfer(sellerProceeds);
            
            // Record sale
            uint256 saleId = totalSales++;
            sales[saleId] = Sale({
                seller: auction.seller,
                buyer: auction.currentBidder,
                nftContract: auction.nftContract,
                tokenId: auction.tokenId,
                price: auction.currentBid,
                platformFee: platformFee,
                royaltyFee: royaltyFee,
                timestamp: block.timestamp
            });
            
            totalVolume += auction.currentBid;
            
            emit AuctionEnded(auctionId, auction.currentBidder, auction.currentBid);
        } else {
            // No bids, auction ended without sale
            emit AuctionEnded(auctionId, address(0), 0);
        }
    }
    
    /**
     * @dev Make an offer for a ticket
     * CRITICAL: Offer data on-chain
     */
    function makeOffer(
        address nftContract,
        uint256 tokenId,
        uint256 duration
    ) external payable nonReentrant returns (uint256) {
        require(msg.value > 0, "Offer must be greater than 0");
        require(duration >= 1 hours && duration <= 30 days, "Invalid duration");
        
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) != msg.sender, "Cannot offer on your own NFT");
        
        _offerIdCounter++;
        uint256 offerId = _offerIdCounter;
        
        offers[offerId] = Offer({
            buyer: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: msg.value,
            expiresAt: block.timestamp + duration,
            active: true
        });
        
        emit OfferCreated(offerId, msg.sender, nftContract, tokenId, msg.value);
        
        return offerId;
    }
    
    /**
     * @dev Accept an offer
     * CRITICAL: Offer acceptance on-chain
     */
    function acceptOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.active, "Offer not active");
        require(block.timestamp < offer.expiresAt, "Offer has expired");
        
        IERC721 nft = IERC721(offer.nftContract);
        require(nft.ownerOf(offer.tokenId) == msg.sender, "Not the NFT owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) || 
            nft.getApproved(offer.tokenId) == address(this),
            "Marketplace not approved"
        );
        
        // Get royalty info (assume 5% default if not set)
        uint256 royaltyPercentage = 500; // 5%
        address royaltyRecipient = msg.sender; // Default to seller
        
        // Calculate fees
        uint256 platformFee = (offer.price * platformFeeRate) / 10000;
        uint256 royaltyFee = (offer.price * royaltyPercentage) / 10000;
        uint256 sellerProceeds = offer.price - platformFee - royaltyFee;
        
        // Transfer NFT to buyer
        nft.safeTransferFrom(msg.sender, offer.buyer, offer.tokenId);
        
        // Distribute payments
        if (platformFee > 0) {
            accumulatedFees += platformFee;
        }
        
        if (royaltyFee > 0) {
            payable(royaltyRecipient).transfer(royaltyFee);
        }
        
        payable(msg.sender).transfer(sellerProceeds);
        
        // Record sale
        uint256 saleId = totalSales++;
        sales[saleId] = Sale({
            seller: msg.sender,
            buyer: offer.buyer,
            nftContract: offer.nftContract,
            tokenId: offer.tokenId,
            price: offer.price,
            platformFee: platformFee,
            royaltyFee: royaltyFee,
            timestamp: block.timestamp
        });
        
        totalVolume += offer.price;
        
        // Deactivate offer
        offer.active = false;
        
        // Cancel any active listing or auction
        uint256 listingId = activeListingId[offer.nftContract][offer.tokenId];
        if (listingId > 0 && listings[listingId].active) {
            listings[listingId].active = false;
            activeListingId[offer.nftContract][offer.tokenId] = 0;
        }
        
        emit OfferAccepted(offerId, msg.sender, offer.price);
    }
    
    /**
     * @dev Cancel an offer and refund
     * CRITICAL: Refund on-chain
     */
    function cancelOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.active, "Offer not active");
        require(offer.buyer == msg.sender, "Not the offer creator");
        
        offer.active = false;
        
        // Refund the offer amount
        payable(msg.sender).transfer(offer.price);
        
        emit OfferCancelled(offerId);
    }
    
    /**
     * @dev Update platform fee rate
     * CRITICAL: Only owner can update
     */
    function setPlatformFeeRate(uint256 newFeeRate) external onlyOwner {
        require(newFeeRate <= MAX_PLATFORM_FEE, "Fee rate too high");
        platformFeeRate = newFeeRate;
        emit PlatformFeeUpdated(newFeeRate);
    }
    
    /**
     * @dev Withdraw accumulated platform fees
     * CRITICAL: Only owner can withdraw
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");
        
        accumulatedFees = 0;
        payable(owner()).transfer(amount);
    }
    
    /**
     * @dev Get listing details
     */
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }
    
    /**
     * @dev Get auction details
     */
    function getAuction(uint256 auctionId) external view returns (Auction memory) {
        return auctions[auctionId];
    }
    
    /**
     * @dev Get offer details
     */
    function getOffer(uint256 offerId) external view returns (Offer memory) {
        return offers[offerId];
    }
    
    /**
     * @dev Get sale details
     */
    function getSale(uint256 saleId) external view returns (Sale memory) {
        return sales[saleId];
    }
    
    /**
     * @dev Get marketplace statistics
     */
    function getMarketplaceStats() external view returns (
        uint256 totalListingsCount,
        uint256 totalSalesCount,
        uint256 totalVolumeAmount,
        uint256 accumulatedFeesAmount
    ) {
        return (totalListings, totalSales, totalVolume, accumulatedFees);
    }
    
    /**
     * @dev Required for receiving NFTs
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
