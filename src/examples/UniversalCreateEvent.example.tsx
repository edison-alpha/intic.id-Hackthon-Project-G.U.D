/**
 * Example: Create Event with Universal Chain Support
 *
 * This example shows how to implement event creation where users can
 * deploy contracts and pay gas fees from ANY supported blockchain
 * (Ethereum, Polygon, Solana, BNB Chain, etc.)
 */

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Rocket, Loader2, Check } from 'lucide-react';

// NOTE: After installing @pushchain/ui-kit, uncomment:
/*
import { usePushChainClient, usePushChain, usePushWalletContext } from '@pushchain/ui-kit';
import { createEventUniversal } from '@/services/universalEventContract';
import { SUPPORTED_CHAINS, getChainById } from '@/types/chains';
*/

/**
 * UniversalCreateEvent Component
 * Allows users to create events from any blockchain
 */
const UniversalCreateEvent = () => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStep, setDeploymentStep] = useState('');
  const [selectedChain, setSelectedChain] = useState('eip155:50311'); // Default: Push Chain

  // Uncomment after installing @pushchain/ui-kit:
  /*
  const { pushChainClient } = usePushChainClient();
  const { PushChain } = usePushChain();
  const { connectionStatus, address, chainId } = usePushWalletContext();
  */

  // Temporary mock data
  const connectionStatus = 'disconnected';
  const address = null;
  const chainId = null;

  const [formData, setFormData] = useState({
    eventName: 'Summer Music Festival',
    eventDate: '2025-07-15',
    eventTime: '18:00',
    venue: 'Central Park',
    venueAddress: 'New York, NY',
    description: 'Join us for an amazing summer music festival!',
    ticketPrice: '0.1', // In PC tokens
    totalSupply: 100,
  });

  const handleCreateEvent = async () => {
    // Check wallet connection
    if (connectionStatus !== 'connected' || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsDeploying(true);

    try {
      // NOTE: Uncomment after installing @pushchain/ui-kit
      /*
      // Convert date/time to Unix timestamp
      const eventDateTime = new Date(`${formData.eventDate}T${formData.eventTime}`).getTime();

      // Call universal contract function
      const result = await createEventUniversal(
        pushChainClient,
        PushChain,
        {
          eventName: formData.eventName,
          eventDate: eventDateTime,
          venue: formData.venue,
          venueAddress: formData.venueAddress,
          venueCoordinates: '40.785091,-73.968285', // Example coords
          description: formData.description,
          totalSupply: formData.totalSupply,
          ticketPrice: formData.ticketPrice,
          baseUri: 'ipfs://QmExample...', // From IPFS upload
          eventImageUri: 'ipfs://QmImage...', // From IPFS upload
          eventOrganizerAddress: '0x...', // EventOrganizer contract
        },
        (step) => {
          setDeploymentStep(step);
          console.log('Deployment step:', step);
        }
      );

      // Success!
      const chain = getChainById(chainId || selectedChain);
      toast.success(
        `Event created successfully! Paid from ${chain?.name || 'Unknown Chain'}`
      );

      console.log('Transaction Hash:', result.transactionHash);
      console.log('Contract Address:', result.contractAddress);
      */

      // Temporary mock success (remove after implementing)
      setDeploymentStep('Waiting for wallet approval...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      setDeploymentStep('Transaction submitted...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      setDeploymentStep('Confirming on blockchain...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success('Event created successfully! (Mock)');
      toast.info('Install @pushchain/ui-kit to enable real transactions');
    } catch (error: any) {
      console.error('Failed to create event:', error);

      // User-friendly error messages
      if (error.message.includes('rejected')) {
        toast.error('Transaction cancelled by user');
      } else if (error.message.includes('insufficient')) {
        toast.error('Insufficient balance to pay gas fees');
      } else {
        toast.error(error.message || 'Failed to create event');
      }
    } finally {
      setIsDeploying(false);
      setDeploymentStep('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-[#1A1A1A] rounded-2xl p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Create Event (Universal Chain)
          </h2>
          <p className="text-gray-400 text-sm">
            Deploy your event contract from any blockchain. Gas fees can be paid
            with ETH, MATIC, SOL, BNB, or any supported token.
          </p>
        </div>

        {/* Connection Status */}
        {connectionStatus !== 'connected' ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-yellow-400 text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              Wallet not connected. Connect to continue.
            </p>
          </div>
        ) : (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="text-green-400 text-sm flex items-center gap-2">
                <Check className="w-4 h-4" />
                Wallet Connected
              </p>
              <p className="text-gray-400 text-xs font-mono">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
          </div>
        )}

        {/* Chain Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Pay Gas With
          </label>
          <select
            value={selectedChain}
            onChange={(e) => setSelectedChain(e.target.value)}
            disabled={connectionStatus !== 'connected'}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#d548ec] disabled:opacity-50"
          >
            <optgroup label="Push Chain">
              <option value="eip155:50311">Push Chain Testnet (PC)</option>
            </optgroup>
            <optgroup label="Ethereum">
              <option value="eip155:1">Ethereum Mainnet (ETH)</option>
              <option value="eip155:11155111">Ethereum Sepolia (ETH)</option>
            </optgroup>
            <optgroup label="Polygon">
              <option value="eip155:137">Polygon (MATIC)</option>
              <option value="eip155:80001">Polygon Mumbai (MATIC)</option>
            </optgroup>
            <optgroup label="Solana">
              <option value="solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp">
                Solana Mainnet (SOL)
              </option>
              <option value="solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z">
                Solana Devnet (SOL)
              </option>
            </optgroup>
            <optgroup label="Other EVM">
              <option value="eip155:56">BNB Smart Chain (BNB)</option>
              <option value="eip155:42161">Arbitrum One (ETH)</option>
              <option value="eip155:10">Optimism (ETH)</option>
              <option value="eip155:8453">Base (ETH)</option>
              <option value="eip155:43114">Avalanche (AVAX)</option>
            </optgroup>
          </select>
          <p className="text-xs text-gray-500 mt-2">
            Choose which blockchain to pay gas fees from. The event will be deployed
            on Push Chain regardless of your selection.
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Event Name
            </label>
            <input
              type="text"
              value={formData.eventName}
              onChange={(e) =>
                setFormData({ ...formData, eventName: e.target.value })
              }
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#d548ec]"
              placeholder="Summer Music Festival"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Event Date
              </label>
              <input
                type="date"
                value={formData.eventDate}
                onChange={(e) =>
                  setFormData({ ...formData, eventDate: e.target.value })
                }
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#d548ec]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Event Time
              </label>
              <input
                type="time"
                value={formData.eventTime}
                onChange={(e) =>
                  setFormData({ ...formData, eventTime: e.target.value })
                }
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#d548ec]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ticket Price (PC)
            </label>
            <input
              type="number"
              value={formData.ticketPrice}
              onChange={(e) =>
                setFormData({ ...formData, ticketPrice: e.target.value })
              }
              step="0.001"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#d548ec]"
              placeholder="0.1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Price in PC tokens. Buyers can pay with any supported currency.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Total Supply
            </label>
            <input
              type="number"
              value={formData.totalSupply}
              onChange={(e) =>
                setFormData({ ...formData, totalSupply: parseInt(e.target.value) })
              }
              min="1"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#d548ec]"
              placeholder="100"
            />
          </div>
        </div>

        {/* Deployment Progress */}
        {deploymentStep && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <p className="text-blue-400 text-sm">{deploymentStep}</p>
            </div>
          </div>
        )}

        {/* Deploy Button */}
        <button
          onClick={handleCreateEvent}
          disabled={isDeploying || connectionStatus !== 'connected'}
          className="w-full py-4 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] text-white rounded-lg font-semibold hover:from-[#d548ec]/90 hover:to-[#e7a4fd]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isDeploying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Deploying...
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5" />
              Deploy Event
            </>
          )}
        </button>

        {/* Info */}
        <div className="bg-[#d548ec]/10 border border-[#d548ec]/20 rounded-lg p-4">
          <p className="text-sm text-gray-400">
            <strong className="text-white">How it works:</strong> Your event will be
            deployed on Push Chain. You can pay gas fees from any supported blockchain
            - the system will automatically handle the cross-chain transaction and
            conversion.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UniversalCreateEvent;
