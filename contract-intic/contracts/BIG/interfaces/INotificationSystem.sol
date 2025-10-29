// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface INotificationSystem {
    function sendNotification(
        address user,
        string memory title,
        string memory message,
        string memory category
    ) external;
    
    function sendBulkNotification(
        address[] memory users,
        string memory title,
        string memory message,
        string memory category
    ) external;
}
