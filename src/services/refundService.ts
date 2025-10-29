/**
 * Event Refund Service
 * Handles event cancellations and refund claims
 */

import { ethers } from 'ethers';
import {
  EVENT_REFUND_ABI,
  REFUND_CONTRACT,
  RefundStatus,
  CancellationReason,
  type EventCancellation,
  type RefundClaim,
  type RefundStats
} from '@/types/marketplace';

const NETWORK = 'testnet'; // Change to 'mainnet' for production

/**
 * Get refund contract instance
 */
export function getRefundContract(provider?: any) {
  const contractAddress = REFUND_CONTRACT[NETWORK];
  if (!contractAddress) {
    throw new Error('Refund contract address not configured');
  }

  if (!provider) {
    // @ts-ignore
    provider = window.ethereum ? new ethers.providers.Web3Provider(window.ethereum) : null;
  }
  
  if (!provider) {
    throw new Error('No provider available');
  }
  
  return new ethers.Contract(contractAddress, EVENT_REFUND_ABI, provider);
}

// ==================== EVENT CANCELLATION ====================

/**
 * Cancel an event and enable refunds
 */
export async function cancelEvent(
  provider: any,
  eventContract: string,
  eventId: number,
  ticketPriceInEther: string,
  totalTicketsSold: number,
  refundDeadlineDays: number,
  reason: CancellationReason
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const signer = provider.getSigner();
    const refundContractInstance = getRefundContract(provider).connect(signer);
    
    const ticketPriceWei = ethers.utils.parseEther(ticketPriceInEther);
    
    const tx = await refundContractInstance.cancelEvent(
      eventContract,
      eventId,
      ticketPriceWei,
      totalTicketsSold,
      refundDeadlineDays,
      reason
    );
    
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.transactionHash
    };
  } catch (error: any) {
    console.error('Error cancelling event:', error);
    return {
      success: false,
      error: error.message || 'Failed to cancel event'
    };
  }
}

/**
 * Fund refund pool for cancelled event
 */
export async function fundRefundPool(
  provider: any,
  eventContract: string,
  eventId: number,
  totalAmountInEther: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const signer = provider.getSigner();
    const refundContractInstance = getRefundContract(provider).connect(signer);
    
    const amountWei = ethers.utils.parseEther(totalAmountInEther);
    
    const tx = await refundContractInstance.fundRefundPool(
      eventContract,
      eventId,
      { value: amountWei }
    );
    
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.transactionHash
    };
  } catch (error: any) {
    console.error('Error funding refund pool:', error);
    return {
      success: false,
      error: error.message || 'Failed to fund refund pool'
    };
  }
}

// ==================== REFUND CLAIMS ====================

/**
 * Claim refund for a ticket (MANUAL CLAIM)
 */
export async function claimRefund(
  provider: any,
  eventContract: string,
  eventId: number,
  tokenId: number
): Promise<{ success: boolean; claimId?: number; txHash?: string; error?: string }> {
  try {
    const signer = provider.getSigner();
    const refundContractInstance = getRefundContract(provider).connect(signer);
    
    const tx = await refundContractInstance.claimRefund(
      eventContract,
      eventId,
      tokenId
    );
    
    const receipt = await tx.wait();
    
    // Extract claim ID from event
    const event = receipt.events?.find((e: any) => e.event === 'RefundClaimCreated');
    const claimId = event?.args?.claimId?.toNumber();
    
    return {
      success: true,
      claimId,
      txHash: receipt.transactionHash
    };
  } catch (error: any) {
    console.error('Error claiming refund:', error);
    return {
      success: false,
      error: error.message || 'Failed to claim refund'
    };
  }
}

/**
 * Check if user can claim refund
 */
export async function canClaimRefund(
  eventContract: string,
  eventId: number,
  tokenId: number,
  userAddress: string
): Promise<boolean> {
  try {
    const refundContractInstance = getRefundContract();
    
    const canClaim = await refundContractInstance.canClaimRefund(
      eventContract,
      eventId,
      tokenId,
      userAddress
    );
    
    return canClaim;
  } catch (error) {
    console.error('Error checking refund eligibility:', error);
    return false;
  }
}

/**
 * Get event cancellation details
 */
