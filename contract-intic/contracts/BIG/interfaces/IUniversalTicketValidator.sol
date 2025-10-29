// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IUniversalTicketValidator {
    function validateTicket(
        address eventContract,
        uint256 tokenId,
        address ticketOwner
    ) external returns (bool);
    
    function isAuthorizedValidator(address validator) external view returns (bool);
}
