/**
 * Smart Contract Configuration
 * Contains all deployed contract addresses and ABIs for PushChain
 * 
 * LATEST DEPLOYMENT: January 31, 2025 (V3.1 - Fraud Protection Update)
 * - EventOrganizerV2: Auto-registration for event contracts
 * - EventTicketV3.1: Per-event deployment with UEA support + FRAUD PROTECTION
 * - NFTMarketplaceV2: Enhanced marketplace with escrow and royalties
 * 
 * V3.1 FRAUD PROTECTION FEATURES:
 * - ✅ 72-hour withdrawal lock after event (prevents EO from immediately withdrawing)
 * - ✅ Community fraud reporting (30% threshold triggers emergency refund)
 * - ✅ Emergency refund for USED tickets (protects against check-in scam)
 * - ✅ Partial refund support (unused tickets only - normal flow)
 * - ✅ NFT burn after refund
 * - ✅ Fair for both users and event organizers
 */

export const NETWORK = import.meta.env.VITE_PUSHCHAIN_NETWORK || 'testnet';

// PushChain Network Configuration
export const PUSHCHAIN_CONFIG = {
  testnet: {
    rpcUrl: import.meta.env.VITE_PUSHCHAIN_RPC_URL || 'https://evm.rpc-testnet-donut-node1.push.org/',
    chainId: parseInt(import.meta.env.VITE_PUSHCHAIN_CHAIN_ID || '50311'),
    explorerUrl: import.meta.env.VITE_PUSHCHAIN_EXPLORER_URL || 'https://testnet.explorer.push.org/',
    name: 'PushChain Testnet',
    nativeCurrency: {
      name: 'Push Coin',
      symbol: 'PC',
      decimals: 18,
    },
  },
  mainnet: {
    rpcUrl: 'https://evm.rpc-mainnet.push.org/',
    chainId: 1001, // Update with actual mainnet chain ID
    explorerUrl: 'https://explorer.push.org/',
    name: 'PushChain Mainnet',
    nativeCurrency: {
      name: 'Push Coin',
      symbol: 'PC',
      decimals: 18,
    },
  },
};

// Smart Contract Addresses (UPDATED - January 31, 2025 - Push Chain Testnet - V3.1 with FRAUD PROTECTION)
export const CONTRACTS = {
  testnet: {
    // Core Platform
    Platform: '0xf3D3D877C8d57052566dff131dBEb2367a28c916',
    
    // User & Profile Management
    UserProfile: '0x6973e5e57de4Fcd139024158f76cDF520E99234C',
    NotificationSystem: '0xFa9CFbAe9A30ED29e103386C3F4B8f78CCC43653',
    
    // Event Management (UPDATED V3.1 - WITH FRAUD PROTECTION - Jan 31, 2025)
    EventOrganizer: '0x35df1Ad1265cdFB2110371d5f3012B6396f2F9E7', // EventOrganizerV2 - LATEST DEPLOYMENT
    
    // Legacy contracts (keeping for compatibility)
    EventStatistics: '0xe8C0001787254A1a1d13e41A2f9661e7702c1Ddb',
    EventReview: '0x2d11cd476B9D8661c97758d20a8D3c4a6782F15b',
    EventRefund: '0x2330835867f4BE4bbAc46bE985B8886C73a77bFb',
    
    // Ticket Management
    TicketManagement: '0xf095B760fdB748eA781d63DEb7e5D2C041E43dF5',
    TicketValidator: '0xeccD0BCc1acBc91F0238Ff1de8c92a783101F1Bc',
    
    // Marketplace (UPDATED V3.1 - LATEST DEPLOYMENT - Jan 31, 2025)
    NFTMarketplace: '0x62B5feF56C802716801a8D8D6C6b36780BbCDa38', // NFTMarketplaceV2 - LATEST DEPLOYMENT
    
    // EventTicket (V3.1 - Deployed per event via Universal Transaction - WITH FRAUD PROTECTION)
    EventTicket: '', // Not deployed here - each event deploys its own EventTicketV3 instance
  },
  mainnet: {
    Platform: '',
    UserProfile: '',
    NotificationSystem: '',
    EventOrganizer: '',
    EventStatistics: '',
    EventReview: '',
    EventRefund: '',
    TicketManagement: '',
    TicketValidator: '',
    NFTMarketplace: '',
    EventTicket: '',
  },
};

// Helper to get current network config
export const getNetworkConfig = () => {
  return NETWORK === 'mainnet'
    ? PUSHCHAIN_CONFIG.mainnet
    : PUSHCHAIN_CONFIG.testnet;
};

// Helper to get contract addresses
export const getContracts = () => {
  const contracts = NETWORK === 'mainnet'
    ? CONTRACTS.mainnet
    : CONTRACTS.testnet;

  // Filter out EventTicket from missing contracts check since it's dynamic
  const missingContracts = Object.entries(contracts)
    .filter(([name, address]) => name !== 'EventTicket' && !address)
    .map(([name]) => name);

  if (missingContracts.length > 0) {
    console.warn('⚠️ Some contracts not configured:', missingContracts.join(', '));
    console.warn('Please deploy contracts and update environment variables');
  }

  return contracts;
};

// Contract Templates Version
export const CONTRACT_TEMPLATE_VERSION = '1.0.0';

// Platform Fee (basis points, e.g., 250 = 2.5%)
export const PLATFORM_FEE_BPS = 250;

// Deployment Costs (in PC - PushChain native token)
export const DEPLOYMENT_COSTS = {
  eventContract: 0.01, // PC
  registryFee: 0.001, // PC (registration fee)
  gasFeeBuffer: 0.005, // PC (extra for gas)
};

// ERC-721 Standard
export const ERC721_INTERFACE_ID = '0x80ac58cd';

// Helper to format PC amounts
export const formatPC = (amount: number): string => {
  return amount.toFixed(6) + ' PC';
};

// Helper to convert Wei to PC
export const weiToPC = (wei: bigint | string): number => {
  return Number(wei) / 1e18;
};

// Helper to convert PC to Wei
export const pcToWei = (pc: number): bigint => {
  return BigInt(Math.floor(pc * 1e18));
};

