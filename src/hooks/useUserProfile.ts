/**
 * Hook to fetch user profile from UserProfile contract
 * Priority: EO Profile (if exists) > User Profile
 * Combines on-chain data with off-chain IPFS metadata
 */

import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import UserProfileABI from '@/contracts/UserProfile.json';
import { getContracts } from '@/config/contracts';
import { isOrganizerRegistered, getOrganizerProfile } from '@/services/eventOrganizerContract';

interface UserProfileData {
  // On-chain data
  profileUri: string;
  contentHash: string;
  joinedDate: number;
  totalTickets: number;
  totalEventsAttended: number;
  averageRating: number;
  exists: boolean;
  
  // Off-chain IPFS metadata
  username: string;
  bio: string;
  avatar: string;
  email: string;
  
  // Computed/derived data
  isEventOrganizer: boolean;
  isVerified: boolean;
  eventsCreated: number;
  
  // Profile source indicator
  profileSource?: 'eo' | 'user';
}

export function useUserProfile(address: string | undefined) {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetadataFromIPFS = async (profileUri: string) => {
    try {
      let ipfsHash = profileUri;
      
      if (profileUri.startsWith('ipfs://')) {
        ipfsHash = profileUri.replace('ipfs://', '');
      } else if (profileUri.startsWith('https://gateway.pinata.cloud/ipfs/')) {
        ipfsHash = profileUri.replace('https://gateway.pinata.cloud/ipfs/', '');
      } else if (profileUri.startsWith('http')) {
        // Already a full URL, use as is
        ipfsHash = profileUri;
      } else if (!profileUri.match(/^(Qm[a-zA-Z0-9]{44}|baf[a-zA-Z0-9]+)$/)) {
        console.warn('⚠️ Invalid profileUri format:', profileUri);
        return null;
      }
      
      // Multiple gateway fallbacks
      const gateways = ipfsHash.startsWith('http') ? [ipfsHash] : [
        `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        `https://ipfs.io/ipfs/${ipfsHash}`,
        `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
      ];

      for (const gateway of gateways) {
        try {

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

          const response = await fetch(gateway, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
            },
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const metadata = await response.json();

            return metadata;
          } else {
            console.warn(`⚠️ Gateway ${gateway} returned status:`, response.status);
          }
        } catch (err: any) {
          console.warn(`⚠️ Gateway ${gateway} failed:`, err.message);
          continue;
        }
      }
      
      console.error('❌ All IPFS gateways failed');
      return null;
    } catch (err) {
      console.error('❌ Failed to fetch IPFS metadata:', err);
      return null;
    }
  };

  const fetchProfile = useCallback(async () => {
    if (!address) {
      setProfile(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const contracts = getContracts();
      const userProfileAddress = contracts.UserProfile;

      if (!userProfileAddress) {
        console.warn('⚠️ UserProfile contract not configured');
        setProfile({
          profileUri: '',
          contentHash: '',
          username: `User_${address.slice(0, 6)}`,
          bio: '',
          avatar: '',
          email: '',
          isEventOrganizer: false,
          isVerified: false,
          joinedDate: Date.now() / 1000,
          totalTickets: 0,
          totalEventsAttended: 0,
          averageRating: 0,
          eventsCreated: 0,
          exists: false,
        });
        return;
      }

      const provider = new BrowserProvider(window.ethereum as any);
      const userContract = new Contract(userProfileAddress, UserProfileABI.abi, provider) as any;

      // Check if user is Event Organizer FIRST - use same method as Settings
      let isEO = false;
      let eoProfileData: any = null;
      let eoMetadata: any = null;
      
      try {

        isEO = await isOrganizerRegistered(address);

        if (isEO) {

          // Use the same method as Settings page
          const eoProfile = await getOrganizerProfile(address);

          if (eoProfile && eoProfile.metadata) {
            eoMetadata = eoProfile.metadata;

            eoProfileData = {
              profileUri: eoProfile.profileUri,
              contentHash: eoProfile.contentHash || '',
              registrationDate: Number(eoProfile.registrationDate || Date.now() / 1000),
              isVerified: eoProfile.isVerified || false,
              totalEvents: Number(eoProfile.totalEvents || 0),
              totalTicketsSold: Number(eoProfile.totalTicketsSold || 0),
              averageRating: Number(eoProfile.averageRating || 0),
            };

          } else {
            console.warn('⚠️ No EO profile metadata found');
          }
        }
      } catch (err) {
        console.warn('⚠️ Failed to check EO status using Settings method:', err);
      }

      // If user has EO profile, use it as PRIMARY profile
      if (isEO && eoProfileData && eoMetadata) {

        // Still get user profile data for tickets/events stats
        let userStats = {
          totalTickets: 0,
          totalEventsAttended: 0,
        };
        
        try {
          const userProfileData = await userContract.getProfile(address);
          const [, , , userTotalTickets, userTotalEventsAttended] = userProfileData;
          userStats = {
            totalTickets: Number(userTotalTickets),
            totalEventsAttended: Number(userTotalEventsAttended),
          };
        } catch (err) {
          console.warn('⚠️ Could not fetch user stats:', err);
        }

        setProfile({
          // Use EO profile data
          profileUri: eoProfileData.profileUri,
          contentHash: eoProfileData.contentHash,
          joinedDate: eoProfileData.registrationDate,
          averageRating: eoProfileData.averageRating,
          // Use EO metadata
          username: eoMetadata.eoName || eoMetadata.organizationName || `EO_${address.slice(0, 6)}`,
          bio: eoMetadata.description || '',
          avatar: eoMetadata.logo || eoMetadata.logoUrl || '', // Try both logo fields
          email: eoMetadata.email || '',
          // EO specific
          isEventOrganizer: true,
          isVerified: eoProfileData.isVerified,
          eventsCreated: eoProfileData.totalEvents,
          // User stats
          totalTickets: userStats.totalTickets,
          totalEventsAttended: userStats.totalEventsAttended,
          exists: true,
          profileSource: 'eo',
        });

        return;
      }

      // If NOT EO or no EO profile, use USER profile

      // Get on-chain user profile data
      const profileData = await userContract.getProfile(address);

      const [
        profileUri,
        contentHash,
        joinedDate,
        totalTickets,
        totalEventsAttended,
        averageRating
      ] = profileData;

      // Fetch user IPFS metadata if profileUri exists
      let userMetadata: any = null;
      if (profileUri && profileUri.length > 0) {
        userMetadata = await fetchMetadataFromIPFS(profileUri);

      }

      setProfile({
        profileUri,
        contentHash,
        username: userMetadata?.username || `User_${address.slice(0, 6)}`,
        bio: userMetadata?.bio || '',
        avatar: userMetadata?.avatar || '',
        email: userMetadata?.email || '',
        isEventOrganizer: false,
        isVerified: false,
        joinedDate: Number(joinedDate),
        totalTickets: Number(totalTickets),
        totalEventsAttended: Number(totalEventsAttended),
        averageRating: Number(averageRating),
        eventsCreated: 0,
        exists: true,
        profileSource: 'user',
      });
    } catch (err: any) {
      console.error('❌ Error fetching user profile:', err);
      setError(err.message || 'Failed to fetch profile');
      
      // Fallback to basic profile
      setProfile({
        profileUri: '',
        contentHash: '',
        username: `User_${address.slice(0, 6)}`,
        bio: '',
        avatar: '',
        email: '',
        isEventOrganizer: false,
        isVerified: false,
        joinedDate: Date.now() / 1000,
        totalTickets: 0,
        totalEventsAttended: 0,
        averageRating: 0,
        eventsCreated: 0,
        exists: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const refreshProfile = useCallback(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    refreshProfile,
  };
}
