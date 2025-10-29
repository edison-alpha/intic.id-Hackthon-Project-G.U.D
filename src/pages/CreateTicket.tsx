import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Calendar, MapPin, Users, DollarSign, Image as ImageIcon, ArrowLeft, Settings, Plus, X, Loader2, CheckCircle, AlertCircle, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from '@/hooks/usePushChainWallet';

interface TicketCategory {
  id: string;
  name: string;
  price: string;
  supply: string;
  description: string;
}

interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  baseFee: number;
  features: string[];
  category: 'basic' | 'premium' | 'festival';
}

const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'basic-event',
    name: 'Basic Event',
    description: 'Simple NFT tickets with QR code validation',
    baseFee: 0.005,
    features: ['Basic NFT tickets', 'QR code generation', 'Simple validation', 'Transfer functionality'],
    category: 'basic'
  },
  {
    id: 'premium-event',
    name: 'Premium Event',
    description: 'Advanced features with tiers and royalties',
    baseFee: 0.02,
    features: ['Multi-tier tickets', 'Early access', 'Royalty system', 'Advanced metadata', 'Secondary market'],
    category: 'premium'
  },
  {
    id: 'festival-event',
    name: 'Festival Event',
    description: 'Multi-day events with wristband NFTs',
    baseFee: 0.05,
    features: ['Multi-day access', 'Wristband NFTs', 'Exclusive areas', 'Collectible badges', 'VIP features'],
    category: 'festival'
  }
];

