/**
 * Direct Ticket Deployment Service
 * Deploy EventTicketV3 contracts DIRECTLY to Push Chain
 * Using standard ethers.js ContractFactory
 * 
 * This is a fallback when Universal Transaction doesn't support contract deployment
 */

import { ethers } from 'ethers';
import { toast } from 'sonner';
import { CONTRACTS } from '@/config/contracts';
import EventTicketArtifact from '@/contracts/EventTicket.json';

/**
 * Deploy EventTicket contract directly to Push Chain
 * User must have wallet connected to Push Chain Testnet
 * @param signer Ethers signer (connected to Push Chain)
 * @param params Event parameters
 * @returns Transaction details
 */
export const deployEventTicketDirect = async (
  signer: ethers.Signer,
  params: {
    eventName: string;
    nftSymbol: string;
    totalSupply: number;
    ticketPrice: string; // In PC
    eventDate: number; // Unix timestamp in SECONDS (not milliseconds!)
    venue: string;
    venueAddress: string;
    venueCoordinates?: string;
    description: string;
    metadataUri: string;
    contentHash: string;
    eventImageUri?: string;
    royaltyPercent?: number; // Default 250 = 2.5%
  }
): Promise<{
  transactionHash: string;
  contractAddress?: string;
  blockNumber?: number;
}> => {
  if (!signer) {
    throw new Error('Signer not provided. Please connect your wallet to Push Chain.');
  }

  try {
    console.log('🚀 Deploying EventTicket DIRECTLY to Push Chain...');
    console.log('📊 Parameters:', params);
    
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
    const ticketPriceWei = ethers.parseEther(params.ticketPrice.toString());
    
    console.log('🔢 Converting parameters to BigInt for encoding...');
    console.log('   - totalSupply:', params.totalSupply);
    console.log('   - ticketPrice:', params.ticketPrice, 'PC');
    console.log('   - ticketPriceWei:', ticketPriceWei.toString());
    console.log('   - eventDate (seconds):', params.eventDate);
    console.log('   - eventDate verification:', new Date(params.eventDate * 1000).toLocaleString());

    // Get EventOrganizer address
    const eventOrganizerAddress = CONTRACTS.testnet.EventOrganizer;
    if (!eventOrganizerAddress || eventOrganizerAddress === '') {
      throw new Error('EventOrganizer contract address not configured. Please check src/config/contracts.ts');
    }

    console.log('✅ EventOrganizer address:', eventOrganizerAddress);

    // Prepare constructor arguments (all uint256 as BigInt!)
    const constructorArgs = [
      BigInt(params.totalSupply),                   // 1. uint256 _totalSupply
      ticketPriceWei,                              // 2. uint256 _ticketPrice (already BigInt)
      params.eventName,                             // 3. string _nftName
      params.nftSymbol,                             // 4. string _nftSymbol
      params.eventName,                             // 5. string _eventName
      BigInt(params.eventDate),                     // 6. uint256 _eventDate
      params.venue,                                 // 7. string _eventVenue
      params.venueAddress,                          // 8. string _venueAddress
      params.venueCoordinates || '',                // 9. string _venueCoordinates
      params.eventImageUri || '',                   // 10. string _eventImageUri
      params.metadataUri,                           // 11. string _metadataUri
      eventOrganizerAddress,                        // 12. address _eventOrganizerContract
      params.description,                           // 13. string _eventDescription
    ];

    console.log('📝 Constructor args (13 params):', constructorArgs);

    // Create ContractFactory
    console.log('🏭 Creating ContractFactory...');
    const factory = new ethers.ContractFactory(
      EventTicketArtifact.abi,
      EventTicketArtifact.bytecode,
      signer
    );

    console.log('✅ ContractFactory created');

    // Estimate gas
    console.log('⛽ Estimating gas...');
    let gasEstimate;
    try {
      const deployTx = await factory.getDeployTransaction(...constructorArgs);
      gasEstimate = await signer.estimateGas(deployTx);
      console.log('✅ Gas estimate:', gasEstimate.toString());
    } catch (gasError: any) {
      console.warn('⚠️ Gas estimation failed:', gasError.message);
      gasEstimate = BigInt(5000000); // Fallback to 5M gas
      console.log('⚠️ Using fallback gas limit:', gasEstimate.toString());
    }

    // Deploy contract
    console.log('🚀 Deploying contract...');
    console.log('   - Gas Limit:', gasEstimate.toString());
    
    const contract = await factory.deploy(...constructorArgs, {
      gasLimit: gasEstimate,
    });

    console.log('✅ Contract deployment transaction sent!');
    console.log('   - Contract (pending):', contract.target);
    console.log('   - Deployment TX:', contract.deploymentTransaction()?.hash);

    // Wait for deployment
    console.log('⏳ Waiting for deployment confirmation...');
    const deployedContract = await contract.waitForDeployment();
    
    const contractAddress = await deployedContract.getAddress();
    const deployTx = contract.deploymentTransaction();
    const receipt = await deployTx?.wait();

    console.log('✅ Contract deployed successfully!');
    console.log('📍 Contract Address:', contractAddress);
    console.log('🔍 Transaction Hash:', deployTx?.hash);
    console.log('📦 Block Number:', receipt?.blockNumber);

    // Show success toast
    toast.success('Contract Deployed Successfully! 🎉', {
      description: `Event contract deployed to Push Chain. Address: ${contractAddress.slice(0, 10)}...`,
      duration: 5000,
    });

    const result: {
      transactionHash: string;
      contractAddress?: string;
      blockNumber?: number;
    } = {
      transactionHash: deployTx?.hash || '',
    };

    if (contractAddress) {
      result.contractAddress = contractAddress;
    }

    if (receipt?.blockNumber) {
      result.blockNumber = Number(receipt.blockNumber);
    }

    return result;
  } catch (error: any) {
    console.error('❌ Deployment error:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Full error object:', JSON.stringify(error, null, 2));
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      data: error.data,
      stack: error.stack,
    });

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
        description: 'You don\'t have enough PC for gas fees',
      });
      throw new Error('Insufficient PC balance for gas fees');
    }

    // Generic error
    toast.error('Deployment Failed', {
      description: error.message || 'An unknown error occurred',
    });
    throw error;
  }
};
