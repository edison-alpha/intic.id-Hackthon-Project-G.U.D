import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, CheckCircle, Shield } from 'lucide-react';
import EORegistrationModal from '@/components/EORegistrationModal';
import { isOrganizerRegistered } from '@/services/eventOrganizerContract';
import { useToast } from '@/hooks/use-toast';

const CreateProfileEO: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string>('');

  useEffect(() => {
    checkRegistrationStatus();
  }, []);

  const checkRegistrationStatus = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        toast({
          title: "MetaMask Required",
          description: "Please install MetaMask to continue",
          variant: "destructive",
        });
        setIsChecking(false);
        return;
      }

      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length === 0) {
        toast({
          title: "Wallet Not Connected",
          description: "Please connect your wallet to continue",
          variant: "destructive",
        });
        setIsChecking(false);
        return;
      }

      const address = accounts[0];
      setWalletAddress(address);

      console.log('🔍 Checking registration for wallet:', address);
      const isRegistered = await isOrganizerRegistered(address);
      console.log('📊 Registration status:', isRegistered);
      
      if (isRegistered) {
        console.log('✅ User is already registered');
        toast({
          title: "Already Registered",
          description: "You are already registered as an Event Organizer. Redirecting...",
        });
        setTimeout(() => {
          navigate('/app/create-event');
        }, 2000);
      } else {
        console.log('❌ User is NOT registered, opening modal');
        // Auto-open modal if not registered
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('❌ Error checking registration:', error);
      toast({
        title: "Error",
        description: "Failed to check registration status",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleRegistrationSuccess = () => {
    setIsModalOpen(false);
    toast({
      title: "Registration Successful! 🎉",
      description: "You can now create events. Redirecting...",
    });
    setTimeout(() => {
      navigate('/app/create-event');
    }, 2000);
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#d548ec] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Checking registration status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] rounded-2xl flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                Become an Event Organizer
              </h1>
              <p className="text-gray-400">
                Create your profile and start organizing events on the blockchain
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6">
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Create Unlimited Events
            </h3>
            <p className="text-gray-400 text-sm">
              Deploy events on blockchain with NFT ticketing system. Full control over pricing, 
              availability, and distribution.
            </p>
          </div>

          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Build Trust & Reputation
            </h3>
            <p className="text-gray-400 text-sm">
              Earn ratings and reviews from attendees. Get verified badge to stand out 
              and attract more attendees.
            </p>
          </div>

          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6">
            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Professional Dashboard
            </h3>
            <p className="text-gray-400 text-sm">
              Access comprehensive analytics, track ticket sales, manage attendees, 
              and monitor event performance in real-time.
            </p>
          </div>

          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6">
            <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Blockchain Security
            </h3>
            <p className="text-gray-400 text-sm">
              Transparent, immutable records of all transactions. Automatic revenue 
              distribution and no intermediary fees.
            </p>
          </div>
        </div>

        {/* Requirements */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 mb-8">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            What You'll Need
          </h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Active wallet address (currently: {walletAddress ? `${walletAddress.substring(0, 8)}...${walletAddress.substring(walletAddress.length - 6)}` : 'Not connected'})</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Organization name and contact details</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Logo or profile image (optional but recommended)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Brief description of your organization</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Small gas fee for blockchain registration (one-time)</span>
            </li>
          </ul>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-4 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] text-white rounded-xl font-semibold hover:from-[#d548ec]/90 hover:to-[#e7a4fd]/90 transition-all shadow-lg shadow-[#d548ec]/30 inline-flex items-center gap-2"
          >
            <Building2 className="w-5 h-5" />
            <span>Create Event Organizer Profile</span>
          </button>
          <p className="text-sm text-gray-500 mt-4">
            Your profile can be updated later in Settings
          </p>
        </div>
      </div>

      {/* Registration Modal */}
      <EORegistrationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRegistrationSuccess}
        walletAddress={walletAddress}
      />
    </div>
  );
};

export default CreateProfileEO;
