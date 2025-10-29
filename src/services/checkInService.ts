/**
 * Check-In Service
 * Handles ticket validation and check-in operations using real smart contract functions
 */

import { ethers } from 'ethers';
import EventTicketABI from '@/contracts/EventTicket.json';

export interface CheckInResult {
  success: boolean;
  txHash?: string;
  message: string;
  status: 'success' | 'already_used' | 'expired' | 'cancelled' | 'invalid' | 'error';
}

export interface TicketValidationResult {
  isValid: boolean;
  isUsed: boolean;
  isExpired: boolean;
  isCancelled: boolean;
  owner: string;
  eventDate: Date;
  message: string;
  canCheckIn: boolean;
}

export interface CheckInData {
  contractAddress: string;
  tokenId: number;
  eventDate: string;
  eventTime: string;
}

export class CheckInService {
  private provider: ethers.Provider | null = null;
  private signer: ethers.Signer | null = null;

  constructor() {
    this.initializeProvider();
  }

  private async initializeProvider() {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      try {
        this.signer = await this.provider.getSigner();
      } catch (error) {
        console.error('Failed to get signer:', error);
      }
    }
  }

  /**
   * Get contract instance (read-only)
   */
  private getContract(contractAddress: string): ethers.Contract {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    return new ethers.Contract(contractAddress, EventTicketABI.abi, this.provider);
  }

  /**
   * Get contract instance with signer (for transactions)
   */
  private async getContractWithSigner(contractAddress: string): Promise<ethers.Contract> {
    if (!this.signer) {
      await this.initializeProvider();
      if (!this.signer) {
        throw new Error('Signer not available. Please connect wallet.');
      }
    }
    return new ethers.Contract(contractAddress, EventTicketABI.abi, this.signer);
  }

  /**
   * Validate ticket for check-in
   * Checks all requirements before allowing check-in
   */
  async validateTicket(
    contractAddress: string,
    tokenId: number
  ): Promise<TicketValidationResult> {
    try {
      const contract = this.getContract(contractAddress);

      // Get ticket and event information
      const [
        owner,
        isUsed,
        eventDate,
        eventCancelled,
        eventName
      ] = await Promise.all([
        contract.ownerOf(tokenId).catch(() => ethers.ZeroAddress),
        contract.isTicketUsed(tokenId),
        contract.eventDate(),
        contract.eventCancelled(),
        contract.eventName()
      ]);

      // Check if token exists (owner is not zero address)
      if (owner === ethers.ZeroAddress) {
        return {
          isValid: false,
          isUsed: false,
          isExpired: false,
          isCancelled: false,
          owner: '',
          eventDate: new Date(),
          message: 'Ticket not found',
          canCheckIn: false
        };
      }

      const eventDateTime = new Date(Number(eventDate) * 1000);
      const now = new Date();

      // Check if event is cancelled
      if (eventCancelled) {
        return {
          isValid: false,
          isUsed,
          isExpired: false,
          isCancelled: true,
          owner,
          eventDate: eventDateTime,
          message: 'Event has been cancelled',
          canCheckIn: false
        };
      }

      // Check if ticket is already used
      if (isUsed) {
        return {
          isValid: false,
          isUsed: true,
          isExpired: false,
          isCancelled: false,
          owner,
          eventDate: eventDateTime,
          message: 'Ticket has already been used',
          canCheckIn: false
        };
      }

      // Check if event has ended
      const isExpired = now > eventDateTime;
      if (isExpired) {
        return {
          isValid: false,
          isUsed: false,
          isExpired: true,
          isCancelled: false,
          owner,
          eventDate: eventDateTime,
          message: 'Event has already ended',
          canCheckIn: false
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
          isCancelled: false,
          owner,
          eventDate: eventDateTime,
          message: `Check-in opens ${earlyCheckInHours} hours before event`,
          canCheckIn: false
        };
      }

      // Ticket is valid for check-in
      return {
        isValid: true,
        isUsed: false,
        isExpired: false,
        isCancelled: false,
        owner,
        eventDate: eventDateTime,
        message: 'Ticket is valid for check-in',
        canCheckIn: true
      };

    } catch (error: any) {
      console.error('Error validating ticket:', error);
      return {
        isValid: false,
        isUsed: false,
        isExpired: false,
        isCancelled: false,
        owner: '',
        eventDate: new Date(),
        message: error.message || 'Validation failed',
        canCheckIn: false
      };
    }
  }

  /**
   * Check-in ticket (mark as used)
   * Calls the smart contract useTicket function
   */
  async checkInTicket(
    contractAddress: string,
    tokenId: number
  ): Promise<CheckInResult> {
    try {
      // First validate the ticket
      const validation = await this.validateTicket(contractAddress, tokenId);
      
      if (!validation.canCheckIn) {
        return {
          success: false,
          message: validation.message,
          status: validation.isUsed ? 'already_used' : 
                  validation.isExpired ? 'expired' : 
                  validation.isCancelled ? 'cancelled' : 'invalid'
        };
      }

      // Get contract with signer for transaction
      const contract = await this.getContractWithSigner(contractAddress);

      // Check if current user is the owner
      const currentUser = await this.signer!.getAddress();
      if (validation.owner.toLowerCase() !== currentUser.toLowerCase()) {
        return {
          success: false,
          message: 'Only ticket owner can check-in',
          status: 'invalid'
        };
      }

      // Execute check-in transaction
      const tx = await contract.useTicket(tokenId);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        return {
          success: true,
          txHash: receipt.hash,
          message: 'Check-in successful',
          status: 'success'
        };
      } else {
        return {
          success: false,
          message: 'Transaction failed',
          status: 'error'
        };
      }

    } catch (error: any) {
      console.error('Error checking in ticket:', error);
      
      // Parse common error messages
      let message = 'Check-in failed';
      let status: CheckInResult['status'] = 'error';

      if (error.message.includes('already used')) {
        message = 'Ticket has already been used';
        status = 'already_used';
      } else if (error.message.includes('already ended')) {
        message = 'Event has already ended';
        status = 'expired';
      } else if (error.message.includes('cancelled')) {
        message = 'Event has been cancelled';
        status = 'cancelled';
      } else if (error.message.includes('Only token owner')) {
        message = 'Only ticket owner can check-in';
        status = 'invalid';
      } else if (error.message.includes('rejected')) {
        message = 'Transaction was rejected';
        status = 'error';
      }

      return {
        success: false,
        message,
        status
      };
    }
  }

  /**
   * Get ticket information
   */
  async getTicketInfo(contractAddress: string, tokenId: number) {
    try {
      const contract = this.getContract(contractAddress);

      const [
        owner,
        isUsed,
        eventName,
        eventDate,
        eventVenue,
        venueAddress,
        eventCancelled,
        ticketPrice
      ] = await Promise.all([
        contract.ownerOf(tokenId).catch(() => ethers.ZeroAddress),
        contract.isTicketUsed(tokenId),
        contract.eventName(),
        contract.eventDate(),
        contract.eventVenue(),
        contract.venueAddress(),
        contract.eventCancelled(),
        contract.ticketPrice()
      ]);

      return {
        tokenId,
        owner,
        isUsed,
        eventName,
        eventDate: new Date(Number(eventDate) * 1000),
        eventVenue,
        venueAddress,
        eventCancelled,
        ticketPrice: ethers.formatEther(ticketPrice),
        contractAddress
      };
    } catch (error: any) {
      console.error('Error getting ticket info:', error);
      throw new Error(error.message || 'Failed to get ticket information');
    }
  }

  /**
   * Parse QR code data for check-in
   */
  parseCheckInQR(qrData: string): CheckInData | null {
    try {
      // Expected format: "checkin:contractAddress:tokenId:eventDate:eventTime"
      if (!qrData.startsWith('checkin:')) {
        return null;
      }

      const parts = qrData.substring(8).split(':');
      if (parts.length < 4) {
        return null;
      }

      const [contractAddress, tokenIdStr, eventDate, eventTime] = parts;
      const tokenId = parseInt(tokenIdStr);

      if (!contractAddress || isNaN(tokenId) || !eventDate || !eventTime) {
        return null;
      }

      // Validate contract address format
      if (!ethers.isAddress(contractAddress)) {
        return null;
      }

      return {
        contractAddress,
        tokenId,
        eventDate,
        eventTime
      };
    } catch (error) {
      console.error('Error parsing check-in QR:', error);
      return null;
    }
  }

  /**
   * Generate check-in QR data
   */
  generateCheckInQR(contractAddress: string, tokenId: number, eventDate: string, eventTime: string): string {
    return `checkin:${contractAddress}:${tokenId}:${eventDate}:${eventTime}`;
  }
}

// Export singleton instance
export const checkInService = new CheckInService();