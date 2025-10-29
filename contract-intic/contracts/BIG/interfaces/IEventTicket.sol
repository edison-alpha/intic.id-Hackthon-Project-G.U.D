// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IEventTicket {
    function mintTicket() external payable returns (uint256);
    function useTicket(uint256 tokenId) external;
    function cancelEvent() external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function isTicketUsed(uint256 tokenId) external view returns (bool);
    function eventCancelled() external view returns (bool);
    function ticketPrice() external view returns (uint256);
    function eventDate() external view returns (uint256);
    function eventId() external view returns (uint256);
    function organizer() external view returns (address);
}
