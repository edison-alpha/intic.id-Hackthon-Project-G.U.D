// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface INFTMarketplace {
    function listTicketForSale(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        string memory listingUri
    ) external returns (uint256);
    
    function buyTicket(uint256 listingId) external payable;
    function cancelListing(uint256 listingId) external;
}
