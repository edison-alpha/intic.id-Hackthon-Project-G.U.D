/**
 * Custom Hooks for Event Organizer Operations
 * Provides React hooks for organizer registration and event management
 */

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { eventOrganizerService, type OrganizerInfo } from '@/services/contracts/eventOrganizerService';

// ==================== ORGANIZER REGISTRATION ====================

/**
 * Hook to register as organizer
 */
export function useRegisterOrganizer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const registerOrganizer = useCallback(async (
    name: string,
    profileUri: string,
    contentHash: string,
    signer: ethers.Signer
  ) => {
    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      await eventOrganizerService.initialize(signer);
      const result = await eventOrganizerService.registerOrganizer(
        name,
        profileUri,
        contentHash
      );

      setTxHash(result.transactionHash);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to register organizer');
      console.error('Register organizer error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { registerOrganizer, loading, error, txHash };
}

// ==================== CHECK ORGANIZER STATUS ====================

/**
 * Hook to check if address is registered organizer
 */
export function useIsOrganizer(address?: string) {
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkOrganizer = useCallback(async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const result = await eventOrganizerService.isRegisteredOrganizer(address, provider);
      setIsOrganizer(result);
    } catch (err: any) {
      setError(err.message);
      console.error('Error checking organizer status:', err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    checkOrganizer();
  }, [checkOrganizer]);

  return { isOrganizer, loading, error, refetch: checkOrganizer };
}

// ==================== ORGANIZER INFO ====================

/**
 * Hook to get organizer information
 */
export function useOrganizerInfo(address?: string) {
  const [organizer, setOrganizer] = useState<OrganizerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizer = useCallback(async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const info = await eventOrganizerService.getOrganizer(address, provider);
      setOrganizer(info);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching organizer:', err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchOrganizer();
  }, [fetchOrganizer]);

  return { organizer, loading, error, refetch: fetchOrganizer };
}

// ==================== ORGANIZER EVENTS ====================

/**
 * Hook to get all events created by organizer
 */
export function useOrganizerEvents(address?: string) {
  const [eventIds, setEventIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const events = await eventOrganizerService.getOrganizerEvents(address, provider);
      setEventIds(events);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching organizer events:', err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { eventIds, loading, error, refetch: fetchEvents };
}

// ==================== UPDATE ORGANIZER ====================

/**
 * Hook to update organizer information
 */
export function useUpdateOrganizer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const updateOrganizer = useCallback(async (
    name: string,
    profileUri: string,
    contentHash: string,
    signer: ethers.Signer
  ) => {
    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      await eventOrganizerService.initialize(signer);
      const result = await eventOrganizerService.updateOrganizer(
        name,
        profileUri,
        contentHash
      );

      setTxHash(result.transactionHash);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to update organizer');
      console.error('Update organizer error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateOrganizer, loading, error, txHash };
}
