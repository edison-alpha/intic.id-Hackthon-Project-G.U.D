/**
 * Custom Hooks for Event Ticket Operations
 * Provides React hooks for ticket minting, validation, and management
 */

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { eventTicketService, type MintTicketParams, type TicketInfo } from '@/services/contracts/eventTicketService';
import { userProfileService } from '@/services/contracts/userProfileService';

// ==================== TICKET MINTING ====================

/**
 * Hook to mint a new ticket
 */
export function useMintTicket(eventContractAddress: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<number | null>(null);

  const mintTicket = useCallback(async (
    params: Omit<MintTicketParams, 'to'>,
    signer: ethers.Signer
  ) => {
    setLoading(true);
    setError(null);
    setTxHash(null);
    setTokenId(null);

    try {
      const userAddress = await signer.getAddress();
      await eventTicketService.initialize(eventContractAddress, signer);
      
      const result = await eventTicketService.mintTicket({
        ...params,
        to: userAddress,
      });

      setTxHash(result.transactionHash);
      setTokenId(result.tokenId);
      
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to mint ticket');
      console.error('Mint ticket error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [eventContractAddress]);

  return { mintTicket, loading, error, txHash, tokenId };
}

// ==================== TICKET DETAILS ====================

/**
 * Hook to get ticket information
 */
export function useTicketDetails(eventContractAddress: string, tokenId: number | null) {
  const [ticket, setTicket] = useState<TicketInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    if (!tokenId) return;

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const ticketInfo = await eventTicketService.getTicketInfo(
        tokenId,
        eventContractAddress,
        provider
      );
      setTicket(ticketInfo);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching ticket:', err);
    } finally {
      setLoading(false);
    }
  }, [eventContractAddress, tokenId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  return { ticket, loading, error, refetch: fetchTicket };
}

// ==================== MY TICKETS ====================

/**
 * Hook to get all tickets owned by user for a specific event
 */
export function useMyEventTickets(eventContractAddress: string, userAddress?: string) {
  const [tickets, setTickets] = useState<number[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    if (!userAddress || !eventContractAddress) return;

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Get balance
      const ticketBalance = await eventTicketService.getBalance(
        userAddress,
        eventContractAddress,
        provider
      );
      setBalance(ticketBalance);

      // Note: To get actual token IDs, we'd need to query events or use enumerable
      // For now, we return balance count
      // In production, implement proper token enumeration or use The Graph
      
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [eventContractAddress, userAddress]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return { tickets, balance, loading, error, refetch: fetchTickets };
}

// ==================== ALL MY TICKETS (FROM USERPROFILE) ====================

/**
 * Hook to get all tickets from user profile
 */
export function useMyAllTickets(userAddress?: string) {
  const [tickets, setTickets] = useState<Array<{ticketId: number, eventId: number}>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    if (!userAddress) return;

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const userTickets = await userProfileService.getUserTickets(userAddress, provider);
      setTickets(userTickets);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching all tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return { tickets, loading, error, refetch: fetchTickets };
}

// ==================== TICKET USAGE ====================

/**
 * Hook to use/validate a ticket
 */
export function useTicketValidation(eventContractAddress: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const validateTicket = useCallback(async (
    tokenId: number,
    signer: ethers.Signer
  ) => {
    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      await eventTicketService.initialize(eventContractAddress, signer);
      const result = await eventTicketService.useTicket(tokenId);

      setTxHash(result.transactionHash);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to validate ticket');
      console.error('Validate ticket error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [eventContractAddress]);

  return { validateTicket, loading, error, txHash };
}

// ==================== TICKET TRANSFER ====================

/**
 * Hook to transfer ticket to another address
 */
export function useTicketTransfer(eventContractAddress: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const transferTicket = useCallback(async (
    to: string,
    tokenId: number,
    signer: ethers.Signer
  ) => {
    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const from = await signer.getAddress();
      await eventTicketService.initialize(eventContractAddress, signer);
      const result = await eventTicketService.transferTicket(from, to, tokenId);

      setTxHash(result.transactionHash);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to transfer ticket');
      console.error('Transfer ticket error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [eventContractAddress]);

  return { transferTicket, loading, error, txHash };
}

// ==================== EVENT INFO ====================

/**
 * Hook to get event info from ticket contract
 */
export function useEventInfoFromTicket(eventContractAddress: string) {
  const [eventInfo, setEventInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEventInfo = useCallback(async () => {
    if (!eventContractAddress) return;

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const info = await eventTicketService.getEventInfo(eventContractAddress, provider);
      setEventInfo(info);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching event info:', err);
    } finally {
      setLoading(false);
    }
  }, [eventContractAddress]);

  useEffect(() => {
    fetchEventInfo();
  }, [fetchEventInfo]);

  return { eventInfo, loading, error, refetch: fetchEventInfo };
}
