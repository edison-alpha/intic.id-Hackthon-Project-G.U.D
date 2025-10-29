// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPlatform.sol";

/**
 * @title EventStatistics
 * @dev Contract for tracking event analytics and metrics
 * CRITICAL: Statistical data must remain on-chain for transparency
 */
contract EventStatistics is Ownable {
    address public platformContract;
    struct EventMetrics {
        uint256 totalTicketsMinted; // CRITICAL: On-chain for metrics
        uint256 totalTicketsSold; // CRITICAL: On-chain for availability
        uint256 totalTicketsValidated; // CRITICAL: On-chain for engagement metrics
        uint256 totalRevenue; // CRITICAL: On-chain for financial tracking
        uint256 uniqueAttendees; // CRITICAL: On-chain for engagement
        uint256 startTime; // CRITICAL: On-chain for time-based logic
        uint256 endTime; // CRITICAL: On-chain for time-based logic
        uint256 aggregateSalesPerHour; // CRITICAL: On-chain for performance metrics
        uint256 aggregateEngagementRate; // CRITICAL: On-chain for engagement metrics
        bool exists; // CRITICAL: On-chain existence check
    }

    struct GlobalMetrics {
        uint256 totalEventsCreated; // CRITICAL: On-chain for platform metrics
        uint256 totalTicketsMinted; // CRITICAL: On-chain for platform metrics
        uint256 totalRevenueGenerated; // CRITICAL: On-chain for financial tracking
        uint256 totalUniqueUsers; // CRITICAL: On-chain for platform growth
        uint256 platformGrowthRate; // CRITICAL: On-chain for platform metrics
    }

    mapping(uint256 => EventMetrics) public eventMetrics; // CRITICAL: On-chain for event data
    GlobalMetrics public globalMetrics; // CRITICAL: On-chain for platform metrics

    event EventMetricsUpdated(uint256 indexed eventId, string metricType, uint256 value, uint256 timestamp);
    event GlobalMetricsUpdated(string metricType, uint256 value, uint256 timestamp);
    
    modifier onlyPlatformOrOwner() {
        require(
            msg.sender == platformContract || 
            msg.sender == owner() || 
            (platformContract != address(0) && IPlatform(platformContract).isAuthorizedContract(msg.sender)),
            "Not authorized"
        );
        _;
    }

    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Set platform contract address
     */
    function setPlatformContract(address _platform) external onlyOwner {
        require(_platform != address(0), "Invalid platform address");
        platformContract = _platform;
    }
    
    /**
     * @dev Check if event metrics exist
     */
    function eventMetricsExists(uint256 eventId) external view returns (bool) {
        return eventMetrics[eventId].exists;
    }

    /**
     * @dev Initialize metrics for a new event
     */
    function initializeEventMetrics(uint256 eventId) public onlyPlatformOrOwner {
        require(!eventMetrics[eventId].exists, "Event metrics already initialized"); // CRITICAL: On-chain check

        eventMetrics[eventId] = EventMetrics({
            totalTicketsMinted: 0,
            totalTicketsSold: 0, // CRITICAL: On-chain for revenue tracking
            totalTicketsValidated: 0,
            totalRevenue: 0, // CRITICAL: On-chain for financial metrics
            uniqueAttendees: 0,
            startTime: block.timestamp,
            endTime: 0,
            aggregateSalesPerHour: 0,
            aggregateEngagementRate: 0,
            exists: true // CRITICAL: On-chain existence check
        });

        globalMetrics.totalEventsCreated++;
        emit EventMetricsUpdated(eventId, "initialized", 0, block.timestamp);
    }
    
    /**
     * @dev Increment tickets sold (called by EventTicket)
     */
    function incrementTicketsSold(uint256 eventId, uint256 amount) external onlyPlatformOrOwner {
        EventMetrics storage metrics = eventMetrics[eventId]; // CRITICAL: On-chain access
        if (!metrics.exists) {
            initializeEventMetrics(eventId);
            metrics = eventMetrics[eventId];
        }
        
        metrics.totalTicketsSold += amount; // CRITICAL: On-chain metric
        metrics.totalTicketsMinted += amount;
        emit EventMetricsUpdated(eventId, "ticketsSold", metrics.totalTicketsSold, block.timestamp);
    }
    
    /**
     * @dev Increment validations (called by UniversalTicketValidator)
     */
    function incrementValidations(uint256 eventId) external onlyPlatformOrOwner {
        EventMetrics storage metrics = eventMetrics[eventId];
        require(metrics.exists, "Event metrics not initialized");
        
        metrics.totalTicketsValidated++; // CRITICAL: On-chain metric
        emit EventMetricsUpdated(eventId, "validations", metrics.totalTicketsValidated, block.timestamp);
    }
    
    /**
     * @dev Increment refunds (not in original struct, using totalTicketsSold decrement)
     */
    function incrementRefunds(uint256 eventId) external onlyPlatformOrOwner {
        EventMetrics storage metrics = eventMetrics[eventId];
        require(metrics.exists, "Event metrics not initialized");
        
        if (metrics.totalTicketsSold > 0) {
            metrics.totalTicketsSold--; // Decrement sold tickets
        }
        emit EventMetricsUpdated(eventId, "refunds", 1, block.timestamp);
    }
    
    /**
     * @dev Update revenue (called by EventTicket)
     */
    function updateRevenue(uint256 eventId, uint256 amount) external onlyPlatformOrOwner {
        EventMetrics storage metrics = eventMetrics[eventId];
        if (!metrics.exists) {
            initializeEventMetrics(eventId);
            metrics = eventMetrics[eventId];
        }
        
        metrics.totalRevenue += amount; // CRITICAL: On-chain metric
        globalMetrics.totalRevenueGenerated += amount;
        emit EventMetricsUpdated(eventId, "revenue", metrics.totalRevenue, block.timestamp);
    }
    
    /**
     * @dev Update average rating (compatibility function - rating stored elsewhere)
     */
    function updateAverageRating(uint256 eventId, uint256 rating, uint256 reviewCount) external onlyPlatformOrOwner {
        EventMetrics storage metrics = eventMetrics[eventId];
        require(metrics.exists, "Event metrics not initialized");
        
        // Just emit event as rating is managed by EventReview
        emit EventMetricsUpdated(eventId, "averageRating", rating, block.timestamp);
    }

    /**
     * @dev Update event metrics - CRITICAL: On-chain data update (deprecated, use specific functions)
     */
    
    /**
     * @dev Record a ticket mint for an event - CRITICAL: On-chain for metrics
     */
    function recordTicketMint(uint256 eventId, uint256 ticketPrice) public onlyPlatformOrOwner {
        EventMetrics storage metrics = eventMetrics[eventId]; // CRITICAL: On-chain access
        require(metrics.exists, "Event metrics not initialized"); // CRITICAL: On-chain check

        metrics.totalTicketsMinted++; // CRITICAL: On-chain metric
        metrics.totalTicketsSold++; // CRITICAL: On-chain metric
        metrics.totalRevenue += ticketPrice; // CRITICAL: On-chain financial tracking
        
        // Increment global metrics - CRITICAL: On-chain platform metrics
        globalMetrics.totalTicketsMinted++; // CRITICAL: On-chain platform metric
        globalMetrics.totalRevenueGenerated += ticketPrice; // CRITICAL: On-chain financial tracking

        emit EventMetricsUpdated(eventId, "ticketMinted", metrics.totalTicketsMinted, block.timestamp);
        emit GlobalMetricsUpdated("totalTicketsMinted", globalMetrics.totalTicketsMinted, block.timestamp);
        emit GlobalMetricsUpdated("totalRevenueGenerated", globalMetrics.totalRevenueGenerated, block.timestamp);
    }

    /**
     * @dev Record a ticket validation for an event - CRITICAL: On-chain for engagement
     */
    function recordTicketValidation(uint256 eventId) public {
        EventMetrics storage metrics = eventMetrics[eventId]; // CRITICAL: On-chain access
        require(metrics.exists, "Event metrics not initialized"); // CRITICAL: On-chain check

        metrics.totalTicketsValidated++; // CRITICAL: On-chain engagement metric
        emit EventMetricsUpdated(eventId, "ticketValidated", metrics.totalTicketsValidated, block.timestamp);
    }

    /**
     * @dev Update unique attendees count - CRITICAL: On-chain for engagement
     */
    function updateUniqueAttendees(uint256 eventId, uint256 newCount) public onlyOwner {
        EventMetrics storage metrics = eventMetrics[eventId]; // CRITICAL: On-chain access
        require(metrics.exists, "Event metrics not initialized"); // CRITICAL: On-chain check
        metrics.uniqueAttendees = newCount; // CRITICAL: On-chain engagement metric
        emit EventMetricsUpdated(eventId, "uniqueAttendees", newCount, block.timestamp);
    }

    /**
     * @dev Update calculated aggregates for an event - CRITICAL: On-chain for metrics
     */
    function updateAggregateMetrics(
        uint256 eventId,
        uint256 salesPerHour,
        uint256 engagementRate
    ) public onlyOwner {
        EventMetrics storage metrics = eventMetrics[eventId]; // CRITICAL: On-chain access
        require(metrics.exists, "Event metrics not initialized"); // CRITICAL: On-chain check

        metrics.aggregateSalesPerHour = salesPerHour; // CRITICAL: On-chain performance metric
        metrics.aggregateEngagementRate = engagementRate; // CRITICAL: On-chain engagement metric
    }

    /**
     * @dev Set event end time and calculate final metrics - CRITICAL: On-chain for time logic
     */
    function setEventEndTime(uint256 eventId) public onlyOwner {
        EventMetrics storage metrics = eventMetrics[eventId]; // CRITICAL: On-chain access
        require(metrics.exists, "Event metrics not initialized"); // CRITICAL: On-chain check
        require(metrics.endTime == 0, "End time already set"); // CRITICAL: On-chain check

        metrics.endTime = block.timestamp; // CRITICAL: On-chain time tracking
        
        // Calculate engagement rate if possible - CRITICAL: On-chain metrics
        if (metrics.totalTicketsSold > 0) {
            metrics.aggregateEngagementRate = (metrics.totalTicketsValidated * 100) / metrics.totalTicketsSold; // CRITICAL: On-chain calculation
        }

        // Calculate sales per hour if possible - CRITICAL: On-chain metrics
        uint256 durationHours = (metrics.endTime - metrics.startTime) / 3600; // CRITICAL: On-chain calculation
        if (durationHours > 0) {
            metrics.aggregateSalesPerHour = metrics.totalTicketsSold / durationHours; // CRITICAL: On-chain calculation
        }
    }

    /**
     * @dev Get event metrics (aggregate data only) - CRITICAL: On-chain access
     */
    function getEventMetrics(uint256 eventId) public view returns (
        uint256 totalTicketsMinted, // CRITICAL: On-chain metric
        uint256 totalTicketsSold, // CRITICAL: On-chain metric
        uint256 totalTicketsValidated, // CRITICAL: On-chain metric
        uint256 totalRevenue, // CRITICAL: On-chain financial tracking
        uint256 uniqueAttendees, // CRITICAL: On-chain engagement
        uint256 startTime, // CRITICAL: On-chain for time logic
        uint256 endTime, // CRITICAL: On-chain for time logic
        uint256 duration, // CRITICAL: On-chain time calculation
        uint256 salesPerHour, // CRITICAL: On-chain performance metric
        uint256 engagementRate // CRITICAL: On-chain engagement metric
    ) {
        EventMetrics memory metrics = eventMetrics[eventId]; // CRITICAL: On-chain access
        require(metrics.exists, "Event metrics not initialized"); // CRITICAL: On-chain check

        uint256 calculatedDuration = metrics.endTime > 0 ? metrics.endTime - metrics.startTime : 0; // CRITICAL: On-chain calculation
        
        return (
            metrics.totalTicketsMinted, // CRITICAL: On-chain metric
            metrics.totalTicketsSold, // CRITICAL: On-chain metric
            metrics.totalTicketsValidated, // CRITICAL: On-chain metric
            metrics.totalRevenue, // CRITICAL: On-chain financial tracking
            metrics.uniqueAttendees, // CRITICAL: On-chain engagement
            metrics.startTime, // CRITICAL: On-chain for time logic
            metrics.endTime, // CRITICAL: On-chain for time logic
            calculatedDuration, // CRITICAL: On-chain calculation
            metrics.aggregateSalesPerHour, // CRITICAL: On-chain performance metric
            metrics.aggregateEngagementRate // CRITICAL: On-chain engagement metric
        );
    }

    /**
     * @dev Get engagement rate for an event - CRITICAL: On-chain calculation
     */
    function getEventEngagementRate(uint256 eventId) public view returns (uint256) {
        EventMetrics memory metrics = eventMetrics[eventId]; // CRITICAL: On-chain access
        require(metrics.exists, "Event metrics not initialized"); // CRITICAL: On-chain check

        if (metrics.totalTicketsSold == 0) return 0; // CRITICAL: On-chain calculation

        return (metrics.totalTicketsValidated * 100) / metrics.totalTicketsSold; // CRITICAL: On-chain calculation
    }

    /**
     * @dev Get global metrics - CRITICAL: On-chain platform data
     */
    function getGlobalMetrics() public view returns (
        uint256 totalEventsCreated, // CRITICAL: On-chain platform metric
        uint256 totalTicketsMinted, // CRITICAL: On-chain platform metric
        uint256 totalRevenueGenerated, // CRITICAL: On-chain financial tracking
        uint256 totalUniqueUsers, // CRITICAL: On-chain platform growth
        uint256 platformGrowthRate // CRITICAL: On-chain platform metric
    ) {
        return (
            globalMetrics.totalEventsCreated, // CRITICAL: On-chain platform metric
            globalMetrics.totalTicketsMinted, // CRITICAL: On-chain platform metric
            globalMetrics.totalRevenueGenerated, // CRITICAL: On-chain financial tracking
            globalMetrics.totalUniqueUsers, // CRITICAL: On-chain platform growth
            globalMetrics.platformGrowthRate // CRITICAL: On-chain platform metric
        );
    }

    /**
     * @dev Update global metrics - CRITICAL: On-chain platform data
     */
    function updateGlobalMetrics(
        uint256 newTotalEvents,
        uint256 newTotalTickets,
        uint256 newTotalRevenue,
        uint256 newTotalUniqueUsers,
        uint256 newGrowthRate
    ) public onlyOwner {
        globalMetrics.totalEventsCreated = newTotalEvents; // CRITICAL: On-chain platform metric
        globalMetrics.totalTicketsMinted = newTotalTickets; // CRITICAL: On-chain platform metric
        globalMetrics.totalRevenueGenerated = newTotalRevenue; // CRITICAL: On-chain financial tracking
        globalMetrics.totalUniqueUsers = newTotalUniqueUsers; // CRITICAL: On-chain platform growth
        globalMetrics.platformGrowthRate = newGrowthRate; // CRITICAL: On-chain platform metric
    }

    /**
     * @dev Check if event metrics are initialized - CRITICAL: On-chain check
     */
    function isEventInitialized(uint256 eventId) public view returns (bool) {
        return eventMetrics[eventId].exists; // CRITICAL: On-chain check
    }
}