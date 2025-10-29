import React from 'react';
import { X, Building2, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EOProfileRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string;
}

const EOProfileRequiredModal: React.FC<EOProfileRequiredModalProps> = ({
  isOpen,
  onClose,
  walletAddress,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleCreateProfile = () => {
    onClose();
    navigate('/app/create-profile-eo');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Event Organizer Profile Required</h2>
              <p className="text-white/80 text-sm">Complete your profile to create events</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="font-medium text-white mb-1">Why do you need a profile?</p>
                <p>
                  To maintain quality and trust in our platform, all Event Organizers must complete 
                  a profile before creating events. This helps attendees know who's hosting the event.
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">What you'll get:</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Create unlimited events</p>
                  <p className="text-xs text-gray-400">Deploy events on blockchain with NFT ticketing</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Build your reputation</p>
                  <p className="text-xs text-gray-400">Earn ratings and reviews from attendees</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Get verified badge</p>
                  <p className="text-xs text-gray-400">Stand out with platform verification</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Manage your events</p>
                  <p className="text-xs text-gray-400">Track sales, analytics, and attendees</p>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet info */}
          {walletAddress && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Your wallet address:</p>
              <p className="text-sm text-white font-mono">
                {walletAddress.substring(0, 8)}...{walletAddress.substring(walletAddress.length - 6)}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-all"
            >
              Not Now
            </button>
            <button
              onClick={handleCreateProfile}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] text-white rounded-lg font-semibold hover:from-[#d548ec]/90 hover:to-[#e7a4fd]/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#d548ec]/30"
            >
              <span>Create Profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Note */}
          <p className="text-xs text-gray-500 text-center">
            Your profile can be updated later in Settings
          </p>
        </div>
      </div>
    </div>
  );
};

export default EOProfileRequiredModal;
