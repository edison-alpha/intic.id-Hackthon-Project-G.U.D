import React, { useState, useRef, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Calendar, MapPin, Users, ArrowRight, Loader2, CheckCircle, BadgeCheck, RefreshCw, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useWallet } from '@/hooks/usePushChainWallet';
import STXIcon from '@/components/STXIcon';
import { getAllDeployedEvents, fetchCompleteEventDetails } from '@/services/eventBrowseContract';
import { getVerifiedOrganizers, getOrganizerDetails, getAllDeployedEventsFromBlockchain } from '@/services/eventOrganizerContract';
import { toast } from 'sonner';

const BrowseEvents = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const { wallet } = useWallet();

  // Featured Event Organizers
  const featuredOrganizers = [
    {
      id: 1,
      name: 'Tech Events Pro',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tech',
      verified: true,
      eventsCount: 45,
      totalTickets: 12500,
      rating: 4.9,
      specialty: 'Technology & Innovation',
      address: '0x742d35...7e9a2c',
      description: 'Leading organizer of tech conferences and innovation summits across Asia Pacific.',
      upcomingEvents: ['Tech Innovation Summit', 'AI Conference 2025']
    },
    {
      id: 2,
      name: 'Music Masters',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=music',
      verified: true,
      eventsCount: 78,
      totalTickets: 35000,
      rating: 4.8,
      specialty: 'Concerts & Festivals',
      address: '0x5a0b12...3f8d4e',
      description: 'Premier music event organizers bringing world-class artists to unforgettable venues.',
      upcomingEvents: ['Summer Music Festival', 'Rock Festival 2025']
    },
    {
      id: 3,
      name: 'Sports Arena',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sports',
      verified: true,
      eventsCount: 62,
      totalTickets: 28000,
      rating: 4.7,
      specialty: 'Sports Events',
      address: '0x1c2d3e...9a0b1c',
      description: 'Organizing major sporting events and championships with top-tier facilities.',
      upcomingEvents: ['Football Championship', 'Basketball Finals']
    },
    {
      id: 4,
      name: 'Art Culture',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=art',
      verified: true,
      eventsCount: 34,
      totalTickets: 8500,
      rating: 4.9,
      specialty: 'Arts & Culture',
      address: '0x8f7e6d...2c1b0a',
      description: 'Curating exceptional art exhibitions and cultural experiences for discerning audiences.',
      upcomingEvents: ['Art Exhibition Opening', 'Cultural Heritage Festival']
    },
    {
      id: 5,
      name: 'Gaming Hub',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gaming',
      verified: true,
      eventsCount: 52,
      totalTickets: 19000,
      rating: 4.8,
      specialty: 'Gaming & Esports',
      address: '0x4e5f6a...8d9e0f',
      description: 'Leading esports tournament organizers with cutting-edge gaming events.',
      upcomingEvents: ['Gaming Tournament', 'Esports Championship']
    },
    {
      id: 6,
      name: 'Theater Guild',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=theater',
      verified: true,
      eventsCount: 41,
      totalTickets: 15000,
      rating: 4.8,
      specialty: 'Theater & Performing Arts',
      address: '0x9a8b7c...6d5e4f',
      description: 'Bringing Broadway-quality theater productions to audiences worldwide.',
      upcomingEvents: ['Classic Drama Performance', 'Musical Theater Night']
    },
    {
      id: 7,
      name: 'Food & Wine Co',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=food',
      verified: true,
      eventsCount: 29,
      totalTickets: 6800,
      rating: 4.9,
      specialty: 'Food & Culinary Events',
      address: '0x3c4d5e...7f8a9b',
      description: 'Hosting premium food festivals and wine tasting experiences.',
      upcomingEvents: ['Gourmet Festival', 'Wine Tasting Night']
    },
    {
      id: 8,
      name: 'EDM Nation',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=edm',
      verified: true,
      eventsCount: 67,
      totalTickets: 42000,
      rating: 4.7,
      specialty: 'Electronic Music',
      address: '0x6e7f8a...9b0c1d',
      description: 'Premier EDM festival organizers featuring world-renowned DJs.',
      upcomingEvents: ['Electric Paradise', 'Rave Nation Festival']
    },
    {
      id: 9,
      name: 'Comedy Central',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=comedy',
      verified: true,
      eventsCount: 38,
      totalTickets: 11000,
      rating: 4.8,
      specialty: 'Comedy & Stand-up',
      address: '0x2d3e4f...5a6b7c',
      description: 'Bringing laughter with top comedians and stand-up shows.',
      upcomingEvents: ['Comedy Night Live', 'Stand-up Showcase']
    },
    {
      id: 10,
      name: 'Fitness Expo',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fitness',
      verified: true,
      eventsCount: 25,
      totalTickets: 7200,
      rating: 4.6,
      specialty: 'Health & Fitness',
      address: '0x8a9b0c...1d2e3f',
      description: 'Organizing health and fitness expos with industry leaders.',
      upcomingEvents: ['Fitness Summit', 'Wellness Expo']
    },
  ];

  // Realtime activity feed - now using real transaction data
  const [realtimeActivities, setRealtimeActivities] = useState<any[]>([]);

  // Mock user tier
  const userTier = {
    name: "Silver",
    discount: 10,
    earlyAccess: true,
    icon: "🥈"
  };

  // Track manual scroll for slide indicator
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const handleScroll = () => {
      const slideIndex = Math.round(slider.scrollLeft / slider.offsetWidth);
      setCurrentSlide(slideIndex);
    };

    slider.addEventListener('scroll', handleScroll);
    return () => slider.removeEventListener('scroll', handleScroll);
  }, []);

  const categories = [
    { id: "all", label: "All Events" },
    { id: "concert", label: "Concerts" },
    { id: "sports", label: "Sports" },
    { id: "conference", label: "Conferences" },
    { id: "festival", label: "Festivals" },
    { id: "theater", label: "Theater" }
  ];

  // Helper function to calculate time ago from timestamp
  const getTimeAgo = (timestamp: number | undefined): string => {
    if (!timestamp) return 'Recently';
    
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const diff = now - timestamp; // Difference in seconds
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return `${Math.floor(diff / 604800)}w ago`;
  };

  // Define event interface
  interface Event {
    id: string;
    eventId: number;
    title: string;
    image: string;
    date: string;
    time: string;
    location: string;
    description: string;
    category: string;
    price: string;
    priceInMicroSTX: number;
    available: number;
    total: number;
    minted: number;
    featured: boolean;
    verified: boolean;
    earlyAccess: boolean;
    isActive: boolean;
    isCancelled: boolean;
    isPaused: boolean; // Add paused status
    contractAddress: string;
    contractName: string;
    tokenUri: string;
    organizer?: string; // Optional organizer address
    deployedAt?: number; // Timestamp when event was deployed
    status?: string; // Event status (cancelled, paused, active, etc)
  }

  // State for real events
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [verifiedEOs, setVerifiedEOs] = useState<any[]>([]);
  const [loadingEOs, setLoadingEOs] = useState(false);

  // Load events on component mount
  useEffect(() => {
    loadEvents();
    loadVerifiedEOs();
    loadRealtimeActivities();
  }, []);

  /**
   * Load events from localStorage and fetch live data from blockchain
   */
  const loadEvents = async () => {
    setLoading(true);
    try {
      console.log('🔍 Loading events from blockchain...');
      
      // Get all deployed events from EventOrganizer smart contract
      const deployedEvents = await getAllDeployedEventsFromBlockchain();
      
      console.log('📋 Deployed events from blockchain:', deployedEvents.length);

      if (deployedEvents.length === 0) {
        // No deployed events found
        console.log('⚠️ No deployed events found on blockchain');
        setEvents([]);
        setLoading(false);
        return;
      }

      // Fetch live details for each event from blockchain
      const liveEventsPromises = deployedEvents.map(async (deployed) => {
        try {
          // Use new fetchCompleteEventDetails function for better performance
          const liveData = await fetchCompleteEventDetails(deployed.eventContract);
          
          if (!liveData) {
            console.warn('❌ Could not fetch live data for', deployed.eventContract);
            return null;
          }

          // Transform to Event interface
          return {
            id: deployed.eventContract,
            eventId: deployed.eventId || 0,
            title: liveData.title || 'Unnamed Event',
            image: liveData.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80',
            date: liveData.date || new Date(deployed.deployedAt * 1000).toLocaleDateString(),
            time: liveData.time || new Date(deployed.deployedAt * 1000).toLocaleTimeString(),
            location: liveData.location || 'TBA',
            description: liveData.description || '',
            category: liveData.category || 'other',
            price: liveData.price || '0',
            priceInMicroSTX: parseFloat(liveData.price || '0') * 1000000,
            available: liveData.available || 0,
            total: liveData.total || 0,
            minted: liveData.minted || 0,
            featured: true, // All on-chain events are featured
            verified: true, // All on-chain events are verified
            earlyAccess: false,
            isActive: deployed.isActive && liveData.isActive !== false,
            isCancelled: liveData.eventCancelled || liveData.isCancelled || false,
            isPaused: liveData.eventPaused || false, // Add paused status
            contractAddress: deployed.eventContract,
            contractName: deployed.eventContract.substring(0, 10),
            tokenUri: liveData.metadata?.image || '',
            organizer: deployed.organizer, // Add organizer address
            deployedAt: deployed.deployedAt, // Add deployment timestamp
            status: liveData.eventCancelled ? 'cancelled' : 
                   liveData.eventPaused ? 'paused' : 
                   liveData.status || 'Active', // Add explicit status
          };
        } catch (error) {
          console.error('Error loading event', deployed.eventContract, error);
          return null;
        }
      });

      const liveEvents = (await Promise.all(liveEventsPromises)).filter(
        (event): event is NonNullable<typeof event> => event !== null && typeof event === 'object'
      );

      console.log('✅ Loaded live events from blockchain:', liveEvents.length);

      if (liveEvents.length > 0) {
        setEvents(liveEvents);
      } else {
        // No live events loaded
        console.log('⚠️ No live events loaded from blockchain');
        setEvents([]);
      }
    } catch (error) {
      console.error('Error loading events from blockchain:', error);
      toast.error('Failed to load events from blockchain');
      setEvents([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh events from blockchain
   */
  const refreshEvents = async () => {
    setIsLoadingLive(true);
    toast.info('Refreshing events from blockchain...');
    await loadEvents();
    loadRealtimeActivities(); // Also refresh activities
    setIsLoadingLive(false);
    toast.success('Events refreshed!');
  };

  /**
   * Load verified Event Organizers from blockchain
   */
  const loadVerifiedEOs = async () => {
    setLoadingEOs(true);
    try {
      console.log('🔍 Loading verified Event Organizers...');
      const addresses = await getVerifiedOrganizers();
      console.log('📋 Verified EO addresses:', addresses.length);

      if (addresses.length === 0) {
        console.log('⚠️ No verified EOs found');
        setVerifiedEOs([]);
        setLoadingEOs(false);
        return;
      }

      // Fetch details for each EO
      const eosPromises = addresses.map(async (address, index) => {
        try {
          const details = await getOrganizerDetails(address);
          
          // Fetch profile data from IPFS if available
          let profileData: any = {};
          if (details.profileUri) {
            try {
              const response = await fetch(details.profileUri);
              if (response.ok) {
                profileData = await response.json();
              }
            } catch (err) {
              console.warn('Could not fetch profile from IPFS:', err);
            }
          }

          // Extract name with priority: eoName > organizationName > name > fallback
          const eoName = profileData.eoName || 
                        profileData.organizationName || 
                        profileData.name || 
                        `Event Organizer ${address.substring(0, 8)}`;
          
          // Calculate rating: use blockchain rating if > 0, otherwise default to 5.0
          const eoRating = details.averageRating > 0 
            ? (details.averageRating / 10) // Convert from 0-50 to 0-5
            : 5.0; // Default rating
          
          console.log(`✅ EO: ${eoName}, Rating: ${eoRating}, Events: ${details.totalEvents}`);

          return {
            id: index + 1,
            address,
            name: eoName,
            avatar: profileData.logo || profileData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`,
            verified: details.isVerified,
            eventsCount: details.totalEvents,
            totalTickets: details.totalTicketsSold,
            rating: eoRating,
            specialty: profileData.category || profileData.specialty || profileData.description?.substring(0, 30) || 'Event Organizer',
            description: profileData.description || profileData.bio || 'Verified event organizer on the platform',
            email: profileData.email || '',
            phone: profileData.phone || profileData.contactPhone || '',
            upcomingEvents: [] // TODO: Get from events list
          };
        } catch (error) {
          console.error('Error loading EO details for', address, error);
          return null;
        }
      });

      const eos = (await Promise.all(eosPromises)).filter((eo): eo is any => eo !== null);
      console.log('✅ Loaded verified EOs:', eos.length);
      setVerifiedEOs(eos);
    } catch (error) {
      console.error('Error loading verified EOs:', error);
      toast.error('Failed to load event organizers');
    } finally {
      setLoadingEOs(false);
    }
  };

  /**
   * Load real transaction data from localStorage for realtime activities
   */
  const loadRealtimeActivities = () => {
    try {
      console.log('🔍 Loading real transaction data for activities...');
      
      const activities: any[] = [];
      
      // Get deploy transactions from deployed-contracts-*
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('deployed-contracts-')) {
          const address = key.replace('deployed-contracts-', '');
          const contractsData = JSON.parse(localStorage.getItem(key) || '[]');
          
          // Transform each contract deployment into activity
          contractsData.forEach((contract: any) => {
            activities.push({
              type: 'deploy',
              user: `${address.slice(0, 6)}...${address.slice(-4)}`,
              event: contract.eventName,
              time: getTimeAgo(Math.floor(contract.deployedAt / 1000)), // Convert to seconds
              icon: '🚀',
              color: 'from-blue-500 to-cyan-500',
              timestamp: contract.deployedAt,
              txId: contract.txId,
              contractAddress: contract.contractAddress
            });
          });
        }
      }

      // Get mint transactions from mint-transactions
      const mintTransactions = JSON.parse(localStorage.getItem('mint-transactions') || '[]');
      mintTransactions.forEach((mint: any) => {
        activities.push({
          type: 'mint',
          user: mint.minter || 'Anonymous', // Use minter if available, fallback to Anonymous
          event: mint.eventName,
          time: getTimeAgo(Math.floor(mint.mintedAt / 1000)), // Convert to seconds
          icon: '🎫',
          color: 'from-green-500 to-emerald-500',
          timestamp: mint.mintedAt,
          txId: mint.transactionHash,
          contractAddress: mint.contractAddress,
          tokenId: mint.tokenId
        });
      });
      
      // Sort by timestamp descending (newest first) and take latest 8
      activities.sort((a, b) => b.timestamp - a.timestamp);
      const latestActivities = activities.slice(0, 8);
      
      console.log('✅ Loaded real activities:', latestActivities.length);
      setRealtimeActivities(latestActivities);
      
      // Store in localStorage for other components to access
      localStorage.setItem('realtime-activities', JSON.stringify(latestActivities));
    } catch (error) {
      console.error('Error loading realtime activities:', error);
      // Set empty array on error
      setRealtimeActivities([]);
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesCategory = selectedCategory === "all" || event.category === selectedCategory;
    return matchesCategory;
  });

  // Get 2 latest events for hero banner based on deployedAt timestamp
  // Sort by deployedAt descending (newest first) and take first 2
  const heroEvents = [...events]
    .sort((a, b) => {
      const timeA = a.deployedAt || 0;
      const timeB = b.deployedAt || 0;
      return timeB - timeA; // Descending order (newest first)
    })
    .slice(0, 2); // Take only 2 latest events
  
  const heroEventIds = heroEvents.map(e => e.id);
  const featuredEvents = filteredEvents.filter(e => e.featured && !heroEventIds.includes(e.id));
  const regularEvents = filteredEvents.filter(e => !e.featured && !heroEventIds.includes(e.id));

  // Auto-slide functionality for hero banner
  useEffect(() => {
    if (heroEvents.length <= 1) return;

    const interval = setInterval(() => {
      if (sliderRef.current) {
        const maxScrollLeft = sliderRef.current.scrollWidth - sliderRef.current.clientWidth;
        const nextScrollLeft = sliderRef.current.scrollLeft + sliderRef.current.offsetWidth;

        if (nextScrollLeft >= maxScrollLeft) {
          // Go back to first slide
          sliderRef.current.scrollTo({
            left: 0,
            behavior: 'smooth'
          });
        } else {
          sliderRef.current.scrollTo({
            left: nextScrollLeft,
            behavior: 'smooth'
          });
        }
      }
    }, 5000); // Auto-slide every 5 seconds

    return () => clearInterval(interval);
  }, [heroEvents.length]);

  return (
    <AppLayout>
      {/* Main Content */}
      <div className="px-4 pt-4 pb-6 md:px-6 md:pt-6 md:pb-6">

        {/* Hero Banner - Improved Layout */}
        {heroEvents.length > 0 && (
          <div className="mb-8 md:mb-12">
            {/* Hero Banner Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Latest Events</h2>
                <p className="text-sm text-gray-400">Newest events created by event organizers</p>
              </div>
            </div>
            
            <div className="relative -mx-4 md:mx-0 overflow-hidden rounded-none md:rounded-3xl">
              <div
                ref={sliderRef}
                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth"
                style={{
                  msOverflowStyle: 'none',
                  scrollbarWidth: 'none',
                  WebkitOverflowScrolling: 'touch'
                } as React.CSSProperties}
              >
                {heroEvents.map((event, index) => (
                  <Link
                    key={event.id}
                    to={`/app/event/${event.id}`}
                    className="group relative flex-shrink-0 w-full aspect-[16/11] sm:aspect-[16/9] md:aspect-[18/8] lg:aspect-[20/7] overflow-hidden snap-center"
                  >
                    {/* Full Background Image with Parallax Effect */}
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{ backgroundImage: `url('${event.image}')` }}
                    >
                      {/* Improved Gradient Overlay - Better balance between image and text */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/20 md:bg-gradient-to-r md:from-black/90 md:via-black/60 md:to-transparent" />
                    </div>

                    {/* Content Container - Better Spacing & Organization */}
                    <div className="relative h-full flex items-end md:items-center py-4 sm:py-5 md:py-6 lg:py-8">
                      {/* Price Badge - Top Right */}
                      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-5 md:right-5 lg:top-6 lg:right-6 z-10">
                        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-1.5 md:px-4 md:py-2 bg-black/40 backdrop-blur-md rounded-lg md:rounded-xl shadow-lg border border-white/20">
                          <span className="text-white font-bold text-xs sm:text-sm md:text-base lg:text-lg">{event.price}</span>
                          <STXIcon size="lg" className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                        </div>
                      </div>

                      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-10">
                        <div className="max-w-xl md:max-w-2xl lg:max-w-3xl space-y-1.5 sm:space-y-2 md:space-y-3 lg:space-y-4">
                          {/* Latest Event Badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Status Badges - Highest Priority */}
                            {event.isCancelled && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 md:py-1.5 bg-red-600/90 backdrop-blur-md text-white text-[10px] sm:text-xs md:text-sm font-bold rounded-full border border-red-400/50 shadow-lg">
                                <span>❌</span>
                                CANCELLED
                              </div>
                            )}
                            {event.isPaused && !event.isCancelled && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 md:py-1.5 bg-yellow-600/90 backdrop-blur-md text-white text-[10px] sm:text-xs md:text-sm font-bold rounded-full border border-yellow-400/50 shadow-lg">
                                <span>⏸️</span>
                                PAUSED
                              </div>
                            )}
                            
                            {/* Regular Badges */}
                            {!event.isCancelled && !event.isPaused && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 md:py-1.5 bg-gradient-to-r from-[#d548ec] to-purple-600 text-white text-[10px] sm:text-xs md:text-sm font-bold rounded-full border border-white/25 shadow-lg">
                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                {index === 0 ? '🆕 LATEST EVENT' : 'NEW EVENT'}
                              </div>
                            )}
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 md:py-1.5 bg-white/15 backdrop-blur-md text-white text-[10px] sm:text-xs md:text-sm font-medium rounded-full border border-white/25">
                              <CheckCircle className="w-3 h-3 text-green-400" />
                              VERIFIED
                            </div>
                            {event.deployedAt && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 md:py-1.5 bg-black/30 backdrop-blur-md text-white text-[10px] sm:text-xs md:text-sm font-medium rounded-full border border-white/20">
                                Created {getTimeAgo(event.deployedAt)}
                              </div>
                            )}
                          </div>

                          {/* Title */}
                          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white leading-tight drop-shadow-2xl line-clamp-2">
                            {event.title}
                          </h1>

                          {/* Available Badge */}
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-black/30 backdrop-blur-md rounded-lg border border-white/20">
                            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white/90" />
                            <span className="text-white font-medium text-[10px] sm:text-xs md:text-sm">{event.available} available</span>
                          </div>

                          {/* Event Details - Grid Layout */}
                          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:gap-3 lg:gap-4">
                            <div className="flex items-start gap-1.5 sm:gap-2 md:gap-2.5 p-1.5 sm:p-2 md:p-2.5 bg-black/20 backdrop-blur-sm rounded-lg border border-white/10">
                              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 text-[#d548ec] mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-white text-[10px] sm:text-xs md:text-sm truncate">{event.date}</p>
                                <p className="text-[9px] sm:text-[10px] md:text-xs text-white/80 truncate">{event.time}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-1.5 sm:gap-2 md:gap-2.5 p-1.5 sm:p-2 md:p-2.5 bg-black/20 backdrop-blur-sm rounded-lg border border-white/10">
                              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 text-[#d548ec] mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-white text-[10px] sm:text-xs md:text-sm line-clamp-2">{event.location}</p>
                              </div>
                            </div>
                          </div>

                          {/* CTA Button */}
                          <div className="pt-0.5 sm:pt-1 md:pt-1.5">
                            <button className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 lg:px-6 lg:py-3 bg-white hover:bg-gray-100 text-black text-[10px] sm:text-xs md:text-sm lg:text-base font-semibold rounded-lg md:rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95">
                              <span>Get Tickets</span>
                              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Navigation Arrows */}
              {heroEvents.length > 1 && (
                <>
                  <button
                    onClick={() => {
                      if (sliderRef.current) {
                        const scrollAmount = sliderRef.current.offsetWidth;
                        sliderRef.current.scrollTo({
                          left: sliderRef.current.scrollLeft - scrollAmount,
                          behavior: 'smooth'
                        });
                      }
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all hover:scale-110 active:scale-95 border border-white/20 hidden md:flex"
                    aria-label="Previous"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      if (sliderRef.current) {
                        const scrollAmount = sliderRef.current.offsetWidth;
                        sliderRef.current.scrollTo({
                          left: sliderRef.current.scrollLeft + scrollAmount,
                          behavior: 'smooth'
                        });
                      }
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all hover:scale-110 active:scale-95 border border-white/20 hidden md:flex"
                    aria-label="Next"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}

              {/* Slide Dots Indicator */}
              {heroEvents.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  {heroEvents.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (sliderRef.current) {
                          sliderRef.current.scrollTo({
                            left: index * sliderRef.current.offsetWidth,
                            behavior: 'smooth'
                          });
                        }
                      }}
                      className={`transition-all duration-300 rounded-full ${
                        index === currentSlide
                          ? 'w-8 h-2 bg-white'
                          : 'w-2 h-2 bg-white/50 hover:bg-white/70'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Category Filter - Moved below hero banner */}
        <div className="mb-6 md:mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1.5 md:px-3 md:py-1.5 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category.id
                    ? "bg-[#d548ec] text-white shadow-lg"
                    : "bg-[#1A1A1A] text-gray-400 active:bg-gray-800 md:hover:bg-gray-800 md:hover:text-white border border-gray-800"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* All Events */}
        <div>
          <div className="flex items-center justify-between mb-5 md:mb-6">
            <h2 className="section-title-mobile md:section-title-desktop text-white">
              All Events
              {events.length > 0 && (
                <span className="ml-2 text-sm md:text-base text-gray-400 font-normal">
                  ({filteredEvents.length} events)
                </span>
              )}
            </h2>
            
            {/* Refresh Button */}
            <button
              onClick={refreshEvents}
              disabled={isLoadingLive}
              className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-[#1A1A1A] hover:bg-gray-800 border border-gray-800 text-white rounded-lg text-xs md:text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingLive ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">
                {isLoadingLive ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {/* Skeleton Cards */}
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <div
                  key={index}
                  className="bg-[#1A1A1A] rounded-2xl overflow-hidden border border-gray-800/50 animate-pulse"
                >
                  {/* Skeleton Image */}
                  <div className="relative h-56 md:h-64 bg-gray-800/50">
                    {/* Skeleton Badge Top Left */}
                    <div className="absolute top-4 left-4 w-24 h-8 bg-gray-700/50 rounded-xl" />
                    {/* Skeleton Badge Bottom Left */}
                    <div className="absolute bottom-4 left-4 w-20 h-9 bg-gray-700/50 rounded-xl" />
                  </div>

                  {/* Skeleton Info */}
                  <div className="p-6">
                    {/* Skeleton Title */}
                    <div className="h-7 bg-gray-800/50 rounded-lg mb-2 w-3/4" />
                    <div className="h-7 bg-gray-800/50 rounded-lg mb-4 w-1/2" />

                    {/* Skeleton Details */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-gray-700/50 rounded flex-shrink-0" />
                        <div className="h-4 bg-gray-800/50 rounded w-2/3" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-gray-700/50 rounded flex-shrink-0" />
                        <div className="h-4 bg-gray-800/50 rounded w-3/4" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-gray-700/50 rounded flex-shrink-0" />
                        <div className="h-4 bg-gray-800/50 rounded w-1/2" />
                      </div>
                    </div>

                    {/* Skeleton CTA */}
                    <div className="pt-4 border-t border-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="h-5 bg-gray-800/50 rounded w-1/3" />
                        <div className="w-5 h-5 bg-gray-700/50 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-12">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto bg-gray-800 rounded-full flex items-center justify-center">
                  <Calendar className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-white">No Events Found</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  {selectedCategory !== "all"
                    ? `No events in the ${categories.find(c => c.id === selectedCategory)?.label} category yet.`
                    : 'No events have been deployed yet. Deploy your first event to get started!'
                  }
                </p>
                {selectedCategory === "all" && (
                  <Link
                    to="/app/create-event"
                    className="inline-block px-6 py-3 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] text-white rounded-lg font-semibold hover:opacity-90 transition-all mt-4"
                  >
                    Create Your First Event
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {filteredEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/app/event/${event.id}`}
                  className="group block"
                >
                  <div className="bg-[#1A1A1A] rounded-2xl overflow-hidden border border-gray-800/50 active:scale-[0.98] md:hover:border-[#d548ec]/50 transition-all duration-300 md:hover:shadow-2xl md:hover:shadow-[#d548ec]/10">
                    {/* Event Image */}
                    <div className="relative h-56 md:h-64 bg-cover bg-center overflow-hidden"
                      style={{ backgroundImage: `url('${event.image}')` }}
                    >
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                      {/* Verified Badge */}
                      {event.verified && (
                        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-2 bg-blue-500/90 text-white text-xs font-bold rounded-xl shadow-lg backdrop-blur-sm">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>VERIFIED</span>
                        </div>
                      )}

                      {/* Early Access Badge */}
                      {/* Status Badges - Top Right Corner */}
                      {event.isCancelled && (
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-2 bg-red-600/90 backdrop-blur-md text-white text-xs font-bold rounded-xl shadow-lg border border-red-400/50 z-10">
                          <span>❌</span>
                          <span>CANCELLED</span>
                        </div>
                      )}
                      {event.isPaused && !event.isCancelled && (
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-2 bg-yellow-600/90 backdrop-blur-md text-white text-xs font-bold rounded-xl shadow-lg border border-yellow-400/50 z-10">
                          <span>⏸️</span>
                          <span>PAUSED</span>
                        </div>
                      )}
                      
                      {/* Early Access Badge - Show only if not cancelled/paused */}
                      {!event.isCancelled && !event.isPaused && event.earlyAccess && userTier?.earlyAccess && (
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-yellow-500 to-[#e7a4fd] text-white text-xs font-bold rounded-xl shadow-lg backdrop-blur-sm">
                          <span>⚡</span>
                          <span>EARLY ACCESS</span>
                        </div>
                      )}

                      {/* Lock Badge for non-tier users - Show only if not cancelled/paused */}
                      {!event.isCancelled && !event.isPaused && event.earlyAccess && !userTier?.earlyAccess && (
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-2 bg-black/80 backdrop-blur-sm text-gray-300 text-xs font-bold rounded-xl border border-gray-700">
                          <span>🔒</span>
                          <span>TIER ONLY</span>
                        </div>
                      )}

                      {/* Price Badge - Bottom Left */}
                      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-white/20">
                        <span className="text-white font-bold">{event.price}</span>
                        <STXIcon size="md" />
                      </div>
                    </div>

                    {/* Event Info */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-white mb-4 group-hover:text-[#d548ec] transition-colors line-clamp-2">
                        {event.title}
                      </h3>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-3 text-gray-400 text-sm">
                          <Calendar className="w-5 h-5 flex-shrink-0 text-[#d548ec]" />
                          <span className="truncate">{event.date}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-400 text-sm">
                          <MapPin className="w-5 h-5 flex-shrink-0 text-[#d548ec]" />
                          <span className="truncate">{event.location}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-400 text-sm">
                          <Users className="w-5 h-5 flex-shrink-0 text-[#d548ec]" />
                          <span>{event.available} tickets available</span>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <div className="pt-4 border-t border-gray-800">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white font-semibold group-hover:text-[#d548ec] transition-colors">
                            View Details
                          </span>
                          <ArrowRight className="w-5 h-5 text-[#d548ec] transform group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Featured Event Organizers Section */}
        <div className="mt-12 md:mt-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Featured Event Organizers</h2>
              <p className="text-gray-400 text-sm md:text-base">
                {loadingEOs ? 'Loading verified organizers...' : 'Verified organizers creating amazing experiences'}
              </p>
            </div>
          </div>

          {/* Loading State - Skeleton */}
          {loadingEOs && (
            <div className="relative -mx-4 md:mx-0">
              <div className="overflow-x-auto overflow-y-hidden pb-4 scrollbar-none">
                <div className="flex gap-4 md:gap-6 px-4 md:px-0 min-w-min animate-pulse">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] rounded-2xl p-5 border border-gray-800 flex-shrink-0 w-[160px] md:w-[200px]"
                    >
                      {/* Skeleton Avatar */}
                      <div className="relative mb-4">
                        <div className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-full bg-gray-800/50 border-4 border-gray-700/20" />
                      </div>

                      {/* Skeleton Name */}
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <div className="h-5 bg-gray-800/50 rounded w-24" />
                        <div className="w-4 h-4 bg-gray-700/50 rounded-full" />
                      </div>

                      {/* Skeleton Specialty */}
                      <div className="mb-3 space-y-1">
                        <div className="h-3 bg-gray-800/50 rounded w-full" />
                        <div className="h-3 bg-gray-800/50 rounded w-3/4 mx-auto" />
                      </div>

                      {/* Skeleton Stats */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="h-3 bg-gray-700/50 rounded w-12" />
                          <div className="h-3 bg-gray-800/50 rounded w-8" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="h-3 bg-gray-700/50 rounded w-12" />
                          <div className="h-3 bg-gray-800/50 rounded w-10" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loadingEOs && verifiedEOs.length === 0 && (
            <div className="text-center py-12 bg-[#1A1A1A] rounded-xl border border-gray-800">
              <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No verified event organizers yet</p>
            </div>
          )}

          {/* Horizontal Scrollable Container */}
          {!loadingEOs && verifiedEOs.length > 0 && (
            <div className="relative -mx-4 md:mx-0">
              <div className="overflow-x-auto overflow-y-hidden pb-4 scrollbar-none" style={{ scrollBehavior: 'smooth' }}>
                <div className="flex gap-4 md:gap-6 px-4 md:px-0 min-w-min">
                  {verifiedEOs.map((organizer) => (
                    <Link
                      key={organizer.id}
                      to={`/app/eo-profile/${organizer.address}`}
                      className="group relative bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] rounded-2xl p-5 border border-gray-800 hover:border-[#d548ec]/50 transition-all hover:scale-105 active:scale-95 flex-shrink-0 w-[160px] md:w-[200px]"
                    >
                      {/* Avatar */}
                      <div className="relative mb-4">
                        <div className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-full overflow-hidden border-4 border-[#d548ec]/20 group-hover:border-[#d548ec]/50 transition-all">
                          <img 
                            src={organizer.avatar} 
                            alt={organizer.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* Name with Verified Badge */}
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <h3 className="font-bold text-white text-sm md:text-base line-clamp-1 group-hover:text-[#d548ec] transition-colors">
                          {organizer.name}
                        </h3>
                        {organizer.verified && (
                          <BadgeCheck className="w-4 h-4 md:w-5 md:h-5 text-[#d548ec] fill-[#d548ec] flex-shrink-0" />
                        )}
                      </div>

                      {/* Specialty */}
                      <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                        {organizer.specialty}
                      </p>

                      {/* Stats */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Events</span>
                          <span className="text-white font-semibold">{organizer.eventsCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Rating</span>
                          <span className="text-yellow-400 font-semibold">
                            {organizer.rating > 0 ? `⭐ ${organizer.rating.toFixed(1)}` : 'No ratings yet'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                  
                  {/* View All indicator */}
                  <div className="flex-shrink-0 w-[160px] md:w-[200px] bg-gradient-to-br from-[#d548ec]/10 to-purple-600/10 rounded-2xl p-5 border border-[#d548ec]/30 border-dashed flex items-center justify-center cursor-pointer hover:border-[#d548ec]/60 hover:scale-105 transition-all">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-[#d548ec]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <ArrowRight className="w-6 h-6 text-[#d548ec]" />
                      </div>
                      <p className="text-[#d548ec] text-sm font-semibold">View All</p>
                      <p className="text-gray-400 text-xs mt-1">{verifiedEOs.length} EOs</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default BrowseEvents;