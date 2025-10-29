import React, { useState, useEffect } from "react";

interface Activity {
  type: string;
  user: string;
  event: string;
  time: string;
  icon: string;
  color: string;
}

interface RealtimeBadgesProps {
  activities?: Activity[];
}

const RealtimeBadges: React.FC<RealtimeBadgesProps> = ({ activities }) => {
  const [realtimeActivities, setRealtimeActivities] = useState<Activity[]>([]);

  useEffect(() => {
    // Try to load from localStorage first
    const storedActivities = localStorage.getItem('realtime-activities');
    if (storedActivities) {
      try {
        const parsedActivities = JSON.parse(storedActivities);
        if (parsedActivities.length > 0) {
          setRealtimeActivities(parsedActivities);
          return;
        }
      } catch (error) {
        console.warn('Failed to parse stored activities:', error);
      }
    }

    // Fallback to props or empty array if no stored activities
    const fallbackActivities = activities || [];
    
    setRealtimeActivities(fallbackActivities);
  }, [activities]);

  return (
    <div className="relative w-full overflow-hidden bg-black/30 backdrop-blur-md border-b border-white/5">
      <div className="relative flex animate-scroll">
        {/* First set of activities */}
        <div className="flex items-center gap-3 px-4 py-2.5 whitespace-nowrap">
          {realtimeActivities.map((activity, idx) => (
            <div
              key={`first-${idx}`}
              className={`group flex items-center gap-2.5 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all`}
            >
              <span className="text-lg">{activity.icon}</span>
              <div className="flex items-center gap-2">
                {activity.type === 'mint' && (
                  <span className="text-xs font-semibold text-green-400">MINT</span>
                )}
                {activity.type === 'deploy' && (
                  <span className="text-xs font-semibold text-blue-400">DEPLOY</span>
                )}
                {activity.type === 'canceled' && (
                  <span className="text-xs font-semibold text-red-400">CANCELED</span>
                )}
                <div className="h-3 w-px bg-white/20" />
                <code className="text-xs font-mono text-white/70">
                  {activity.user}
                </code>
                <div className="h-3 w-px bg-white/20" />
                <span className="text-xs text-white/60 max-w-[150px] truncate">
                  {activity.event}
                </span>
                <div className="h-3 w-px bg-white/20" />
                <span className="text-xs text-white/40">
                  {activity.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Duplicate set for seamless loop */}
        <div className="flex items-center gap-3 px-4 py-2.5 whitespace-nowrap">
          {realtimeActivities.map((activity, idx) => (
            <div
              key={`second-${idx}`}
              className={`group flex items-center gap-2.5 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all`}
            >
              <span className="text-lg">{activity.icon}</span>
              <div className="flex items-center gap-2">
                {activity.type === 'mint' && (
                  <span className="text-xs font-semibold text-green-400">MINT</span>
                )}
                {activity.type === 'deploy' && (
                  <span className="text-xs font-semibold text-blue-400">DEPLOY</span>
                )}
                {activity.type === 'canceled' && (
                  <span className="text-xs font-semibold text-red-400">CANCELED</span>
                )}
                <div className="h-3 w-px bg-white/20" />
                <code className="text-xs font-mono text-white/70">
                  {activity.user}
                </code>
                <div className="h-3 w-px bg-white/20" />
                <span className="text-xs text-white/60 max-w-[150px] truncate">
                  {activity.event}
                </span>
                <div className="h-3 w-px bg-white/20" />
                <span className="text-xs text-white/40">
                  {activity.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RealtimeBadges;
