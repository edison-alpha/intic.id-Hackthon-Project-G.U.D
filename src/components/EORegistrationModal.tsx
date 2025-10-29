import React, { useState, useRef } from 'react';
import { X, Upload, Check, Loader2, AlertCircle, Building2, Mail, Globe, MapPin, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { usePushChainClient, usePushChain } from '@pushchain/ui-kit';
import { uploadImageToPinata, uploadMetadataToPinata } from '@/services/pinataService';
import { registerOrganizerUniversal } from '@/services/eventOrganizerContract';
import { useEORegistration } from '@/hooks/useEORegistration';

interface EORegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  walletAddress?: string;
}

interface OrganizerFormData {
  eoName: string;
  organizationName: string;
  email: string;
  website: string;
  location: string;
  description: string;
  category: string;
  contactPhone: string;
  // Social Media (Optional)
  twitter?: string;
  instagram?: string;
  tiktok?: string;
  telegram?: string;
}

const EORegistrationModal: React.FC<EORegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  walletAddress,
}) => {
  const [step, setStep] = useState<'form' | 'submitting' | 'success'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get Push Chain client
  const { pushChainClient } = usePushChainClient();
  const { PushChain } = usePushChain();

  // Check if already registered using UEA (Universal Executor Account)
  const { isRegistered, ueaAddress, refetch: refetchRegistration } = useEORegistration(walletAddress);

  const [formData, setFormData] = useState<OrganizerFormData>({
    eoName: '',
    organizationName: '',
    email: '',
    website: '',
    location: '',
    description: '',
    category: 'concert',
    contactPhone: '',
    twitter: '',
    instagram: '',
    tiktok: '',
    telegram: '',
  });

  const [logoImage, setLogoImage] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string>('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setLogoImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const validateForm = (): boolean => {
    if (!formData.eoName.trim()) {
      toast.error('EO name is required');
      return false;
    }
    if (!formData.organizationName.trim()) {
      toast.error('Organization name is required');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast.error('Valid email is required');
      return false;
    }
    if (!formData.description.trim()) {
      toast.error('Description is required');
      return false;
    }
    if (!logoImage) {
      toast.error('Organization logo is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (!pushChainClient || !PushChain) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setStep('submitting');

    try {
      // Re-check if already registered (from Push Chain via wagmi)
      const { data: currentRegistrationStatus } = await refetchRegistration();
      if (currentRegistrationStatus) {
        toast.error('This wallet is already registered as an Event Organizer on Push Chain');
        setIsLoading(false);
        setStep('form');
        return;
      }

      // Upload logo to IPFS
      const logoUrl = await uploadImageToPinata(logoImage!);

      // Prepare organizer metadata in the exact IPFS structure format
      const metadata = {
        eoName: formData.eoName,
        organizationName: formData.organizationName,
        email: formData.email,
        website: formData.website,
        location: formData.location,
        description: formData.description,
        category: formData.category,
        contactPhone: formData.contactPhone,
        // Social Media (optional)
        socialMedia: {
          twitter: formData.twitter || '',
          instagram: formData.instagram || '',
          tiktok: formData.tiktok || '',
          telegram: formData.telegram || '',
        },
        logo: logoUrl,
        registeredAt: new Date().toISOString(),
        version: '1.0',
      };

      // Upload metadata to IPFS
      const { ipfsUrl, cid } = await uploadMetadataToPinata(metadata);

      // Register on-chain using universal wallet
      // IMPORTANT: Pass walletAddress so contract can store UEA <-> Original mapping
      // - msg.sender will be UEA (e.g., 0xd80E5e191D707BE6c64401900e3aA92fc4F25485)
      // - walletAddress is original (e.g., 0xFc8Cb8fc33e6120e48A1d6cD15DAb5B0c3d9101a)
      // - Contract stores: ueaToOriginal[UEA] = walletAddress
      //                    originalToUea[walletAddress] = UEA
      const result = await registerOrganizerUniversal(
        pushChainClient,
        PushChain,
        ipfsUrl,
        cid,
        walletAddress // Pass original wallet for UEA mapping
      );

      setTxHash(result.transactionHash);

      // Save to localStorage
      const organizerData = {
        ...metadata,
        profileUri: ipfsUrl,
        contentHash: cid,
        isVerified: false,
        registrationDate: Date.now(),
        totalEvents: 0,
        totalTicketsSold: 0,
        txHash: result.transactionHash,
      };

      localStorage.setItem(`organizer-${walletAddress}`, JSON.stringify(organizerData));

      setStep('success');

      // Only show success toast when actually successful
      toast.success('EO Profile registered!', {
        description: `Welcome to intic, ${formData.eoName}!`,
        duration: 5000,
        icon: '🎉'
      });

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to register. Please try again.');
      setStep('form');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border border-gray-800/50 rounded-3xl shadow-2xl max-w-3xl w-full my-8 relative overflow-hidden">
        {/* Gradient Overlay */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#d548ec]/10 to-transparent pointer-events-none" />
        
        {step === 'form' && (
          <>
            {/* Header */}
            <div className="relative px-8 pt-8 pb-6">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#d548ec] to-[#e7a4fd] rounded-2xl flex items-center justify-center shadow-lg shadow-[#d548ec]/30">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-1">Become an Event Organizer</h2>
                  <p className="text-gray-400">Create your profile and start hosting amazing events</p>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-[#d548ec] rounded-full"></div>
                <div className="flex-1 h-1 bg-gray-800 rounded-full"></div>
                <div className="flex-1 h-1 bg-gray-800 rounded-full"></div>
              </div>
            </div>

            {/* Form */}
            <div className="px-8 pb-8 space-y-6 max-h-[calc(90vh-280px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
              
              {/* Section: Organization Identity */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#d548ec] rounded-full"></div>
                  Organization Identity
                </h3>

                {/* Logo Upload - Enhanced */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Logo <span className="text-[#d548ec]">*</span>
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative border-2 border-dashed border-gray-700/50 rounded-2xl p-8 hover:border-[#d548ec]/50 transition-all cursor-pointer group bg-gray-900/30 hover:bg-gray-900/50"
                  >
                    {logoPreview ? (
                      <div className="flex items-center gap-6">
                        <div className="relative">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-28 h-28 object-cover rounded-2xl border-2 border-[#d548ec]/30"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-2xl transition-all flex items-center justify-center">
                            <Upload className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium mb-1">{logoImage?.name}</p>
                          <p className="text-sm text-gray-400">Click to replace image</p>
                          <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 5MB</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#d548ec]/10 to-[#e7a4fd]/10 rounded-2xl flex items-center justify-center mb-4">
                          <Upload className="w-8 h-8 text-[#d548ec]" />
                        </div>
                        <p className="text-white font-medium mb-1">Upload your organization logo</p>
                        <p className="text-sm text-gray-400">PNG, JPG up to 5MB</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* EO Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    EO Name <span className="text-[#d548ec]">*</span>
                  </label>
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#d548ec] transition-colors" />
                    <input
                      type="text"
                      name="eoName"
                      value={formData.eoName}
                      onChange={handleChange}
                      placeholder="Enter your EO display name"
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec] focus:bg-gray-900/70 transition-all"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">This name will be displayed publicly on your events</p>
                </div>

                {/* Organization Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Organization Name <span className="text-[#d548ec]">*</span>
                  </label>
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#d548ec] transition-colors" />
                    <input
                      type="text"
                      name="organizationName"
                      value={formData.organizationName}
                      onChange={handleChange}
                      placeholder="Enter your organization name"
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec] focus:bg-gray-900/70 transition-all"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Official registered business or organization name</p>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Primary Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-[#d548ec] focus:bg-gray-900/70 transition-all appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem',
                    }}
                  >
                    <option value="concert">🎵 Concert & Music</option>
                    <option value="conference">💼 Conference & Business</option>
                    <option value="sports">⚽ Sports & Fitness</option>
                    <option value="festival">🎪 Festival & Fair</option>
                    <option value="theater">🎭 Theater & Arts</option>
                    <option value="education">📚 Education & Workshop</option>
                    <option value="networking">🤝 Networking</option>
                    <option value="other">🌟 Other</option>
                  </select>
                </div>
              </div>

              {/* Section: Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#d548ec] rounded-full"></div>
                  Contact Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Email Address <span className="text-[#d548ec]">*</span>
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#d548ec] transition-colors" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="contact@example.com"
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec] focus:bg-gray-900/70 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="contactPhone"
                      value={formData.contactPhone}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-4 py-3.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec] focus:bg-gray-900/70 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Website */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Website
                    </label>
                    <div className="relative group">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#d548ec] transition-colors" />
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        placeholder="https://yourwebsite.com"
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec] focus:bg-gray-900/70 transition-all"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Location
                    </label>
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#d548ec] transition-colors" />
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="City, Country"
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec] focus:bg-gray-900/70 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Social Media (Optional) */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#d548ec] rounded-full"></div>
                  Social Media 
                  <span className="text-xs font-normal text-gray-500">(Optional)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Twitter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Twitter / X
                    </label>
                    <div className="relative group">
                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#d548ec] transition-colors" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      <input
                        type="text"
                        name="twitter"
                        value={formData.twitter}
                        onChange={handleChange}
                        placeholder="@username or link"
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec] focus:bg-gray-900/70 transition-all"
                      />
                    </div>
                  </div>

                  {/* Instagram */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Instagram
                    </label>
                    <div className="relative group">
                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#d548ec] transition-colors" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      <input
                        type="text"
                        name="instagram"
                        value={formData.instagram}
                        onChange={handleChange}
                        placeholder="@username or link"
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec] focus:bg-gray-900/70 transition-all"
                      />
                    </div>
                  </div>

                  {/* TikTok */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      TikTok
                    </label>
                    <div className="relative group">
                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#d548ec] transition-colors" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                      <input
                        type="text"
                        name="tiktok"
                        value={formData.tiktok}
                        onChange={handleChange}
                        placeholder="@username or link"
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec] focus:bg-gray-900/70 transition-all"
                      />
                    </div>
                  </div>

                  {/* Telegram */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Telegram
                    </label>
                    <div className="relative group">
                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#d548ec] transition-colors" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                      <input
                        type="text"
                        name="telegram"
                        value={formData.telegram}
                        onChange={handleChange}
                        placeholder="@username or link"
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec] focus:bg-gray-900/70 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: About */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#d548ec] rounded-full"></div>
                  About Your Organization
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Description <span className="text-[#d548ec]">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Tell us about your organization, the types of events you host, your experience, and what makes your events special..."
                    rows={5}
                    className="w-full px-4 py-3.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#d548ec] focus:bg-gray-900/70 transition-all resize-none"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">{formData.description.length} / 500 characters</p>
                </div>
              </div>

              {/* Info Banner */}
              <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="text-white font-semibold">Blockchain Registration</p>
                    <p className="text-gray-400 leading-relaxed">
                      Your profile will be registered on Push Chain. You'll be auto-verified and can start creating events immediately.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-gradient-to-t from-[#0D0D0D] to-transparent border-t border-gray-800/50">
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full px-6 py-4 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] text-white rounded-xl font-semibold hover:from-[#d548ec]/90 hover:to-[#e7a4fd]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#d548ec]/30 hover:shadow-[#d548ec]/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing Registration...</span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-5 h-5" />
                    <span>Register as Event Organizer</span>
                  </>
                )}
              </button>
              <p className="text-center text-xs text-gray-500 mt-4">
                By registering, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </>
        )}

        {step === 'submitting' && (
          <div className="p-16 text-center">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] rounded-full animate-pulse"></div>
              <div className="absolute inset-2 bg-[#1A1A1A] rounded-full flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-[#d548ec] animate-spin" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Processing Your Registration</h3>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              Please confirm the transaction in MetaMask and wait for blockchain confirmation...
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-[#d548ec] rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-[#d548ec] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-[#d548ec] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="p-16 text-center">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full opacity-20 animate-ping"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <Check className="w-12 h-12 text-white" strokeWidth={3} />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-3">Welcome Aboard! 🎉</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Your Event Organizer profile has been successfully registered on Push Chain blockchain.
            </p>
            
            {txHash && (
              <a
                href={`https://donut.push.network/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[#d548ec] hover:text-[#e7a4fd] transition-colors mb-6"
              >
                <span>View Transaction on Explorer</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            )}
            
            <div className="mt-8 p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl max-w-md mx-auto">
              <div className="flex items-center justify-center gap-2 text-green-400 mb-2">
                <Check className="w-5 h-5" />
                <p className="font-semibold">Auto-Verified</p>
              </div>
              <p className="text-sm text-gray-400">
                You're ready to start creating events immediately!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EORegistrationModal;
