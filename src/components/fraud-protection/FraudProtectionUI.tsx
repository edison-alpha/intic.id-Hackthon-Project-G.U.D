import { AlertTriangle, Shield, Clock, Users, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFraudProtection } from '@/hooks/useFraudProtection';

interface FraudProtectionUIProps {
  contractAddress: string;
  userAddress?: string | undefined;
  showReportButton?: boolean;
  showEmergencyRefund?: boolean;
}

/**
 * Komponen UI untuk fraud protection features (V3.1 - User Friendly)
 * - Simplified fraud report progress
 * - One-click report fraud button
 * - Emergency refund with clear explanation
 * - Clean fund lock timer
 */
export const FraudProtectionUI: React.FC<FraudProtectionUIProps> = ({
  contractAddress,
  userAddress,
  showReportButton = true,
  showEmergencyRefund = true,
}) => {
  const {
    fraudInfo,
    isLoading,
    hasReported,
    reportFraud,
    claimEmergencyRefund,
  } = useFraudProtection(contractAddress, userAddress);

  if (isLoading || !fraudInfo) return null;

  const progressPercent = fraudInfo.threshold > 0 
    ? Math.min((fraudInfo.reportCount / fraudInfo.threshold) * 100, 100)
    : 0;

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Available now';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-3">
      {/* Emergency Refund Active - Clean & Clear */}
      {fraudInfo.emergencyActive && showEmergencyRefund && (
        <div className="p-4 bg-gradient-to-br from-red-500/10 to-red-600/10 border-2 border-red-500/30 rounded-xl">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-500 mb-1">
                🚨 Emergency Refund Available
              </h4>
              <p className="text-xs text-red-400/90 leading-relaxed">
                Community verified this event as fraudulent. You can now claim refund for <strong>ALL your tickets</strong> (including used ones).
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400/70">
                <Users className="w-3.5 h-3.5" />
                <span>{fraudInfo.reportCount} users reported fraud</span>
              </div>
            </div>
          </div>
          <Button
            onClick={claimEmergencyRefund}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold"
            size="sm"
          >
            <Shield className="w-4 h-4 mr-2" />
            Claim Emergency Refund Now
          </Button>
        </div>
      )}

      {/* Fraud Report Section - Compact & Clean */}
      {!fraudInfo.emergencyActive && (
        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                Fraud Protection Active
              </span>
            </div>
            <span className="text-xs font-mono text-amber-600 dark:text-amber-400">
              {fraudInfo.reportCount}/{fraudInfo.threshold}
            </span>
          </div>

          {/* Progress Bar - Subtle */}
          <div className="mb-2 relative">
            <div className="h-1.5 bg-amber-500/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Info Text - Concise */}
          <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mb-2 leading-tight">
            {hasReported ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                You've reported this event. {fraudInfo.threshold - fraudInfo.reportCount} more needed.
              </span>
            ) : (
              <>Event didn't happen? Report fraud. {fraudInfo.threshold - fraudInfo.reportCount} more report(s) needed for emergency refund.</>
            )}
          </p>

          {/* Report Button - Clean */}
          {showReportButton && (
            <Button
              onClick={reportFraud}
              disabled={hasReported}
              variant={hasReported ? 'outline' : 'default'}
              size="sm"
              className={`w-full text-xs font-semibold ${
                hasReported 
                  ? 'bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20' 
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {hasReported ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Reported as Fraud
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                  Report Fraud
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Fund Lock Timer - Minimalist (Only show if lock is active) */}
      {fraudInfo.timeUntilUnlock !== undefined && fraudInfo.timeUntilUnlock > 0 && (
        <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-0.5">
                Withdrawal Protection: {formatTimeRemaining(fraudInfo.timeUntilUnlock)}
              </p>
              <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 leading-tight">
                Funds locked for 72 hours after event. Report fraud if event didn't happen.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
