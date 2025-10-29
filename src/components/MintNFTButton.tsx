import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Ticket } from 'lucide-react';
import { usePushChainClient, usePushChain, usePushWalletContext } from '@pushchain/ui-kit';
import { mintEventTicketUniversal } from '@/services/eventBrowseContract';
import { useReadContract } from 'wagmi';
import EventTicketArtifact from '@/contracts/EventTicket.json';
import { sendTicketPurchaseConfirmation } from '@/services/emailAlertService';
import { registerTicketForReminders } from '@/services/eventReminderService';

interface MintNFTButtonProps {
  contractId: string;
  price: number; // NOT USED - we fetch from contract directly
  onSuccess?: () => void;
  disabled?: boolean;
  eventName?: string;
  quantity?: number; // Number of tickets to mint
  eventDate?: string;
  eventTime?: string;
  location?: string;
}

export const MintNFTButton: React.FC<MintNFTButtonProps> = ({
  contractId,
  price: _priceIgnored, // Ignore this prop
  onSuccess,
  disabled = false,
  eventName = 'Event',
  quantity = 1,
  eventDate = '',
  eventTime = '',
  location = ''
}) => {
  const [isMinting, setIsMinting] = useState(false);
  const [mintProgress, setMintProgress] = useState({ current: 0, total: 0 });

  // Get Push Chain client
  const { pushChainClient } = usePushChainClient();
  const { PushChain } = usePushChain();
  const pushWallet = usePushWalletContext();

  // Read EXACT ticket price from contract using wagmi
  const { data: ticketPrice, isLoading: isLoadingPrice } = useReadContract({
    address: contractId as `0x${string}`,
    abi: EventTicketArtifact.abi,
    functionName: 'ticketPrice',
  });

  const handleMint = async () => {
    if (!pushChainClient || !PushChain) {
      toast.error('Wallet Not Connected', {
        description: 'Please connect your wallet using the button at the top right',
      });
      return;
    }

    if (!pushChainClient.universal) {
      toast.error('Universal API Not Available', {
        description: 'Please reconnect your wallet or refresh the page',
      });
      return;
    }

    if (!ticketPrice) {
      toast.error('Could not fetch ticket price from contract');
      return;
    }

    setIsMinting(true);
    setMintProgress({ current: 0, total: quantity });

    try {
      console.log('🎫 Minting tickets for event:', eventName);
      console.log('📍 Contract address:', contractId);
      console.log('💰 Price from contract:', ticketPrice.toString(), 'wei');
      console.log('� Price in PC:', (Number(ticketPrice) / 1e18).toFixed(6), 'PC');
      console.log('�🔢 Quantity:', quantity);

      const mintedTokenIds: number[] = [];
      const transactionHashes: string[] = [];

      // Show progress toast for multiple tickets
      if (quantity > 1) {
        toast.info(`Minting ${quantity} tickets...`, {
          description: 'Please confirm each transaction in your wallet',
          duration: 5000
        });
      } else {
        // Show instruction for single ticket
        toast.info('Approve Transaction', {
          description: 'Please approve the transaction in your wallet popup',
          duration: 4000
        });
      }

      // Mint tickets one by one
      for (let i = 0; i < quantity; i++) {
        setMintProgress({ current: i + 1, total: quantity });
        
        console.log(`🎫 Minting ticket ${i + 1} of ${quantity}...`);
        console.log(`🔐 Waiting for wallet approval for ticket ${i + 1}...`);

        // Call universal mint function
        const result = await mintEventTicketUniversal(
          pushChainClient,
          PushChain,
          contractId,
          ticketPrice as bigint
        );

        console.log(`✅ Ticket ${i + 1} minted:`, result);

        if (result.tokenId > 0) {
          mintedTokenIds.push(result.tokenId);
        }
        if (result.transactionHash) {
          transactionHashes.push(result.transactionHash);
        }

        // Show progress for multiple tickets
        if (quantity > 1 && i < quantity - 1) {
          toast.success(`Ticket ${i + 1} of ${quantity} minted!`, {
            description: `#TKT-${result.tokenId.toString().padStart(4, '0')}`,
            duration: 3000
          });
        }

        // Small delay between mints to avoid overwhelming the network
        if (i < quantity - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log('✅ All tickets minted:', mintedTokenIds);

      // Show final success message
      if (mintedTokenIds.length > 0) {
        const ticketNumbers = mintedTokenIds.map(id => `#TKT-${id.toString().padStart(4, '0')}`).join(', ');
        
        if (quantity === 1) {
          // Single ticket success
          const explorerUrl = transactionHashes[0] 
            ? `https://donut.push.network/tx/${transactionHashes[0]}`
            : null;

          toast.success('Ticket confirmed!', {
            description: `${ticketNumbers} for ${eventName} is now in your wallet`,
            duration: 8000,
            icon: '🎉',
            action: explorerUrl ? {
              label: 'View Transaction',
              onClick: () => window.open(explorerUrl, '_blank')
            } : undefined
          });
        } else {
          // Multiple tickets success
          toast.success(`${quantity} Tickets confirmed!`, {
            description: `All tickets for ${eventName} are now in your wallet`,
            duration: 8000,
            icon: '🎉',
          });
        }
      } else {
        // Fallback success message
        toast.success(`${quantity} Ticket${quantity > 1 ? 's' : ''} minted successfully!`, {
          description: `Your ticket${quantity > 1 ? 's' : ''} for ${eventName} ${quantity > 1 ? 'are' : 'is'} now in your wallet`,
          duration: 5000
        });
      }

      // Send purchase confirmation email
      try {
        // Get user email from localStorage
        const userAddress = pushWallet?.universalAccount?.address;
        console.log('🔍 User address for email:', userAddress);
        
        const userEmail = userAddress 
          ? localStorage.getItem(`user-email-${userAddress}`) || localStorage.getItem('user-email')
          : null;
        
        console.log('📧 User email found:', userEmail ? `${userEmail.substring(0, 3)}***@***` : 'None');

        if (userEmail && userEmail.includes('@')) {
          console.log('✅ Preparing to send purchase confirmation email');
          console.log('📋 Email data:', {
            eventName,
            eventDate: eventDate || 'TBA',
            eventTime: eventTime || 'TBA',
            location: location || 'TBA',
            ticketCount: quantity,
            tokenIds: mintedTokenIds
          });
          
          // Calculate total amount
          const totalPaid = (Number(ticketPrice) / 1e18 * quantity).toFixed(4);
          console.log('💰 Total paid:', totalPaid, 'PUSH');
          
          // Send confirmation email
          console.log('🚀 Calling sendTicketPurchaseConfirmation...');
          const emailResult = await sendTicketPurchaseConfirmation({
            userEmail,
            eventName,
            eventDate: eventDate || 'TBA',
            eventTime: eventTime || 'TBA',
            location: location || 'TBA',
            ticketCount: quantity,
            totalAmount: totalPaid,
            contractAddress: contractId,
            tokenIds: mintedTokenIds,
            transactionHash: transactionHashes[0]
          });

          console.log('📬 Email result:', emailResult);

          if (emailResult.success) {
            console.log('✅ Purchase confirmation email sent successfully!');
            toast.success('📧 Email confirmation sent!', {
              description: `Check your inbox at ${userEmail}`,
              duration: 4000
            });
            
            // Register for event reminders
            if (eventDate && eventTime && eventDate !== 'TBA' && eventTime !== 'TBA') {
              console.log('📅 Registering event reminders...');
              registerTicketForReminders(
                contractId,
                userEmail,
                eventDate,
                eventTime,
                eventName,
                location || 'TBA',
                quantity
              );
              console.log('✅ Event reminders registered successfully!');
            } else {
              console.log('⚠️ Skipping reminder registration (missing event date/time)');
            }
          } else {
            console.error('❌ Failed to send email:', emailResult.message);
            toast.error('Failed to send email confirmation', {
              description: emailResult.message,
              duration: 4000
            });
          }
        } else {
          console.log('ℹ️ No email configured, skipping purchase confirmation');
          console.log('💡 Tip: Set up email in My Tickets or Settings to receive confirmations');
        }
      } catch (emailError) {
        console.error('❌ Error sending purchase confirmation:', emailError);
        // Don't fail the whole process if email fails
      }

      // Call onSuccess callback
      if (onSuccess) {
        setTimeout(onSuccess, 1000);
      }
    } catch (error: any) {
      console.error('❌ Error minting NFT:', error);

      // Handle specific errors
      if (error.message?.includes('rejected') || error.message?.includes('cancelled')) {
        toast.info('Minting cancelled by user');
        return;
      }

      if (error.message?.includes('insufficient')) {
        toast.error('Insufficient balance', {
          description: 'You need more tokens to mint this ticket'
        });
        return;
      }

      if (error.message?.includes('sold out')) {
        toast.error('Event sold out');
        return;
      }

      // Generic error
      toast.error('Failed to mint NFT ticket', {
        description: error.message,
        duration: 8000
      });
    } finally {
      setIsMinting(false);
      setMintProgress({ current: 0, total: 0 });
    }
  };

  // Display price in PC (convert from wei)
  const priceInPC = ticketPrice ? Number(ticketPrice) / 1e18 : 0;
  const totalPrice = priceInPC * quantity;

  return (
    <Button
      onClick={handleMint}
      disabled={disabled || isMinting || isLoadingPrice || !ticketPrice}
      size="lg"
      className="w-full bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] hover:from-[#c030d6] hover:to-[#d183f0] text-white font-semibold shadow-lg hover:shadow-xl transition-all"
    >
      {isLoadingPrice ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Loading Price...
        </>
      ) : isMinting ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          {mintProgress.total > 1 
            ? `Minting ${mintProgress.current}/${mintProgress.total}...`
            : 'Minting Ticket...'
          }
        </>
      ) : (
        <>
          <Ticket className="w-5 h-5 mr-2" />
          {quantity > 1 
            ? `Mint ${quantity} Tickets - ${totalPrice.toFixed(4)} PC`
            : `Mint Ticket - ${totalPrice.toFixed(4)} PC`
          }
        </>
      )}
    </Button>
  );
};

export default MintNFTButton;
