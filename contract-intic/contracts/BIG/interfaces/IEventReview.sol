// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IEventReview {
    function createReview(
        uint256 eventId,
        uint256 rating,
        string memory reviewUri,
        string memory contentHash
    ) external;
    
    function getEventStats(uint256 eventId) external view returns (
        uint256 totalReviews,
        uint256 averageRating,
        uint256 totalRatingSum
    );
}