export async function getEventCancellation(
  eventContract: string,
  eventId: number
): Promise<EventCancellation | null> {
  try {
    const refundContractInstance = getRefundContract();
    const cancellation = await refundContractInstance.getEventCancellation(
      eventContract,
      eventId
    );
    
    if (!cancellation.active) {
      return null;
    }
    
    return {
      eventContract: cancellation.eventContract,
      eventId: cancellation.eventId.toNumber(),
      organizer: cancellation.organizer,
      ticketPrice: cancellation.ticketPrice.toString(),
      totalTicketsSold: cancellation.totalTicketsSold.toNumber(),
      refundDeadline: cancellation.refundDeadline.toNumber(),
      cancelledAt: cancellation.cancelledAt.toNumber(),
      reason: cancellation.reason,
      refundPoolFunded: cancellation.refundPoolFunded,
      active: cancellation.active
    };
  } catch (error) {
    console.error('Error getting event cancellation:', error);
    return null;
  }
}

/**
 * Get refund claim details
 */
export async function getRefundClaim(
  claimId: number
): Promise<RefundClaim | null> {
  try {
    const refundContractInstance = getRefundContract();
    const claim = await refundContractInstance.getRefundClaim(claimId);
    
    return {
      claimant: claim.claimant,
      eventContract: claim.eventContract,
      eventId: claim.eventId.toNumber(),
      tokenId: claim.tokenId.toNumber(),
      refundAmount: claim.refundAmount.toString(),
      status: claim.status,
      claimedAt: claim.claimedAt.toNumber(),
      processedAt: claim.processedAt.toNumber(),
      ticketBurned: claim.ticketBurned
    };
  } catch (error) {
    console.error('Error getting refund claim:', error);
    return null;
  }
}

/**
 * Get refund pool balance
 */
export async function getRefundPoolBalance(
  eventContract: string,
  eventId: number
): Promise<string | null> {
  try {
    const refundContractInstance = getRefundContract();
    const balance = await refundContractInstance.getRefundPoolBalance(
      eventContract,
      eventId
    );
    
    return balance.toString();
  } catch (error) {
    console.error('Error getting refund pool balance:', error);
    return null;
  }
}

/**
 * Get refund statistics
 */
export async function getRefundStats(): Promise<RefundStats | null> {
  try {
    const refundContractInstance = getRefundContract();
    const stats = await refundContractInstance.getRefundStats();
    
    return {
      totalCancellations: stats.totalCancellations.toNumber(),
      totalRefundsClaimed: stats.totalRefundsClaimed.toNumber(),
      totalRefundAmount: stats.totalRefundAmount.toString()
    };
  } catch (error) {
    console.error('Error getting refund stats:', error);
    return null;
  }
}

/**
 * Withdraw unclaimed refunds after deadline (Organizer only)
 */
export async function withdrawUnclaimedRefunds(
  provider: any,
  eventContract: string,
  eventId: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const signer = provider.getSigner();
    const refundContractInstance = getRefundContract(provider).connect(signer);
    
    const tx = await refundContractInstance.withdrawUnclaimedRefunds(
      eventContract,
      eventId
    );
    
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.transactionHash
    };
  } catch (error: any) {
    console.error('Error withdrawing unclaimed refunds:', error);
    return {
      success: false,
      error: error.message || 'Failed to withdraw unclaimed refunds'
    };
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate total refund pool needed
 */
export function calculateRefundPoolAmount(
  ticketPriceInEther: string,
  totalTicketsSold: number
): string {
  const priceWei = ethers.utils.parseEther(ticketPriceInEther);
  const totalWei = priceWei.mul(totalTicketsSold);
  return ethers.utils.formatEther(totalWei);
}

/**
 * Check if refund deadline has passed
 */
export function isRefundDeadlinePassed(refundDeadline: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now > refundDeadline;
}

/**
 * Get days until refund deadline
 */
export function getDaysUntilDeadline(refundDeadline: number): number {
  const now = Math.floor(Date.now() / 1000);
  const secondsRemaining = refundDeadline - now;
  return Math.max(0, Math.floor(secondsRemaining / (24 * 60 * 60)));
}

/**
 * Format refund claim for display
 */
export function formatRefundClaim(claim: RefundClaim) {
  return {
    ...claim,
    refundAmountInEther: ethers.utils.formatEther(claim.refundAmount),
    claimedDate: new Date(claim.claimedAt * 1000),
    processedDate: claim.processedAt > 0 ? new Date(claim.processedAt * 1000) : null
  };
}

/**
 * Get refund status badge color
 */
export function getRefundStatusColor(status: RefundStatus): string {
  switch (status) {
    case RefundStatus.Pending:
      return 'bg-yellow-500/20 text-yellow-400';
    case RefundStatus.Approved:
      return 'bg-blue-500/20 text-blue-400';
    case RefundStatus.Claimed:
      return 'bg-green-500/20 text-green-400';
    case RefundStatus.Rejected:
      return 'bg-red-500/20 text-red-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

export {
  RefundStatus,
  CancellationReason
};
