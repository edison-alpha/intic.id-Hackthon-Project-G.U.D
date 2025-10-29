import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { useEOMode } from '@/contexts/EOContext';
import {
  Calendar,
  MapPin,
  DollarSign,
  Users,
  ImageIcon,
  Loader2,
  Upload,
  Check,
  AlertCircle,
  Rocket,
  Info,
  ExternalLink,
  Search,
  X,
  Settings,
  Copy,
  Lock,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePushChain } from '@pushchain/ui-kit';
import {
  uploadImageToPinata,
  uploadMetadataToPinata,
  generateTicketMetadata,
  testPinataConnection,
} from '@/services/pinataService';
import { searchVenues, type VenueLocation } from '@/services/openstreetmap';
import {
  deployEventTicket,
  connectWallet,
  getBalance,
  estimateDeploymentCost,
  isMetaMaskInstalled,
} from '@/services/eventTicketContract';
import { deployEventTicketUniversal } from '@/services/universalTicketDeployment';
import { useEORegistration } from '@/hooks/useEORegistration';
import { CONTRACTS } from '@/config/contracts';
import EOProfileRequiredModal from '@/components/EOProfileRequiredModal';
import { getUEABalance, formatUEABalance } from '@/services/ueaService';
import { usePushChainClient } from '@pushchain/ui-kit';

// Import logos
import STXIcon from '@/components/STXIcon';
import ticLogo from '@/assets/tic.png';
import { ETHIcon, SOLIcon } from '@/components/CryptoIcons';

interface FormData {
  eventName: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  venueAddress: string;
  category: string;
  description: string;
  ticketType: string;
  pricingMode: 'fixed' | 'usd-dynamic';
  ticketPrice: string;
  currency: 'PUSH' | 'TIC' | 'ETH' | 'SOL';
  totalSupply: string;
  royaltyPercentage: string;
}

