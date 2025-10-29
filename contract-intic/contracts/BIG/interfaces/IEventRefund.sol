// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IEventRefund {
    function cancelEvent(
        address eventContract,
        uint256 eventId,
        uint256 ticketPrice,
        uint256 totalTicketsSold,
        uint256 refundDeadlineDays
    ) external;
    
    function isEventCancelled(address eventContract, uint256 eventId) external view returns (bool);
}
