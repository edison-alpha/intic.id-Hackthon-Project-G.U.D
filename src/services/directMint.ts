/**
 * Direct Mint Service
 * Mint tickets DIRECTLY to Push Chain (no Universal Transaction)
 * User must be connected to Push Chain Testnet
 */

import { ethers } from 'ethers';
import { toast } from 'sonner';
import EventTicketArtifact from '@/contracts/EventTicket.json';

/**
 * Mint a ticket directly on Push Chain
 * @param signer Ethers signer (must be connected to Push Chain)
 * @param contractAddress EventTicket contract address
 * @param ticketPrice Ticket price in PC (will be converted to wei)
 * @returns Transaction hash and token ID
 */
export const mintTicketDirect = async (
  signer: ethers.Signer,
  contractAddress: string,
  ticketPrice: string // In PC (e.g., "0.1")
): Promise<{ transactionHash: string; tokenId: number }> => {
  if (!signer) {
    throw new Error('Signer not provided. Please connect your wallet to Push Chain.');
  }

  try {
    console.log('🎫 Minting ticket DIRECTLY on Push Chain...');
    console.log('📍 Contract:', contractAddress);
    console.log('💰 Price:', ticketPrice, 'PC');

    // Check network
    const provider = signer.provider;
    if (!provider) {
      throw new Error('Provider not available');
    }

    const network = await provider.getNetwork();
    console.log('🌐 Network:', network);
    console.log('🌐 Chain ID:', network.chainId);

    // Validate we're on Push Chain Testnet
    if (network.chainId !== BigInt(42101)) {
      throw new Error(
        `Wrong network! Please switch to Push Chain Testnet (Chain ID: 42101). Current: ${network.chainId}`
      );
    }

    // Convert ticket price to wei
    const ticketPriceWei = ethers.parseEther(ticketPrice);
    console.log('💰 Price in wei:', ticketPriceWei.toString());

    // Create contract instance
    const contract = new ethers.Contract(
      contractAddress,
      EventTicketArtifact.abi,
      signer
    );

    // Get ticket price from contract to verify
    try {
      const contractPrice = await contract.ticketPrice();
      console.log('📋 Contract price:', contractPrice.toString(), 'wei');

      if (contractPrice !== ticketPriceWei) {
        console.warn('⚠️ Price mismatch! Using contract price:', contractPrice.toString());
      }
    } catch (error) {
      console.warn('⚠️ Could not verify contract price:', error);
    }

    // Estimate gas
    console.log('⛽ Estimating gas for mint...');
    let gasEstimate: bigint;
    try {
      gasEstimate = await contract.mintTicket.estimateGas({ value: ticketPriceWei });
      console.log('✅ Gas estimate:', gasEstimate.toString());
    } catch (gasError: any) {
      console.warn('⚠️ Gas estimation failed:', gasError.message);
      gasEstimate = BigInt(300000); // Fallback to 300k gas
      console.log('⚠️ Using fallback gas limit:', gasEstimate.toString());
    }

    // Mint ticket
    console.log('🚀 Calling mintTicket()...');
    const tx = await contract.mintTicket({
      value: ticketPriceWei,
      gasLimit: gasEstimate,
    });

    console.log('✅ Transaction sent:', tx.hash);

    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    const receipt = await tx.wait();

    console.log('✅ Transaction confirmed:', receipt);
    console.log('📦 Block:', receipt.blockNumber);
    console.log('⛽ Gas used:', receipt.gasUsed?.toString());

    // Extract tokenId from Transfer event
    let tokenId = 0;
    try {
      const iface = new ethers.Interface(EventTicketArtifact.abi);
      
      // Find Transfer event in logs
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({
            topics: [...log.topics],
            data: log.data,
          });

          if (parsed?.name === 'Transfer') {
            tokenId = Number(parsed.args.tokenId);
            console.log('✅ Token ID:', tokenId);
            break;
          }
        } catch {
          // Skip logs that don't match
          continue;
        }
      }

      if (tokenId === 0) {
        console.warn('⚠️ Could not extract tokenId from logs');
      }
    } catch (error) {
      console.warn('⚠️ Error parsing logs:', error);
    }

    // Show success toast
    toast.success('Ticket Minted Successfully! 🎉', {
      description: `Token ID: ${tokenId}`,
      duration: 5000,
    });

    return {
      transactionHash: tx.hash,
      tokenId,
    };
  } catch (error: any) {
    console.error('❌ Mint error:', error);

    // Handle specific errors
    if (error.message?.includes('wrong network') || error.message?.includes('Chain ID')) {
      toast.error('Wrong Network', {
        description: 'Please switch to Push Chain Testnet (Chain ID: 42101)',
      });
      throw new Error('Wrong network. Please switch to Push Chain Testnet.');
    }

    if (error.message?.includes('rejected') || error.message?.includes('denied') || error.message?.includes('cancel')) {
      toast.error('Transaction Cancelled', {
        description: 'You rejected the transaction',
      });
      throw new Error('Transaction rejected by user');
    }

    if (error.message?.includes('insufficient funds') || error.message?.includes('insufficient balance')) {
      toast.error('Insufficient Balance', {
        description: 'You don\'t have enough PC to mint this ticket',
      });
      throw new Error('Insufficient PC balance');
    }

    if (error.message?.includes('sold out') || error.message?.includes('NoTicketsAvailable')) {
      toast.error('Sold Out', {
        description: 'All tickets have been minted',
      });
      throw new Error('Event tickets are sold out');
    }

    // Generic error
    toast.error('Mint Failed', {
      description: error.message || 'An unknown error occurred',
    });
    throw error;
  }
};
