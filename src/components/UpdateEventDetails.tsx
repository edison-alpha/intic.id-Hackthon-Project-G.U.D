import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/usePushChainWallet';
import { Calendar, MapPin, Image, FileText, Edit, CheckCircle2, Search, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { searchVenues, type VenueLocation } from '@/services/openstreetmap';
// TODO: Remove Stacks dependency
// import { stringAsciiCV, uintCV } from '@stacks/transactions';

interface UpdateEventDetailsProps {
  contractAddress: string;
  contractName: string;
  currentDetails?: {
    name?: string | undefined;
    venue?: string | undefined;
    venueAddress?: string | undefined;
    venueCoordinates?: string | undefined;
    imageUri?: string | undefined;
    eventDate?: number | undefined;
  };
}

export default function UpdateEventDetails({
  contractAddress,
  contractName,
  currentDetails
}: UpdateEventDetailsProps) {
  const { toast } = useToast();
  const { wallet, isWalletConnected, callContractFunction } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  // Individual field states
  const [eventName, setEventName] = useState(currentDetails?.name || '');
  const [venue, setVenue] = useState(currentDetails?.venue || '');
  const [venueAddress, setVenueAddress] = useState(currentDetails?.venueAddress || '');
  const [venueCoordinates, setVenueCoordinates] = useState(currentDetails?.venueCoordinates || '');
  const [imageUri, setImageUri] = useState(currentDetails?.imageUri || '');
  const [eventDate, setEventDate] = useState(
    currentDetails?.eventDate 
      ? new Date(currentDetails.eventDate).toISOString().split('T')[0]
      : ''
  );

  // Venue search states
  const [venueSearchQuery, setVenueSearchQuery] = useState('');
  const [venueSearchResults, setVenueSearchResults] = useState<VenueLocation[]>([]);
  const [isSearchingVenue, setIsSearchingVenue] = useState(false);
  const [showVenueResults, setShowVenueResults] = useState(false);

  // Search venues with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (venueSearchQuery.trim().length > 2) {
        setIsSearchingVenue(true);
        try {
          const results = await searchVenues(venueSearchQuery);
          setVenueSearchResults(results);
          setShowVenueResults(true);
        } catch (error) {
          console.error('Venue search error:', error);
          setVenueSearchResults([]);
          setShowVenueResults(false);
        } finally {
          setIsSearchingVenue(false);
        }
      } else {
        setVenueSearchResults([]);
        setShowVenueResults(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [venueSearchQuery]);

  // Handle venue selection
  const handleSelectVenue = (venueData: VenueLocation) => {
    setVenue(venueData.name || venueData.displayName);
    setVenueAddress(venueData.displayName);
    setVenueCoordinates(`${venueData.lat},${venueData.lon}`);
    setVenueSearchQuery('');
    setShowVenueResults(false);
    
    toast({
      title: "Venue Selected",
      description: venueData.displayName,
    });
  };

  const handleUpdateField = async (
    functionName: string,
    args: any[],
    fieldName: string
  ) => {
    if (!isWalletConnected || !wallet) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 Updating field:', fieldName, 'with function:', functionName);

      const response = await callContractFunction({
        contractAddress,
        contractName,
        functionName,
        functionArgs: args,
        onFinish: (data: any) => {
          console.log('✅ Field update successful:', data);
          toast({
            title: "Update Submitted! ✅",
            description: (
              <div className="space-y-2">
                <p>Field: <strong>{fieldName}</strong></p>
                <p className="text-xs font-mono break-all">{data.txId}</p>
                <p className="text-xs">Check status on explorer</p>
              </div>
            ),
          });
        }
      });

      console.log('✅ Update response:', response);
    } catch (error: any) {
      console.error('❌ Update error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      let errorMessage = "Failed to update event details";
      
      // Parse specific errors
      if (error?.error) {
        const errorObj = error.error;
        
        if (errorObj.message) {
          errorMessage = errorObj.message;
        }
        
        // Check for specific error codes
        if (errorObj.code === -32602) {
          errorMessage = "Invalid parameters. Please check your input data.";
        } else if (errorObj.code === -32000) {
          errorMessage = "Contract function not found or invalid.";
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Check for common issues
      if (errorMessage.includes("ascii") || errorMessage.includes("utf8")) {
        errorMessage = "Invalid characters detected. Please use only ASCII characters (no special symbols or emojis).";
      } else if (errorMessage.includes("length") || errorMessage.includes("too long")) {
        errorMessage = "Input is too long. Please shorten your text.";
      } else if (errorMessage.includes("owner") || errorMessage.includes("unauthorized")) {
        errorMessage = "Only the contract owner can update event details.";
      }
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Validate ASCII string (only allow ASCII characters)
  const validateAsciiString = (str: string, fieldName: string, maxLength: number = 256): boolean => {
    if (!str || str.trim().length === 0) {
      toast({
        title: "Validation Error",
        description: `${fieldName} cannot be empty`,
        variant: "destructive",
      });
      return false;
    }

    // Check for non-ASCII characters
    if (!/^[\x00-\x7F]*$/.test(str)) {
      toast({
        title: "Invalid Characters",
        description: `${fieldName} contains non-ASCII characters. Please remove special symbols, emojis, or non-English characters.`,
        variant: "destructive",
      });
      return false;
    }

    // Check length
    if (str.length > maxLength) {
      toast({
        title: "Text Too Long",
        description: `${fieldName} must be ${maxLength} characters or less. Current: ${str.length}`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleUpdateEventName = async () => {
    if (!validateAsciiString(eventName, "Event Name", 256)) return;
    
    await handleUpdateField(
      'update-event-name',
      [stringAsciiCV(eventName)],
      'Event Name'
    );
  };

  const handleUpdateVenue = async () => {
    if (!validateAsciiString(venue, "Venue Name", 256)) return;
    if (!validateAsciiString(venueAddress, "Venue Address", 512)) return;
    if (!validateAsciiString(venueCoordinates, "Coordinates", 64)) return;
    
    await handleUpdateField(
      'update-venue-details',
      [
        stringAsciiCV(venue),
        stringAsciiCV(venueAddress),
        stringAsciiCV(venueCoordinates)
      ],
      'Venue Details'
    );
  };

  const handleUpdateImage = async () => {
    if (!validateAsciiString(imageUri, "Image URI", 256)) return;
    
    await handleUpdateField(
      'update-event-image',
      [stringAsciiCV(imageUri)],
      'Event Image'
    );
  };

  const handleUpdateDate = async () => {
    if (!eventDate) {
      toast({
        title: "Missing Date",
        description: "Please provide an event date",
        variant: "destructive",
      });
      return;
    }
    const timestamp = new Date(eventDate).getTime();
    await handleUpdateField(
      'update-event-date',
      [uintCV(timestamp)],
      'Event Date'
    );
  };

  const handleUpdateAll = async () => {
    if (!isWalletConnected || !wallet) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!eventDate) {
      toast({
        title: "Missing Event Date",
        description: "Please provide an event date",
        variant: "destructive",
      });
      return;
    }

    // Validate all fields
    if (!validateAsciiString(eventName, "Event Name", 256)) return;
    if (!validateAsciiString(venue, "Venue Name", 256)) return;
    if (!validateAsciiString(venueAddress, "Venue Address", 512)) return;
    if (!validateAsciiString(venueCoordinates, "Coordinates", 64)) return;
    if (!validateAsciiString(imageUri, "Image URI", 256)) return;

    setIsLoading(true);
    try {
      const timestamp = new Date(eventDate).getTime();

      console.log('🔍 Batch updating all event details');

      // Prepare Clarity values
      const clarityArgs = [
        stringAsciiCV(eventName),
        stringAsciiCV(venue),
        stringAsciiCV(venueAddress),
        stringAsciiCV(venueCoordinates),
        stringAsciiCV(imageUri),
        uintCV(timestamp)
      ];

      const response = await callContractFunction({
        contractAddress,
        contractName,
        functionName: 'update-all-event-details',
        functionArgs: clarityArgs,
        onFinish: (data: any) => {
          console.log('✅ Batch update successful:', data);
          toast({
            title: "Batch Update Submitted! 🎉",
            description: (
              <div className="space-y-2">
                <p>All event details updated in one transaction</p>
                <p className="text-xs font-mono break-all">{data.txId}</p>
              </div>
            ),
          });
        }
      });

      console.log('✅ Batch update response:', response);
    } catch (error: any) {
      console.error('❌ Batch update error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      let errorMessage = "Failed to update event details";
      
      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full bg-[#0A0A0A] border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="flex items-center gap-2 text-white">
          <Edit className="h-5 w-5 text-[#d548ec]" />
          Update Event Details
        </CardTitle>
        <CardDescription className="text-gray-400">
          Only the contract owner can update event details. Financial terms (price, supply) cannot be changed.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="individual" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#1A1A1A] border border-gray-800">
            <TabsTrigger 
              value="individual"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#d548ec] data-[state=active]:to-[#e7a4fd] data-[state=active]:text-white text-gray-400"
            >
              Update Individual
            </TabsTrigger>
            <TabsTrigger 
              value="batch"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#d548ec] data-[state=active]:to-[#e7a4fd] data-[state=active]:text-white text-gray-400"
            >
              Batch Update
            </TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="space-y-6 mt-6">
            {/* Event Name */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-white">
                <FileText className="h-4 w-4 text-[#d548ec]" />
                Event Name
              </Label>
              <div className="flex gap-2">
                <Input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Enter new event name"
                  className="bg-[#1A1A1A] border-gray-700 text-white placeholder:text-gray-500"
                  maxLength={256}
                />
                <Button
                  onClick={handleUpdateEventName}
                  disabled={isLoading || !eventName}
                  size="sm"
                  className="bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] hover:from-[#c030d6] hover:to-[#d183f0] text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Update
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Only ASCII characters allowed (no emojis or special symbols). Max 256 characters.
              </p>
            </div>

            {/* Venue Details */}
            <div className="space-y-2 p-4 bg-[#1A1A1A] border border-gray-800 rounded-lg">
              <Label className="flex items-center gap-2 text-white">
                <MapPin className="h-4 w-4 text-[#d548ec]" />
                Venue Details
              </Label>
              
              {/* Venue Search */}
              <div className="relative">
                <Label className="text-xs text-gray-400 mb-2">Search Venue</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={venueSearchQuery}
                    onChange={(e) => {
                      setVenueSearchQuery(e.target.value);
                      setShowVenueResults(true);
                    }}
                    placeholder="Search for venue..."
                    className="bg-[#0A0A0A] border-gray-700 text-white placeholder:text-gray-500 pl-10"
                  />
                  {isSearchingVenue && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#d548ec] animate-spin" />
                  )}
                </div>
                
                {/* Search Results Dropdown */}
                {showVenueResults && venueSearchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-[#0A0A0A] border border-gray-700 rounded-lg max-h-64 overflow-y-auto shadow-xl">
                    {venueSearchResults.map((result, index) => (
                      <div
                        key={index}
                        onClick={() => handleSelectVenue(result)}
                        className="p-3 hover:bg-[#1A1A1A] cursor-pointer border-b border-gray-800 last:border-b-0"
                      >
                        <div className="font-medium text-white">{result.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{result.displayName}</div>
                        {result.type && (
                          <div className="text-xs text-[#d548ec] mt-1">
                            {result.type}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Label className="text-xs text-gray-400 mt-3">Venue Name</Label>
              <Input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Venue name"
                className="bg-[#0A0A0A] border-gray-700 text-white placeholder:text-gray-500"
                maxLength={256}
              />
              
              <Label className="text-xs text-gray-400 mt-3">Full Address</Label>
              <Input
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                placeholder="Full venue address"
                className="bg-[#0A0A0A] border-gray-700 text-white placeholder:text-gray-500"
                maxLength={512}
              />
              
              <Label className="text-xs text-gray-400 mt-3">Coordinates (lat,lon)</Label>
              <Input
                value={venueCoordinates}
                onChange={(e) => setVenueCoordinates(e.target.value)}
                placeholder="-6.214992,106.800572"
                className="bg-[#0A0A0A] border-gray-700 text-white placeholder:text-gray-500"
                maxLength={64}
              />
              <p className="text-xs text-gray-500 mt-1">
                Only ASCII characters (A-Z, 0-9, basic punctuation). No emojis or special symbols.
              </p>

              {/* Google Maps Preview */}
              {venueCoordinates && (
                <div className="mt-3">
                  <Label className="text-xs text-gray-400 mb-2">Location Preview</Label>
                  <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-700">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${venueCoordinates}`}
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
              
              <Button
                onClick={handleUpdateVenue}
                disabled={isLoading || !venue}
                className="w-full mt-3 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] hover:from-[#c030d6] hover:to-[#d183f0] text-white"
                size="sm"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Update Venue
              </Button>
            </div>

            {/* Image URI */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-white">
                <Image className="h-4 w-4 text-[#d548ec]" />
                Image URI (IPFS)
              </Label>
              <div className="flex gap-2">
                <Input
                  value={imageUri}
                  onChange={(e) => setImageUri(e.target.value)}
                  placeholder="ipfs://..."
                  className="bg-[#1A1A1A] border-gray-700 text-white placeholder:text-gray-500"
                />
                <Button
                  onClick={handleUpdateImage}
                  disabled={isLoading || !imageUri}
                  size="sm"
                  className="bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] hover:from-[#c030d6] hover:to-[#d183f0] text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Update
                </Button>
              </div>
            </div>

            {/* Event Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-white">
                <Calendar className="h-4 w-4 text-[#d548ec]" />
                Event Date
              </Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="bg-[#1A1A1A] border-gray-700 text-white"
                />
                <Button
                  onClick={handleUpdateDate}
                  disabled={isLoading || !eventDate}
                  size="sm"
                  className="bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] hover:from-[#c030d6] hover:to-[#d183f0] text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Update
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="batch" className="space-y-4 mt-6">
            <div className="space-y-4 p-4 bg-[#1A1A1A] border border-gray-800 rounded-lg">
              <div className="space-y-2">
                <Label className="text-white">Event Name</Label>
                <Input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Event name"
                  className="bg-[#0A0A0A] border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              {/* Venue Search */}
              <div className="space-y-2">
                <Label className="text-white">Search Venue</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={venueSearchQuery}
                    onChange={(e) => {
                      setVenueSearchQuery(e.target.value);
                      setShowVenueResults(true);
                    }}
                    placeholder="Search for venue..."
                    className="bg-[#0A0A0A] border-gray-700 text-white placeholder:text-gray-500 pl-10"
                  />
                  {isSearchingVenue && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#d548ec] animate-spin" />
                  )}
                </div>
                
                {/* Search Results Dropdown */}
                {showVenueResults && venueSearchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-[#0A0A0A] border border-gray-700 rounded-lg max-h-64 overflow-y-auto shadow-xl">
                    {venueSearchResults.map((result, index) => (
                      <div
                        key={index}
                        onClick={() => handleSelectVenue(result)}
                        className="p-3 hover:bg-[#1A1A1A] cursor-pointer border-b border-gray-800 last:border-b-0"
                      >
                        <div className="font-medium text-white">{result.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{result.displayName}</div>
                        {result.type && (
                          <div className="text-xs text-[#d548ec] mt-1">
                            {result.type}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-white">Venue Name</Label>
                <Input
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Venue name"
                  className="bg-[#0A0A0A] border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Venue Address</Label>
                <Input
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  placeholder="Full address"
                  className="bg-[#0A0A0A] border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Coordinates</Label>
                <Input
                  value={venueCoordinates}
                  onChange={(e) => setVenueCoordinates(e.target.value)}
                  placeholder="lat,lon"
                  className="bg-[#0A0A0A] border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              {/* Google Maps Preview for Batch */}
              {venueCoordinates && (
                <div className="space-y-2">
                  <Label className="text-white">Location Preview</Label>
                  <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-700">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${venueCoordinates}`}
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-white">Image URI</Label>
                <Input
                  value={imageUri}
                  onChange={(e) => setImageUri(e.target.value)}
                  placeholder="ipfs://..."
                  className="bg-[#0A0A0A] border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Event Date</Label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="bg-[#0A0A0A] border-gray-700 text-white"
                />
              </div>

              <Button
                onClick={handleUpdateAll}
                disabled={isLoading || !eventName || !venue}
                className="w-full bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] hover:from-[#c030d6] hover:to-[#d183f0] text-white"
                size="lg"
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Update All Details (One Transaction)
              </Button>
            </div>

            <div className="text-sm text-gray-400 bg-[#0A0A0A] border border-gray-800 p-4 rounded-lg">
              <p className="font-semibold mb-2 text-[#d548ec]">💡 Batch Update Benefits:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                <li>Update all fields in one transaction</li>
                <li>Save on transaction fees</li>
                <li>Atomic update (all or nothing)</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-gradient-to-r from-[#d548ec]/10 to-[#e7a4fd]/10 border border-[#d548ec]/20 rounded-lg">
          <p className="text-sm font-semibold text-white mb-2">
            🔒 What Can Be Updated:
          </p>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>✅ Event name (fix typos, rebrand)</li>
            <li>✅ Venue details (location change)</li>
            <li>✅ Image URI (new poster)</li>
            <li>✅ Event date (reschedule)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
