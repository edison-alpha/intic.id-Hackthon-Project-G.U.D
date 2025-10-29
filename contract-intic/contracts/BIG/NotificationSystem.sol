// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPlatform.sol";

/**
 * @title NotificationSystem
 * @dev Contract for managing notifications with PUSHCHAIN integration
 * CRITICAL: Notification records on-chain for audit trail
 */
contract NotificationSystem is Ownable {
    address public platformContract;
    struct Notification {
        address recipient; // CRITICAL: On-chain for delivery
        string notificationUri; // IPFS URI with full notification content (off-chain)
        string contentHash; // Hash of notification content for verification
        uint256 timestamp; // CRITICAL: On-chain for ordering and audit
        string category; // CRITICAL: On-chain for filtering (e.g., "ticket", "event", "payment", "validation")
        bool read; // CRITICAL: On-chain for user experience
        bool sent; // CRITICAL: On-chain for delivery tracking
    }

    mapping(address => Notification[]) public userNotifications; // CRITICAL: On-chain for user access
    mapping(address => uint256) public unreadCount; // CRITICAL: On-chain for UX
    address[] public notifiableUsers; // CRITICAL: On-chain for platform metrics

    // PUSH Protocol integration
    address public pushServiceProvider; // CRITICAL: On-chain for integration
    bool public pushIntegrationEnabled; // CRITICAL: On-chain for feature flag

    event NotificationSent(address indexed recipient, string category, string notificationUri);
    event PushServiceProviderUpdated(address indexed serviceProvider);
    event PushIntegrationToggled(bool enabled);
    
    modifier onlyPlatformOrOwner() {
        require(
            msg.sender == platformContract || 
            msg.sender == owner() || 
            (platformContract != address(0) && IPlatform(platformContract).isAuthorizedContract(msg.sender)),
            "Not authorized"
        );
        _;
    }

    constructor() Ownable(msg.sender) {
        pushIntegrationEnabled = true; // Enable by default
    }
    
    /**
     * @dev Set platform contract address
     */
    function setPlatformContract(address _platform) external onlyOwner {
        require(_platform != address(0), "Invalid platform address");
        platformContract = _platform;
    }
    
    /**
     * @dev Send notification (simplified for contract calls)
     */
    function sendNotification(
        address user,
        string memory title,
        string memory message,
        string memory category
    ) public onlyPlatformOrOwner {
        // Store notification using existing structure
        Notification memory notification = Notification({
            recipient: user,
            notificationUri: message, // Use message as URI placeholder
            contentHash: title, // Use title as hash placeholder
            timestamp: block.timestamp,
            category: category,
            read: false,
            sent: true
        });

        userNotifications[user].push(notification);
        unreadCount[user]++;

        // Track unique users
        bool userExists = false;
        for (uint i = 0; i < notifiableUsers.length; i++) {
            if (notifiableUsers[i] == user) {
                userExists = true;
                break;
            }
        }
        if (!userExists) {
            notifiableUsers.push(user);
        }

        emit NotificationSent(user, category, message);
    }
    
    /**
     * @dev Send bulk notifications
     */
    function sendBulkNotification(
        address[] memory users,
        string memory title,
        string memory message,
        string memory category
    ) external onlyPlatformOrOwner {
        for (uint256 i = 0; i < users.length; i++) {
            sendNotification(users[i], title, message, category);
        }
    }

    /**
     * @dev Send a notification trigger - CRITICAL: State on-chain for UX
     */
    function triggerNotification(
        address recipient,
        string memory notificationUri,
        string memory contentHash,
        string memory category
    ) public onlyOwner {
        require(recipient != address(0), "Invalid recipient address"); // CRITICAL: On-chain validation
        require(bytes(notificationUri).length > 0, "Notification URI cannot be empty");

        Notification memory notification = Notification({
            recipient: recipient, // CRITICAL: On-chain for delivery
            notificationUri: notificationUri,
            contentHash: contentHash,
            timestamp: block.timestamp, // CRITICAL: On-chain for ordering
            category: category, // CRITICAL: On-chain for filtering
            read: false, // CRITICAL: On-chain for UX
            sent: false // CRITICAL: On-chain for tracking
        });

        userNotifications[recipient].push(notification); // CRITICAL: On-chain for user access
        unreadCount[recipient]++; // CRITICAL: On-chain for UX

        // Track unique users for notifications - CRITICAL: On-chain for metrics
        bool userExists = false;
        for (uint i = 0; i < notifiableUsers.length; i++) {
            if (notifiableUsers[i] == recipient) { // CRITICAL: On-chain check
                userExists = true;
                break;
            }
        }
        if (!userExists) {
            notifiableUsers.push(recipient); // CRITICAL: On-chain for metrics
        }

        // If PUSH integration is enabled, trigger PUSH Protocol delivery
        if (pushIntegrationEnabled && pushServiceProvider != address(0)) {
            _triggerPushProtocol(recipient, notificationUri, category);
        }

        emit NotificationSent(recipient, category, notificationUri);
    }

    /**
     * @dev Trigger bulk notifications - CRITICAL: State on-chain for UX
     */
    function triggerBulkNotification(
        address[] memory recipients,
        string memory notificationUri,
        string memory contentHash,
        string memory category
    ) public onlyOwner {
        for (uint i = 0; i < recipients.length; i++) {
            Notification memory notification = Notification({
                recipient: recipients[i], // CRITICAL: On-chain for delivery
                notificationUri: notificationUri,
                contentHash: contentHash,
                timestamp: block.timestamp, // CRITICAL: On-chain for ordering
                category: category, // CRITICAL: On-chain for filtering
                read: false, // CRITICAL: On-chain for UX
                sent: false // CRITICAL: On-chain for tracking
            });

            userNotifications[recipients[i]].push(notification); // CRITICAL: On-chain for user access
            unreadCount[recipients[i]]++; // CRITICAL: On-chain for UX

            // Track unique users if not already tracked - CRITICAL: On-chain for metrics
            bool userExists = false;
            for (uint j = 0; j < notifiableUsers.length; j++) {
                if (notifiableUsers[j] == recipients[i]) { // CRITICAL: On-chain check
                    userExists = true;
                    break;
                }
            }
            if (!userExists) {
                notifiableUsers.push(recipients[i]); // CRITICAL: On-chain for metrics
            }

            // Trigger PUSH Protocol for each recipient
            if (pushIntegrationEnabled && pushServiceProvider != address(0)) {
                _triggerPushProtocol(recipients[i], notificationUri, category);
            }

            emit NotificationSent(recipients[i], category, notificationUri);
        }
    }

    /**
     * @dev Mark a notification as read - CRITICAL: State on-chain for UX
     */
    function markAsRead(uint256 notificationIndex) public {
        Notification[] storage notifications = userNotifications[msg.sender]; // CRITICAL: On-chain access
        require(notificationIndex < notifications.length, "Invalid notification index"); // CRITICAL: On-chain validation
        require(!notifications[notificationIndex].read, "Notification already marked as read"); // CRITICAL: On-chain check

        notifications[notificationIndex].read = true; // CRITICAL: On-chain state update
        if (unreadCount[msg.sender] > 0) {
            unreadCount[msg.sender]--; // CRITICAL: On-chain UX metric
        }
    }

    /**
     * @dev Mark all notifications as read - CRITICAL: State on-chain for UX
     */
    function markAllAsRead() public {
        Notification[] storage notifications = userNotifications[msg.sender]; // CRITICAL: On-chain access
        uint256 count = 0;

        for (uint i = 0; i < notifications.length; i++) {
            if (!notifications[i].read) { // CRITICAL: On-chain check
                notifications[i].read = true; // CRITICAL: On-chain state update
                count++;
            }
        }

        if (count > 0) {
            if (unreadCount[msg.sender] >= count) {
                unreadCount[msg.sender] -= count; // CRITICAL: On-chain UX metric
            } else {
                unreadCount[msg.sender] = 0; // CRITICAL: On-chain UX metric
            }
        }
    }

    /**
     * @dev Get user's notification metadata - CRITICAL: On-chain access
     */
    function getUserNotificationMetadata(
        address user,
        uint256 offset,
        uint256 limit
    ) public view returns (
        address[] memory recipients, // CRITICAL: On-chain for delivery
        string[] memory notificationUris,
        string[] memory contentHashes,
        uint256[] memory timestamps, // CRITICAL: On-chain for ordering
        string[] memory categories, // CRITICAL: On-chain for filtering
        bool[] memory reads, // CRITICAL: On-chain for UX
        bool[] memory sents // CRITICAL: On-chain for delivery tracking
    ) {
        Notification[] memory notifications = userNotifications[user]; // CRITICAL: On-chain access
        uint256 actualLimit = limit;
        
        if (offset + limit > notifications.length) {
            actualLimit = notifications.length - offset;
        }
        if (notifications.length < offset) {
            actualLimit = 0;
        }

        recipients = new address[](actualLimit);
        notificationUris = new string[](actualLimit);
        contentHashes = new string[](actualLimit);
        timestamps = new uint256[](actualLimit);
        categories = new string[](actualLimit);
        reads = new bool[](actualLimit);
        sents = new bool[](actualLimit);

        for (uint i = 0; i < actualLimit; i++) {
            Notification memory notification = notifications[offset + i];
            recipients[i] = notification.recipient; // CRITICAL: On-chain for delivery
            notificationUris[i] = notification.notificationUri;
            contentHashes[i] = notification.contentHash;
            timestamps[i] = notification.timestamp; // CRITICAL: On-chain for ordering
            categories[i] = notification.category; // CRITICAL: On-chain for filtering
            reads[i] = notification.read; // CRITICAL: On-chain for UX
            sents[i] = notification.sent; // CRITICAL: On-chain for tracking
        }

        return (recipients, notificationUris, contentHashes, timestamps, categories, reads, sents);
    }

    /**
     * @dev Get count of user's notifications - CRITICAL: On-chain metric
     */
    function getNotificationCount(address user) public view returns (uint256) {
        return userNotifications[user].length; // CRITICAL: On-chain metric
    }

    /**
     * @dev Get count of unread notifications for a user - CRITICAL: On-chain UX metric
     */
    function getUnreadCount(address user) public view returns (uint256) {
        return unreadCount[user]; // CRITICAL: On-chain UX metric
    }

    /**
     * @dev Update the PUSH Protocol service provider - CRITICAL: On-chain for integration
     */
    function setPushServiceProvider(address _provider) public onlyOwner {
        require(_provider != address(0), "Invalid provider address"); // CRITICAL: On-chain validation
        pushServiceProvider = _provider; // CRITICAL: On-chain for integration
        emit PushServiceProviderUpdated(_provider);
    }

    /**
     * @dev Toggle PUSH Protocol integration - CRITICAL: On-chain feature flag
     */
    function togglePushIntegration(bool _enabled) public onlyOwner {
        pushIntegrationEnabled = _enabled; // CRITICAL: On-chain feature flag
        emit PushIntegrationToggled(_enabled);
    }

    /**
     * @dev Internal function to trigger PUSH Protocol delivery
     * This would be implemented based on PUSH Protocol's smart contract API
     */
    function _triggerPushProtocol(
        address recipient,
        string memory notificationUri,
        string memory category
    ) internal {
        // In a real implementation, this would call PUSH Protocol's smart contract
        // For now, we'll just mark notifications as queued for sending
        Notification[] storage notifications = userNotifications[recipient]; // CRITICAL: On-chain access
        if (notifications.length > 0) {
            notifications[notifications.length - 1].sent = true; // CRITICAL: On-chain tracking
        }
    }

    /**
     * @dev Get all notifiable users - CRITICAL: On-chain data
     */
    function getNotifiableUsers() public view returns (address[] memory) {
        return notifiableUsers; // CRITICAL: On-chain data
    }
}