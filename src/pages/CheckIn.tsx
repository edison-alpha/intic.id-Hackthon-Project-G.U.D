/**
 * Check-In Page
 * For event organizers to scan and validate tickets
 * Updated to use mock data for EVM implementation
 */

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import QRScanner from '@/components/QRScanner';
import { useWallet } from '@/hooks/usePushChainWallet';
import { toast } from 'sonner';
import { sendTicketCheckInConfirmation } from '@/services/emailAlertService';
import {
  Camera,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  MapPin,
  Hash,
  Ticket,
} from 'lucide-react';

// Mock data for tickets (same as in MyTickets)
const mockTickets = [
  {
    id: '0x1234567890abcdef.event-contract-1-123',
    tokenId: 123,
    eventName: 'Summer Music Festival',
    eventDate: 'June 15, 2025',
    eventTime: '6:00 PM',
    location: 'Central Park, New York',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80',
    ticketNumber: '#TKT-000123',
    contractAddress: '0x1234567890abcdef',
    contractName: 'event-contract-1',
    contractId: '0x1234567890abcdef.event-contract-1',
    status: 'active',
    quantity: 2,
    category: 'VIP',
    price: '0.5',
    mintTxId: '0xabcdef1234567890'
  },
  {
    id: '0xabcdef1234567890.sports-event-1-456',
    tokenId: 456,
    eventName: 'International Football Championship',
    eventDate: 'July 20, 2025',
    eventTime: '3:00 PM',
    location: 'Wembley Stadium, London',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
    ticketNumber: '#TKT-000456',
    contractAddress: '0xabcdef1234567890',
    contractName: 'sports-event-1',
    contractId: '0xabcdef1234567890.sports-event-1',
    status: 'active',
    quantity: 1,
    category: 'General',
    price: '1.2',
    mintTxId: '0xdefabc7890123456'
  },
  {
    id: '0x1122334455667788.tech-conference-1-789',
    tokenId: 789,
    eventName: 'Tech Innovation Summit',
    eventDate: 'August 5, 2025',
    eventTime: '9:00 AM',
    location: 'Moscone Center, San Francisco',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80',
    ticketNumber: '#TKT-000789',
    contractAddress: '0x1122334455667788',
    contractName: 'tech-conference-1',
    contractId: '0x1122334455667788.tech-conference-1',
    status: 'used',
    quantity: 1,
    category: 'VIP',
    price: '2.0',
    mintTxId: '0x7890abcdef123456'
  }
];

interface CheckInData {
  contractAddress: string;
  contractName: string;
  tokenId: number;
  eventDate: string; // ISO date string
  eventTime: string;
}

interface CheckInResult {
  success: boolean;
  txId?: string;
  message: string;
  status?: 'used' | 'expired' | 'invalid';
}

interface TicketValidation {
  isValid: boolean;
  isUsed: boolean;
  isExpired: boolean;
  owner: string;
  eventDate: Date;
  message: string;
}

interface CheckInRecord {
  tokenId: number;
  eventName: string;
  owner: string;
  timestamp: Date;
  status: 'success' | 'already-used' | 'expired' | 'invalid';
}

// Mock function to parse QR data
const parseCheckInQRData = (decodedText: string): CheckInData | null => {
  try {
    // Simulate parsing check-in QR data
    if (!decodedText.startsWith('checkin:')) {
      return null;
    }
    
    const parts = decodedText.substring(8).split(':');
    if (parts.length < 3) {
      return null;
    }
    
    const [contractId, tokenIdStr] = parts;
    const [contractAddress, contractName] = contractId.split('.');
    
    if (!contractAddress || !contractName || !tokenIdStr) {
      return null;
    }
    
    const tokenId = parseInt(tokenIdStr);
    if (isNaN(tokenId)) {
      return null;
    }
    
    // Find matching ticket in mock data
    const mockTicket = mockTickets.find(ticket => ticket.tokenId === tokenId);
    if (!mockTicket) {
      return null;
    }
    
    return {
      contractAddress,
      contractName,
      tokenId,
      eventDate: mockTicket.eventDate,
      eventTime: mockTicket.eventTime
    };
  } catch (error) {
    console.error('Error parsing QR data:', error);
    return null;
  }
};

