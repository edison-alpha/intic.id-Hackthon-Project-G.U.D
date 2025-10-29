import { ethers } from 'ethers';
import EventTicketArtifact from '@/contracts/EventTicket.json';

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Push Chain Donut Testnet Configuration
const PUSH_CHAIN_CONFIG = {
  chainId: 42101,
  chainName: 'Push Chain Donut Testnet',
  rpcUrl: 'https://evm.rpc-testnet-donut-node1.push.org/',
  rpcUrlBackup: 'https://evm.rpc-testnet-donut-node2.push.org/',
  blockExplorer: 'https://donut.push.network',
  nativeCurrency: {
    name: 'Push Chain',
    symbol: 'PC',
    decimals: 18,
  },
};

/**
 * Check if MetaMask is installed
 */
export const isMetaMaskInstalled = (): boolean => {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
};

/**
 * Connect to MetaMask wallet
 */
export const connectWallet = async (): Promise<string> => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please unlock MetaMask.');
    }

    // Switch to Push Chain network
    await switchToPushChain();

    return accounts[0];
  } catch (error: any) {
    console.error('Error connecting wallet:', error);
    throw new Error(error.message || 'Failed to connect wallet');
  }
};

/**
 * Switch to Push Chain Donut Testnet
 */
export const switchToPushChain = async () => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }

  try {
    // Try to switch to the network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${PUSH_CHAIN_CONFIG.chainId.toString(16)}` }],
    });
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${PUSH_CHAIN_CONFIG.chainId.toString(16)}`,
              chainName: PUSH_CHAIN_CONFIG.chainName,
              nativeCurrency: PUSH_CHAIN_CONFIG.nativeCurrency,
              rpcUrls: [PUSH_CHAIN_CONFIG.rpcUrl, PUSH_CHAIN_CONFIG.rpcUrlBackup],
              blockExplorerUrls: [PUSH_CHAIN_CONFIG.blockExplorer],
            },
          ],
        });
      } catch (addError) {
        throw new Error('Failed to add Push Chain network to MetaMask');
      }
    } else {
      throw new Error('Failed to switch to Push Chain network');
    }
  }
};

/**
 * Get user's PC balance
 */
export const getBalance = async (address: string): Promise<string> => {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('Error getting balance:', error);
    return '0';
  }
};

/**
 * Get current gas price
 */
export const getGasPrice = async (): Promise<bigint> => {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const feeData = await provider.getFeeData();
    return feeData.gasPrice || ethers.parseUnits('1', 'gwei');
  } catch (error) {
    console.error('Error getting gas price:', error);
    return ethers.parseUnits('1', 'gwei');
  }
};

/**
 * Estimate deployment cost in PC
 */
export const estimateDeploymentCost = async (): Promise<number> => {
  try {
    const gasPrice = await getGasPrice();
    // Estimated gas for contract deployment: ~3,000,000 gas
    const estimatedGas = BigInt(3000000);
    const totalCost = gasPrice * estimatedGas;
    return parseFloat(ethers.formatEther(totalCost));
  } catch (error) {
    console.error('Error estimating cost:', error);
    // Fallback estimate
    return 0.25;
  }
};

interface DeployEventParams {
  totalSupply: number;
  ticketPrice: string; // in PC
  nftName: string;
  nftSymbol: string;
  eventName: string;
  eventDate: number; // Unix timestamp in milliseconds
  eventVenue: string;
  venueAddress: string;
  venueCoordinates: string;
  eventImageUri: string;
  baseUri: string;
  eventDescription?: string; // Event description (optional)
}

interface DeploymentResult {
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  deployer: string;
  isRecorded?: boolean;
  verificationWarning?: string | undefined;
}

/**
 * Deploy EventTicket smart contract
 */
export const deployEventTicket = async (
  params: DeployEventParams,
  onProgress?: (step: string) => void
): Promise<DeploymentResult> => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }

  try {
    onProgress?.('Connecting to wallet...');
    
    // Get provider and signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const deployerAddress = await signer.getAddress();

    // Check network
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== PUSH_CHAIN_CONFIG.chainId) {
      onProgress?.('Switching to Push Chain...');
      await switchToPushChain();
    }

    // Load bytecode
    onProgress?.('Loading contract...');
    const bytecode = EventTicketArtifact.bytecode;
    if (!bytecode) {
      throw new Error('Contract bytecode not available');
    }

    // Validate and clean ticket price
    let cleanTicketPrice = params.ticketPrice.toString().trim();
    
    // Remove any non-numeric characters except decimal point
    cleanTicketPrice = cleanTicketPrice.replace(/[^0-9.]/g, '');
    
    // Ensure it's a valid number
    const ticketPriceNum = parseFloat(cleanTicketPrice);
    if (isNaN(ticketPriceNum) || ticketPriceNum <= 0) {
      throw new Error(`Invalid ticket price: ${params.ticketPrice}. Must be a positive number.`);
    }
    
    // Limit to 18 decimals (Ether precision)
    cleanTicketPrice = ticketPriceNum.toFixed(18);

    // Convert ticket price to wei
    const ticketPriceWei = ethers.parseEther(cleanTicketPrice);

    // Get EventOrganizer contract address from config
    const { CONTRACTS } = await import('@/config/contracts');
    const eventOrganizerAddress = CONTRACTS.testnet.EventOrganizer || ethers.ZeroAddress;

    // Validate eventDate (must be Unix timestamp in seconds for smart contract)
    let eventDateSeconds = params.eventDate;
    if (typeof eventDateSeconds === 'number' && eventDateSeconds > 10000000000) {
      // Convert from milliseconds to seconds
      eventDateSeconds = Math.floor(eventDateSeconds / 1000);
    }
    
    if (isNaN(eventDateSeconds) || eventDateSeconds <= 0) {
      throw new Error(`Invalid event date: ${params.eventDate}. Must be a valid timestamp.`);
    }

    // Validate totalSupply
    if (isNaN(params.totalSupply) || params.totalSupply <= 0) {
      throw new Error(`Invalid total supply: ${params.totalSupply}. Must be a positive number.`);
    }

    // Prepare constructor arguments
    const constructorArgs = [
      params.totalSupply,
      ticketPriceWei,
      params.nftName,
      params.nftSymbol,
      params.eventName,
      eventDateSeconds, // Use validated timestamp in seconds
      params.eventVenue,
      params.venueAddress,
      params.venueCoordinates,
      params.eventImageUri,
      params.baseUri,
      eventOrganizerAddress, // Add EventOrganizer contract address
      params.eventDescription || '', // Add event description (new parameter)
    ];

    console.log('🔧 Constructor arguments:', {
      totalSupply: params.totalSupply,
      ticketPrice: ethers.formatEther(ticketPriceWei),
      nftName: params.nftName,
      nftSymbol: params.nftSymbol,
      eventName: params.eventName,
      eventDate: eventDateSeconds,
      eventVenue: params.eventVenue,
      venueAddress: params.venueAddress,
      venueCoordinates: params.venueCoordinates,
      eventImageUri: params.eventImageUri,
      baseUri: params.baseUri,
      eventOrganizerAddress,
      eventDescription: params.eventDescription || '',
    });

    onProgress?.('Preparing deployment transaction...');

    // Create contract factory
    const factory = new ethers.ContractFactory(
      EventTicketArtifact.abi,
      bytecode,
      signer
    );

    onProgress?.('Waiting for confirmation...');

    // Deploy contract
    const contract = await factory.deploy(...constructorArgs);
    
    onProgress?.('Deploying contract...');

    // Wait for deployment
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    const deploymentTx = contract.deploymentTransaction();
    
    if (!deploymentTx) {
      throw new Error('Deployment transaction not found');
    }

    onProgress?.('Confirming transaction...');

    // Wait for transaction receipt
    const receipt = await deploymentTx.wait();
    
    if (!receipt) {
      throw new Error('Transaction receipt not found');
    }

    onProgress?.('Deployment complete!');

    // Verify if event was recorded in EventOrganizer
    onProgress?.('Verifying event registration...');

    let isRecorded = false;
    let verificationWarning: string | undefined;
    
    try {
      const { verifyEventRecorded } = await import('./eventOrganizerContract');
      const verification = await verifyEventRecorded(contractAddress, 3, 2000);
      
      if (verification.recorded) {

        onProgress?.('Event registered successfully!');
        isRecorded = true;
      } else {
        console.warn('⚠️ Event deployed but NOT recorded in EventOrganizer!');
        console.warn('Event will not appear in Browse Events or EO Profile');
        console.warn('This may happen if:');
        console.warn('1. You are not registered as an Event Organizer');
        console.warn('2. EventOrganizer contract address mismatch');
        console.warn('3. Network or blockchain sync issue');
        onProgress?.('⚠️ Warning: Event not registered in registry');
        isRecorded = false;
        verificationWarning = 'Event deployed successfully but not registered in the platform registry. Please ensure you are registered as an Event Organizer. Go to EO Profile to register if needed.';
      }
    } catch (verifyError) {
      console.error('Error verifying event registration:', verifyError);
      // Don't fail deployment if verification fails
      verificationWarning = 'Unable to verify event registration status.';
    }

    return {
      contractAddress,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      deployer: deployerAddress,
      isRecorded,
      verificationWarning,
    };
  } catch (error: any) {
    console.error('Deployment error:', error);
    
    // Parse error message
    let errorMessage = 'Failed to deploy contract';
    
    if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
      errorMessage = 'Transaction rejected by user';
    } else if (error.message?.includes('insufficient funds')) {
      errorMessage = 'Insufficient PC balance for deployment';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Get contract instance
 */
export const getEventTicketContract = async (
  contractAddress: string
): Promise<ethers.Contract> => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  return new ethers.Contract(contractAddress, EventTicketArtifact.abi, signer);
};

/**
 * Mint a ticket
 */
export const mintTicket = async (
  contractAddress: string,
  ticketPrice: string
): Promise<string> => {
  try {
    const contract = await getEventTicketContract(contractAddress);
    const priceWei = ethers.parseEther(ticketPrice);
    
    const tx = await contract.mintTicket({ value: priceWei });
    const receipt = await tx.wait();
    
    return receipt.hash;
  } catch (error: any) {
    console.error('Error minting ticket:', error);
    throw new Error(error.message || 'Failed to mint ticket');
  }
};

/**
 * Get event details from contract
 */
export const getEventDetails = async (contractAddress: string) => {
  try {
    const contract = await getEventTicketContract(contractAddress);
    
    const [
      eventName,
      eventDate,
      eventVenue,
      venueAddress,
      maxSupply,
      ticketPrice,
      remainingTickets,
      totalSupply,
      eventCancelled,
      royaltyPercent,
    ] = await Promise.all([
      contract.eventName(),
      contract.eventDate(),
      contract.eventVenue(),
      contract.venueAddress(),
      contract.maxSupply(),
      contract.ticketPrice(),
      contract.getTicketsRemaining(),
      contract.totalSupply(),
      contract.eventCancelled(),
      contract.royaltyPercent(),
    ]);

    return {
      eventName,
      eventDate: Number(eventDate),
      eventVenue,
      venueAddress,
      maxSupply: Number(maxSupply),
      ticketPrice: ethers.formatEther(ticketPrice),
      remainingTickets: Number(remainingTickets),
      totalSupply: Number(totalSupply),
      eventCancelled,
      royaltyPercent: Number(royaltyPercent),
    };
  } catch (error) {
    console.error('Error getting event details:', error);
    throw new Error('Failed to fetch event details');
  }
};

/**
 * Check if user owns a ticket
 */
export const checkTicketOwnership = async (
  contractAddress: string,
  userAddress: string
): Promise<number[]> => {
  try {
    const contract = await getEventTicketContract(contractAddress);
    const balance = await contract.balanceOf(userAddress);
    const tokenIds: number[] = [];
    
    for (let i = 0; i < Number(balance); i++) {
      const tokenId = await contract.tokenOfOwnerByIndex(userAddress, i);
      tokenIds.push(Number(tokenId));
    }
    
    return tokenIds;
  } catch (error) {
    console.error('Error checking ticket ownership:', error);
    return [];
  }
};

export default {
  connectWallet,
  switchToPushChain,
  getBalance,
  deployEventTicket,
  mintTicket,
  getEventDetails,
  checkTicketOwnership,
  estimateDeploymentCost,
  isMetaMaskInstalled,
  PUSH_CHAIN_CONFIG,
};

export { PUSH_CHAIN_CONFIG };
