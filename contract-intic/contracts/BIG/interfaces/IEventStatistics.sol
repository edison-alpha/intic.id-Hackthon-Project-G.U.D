// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IEventStatistics {
    function initializeEventMetrics(uint256 eventId) external;
    function incrementTicketsSold(uint256 eventId, uint256 amount) external;
    function incrementValidations(uint256 eventId) external;
    function incrementRefunds(uint256 eventId) external;
    function updateRevenue(uint256 eventId, uint256 amount) external;
    function updateAverageRating(uint256 eventId, uint256 rating, uint256 reviewCount) external;
    function eventMetricsExists(uint256 eventId) external view returns (bool);
}
