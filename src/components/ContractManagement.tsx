import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/usePushChainWallet';
import { useEOContracts } from '@/hooks/useEOContracts';
import { usePlatformManagement } from '@/hooks/usePlatformManagement';
import type { DeployedContract as EODeployedContract } from '@/hooks/useEOContracts';
import type { PlatformInfo as PlatformData } from '@/hooks/usePlatformManagement';
import { ethers } from 'ethers';
import { 
  sendEventCancelledAlert, 
  sendEventPausedAlert, 
  sendEventResumedAlert 
} from '@/services/emailAlertService';

import { ContractManagementFullSkeleton } from './ContractManagementSkeleton.tsx';
import CheckedInTickets from './CheckedInTickets';

/**
 * Get user email from localStorage or generate placeholder
 */
const getUserEmail = (walletAddress: string): string => {
  try {
    // Try to get email from localStorage (saved from MyTickets or Settings)
    const savedEmail = localStorage.getItem(`user-email-${walletAddress}`) || 
                      localStorage.getItem('user-email');
    
    if (savedEmail && savedEmail.includes('@')) {
      return savedEmail;
    }
  } catch (error) {
    console.error('Failed to get email from localStorage:', error);
  }
  
  // Fallback: generate placeholder email
  return `user-${walletAddress.slice(2, 8)}@example.com`;
};

import {
  Eye,
  ExternalLink,
  Copy,
  BarChart3,
  DollarSign,
  Users,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  FileCode,
  Activity,
  Hash,
  MoreVertical,
  QrCode,
  Download,
  X,
  Settings,
  Shield,
  Zap,
  Pause,
  Play,
  Wallet,
  Server
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QRCodeCanvas } from 'qrcode.react';

