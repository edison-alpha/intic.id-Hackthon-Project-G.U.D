// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IUserProfile {
    function createProfile(address user, string memory profileUri, string memory contentHash) external;
    function profileExists(address user) external view returns (bool);
    function addTicket(address user, uint256 ticketId, uint256 eventId) external;
    function addEventAttended(address user, uint256 eventId) external;
    function updateRating(address user, uint256 rating) external;
    function markEventReviewed(address user, uint256 eventId) external;
    function hasReviewedEvent(address user, uint256 eventId) external view returns (bool);
}