const useCryptoPrice = (currency: 'PUSH' | 'TIC' | 'ETH' | 'SOL') => {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      setLoading(true);
      setError(null);

      try {
        // For TIC, use mock price for now
        if (currency === 'TIC') {
          setPrice(1); // Mock TIC price $0.1
          setLoading(false);
          return;
        }

        // For ETH and SOL, use mock prices for now (coming soon)
        if (currency === 'ETH') {
          setPrice(3000); // Mock ETH price
          setLoading(false);
          return;
        }

        if (currency === 'SOL') {
          setPrice(100); // Mock SOL price
          setLoading(false);
          return;
        }

        // Using CoinGecko API to get PUSH protocol price
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=push-protocol&vs_currencies=usd'
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch price data');
        }

        const data = await response.json();
        const priceValue = data['push-protocol']?.usd;

        if (priceValue !== undefined) {
          setPrice(parseFloat(priceValue));
        } else {
          setError('Price data not available');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    // Fetch price immediately and then every 30 seconds
    fetchPrice();
    const interval = setInterval(fetchPrice, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [currency]);

  return { price, loading, error };
};

const CreateEventNFT = () => {
  const navigate = useNavigate();
  const { isEOMode, isTransitioning } = useEOMode();
  const [step, setStep] = useState<'form' | 'upload' | 'deploy'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real blockchain deployment state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [deploymentProgress, setDeploymentProgress] = useState<string>('');
  const [verificationWarning, setVerificationWarning] = useState<string>('');

  // Push Chain Universal Wallet
  const { pushChainClient } = usePushChainClient();
  const { PushChain } = usePushChain();

  // Real wallet state (MetaMask - for backward compatibility)
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [address, setAddress] = useState<string>('');
  const [pcBalance, setPcBalance] = useState<string>('0');
  const [ueaBalance, setUeaBalance] = useState<number>(0);
  const [estimatedCost, setEstimatedCost] = useState<number>(0.25);

  // EO Registration state - use new hook
  const { isRegistered: isEORegistered, isLoading: isCheckingEO, ueaAddress: ueaFromHook } = useEORegistration(address);
  // Auto-verify all registered EOs (Push Chain users are pre-verified)
  const isEOVerified = isEORegistered;
  const [showEOModal, setShowEOModal] = useState(false);

  // Connect wallet on mount if MetaMask is installed
  useEffect(() => {
    const checkWallet = async () => {
      if (isMetaMaskInstalled() && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            setAddress(accounts[0]);
            setIsWalletConnected(true);
            const balance = await getBalance(accounts[0]);
            setPcBalance(balance);

            // UEA address will be fetched by useEORegistration hook

            // Fetch UEA balance
            try {
              const uea = await getUEABalance(accounts[0]);
              setUeaBalance(uea);
            } catch (error) {
              console.error('Error fetching UEA balance:', error);
              setUeaBalance(0);
            }
          }
        } catch (error) {
          console.error('Error checking wallet:', error);
        }
      }
    };
    checkWallet();

    // Check EO Mode - redirect if not in EO mode
    if (!isEOMode && !isTransitioning) {
      // Delay navigation to avoid React error #300
      const timer = setTimeout(() => {
        toast.error('Please switch to Event Organizer mode to create events');
        navigate('/app');
      }, 100);
      return () => clearTimeout(timer);
    }

    // Estimate deployment cost
    estimateDeploymentCost().then(cost => setEstimatedCost(cost));

    // Force PUSH currency (TIC is coming soon)
    setFormData(prev => ({ ...prev, currency: 'PUSH' }));
    
    // Return undefined explicitly when condition not met
    return undefined;
  }, [isEOMode, isTransitioning, navigate]);

  // Show EO modal if not registered
  useEffect(() => {
    if (!isCheckingEO && !isEORegistered && address) {
      setShowEOModal(true);
    }
  }, [isCheckingEO, isEORegistered, address]);

  const openWalletModal = () => {
    if (!isMetaMaskInstalled()) {
      toast.error('Please install MetaMask to connect your wallet');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }
    handleConnectWallet();
  };

  const handleConnectWallet = async () => {
    try {
      const walletAddress = await connectWallet();
      setAddress(walletAddress);
      setIsWalletConnected(true);
      const balance = await getBalance(walletAddress);
      setPcBalance(balance);

      // UEA address will be fetched by useEORegistration hook

      // Fetch UEA balance
      try {
        const uea = await getUEABalance(walletAddress);
        setUeaBalance(uea);
      } catch (error) {
        console.error('Error fetching UEA balance:', error);
        setUeaBalance(0);
      }

      toast.success('Wallet connected successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect wallet');
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // Form data
  const [formData, setFormData] = useState<FormData>({
    eventName: '',
    eventDate: '',
    eventTime: '',
    venue: '',
    venueAddress: '',
    category: 'concert',
    description: '',
    ticketType: 'Regular',
    pricingMode: 'fixed',
    ticketPrice: '0.1',
    currency: 'PUSH',
    totalSupply: '100',
    royaltyPercentage: '5',
  });

  // Price preview
  const { price: cryptoPrice, loading: priceLoading, error: priceError } = useCryptoPrice(formData.currency);

  // Image & Metadata
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageIpfsUrl, setImageIpfsUrl] = useState<string | null>(null);
  const [metadataIpfsUrl, setMetadataIpfsUrl] = useState<string | null>(null);
  const [metadataCid, setMetadataCid] = useState<string | null>(null);
  const [deployedTxId, setDeployedTxId] = useState<string | null>(null);

  // Venue search
  const [venueQuery, setVenueQuery] = useState('');
  const [venueResults, setVenueResults] = useState<VenueLocation[]>([]);
  const [isSearchingVenue, setIsSearchingVenue] = useState(false);
  const [showVenueResults, setShowVenueResults] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<VenueLocation | null>(null);

  // Event name validation state
  const [eventNameWarning, setEventNameWarning] = useState<string | null>(null);

  // Debounced venue search
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (venueQuery.length >= 3) {
        setIsSearchingVenue(true);
        try {
          const results = await searchVenues(venueQuery);
          setVenueResults(results);
          setShowVenueResults(true);
        } catch (error) {
          console.error('Error searching venues:', error);
          setVenueResults([]);
          setShowVenueResults(false);
          // Show toast notification if needed
          // toast.error('Failed to search venues. Please try again.');
        } finally {
          setIsSearchingVenue(false);
        }
      } else {
        setVenueResults([]);
        setShowVenueResults(false);
      }
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [venueQuery]);

  const handleVenueSelect = (venue: VenueLocation) => {
    setSelectedVenue(venue);
    setFormData((prev) => ({
      ...prev,
      venue: venue.name,
      venueAddress: venue.address,
    }));
    setVenueQuery(venue.name);
    setShowVenueResults(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // ✅ Real-time validation for event name uppercase
    if (name === 'eventName') {
      if (value.length > 3) {
        const uppercaseCount = (value.match(/[A-Z]/g) || []).length;
        const letterCount = (value.match(/[A-Za-z]/g) || []).length;
        const hasConsecutiveUppercase = /[A-Z]{4,}/.test(value);

        if (letterCount > 0) {
          const uppercasePercentage = (uppercaseCount / letterCount) * 100;

          if (uppercasePercentage > 50 || hasConsecutiveUppercase) {
            setEventNameWarning(
              'Too many uppercase letters detected. Use Title Case to prevent deployment errors.'
            );
          } else {
            setEventNameWarning(null);
          }
        } else {
          setEventNameWarning(null);
        }
      } else {
        setEventNameWarning(null);
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const validateForm = (): boolean => {
    if (!formData.eventName.trim()) {
      toast.error('Event name is required');
      return false;
    }

    // ✅ NEW: Validate for invalid characters that could break contract deployment
    const invalidCharsRegex = /[^\x00-\x7F]/g; // Non-ASCII characters (emojis, special chars)
    if (invalidCharsRegex.test(formData.eventName)) {
      toast.error('Event name contains invalid characters. Please use only letters, numbers, and basic punctuation (no emojis or special symbols).');
      return false;
    }

    // ✅ CRITICAL: Detect excessive uppercase letters (causes blockchain broadcast errors)
    const uppercaseCount = (formData.eventName.match(/[A-Z]/g) || []).length;
    const letterCount = (formData.eventName.match(/[A-Za-z]/g) || []).length;
    const uppercasePercentage = letterCount > 0 ? (uppercaseCount / letterCount) * 100 : 0;

    // Check for consecutive uppercase words (e.g., "ALL-STARS", "ALL STARS")
    const hasConsecutiveUppercase = /[A-Z]{4,}/.test(formData.eventName); // 4+ uppercase in a row

    if (uppercasePercentage > 50 || hasConsecutiveUppercase) {
      toast.error(
        'Event name has too many uppercase letters. Please use Title Case (e.g., "Summer Music Festival" instead of "SUMMER MUSIC FESTIVAL"). ' +
        'Excessive uppercase causes blockchain deployment errors.',
        { duration: 8000 }
      );
      return false;
    }

    if (formData.description && invalidCharsRegex.test(formData.description)) {
      toast.error('Description contains invalid characters. Please use only letters, numbers, and basic punctuation (no emojis or special symbols).');
      return false;
    }

    if (formData.venue && invalidCharsRegex.test(formData.venue)) {
      toast.error('Venue name contains invalid characters. Please use only letters, numbers, and basic punctuation.');
      return false;
    }

    if (!formData.eventDate) {
      toast.error('Event date is required');
      return false;
    }
    if (!formData.venue.trim()) {
      toast.error('Venue is required');
      return false;
    }
    if (!formData.ticketPrice || parseFloat(formData.ticketPrice) <= 0) {
      toast.error('Valid ticket price is required');
      return false;
    }
    if (!formData.totalSupply || parseInt(formData.totalSupply) <= 0) {
      toast.error('Valid total supply is required');
      return false;
    }
    if (!selectedImage) {
      toast.error('Event image is required');
      return false;
    }

    // Validate currency - only PUSH is supported for now
    if (formData.currency !== 'PUSH') {
      toast.error('Currently only PUSH currency is supported for event deployment. Please select PUSH.');
      return false;
    }

    return true;
  };

  const handleUploadToIPFS = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setStep('upload');

    try {
      // Test Pinata connection (silent check)
      const isConnected = await testPinataConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to storage service');
      }

      // Upload image (background process)
      const imageUrl = await uploadImageToPinata(selectedImage!);
      setImageIpfsUrl(imageUrl); // Save IPFS image URL

      // Generate metadata
      const metadata = generateTicketMetadata(
        {
          eventName: formData.eventName,
          eventDate: `${formData.eventDate} ${formData.eventTime}`,
          venue: formData.venue,
          description: formData.description,
          ticketType: formData.ticketType,
          category: formData.category,
          price: formData.ticketPrice,
          totalSupply: parseInt(formData.totalSupply),
        },
        imageUrl
      );

      // Upload metadata (background process)
      const { ipfsUrl, cid } = await uploadMetadataToPinata(metadata);
      setMetadataIpfsUrl(ipfsUrl);
      setMetadataCid(cid);

      // Fetch metadata JSON from IPFS and populate preview/form fields
      try {
        const { fetchIPFSMetadata } = await import('@/services/nftIndexer');
        const meta = await fetchIPFSMetadata(ipfsUrl);
        if (meta) {
          // Use image from metadata
          if (meta.image) {
            setImagePreview(meta.image);
          }

          // Populate form fields if available in properties or attributes
          const props = meta.properties || {};
          const attrs = meta.attributes || [];

          const eventName = meta.name || props.event_name || attrs.find((a: any) => a.trait_type === 'Event Name')?.value;
          const eventDate = props.event_date || meta.eventDate || attrs.find((a: any) => a.trait_type === 'Event Date')?.value;
          const venue = props.venue || meta.venue || attrs.find((a: any) => a.trait_type === 'Venue')?.value;
          const price = props.price || attrs.find((a: any) => a.trait_type === 'Price')?.value;
          const totalSupply = props.total_supply || attrs.find((a: any) => a.trait_type === 'Total Supply')?.value;

          setFormData(prev => ({
            ...prev,
            eventName: eventName || prev.eventName,
            eventDate: eventDate ? eventDate.split(' ')[0] : prev.eventDate,
            eventTime: eventDate ? eventDate.split(' ')[1] || prev.eventTime : prev.eventTime,
            venue: venue || prev.venue,
            ticketPrice: price ? String(price).replace(/ (STX|PUSH|TIC)$/, '') : prev.ticketPrice,
            totalSupply: totalSupply ? String(totalSupply) : prev.totalSupply,
          }));
        }
      } catch (err) {
        console.warn('Could not fetch metadata from IPFS to prefill form:', err);
      }

      // Show single success message
      toast.success('Event prepared successfully!');
      setStep('deploy');
    } catch (error: any) {
      console.error('Error preparing event:', error);
      toast.error(error.message || 'Failed to prepare event. Please try again.');
      setStep('form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeployContract = async () => {
    // Check wallet connection
    if (!isWalletConnected || !address) {
      toast.error('Please connect your wallet first');
      handleConnectWallet(); // Auto-trigger wallet connection
      return;
    }

    if (!metadataCid || !metadataIpfsUrl) {
      toast.error('Missing required data for deployment');
      return;
    }

    setIsLoading(true);
    setDeploymentProgress('Preparing contract deployment...');

    try {
      // Generate NFT symbol from event name
      const nftSymbol = formData.eventName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 5) || 'EVENT';

      // Prepare event date time (convert to Unix timestamp in SECONDS)
      const eventDateTimeMs = new Date(`${formData.eventDate}T${formData.eventTime || '00:00'}`).getTime();
      const eventDateTime = Math.floor(eventDateTimeMs / 1000); // Convert milliseconds to seconds

      console.log('📅 Event Date/Time Conversion:');
      console.log('   - Input Date:', formData.eventDate);
      console.log('   - Input Time:', formData.eventTime);
      console.log('   - Timestamp (ms):', eventDateTimeMs);
      console.log('   - Timestamp (seconds):', eventDateTime);
      console.log('   - Verification:', new Date(eventDateTime * 1000).toLocaleString());

      // Prepare venue coordinates (if selected venue exists)
      const venueCoords = selectedVenue
        ? `${selectedVenue.lat},${selectedVenue.lon}`
        : '';

      const deployParams = {
        eventName: formData.eventName,
        nftSymbol: nftSymbol,
        totalSupply: parseInt(formData.totalSupply),
        ticketPrice: formData.ticketPrice,
        eventDate: eventDateTime,
        venue: formData.venue,
        venueAddress: formData.venueAddress || formData.venue,
        venueCoordinates: venueCoords,
        description: formData.description,
        metadataUri: metadataIpfsUrl,
        contentHash: metadataCid,
        eventImageUri: imageIpfsUrl || '',
        royaltyPercent: Math.floor(parseFloat(formData.royaltyPercentage || '5') * 100), // Convert to basis points
      };

      console.log('🚀 Deploying EventTicket contract:', deployParams);

      setDeploymentProgress('Deploying contract to Push Chain...');

      // STRATEGY: Try direct deployment using ethers.js
      // User must have wallet connected to Push Chain Testnet
      
      // Get ethers provider and signer
      if (!window.ethereum) {
        throw new Error('MetaMask not found. Please install MetaMask.');
      }

      const provider = new (await import('ethers')).BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Check network
      const network = await provider.getNetwork();
      console.log('🌐 Current network:', network);
      
      if (network.chainId !== BigInt(42101)) {
        toast.error('Wrong Network!', {
          description: 'Please switch your wallet to Push Chain Testnet (Chain ID: 42101)',
          duration: 8000,
        });
        throw new Error('Please switch to Push Chain Testnet');
      }

      // Import direct deployment service
      const { deployEventTicketDirect } = await import('@/services/directTicketDeployment');

      // Deploy contract directly to Push Chain
      const result = await deployEventTicketDirect(signer, deployParams);

      console.log('✅ Contract deployed successfully:', result);

      setDeployedTxId(result.transactionHash);

      // Save to localStorage for tracking
      const eventData = {
        contractAddress: result.contractAddress || 'pending',
        eventName: formData.eventName,
        totalSupply: parseInt(formData.totalSupply),
        ticketPrice: parseFloat(formData.ticketPrice),
        currency: 'PC',
        royaltyPercent: parseFloat(formData.royaltyPercentage),
        eventDate: eventDateTime,
        deployedAt: Date.now(),
        txId: result.transactionHash,
        metadataUri: metadataIpfsUrl,
        network: 'Push Chain Donut Testnet',
        chainId: 42101,
      };

      const deployedContracts = JSON.parse(
        localStorage.getItem(`deployed-contracts-${address}`) || '[]'
      );
      deployedContracts.push(eventData);
      localStorage.setItem(
        `deployed-contracts-${address}`,
        JSON.stringify(deployedContracts)
      );

      // Show success message
      toast.success('Event contract deployed successfully!', {
        description: `${formData.eventName} is now live on Push Chain`,
        duration: 5000,
        icon: '🎉'
      });

      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('❌ Deployment error:', error);
      
      let errorMessage = 'Failed to deploy contract.';
      
      if (error.message?.includes('rejected')) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient PC balance for gas fees';
      } else if (error.message?.includes('bytecode not found')) {
        errorMessage = 'Contract compilation error. Please contact support.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { duration: 8000 });
    } finally {
      setIsLoading(false);
      setDeploymentProgress('');
    }
  };

  // Guard: Show access denied if not in EO mode
  if (!isEOMode) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-20">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-3xl p-8 text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Event Organizer Mode Required</h2>
            <p className="text-gray-400 mb-6">
              You need to switch to Event Organizer mode to create events. 
              Toggle the EO mode in your profile menu or navigation bar.
            </p>
            <button
              onClick={() => navigate('/app')}
              className="px-6 py-3 bg-[#d548ec] hover:bg-[#c030d6] text-white rounded-xl font-medium transition-all"
            >
              Back to Events
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <>
      <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-3">Create an Event</h1>
          <p className="text-gray-400 text-lg mb-4">
            Deploy tickets with NFT technology
          </p>
        </div>

        {/* EO Registration Banner */}
        {isWalletConnected && !isEORegistered && (
          <div className="mb-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Register as Event Organizer
                </h3>
                <p className="text-gray-400 mb-4">
                  You need to register as an Event Organizer on-chain before creating events. 
                  This is a one-time registration process.
                </p>
                <button
                  onClick={() => setShowEOModal(true)}
                  disabled={isCheckingEO}
                  className="px-6 py-3 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] text-white rounded-lg font-semibold hover:from-[#d548ec]/90 hover:to-[#e7a4fd]/90 disabled:opacity-50 transition-all"
                >
                  {isCheckingEO ? 'Checking...' : 'Register Now'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EO Verification Pending Banner */}
        {isWalletConnected && isEORegistered && !isEOVerified && (
          <div className="mb-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Verification Pending
                </h3>
                <p className="text-gray-400">
                  Your Event Organizer registration is pending verification by platform admins. 
                  You'll be able to create events once verified. This usually takes 24-48 hours.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <div
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
              step === 'form' ? 'bg-[#d548ec] text-white shadow-lg shadow-[#d548ec]/50' : 'bg-gray-800 text-gray-400'
            }`}
          >
            <Info className="w-5 h-5" />
            <span className="font-medium">1. Event Details</span>
          </div>
          <div className="w-12 h-px bg-gray-700" />
          <div
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
              step === 'upload' || step === 'deploy' ? 'bg-[#d548ec] text-white shadow-lg shadow-[#d548ec]/50' : 'bg-gray-800 text-gray-400'
            }`}
          >
            <Rocket className="w-5 h-5" />
            <span className="font-medium">2. Deploy Event</span>
          </div>
        </div>

        {/* Form Content */}
        {step === 'form' && (
          <div className="bg-[#1A1A1A] rounded-xl p-6 space-y-6">
            {/* Event Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Featured Image *
              </label>
              <p className="text-sm text-gray-500 mb-3">
                This image will be used for promoting your event and displayed on tickets. File types supported: JPG, PNG. Max size: 10MB.
              </p>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative border-2 border-dashed border-gray-700 rounded-lg p-8 hover:border-[#d548ec] transition-colors cursor-pointer group"
              >
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <div className="text-center text-white">
                        <Upload className="w-8 h-8 mx-auto mb-2" />
                        <p>Click to change image</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400 mb-1">Drag and drop or click to upload</p>
                    <p className="text-sm text-gray-500">Recommended: 1200 x 630 pixels</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Event Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Event Name *
              </label>
              <input
                type="text"
                name="eventName"
                value={formData.eventName}
                onChange={handleChange}
                placeholder="e.g., Summer Music Festival 2025"
                className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none transition-colors ${
                  eventNameWarning
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-700 focus:border-[#d548ec]'
                }`}
                required
              />

              {/* Real-time Warning */}
              {eventNameWarning && (
                <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-red-400 font-medium mb-2">
                        {eventNameWarning}
                      </p>
                      <div className="text-xs space-y-1.5">
                        <div className="flex items-start gap-2 text-red-300">
                          <span className="text-red-400 font-bold mt-0.5">✗</span>
                          <div>
                            <span className="font-medium">Avoid:</span> "SUMMER MUSIC FESTIVAL" or "ROCK CONCERT"
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-green-300">
                          <span className="text-green-400 font-bold mt-0.5">✓</span>
                          <div>
                            <span className="font-medium">Use:</span> "Summer Music Festival" or "Rock Concert 2025"
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Helper Text (shown when no warning) */}
              {!eventNameWarning && (
                <p className="text-xs text-gray-500 mt-2">
                  Use Title Case for best compatibility. Avoid excessive uppercase letters.
                </p>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    name="eventDate"
                    value={formData.eventDate}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#d548ec]"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Time
                </label>
                <input
                  type="time"
                  name="eventTime"
                  value={formData.eventTime}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#d548ec]"
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Venue Search with OpenStreetMap */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Location *
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Search and select your event venue from our global location database
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                <input
                  type="text"
                  value={venueQuery}
                  onChange={(e) => setVenueQuery(e.target.value)}
                  placeholder="Search for a venue or location"
                  className="w-full pl-11 pr-10 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec]"
                  required
                />
                {venueQuery && (
                  <button
                    onClick={() => {
                      setVenueQuery('');
                      setShowVenueResults(false);
                      setSelectedVenue(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                {isSearchingVenue && (
                  <div className="absolute right-10 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-5 h-5 text-[#d548ec] animate-spin" />
                  </div>
                )}

                {/* Search Results Dropdown */}
                {showVenueResults && venueResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                    {venueResults.map((venue) => (
                      <button
                        key={venue.placeId}
                        onClick={() => handleVenueSelect(venue)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                      >
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-[#d548ec] flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{venue.name}</p>
                            <p className="text-sm text-gray-400 line-clamp-2">{venue.address}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Venue Display */}
              {selectedVenue && (
                <div className="mt-2 p-3 bg-[#d548ec]/10 border border-[#d548ec]/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-[#d548ec] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium">{selectedVenue.name}</p>
                      <p className="text-sm text-gray-400">{selectedVenue.address}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Coordinates: {parseFloat(selectedVenue.lat).toFixed(6)}, {parseFloat(selectedVenue.lon).toFixed(6)}
                      </p>
                    </div>
                  </div>
                  {/* Map Preview */}
                  <div className="mt-3">
                    <div className="text-xs text-gray-400 mb-1">Venue Location</div>
                    <div className="relative rounded-lg overflow-hidden border border-gray-600 bg-gray-900">
                      {/* Google Maps Embed - requires VITE_GOOGLE_MAPS_API_KEY environment variable */}
                      <iframe
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        style={{ border: 0 }}
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${selectedVenue.lat},${selectedVenue.lon}&zoom=15`}
                        allowFullScreen
                        className="w-full h-40"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Venue Address (Read-only, auto-filled from search) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Address
              </label>
              <input
                type="text"
                name="venueAddress"
                value={formData.venueAddress}
                onChange={handleChange}
                placeholder="Select a location above to auto-fill the address"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec]"
                readOnly={!!selectedVenue}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="e.g., Concert, Festival, Conference, Sports"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec]"
              />
              <p className="text-sm text-gray-500 mt-1">
                Help attendees discover your event by choosing the right category
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Provide a detailed description of your event. What makes it unique? What can attendees expect?"
                rows={4}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec] resize-none"
              />
              <p className="text-sm text-yellow-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Avoid emojis and special characters for compatibility
              </p>
            </div>

            {/* Ticket Details */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#d548ec]" />
                Ticket Settings
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Configure pricing, supply, and royalties for your event tickets
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ticket Tier Name
                  </label>
                  <input
                    type="text"
                    name="ticketType"
                    value={formData.ticketType}
                    onChange={handleChange}
                    placeholder="e.g., General Admission, VIP, Early Bird"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Supply *
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      name="totalSupply"
                      value={formData.totalSupply}
                      onChange={handleChange}
                      placeholder="100"
                      min="1"
                      className="w-full pl-11 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec]"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Total number of tickets available
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ticket Price *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      name="ticketPrice"
                      value={formData.ticketPrice}
                      onChange={handleChange}
                      placeholder="0.1"
                      step="0.00000001"
                      min="0"
                      className="w-full pl-11 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, pricingMode: prev.pricingMode === 'fixed' ? 'usd-dynamic' : 'fixed' }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 hover:text-white transition-colors"
                      title={`Pricing: ${formData.pricingMode === 'fixed' ? 'Fixed' : 'Dynamic USD'}. Click to change.`}
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      Set the price buyers will pay per ticket
                    </p>
                    {cryptoPrice && !priceLoading && !priceError && (
                      <p className="text-xs text-green-400">
                        ≈ ${(parseFloat(formData.ticketPrice) * cryptoPrice).toFixed(2)} USD
                      </p>
                    )}
                  </div>
                  {priceLoading && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Calculating USD value...
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Currency */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Currency *
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Select which currency buyers will use to purchase tickets
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* PUSH - Native PushChain (Active) */}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, currency: 'PUSH' }))}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.currency === 'PUSH'
                        ? 'border-[#d548ec] bg-[#d548ec]/10 text-white shadow-lg shadow-[#d548ec]/20'
                        : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <STXIcon size="lg" />
                      <div className="text-left">
                        <div className="font-medium">PUSH</div>
                        <div className="text-xs opacity-75">Native Token</div>
                      </div>
                    </div>
                  </button>

                  {/* TIC - Coming Soon (Disabled) */}
                  <button
                    type="button"
                    disabled
                    className="p-4 rounded-lg border-2 border-gray-700 bg-gray-800/30 text-gray-500 cursor-not-allowed relative"
                  >
                    <div className="flex items-center gap-3 opacity-40">
                      <img src={ticLogo} alt="TIC" className="w-8 h-8 rounded-full grayscale" />
                      <div className="text-left">
                        <div className="font-medium">TIC</div>
                        <div className="text-xs">intic Token</div>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs text-yellow-400 font-medium">
                      Coming Soon
                    </div>
                  </button>

                  {/* ETH - Coming Soon (Disabled) */}
                  <button
                    type="button"
                    disabled
                    className="p-4 rounded-lg border-2 border-gray-700 bg-gray-800/30 text-gray-500 cursor-not-allowed relative"
                  >
                    <div className="flex items-center gap-3 opacity-40">
                      <ETHIcon size="lg" />
                      <div className="text-left">
                        <div className="font-medium">ETH</div>
                        <div className="text-xs">Ethereum</div>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs text-yellow-400 font-medium">
                      Coming Soon
                    </div>
                  </button>

                  {/* SOL - Coming Soon (Disabled) */}
                  <button
                    type="button"
                    disabled
                    className="p-4 rounded-lg border-2 border-gray-700 bg-gray-800/30 text-gray-500 cursor-not-allowed relative"
                  >
                    <div className="flex items-center gap-3 opacity-40">
                      <SOLIcon size="lg" />
                      <div className="text-left">
                        <div className="font-medium">SOL</div>
                        <div className="text-xs">Solana</div>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs text-yellow-400 font-medium">
                      Coming Soon
                    </div>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Currently only PUSH (native PushChain token) is supported for event deployment
                </p>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Creator Earnings
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="royaltyPercentage"
                    value={formData.royaltyPercentage}
                    onChange={handleChange}
                    placeholder="5"
                    min="0"
                    max="10"
                    step="0.1"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Earn a percentage from secondary ticket sales. Most events use 2.5% to 10%. Maximum 10%.
                </p>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-[#d548ec]/10 border border-[#d548ec]/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-400">
                  <p className="text-white font-medium mb-1">Blockchain Deployment</p>
                  <p>
                    Your event will be deployed as a smart contract on Push Chain Donut Testnet. 
                    The event metadata and images are stored on IPFS for decentralization.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleUploadToIPFS}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] text-white rounded-lg font-semibold hover:from-[#d548ec]/90 hover:to-[#e7a4fd]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#d548ec]/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  Continue to Deploy
                </>
              )}
            </button>
          </div>
        )}

        {/* Upload Step - Hidden from UI but processing in background */}
        {step === 'upload' && (
          <div className="bg-[#1A1A1A] rounded-xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-[#d548ec]/20 rounded-full flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-[#d548ec] animate-spin" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Preparing Your Event</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              We're uploading your event data to IPFS. This typically takes 10-15 seconds.
            </p>
          </div>
        )}

        {/* Deploy Step */}
        {step === 'deploy' && (
          <div className="space-y-6">
            {/* Wallet Connection Status */}
            {!isWalletConnected ? (
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-7 h-7 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Connect Your Wallet First
                    </h3>
                    <p className="text-gray-400 mb-4">
                      Please connect your wallet using the <strong className="text-white">"Connect Wallet"</strong> button at the top right corner of the page.
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      After connecting, you can deploy from any chain (Ethereum, Polygon, Solana, etc.) and pay with your native tokens.
                    </p>
                    <button
                      onClick={handleConnectWallet}
                      className="px-4 py-2 bg-[#d548ec] hover:bg-[#d548ec]/90 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <Wallet className="w-4 h-4" />
                      Connect Wallet Now
                    </button>
                  </div>
                </div>
              </div>
            ) : !pushChainClient || !pushChainClient.universal ? (
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-7 h-7 text-yellow-400 animate-spin" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Initializing Push Chain Client...
                    </h3>
                    <p className="text-gray-400 mb-4">
                      Please wait while we initialize the Push Chain Universal Wallet connection.
                    </p>
                    <p className="text-sm text-gray-500">
                      If this takes too long, try refreshing the page or reconnecting your wallet.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-7 h-7 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Ready to Deploy
                    </h3>
                    <p className="text-gray-400">
                      Your wallet is connected. Deploy your event contract to Push Chain.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Deploy Contract Card */}
            <div className="bg-[#1A1A1A] rounded-xl p-6">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Review & Deploy</h3>
                <p className="text-gray-400">
                  Review your event details and deploy the smart contract to Push Chain blockchain.
                </p>
              </div>

              {/* Event Summary */}
              <div className="mb-6 p-4 bg-gray-800/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Event:</span>
                  <span className="text-white font-medium">{formData.eventName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Total Supply:</span>
                  <span className="text-white font-medium">{formData.totalSupply} tickets</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Price per Ticket:</span>
                  <span className="text-white font-medium">{formData.ticketPrice} PC</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Venue:</span>
                  <span className="text-white font-medium">{formData.venue}</span>
                </div>
                <div className="border-t border-gray-700 pt-3 mt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Estimated Gas:</span>
                    <span className="text-white">~{estimatedCost.toFixed(4)} PC</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Network:</span>
                    <span className="text-white">Push Chain Donut Testnet</span>
                  </div>
                </div>
              </div>

              {/* Deployment Progress */}
              {deploymentProgress && (
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">{deploymentProgress}</span>
                  </div>
                </div>
              )}

              {/* Deploy Button */}
              <button
                onClick={handleDeployContract}
                disabled={isLoading || !isWalletConnected || !pushChainClient}
                className="w-full px-6 py-4 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] text-white rounded-lg font-semibold hover:from-[#d548ec]/90 hover:to-[#e7a4fd]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#d548ec]/30 text-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Deploying to Blockchain...
                  </>
                ) : !isWalletConnected ? (
                  <>
                    <Wallet className="w-6 h-6" />
                    Connect Wallet to Deploy
                  </>
                ) : (
                  <>
                    <Rocket className="w-6 h-6" />
                    Deploy Event Contract
                  </>
                )}
              </button>

              {!isWalletConnected && (
                <p className="text-center text-sm text-gray-500 mt-3">
                  Please connect your wallet to deploy
                </p>
              )}
            </div>

            {/* Info Card */}
            <div className="bg-[#d548ec]/10 border border-[#d548ec]/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-400">
                  <p>
                    <strong className="text-white">What happens next?</strong> After deployment, your event will be live on Push Chain blockchain. 
                    Users can start purchasing tickets as NFTs directly from your event page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>

    {/* Success Modal - Blockchain Deployment */}
    {showSuccessModal && deployedTxId && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
          {/* Close Button */}
          <button
            onClick={() => {
              setShowSuccessModal(false);
              setStep('form');
              setDeployedTxId(null);
            }}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-5">
            <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Contract Deployed!</h2>
            <p className="text-gray-400 text-sm">
              Successfully deployed to Push Chain Testnet
            </p>
          </div>

          {/* Event Summary */}
          <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Event</span>
                <span className="text-white font-medium truncate ml-2 max-w-[200px]">{formData.eventName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Tickets</span>
                <span className="text-white font-medium">{formData.totalSupply} @ {formData.ticketPrice} PC</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Network</span>
                <span className="text-white font-medium">Push Chain Donut</span>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="space-y-3 mb-5">
            {/* Transaction Hash */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-green-400">Transaction Hash</span>
                <a
                  href={`https://donut.push.network/tx/${deployedTxId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#d548ec] hover:underline flex items-center gap-1"
                >
                  <span>View on Explorer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="bg-black/30 rounded px-3 py-2 flex items-center justify-between group">
                <code className="text-xs text-gray-400 truncate font-mono">{deployedTxId}</code>
                <button
                  onClick={() => copyToClipboard(deployedTxId)}
                  className="ml-2 text-gray-500 hover:text-white transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Contract Address - Get from localStorage */}
            {(() => {
              const contracts = JSON.parse(localStorage.getItem(`deployed-contracts-${address}`) || '[]');
              const latestContract = contracts[contracts.length - 1];
              return latestContract?.contractAddress ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-blue-400">Contract Address</span>
                    <a
                      href={`https://donut.push.network/address/${latestContract.contractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#d548ec] hover:underline flex items-center gap-1"
                    >
                      <span>View Contract</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="bg-black/30 rounded px-3 py-2 flex items-center justify-between group">
                    <code className="text-xs text-gray-400 truncate font-mono">{latestContract.contractAddress}</code>
                    <button
                      onClick={() => copyToClipboard(latestContract.contractAddress)}
                      className="ml-2 text-gray-500 hover:text-white transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : null;
            })()}
          </div>

          {/* Info */}
          <div className="bg-[#d548ec]/10 border border-[#d548ec]/20 rounded-lg p-3 mb-5">
            <p className="text-xs text-gray-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <span>Your event contract is now live on Push Chain blockchain. Users can start minting tickets!</span>
            </p>
          </div>

          {/* Verification Warning */}
          {verificationWarning && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-5">
              <p className="text-xs text-orange-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="font-semibold">Warning:</strong> {verificationWarning}
                </span>
              </p>
              <p className="text-xs text-gray-400 mt-2 ml-6">
                Contact support or check your Event Organizer registration status.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowSuccessModal(false);
                window.location.href = '/app/portofolio';
              }}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] text-white rounded-lg font-medium hover:from-[#d548ec]/90 hover:to-[#e7a4fd]/90 transition-all text-sm"
            >
              View My Events
            </button>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                setStep('form');
                setDeployedTxId(null);
              }}
              className="px-4 py-2.5 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-all text-sm"
            >
              Create New
            </button>
          </div>
        </div>
      </div>
    )}

    {/* EO Profile Required Modal */}
    <EOProfileRequiredModal
      isOpen={showEOModal}
      onClose={() => setShowEOModal(false)}
      walletAddress={address}
    />
    </>
  );
};

export default CreateEventNFT;