const ContractManagement = () => {
  const { wallet, isWalletConnected } = useWallet();
  
  // Use real blockchain data hook
  const { contracts, stats, loading, error, refetch } = useEOContracts();
  
  // Platform management hook
  const {
    getPlatformInfo,
    pausePlatform,
    unpausePlatform,
    loading: platformLoading
  } = usePlatformManagement();
  
  const [selectedContract, setSelectedContract] = useState<EODeployedContract | null>(null);
  const [platformInfo, setPlatformInfo] = useState<PlatformData | null>(null);
  const [showPlatformManagement, setShowPlatformManagement] = useState(false);

  // QR Code Check-In modal state
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrContract, setQrContract] = useState<EODeployedContract | null>(null);

  // Edit Event modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editContract, setEditContract] = useState<EODeployedContract | null>(null);
  const [editForm, setEditForm] = useState({
    eventName: '',
    eventDescription: '',
    eventImageUri: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Cancel/Pause modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [actionContract, setActionContract] = useState<EODeployedContract | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Fetch platform information using the platform management hook
   */
  const fetchPlatformInfo = async () => {
    if (!wallet?.address) return;
    
    const data = await getPlatformInfo();
    if (data) {
      setPlatformInfo(data);
    }
  };

  /**
   * Toggle platform pause state (only for platform owner)
   */
  const togglePlatformPause = async () => {
    if (!wallet?.address || !platformInfo) return;
    
    try {
      const success = platformInfo.isPaused 
        ? await unpausePlatform()
        : await pausePlatform();
        
      if (success) {
        // Refresh platform info
        await fetchPlatformInfo();
      }
    } catch (err) {
      console.error('Error toggling platform pause:', err);
    }
  };

  // Load platform info when wallet connects
  useEffect(() => {
    if (wallet?.address) {
      fetchPlatformInfo();
    }
  }, [wallet?.address, contracts.length]);

  /**
   * Open edit modal with contract data
   */
  const openEditModal = (contract: EODeployedContract) => {
    setEditContract(contract);
    setEditForm({
      eventName: contract.eventName || '',
      eventDescription: contract.eventDescription || '',
      eventImageUri: contract.eventImage || '',
    });
    setShowEditModal(true);
  };

  /**
   * Update event details (name, description, banner)
   */
  const handleUpdateEvent = async () => {
    if (!editContract || !wallet?.address) return;

    setIsUpdating(true);
    try {
      const { BrowserProvider, Contract } = await import('ethers');
      const EventTicketABI = (await import('@/contracts/EventTicket.json')).default;

      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(editContract.contractAddress, EventTicketABI.abi, signer);

      // Update name if changed
      if (editForm.eventName && editForm.eventName !== editContract.eventName) {
        const nameTx = await contract.updateEventName(editForm.eventName);
        await nameTx.wait();
      }

      // Update description if changed
      if (editForm.eventDescription !== editContract.eventDescription) {
        const descTx = await contract.updateEventDescription(editForm.eventDescription);
        await descTx.wait();
      }

      // Update image if changed
      if (editForm.eventImageUri && editForm.eventImageUri !== editContract.eventImage) {
        const imageTx = await contract.updateEventImage(editForm.eventImageUri);
        await imageTx.wait();
      }

      alert('Event updated successfully!');
      setShowEditModal(false);
      refetch(); // Reload contracts
    } catch (error: any) {
      console.error('Error updating event:', error);
      alert(error.message || 'Failed to update event');
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Pause event (stop ticket sales temporarily)
   */
  const handlePauseEvent = async () => {
    if (!actionContract || !wallet?.address) return;

    setIsProcessing(true);
    try {
      const { BrowserProvider, Contract } = await import('ethers');
      const EventTicketABI = (await import('@/contracts/EventTicket.json')).default;

      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(actionContract.contractAddress, EventTicketABI.abi, signer);

      const tx = await contract.pauseEvent();
      await tx.wait();

      alert('Event paused successfully!');
      
      // Send email alerts to ticket holders
      try {
        // Get all ticket holders from Transfer events
        const transferFilter = contract.filters.Transfer(null, null, null);
        const transferEvents = await contract.queryFilter(transferFilter);
        
        const ticketHolders = new Set<string>();
        for (const event of transferEvents) {
          const to = event.args?.to;
          if (to && to !== ethers.ZeroAddress) {
            ticketHolders.add(to.toLowerCase());
          }
        }

        console.log(`📧 Sending pause alerts to ${ticketHolders.size} ticket holders...`);

        // Send email alerts to ticket holders
        for (const holder of Array.from(ticketHolders).slice(0, 10)) { // Send to first 10 users
          const userEmail = getUserEmail(holder);
          
          await sendEventPausedAlert({
            userEmail,
            eventName: actionContract.eventName,
            eventDate: actionContract.eventDate || 'TBA',
            eventTime: actionContract.eventTime || 'TBA',
            location: actionContract.location || 'TBA',
            ticketCount: 1, // Get actual count from contract
            totalAmount: actionContract.price || '0',
            contractAddress: actionContract.contractAddress,
          });
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('✅ Pause alerts sent successfully');
      } catch (emailError) {
        console.error('⚠️ Failed to send some email alerts:', emailError);
        // Don't block the main flow if emails fail
      }

      setShowPauseModal(false);
      refetch(); // Reload contracts
    } catch (error: any) {
      console.error('Error pausing event:', error);
      alert(error.message || 'Failed to pause event');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Resume paused event
   */
  const handleResumeEvent = async () => {
    if (!actionContract || !wallet?.address) return;

    setIsProcessing(true);
    try {
      const { BrowserProvider, Contract } = await import('ethers');
      const EventTicketABI = (await import('@/contracts/EventTicket.json')).default;

      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(actionContract.contractAddress, EventTicketABI.abi, signer);

      const tx = await contract.resumeEvent();
      await tx.wait();

      alert('Event resumed successfully!');

      // Send email alerts to ticket holders
      try {
        const transferFilter = contract.filters.Transfer(null, null, null);
        const transferEvents = await contract.queryFilter(transferFilter);
        
        const ticketHolders = new Set<string>();
        for (const event of transferEvents) {
          const to = event.args?.to;
          if (to && to !== ethers.ZeroAddress) {
            ticketHolders.add(to.toLowerCase());
          }
        }

        console.log(`📧 Sending resume alerts to ${ticketHolders.size} ticket holders...`);

        for (const holder of Array.from(ticketHolders).slice(0, 10)) {
          const userEmail = getUserEmail(holder);
          
          await sendEventResumedAlert({
            userEmail,
            eventName: actionContract.eventName,
            eventDate: actionContract.eventDate || 'TBA',
            eventTime: actionContract.eventTime || 'TBA',
            location: actionContract.location || 'TBA',
            ticketCount: 1,
            totalAmount: actionContract.price || '0',
            contractAddress: actionContract.contractAddress,
          });
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('✅ Resume alerts sent successfully');
      } catch (emailError) {
        console.error('⚠️ Failed to send some email alerts:', emailError);
      }

      setShowPauseModal(false);
      refetch(); // Reload contracts
    } catch (error: any) {
      console.error('Error resuming event:', error);
      alert(error.message || 'Failed to resume event');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Cancel event (enable refunds for all ticket holders)
   */
  const handleCancelEvent = async () => {
    if (!actionContract || !wallet?.address) return;

    setIsProcessing(true);
    try {
      const { BrowserProvider, Contract } = await import('ethers');
      const EventTicketABI = (await import('@/contracts/EventTicket.json')).default;

      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(actionContract.contractAddress, EventTicketABI.abi, signer);

      const tx = await contract.cancelEvent();
      await tx.wait();

      alert('Event cancelled successfully! Refunds are now enabled for all ticket holders.');

      // Send email alerts to ALL ticket holders about cancellation
      try {
        const transferFilter = contract.filters.Transfer(null, null, null);
        const transferEvents = await contract.queryFilter(transferFilter);
        
        const ticketHolders = new Set<string>();
        for (const event of transferEvents) {
          const to = event.args?.to;
          if (to && to !== ethers.ZeroAddress) {
            ticketHolders.add(to.toLowerCase());
          }
        }

        console.log(`📧 Sending cancellation alerts to ${ticketHolders.size} ticket holders...`);

        for (const holder of Array.from(ticketHolders).slice(0, 20)) { // Send to first 20 users for cancel
          const userEmail = getUserEmail(holder);
          
          await sendEventCancelledAlert({
            userEmail,
            eventName: actionContract.eventName,
            eventDate: actionContract.eventDate || 'TBA',
            eventTime: actionContract.eventTime || 'TBA',
            location: actionContract.location || 'TBA',
            ticketCount: 1,
            totalAmount: actionContract.price || '0',
            contractAddress: actionContract.contractAddress,
          });
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('✅ Cancellation alerts sent successfully');
      } catch (emailError) {
        console.error('⚠️ Failed to send some email alerts:', emailError);
      }

      setShowCancelModal(false);
      refetch(); // Reload contracts
    } catch (error: any) {
      console.error('Error cancelling event:', error);
      alert(error.message || 'Failed to cancel event');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAddress = (address: string | undefined) => {
    if (!address) return 'N/A';
    const parts = address.split('.');
    if (parts.length > 1 && parts[0] && parts[1]) {
      return `${parts[0].slice(0, 8)}...${parts[0].slice(-4)}.${parts[1]}`;
    }
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Copied, no toast
  };

  if (!isWalletConnected) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="bg-[#1A1A1A] border-gray-800 p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-[#e7a4fd] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Connect Your Wallet</h3>
          <p className="text-gray-400 mb-4">
            Please connect your Stacks wallet to view and manage your NFT ticket contracts
          </p>
          <p className="text-sm text-gray-500">
            Your event contracts will appear here once you connect your wallet
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Platform Management Section - Only for platform owner */}
      {platformInfo && wallet?.address.toLowerCase() === platformInfo.owner.toLowerCase() && (
        <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    Platform Management
                    <Badge variant={platformInfo.isPaused ? "destructive" : "default"} className="ml-2">
                      {platformInfo.isPaused ? "PAUSED" : "ACTIVE"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>Manage the entire PushChain E-Ticketing platform</CardDescription>
                </div>
              </div>
              <Button
                onClick={() => setShowPlatformManagement(!showPlatformManagement)}
                variant="outline"
                size="sm"
                className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
              >
                <Settings className="w-4 h-4 mr-2" />
                {showPlatformManagement ? 'Hide' : 'Show'} Details
              </Button>
            </div>
          </CardHeader>
          
          {showPlatformManagement && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-black/20 border-gray-700">
                  <CardContent className="p-4 text-center">
                    <Wallet className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <div className="text-lg font-bold text-white">{platformInfo.balance}</div>
                    <div className="text-xs text-gray-400">Platform Balance (PUSH)</div>
                  </CardContent>
                </Card>
                <Card className="bg-black/20 border-gray-700">
                  <CardContent className="p-4 text-center">
                    <Server className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                    <div className="text-lg font-bold text-white">{contracts.length}</div>
                    <div className="text-xs text-gray-400">Total Events</div>
                  </CardContent>
                </Card>
                <Card className="bg-black/20 border-gray-700">
                  <CardContent className="p-4 text-center">
                    <Activity className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                    <div className="text-lg font-bold text-white">{stats.totalTicketsSold}</div>
                    <div className="text-xs text-gray-400">Total Tickets Sold</div>
                  </CardContent>
                </Card>
                <Card className="bg-black/20 border-gray-700">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                    <div className="text-lg font-bold text-white">{stats.totalRevenue.toFixed(4)}</div>
                    <div className="text-xs text-gray-400">Total Revenue (PUSH)</div>
                  </CardContent>
                </Card>
              </div>

              {/* Platform Actions */}
              <div className="flex gap-3 mb-6">
                <Button
                  onClick={togglePlatformPause}
                  disabled={platformLoading}
                  variant={platformInfo.isPaused ? "default" : "destructive"}
                  className={platformInfo.isPaused 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-red-600 hover:bg-red-700"
                  }
                >
                  {platformLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : platformInfo.isPaused ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Resume Platform
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause Platform
                    </>
                  )}
                </Button>
                <Button
                  onClick={fetchPlatformInfo}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {/* Registered Contracts */}
              <div className="space-y-3">
                <h4 className="text-white font-semibold flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  Registered Platform Contracts
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(platformInfo.contracts).map(([name, address]) => (
                    <div key={name} className="bg-black/20 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1 capitalize">
                        {name.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-mono text-gray-300">
                          {address === ethers.ZeroAddress ? 'Not Set' : `${address.slice(0, 8)}...${address.slice(-6)}`}
                        </div>
                        {address !== ethers.ZeroAddress && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(address)}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`https://testnet.explorer.push.org/address/${address}`, '_blank')}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">{contracts.length}</div>
            <div className="text-sm text-gray-400">Deployed</div>
          </CardContent>
        </Card>
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[#d548ec]">{stats.totalRevenue?.toFixed(4) || '0.0000'}</div>
            <div className="text-sm text-gray-400">Total Revenue (PUSH)</div>
          </CardContent>
        </Card>
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.totalTicketsSold?.toLocaleString() || '0'}</div>
            <div className="text-sm text-gray-400">Tickets Sold</div>
          </CardContent>
        </Card>
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.averagePrice?.toFixed(4) || '0.0000'}</div>
            <div className="text-sm text-gray-400">Avg Price (PUSH)</div>
          </CardContent>
        </Card>
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.activeEvents}</div>
            <div className="text-sm text-gray-400">Active Events</div>
          </CardContent>
        </Card>
      </div>

      {/* My Ticket Contracts */}
      <div className="space-y-4">
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <CardTitle className="text-xl font-bold text-white">
                      Event Ticket Contracts
                    </CardTitle>
                    {wallet?.address && (
                      <Badge variant="outline" className="font-mono text-xs text-gray-400 border-gray-700">
                        {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-gray-500">
                    View and manage your deployed NFT ticket contracts
                  </CardDescription>
                </div>
                <Button
                  onClick={refetch}
                  disabled={loading}
                  size="sm"
                  className="bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] hover:from-[#c030d6] hover:to-[#d183f0] text-white disabled:opacity-50"
                  title="Load your events from blockchain"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Loading...' : 'Load Events'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-6">
                  {/* Skeleton loading for contract management */}
                  <ContractManagementFullSkeleton />
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white">Error Loading Events</h3>
                  <p className="text-gray-400 mb-2 mt-2">
                    {error}
                  </p>
                  <Button
                    onClick={refetch}
                    variant="outline"
                    className="bg-[#1A1A1A] border-gray-700 text-white hover:bg-[#2A2A2A] mt-4"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : contracts.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white">No Events Found</h3>
                  <p className="text-gray-400 mb-2 mt-2">
                    You haven't deployed any event contracts yet
                  </p>
                  <p className="text-gray-500 text-sm mb-4">
                    Deploy your first NFT ticket contract to get started!
                  </p>
                  <Button
                    onClick={refetch}
                    variant="outline"
                    className="bg-[#1A1A1A] border-gray-700 text-white hover:bg-[#2A2A2A]"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {contracts.map((contract, index) => {
                    const queueId = `#${10000 + index + 1}`;
                    
                    // Determine status badge
                    let statusBadge = (
                      <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-600/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    );
                    
                    if (contract.eventStatus === 'cancelled') {
                      statusBadge = (
                        <Badge variant="default" className="bg-red-600/20 text-red-400 border-red-600/30">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Cancelled
                        </Badge>
                      );
                    } else if (contract.eventStatus === 'paused') {
                      statusBadge = (
                        <Badge variant="default" className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">
                          <Pause className="w-3 h-3 mr-1" />
                          Paused
                        </Badge>
                      );
                    } else if (contract.eventStatus === 'sold-out') {
                      statusBadge = (
                        <Badge variant="default" className="bg-purple-600/20 text-purple-400 border-purple-600/30">
                          Sold Out
                        </Badge>
                      );
                    } else if (contract.eventStatus === 'upcoming') {
                      statusBadge = (
                        <Badge variant="default" className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                          Upcoming
                        </Badge>
                      );
                    } else if (contract.eventStatus === 'past') {
                      statusBadge = (
                        <Badge variant="default" className="bg-gray-600/20 text-gray-400 border-gray-600/30">
                          Past
                        </Badge>
                      );
                    }
                    
                    return (
                      <Card key={contract.contractAddress} className="bg-[#0A0A0A] border-gray-800 hover:border-gray-700 transition-all">
                        <CardContent className="p-5">
                          {/* Header: Event Name, Status & Details Button */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-white mb-2">
                                {contract.eventName}
                              </h3>
                              {statusBadge}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedContract(contract)}
                              className="bg-[#1A1A1A] border-gray-700 text-white hover:bg-[#2A2A2A]"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Details
                            </Button>
                          </div>

                          {/* Grid Information */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 mb-4">
                            {/* Queue ID */}
                            <div className="space-y-1">
                              <div className="text-xs text-gray-500">Queue ID:</div>
                              <div className="text-sm font-semibold text-[#d548ec]">{queueId}</div>
                            </div>

                            {/* Category */}
                            <div className="space-y-1">
                              <div className="text-xs text-gray-500">Category:</div>
                              <div className="text-sm font-semibold text-white">Event</div>
                            </div>

                            {/* Supply */}
                            <div className="space-y-1">
                              <div className="text-xs text-gray-500">Supply:</div>
                              <div className="text-sm font-semibold text-white">
                                {contract.totalSupply.toLocaleString()} tickets
                              </div>
                            </div>

                            {/* Price */}
                            <div className="space-y-1">
                              <div className="text-xs text-gray-500">Price:</div>
                              <div className="text-sm font-semibold text-white">
                                {contract.ticketPriceFormatted}
                              </div>
                            </div>

                            {/* Minted */}
                            <div className="space-y-1">
                              <div className="text-xs text-gray-500">Minted:</div>
                              <div className="text-sm font-semibold text-green-400">
                                {contract.ticketsSold} / {contract.totalSupply}
                              </div>
                            </div>

                            {/* Revenue */}
                            <div className="space-y-1">
                              <div className="text-xs text-gray-500">Revenue:</div>
                              <div className="text-sm font-semibold text-[#d548ec]">
                                {contract.revenueFormatted}
                              </div>
                            </div>
                          </div>

                          {/* Timestamps */}
                          <div className="flex items-center gap-6 mb-4 text-xs text-gray-500">
                            <div>
                              <span>Event Date:</span> {new Date(contract.eventDate).toLocaleDateString()}
                            </div>
                            <div>
                              <span>Holders:</span> {contract.uniqueHolders}
                            </div>
                          </div>

                          {/* Contract Address Box with Actions */}
                          <div className="bg-[#0D2818] border border-green-900/30 rounded-lg p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-400 mb-2">Contract Address:</div>
                                <div className="text-sm font-mono text-green-400 break-all">
                                  {contract.contractAddress}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(contract.contractAddress)}
                                  className="bg-[#1A1A1A] border border-gray-700 text-white hover:bg-[#2A2A2A] h-9 w-9 p-0"
                                  title="Copy contract address"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(`https://testnet.explorer.push.org/address/${contract.contractAddress}`, '_blank')}
                                  className="bg-[#d548ec] hover:bg-[#c030d6] text-white h-9 w-9 p-0"
                                  title="View on Explorer"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                                
                                {/* Dropdown Menu (Three Dots) */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="bg-[#1A1A1A] border border-gray-700 text-white hover:bg-[#2A2A2A] h-9 w-9 p-0"
                                      title="More actions"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-[#1A1A1A] border-gray-700">
                                    <DropdownMenuLabel className="text-white">Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-gray-700" />
                                    
                                    {/* Edit Event */}
                                    <DropdownMenuItem
                                      onClick={() => openEditModal(contract)}
                                      className="text-[#d548ec] hover:bg-[#2A2A2A] cursor-pointer font-semibold"
                                      disabled={contract.eventCancelled}
                                    >
                                      <Settings className="w-4 h-4 mr-2" />
                                      Edit Event Info
                                    </DropdownMenuItem>
                                    
                                    {/* Pause/Resume Event */}
                                    {!contract.eventCancelled && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setActionContract(contract);
                                          setShowPauseModal(true);
                                        }}
                                        className="text-yellow-500 hover:bg-[#2A2A2A] cursor-pointer font-semibold"
                                      >
                                        {contract.eventPaused ? (
                                          <>
                                            <Play className="w-4 h-4 mr-2" />
                                            Resume Event
                                          </>
                                        ) : (
                                          <>
                                            <Pause className="w-4 h-4 mr-2" />
                                            Pause Event
                                          </>
                                        )}
                                      </DropdownMenuItem>
                                    )}
                                    
                                    {/* Cancel Event */}
                                    {!contract.eventCancelled && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setActionContract(contract);
                                          setShowCancelModal(true);
                                        }}
                                        className="text-red-500 hover:bg-[#2A2A2A] cursor-pointer font-semibold"
                                      >
                                        <AlertCircle className="w-4 h-4 mr-2" />
                                        Cancel Event
                                      </DropdownMenuItem>
                                    )}
                                    
                                    <DropdownMenuSeparator className="bg-gray-700" />
                                    
                                    {/* Check-In QR */}
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setQrContract(contract);
                                        setShowQRModal(true);
                                      }}
                                      className="text-green-500 hover:bg-[#2A2A2A] cursor-pointer font-semibold"
                                    >
                                      <QrCode className="w-4 h-4 mr-2" />
                                      Check-In QR Code
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuSeparator className="bg-gray-700" />
                                    
                                    {/* View Details */}
                                    <DropdownMenuItem
                                      onClick={() => setSelectedContract(contract)}
                                      className="text-white hover:bg-[#2A2A2A] cursor-pointer"
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    
                                    {/* View on Explorer */}
                                    <DropdownMenuItem
                                      onClick={() => window.open(`https://testnet.explorer.push.org/address/${contract.contractAddress}`, '_blank')}
                                      className="text-blue-400 hover:bg-[#2A2A2A] cursor-pointer"
                                    >
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      View on Explorer
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuSeparator className="bg-gray-700" />
                                    
                                    {/* Copy Address */}
                                    <DropdownMenuItem
                                      onClick={() => copyToClipboard(contract.contractAddress)}
                                      className="text-gray-400 hover:bg-[#2A2A2A] cursor-pointer"
                                    >
                                      <Copy className="w-4 h-4 mr-2" />
                                      Copy Address
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
      </div>

      {/* Contract Details Modal */}
      {selectedContract && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white">{selectedContract.eventName}</CardTitle>
                  <CardDescription>Contract Details</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedContract(null)}
                  className="bg-[#1A1A1A] border-gray-700 text-white hover:bg-red-500/20 hover:border-red-500"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0A0A0A] p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-gray-400">Total Supply</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{selectedContract.totalSupply?.toLocaleString() || 'N/A'}</div>
                </div>
                <div className="bg-[#0A0A0A] p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-400">Ticket Price</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {selectedContract.ticketPriceFormatted}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Fixed price in PUSH
                  </div>
                </div>
                <div className="bg-[#0A0A0A] p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-[#d548ec]" />
                    <span className="text-sm text-gray-400">Sold</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{selectedContract.ticketsSold.toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {((selectedContract.ticketsSold / selectedContract.totalSupply) * 100).toFixed(1)}% sold
                  </div>
                </div>
                <div className="bg-[#0A0A0A] p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-gray-400">Revenue</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {selectedContract.revenueFormatted}
                  </div>
                </div>
              </div>

              {/* Additional Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0A0A0A] p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-400">Remaining Tickets</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {selectedContract.ticketsRemaining.toLocaleString()}
                  </div>
                </div>
                <div className="bg-[#0A0A0A] p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-gray-400">Total Transactions</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{selectedContract.totalTransactions}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    From blockchain
                  </div>
                </div>
                <div className="bg-[#0A0A0A] p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-pink-400" />
                    <span className="text-sm text-gray-400">Unique Holders</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{selectedContract.uniqueHolders}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Wallet addresses
                  </div>
                </div>
                <div className="bg-[#0A0A0A] p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-orange-400" />
                    <span className="text-sm text-gray-400">Sales Progress</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {((selectedContract.ticketsSold / selectedContract.totalSupply) * 100).toFixed(1)}%
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${(selectedContract.ticketsSold / selectedContract.totalSupply) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#0A0A0A] p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-3">Contract Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Address:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white">{formatAddress(selectedContract.contractAddress)}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(selectedContract.contractAddress)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contract Name:</span>
                    <span className="text-white font-mono">{selectedContract.contractName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">TX ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white">
                        {selectedContract.txId ? `${selectedContract.txId.slice(0, 8)}...${selectedContract.txId.slice(-8)}` : 'N/A'}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => selectedContract.txId && window.open(`https://explorer.hiro.so/txid/${selectedContract.txId}?chain=testnet`, '_blank')}
                        className="h-6 w-6 p-0"
                        disabled={!selectedContract.txId}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Deployed:</span>
                    <span className="text-white">{new Date(selectedContract.deployedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Event Date:</span>
                    <span className="text-white">{new Date(selectedContract.eventDate).toLocaleDateString()}</span>
                  </div>
                  {selectedContract.metadataUri && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Metadata:</span>
                      <Button
                        size="sm"
                        variant="link"
                        onClick={() => window.open(selectedContract.metadataUri, '_blank')}
                        className="h-auto p-0 text-[#d548ec] hover:underline"
                      >
                        View on IPFS
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Contract Actions */}
              <div className="bg-[#0A0A0A] p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Smart Contract Actions
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => window.open(`https://testnet.explorer.push.org/address/${selectedContract.contractAddress}`, '_blank')}
                    className="bg-[#1A1A1A] border-gray-700 text-white hover:bg-[#2A2A2A]"
                  >
                    <FileCode className="w-4 h-4 mr-2" />
                    View Source
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      copyToClipboard(selectedContract.contractAddress);
                    }}
                    className="bg-[#1A1A1A] border-gray-700 text-white hover:bg-[#2A2A2A]"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Address
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => refetch()}
                    className="bg-[#1A1A1A] border-gray-700 text-blue-400 hover:bg-[#2A2A2A]"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Data
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQrContract(selectedContract);
                      setShowQRModal(true);
                    }}
                    className="bg-[#1A1A1A] border-gray-700 text-purple-400 hover:bg-[#2A2A2A]"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    QR Check-In
                  </Button>
                </div>
              </div>

              {/* Checked-In Tickets - Real-time */}
              <CheckedInTickets 
                contractAddress={selectedContract.contractAddress}
                contractName={selectedContract.contractName}
                autoRefresh={true}
                refreshInterval={10000}
              />

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => setSelectedContract(null)}
                  className="bg-[#1A1A1A] border-gray-700 text-white hover:bg-[#2A2A2A]"
                >
                  Close
                </Button>
                <Button
                  onClick={() => window.open(`https://testnet.explorer.push.org/address/${selectedContract.contractAddress}`, '_blank')}
                  className="bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] hover:from-[#c030d6] hover:to-[#d183f0] text-white"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Explorer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* QR Code Check-In Modal */}
      {showQRModal && qrContract && (() => {
        // Format: checkin:contractAddress.contractName
        const qrData = `checkin:${qrContract.contractAddress}.${qrContract.contractName}`;

        const handleDownloadQR = () => {
          const canvas = document.getElementById('checkin-qr-canvas') as HTMLCanvasElement;
          if (canvas) {
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `checkin-${qrContract.contractName}.png`;
            link.href = url;
            link.click();
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-[#1A1A1A] border-2 border-[#d548ec] rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] p-6 relative">
                <button
                  onClick={() => {
                    setShowQRModal(false);
                    setQrContract(null);
                  }}
                  className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <QrCode className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">Event Check-In</h2>
                    <p className="text-white/90">Scan QR to enter event</p>
                  </div>
                </div>
              </div>

              {/* QR Code Content */}
              <div className="p-8">
                {/* Event Info */}
                <div className="mb-6 p-4 bg-[#0A0A0A] rounded-xl border border-gray-800">
                  <h3 className="text-lg font-bold text-white mb-2">
                    {qrContract.eventName}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Total Supply</p>
                      <p className="text-white font-semibold">{qrContract.totalSupply} tickets</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Minted</p>
                      <p className="text-green-400 font-semibold">{qrContract.ticketsSold} tickets</p>
                    </div>
                  </div>
                </div>

                {/* QR Code Display */}
                <div className="bg-white rounded-2xl p-8 mb-6 flex justify-center">
                  {qrData ? (
                    <QRCodeCanvas
                      id="checkin-qr-canvas"
                      value={qrData}
                      size={320}
                      level="H"
                      includeMargin={true}
                    />
                  ) : (
                    <div className="text-center text-gray-500 py-16">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                      <p>Invalid contract data</p>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">1</div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">Display this QR at entrance</p>
                      <p className="text-gray-400 text-xs">Show on screen or print</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">2</div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">Attendees scan with their app</p>
                      <p className="text-gray-400 text-xs">Go to Check-In menu → Scan QR</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">3</div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">Auto check-in on blockchain</p>
                      <p className="text-gray-400 text-xs">Ticket marked as used</p>
                    </div>
                  </div>
                </div>

                {/* Contract Info */}
                <div className="p-3 bg-[#0A0A0A] rounded-lg mb-6">
                  <p className="text-gray-500 text-xs mb-1">Contract Address</p>
                  <p className="text-gray-400 text-xs font-mono break-all">{qrContract.contractAddress}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleDownloadQR}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] hover:from-[#c030d6] hover:to-[#d183f0] text-white font-semibold rounded-xl transition-all"
                  >
                    <Download className="w-5 h-5" />
                    Download QR Code
                  </button>
                  <button
                    onClick={() => {
                      setShowQRModal(false);
                      setQrContract(null);
                    }}
                    className="px-6 py-3 bg-[#0A0A0A] border border-gray-800 text-white rounded-xl hover:border-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit Event Modal */}
      {showEditModal && editContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-[#1A1A1A] border-2 border-[#d548ec] rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] p-6 relative">
              <button
                onClick={() => setShowEditModal(false)}
                className="absolute top-6 right-6 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <h3 className="text-2xl font-bold text-white pr-12">Edit Event Information</h3>
              <p className="text-white/80 text-sm mt-1">Update event name, description, and banner</p>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              {/* Event Name */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Event Name
                </label>
                <input
                  type="text"
                  value={editForm.eventName}
                  onChange={(e) => setEditForm({ ...editForm, eventName: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-xl text-white focus:border-[#d548ec] focus:outline-none"
                  placeholder="Enter event name"
                />
              </div>

              {/* Event Description */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Event Description
                </label>
                <textarea
                  value={editForm.eventDescription}
                  onChange={(e) => setEditForm({ ...editForm, eventDescription: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-xl text-white focus:border-[#d548ec] focus:outline-none min-h-[120px] resize-none"
                  placeholder="Enter event description"
                />
              </div>

              {/* Event Banner/Image */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Event Banner URL
                </label>
                <input
                  type="text"
                  value={editForm.eventImageUri}
                  onChange={(e) => setEditForm({ ...editForm, eventImageUri: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-xl text-white focus:border-[#d548ec] focus:outline-none"
                  placeholder="https://example.com/banner.jpg"
                />
              </div>

              {/* Preview if image URL provided */}
              {editForm.eventImageUri && (
                <div className="mt-4">
                  <p className="text-gray-400 text-sm mb-2">Preview:</p>
                  <img 
                    src={editForm.eventImageUri} 
                    alt="Preview" 
                    className="w-full h-48 object-cover rounded-xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x400?text=Invalid+Image+URL';
                    }}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-6 py-3 bg-[#0A0A0A] border border-gray-800 text-white rounded-xl hover:border-gray-700 transition-colors"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateEvent}
                  disabled={isUpdating}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] hover:from-[#c030d6] hover:to-[#d183f0] text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pause/Resume Modal */}
      {showPauseModal && actionContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-[#1A1A1A] border-2 border-yellow-500 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6">
              <h3 className="text-2xl font-bold text-white">
                {actionContract.eventPaused ? 'Resume Event' : 'Pause Event'}
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-300 mb-6">
                {actionContract.eventPaused 
                  ? 'Resume ticket sales for this event? Attendees will be able to purchase tickets again.'
                  : 'Pause ticket sales for this event? This will temporarily stop attendees from purchasing tickets. You can resume sales later.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPauseModal(false)}
                  className="flex-1 px-6 py-3 bg-[#0A0A0A] border border-gray-800 text-white rounded-xl hover:border-gray-700 transition-colors"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={actionContract.eventPaused ? handleResumeEvent : handlePauseEvent}
                  disabled={isProcessing}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : (actionContract.eventPaused ? 'Resume' : 'Pause')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Event Modal */}
      {showCancelModal && actionContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-[#1A1A1A] border-2 border-red-500 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                Cancel Event
              </h3>
            </div>
            <div className="p-6">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                <p className="text-red-400 text-sm font-medium mb-2">⚠️ Warning: This action cannot be undone!</p>
                <p className="text-gray-400 text-sm">
                  Cancelling this event will:
                </p>
                <ul className="list-disc list-inside text-gray-400 text-sm mt-2 space-y-1">
                  <li>Stop all ticket sales permanently</li>
                  <li>Enable refunds for all ticket holders</li>
                  <li>Notify all attendees</li>
                  <li>Cannot be reversed</li>
                </ul>
              </div>
              <p className="text-gray-300 mb-6">
                Are you sure you want to cancel <span className="text-white font-semibold">{actionContract.eventName}</span>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-6 py-3 bg-[#0A0A0A] border border-gray-800 text-white rounded-xl hover:border-gray-700 transition-colors"
                  disabled={isProcessing}
                >
                  Go Back
                </button>
                <button
                  onClick={handleCancelEvent}
                  disabled={isProcessing}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Cancelling...' : 'Cancel Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractManagement;