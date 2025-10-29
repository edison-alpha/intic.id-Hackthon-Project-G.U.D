/**
 * EventTicket Contract Service
 * Handles all interactions with EventTicket NFT smart contract
 * Each event has its own EventTicket contract instance
 */

import { ethers } from 'ethers';

// EventTicket ABI (will be imported from artifacts)
// For now, we'll define the essential interface
const EVENT_TICKET_ABI = [
  // Read functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function getTicketInfo(uint256 tokenId) view returns (tuple(uint256 tokenId, address owner, string ticketUri, string contentHash, uint256 mintedAt, bool used, uint256 usedAt, bool cancelled))",
  "function isTicketUsed(uint256 tokenId) view returns (bool)",
  "function eventCancelled() view returns (bool)",
  "function eventId() view returns (uint256)",
  "function organizer() view returns (address)",
  "function ticketPrice() view returns (uint256)",
  
  // Write functions
  "function mintTicket(address to, string memory ticketUri, string memory contentHash, string memory tier, uint256 rarity, string[] memory benefits) payable returns (uint256)",
  "function useTicket(uint256 tokenId)",
  "function cancelEvent()",
  "function approve(address to, uint256 tokenId)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  
  // Events
  "event TicketMinted(address indexed owner, uint256 indexed tokenId, string ticketUri)",
  "event TicketUsed(uint256 indexed tokenId, address indexed owner, uint256 usedAt)",
  "event EventCancelled(uint256 timestamp)",
];

export interface TicketInfo {
  tokenId: number;
  owner: string;
  ticketUri: string;
  contentHash: string;
  mintedAt: number;
  used: boolean;
  usedAt: number;
  cancelled: boolean;
}

export interface MintTicketParams {
  to: string;
  ticketUri: string;
  contentHash: string;
  tier: string;
  rarity: number;
  benefits: string[];
  paymentAmount: bigint;
}

export class EventTicketService {
  private contract: ethers.Contract | null = null;
  private contractAddress: string = '';

  /**
   * Initialize the contract instance for a specific event
   * @param contractAddress Address of the EventTicket contract
   * @param signer Wallet signer
   */
  async initialize(contractAddress: string, signer: ethers.Signer) {
    this.contractAddress = contractAddress;
    this.contract = new ethers.Contract(
      contractAddress,
      EVENT_TICKET_ABI,
      signer
    );
    return this;
  }

  /**
   * Get read-only contract instance
   */
  getReadContract(contractAddress: string, provider: ethers.Provider) {
    return new ethers.Contract(
      contractAddress,
      EVENT_TICKET_ABI,
      provider
    );
  }

  // ==================== WRITE FUNCTIONS ====================

