import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Wallet, Key, Loader2, AlertCircle } from 'lucide-react';
import { useWallet } from '@/hooks/usePushChainWallet';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletConnectModal: React.FC<WalletConnectModalProps> = ({ isOpen, onClose }) => {
  const { connectWallet, isWalletConnected } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setError(null);
    setDebugInfo(null);
    setIsConnecting(true);

    // Collect debug info
    if (import.meta.env.DEV) {
      const providers = {
        XverseProviders: !!(window as any).XverseProviders,
        StacksProvider: !!(window as any).XverseProviders?.StacksProvider,
        LeatherProvider: !!(window as any).LeatherProvider,
        HiroWalletProvider: !!(window as any).HiroWalletProvider,
        btc: !!(window as any).btc,
      };
      setDebugInfo(`Available: ${Object.entries(providers).filter(([, v]) => v).map(([name]) => name).join(', ') || 'None'}`);
    }

    try {
      await connectWallet();
      onClose();
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      setError(error.message || 'Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">Connect Your Wallet</DialogTitle>
          <DialogDescription className="text-center">
            Connect your Stacks wallet to access Stacks features securely.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {debugInfo && import.meta.env.DEV && (
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-400">
              {debugInfo}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          <Button
            onClick={handleConnect}
            disabled={isWalletConnected || isConnecting}
            className="w-full flex items-center gap-3 h-12 bg-[#d548ec] hover:bg-[#c030d6] text-white disabled:opacity-50"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <div className="text-left">
                  <div className="font-semibold">Connecting...</div>
                  <div className="text-xs opacity-90">Please check your wallet</div>
                </div>
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-semibold">
                    {isWalletConnected ? 'Wallet Connected' : 'Connect Stacks Wallet'}
                  </div>
                  <div className="text-xs opacity-90">
                    {isWalletConnected ? 'Your wallet is ready to use' : 'Secure wallet for Stacks'}
                  </div>
                </div>
              </>
            )}
          </Button>
        </div>

        <div className="mt-6 p-4 bg-gray-900 rounded-lg space-y-2">
          <p className="text-xs text-gray-400 text-center">
            By connecting, you agree to use Stacks wallet infrastructure.
            Your keys are non-custodial and encrypted.
          </p>
          <p className="text-xs text-gray-500 text-center">
            Supports: Xverse (Mobile & Desktop), Hiro Wallet, Leather
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};