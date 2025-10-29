import React, { useState, useEffect } from 'react';
import { Info, Copy, Check, ExternalLink } from 'lucide-react';
import { usePushChainClient } from '@pushchain/ui-kit';
import { toast } from 'sonner';

interface UEAAddressInfoProps {
  originalAddress: string;
  className?: string;
}

/**
 * Component to display UEA (Universal Executor Account) address information
 * Explains to users why their blockchain address differs from their wallet address
 */
const UEAAddressInfo: React.FC<UEAAddressInfoProps> = ({ originalAddress, className = '' }) => {
  const [ueaAddress, setUeaAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedUEA, setCopiedUEA] = useState(false);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const { pushChainClient } = usePushChainClient();

  useEffect(() => {
    const fetchUEA = async () => {
      if (!pushChainClient) {
        setIsLoading(false);
        return;
      }

      try {
        const uea = await pushChainClient.getAddress();
        setUeaAddress(uea);
      } catch (error) {
        console.error('Error fetching UEA:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUEA();
  }, [pushChainClient]);

  const copyToClipboard = (text: string, type: 'uea' | 'original') => {
    navigator.clipboard.writeText(text);
    if (type === 'uea') {
      setCopiedUEA(true);
      setTimeout(() => setCopiedUEA(false), 2000);
    } else {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    }
    toast.success('Address copied to clipboard');
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
  };

  if (isLoading || !ueaAddress) {
    return null;
  }

  // Only show if addresses are different
  if (ueaAddress.toLowerCase() === originalAddress.toLowerCase()) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <Info className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
            Universal Wallet Address
          </h3>
          <p className="text-gray-400 text-sm mb-4 leading-relaxed">
            Push Chain Universal Wallet uses a <strong className="text-blue-400">UEA (Universal Executor Account)</strong> address
            for cross-chain transactions. Your profile is registered with the UEA address, not your wallet address.
          </p>

          <div className="space-y-3">
            {/* UEA Address - Blockchain Address */}
            <div className="bg-black/30 rounded-lg p-3 border border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 uppercase tracking-wider">On-Chain Address (UEA)</span>
                <a
                  href={`https://testnet.explorer.push.org/address/${ueaAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="flex items-center justify-between">
                <code className="text-white font-mono text-sm">{formatAddress(ueaAddress)}</code>
                <button
                  onClick={() => copyToClipboard(ueaAddress, 'uea')}
                  className="ml-2 p-1.5 hover:bg-white/10 rounded-md transition-colors"
                  title="Copy UEA address"
                >
                  {copiedUEA ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Original Wallet Address */}
            <div className="bg-black/20 rounded-lg p-3 border border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Your Wallet Address</span>
              </div>
              <div className="flex items-center justify-between">
                <code className="text-gray-400 font-mono text-sm">{formatAddress(originalAddress)}</code>
                <button
                  onClick={() => copyToClipboard(originalAddress, 'original')}
                  className="ml-2 p-1.5 hover:bg-white/10 rounded-md transition-colors"
                  title="Copy wallet address"
                >
                  {copiedOriginal ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-xs text-gray-500 leading-relaxed">
              💡 <strong className="text-gray-400">Why is this important?</strong> When viewing your profile or creating events,
              use the <strong className="text-blue-400">UEA address</strong> to see your on-chain data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UEAAddressInfo;
