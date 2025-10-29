/**
 * UserProfile Contract Service
 * Handles all interactions with UserProfile smart contract
 */

import { ethers } from 'ethers';
import { getContracts } from '@/config/contracts';
import UserProfileABI from '@/contracts/UserProfile.json';

export class UserProfileService {
  private contract: ethers.Contract | null = null;
  private signer: ethers.Signer | null = null;

  /**
   * Initialize the contract instance
   */
  async initialize(signer: ethers.Signer) {
    const contracts = getContracts();
    this.signer = signer;
    this.contract = new ethers.Contract(
      contracts.UserProfile,
      UserProfileABI.abi,
      signer
    );
    return this;
  }

  /**
   * Get read-only contract instance (for queries)
   */
  getReadContract(provider: ethers.Provider) {
    const contracts = getContracts();
    return new ethers.Contract(
      contracts.UserProfile,
      UserProfileABI.abi,
      provider
    );
  }

  // ==================== WRITE FUNCTIONS ====================

  /**
   * Create a new user profile
   * @param profileUri IPFS URI for profile metadata
   * @param contentHash Hash of profile content for verification
   */
  async createProfile(profileUri: string, contentHash: string) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.createProfile(profileUri, contentHash);
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.hash,
      success: receipt.status === 1,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Add a ticket to user's profile (called by EventTicket contract)
   * @param user User address
   * @param ticketId Token ID of the ticket
   * @param eventId Event ID
   */
  async addTicket(user: string, ticketId: number, eventId: number) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.addTicket(user, ticketId, eventId);
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.hash,
      success: receipt.status === 1,
    };
  }

  /**
   * Mark that user attended an event
   * @param user User address
   * @param eventId Event ID
   */
  async addEventAttended(user: string, eventId: number) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.addEventAttended(user, eventId);
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.hash,
      success: receipt.status === 1,
    };
  }

  /**
   * Update user's rating
   * @param user User address
   * @param rating Rating value (1-5)
   */
  async updateRating(user: string, rating: number) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.updateRating(user, rating);
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.hash,
      success: receipt.status === 1,
    };
  }

  /**
   * Mark that user reviewed an event
   * @param user User address
   * @param eventId Event ID
   */
  async markEventReviewed(user: string, eventId: number) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.markEventReviewed(user, eventId);
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.hash,
      success: receipt.status === 1,
    };
  }

  // ==================== READ FUNCTIONS ====================

  /**
   * Check if user has a profile
   * @param user User address
   */
  async profileExists(user: string, provider: ethers.Provider): Promise<boolean> {
    const contract = this.getReadContract(provider);
    return await contract.profileExists(user);
  }

  /**
   * Get user profile information
   * @param user User address
   */
  async getProfile(user: string, provider: ethers.Provider) {
    const contract = this.getReadContract(provider);
    const profile = await contract.getProfile(user);
    
    return {
      profileUri: profile.profileUri,
      contentHash: profile.contentHash,
      totalTickets: Number(profile.totalTickets),
      eventsAttended: Number(profile.eventsAttended),
      totalReviews: Number(profile.totalReviews),
      averageRating: Number(profile.averageRating),
      createdAt: Number(profile.createdAt),
    };
  }

  /**
   * Check if user has reviewed an event
   * @param user User address
   * @param eventId Event ID
   */
  async hasReviewedEvent(user: string, eventId: number, provider: ethers.Provider): Promise<boolean> {
    const contract = this.getReadContract(provider);
    return await contract.hasReviewedEvent(user, eventId);
  }

  /**
   * Get all tickets owned by user
   * @param user User address
   */
  async getUserTickets(user: string, provider: ethers.Provider): Promise<Array<{ticketId: number, eventId: number}>> {
    const contract = this.getReadContract(provider);
    const tickets = await contract.getUserTickets(user);
    
    return tickets.map((ticket: any) => ({
      ticketId: Number(ticket.ticketId),
      eventId: Number(ticket.eventId),
    }));
  }

  /**
   * Get events attended by user
   * @param user User address
   */
  async getUserEventsAttended(user: string, provider: ethers.Provider): Promise<number[]> {
    const contract = this.getReadContract(provider);
    const events = await contract.getUserEventsAttended(user);
    return events.map((e: any) => Number(e));
  }
}

// Export singleton instance
export const userProfileService = new UserProfileService();
