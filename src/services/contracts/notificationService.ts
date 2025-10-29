/**
 * NotificationSystem Contract Service
 * Handles user notifications from smart contract
 */

import { ethers } from 'ethers';
import { getContracts } from '@/config/contracts';

const NOTIFICATION_SYSTEM_ABI = [
  // Read functions
  "function getUserNotifications(address user, uint256 startIndex, uint256 count) view returns (tuple(uint256 id, string title, string message, string category, uint256 timestamp, bool read)[])",
  "function getUnreadCount(address user) view returns (uint256)",
  
  // Write functions
  "function markAsRead(uint256 notificationId)",
  "function markAllAsRead()",
  
  // Events
  "event NotificationSent(address indexed user, uint256 indexed notificationId, string title, string category)",
];

export interface Notification {
  id: number;
  title: string;
  message: string;
  category: string;
  timestamp: number;
  read: boolean;
}

export class NotificationService {
  private contract: ethers.Contract | null = null;

  async initialize(signer: ethers.Signer) {
    const contracts = getContracts();
    this.contract = new ethers.Contract(
      contracts.NotificationSystem,
      NOTIFICATION_SYSTEM_ABI,
      signer
    );
    return this;
  }

  getReadContract(provider: ethers.Provider) {
    const contracts = getContracts();
    return new ethers.Contract(
      contracts.NotificationSystem,
      NOTIFICATION_SYSTEM_ABI,
      provider
    );
  }

  // ==================== WRITE FUNCTIONS ====================

  async markAsRead(notificationId: number) {
    if (!this.contract) throw new Error('Contract not initialized');
    const tx = await this.contract.markAsRead(notificationId);
    const receipt = await tx.wait();
    return {
      transactionHash: receipt.hash,
      success: receipt.status === 1,
    };
  }

  async markAllAsRead() {
    if (!this.contract) throw new Error('Contract not initialized');
    const tx = await this.contract.markAllAsRead();
    const receipt = await tx.wait();
    return {
      transactionHash: receipt.hash,
      success: receipt.status === 1,
    };
  }

  // ==================== READ FUNCTIONS ====================

  async getUserNotifications(
    user: string,
    startIndex: number,
    count: number,
    provider: ethers.Provider
  ): Promise<Notification[]> {
    const contract = this.getReadContract(provider);
    const notifications = await contract.getUserNotifications(user, startIndex, count);
    
    return notifications.map((n: any) => ({
      id: Number(n.id),
      title: n.title,
      message: n.message,
      category: n.category,
      timestamp: Number(n.timestamp),
      read: n.read,
    }));
  }

  async getUnreadCount(user: string, provider: ethers.Provider): Promise<number> {
    const contract = this.getReadContract(provider);
    const count = await contract.getUnreadCount(user);
    return Number(count);
  }
}

export const notificationService = new NotificationService();
