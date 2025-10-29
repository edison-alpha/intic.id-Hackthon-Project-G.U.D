import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Calendar, MapPin, Users, ArrowLeft, BadgeCheck, ExternalLink, Star, Award, TrendingUp, Clock, Loader2, AlertCircle } from 'lucide-react';
import STXIcon from '@/components/STXIcon';
import { getOrganizerProfile, getUpcomingEventsByOrganizer, getPastEventsByOrganizer, getMetadataFromProfileUri, getCompleteOrganizerData } from '@/services/eventOrganizerContract';
import { fetchCompleteEventDetails } from '@/services/eventBrowseContract';
import { toast } from 'sonner';

const EOProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'events' | 'about' | 'reviews'>('events');
  const [eoData, setEoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);

  // Fetch EO data from blockchain
  useEffect(() => {
    if (id) {
      loadEOProfile(id);
    }
  }, [id]);

  const loadEOProfile = async (address: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get organizer profile from blockchain
      const profile = await getOrganizerProfile(address);

      if (!profile) {
        throw new Error('Event Organizer not found');
      }

      // Example: Get metadata directly from profileUri
      // This shows how to fetch data directly from IPFS using profileUri
      if (profile.profileUri) {

        try {
          const directMetadata = await getMetadataFromProfileUri(profile.profileUri);

          // You can use directMetadata here for additional processing
          // Example: directMetadata.name, directMetadata.avatar, etc.
        } catch (error) {
          console.warn('⚠️ Failed to fetch metadata directly from profileUri:', error);
        }
      }

      // Alternative: Get complete data using the new function
      // This combines blockchain data + IPFS metadata in one call

      const completeData = await getCompleteOrganizerData(address);

      // Get upcoming and past events using new smart contract functions
      console.log('🔍 Fetching events for organizer:', address);
      let upcomingEventsData = await getUpcomingEventsByOrganizer(address);
      console.log('📅 Upcoming events from contract:', upcomingEventsData.length);
      
      let pastEventsData = await getPastEventsByOrganizer(address);
      console.log('📜 Past events from contract:', pastEventsData.length);

      // Fallback: If no events returned, get all events and filter manually
      if (upcomingEventsData.length === 0 && pastEventsData.length === 0) {
        console.log('⚠️ No events from specific functions, trying getAllDeployedEventsFromBlockchain...');
        const { getAllDeployedEventsFromBlockchain } = await import('@/services/eventOrganizerContract');
        const allEvents = await getAllDeployedEventsFromBlockchain();
        console.log('📋 Total deployed events:', allEvents.length);
        
        // Filter events by organizer address
        const organizerEvents = allEvents.filter(event => {
          const eventOrganizer = event.organizer?.toLowerCase();
          const targetAddress = address.toLowerCase();
          return eventOrganizer === targetAddress;
        });
        console.log('✅ Events for this organizer:', organizerEvents.length);
        
        // Get current timestamp (in seconds)
        const nowTimestamp = Math.floor(Date.now() / 1000);
        
        // Separate into upcoming and past based on event details
        const eventDetailsPromises = organizerEvents.map(async (event) => {
          try {
            const details = await fetchCompleteEventDetails(event.eventContract);
            if (!details) return null;
            
            return {
              ...event,
              eventDate: Number(details.eventDate || 0),
              details,
            };
          } catch (error) {
            console.error('Error fetching event details:', error);
            return null;
          }
        });
        
        const eventsWithDetails = (await Promise.all(eventDetailsPromises)).filter(e => e !== null);
        
        // Split into upcoming and past
        // Upcoming: future events that are not cancelled or ended
        upcomingEventsData = eventsWithDetails.filter(event => {
          const eventTimestamp = event.eventDate;
          const details = event.details;
          const isCancelled = details.eventCancelled || details.isCancelled;
          const isEnded = details.status === 'Ended' || details.ended;
          
          // Upcoming = future date AND not cancelled AND not ended
          return eventTimestamp >= nowTimestamp && !isCancelled && !isEnded;
        });
        
        // Past: past events OR cancelled OR ended (regardless of date)
        pastEventsData = eventsWithDetails.filter(event => {
          const eventTimestamp = event.eventDate;
          const details = event.details;
          const isCancelled = details.eventCancelled || details.isCancelled;
          const isEnded = details.status === 'Ended' || details.ended;
          
          // Past = past date OR cancelled OR ended
          return eventTimestamp < nowTimestamp || isCancelled || isEnded;
        });
        
        console.log('✅ Fallback - Upcoming:', upcomingEventsData.length, 'Past:', pastEventsData.length);
      }

      // Fetch live details for upcoming events
      console.log('🔄 Fetching live details for upcoming events...');
      const upcomingEventsWithDetails = await Promise.all(
        upcomingEventsData.map(async (event: any, index: number) => {
          try {
            // If event already has details from fallback, use it
            if (event.details) {
              const liveData = event.details;
              return {
                ...event,
                ...liveData,
                id: event.eventContract,
                eventId: event.eventId || 0,
                eventDate: Number(liveData.eventDate || 0),
                attendees: liveData.minted || liveData.total - liveData.available || 0,
              };
            }
            
            console.log(`[${index + 1}/${upcomingEventsData.length}] Fetching: ${event.eventContract}`);
            const liveData = await fetchCompleteEventDetails(event.eventContract);
            
            if (!liveData) {
              console.error(`❌ [${index + 1}/${upcomingEventsData.length}] fetchCompleteEventDetails returned null for:`, event.eventContract);
              return null;
            }

            if (liveData) {
              // eventDate from blockchain is already in seconds (timestamp)
              const eventTimestamp = Number(liveData.eventDate || 0);
              
              // Transform event data to match UI requirements
              const transformedEvent = {
                ...event,
                ...liveData,
                id: event.eventContract,
                eventId: event.eventId,
                eventDate: eventTimestamp, // Keep timestamp for filtering
                // liveData already has these fields from fetchCompleteEventDetails
                // title, image, date (formatted), time, location, price, available, total, etc.
                // Just ensure attendees is mapped
                attendees: liveData.minted || liveData.total - liveData.available || 0,
              };

              console.log(`✅ [${index + 1}/${upcomingEventsData.length}] Success:`, transformedEvent.title);
              return transformedEvent;
            }
            return null;
          } catch (err) {
            console.error(`❌ [${index + 1}/${upcomingEventsData.length}] Error fetching event details:`, err);
            console.error('   Contract address:', event.eventContract);
            console.error('   Error details:', err);
            return null;
          }
        })
      );

      // Fetch past events details
      console.log('🔄 Fetching live details for past events...');
      const pastEventsWithDetails = await Promise.all(
        pastEventsData.map(async (event: any) => {
          try {
            // If event already has details from fallback, use it
            if (event.details) {
              const liveData = event.details;
              return {
                ...event,
                ...liveData,
                id: event.eventContract,
                eventId: event.eventId || 0,
                eventDate: Number(liveData.eventDate || 0),
                attendees: liveData.minted || liveData.ticketsSold || 0,
              };
            }
            
            const liveData = await fetchCompleteEventDetails(event.eventContract);
            if (!liveData) return null;
            
            return {
              ...event,
              ...liveData,
              id: event.eventContract,
              eventId: event.eventId,
              eventDate: Number(liveData.eventDate || 0),
              attendees: liveData.minted || liveData.ticketsSold || 0,
            };
          } catch (err) {
            console.error(`❌ Error fetching past event:`, err);
            return null;
          }
        })
      );

      const upcoming = upcomingEventsWithDetails.filter(event => event !== null).sort((a, b) => {
        return Number(a.eventDate || 0) - Number(b.eventDate || 0);
      });
      
      const past = pastEventsWithDetails.filter(event => event !== null).sort((a, b) => {
        return Number(b.eventDate || 0) - Number(a.eventDate || 0);
      });
      
      // Additional filter: Move cancelled and ended events from upcoming to past
      const nowTimestamp = Math.floor(Date.now() / 1000);
      const finalUpcoming = upcoming.filter(event => {
        const isCancelled = event.eventCancelled || event.isCancelled;
        const isEnded = event.status === 'Ended' || event.ended;
        const isPast = Number(event.eventDate || 0) < nowTimestamp;
        
        // Keep in upcoming only if: not cancelled, not ended, and future date
        return !isCancelled && !isEnded && !isPast;
      });
      
      // Collect events that should be in past: cancelled, ended, or past date
      const movedToPast = upcoming.filter(event => {
        const isCancelled = event.eventCancelled || event.isCancelled;
        const isEnded = event.status === 'Ended' || event.ended;
        const isPast = Number(event.eventDate || 0) < nowTimestamp;
        
        return isCancelled || isEnded || isPast;
      });
      
      // Combine past events with moved events
      const finalPast = [...past, ...movedToPast].sort((a, b) => {
        return Number(b.eventDate || 0) - Number(a.eventDate || 0);
      });
      
      console.log('✅ Final results (after re-filtering):');
      console.log('   Upcoming events:', finalUpcoming.length, finalUpcoming.map(e => e.title));
      console.log('   Past events:', finalPast.length, finalPast.map(e => e.title));
      console.log('   Cancelled/Ended moved to past:', movedToPast.length, movedToPast.map(e => `${e.title} (${e.eventCancelled ? 'Cancelled' : e.ended ? 'Ended' : 'Past'})`));

      // Helper function to convert IPFS URLs to gateway URLs with fallbacks
      const getGatewayUrl = (url: string | undefined | null): string | null => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        if (url.startsWith('ipfs://')) {
          // Convert ipfs:// to gateway URL
          return `https://gateway.pinata.cloud/ipfs/${url.replace('ipfs://', '')}`;
        }
        // If it's just a CID without the prefix, treat it as ipfs
        if (url.match(/^Qm[a-zA-Z0-9]{44}$/)) {
          return `https://gateway.pinata.cloud/ipfs/${url}`;
        }
        return null;
      };

      // Fetch and parse IPFS metadata from profileUri
      let ipfsMetadata: any = {};
      
      if (profile.profileUri) {

        try {
          const fetchedMetadata = await getMetadataFromProfileUri(profile.profileUri);

          ipfsMetadata = fetchedMetadata || {};
        } catch (error) {
          console.warn('⚠️ Failed to fetch IPFS metadata, using fallback:', error);
          // Fallback: try to parse metadata from blockchain if available
          ipfsMetadata = profile.metadata || {};
          
          // If metadata is still empty, log warning but continue
          if (Object.keys(ipfsMetadata).length === 0) {
            console.warn('⚠️ No metadata available from blockchain either');
          }
        }
      } else {
        console.warn('⚠️ No profileUri found in blockchain data');
        ipfsMetadata = profile.metadata || {};
      }

      // Transform data to match component interface with enhanced fallbacks
      const transformedData = {
        id: address,
        // Name with priority: eoName > organizationName > name
        name: ipfsMetadata.eoName || 
              ipfsMetadata.organizationName || 
              ipfsMetadata.name || 
              `Event Organizer ${address.substring(0, 8)}`,
        
        // Avatar/Logo with proper IPFS handling
        avatar: getGatewayUrl(ipfsMetadata.logo || ipfsMetadata.avatar || ipfsMetadata.profileImage) || 
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`,
        
        // Cover image with proper IPFS handling
        coverImage: getGatewayUrl(ipfsMetadata.bannerImage || ipfsMetadata.coverImage || ipfsMetadata.banner) || 
          'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
        
        // Blockchain data
        verified: profile.isVerified,
        eventsCount: profile.totalEvents,
        totalTickets: profile.totalTicketsSold,
        rating: profile.averageRating > 0 ? (profile.averageRating / 10) : 0, // Convert from 0-50 to 0-5
        
        // Reviews count from metadata or default to 0
        reviewsCount: ipfsMetadata.reviewsCount || 
                      (Array.isArray(ipfsMetadata.reviews) ? ipfsMetadata.reviews.length : 0) || 
                      (Array.isArray(ipfsMetadata.testimonials) ? ipfsMetadata.testimonials.length : 0) || 
                      0,
        
        // Specialty/Category
        specialty: ipfsMetadata.category || 
                   ipfsMetadata.specialty || 
                   ipfsMetadata.type || 
                   'Event Organizer',
        
        address: address,
        
        // Description
        description: ipfsMetadata.description || 
                     ipfsMetadata.bio || 
                     ipfsMetadata.about || 
                     ipfsMetadata.summary || 
                     'Verified event organizer on the platform.',
        
        // Founded year from blockchain registration date
        founded: profile.registrationDate > 0 
          ? new Date(profile.registrationDate * 1000).getFullYear().toString() 
          : (ipfsMetadata.founded || '2024'),
        
        // Location
        location: ipfsMetadata.location || 
                   ipfsMetadata.city || 
                   ipfsMetadata.country || 
                   'Global',
        
        // Website
        website: ipfsMetadata.website || 
                 ipfsMetadata.url || 
                 ipfsMetadata.homepage || 
                 '',
        
        // Social media from IPFS metadata
        socialMedia: {
          twitter: ipfsMetadata.socialMedia?.twitter || 
                   ipfsMetadata.twitter || 
                   '',
          linkedin: ipfsMetadata.socialMedia?.linkedin || 
                    ipfsMetadata.linkedin || 
                    '',
          instagram: ipfsMetadata.socialMedia?.instagram || 
                     ipfsMetadata.instagram || 
                     '',
          tiktok: ipfsMetadata.socialMedia?.tiktok || 
                  ipfsMetadata.tiktok || 
                  '',
          telegram: ipfsMetadata.socialMedia?.telegram || 
                    ipfsMetadata.telegram || 
                    '',
        },
        
        // Contact information
        email: ipfsMetadata.email || '',
        contactPhone: ipfsMetadata.contactPhone || ipfsMetadata.phone || '',
        
        // Registration dates
        registrationDate: profile.registrationDate,
        registeredAt: ipfsMetadata.registeredAt || '',
        
        // Store the full metadata for detailed display
        metadata: ipfsMetadata,
        
        // Achievements/Awards from metadata
        achievements: Array.isArray(ipfsMetadata.achievements) ? ipfsMetadata.achievements : 
                     Array.isArray(ipfsMetadata.awards) ? ipfsMetadata.awards : 
                     [],
        
        // Reviews/Testimonials from metadata
        reviews: Array.isArray(ipfsMetadata.reviews) ? ipfsMetadata.reviews : 
                 Array.isArray(ipfsMetadata.testimonials) ? ipfsMetadata.testimonials : 
                 [],
        
        // Additional metadata fields
        version: ipfsMetadata.version || '',
        profileUri: profile.profileUri || '',
      };

      setEoData(transformedData);
      setUpcomingEvents(finalUpcoming);
      setPastEvents(finalPast);

      setLoading(false);
    } catch (err: any) {
      console.error('Error loading EO profile:', err);
      setError(err.message || 'Failed to load Event Organizer profile');
      toast.error('Failed to load Event Organizer profile');
    } finally {
      setLoading(false);
    }
  };

  // Mock EO data - fallback if blockchain data fails
  const mockEoData = {
    id: 1,
    name: 'Tech Events Pro',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tech',
    coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
    verified: true,
    eventsCount: 45,
    totalTickets: 12500,
    rating: 4.9,
    reviewsCount: 328,
    specialty: 'Technology & Innovation',
    address: '0x742d35...7e9a2c',
    description: 'Leading organizer of tech conferences and innovation summits across Asia Pacific.',
    founded: '2019',
    location: 'San Francisco, CA',
    website: 'https://techevents.pro',
    socialMedia: {
      twitter: '@techevents',
      linkedin: 'techevents',
      instagram: '@techevents'
    },
    achievements: [
      { icon: '🏆', title: 'Best Tech Event Organizer 2024', year: '2024' },
      { icon: '⭐', title: 'Top Rated Organizer', year: '2023' },
      { icon: '🎯', title: '50K+ Attendees', year: '2022' }
    ],
  };

  const tabs = [
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'about', label: 'About', icon: Award },
    { id: 'reviews', label: 'Reviews', icon: Star }
  ] as const;

  // Loading state
  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-black">
          {/* Cover Image Skeleton */}
          <div className="relative h-64 md:h-80 bg-gray-800/50 animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            {/* Back Button Skeleton */}
            <div className="absolute top-6 left-6 w-10 h-10 bg-gray-700/50 rounded-full" />
          </div>

          {/* Profile Header Skeleton */}
          <div className="relative px-4 md:px-8 -mt-20 mb-8 animate-pulse">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
                {/* Avatar Skeleton */}
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gray-800/50 border-4 border-black shadow-2xl" />

                {/* Info Skeleton */}
                <div className="flex-1 space-y-4">
                  {/* Name & Badge */}
                  <div className="flex items-center gap-3">
                    <div className="h-8 bg-gray-800/50 rounded w-48" />
                    <div className="w-6 h-6 bg-gray-700/50 rounded-full" />
                  </div>
                  
                  {/* Specialty */}
                  <div className="h-5 bg-gray-800/50 rounded w-64" />
                  
                  {/* Stats */}
                  <div className="flex flex-wrap gap-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="space-y-1">
                        <div className="h-7 bg-gray-800/50 rounded w-16" />
                        <div className="h-4 bg-gray-700/50 rounded w-20" />
                      </div>
                    ))}
                  </div>
                  
                  {/* Buttons */}
                  <div className="flex gap-3">
                    <div className="h-11 bg-gray-800/50 rounded-xl w-32" />
                    <div className="h-11 bg-gray-700/50 rounded-xl w-11" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Skeleton */}
          <div className="px-4 md:px-8 pb-12">
            <div className="max-w-7xl mx-auto">
              {/* Tabs Skeleton */}
              <div className="flex gap-2 mb-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-gray-800/50 rounded-lg w-24 animate-pulse" />
                ))}
              </div>

              {/* Events Section Skeleton */}
              <div className="space-y-8 animate-pulse">
                {/* Upcoming Events */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-7 h-7 bg-gray-700/50 rounded" />
                    <div className="h-7 bg-gray-800/50 rounded w-48" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-white/5 rounded-2xl overflow-hidden border border-white/10">
                        {/* Image */}
                        <div className="h-48 bg-gray-800/50" />
                        
                        {/* Content */}
                        <div className="p-5 space-y-3">
                          <div className="h-6 bg-gray-800/50 rounded w-3/4" />
                          <div className="h-6 bg-gray-800/50 rounded w-1/2" />
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-gray-700/50 rounded" />
                              <div className="h-4 bg-gray-800/50 rounded w-32" />
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-gray-700/50 rounded" />
                              <div className="h-4 bg-gray-800/50 rounded w-40" />
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-gray-700/50 rounded" />
                              <div className="h-4 bg-gray-800/50 rounded w-28" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Past Events */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-7 h-7 bg-gray-700/50 rounded" />
                    <div className="h-7 bg-gray-800/50 rounded w-40" />
                  </div>
                  
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-800/50 rounded-lg" />
                          <div className="space-y-2">
                            <div className="h-5 bg-gray-800/50 rounded w-48" />
                            <div className="h-4 bg-gray-700/50 rounded w-32" />
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="space-y-1">
                            <div className="h-4 bg-gray-700/50 rounded w-16" />
                            <div className="h-5 bg-gray-800/50 rounded w-12" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md mx-auto px-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-white">Failed to Load Profile</h2>
            <p className="text-gray-400">{error}</p>
            <button
              onClick={() => loadEOProfile(id || '')}
              className="px-6 py-3 bg-[#d548ec] hover:bg-[#c13dd8] text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Use real data if available, otherwise fallback to mock
  const currentEoData = eoData || mockEoData;
  const currentUpcomingEvents = upcomingEvents.length > 0 ? upcomingEvents : [];
  const currentPastEvents = pastEvents.length > 0 ? pastEvents : [];

  // Debug render values

  return (
    <AppLayout>
      <div className="min-h-screen bg-black">
        {/* Cover Image */}
        <div className="relative h-64 md:h-80 overflow-hidden">
          <img 
            src={currentEoData.coverImage} 
            alt="Cover"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80') {
                target.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80';
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-6 left-6 w-10 h-10 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full flex items-center justify-center transition-colors border border-white/20"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Profile Header */}
        <div className="relative px-4 md:px-8 -mt-20 mb-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-black shadow-2xl">
                  <img 
                    src={currentEoData.avatar} 
                    alt={currentEoData.name}
                    className="w-full h-full object-cover bg-gray-800"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentEoData.address || 'default'}`;
                      if (target.src !== fallbackAvatar) {
                        target.src = fallbackAvatar;
                      }
                    }}
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h1 className="text-3xl md:text-4xl font-bold text-white">{currentEoData.name}</h1>
                      {currentEoData.verified && (
                        <BadgeCheck className="w-8 h-8 md:w-10 md:h-10 text-[#d548ec] fill-[#d548ec] flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[#d548ec] font-medium text-lg mb-3">{currentEoData.specialty}</p>
                    <code className="text-sm text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                      {currentEoData.address}
                    </code>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button className="px-6 py-3 bg-[#d548ec] hover:bg-[#c13dd8] text-white font-semibold rounded-xl transition-colors shadow-lg">
                      Follow
                    </button>
                    <button className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-colors">
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#d548ec]/20 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-[#d548ec]" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{currentEoData.eventsCount}</div>
                    <div className="text-xs text-gray-400">Total Events</div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{currentEoData.totalTickets.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">Tickets Sold</div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{currentEoData.rating}</div>
                    <div className="text-xs text-gray-400">Rating</div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{currentEoData.reviewsCount}</div>
                    <div className="text-xs text-gray-400">Reviews</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-8 border-b border-white/10 overflow-x-auto scrollbar-none">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'text-[#d548ec] border-b-2 border-[#d548ec]'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="mt-8 pb-12">
              {/* Events Tab */}
              {activeTab === 'events' && (
                <div className="space-y-8">
                  {/* Upcoming Events Section */}
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Calendar className="w-7 h-7 text-[#d548ec]" />
                        Upcoming Events
                        {currentUpcomingEvents.length > 0 && (
                          <span className="text-sm font-normal text-gray-400 ml-2">
                            ({currentUpcomingEvents.length})
                          </span>
                        )}
                      </h2>
                    </div>
                    {currentUpcomingEvents.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {currentUpcomingEvents.map((event: any) => (
                          <Link
                            key={event.id}
                            to={`/app/event/${event.id}`}
                            className="group bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-[#d548ec]/50 transition-all hover:scale-105"
                          >
                            <div className="relative h-48 overflow-hidden">
                              <img 
                                src={event.image} 
                                alt={event.title} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80';
                                }}
                              />
                              {/* Upcoming Badge */}
                              <div className="absolute top-3 left-3 px-3 py-1.5 bg-green-500/90 backdrop-blur-md rounded-lg">
                                <span className="text-white font-semibold text-xs">Upcoming</span>
                              </div>
                              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg">
                                <span className="text-white font-bold text-sm">{event.price}</span>
                                <STXIcon size="sm" />
                              </div>
                            </div>
                            <div className="p-5">
                              <h3 className="font-bold text-white text-lg mb-3 group-hover:text-[#d548ec] transition-colors line-clamp-2">
                                {event.title}
                              </h3>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                  <Calendar className="w-4 h-4 text-[#d548ec]" />
                                  <span>{event.date}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                  <MapPin className="w-4 h-4 text-[#d548ec]" />
                                  <span className="line-clamp-1">{event.location}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                  <Users className="w-4 h-4 text-[#d548ec]" />
                                  <span>{event.available} / {event.total} available</span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white/5 rounded-2xl p-12 border border-white/10 text-center">
                        <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No Upcoming Events</h3>
                        <p className="text-gray-400">This organizer has no upcoming events at the moment.</p>
                      </div>
                    )}
                  </div>

                  {/* Past Events Section */}
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Clock className="w-7 h-7 text-gray-500" />
                        Past Events
                        {currentPastEvents.length > 0 && (
                          <span className="text-sm font-normal text-gray-400 ml-2">
                            ({currentPastEvents.length})
                          </span>
                        )}
                      </h2>
                    </div>
                    {currentPastEvents.length > 0 ? (
                      <div className="space-y-3">
                        {currentPastEvents.map((event: any) => (
                          <Link
                            key={event.id}
                            to={`/app/event/${event.id}`}
                            className="bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 flex items-center justify-between transition-colors group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                <Clock className="w-6 h-6 text-gray-400" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-white group-hover:text-[#d548ec] transition-colors">{event.title}</h3>
                                <p className="text-sm text-gray-400">{event.date}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <div className="text-sm text-gray-400">Attendees</div>
                                <div className="font-semibold text-white">{event.attendees || 0}</div>
                              </div>
                              {event.rating && event.rating > 0 && (
                                <div className="text-right">
                                  <div className="text-sm text-gray-400">Rating</div>
                                  <div className="font-semibold text-yellow-400">⭐ {event.rating}</div>
                                </div>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white/5 rounded-2xl p-12 border border-white/10 text-center">
                        <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No Past Events</h3>
                        <p className="text-gray-400">This organizer has no past events to display.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* About Tab */}
              {activeTab === 'about' && (
                <div className="space-y-8">
                  {/* Profile Overview Card */}
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <h2 className="text-xl font-bold text-white mb-4">Profile Overview</h2>
                    <div className="space-y-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="md:w-1/3">
                          <div className="text-sm text-gray-400 mb-1">Organization Name</div>
                          <div className="text-white font-medium">{currentEoData.name}</div>
                        </div>
                        <div className="md:w-1/3">
                          <div className="text-sm text-gray-400 mb-1">Specialty/Category</div>
                          <div className="text-white font-medium">{currentEoData.specialty}</div>
                        </div>
                        <div className="md:w-1/3">
                          <div className="text-sm text-gray-400 mb-1">Location</div>
                          <div className="text-white font-medium">{currentEoData.location}</div>
                        </div>
                      </div>
                      
                      <div className="pt-4">
                        <div className="text-sm text-gray-400 mb-2">Description</div>
                        <p className="text-gray-300 leading-relaxed">{currentEoData.description}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Founded</div>
                          <div className="text-white font-medium">{currentEoData.founded}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Website</div>
                          {currentEoData.website ? (
                            <a
                              href={currentEoData.website.startsWith('http') ? currentEoData.website : `https://${currentEoData.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#d548ec] hover:underline flex items-center gap-1"
                            >
                              <span>{currentEoData.website.replace(/^https?:\/\//, '')}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-gray-500">No website provided</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social Media Card */}
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <h2 className="text-xl font-bold text-white mb-4">Connect With {currentEoData.name}</h2>
                    <div className="flex flex-wrap gap-3">
                      {currentEoData.socialMedia?.twitter && (
                        <a
                          href={`https://twitter.com/${currentEoData.socialMedia.twitter.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white/5 hover:bg-white/10 rounded-lg px-4 py-2 border border-white/10 flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4 text-[#d548ec]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                          <span className="text-white">{currentEoData.socialMedia.twitter}</span>
                        </a>
                      )}
                      {currentEoData.socialMedia?.instagram && (
                        <a
                          href={`https://instagram.com/${currentEoData.socialMedia.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white/5 hover:bg-white/10 rounded-lg px-4 py-2 border border-white/10 flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4 text-[#d548ec]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.069-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                          <span className="text-white">{currentEoData.socialMedia.instagram}</span>
                        </a>
                      )}
                      {currentEoData.socialMedia?.linkedin && (
                        <a
                          href={`https://linkedin.com/in/${currentEoData.socialMedia.linkedin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white/5 hover:bg-white/10 rounded-lg px-4 py-2 border border-white/10 flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4 text-[#d548ec]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          <span className="text-white">{currentEoData.socialMedia.linkedin}</span>
                        </a>
                      )}
                      {currentEoData.socialMedia?.tiktok && (
                        <a
                          href={`https://tiktok.com/@${currentEoData.socialMedia.tiktok.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white/5 hover:bg-white/10 rounded-lg px-4 py-2 border border-white/10 flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4 text-[#d548ec]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                          </svg>
                          <span className="text-white">{currentEoData.socialMedia.tiktok}</span>
                        </a>
                      )}
                      {currentEoData.socialMedia?.telegram && (
                        <a
                          href={`https://t.me/${currentEoData.socialMedia.telegram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white/5 hover:bg-white/10 rounded-lg px-4 py-2 border border-white/10 flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4 text-[#d548ec]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                          </svg>
                          <span className="text-white">{currentEoData.socialMedia.telegram}</span>
                        </a>
                      )}
                      {!Object.values(currentEoData.socialMedia || {}).some(val => val) && (
                        <span className="text-gray-500">No social media links provided</span>
                      )}
                    </div>
                  </div>

                  {/* Organization Details Card */}
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <h2 className="text-xl font-bold text-white mb-4">Organization Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Email</div>
                        <div className="text-white font-medium">{currentEoData.email || 'Not provided'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Phone</div>
                        <div className="text-white font-medium">{currentEoData.contactPhone || 'Not provided'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Organization Name</div>
                        <div className="text-white font-medium">{currentEoData.metadata?.organizationName || currentEoData.name || 'Not provided'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Category</div>
                        <div className="text-white font-medium">{currentEoData.specialty || 'Not provided'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 mb-1">EO Name</div>
                        <div className="text-white font-medium">{currentEoData.metadata?.eoName || currentEoData.name || 'Not provided'}</div>
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-sm text-gray-400 mb-1">Registration Date</div>
                        <div className="text-white font-medium">
                          {currentEoData.registrationDate && currentEoData.registrationDate > 0
                            ? new Date(currentEoData.registrationDate * 1000).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Details Card */}
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <h2 className="text-xl font-bold text-white mb-4">About Organization</h2>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-400 mb-2">Description</div>
                        <div className="text-gray-300 leading-relaxed whitespace-pre-line">
                          {currentEoData.description || 'No description provided'}
                        </div>
                      </div>
                      {currentEoData.website && (
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Website</div>
                          <a
                            href={currentEoData.website.startsWith('http') ? currentEoData.website : `https://${currentEoData.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#d548ec] hover:underline flex items-center gap-1"
                          >
                            <span>{currentEoData.website.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Location</div>
                        <div className="text-white font-medium">{currentEoData.location || 'Not provided'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Founded</div>
                        <div className="text-white font-medium">{currentEoData.founded || 'Not provided'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Achievements Card */}
                  {currentEoData.achievements && currentEoData.achievements.length > 0 && (
                    <div>
                      <h2 className="text-xl font-bold text-white mb-4">Achievements</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {currentEoData.achievements.map((achievement: any, idx: number) => (
                          <div key={idx} className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                            <div className="text-4xl mb-3">{achievement.icon}</div>
                            <h3 className="font-semibold text-white mb-1">{achievement.title}</h3>
                            <p className="text-sm text-gray-400">{achievement.year}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reviews Tab */}
              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center gap-6 mb-6">
                      <div className="text-center">
                        <div className="text-5xl font-bold text-white mb-2">{currentEoData.rating}</div>
                        <div className="flex items-center gap-1 mb-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <div className="text-sm text-gray-400">{currentEoData.reviewsCount} reviews</div>
                      </div>
                    </div>
                  </div>

                  {currentEoData.reviews?.map((review: any) => (
                    <div key={review.id} className="bg-white/5 rounded-2xl p-6 border border-white/10">
                      <div className="flex items-start gap-4">
                        <img src={review.avatar} alt={review.user} className="w-12 h-12 rounded-full" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-white">{review.user}</h3>
                              <p className="text-sm text-gray-400">{review.event}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {[...Array(review.rating)].map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                          </div>
                          <p className="text-gray-300 mb-2">{review.comment}</p>
                          <p className="text-xs text-gray-500">{review.date}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default EOProfile;
