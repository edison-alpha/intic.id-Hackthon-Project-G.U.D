/**
 * Universal Check-In Service
 * Allows users to check-in from ANY blockchain using Push Chain Universal Transactions
 */

import EventTicketArtifact from '@/contracts/EventTicket.json';

/**
 * Check-in ticket using Push Chain Universal Transaction
 * Works from ANY supported blockchain (Sepolia, Arbitrum, Optimism, Solana, etc.)
 *
 * Uses Push Chain's account abstraction to maintain msg.sender identity
 * across different chains.
 */
export const checkInTicketUniversal = async (
  pushChainClient: any,
  PushChain: any,
  contractAddress: string,
  tokenId: number
): Promise<{ transactionHash: string; success: boolean }> => {
  if (!pushChainClient || !PushChain) {
    throw new Error('Push Chain client not initialized. Please connect wallet.');
  }

  try {
    console.log('🎫 ============ UNIVERSAL CHECK-IN START ============');
    console.log('📍 Contract:', contractAddress);
    console.log('🎫 Token ID:', tokenId, 'Type:', typeof tokenId);

    // Ensure tokenId is a number (not string)
    const tokenIdNumber = Number(tokenId);
    if (isNaN(tokenIdNumber)) {
      throw new Error(`Invalid token ID: ${tokenId}`);
    }

    // Encode useTicket function call
    const data = PushChain.utils.helpers.encodeTxData({
      abi: Array.from(EventTicketArtifact.abi),
      functionName: 'useTicket',
      args: [tokenIdNumber],
    });

    console.log('📝 Encoded function call: useTicket(' + tokenIdNumber + ')');
    console.log('📝 Data:', data);

    // Send universal transaction with user's identity preserved
    // Push Chain will handle the cross-chain transaction while maintaining
    // the caller's address as msg.sender on Push Chain
    console.log('🌐 Sending universal transaction...');
    console.log('💡 You can approve this from ANY chain (Sepolia, Arbitrum, Optimism, Solana)!');

    const tx = await pushChainClient.universal.sendTransaction({
      to: contractAddress,
      data: data,
      value: 0n, // No payment needed for check-in
    });

    console.log('✅ Transaction sent!');
    console.log('📦 TX:', tx);
    console.log('⏳ Waiting for confirmation...');

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    console.log('✅ Transaction confirmed!');
    console.log('📦 Receipt:', receipt);

    // Extract transaction hash from receipt
    const txHash = receipt?.hash || receipt?.transactionHash || tx?.hash || tx?.transactionHash;

    console.log('🔍 Transaction hash:', txHash);
    console.log('🎫 ============ UNIVERSAL CHECK-IN SUCCESS ============');

    return {
      transactionHash: txHash,
      success: true,
    };
  } catch (error: any) {
    console.error('❌ ============ UNIVERSAL CHECK-IN FAILED ============');
    console.error('❌ Error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error data:', error.data);

    // Handle user rejection
    if (error.message?.includes('rejected') || error.message?.includes('denied') || error.message?.includes('cancel')) {
      throw new Error('Transaction rejected by user');
    }

    // Handle ticket already used
    if (error.message?.includes('already used') || error.message?.includes('TicketAlreadyUsed')) {
      throw new Error('This ticket has already been used');
    }

    // Handle not owner
    if (error.message?.includes('not owner') || error.message?.includes('NotTicketOwner') || error.message?.includes('not the owner')) {
      throw new Error('You are not the owner of this ticket');
    }

    // Handle event cancelled
    if (error.message?.includes('event cancelled') || error.message?.includes('EventCancelled')) {
      throw new Error('Event has been cancelled');
    }

    // Handle insufficient balance
    if (error.message?.includes('insufficient funds') || error.message?.includes('insufficient balance')) {
      throw new Error('Insufficient balance for transaction');
    }

    // Handle contract execution failures
    if (error.message?.includes('execution reverted') || error.message?.includes('contract call failed')) {
      throw new Error('Contract call failed. Please ensure you own this ticket and it has not been used.');
    }

    // Generic error with details
    const errorMsg = error.message || error.reason || 'Failed to check-in ticket';
    throw new Error(errorMsg);
  }
};

export default checkInTicketUniversal;