  /**
   * Mint a new ticket NFT
   * @param params Ticket minting parameters
   */
  async mintTicket(params: MintTicketParams) {
    if (!this.contract) throw new Error('Contract not initialized');

    const tx = await this.contract.mintTicket(
      params.to,
      params.ticketUri,
      params.contentHash,
      params.tier,
      params.rarity,
      params.benefits,
      { value: params.paymentAmount }
    );
    
    const receipt = await tx.wait();
    
    // Extract tokenId from event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contract!.interface.parseLog(log);
        return parsed?.name === 'TicketMinted';
      } catch {
        return false;
      }
    });

    let tokenId = null;
    if (event) {
      const parsed = this.contract.interface.parseLog(event);
      tokenId = parsed?.args?.tokenId ? Number(parsed.args.tokenId) : null;
    }

    return {
      transactionHash: receipt.hash,
      success: receipt.status === 1,
      gasUsed: receipt.gasUsed.toString(),
      tokenId,
    };
  }

  /**
   * Use/validate a ticket (marks as used)
   * @param tokenId Ticket token ID
   */
  async useTicket(tokenId: number) {
    if (!this.contract) throw new Error('Contract not initialized');

    const tx = await this.contract.useTicket(tokenId);
    const receipt = await tx.wait();

    return {
      transactionHash: receipt.hash,
      success: receipt.status === 1,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Cancel the event (organizer only)
   */
  async cancelEvent() {
    if (!this.contract) throw new Error('Contract not initialized');

    const tx = await this.contract.cancelEvent();
    const receipt = await tx.wait();

    return {
      transactionHash: receipt.hash,
      success: receipt.status === 1,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Approve address to transfer ticket
   * @param to Address to approve
   * @param tokenId Ticket token ID
   */
  async approveTransfer(to: string, tokenId: number) {
    if (!this.contract) throw new Error('Contract not initialized');

    const tx = await this.contract.approve(to, tokenId);
    const receipt = await tx.wait();

    return {
      transactionHash: receipt.hash,
      success: receipt.status === 1,
    };
  }

  /**
   * Transfer ticket to another address
   * @param from Current owner
   * @param to New owner
   * @param tokenId Ticket token ID
   */
  async transferTicket(from: string, to: string, tokenId: number) {
    if (!this.contract) throw new Error('Contract not initialized');

    const tx = await this.contract.transferFrom(from, to, tokenId);
    const receipt = await tx.wait();

    return {
      transactionHash: receipt.hash,
      success: receipt.status === 1,
    };
  }

  // ==================== READ FUNCTIONS ====================

  /**
   * Get ticket details
   * @param tokenId Ticket token ID
   * @param contractAddress EventTicket contract address
   * @param provider Provider
   */
  async getTicketInfo(
    tokenId: number,
    contractAddress: string,
    provider: ethers.Provider
  ): Promise<TicketInfo> {
    const contract = this.getReadContract(contractAddress, provider);
    const info = await contract.getTicketInfo(tokenId);

    return {
      tokenId: Number(info.tokenId),
      owner: info.owner,
      ticketUri: info.ticketUri,
      contentHash: info.contentHash,
      mintedAt: Number(info.mintedAt),
      used: info.used,
      usedAt: Number(info.usedAt),
      cancelled: info.cancelled,
    };
  }

  /**
   * Check if ticket is used
   * @param tokenId Ticket token ID
   * @param contractAddress EventTicket contract address
   * @param provider Provider
   */
  async isTicketUsed(
    tokenId: number,
    contractAddress: string,
    provider: ethers.Provider
  ): Promise<boolean> {
    const contract = this.getReadContract(contractAddress, provider);
    return await contract.isTicketUsed(tokenId);
  }

  /**
   * Get ticket URI (metadata)
   * @param tokenId Ticket token ID
   * @param contractAddress EventTicket contract address
   * @param provider Provider
   */
  async getTicketURI(
    tokenId: number,
    contractAddress: string,
    provider: ethers.Provider
  ): Promise<string> {
    const contract = this.getReadContract(contractAddress, provider);
    return await contract.tokenURI(tokenId);
  }

  /**
   * Get owner of ticket
   * @param tokenId Ticket token ID
   * @param contractAddress EventTicket contract address
   * @param provider Provider
   */
  async getOwner(
    tokenId: number,
    contractAddress: string,
    provider: ethers.Provider
  ): Promise<string> {
    const contract = this.getReadContract(contractAddress, provider);
    return await contract.ownerOf(tokenId);
  }

  /**
   * Get user's balance (number of tickets)
   * @param owner User address
   * @param contractAddress EventTicket contract address
   * @param provider Provider
   */
  async getBalance(
    owner: string,
    contractAddress: string,
    provider: ethers.Provider
  ): Promise<number> {
    const contract = this.getReadContract(contractAddress, provider);
    const balance = await contract.balanceOf(owner);
    return Number(balance);
  }

  /**
   * Get total supply of tickets
   * @param contractAddress EventTicket contract address
   * @param provider Provider
   */
  async getTotalSupply(
    contractAddress: string,
    provider: ethers.Provider
  ): Promise<number> {
    const contract = this.getReadContract(contractAddress, provider);
    const supply = await contract.totalSupply();
    return Number(supply);
  }

  /**
   * Get event info from ticket contract
   * @param contractAddress EventTicket contract address
   * @param provider Provider
   */
  async getEventInfo(contractAddress: string, provider: ethers.Provider) {
    const contract = this.getReadContract(contractAddress, provider);
    
    const [eventId, organizer, ticketPrice, eventCancelled, name, symbol] = await Promise.all([
      contract.eventId(),
      contract.organizer(),
      contract.ticketPrice(),
      contract.eventCancelled(),
      contract.name(),
      contract.symbol(),
    ]);

    return {
      eventId: Number(eventId),
      organizer,
      ticketPrice: ticketPrice.toString(),
      eventCancelled,
      name,
      symbol,
    };
  }

  /**
   * Check if event is cancelled
   * @param contractAddress EventTicket contract address
   * @param provider Provider
   */
  async isEventCancelled(
    contractAddress: string,
    provider: ethers.Provider
  ): Promise<boolean> {
    const contract = this.getReadContract(contractAddress, provider);
    return await contract.eventCancelled();
  }
}

// Export singleton instance
export const eventTicketService = new EventTicketService();
