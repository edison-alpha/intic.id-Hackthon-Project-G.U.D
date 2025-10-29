/**
 * UEA (Universal Event Authorization) Service
 * Handles UEA token balance and interactions with PushChain
 */

import { ethers } from 'ethers';

// UEA Contract ABI - minimal for balanceOf
const UEA_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
];

// UEA Contract Address on PushChain Testnet
// This is the Universal Event Authorization token address
// Using ethers.getAddress to ensure proper checksum
export const UEA_CONTRACT_ADDRESS = '0x2e155f7f593dbef91bc8e4b9b19457a1b6bca9dd'; // Lowercase to avoid checksum issues

/**
 * Get UEA balance for an address
 * @param address - Wallet address to check
 * @returns UEA balance as a number (formatted from wei)
 */
export const getUEABalance = async (address: string): Promise<number> => {
  try {
    if (!address) {
      throw new Error('Address is required');
    }

    // Check if wallet is connected
    if (!window.ethereum) {
      throw new Error('Wallet not connected');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    // Ensure address has proper checksum
    const checksummedAddress = ethers.getAddress(UEA_CONTRACT_ADDRESS);
    const contract = new ethers.Contract(checksummedAddress, UEA_ABI, provider);

    // Get balance - ensure user address also has proper checksum
    const checksummedUserAddress = ethers.getAddress(address);
    const balance = await contract.balanceOf(checksummedUserAddress);

    // Get decimals (usually 18 for ERC20 tokens)
    const decimals = await contract.decimals();

    // Convert from wei to readable format
    const formattedBalance = Number(ethers.formatUnits(balance, decimals));

    console.log(`✅ UEA Balance for ${address}:`, formattedBalance);

    return formattedBalance;
  } catch (error: any) {
    console.error('❌ Error fetching UEA balance:', error);

    // Return 0 if there's an error (user might not have UEA yet)
    if (error.message?.includes('call revert exception') ||
        error.message?.includes('execution reverted')) {
      console.warn('⚠️ UEA balance call reverted, returning 0');
      return 0;
    }

    throw new Error('Failed to fetch UEA balance');
  }
};

/**
 * Get UEA token info
 * @returns Token name and symbol
 */
export const getUEATokenInfo = async (): Promise<{ name: string; symbol: string; decimals: number }> => {
  try {
    if (!window.ethereum) {
      throw new Error('Wallet not connected');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(UEA_CONTRACT_ADDRESS, UEA_ABI, provider);

    const [name, symbol, decimals] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
    ]);

    return {
      name,
      symbol,
      decimals: Number(decimals),
    };
  } catch (error: any) {
    console.error('❌ Error fetching UEA token info:', error);

    // Return default values if error
    return {
      name: 'Universal Event Authorization',
      symbol: 'UEA',
      decimals: 18,
    };
  }
};

/**
 * Format UEA balance for display
 * @param balance - Raw UEA balance
 * @returns Formatted string with symbol
 */
export const formatUEABalance = (balance: number): string => {
  if (balance === 0) {
    return '0 UEA';
  }

  // Format with 2 decimal places for small amounts, 0 for large amounts
  if (balance < 1) {
    return `${balance.toFixed(4)} UEA`;
  } else if (balance < 1000) {
    return `${balance.toFixed(2)} UEA`;
  } else {
    return `${balance.toLocaleString('en-US', { maximumFractionDigits: 0 })} UEA`;
  }
};

export default {
  getUEABalance,
  getUEATokenInfo,
  formatUEABalance,
  UEA_CONTRACT_ADDRESS,
};
