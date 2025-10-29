import React, { useState } from 'react';
import { Camera, CheckCircle, XCircle, Clock, User, Calendar, MapPin, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useCheckInWorkflow } from '@/hooks/useCheckIn';
import { useToast } from '@/hooks/use-toast';
import QRScanner from '@/components/QRScanner';

interface CheckInRecord {
  tokenId: number;
  eventName: string;
  owner: string;
  timestamp: Date;
  status: 'success' | 'already-used' | 'expired' | 'invalid' | 'cancelled';
  txHash?: string;
}

const CheckIn = () => {
  const { wallet } = useWallet();
  const { toast } = useToast();
  const workflow = useCheckInWorkflow();
  
  const [isScanning, setIsScanning] = useState(false);
  const [checkInHistory, setCheckInHistory] = useState<CheckInRecord[]>([]);

  const handleScanSuccess = async (decodedText: string) => {
    try {
      setIsScanning(false);
      
      // Process QR code through workflow
      const validationResult = await workflow.processQRCode(decodedText);
      
      // Get ticket info for display
      if (validationResult.canCheckIn && workflow.checkInData) {
        await workflow.ticketInfo.getTicketInfo(
          workflow.checkInData.contractAddress,
          workflow.checkInData.tokenId
        );
      }
    } catch (error: any) {
      toast({
        title: "Invalid QR Code",
        description: error.message || 'Failed to process QR code',
        variant: "destructive"
      });
      setIsScanning(false);
    }
  };

  const handleScanError = (error: string) => {
    console.error('❌ [CheckIn] Scan error:', error);
  };

  const handleConfirmCheckIn = async () => {
    try {
      const result = await workflow.confirmCheckIn();
      
      if (result.success && workflow.ticketInfo.ticketInfo) {
        // Add to history
        const record: CheckInRecord = {
          tokenId: workflow.checkInData!.tokenId,
          eventName: workflow.ticketInfo.ticketInfo.eventName,
          owner: workflow.validation.validationResult!.owner,
          timestamp: new Date(),
          status: 'success',
          txHash: result.txHash
        };
        setCheckInHistory([record, ...checkInHistory]);
      } else {
        // Add failed record
        const record: CheckInRecord = {
          tokenId: workflow.checkInData!.tokenId,
          eventName: workflow.ticketInfo.ticketInfo?.eventName || 'Unknown Event',
          owner: workflow.validation.validationResult?.owner || '',
          timestamp: new Date(),
          status: result.status as any,
        };
        setCheckInHistory([record, ...checkInHistory]);
      }
      
      // Reset workflow after a delay
      setTimeout(() => {
        workflow.resetWorkflow();
      }, 3000);
    } catch (error: any) {
      toast({
        title: "Check-in Failed",
        description: error.message || 'Failed to process check-in',
        variant: "destructive"
      });
    }
  };

  const handleCancelCheckIn = () => {
    workflow.resetWorkflow();
  };

  const statusIcons = {
    success: CheckCircle,
    'already-used': XCircle,
    expired: Clock,
    invalid: AlertTriangle,
    cancelled: XCircle,
  };

  const statusColors = {
    success: 'text-green-500',
    'already-used': 'text-[#e7a4fd]',
    expired: 'text-gray-500',
    invalid: 'text-red-500',
    cancelled: 'text-orange-500',
  };

  if (!wallet?.address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#1A0B2E] to-[#16213E] p-4">
        <div className="max-w-md mx-auto pt-20">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Wallet Required</h2>
            <p className="text-gray-400 mb-6">Please connect your wallet to access check-in features</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#1A0B2E] to-[#16213E] p-4">
      <div className="max-w-md mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 pt-4">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 bg-[#1A1A1A] border border-gray-800 rounded-xl flex items-center justify-center text-white hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Ticket Check-In</h1>
            <p className="text-gray-400">Scan tickets for event entry</p>
          </div>
        </div>

        {/* QR Scanner */}
        {isScanning && (
          <div className="mb-6">
            <QRScanner
              onScanSuccess={handleScanSuccess}
              onScanError={handleScanError}
              onClose={() => setIsScanning(false)}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          
          {/* Scanner Interface */}
          {workflow.currentStep === 'scan' && !isScanning && (
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-8 text-center">
              <div className="w-20 h-20 bg-[#d548ec]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-10 h-10 text-[#d548ec]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Scan Ticket QR Code</h3>
              <p className="text-gray-400 mb-6">
                Position the attendee's QR code in front of your camera
              </p>
              <button
                onClick={() => setIsScanning(true)}
                className="px-8 py-4 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] hover:from-[#c030d6] hover:to-[#d183f0] text-white font-semibold rounded-xl transition-all"
              >
                Start Scanning
              </button>
            </div>
          )}

          {/* Validation Result */}
          {workflow.currentStep === 'confirm' && workflow.validation.validationResult && workflow.ticketInfo.ticketInfo && (
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6">
              {/* Status Header */}
              <div className="flex items-center gap-4 mb-6">
                {workflow.validation.validationResult.canCheckIn ? (
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                ) : workflow.validation.validationResult.isUsed ? (
                  <div className="w-16 h-16 bg-[#e7a4fd]/10 rounded-full flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-[#e7a4fd]" />
                  </div>
                ) : workflow.validation.validationResult.isExpired ? (
                  <div className="w-16 h-16 bg-gray-500/10 rounded-full flex items-center justify-center">
                    <Clock className="w-8 h-8 text-gray-500" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {workflow.validation.validationResult.canCheckIn ? 'Valid Ticket' : 
                     workflow.validation.validationResult.isUsed ? 'Already Used' : 
                     workflow.validation.validationResult.isExpired ? 'Expired' : 
                     workflow.validation.validationResult.isCancelled ? 'Event Cancelled' : 'Invalid'}
                  </h3>
                  <p className="text-gray-400">{workflow.validation.validationResult.message}</p>
                </div>
              </div>

              {/* Ticket Details */}
              <div className="bg-black/20 rounded-xl p-4 mb-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-[#d548ec]" />
                    <span className="text-white font-medium">{workflow.ticketInfo.ticketInfo.eventName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">{workflow.ticketInfo.ticketInfo.eventVenue}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 font-mono text-sm">
                      {workflow.validation.validationResult.owner.substring(0, 8)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">Token ID:</span>
                    <span className="text-white font-mono">#{workflow.checkInData?.tokenId}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">Price:</span>
                    <span className="text-white">{workflow.ticketInfo.ticketInfo.ticketPrice} ETH</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">Event Date:</span>
                    <span className="text-white">
                      {workflow.validation.validationResult.eventDate.toLocaleDateString()} at{' '}
                      {workflow.validation.validationResult.eventDate.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleCancelCheckIn}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
                {workflow.validation.validationResult.canCheckIn && (
                  <button
                    onClick={handleConfirmCheckIn}
                    disabled={workflow.loading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] hover:from-[#c030d6] hover:to-[#d183f0] text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {workflow.loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Confirm Check-In'
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Success/Complete State */}
          {workflow.currentStep === 'complete' && workflow.checkIn.checkInResult && (
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 text-center">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Check-in Complete!</h3>
              <p className="text-gray-400 mb-4">{workflow.checkIn.checkInResult.message}</p>
              {workflow.checkIn.checkInResult.txHash && (
                <p className="text-sm text-gray-500 font-mono">
                  TX: {workflow.checkIn.checkInResult.txHash.substring(0, 16)}...
                </p>
              )}
            </div>
          )}

          {/* Loading State */}
          {workflow.loading && workflow.currentStep === 'validate' && (
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-8 text-center">
              <RefreshCw className="w-12 h-12 text-[#d548ec] animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Validating Ticket</h3>
              <p className="text-gray-400">Please wait while we verify the ticket...</p>
            </div>
          )}

          {/* Check-in History */}
          {checkInHistory.length > 0 && (
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Recent Check-ins</h3>
              <div className="space-y-3">
                {checkInHistory.slice(0, 5).map((record, index) => {
                  const StatusIcon = statusIcons[record.status];
                  const statusColor = statusColors[record.status];
                  
                  return (
                    <div key={index} className="flex items-center gap-4 p-3 bg-black/20 rounded-xl">
                      <StatusIcon className={`w-6 h-6 ${statusColor}`} />
                      <div className="flex-1">
                        <div className="text-white font-medium">{record.eventName}</div>
                        <div className="text-sm text-gray-400">
                          Token #{record.tokenId} • {record.timestamp.toLocaleTimeString()}
                        </div>
                        {record.txHash && (
                          <div className="text-xs text-gray-500 font-mono">
                            {record.txHash.substring(0, 16)}...
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {record.status === 'already-used' ? 'Used' : record.status}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default CheckIn;