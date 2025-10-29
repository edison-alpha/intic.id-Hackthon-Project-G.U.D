import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MintNFTButton from '@/components/MintNFTButton';
import TicketSelection, { TicketType } from '@/components/TicketSelection';
import { useWallet } from '@/hooks/usePushChainWallet';
import { fetchCompleteEventDetails } from '@/services/eventBrowseContract';
import { getOrganizerDetails, getMetadataFromProfileUri } from '@/services/eventOrganizerContract';
import {
  Calendar,
  MapPin,
  ArrowLeft,
  Share2,
  CheckCircle,
  Info,
  Ticket,
  BadgeCheck,
  Users,
  Star,
  MessageSquare,
  Plus,
  Minus
} from 'lucide-react';
import { EventDetailSkeleton } from '@/components/EventSkeletons';
import { toast } from 'sonner';
import STXIcon from '@/components/STXIcon';

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isWalletConnected } = useWallet();
  const [event, setEvent] = useState<any>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicketType, setSelectedTicketType] = useState<string>('');
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [ticketQuantity, setTicketQuantity] = useState<number>(1);

  useEffect(() => {
    if (id) {
      loadEventData();
    }
  }, [id]);

  const loadEventData = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Loading event details for:', id);
      
      // The id is the contract address
      const contractAddress = id;
      
      // Fetch complete event details from blockchain
      const eventData = await fetchCompleteEventDetails(contractAddress);
      
      if (!eventData) {
        throw new Error('Event not found on blockchain');
      }
      
      console.log('✅ Event data loaded:', eventData);
      
      // Parse coordinates if available
      let latitude = 0;
      let longitude = 0;
      if (eventData.venueCoordinates) {
        if (typeof eventData.venueCoordinates === 'object' && 'lat' in eventData.venueCoordinates) {
          latitude = eventData.venueCoordinates.lat;
          longitude = eventData.venueCoordinates.lon;
        } else if (typeof eventData.venueCoordinates === 'string') {
          const coords = (eventData.venueCoordinates as string).split(',');
          latitude = coords.length > 0 && coords[0] ? parseFloat(coords[0]) : 0;
          longitude = coords.length > 1 && coords[1] ? parseFloat(coords[1]) : 0;
        }
      }
      
      // Set event data with proper structure
      const transformedEvent = {
        id: contractAddress,
        contractAddress: contractAddress,
        title: eventData.title || eventData.eventName,
        image: eventData.image || eventData.eventImageUri,
        date: eventData.date,
        time: eventData.time,
        location: eventData.location || eventData.eventVenue,
        venueAddress: eventData.venueAddress,
        venueCoordinates: eventData.venueCoordinates,
        latitude,
        longitude,
        description: eventData.description || eventData.metadata?.description || 'No description available',
        category: eventData.category || 'other',
        price: eventData.price || eventData.ticketPrice,
        priceInMicroSTX: parseFloat(eventData.price || eventData.ticketPrice || '0') * 1000000,
        available: eventData.available || eventData.ticketsRemaining,
        total: eventData.total || eventData.maxSupply,
        minted: eventData.minted || eventData.ticketsSold,
        isActive: eventData.isActive,
        isCancelled: eventData.isCancelled || eventData.eventCancelled,
        isPaused: eventData.eventPaused,
        verified: true,
        featured: true,
        organizer: eventData.organizer,
        eventDate: eventData.eventDate,
        status: eventData.status,
        soldOut: eventData.ticketsRemaining === 0,
        ended: eventData.status === 'Ended',
      };
      
      setEvent(transformedEvent);
      
      // Create ticket types based on event data
      // For now, we'll create example ticket types
      // In the future, this should come from the smart contract
      const mockTicketTypes: TicketType[] = [
        {
          id: 'regular',
          name: 'Regular Ticket',
          type: 'Regular',
          price: transformedEvent.price,
          priceInMicroSTX: transformedEvent.priceInMicroSTX,
          totalSupply: Math.floor(transformedEvent.total * 0.6), // 60% regular
          sold: Math.floor(transformedEvent.minted * 0.6),
          remaining: Math.floor(transformedEvent.available * 0.6),
          features: [
            'Event admission',
            'Digital NFT ticket',
            'Standard seating',
            'Access to main venue'
          ],
          icon: 'ticket',
          color: '#3b82f6', // blue
          available: true
        },
        {
          id: 'vip',
          name: 'VIP Ticket',
          type: 'VIP',
          price: (parseFloat(transformedEvent.price) * 2.5).toFixed(2),
          priceInMicroSTX: transformedEvent.priceInMicroSTX * 2.5,
          totalSupply: Math.floor(transformedEvent.total * 0.3), // 30% VIP
          sold: Math.floor(transformedEvent.minted * 0.3),
          remaining: Math.floor(transformedEvent.available * 0.3),
          cooldownPeriod: 24, // 24 hour cooldown
          cooldownRemaining: 0,
          features: [
            'Premium seating area',
            'Exclusive VIP lounge access',
            'Meet & greet opportunity',
            'Complimentary refreshments',
            'Priority entry'
          ],
          icon: 'star',
          color: '#f59e0b', // amber
          available: true
        },
        {
          id: 'vvip',
          name: 'VVIP Ticket',
          type: 'VVIP',
          price: (parseFloat(transformedEvent.price) * 5).toFixed(2),
          priceInMicroSTX: transformedEvent.priceInMicroSTX * 5,
          totalSupply: Math.floor(transformedEvent.total * 0.1), // 10% VVIP
          sold: Math.floor(transformedEvent.minted * 0.1),
          remaining: Math.floor(transformedEvent.available * 0.1),
          cooldownPeriod: 48, // 48 hour cooldown
          cooldownRemaining: 0,
          features: [
            'Front row seating',
            'Backstage access',
            'Private meet & greet',
            'Premium gift package',
            'VIP parking spot',
            'Professional photo opportunity',
            'Exclusive merchandise'
          ],
          icon: 'crown',
          color: '#d548ec', // purple/pink
          available: true
        }
      ];

      setTicketTypes(mockTicketTypes);
      
      // Auto-select first available ticket
      const firstAvailable = mockTicketTypes.find(t => t.available && t.remaining > 0);
      if (firstAvailable) {
        setSelectedTicketType(firstAvailable.id);
      }
      
      // Fetch organizer details if available
      if (eventData.organizer) {
        try {
          console.log('🔍 Loading organizer details for:', eventData.organizer);
          const organizerData = await getOrganizerDetails(eventData.organizer);
          
          // Fetch organizer metadata from IPFS
          let organizerMetadata: any = {};
          if (organizerData.profileUri) {
            try {
              organizerMetadata = await getMetadataFromProfileUri(organizerData.profileUri);
            } catch (err) {
              console.warn('⚠️ Could not fetch organizer metadata:', err);
            }
          }
          
          const transformedOrganizer = {
            id: eventData.organizer,
            address: eventData.organizer,
            name: organizerMetadata.name || organizerMetadata.eoName || `EO ${eventData.organizer.substring(0, 8)}`,
            avatar: organizerMetadata.logo || organizerMetadata.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${eventData.organizer}`,
            verified: organizerData.isVerified,
            totalEvents: organizerData.totalEvents,
            ticketsSold: organizerData.totalTicketsSold,
            rating: organizerData.averageRating / 10, // Convert from 0-50 to 0-5
            bio: organizerMetadata.description || 'Verified event organizer',
          };
          
          setOrganizer(transformedOrganizer);
          console.log('✅ Organizer data loaded:', transformedOrganizer);
        } catch (err) {
          console.error('❌ Error loading organizer details:', err);
        }
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('❌ Error loading event data:', err);
      setError(err.message || 'Failed to load event details');
      toast.error(err.message || 'Failed to load event details');
      setLoading(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const handleMintSuccess = () => {
    toast.success('Ticket minted successfully! Refreshing data...');
    setTicketQuantity(1); // Reset quantity after successful mint
    setTimeout(() => {
      loadEventData();
    }, 3000);
  };

  const handleTicketSelection = (ticketId: string) => {
    setSelectedTicketType(ticketId);
    const selectedTicket = ticketTypes.find(t => t.id === ticketId);
    if (selectedTicket) {
      toast.success(`Selected: ${selectedTicket.name}`, {
        description: `Price: ${selectedTicket.price} PUSH`,
      });
    }
  };

  const handleIncreaseQuantity = () => {
    if (ticketQuantity < Math.min(event.available, 10)) { // Max 10 tickets per transaction
      setTicketQuantity(prev => prev + 1);
    }
  };

  const handleDecreaseQuantity = () => {
    if (ticketQuantity > 1) {
      setTicketQuantity(prev => prev - 1);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <EventDetailSkeleton />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Info className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Failed to Load Event</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => loadEventData()} variant="outline">
                Try Again
              </Button>
              <Button onClick={() => navigate('/app')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Events
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!event) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Event Not Found</h2>
            <p className="text-gray-400 mb-4">The event you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/app')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const availabilityPercentage = event.total > 0 ? ((event.available / event.total) * 100).toFixed(0) : 0;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/app')}
          className="mb-6 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative rounded-2xl overflow-hidden aspect-video">
              <img
                src={event.image}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-black/50 hover:bg-black/70 backdrop-blur-sm"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Status Overlay */}
              {(event.isCancelled || event.isPaused || event.soldOut || event.ended) && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  {event.isCancelled ? (
                    <Badge variant="destructive" className="text-lg py-2 px-4 bg-red-600">
                      Event Cancelled
                    </Badge>
                  ) : event.isPaused ? (
                    <Badge className="text-lg py-2 px-4 bg-yellow-600 text-white border-0">
                      Event Paused
                    </Badge>
                  ) : event.soldOut ? (
                    <Badge className="text-lg py-2 px-4 bg-purple-600 text-white border-0">
                      Sold Out
                    </Badge>
                  ) : event.ended ? (
                    <Badge variant="destructive" className="text-lg py-2 px-4 bg-gray-600">
                      Event Ended
                    </Badge>
                  ) : null}
                </div>
              )}
            </div>

            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-white mb-2">{event.title}</h1>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-[#d548ec]/20 text-[#d548ec]">
                        {event.category}
                      </Badge>
                      
                      {/* Status Badge */}
                      {event.isCancelled && (
                        <Badge variant="secondary" className="bg-red-500/20 text-red-400 flex items-center gap-1">
                          ❌ Cancelled
                        </Badge>
                      )}
                      {event.isPaused && !event.isCancelled && (
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                          ⏸️ Paused
                        </Badge>
                      )}
                      {event.soldOut && !event.isCancelled && !event.isPaused && (
                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 flex items-center gap-1">
                          🎫 Sold Out
                        </Badge>
                      )}
                      {event.ended && !event.isCancelled && !event.isPaused && (
                        <Badge variant="secondary" className="bg-gray-500/20 text-gray-400 flex items-center gap-1">
                          🏁 Ended
                        </Badge>
                      )}
                      
                      {event.verified && (
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Verified
                        </Badge>
                      )}
                      {event.featured && (
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                          ⭐ Featured
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 text-gray-300">
                    <Calendar className="w-5 h-5 text-[#d548ec]" />
                    <div>
                      <div className="font-semibold">{event.date}</div>
                      <div className="text-sm text-gray-400">{event.time}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-gray-300">
                    <MapPin className="w-5 h-5 text-[#d548ec]" />
                    <div>
                      <div className="font-semibold">{event.location}</div>
                      <div className="text-sm text-gray-400">Event Venue</div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-6">
                  <h3 className="text-xl font-semibold text-white mb-3">About This Event</h3>
                  <p className="text-gray-400 leading-relaxed">
                    {event.description}
                  </p>
                </div>

                {/* Event Creator/Organizer Section */}
                {organizer && (
                  <div className="border-t border-gray-800 mt-6 pt-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Event Organizer</h3>
                    <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-[#d548ec]/5 to-purple-600/5 rounded-xl border border-[#d548ec]/20 hover:border-[#d548ec]/40 transition-all">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#d548ec] to-purple-600 p-0.5">
                          <img 
                            src={organizer.avatar} 
                            alt={organizer.name}
                            className="w-full h-full rounded-full bg-[#1A1A1A] object-cover"
                          />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-lg font-semibold text-white">{organizer.name}</h4>
                          {organizer.verified && (
                            <BadgeCheck className="w-5 h-5 text-blue-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{organizer.bio}</p>
                        
                        {/* Stats */}
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Ticket className="w-4 h-4 text-[#d548ec]" />
                            <span className="text-gray-300">{organizer.totalEvents} Events</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span className="text-gray-300">{organizer.ticketsSold.toLocaleString()} Tickets</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span className="text-gray-300">{organizer.rating.toFixed(1)} Rating</span>
                          </div>
                        </div>
                      </div>

                      {/* View Profile Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-shrink-0 border-[#d548ec]/50 hover:bg-[#d548ec]/10 hover:border-[#d548ec] text-[#d548ec]"
                        onClick={() => navigate(`/app/eo-profile/${organizer.address}`)}
                      >
                        View Profile
                      </Button>
                    </div>
                  </div>
                )}

                {/* Ticket Selection Section */}
                {ticketTypes.length > 0 && (
                  <div className="border-t border-gray-800 mt-6 pt-6">
                    <TicketSelection
                      tickets={ticketTypes}
                      selectedTicketId={selectedTicketType}
                      onSelectTicket={handleTicketSelection}
                      isWalletConnected={isWalletConnected}
                    />
                  </div>
                )}

                {/* Venue Map Preview */}
                {event.venueCoordinates && event.latitude !== 0 && event.longitude !== 0 && (
                  <div className="border-t border-gray-800 mt-6 pt-6">
                    <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-[#d548ec]" />
                      Venue Location
                    </h3>
                    <div className="space-y-3">
                      {event.venueAddress && (
                        <p className="text-sm text-gray-400">
                          {event.venueAddress}
                        </p>
                      )}
                      <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-900">
                        <iframe
                          src={`https://www.google.com/maps?q=${event.latitude},${event.longitude}&hl=es;z=14&output=embed`}
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          className="w-full h-full"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-gray-700 hover:border-[#d548ec] hover:text-[#d548ec]"
                          onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`, '_blank')}
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          Open in Google Maps
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-gray-700 hover:border-[#d548ec] hover:text-[#d548ec]"
                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`, '_blank')}
                        >
                          Get Directions
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Debug info if no coordinates */}
                {(!event.venueCoordinates || event.latitude === 0 || event.longitude === 0) && (
                  <div className="border-t border-gray-800 mt-6 pt-6">
                    <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-yellow-500 mb-2">
                        🗺️ Map Preview Unavailable
                      </h4>
                      <p className="text-xs text-gray-400 mb-2">
                        Venue coordinates not available for this event.
                      </p>
                      <details className="text-xs text-gray-500">
                        <summary className="cursor-pointer hover:text-gray-300">Debug Info</summary>
                        <pre className="mt-2 bg-black/30 p-2 rounded overflow-x-auto">
                          {JSON.stringify({
                            venueCoordinates: event.venueCoordinates || 'null',
                            latitude: event.latitude,
                            longitude: event.longitude,
                            venue: event.location,
                            venueAddress: event.venueAddress || 'null',
                          }, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-800 mt-6 pt-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Contract Information</h3>
                  <div className="bg-[#0A0A0A] rounded-lg p-3">
                    <div className="text-xs font-mono text-gray-500 break-all">
                      {event.id}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="bg-[#1A1A1A] border-gray-800 sticky top-4">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-[#d548ec]" />
                  Purchase Ticket
                </h3>

                {/* Overall Event Stats */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Total Event Capacity</span>
                    <span className="text-sm font-semibold text-white">
                      {event.available} / {event.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] h-2 rounded-full transition-all"
                      style={{ width: `${availabilityPercentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {event.minted} total tickets minted
                  </div>
                </div>

                {/* Purchase Button */}
                <div className="space-y-3 mb-6">
                  {isWalletConnected ? (
                    event.isActive && event.available > 0 ? (
                      <>
                        <MintNFTButton
                          contractId={event.id}
                          price={event.priceInMicroSTX * ticketQuantity}
                          onSuccess={handleMintSuccess}
                          eventName={event.title}
                          quantity={ticketQuantity}
                          eventDate={event.date}
                          eventTime={event.time}
                          location={event.location}
                        />
                        {ticketQuantity > 1 && (
                          <div className="text-center text-xs text-gray-400">
                            <Info className="w-3 h-3 inline mr-1" />
                            You will need to confirm {ticketQuantity} transactions
                          </div>
                        )}
                      </>
                    ) : (
                      <Button
                        disabled
                        size="lg"
                        className="w-full"
                      >
                        <Ticket className="w-5 h-5 mr-2" />
                        {!event.isActive ? 'Event Ended' : 'Sold Out'}
                      </Button>
                    )
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-gray-400 mb-3">
                        Connect your wallet to mint tickets
                      </p>
                      <Button
                        size="lg"
                        className="w-full bg-gradient-to-r from-[#d548ec] to-[#e7a4fd]"
                        onClick={() => toast.info('Please connect your wallet from the header')}
                      >
                        Connect Wallet
                      </Button>
                    </div>
                  )}
                </div>

                {/* Ticket Summary - After Purchase Button */}
                <div className="border-t border-gray-800 pt-6">
                  <h4 className="text-sm font-semibold text-gray-400 mb-4">Ticket Details</h4>
                  <div className="bg-gradient-to-br from-[#d548ec]/10 to-purple-600/10 rounded-xl p-4 border border-[#d548ec]/30">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                        <span className="text-xs text-gray-400">Ticket Type</span>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/40"
                          >
                            Regular
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                        <span className="text-xs text-gray-400">Price per ticket</span>
                        <div className="flex items-center gap-1">
                          <span className="text-base font-bold text-white">{event.price}</span>
                          <span className="text-xs text-gray-300">PUSH</span>
                          <STXIcon size="sm" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                        <span className="text-xs text-gray-400">Quantity</span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 border-gray-700 hover:border-[#d548ec] hover:bg-[#d548ec]/10"
                            onClick={handleDecreaseQuantity}
                            disabled={ticketQuantity <= 1 || !event.isActive}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-base font-bold text-white min-w-[2rem] text-center">
                            {ticketQuantity}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 border-gray-700 hover:border-[#d548ec] hover:bg-[#d548ec]/10"
                            onClick={handleIncreaseQuantity}
                            disabled={ticketQuantity >= Math.min(event.available, 10) || !event.isActive}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3">
                        <span className="text-sm font-semibold text-white">Total Amount</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xl font-bold text-white">
                            {(parseFloat(event.price) * ticketQuantity).toFixed(2)}
                          </span>
                          <span className="text-sm font-semibold text-gray-300">PUSH</span>
                          <STXIcon size="md" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Info */}
                  <div className="mt-3 text-xs text-gray-400 text-center">
                    Maximum {Math.min(event.available, 10)} tickets per transaction
                  </div>
                </div>

                <div className="mt-6 space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Instant ticket delivery</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>NFT ownership proof</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Blockchain verified</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comments and Ratings Section */}
            <Card className="bg-[#1A1A1A] border-gray-800 mt-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#d548ec]" />
                    Reviews & Ratings
                  </h3>
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="text-lg font-bold text-white">0.0</span>
                    <span className="text-sm text-gray-400">(0)</span>
                  </div>
                </div>

                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg font-semibold mb-2">Reviews Coming Soon</p>
                  <p className="text-gray-500 text-sm">
                    The review and rating system will be available in a future update.
                  </p>
                </div>

                {/* Add Review Button */}
                {isWalletConnected && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <Button
                      variant="outline"
                      className="w-full border-[#d548ec]/50 hover:bg-[#d548ec]/10 hover:border-[#d548ec] text-[#d548ec]"
                      onClick={() => toast.info('Review feature coming soon!')}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Write a Review
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default EventDetail;