// Mock function to validate ticket
const validateTicket = async (
  contractAddress: string,
  contractName: string,
  tokenId: number,
  eventDate: string,
  eventTime: string
): Promise<TicketValidation> => {
  console.log('🔍 [CheckIn] Validating ticket (mock):', { contractAddress, contractName, tokenId });
  
  // Find the ticket in mock data
  const mockTicket = mockTickets.find(ticket => 
    ticket.tokenId === tokenId && 
    ticket.contractAddress === contractAddress &&
    ticket.contractName === contractName
  );
  
  if (!mockTicket) {
    return {
      isValid: false,
      isUsed: false,
      isExpired: false,
      owner: '0x0000000000000000000000000000000000000000',
      eventDate: new Date(),
      message: 'Ticket not found',
    };
  }
  
  const isUsed = mockTicket.status === 'used';
  
  if (isUsed) {
    return {
      isValid: false,
      isUsed: true,
      isExpired: false,
      owner: mockTicket.contractAddress,
      eventDate: new Date(mockTicket.eventDate),
      message: 'Ticket already used',
    };
  }
  
  // Check if event date has passed
  const eventDateTime = new Date(`${mockTicket.eventDate} ${mockTicket.eventTime}`);
  const now = new Date();
  const isExpired = now > eventDateTime;
  
  if (isExpired) {
    return {
      isValid: false,
      isUsed: false,
      isExpired: true,
      owner: mockTicket.contractAddress,
      eventDate: eventDateTime,
      message: 'Ticket expired - event time has passed',
    };
  }
  
  // Check if too early (more than 24 hours before event)
  const earlyCheckInHours = 24;
  const earliestCheckIn = new Date(eventDateTime.getTime() - (earlyCheckInHours * 60 * 60 * 1000));
  
  if (now < earliestCheckIn) {
    return {
      isValid: false,
      isUsed: false,
      isExpired: false,
      owner: mockTicket.contractAddress,
      eventDate: eventDateTime,
      message: 'Too early - check-in opens 24 hours before event',
    };
  }
  
  // Ticket is valid
  return {
    isValid: true,
    isUsed: false,
    isExpired: false,
    owner: mockTicket.contractAddress,
    eventDate: eventDateTime,
    message: 'Ticket valid for check-in',
  };
};