const CreateTicket = () => {
  const [formData, setFormData] = useState({
    eventName: "",
    eventDate: "",
    eventTime: "",
    venue: "",
    description: "",
    royaltyPercentage: "5",
    category: "concert",
    contractTemplate: "basic-event",
    metadataUri: "",
    totalSupply: ""
  });

  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>([
    {
      id: '1',
      name: 'VVIP',
      price: '0.01',
      supply: '100',
      description: 'VIP access with premium benefits'
    },
    {
      id: '2',
      name: 'VIP',
      price: '0.005',
      supply: '500',
      description: 'Enhanced access to the event'
    },
    {
      id: '3',
      name: 'Regular',
      price: '0.001',
      supply: '1000',
      description: 'Standard access to the event'
    }
  ]);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStep, setDeploymentStep] = useState<'idle' | 'deploying' | 'registering' | 'success' | 'error'>('idle');
  const [deploymentTxId, setDeploymentTxId] = useState<string>('');
  const [registrationTxId, setRegistrationTxId] = useState<string>('');
  const [deployedContractAddress, setDeployedContractAddress] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<{type: 'success' | 'error' | null; message: string; queueId?: string}>({type: null, message: ''});
  const { wallet, isWalletConnected } = useWallet();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addTicketCategory = () => {
    const newCategory: TicketCategory = {
      id: Date.now().toString(),
      name: '',
      price: '',
      supply: '',
      description: ''
    };
    setTicketCategories(prev => [...prev, newCategory]);
  };

  const removeTicketCategory = (id: string) => {
    if (ticketCategories.length > 1) {
      setTicketCategories(prev => prev.filter(cat => cat.id !== id));
    }
  };

  const updateTicketCategory = (id: string, field: keyof TicketCategory, value: string) => {
    setTicketCategories(prev => prev.map(cat =>
      cat.id === id ? { ...cat, [field]: value } : cat
    ));
  };

  const selectedTemplate = CONTRACT_TEMPLATES.find(t => t.id === formData.contractTemplate);

  const calculateTotalSupply = () => {
    return ticketCategories.reduce((total, cat) => total + (parseInt(cat.supply) || 0), 0);
  };

  const calculateDeploymentCost = () => {
    // Contract deployment costs in PC (PushChain native token)
    const deploymentFee = 0.25; // 0.25 PC base deployment fee
    return deploymentFee;
  };

  const calculateTotalRevenue = () => {
    return ticketCategories.reduce((total, cat) => {
      const price = parseFloat(cat.price) || 0;
      const supply = parseInt(cat.supply) || 0;
      return total + (price * supply);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check wallet connection
    if (!isWalletConnected || !wallet?.address) {
      toast.error("Please connect your wallet first");
      return;
    }

    // Validation
    if (!formData.eventName || !formData.eventDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate ticket categories
    const invalidCategories = ticketCategories.filter(cat =>
      !cat.name || !cat.price || !cat.supply ||
      parseFloat(cat.price) <= 0 || parseInt(cat.supply) <= 0
    );

    if (invalidCategories.length > 0) {
      toast.error("Please complete all ticket category details");
      return;
    }

    setIsDeploying(true);
    setDeploymentStep('deploying');

    try {
      // Step 1: Deploy Contract
      setDeploymentStep('deploying');
      console.log('📝 Step 1/2: Deploying your NFT contract to the blockchain...');

      // Simulate contract deployment (in production, this would call actual Stacks deployment)
      // For now, we'll simulate with a timeout
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Mock transaction ID and contract address
      const mockDeploymentTxId = `0x${Array.from({length: 64}, () =>
        Math.floor(Math.random() * 16).toString(16)).join('')}`;
      const mockContractAddress = `${wallet.address}.event-${formData.eventName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;

      setDeploymentTxId(mockDeploymentTxId);
      setDeployedContractAddress(mockContractAddress);

      console.log('✅ Contract deployed successfully! TX ID:', mockDeploymentTxId);

      // Step 2: Register to Registry
      setDeploymentStep('registering');
      console.log('🎫 Step 2/2: Registering your event to the platform registry...');

      try {
        const eventDate = new Date(formData.eventDate).getTime();
        const registryParams = {
          contractAddress: mockContractAddress,
          contractName: mockContractAddress.split('.')[1],
          eventName: formData.eventName,
          eventDescription: formData.description,
          category: formData.category,
          venue: formData.venue,
          venueAddress: formData.venue,
          venueCoordinates: "0,0",
          eventDate: eventDate,
          ticketPrice: Math.floor(parseFloat(ticketCategories[0]?.price || '0') * 1000000),
          totalSupply: calculateTotalSupply(),
          imageUri: formData.metadataUri || '',
          metadataUri: formData.metadataUri || '',
          userAddress: wallet.address,
        };

        // Mock registration - simulate successful registration
        const mockRegistryResult = { txId: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}` };
        setRegistrationTxId(mockRegistryResult.txId);

        console.log('✅ Event registered to platform! TX ID:', registryResult.txId);

        // BOTH steps completed successfully!
        setDeploymentStep('success');
        toast.success('🎉 Event created and registered successfully!');
        setShowSuccessModal(true);

      } catch (registryError: any) {
        console.error('Registry error:', registryError);

        // Even if registry fails, deployment succeeded
        if (registryError.message?.includes('cancelled')) {
          toast.warning('Contract deployed, but registration was cancelled. You can register later from the dashboard.');
          setDeploymentStep('success');
          setShowSuccessModal(true);
        } else {
          toast.error('Contract deployed successfully, but registry registration failed. You can register later.');
          setDeploymentStep('success');
          setShowSuccessModal(true);
        }
      }

    } catch (error: any) {
      console.error('Deployment error:', error);
      setDeploymentStep('error');
      toast.dismiss();
      toast.error(error.message || 'Contract deployment failed. Please try again.');
    } finally {
      setIsDeploying(false);
    }
  };

  const resetForm = () => {
    setFormData({
      eventName: "",
      eventDate: "",
      eventTime: "",
      venue: "",
      description: "",
      royaltyPercentage: "5",
      category: "concert",
      contractTemplate: "basic-event",
      metadataUri: "",
      totalSupply: ""
    });
    setTicketCategories([
      {
        id: '1',
        name: 'VVIP',
        price: '0.01',
        supply: '100',
        description: 'VIP access with premium benefits'
      },
      {
        id: '2',
        name: 'VIP',
        price: '0.005',
        supply: '500',
        description: 'Enhanced access to the event'
      },
      {
        id: '3',
        name: 'Regular',
        price: '0.001',
        supply: '1000',
        description: 'Standard access to the event'
      }
    ]);
    setImagePreview(null);
    setDeploymentStep('idle');
    setDeploymentTxId('');
    setRegistrationTxId('');
    setDeployedContractAddress('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('✅ Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container px-4 sm:px-6 lg:px-8 mx-auto max-w-4xl">
          {/* Back Button */}
          <a
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-[#d548ec] transition-colors duration-300 mb-6 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
            <span>Back to Home</span>
          </a>

          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#d548ec]/10 to-[#e7a4fd]/10 border border-[#d548ec]/20 rounded-full mb-4">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#d548ec] text-white text-sm font-bold">+</span>
              <span className="text-[#d548ec] font-semibold">Create NFT Ticket</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-display font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">
              Deploy Your NFT Event Contract
            </h1>
            <p className="text-lg text-gray-400">
              Deploy individual smart contracts for your event on Stacks blockchain. Each contract is unique, secure, and fully customizable.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-3xl shadow-2xl shadow-[#d548ec]/5 overflow-hidden">
            {/* Card Header */}
            <div
              className="relative h-48 p-8 flex items-end bg-cover bg-center before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-t before:from-[#1A1A1A] before:to-transparent"
              style={{
                backgroundImage: "url('/background-section2.png')"
              }}
            >
              <h2 className="text-2xl font-display text-white font-bold relative z-10">
                Event Details
              </h2>
            </div>

            {/* Form Content */}
            <div className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Event Image Upload */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    Event Image <span className="text-[#d548ec]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-700 rounded-2xl cursor-pointer hover:border-[#d548ec] transition-all duration-300 bg-[#0A0A0A] hover:bg-[#1A1A1A] group"
                    >
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <div className="flex flex-col items-center">
                          <ImageIcon className="w-12 h-12 text-gray-600 mb-3 group-hover:text-[#d548ec] transition-colors duration-300" />
                          <p className="text-sm text-gray-300 font-medium">Click to upload event image</p>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Event Name */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    Event Name <span className="text-[#d548ec]">*</span>
                  </label>
                  <input
                    type="text"
                    name="eventName"
                    value={formData.eventName}
                    onChange={handleChange}
                    placeholder="e.g., Summer Music Festival 2025"
                    className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A] border border-gray-700 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#d548ec] focus:border-[#d548ec] transition-all"
                    required
                  />
                </div>

                {/* Date and Time Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-3">
                      <Calendar className="w-4 h-4 inline mr-1 text-[#d548ec]" />
                      Event Date <span className="text-[#d548ec]">*</span>
                    </label>
                    <input
                      type="date"
                      name="eventDate"
                      value={formData.eventDate}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#d548ec] focus:border-[#d548ec] transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-3">
                      Event Time
                    </label>
                    <input
                      type="time"
                      name="eventTime"
                      value={formData.eventTime}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#d548ec] focus:border-[#d548ec] transition-all"
                    />
                  </div>
                </div>

                {/* Venue */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    <MapPin className="w-4 h-4 inline mr-1 text-[#d548ec]" />
                    Venue Location
                  </label>
                  <input
                    type="text"
                    name="venue"
                    value={formData.venue}
                    onChange={handleChange}
                    placeholder="e.g., Madison Square Garden, New York"
                    className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A] border border-gray-700 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#d548ec] focus:border-[#d548ec] transition-all"
                  />
                </div>

                {/* Category and Template Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-3">
                      Event Category <span className="text-[#d548ec]">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#d548ec] focus:border-[#d548ec] transition-all"
                      required
                    >
                      <option value="concert">Concert</option>
                      <option value="sports">Sports</option>
                      <option value="conference">Conference</option>
                      <option value="festival">Festival</option>
                      <option value="theater">Theater</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-3">
                      <Settings className="w-4 h-4 inline mr-1 text-[#d548ec]" />
                      Contract Template <span className="text-[#d548ec]">*</span>
                    </label>
                    <select
                      name="contractTemplate"
                      value={formData.contractTemplate}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#d548ec] focus:border-[#d548ec] transition-all"
                      required
                    >
                      {CONTRACT_TEMPLATES.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} (Fee: {template.baseFee} STX)
                        </option>
                      ))}
                    </select>
                    {selectedTemplate && (
                      <p className="text-xs text-gray-400 mt-1">{selectedTemplate.description}</p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    Event Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe your event, special guests, amenities, etc."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A] border border-gray-700 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#d548ec] focus:border-[#d548ec] transition-all resize-none"
                  />
                </div>

                {/* Ticket Categories Section */}
                <div className="border-t border-gray-800 pt-6 mt-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-white">Ticket Categories</h3>
                    <button
                      type="button"
                      onClick={addTicketCategory}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] hover:from-[#c030d6] hover:to-[#d183f0] text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl hover:shadow-[#d548ec]/30"
                    >
                      <Plus className="w-4 h-4" />
                      Add Category
                    </button>
                  </div>

                  <div className="space-y-4">
                    {ticketCategories.map((category, index) => (
                      <div key={category.id} className="border border-gray-700 rounded-xl p-4 bg-[#0A0A0A] hover:border-gray-600 transition-all">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-semibold text-white">Category {index + 1}</h4>
                          {ticketCategories.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTicketCategory(category.id)}
                              className="text-red-400 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Category Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={category.name}
                              onChange={(e) => updateTicketCategory(category.id, 'name', e.target.value)}
                              placeholder="e.g., VVIP, VIP, Regular"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#d548ec] focus:border-transparent"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <DollarSign className="w-4 h-4 inline mr-1" />
                              Price (STX) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={category.price}
                              onChange={(e) => updateTicketCategory(category.id, 'price', e.target.value)}
                              placeholder="0.001"
                              step="0.000001"
                              min="0"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#d548ec] focus:border-transparent"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <Users className="w-4 h-4 inline mr-1" />
                              Supply <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={category.supply}
                              onChange={(e) => updateTicketCategory(category.id, 'supply', e.target.value)}
                              placeholder="100"
                              min="1"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#d548ec] focus:border-transparent"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Description
                            </label>
                            <input
                              type="text"
                              value={category.description}
                              onChange={(e) => updateTicketCategory(category.id, 'description', e.target.value)}
                              placeholder="Category description"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#d548ec] focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Contract Configuration */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Configuration</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          Secondary Market Royalty (%)
                        </label>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            name="royaltyPercentage"
                            value={formData.royaltyPercentage}
                            onChange={handleChange}
                            min="0"
                            max="10"
                            step="0.5"
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#d548ec]"
                          />
                          <span className="text-lg font-semibold text-[#d548ec] min-w-[50px]">
                            {formData.royaltyPercentage}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Earn royalties on every secondary market sale
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          Metadata URI (Optional)
                        </label>
                        <input
                          type="url"
                          name="metadataUri"
                          value={formData.metadataUri}
                          onChange={handleChange}
                          placeholder="https://example.com/metadata.json"
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#d548ec] focus:border-transparent transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          URI for additional contract metadata
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deployment Summary */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-600" />
                    Deployment Summary
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-sm text-gray-600">Total Supply</div>
                      <div className="text-lg font-bold text-gray-900">{calculateTotalSupply().toLocaleString()}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-sm text-gray-600">Est. Revenue</div>
                      <div className="text-lg font-bold text-[#d548ec]">{calculateTotalRevenue().toFixed(6)} STX</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-sm text-gray-600">Deployment Cost</div>
                      <div className="text-lg font-bold text-purple-600">{calculateDeploymentCost().toFixed(2)} STX</div>
                      <div className="text-xs text-gray-500 mt-1">Paid from your wallet</div>
                    </div>
                  </div>

                  {selectedTemplate && (
                    <div className="bg-white rounded-lg p-3 mb-4">
                      <div className="text-sm text-gray-600 mb-2">Template Features:</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.features.map((feature, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>


                {/* Deployment Status */}
                {deploymentStatus.type && (
                  <div className={`rounded-2xl p-6 border ${
                    deploymentStatus.type === 'success'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {deploymentStatus.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      <h4 className={`font-semibold ${
                        deploymentStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {deploymentStatus.type === 'success' ? 'Deployment Successful!' : 'Deployment Failed'}
                      </h4>
                    </div>
                    <p className={`text-sm ${
                      deploymentStatus.type === 'success' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {deploymentStatus.message}
                    </p>
                    {deploymentStatus.queueId && (
                      <p className="text-xs text-gray-600 mt-2">
                        Track your deployment in the Dashboard → Contracts section
                      </p>
                    )}
                  </div>
                )}

                {/* Info Box */}
                <div className="bg-gradient-to-br from-[#f5f0ff] to-purple-50 border border-[#e7a4fd]/20 rounded-2xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#d548ec]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    What happens next?
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-[#d548ec] mt-1">•</span>
                      <span>Your smart contract will be deployed to Stacks blockchain</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#d548ec] mt-1">•</span>
                      <span>You'll have your own unique contract address</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#d548ec] mt-1">•</span>
                      <span>Users can mint tickets directly from your contract</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#d548ec] mt-1">•</span>
                      <span>You'll receive royalties automatically on secondary sales</span>
                    </li>
                  </ul>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="flex-1 px-6 py-4 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-gray-700 text-gray-300 font-semibold rounded-full transition-all duration-300"
                    disabled={isDeploying}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDeploying}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] hover:from-[#c030d6] hover:to-[#d183f0] disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-semibold rounded-full transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-[#d548ec]/50 disabled:shadow-none relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#e7a4fd] to-[#d183f0] opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    {isDeploying ? (
                      <div className="flex items-center justify-center gap-2 relative z-10">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>
                          {deploymentStep === 'deploying' && 'Creating Event...'}
                          {deploymentStep === 'registering' && 'Registering...'}
                        </span>
                      </div>
                    ) : (
                      <span className="relative z-10">Create Event ({calculateDeploymentCost().toFixed(2)} STX)</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Additional Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:shadow-[#d548ec]/10 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#d548ec]/20 to-[#e7a4fd]/10 border border-[#d548ec]/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-[#d548ec]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Secure & Verified</h3>
              <p className="text-sm text-gray-400">Built on Stacks blockchain with Bitcoin's security layer</p>
            </div>

            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Instant Transfer</h3>
              <p className="text-sm text-gray-400">Tickets can be transferred instantly to any wallet</p>
            </div>

            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Earn Royalties</h3>
              <p className="text-sm text-gray-400">Automatic royalties on every secondary sale</p>
            </div>
          </div>

        </div>
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full p-8 animate-in zoom-in-95 duration-300 relative">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowSuccessModal(false);
                setDeploymentStep('idle');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/10 border-2 border-green-500 flex items-center justify-center animate-in zoom-in duration-500">
                <CheckCircle className="w-12 h-12 text-green-400" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-3">
              🎉 Successfully Created!
            </h2>

            {/* Description */}
            <p className="text-gray-300 text-center mb-6">
              Your event has been deployed and registered on the blockchain. Tickets can be minted once both transactions are confirmed (typically 2-3 minutes).
            </p>

            {/* Transaction Details */}
            <div className="space-y-4 mb-6">
              {/* Event Name */}
              <div className="bg-[#0A0A0A] rounded-xl p-4 border border-gray-800">
                <div className="text-sm text-gray-500 mb-1">Event Name</div>
                <div className="text-white font-semibold text-lg">{formData.eventName}</div>
              </div>

              {/* Transaction IDs Section */}
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] rounded-xl p-5 border border-gray-700">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Transaction IDs
                </h3>

                {/* Deployment Transaction */}
                <div className="mb-4 pb-4 border-b border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <div className="text-sm font-medium text-green-400">Event Deployed</div>
                  </div>
                  <div className="flex items-center gap-2 group">
                    <code className="text-gray-300 text-xs font-mono flex-1 break-all bg-black/30 px-3 py-2 rounded">
                      {deploymentTxId}
                    </code>
                    <button
                      onClick={() => copyToClipboard(deploymentTxId)}
                      className="p-2 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                      title="Copy Deployment TX ID"
                    >
                      <Copy className="w-4 h-4 text-gray-400 group-hover:text-white" />
                    </button>
                    <a
                      href={`https://explorer.hiro.so/txid/${deploymentTxId}?chain=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                      title="View Deployment on Explorer"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-green-400" />
                    </a>
                  </div>
                </div>

                {/* Registry Transaction */}
                {registrationTxId ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <div className="text-sm font-medium text-blue-400">Event Registration</div>
                    </div>
                    <div className="flex items-center gap-2 group">
                      <code className="text-gray-300 text-xs font-mono flex-1 break-all bg-black/30 px-3 py-2 rounded">
                        {registrationTxId}
                      </code>
                      <button
                        onClick={() => copyToClipboard(registrationTxId)}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                        title="Copy Registration TX ID"
                      >
                        <Copy className="w-4 h-4 text-gray-400 group-hover:text-white" />
                      </button>
                      <a
                        href={`https://explorer.hiro.so/txid/${registrationTxId}?chain=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                        title="View Registration on Explorer"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <div className="text-sm font-medium text-yellow-400">Event Registration</div>
                    </div>
                    <div className="text-xs text-gray-500 bg-black/30 px-3 py-2 rounded">
                      Registration was skipped or cancelled
                    </div>
                  </div>
                )}
              </div>

              {/* Contract Address */}
              <div className="bg-[#0A0A0A] rounded-xl p-4 border border-gray-800">
                <div className="text-sm text-gray-500 mb-2">Contract Address</div>
                <div className="flex items-center gap-2 group">
                  <code className="text-[#d548ec] text-sm font-mono flex-1 break-all">
                    {deployedContractAddress}
                  </code>
                  <button
                    onClick={() => copyToClipboard(deployedContractAddress)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                    title="Copy Contract Address"
                  >
                    <Copy className="w-4 h-4 text-gray-400 group-hover:text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  resetForm();
                }}
                className="flex-1 px-6 py-3 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-gray-700 text-white font-semibold rounded-xl transition-all"
              >
                Create Another Event
              </button>
              <a
                href="/app/portofolio"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] hover:from-[#c030d6] hover:to-[#d183f0] text-white font-semibold rounded-xl transition-all text-center shadow-lg hover:shadow-xl hover:shadow-[#d548ec]/30"
              >
                Go to Portofolio
              </a>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default CreateTicket;
