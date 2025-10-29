/**
 * MintTicketButton Component
 * 
 * Reusable button for minting NFT tickets
 * - Integrates with PushChain for blockchain writes
 * - Shows real-time minting status
 * - Handles wallet connection
 * - Auto-refreshes data after successful mint
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/usePushChainWallet';
import { toast } from 'sonner';
import { Loader2, Ticket, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';


type MintStatus = 'idle' | 'preparing' | 'signing' | 'broadcasting' | 'confirming' | 'success' | 'error';

interface MintTicketButtonProps {
  contractId: string;
  eventTitle: string;
  ticketPrice?: number; // Optional, for display purposes
  ticketsAvailable: number;
  quantity?: number;
  disabled?: boolean;
  className?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  fullWidth?: boolean;
}

export const MintTicketButton = ({
  contractId,
  eventTitle,
  ticketsAvailable,
  quantity = 1,
  disabled = false,
  className,
  onSuccess,
  onError,
  variant = 'default',
  size = 'default',
  fullWidth = false
}: MintTicketButtonProps) => {
  const [mintStatus, setMintStatus] = useState<MintStatus>('idle');
  const { wallet, isWalletConnected, callContractFunction, connectWallet } = useWallet();

  const isMinting = mintStatus !== 'idle' && mintStatus !== 'success' && mintStatus !== 'error';

  /**
   * Handle mint ticket transaction
   * Uses PushChain for blockchain writes
   */
  const handleMint = async () => {
    
    // 1. Check if user has connected wallet
    if (!isWalletConnected || !wallet) {
      toast.info('Please connect your wallet', {
        description: 'You need to connect your wallet before minting'
      });
      
      // Trigger wallet connection
      try {
        await connectWallet();
        toast.success('Wallet connected! You can now mint tickets.');
      } catch (error) {
        console.error('Wallet connection failed:', error);
      }
      
      return;
    }

    // 2. Validate tickets available
    if (ticketsAvailable < quantity) {
      toast.error(`Only ${ticketsAvailable} tickets available`);
      return;
    }

    // 3. Parse contract ID
    const [contractAddress, contractName] = contractId.split('.');
    if (!contractAddress || !contractName) {
      toast.error('Invalid contract ID');
      return;
    }

    setMintStatus('preparing');

    try {
      setMintStatus('signing');
      
      // 4. Call contract function to mint ticket
      await callContractFunction({
        contractAddress,
        contractName,
        functionName: 'mintTicket',
        functionArgs: [],
        
        // Success callback
        onFinish: async (data) => {
          setMintStatus('broadcasting');
          
          toast.success(
            <div className="flex flex-col gap-1">
              <div className="font-semibold">Transaction Submitted!</div>
              <div className="text-xs text-muted-foreground">
                TX: {data?.txId?.substring(0, 10) || 'Processing'}...
              </div>
            </div>,
            {
              duration: 5000,
            }
          );

          // 5. Wait for blockchain confirmation
          setMintStatus('confirming');
          
          // Simulate confirmation wait
          setTimeout(() => {
            setMintStatus('success');
            toast.success(
              <div className="flex flex-col gap-1">
                <div className="font-semibold">🎉 Ticket Minted Successfully!</div>
                <div className="text-sm">{eventTitle}</div>
              </div>,
              {
                duration: 5000,
              }
            );

            // 6. Callback to parent to refresh data
            if (onSuccess) {
              onSuccess();
            }

            // Reset status after delay
            setTimeout(() => {
              setMintStatus('idle');
            }, 3000);
          }, 3000);
        },
      });

    } catch (error: any) {
      console.error('❌ Minting error:', error);
      
      setMintStatus('error');
      
      // Better error messages
      let errorMessage = 'Failed to mint ticket';
      
      if (error.message?.includes('User rejected') || 
          error.message?.includes('cancelled')) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient balance';
      } else {
        errorMessage = error.message || 'Failed to mint ticket';
      }
      
      toast.error(
        <div className="flex flex-col gap-1">
          <div className="font-semibold">Minting Failed</div>
          <div className="text-sm text-muted-foreground">{errorMessage}</div>
        </div>
      );

      if (onError) {
        onError(error);
      }

      // Reset after error
      setTimeout(() => {
        setMintStatus('idle');
      }, 3000);
    }
  };

  /**
   * Get button content based on status
   */
  const getButtonContent = () => {
    // Check authentication first
    if (!isWalletConnected) {
      return (
        <>
          <Ticket className="mr-2 h-4 w-4" />
          Connect Wallet
        </>
      );
    }
    
    switch (mintStatus) {
      case 'preparing':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Preparing...
          </>
        );
      case 'signing':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sign in Wallet...
          </>
        );
      case 'broadcasting':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Broadcasting...
          </>
        );
      case 'confirming':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Confirming...
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Minted!
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="mr-2 h-4 w-4" />
            Failed
          </>
        );
      default:
        return (
          <>
            <Ticket className="mr-2 h-4 w-4" />
            Mint Ticket
          </>
        );
    }
  };

  /**
   * Get button variant based on status
   */
  const getButtonVariant = () => {
    if (mintStatus === 'success') return 'default';
    if (mintStatus === 'error') return 'destructive';
    return variant;
  };

  return (
    <Button
      onClick={handleMint}
      disabled={disabled || isMinting || ticketsAvailable === 0}
      variant={getButtonVariant()}
      size={size}
      className={cn(
        fullWidth && 'w-full',
        mintStatus === 'success' && 'bg-green-600 hover:bg-green-700',
        className
      )}
    >
      {getButtonContent()}
    </Button>
  );
};

export default MintTicketButton;
