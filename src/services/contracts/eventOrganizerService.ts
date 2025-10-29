/**
 * EventOrganizer Contract Service
 * Handles organizer registration and event management
 */

import { ethers } from 'ethers';
import { getContracts } from '@/config/contracts';

const EVENT_ORGANIZER_ABI = [
  // Read functions
  "function getOrganizer(address organizer) view returns (tuple(address organizerAddress, string name, string profileUri, string contentHash, uint256 totalEvents, uint256 totalTicketsSold, uint256 totalRevenue, uint256 averageRating, uint256 registeredAt, bool active))",
  "function isRegisteredOrganizer(address organizer) view returns (bool)",
  "function getOrganizerEvents(address organizer) view returns (uint256[])",
  
  // Write functions
  "function registerOrganizer(string memory name, string memory profileUri, string memory contentHash)",
  "function updateOrganizer(string memory name, string memory profileUri, string memory contentHash)",
  "function recordEventCreation(address organizer, uint256 eventId)",
  "function incrementTicketsSold(address organizer, uint256 count, uint256 revenue)",
  
  // Events
  "event OrganizerRegistered(address indexed organizer, string name, uint256 timestamp)",
  "event OrganizerUpdated(address indexed organizer, string name)",
];

export interface OrganizerInfo {
  organizerAddress: string;
  name: string;
  profileUri: string;
  contentHash: string;
  totalEvents: number;
  totalTicketsSold: number;
  totalRevenue: string;
  averageRating: number;
  registeredAt: number;
  active: boolean;
}

export class EventOrganizerService {
  private contract: ethers.Contract | null = null;

  /**
   * Initialize the contract instance
   */
  async initialize(signer: ethers.Signer) {
    const contracts = getContracts();
    this.contract = new ethers.Contract(
      contracts.EventOrganizer,
      EVENT_ORGANIZER_ABI,
      signer
    );
    return this;
  }

  /**
   * Get read-only contract instance
   */
  getReadContract(provider: ethers.Provider) {
    const contracts = getContracts();
    return new ethers.Contract(
      contracts.EventOrganizer,
      EVENT_ORGANIZER_ABI,
      provider
    );
  }

  // ==================== WRITE FUNCTIONS ====================

  /**
   * Register as an event organizer
   * @param name Organizer name
   * @param profileUri IPFS URI for profile
   * @param contentHash Content hash for verification
   */
  async registerOrganizer(name: string, profileUri: string, contentHash: string) {
    if (!this.contract) throw new Error('Contract not initialized');

    const tx = await this.contract.registerOrganizer(name, profileUri, contentHash);
    const receipt = await tx.wait();

    return {
      transactionHash: receipt.hash,
      success: receipt.status === 1,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Update organizer information
   * @param name New organizer name
   * @param profileUri New IPFS URI
   * @param contentHash New content hash
   */
  async updateOrganizer(name: string, profileUri: string, contentHash: string) {
    if (!this.contract) throw new Error('Contract not initialized');

    const tx = await this.contract.updateOrganizer(name, profileUri, contentHash);
    const receipt = await tx.wait();

    return {
      transactionHash: receipt.hash,
      success: receipt.status === 1,
    };
  }

  // ==================== READ FUNCTIONS ====================

  /**
   * Get organizer information
   * @param address Organizer address
   * @param provider Provider
   */
  async getOrganizer(address: string, provider: ethers.Provider): Promise<OrganizerInfo> {
    const contract = this.getReadContract(provider);
    const info = await contract.getOrganizer(address);

    return {
      organizerAddress: info.organizerAddress,
      name: info.name,
      profileUri: info.profileUri,
      contentHash: info.contentHash,
      totalEvents: Number(info.totalEvents),
      totalTicketsSold: Number(info.totalTicketsSold),
      totalRevenue: info.totalRevenue.toString(),
      averageRating: Number(info.averageRating),
      registeredAt: Number(info.registeredAt),
      active: info.active,
    };
  }

  /**
   * Check if address is registered organizer
   * @param address Address to check
   * @param provider Provider
   */
  async isRegisteredOrganizer(address: string, provider: ethers.Provider): Promise<boolean> {
    const contract = this.getReadContract(provider);
    return await contract.isRegisteredOrganizer(address);
  }

  /**
   * Get all events created by organizer
   * @param address Organizer address
   * @param provider Provider
   */
  async getOrganizerEvents(address: string, provider: ethers.Provider): Promise<number[]> {
    const contract = this.getReadContract(provider);
    const events = await contract.getOrganizerEvents(address);
    return events.map((e: any) => Number(e));
  }
}

// Export singleton
export const eventOrganizerService = new EventOrganizerService();
