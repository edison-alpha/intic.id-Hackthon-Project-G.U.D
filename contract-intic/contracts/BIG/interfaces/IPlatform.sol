// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IPlatform {
    function getContractAddress(string memory name) external view returns (address);
    function hasPermission(string memory contractName, address caller) external view returns (bool);
    function isAuthorizedContract(address contractAddr) external view returns (bool);
    function eventOrganizerContract() external view returns (address);
    function universalValidatorContract() external view returns (address);
    function userProfileContract() external view returns (address);
    function eventReviewContract() external view returns (address);
    function notificationSystemContract() external view returns (address);
    function eventStatisticsContract() external view returns (address);
    function ticketManagementContract() external view returns (address);
    function nftMarketplaceContract() external view returns (address);
    function eventRefundContract() external view returns (address);
}
