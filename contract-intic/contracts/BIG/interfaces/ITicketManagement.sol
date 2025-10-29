// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ITicketManagement {
    function validateTicket(
        uint256 tokenId,
        address ticketOwner,
        string memory locationUri,
        string memory locationHash
    ) external;
    
    function revokeValidation(uint256 tokenId) external;
    
    function getValidationStatus(uint256 tokenId, address validator) external view returns (
        bool isValidated,
        uint256 validationTime,
        string memory locationUri,
        string memory locationHash,
        bool isRevoked
    );
}