// Mock function for check-in process
const checkInTicket = async (
  contractAddress: string,
  contractName: string,
  tokenId: number
): Promise<CheckInResult> => {
  console.log('✅ [CheckIn] Processing check-in (mock):', { contractAddress, contractName, tokenId });
  
  // Simulate a successful check-in
  return {
    success: true,
    txId: `0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
    message: 'Check-in successful! Ticket marked as used.',
    status: 'used',
  };
};

const CheckIn = () => {
  const { wallet } = useWallet();
  const [isScanning, setIsScanning] = useState(false);
  const [validationResult, setValidationResult] = useState<TicketValidation | null>(null);
  const [currentCheckInData, setCurrentCheckInData] = useState<CheckInData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkInHistory, setCheckInHistory] = useState<CheckInRecord[]>([]);

  const handleScanSuccess = async (decodedText: string) => {
    console.log('📱 [CheckIn] QR Code scanned:', decodedText);

    // Parse QR data
    const checkInData = parseCheckInQRData(decodedText);

    if (!checkInData) {
      toast.error('Invalid QR code', {
        description: 'This QR code is not a valid ticket check-in code',
      });
      setIsScanning(false);
      return;
    }

    setCurrentCheckInData(checkInData);

    // Validate ticket
    setIsProcessing(true);
    const validation = await validateTicket(
      checkInData.contractAddress,
      checkInData.contractName,
      checkInData.tokenId,
      checkInData.eventDate,
      checkInData.eventTime
    );

    setValidationResult(validation);
    setIsProcessing(false);
    setIsScanning(false);

    // Show validation result
    if (validation.isValid) {
      toast.success('Ticket validated!', {
        description: 'Ready for check-in',
      });
    } else if (validation.isUsed) {
      toast.error('Ticket already used', {
        description: 'This ticket has already been checked in',
      });
    } else if (validation.isExpired) {
      toast.error('Ticket expired', {
        description: 'Event time has passed',
      });
    } else {
      toast.error('Invalid ticket', {
        description: validation.message,
      });
    }
  };

  const handleScanError = (error: string) => {
    console.error('❌ [CheckIn] Scan error:', error);
  };

  const handleConfirmCheckIn = async () => {
    if (!currentCheckInData || !validationResult?.isValid) {
      toast.error('Cannot check in', {
        description: 'Missing required data or ticket is invalid',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const result = await checkInTicket(
        currentCheckInData.contractAddress,
        currentCheckInData.contractName,
        currentCheckInData.tokenId
      );

      if (result.success) {
        toast.success('Check-in successful!', {
          description: `Transaction: ${result.txId?.substring(0, 8)}...`,
        });

        // Find the ticket in mock data to get event name
        const mockTicket = mockTickets.find(ticket => 
          ticket.tokenId === currentCheckInData.tokenId && 
          ticket.contractAddress === currentCheckInData.contractAddress &&
          ticket.contractName === currentCheckInData.contractName
        );

        // Add to history
        const record: CheckInRecord = {
          tokenId: currentCheckInData.tokenId,
          eventName: mockTicket?.eventName || 'Event',
          owner: validationResult.owner,
          timestamp: new Date(),
          status: 'success',
        };

        setCheckInHistory([record, ...checkInHistory]);

        // Send check-in confirmation email
        try {
          // Try to get user email from localStorage
          // In a real system, you would get this from the ticket owner's profile
          const ticketOwnerAddress = validationResult.owner;
          const userEmail = localStorage.getItem(`user-email-${ticketOwnerAddress}`) || 
                           localStorage.getItem('user-email');

          if (userEmail && userEmail.includes('@')) {
            console.log('📧 Sending check-in confirmation to:', userEmail);
            
            const checkInTime = new Date().toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            await sendTicketCheckInConfirmation({
              userEmail,
              eventName: mockTicket?.eventName || 'Event',
              eventDate: currentCheckInData.eventDate,
              eventTime: currentCheckInData.eventTime,
              location: mockTicket?.location || 'Event Venue',
              ticketCount: 1,
              totalAmount: mockTicket?.price || '0',
              contractAddress: currentCheckInData.contractAddress,
              tokenId: currentCheckInData.tokenId,
              checkInTime
            });

            console.log('✅ Check-in confirmation email sent');
          } else {
            console.log('ℹ️ No email found for ticket owner, skipping confirmation');
          }
        } catch (emailError) {
          console.error('❌ Error sending check-in confirmation:', emailError);
          // Don't fail check-in if email fails
        }

        // Reset
        setValidationResult(null);
        setCurrentCheckInData(null);
      } else {
        toast.error('Check-in failed', {
          description: result.message,
        });

        // Add to history as failed
        const mockTicket = mockTickets.find(ticket => 
          ticket.tokenId === currentCheckInData.tokenId && 
          ticket.contractAddress === currentCheckInData.contractAddress &&
          ticket.contractName === currentCheckInData.contractName
        );

        const record: CheckInRecord = {
          tokenId: currentCheckInData.tokenId,
          eventName: mockTicket?.eventName || 'Event',
          owner: validationResult.owner,
          timestamp: new Date(),
          status: result.status === 'used' ? 'already-used' : 'invalid',
        };

        setCheckInHistory([record, ...checkInHistory]);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error('Error', {
        description: errorMessage || 'Failed to process check-in',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelCheckIn = () => {
    setValidationResult(null);
    setCurrentCheckInData(null);
  };

  const statusIcons = {
    success: CheckCircle,
    'already-used': XCircle,
    expired: Clock,
    invalid: AlertTriangle,
  };

  const statusColors = {
    success: 'text-green-500',
    'already-used': 'text-[#e7a4fd]',
    expired: 'text-gray-500',
    invalid: 'text-red-500',
  };

  return (
    <AppLayout>
      <div className="px-4 py-6 md:px-6 md:py-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Ticket Check-In</h1>
          <p className="text-gray-400">Scan and validate event tickets</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Scanner & Validation */}
          <div className="space-y-6">
            {/* Scan Button */}
            {!validationResult && (
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
            {validationResult && currentCheckInData && (
              <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6">
                {/* Status Header */}
                <div className="flex items-center gap-4 mb-6">
                  {validationResult.isValid ? (
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                  ) : validationResult.isUsed ? (
                    <div className="w-16 h-16 bg-[#e7a4fd]/10 rounded-full flex items-center justify-center">
                      <XCircle className="w-8 h-8 text-[#e7a4fd]" />
                    </div>
                  ) : validationResult.isExpired ? (
                    <div className="w-16 h-16 bg-gray-500/10 rounded-full flex items-center justify-center">
                      <Clock className="w-8 h-8 text-gray-500" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {validationResult.isValid
                        ? 'Valid Ticket'
                        : validationResult.isUsed
                        ? 'Already Used'
                        : validationResult.isExpired
                        ? 'Expired'
                        : 'Invalid Ticket'}
                    </h3>
                    <p className="text-gray-400 text-sm">{validationResult.message}</p>
                  </div>
                </div>

                {/* Ticket Details */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm">
                    <Hash className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Token ID:</span>
                    <span className="text-white font-mono">#{currentCheckInData.tokenId}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Owner:</span>
                    <span className="text-white font-mono text-xs">
                      {validationResult.owner.slice(0, 8)}...{validationResult.owner.slice(-6)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Event Date:</span>
                    <span className="text-white">{currentCheckInData.eventDate}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Event Time:</span>
                    <span className="text-white">{currentCheckInData.eventTime}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {validationResult.isValid ? (
                    <>
                      <button
                        onClick={handleCancelCheckIn}
                        className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-gray-800 text-white rounded-xl hover:border-gray-700 transition-colors"
                        disabled={isProcessing}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmCheckIn}
                        className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                        disabled={isProcessing}
                      >
                        {isProcessing ? 'Processing...' : 'Confirm Check-In'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleCancelCheckIn}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 text-white rounded-xl hover:border-gray-700 transition-colors"
                    >
                      Scan Another Ticket
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-1">Total Check-ins</p>
                <p className="text-2xl font-bold text-white">
                  {checkInHistory.filter((r) => r.status === 'success').length}
                </p>
              </div>
              <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-1">Failed</p>
                <p className="text-2xl font-bold text-[#e7a4fd]">
                  {checkInHistory.filter((r) => r.status !== 'success').length}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Check-In History */}
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Check-In History</h3>
              <Ticket className="w-5 h-5 text-gray-400" />
            </div>

            {checkInHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-[#0A0A0A] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Ticket className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-400">No check-ins yet</p>
                <p className="text-gray-500 text-sm mt-1">Scan tickets to see history here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {checkInHistory.map((record, index) => {
                  const StatusIcon = statusIcons[record.status];
                  const statusColor = statusColors[record.status];

                  return (
                    <div
                      key={index}
                      className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-4"
                    >
                      <div className="flex items-start gap-3">
                        <StatusIcon className={`w-5 h-5 ${statusColor} flex-shrink-0 mt-0.5`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-white font-semibold text-sm">
                              Token #{record.tokenId}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {record.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                          <p className="text-gray-400 text-xs font-mono truncate">
                            {record.owner.slice(0, 12)}...{record.owner.slice(-8)}
                          </p>
                          <p className={`text-xs mt-1 ${statusColor} font-medium`}>
                            {record.status === 'success'
                              ? 'Checked In'
                              : record.status === 'already-used'
                              ? 'Already Used'
                              : record.status === 'expired'
                              ? 'Expired'
                              : 'Invalid'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {isScanning && (
        <QRScanner
          isScanning={isScanning}
          onScanSuccess={handleScanSuccess}
          onScanError={handleScanError}
          onClose={() => setIsScanning(false)}
        />
      )}
    </AppLayout>
  );
};

export default CheckIn;