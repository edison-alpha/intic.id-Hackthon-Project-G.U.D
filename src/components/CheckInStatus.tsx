/**
 * Real-time Check-In Status Component
 * Shows live check-in statistics and recent events for EO
 */

import { useState, useEffect } from 'react';
import { useCheckInMonitor } from '@/services/checkInMonitor';
import { 
  Users, 
  UserCheck, 
  Clock, 
  TrendingUp, 
  Eye,
  EyeOff,
  CheckCircle2,
  Circle,
  Calendar,
  Hash
} from 'lucide-react';

interface CheckInStatusProps {
  contractAddress: string;
  eventName: string;
  totalSupply?: number;
  className?: string;
}

export default function CheckInStatus({ 
  contractAddress, 
  eventName, 
  totalSupply = 1000,
  className = "" 
}: CheckInStatusProps) {
  const { checkInStats, recentEvents, isLoading, error, refetch } = useCheckInMonitor(
    contractAddress, 
    totalSupply
  );

  const [showDetails, setShowDetails] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-800">
          <Circle className="w-4 h-4" />
          <span className="text-sm font-medium">Check-in monitoring failed</span>
        </div>
        <p className="text-red-600 text-xs mt-1">{error}</p>
        <button
          onClick={refetch}
          className="text-red-600 hover:text-red-800 text-xs mt-2 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!checkInStats) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="text-center text-gray-500 text-sm">
          No check-in data available
        </div>
      </div>
    );
  }

  const { totalTickets, usedTickets, unusedTickets, checkInRate, recentCheckIns } = checkInStats;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-500" />
              Check-In Status
            </h3>
            <p className="text-sm text-gray-600">{eventName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 hover:bg-gray-100 rounded text-gray-500"
              title={showDetails ? "Hide details" : "Show details"}
            >
              {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Total Tickets */}
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Users className="w-6 h-6 text-gray-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-gray-900">{totalTickets}</div>
            <div className="text-xs text-gray-600">Total Tickets</div>
          </div>

          {/* Checked In */}
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-green-700">{usedTickets}</div>
            <div className="text-xs text-green-600">Checked In</div>
          </div>

          {/* Pending */}
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-yellow-700">{unusedTickets}</div>
            <div className="text-xs text-yellow-600">Pending</div>
          </div>

          {/* Check-in Rate */}
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-blue-700">{checkInRate.toFixed(1)}%</div>
            <div className="text-xs text-blue-600">Check-in Rate</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{usedTickets} of {totalTickets} checked in</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${checkInRate}%` }}
            ></div>
          </div>
        </div>

        {/* Recent Activity */}
        {recentCheckIns > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <Clock className="w-4 h-4" />
              <span className="font-medium text-sm">Recent Activity</span>
            </div>
            <p className="text-blue-700 text-sm">
              {recentCheckIns} check-ins in the last 24 hours
            </p>
          </div>
        )}

        {/* Auto Refresh Toggle */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-3 h-3"
            />
            Auto refresh
          </label>
        </div>
      </div>

      {/* Detailed View */}
      {showDetails && (
        <div className="border-t border-gray-100">
          <div className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">Recent Check-ins</h4>
            
            {recentEvents.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                No recent check-ins
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {recentEvents.map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="font-medium">Ticket #{event.tokenId}</span>
                      <span className="text-gray-500">
                        {event.user.slice(0, 6)}...{event.user.slice(-4)}
                      </span>
                    </div>
                    <div className="text-gray-500 text-xs">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Contract Info */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                <div className="flex items-center gap-1 mb-1">
                  <Hash className="w-3 h-3" />
                  <span>Contract: {contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}</span>
                </div>
                <button
                  onClick={refetch}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Refresh now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}