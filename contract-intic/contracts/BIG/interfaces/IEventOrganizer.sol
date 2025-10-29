// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IEventOrganizer {
    function isVerifiedOrganizer(address organizer) external view returns (bool);
    function organizerExists(address organizer) external view returns (bool);
    function incrementTicketsSold(address organizer, uint256 amount) external;
    function updateOrganizerRating(address organizer, uint256 rating) external;
    function getOrganizerPayoutAddress(address organizer) external view returns (address);
    function recordEventCreation(address eventContract, address creator, uint256 eventId) external;
}
