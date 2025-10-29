/**
 * Universal Ticket Deployment Service
 * Deploy EventTicketV3 contracts using Push Chain Universal Transactions
 * Allows deployment from ANY supported blockchain
 */

import { ethers } from 'ethers';
import { toast } from 'sonner';
import { CONTRACTS } from '@/config/contracts';
import EventTicketArtifact from '@/contracts/EventTicket.json';

/**
 * Deploy EventTicket contract using Push Chain Universal Transaction
 * @param pushChainClient Push Chain client instance
 * @param PushChain Push Chain utilities
 * @param params Event parameters
 * @returns Transaction details
 */
export const deployEventTicketUniversal = async (
  pushChainClient: any,
  PushChain: any,
  params: {
    eventName: string;
    nftSymbol: string;
    totalSupply: number;
    ticketPrice: string; // In PC
    eventDate: number; // Unix timestamp
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
  contractAddress?: string | undefined;
  blockNumber?: number | undefined;
}> => {
  if (!pushChainClient || !PushChain) {
    throw new Error('Push Chain client not initialized. Please connect wallet first.');
  }

  try {
    console.log('🚀 Deploying EventTicket with universal transaction...');
    console.log('📊 Parameters:', params);
    console.log('🔗 Push Chain Client:', pushChainClient ? 'Connected ✅' : 'Not Connected ❌');
    console.log('🔗 Universal API:', pushChainClient?.universal ? 'Available ✅' : 'Not Available ❌');

    // STEP 0: Convert all numeric values to BigInt for consistency
    const ticketPriceWei = ethers.parseEther(params.ticketPrice.toString());
    
    console.log('🔢 Converting parameters to BigInt for encoding...');
    console.log('   - totalSupply:', params.totalSupply);
    console.log('   - ticketPrice:', params.ticketPrice, 'PC');
    console.log('   - ticketPriceWei:', ticketPriceWei.toString());
    console.log('   - eventDate:', params.eventDate);

    // Prepare constructor parameters for EventTicketV3
    // constructor(
    //   uint256 _totalSupply,              // 1
    //   uint256 _ticketPrice,              // 2
    //   string memory _nftName,            // 3
    //   string memory _nftSymbol,          // 4
    //   string memory _eventName,          // 5
    //   uint256 _eventDate,                // 6
    //   string memory _eventVenue,         // 7
    //   string memory _venueAddress,       // 8
    //   string memory _venueCoordinates,   // 9
    //   string memory _eventImageUri,      // 10
    //   string memory _metadataUri,        // 11
    //   address _eventOrganizerContract,   // 12
    //   string memory _eventDescription    // 13
    // )
    
    // Get EventOrganizer address (MUST exist!)
    const eventOrganizerAddress = CONTRACTS.testnet.EventOrganizer;
    if (!eventOrganizerAddress || eventOrganizerAddress === '') {
      throw new Error('EventOrganizer contract address not configured. Please check src/config/contracts.ts');
    }

    console.log('✅ EventOrganizer address:', eventOrganizerAddress);

    // IMPORTANT: Convert all uint256 parameters to BigInt to avoid mixing types
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

    // ============================================
    // STEP 1: Get bytecode dari EventTicket.json artifact
    // ============================================
    console.log('📦 STEP 1: Getting contract bytecode from artifact...');
    const bytecode = EventTicketArtifact.bytecode;

    if (!bytecode || bytecode === '0x') {
      throw new Error('Contract bytecode not found in artifact. Please compile the contract first.');
    }
    console.log('✅ Bytecode loaded. Length:', bytecode.length);

    // ============================================
    // STEP 2: Extract constructor ABI & parameter types
    // ============================================
    console.log('🔍 STEP 2: Extracting constructor ABI...');
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    
    // Get constructor ABI
    const constructorAbi = EventTicketArtifact.abi.find(
      (item: any) => item.type === 'constructor'
    );

    if (!constructorAbi) {
      throw new Error('Constructor ABI not found in artifact');
    }

    // Extract parameter types from constructor ABI
    const paramTypes = constructorAbi.inputs.map((input: any) => input.type);
    
    console.log('✅ Constructor parameter types:', paramTypes);

    // ============================================
    // STEP 3: Encode constructor parameters dengan ethers.AbiCoder
    // ============================================
    console.log('🔧 STEP 3: Encoding constructor parameters...');
    
    let encodedConstructor: string;
    try {
      encodedConstructor = abiCoder.encode(paramTypes, constructorArgs);
      console.log('✅ Constructor encoded. Length:', encodedConstructor.length);
    } catch (encodeError: any) {
      console.error('❌ ENCODING ERROR:', encodeError);
      console.error('❌ Constructor args that failed:', constructorArgs);
      console.error('❌ Parameter types:', paramTypes);
      throw new Error(`Failed to encode constructor parameters: ${encodeError.message}`);
    }

    // ============================================
    // STEP 4: Combine bytecode + encodedConstructor (tanpa 0x)
    // ============================================
    console.log('🔗 STEP 4: Combining bytecode + encoded constructor...');
    const deploymentData = bytecode + encodedConstructor.slice(2); // Remove 0x prefix

    console.log('✅ Deployment data ready!');
    console.log('   - Bytecode length:', bytecode.length);
    console.log('   - Encoded params length:', encodedConstructor.length - 2); // -2 for 0x
    console.log('   - Total deployment data length:', deploymentData.length);

    // ============================================
    // STEP 5: Send via pushChainClient.universal.sendTransaction
    // ============================================
    console.log('📤 STEP 5: Sending deployment transaction via Universal Transaction...');
    console.log('   - Deploying to: Push Chain (42101)');
    console.log('   - From: Any connected blockchain');
    console.log('   - Gas will be paid in your connected chain\'s native token');
    console.log('   - Deployment data length:', deploymentData.length);
    
    // For contract deployment, DO NOT include 'to' field at all!
    // Data contains bytecode + constructor params
    // IMPORTANT: value MUST be BigInt for viem compatibility
    let tx: any;
    try {
      console.log('📤 Calling sendTransaction with:');
      console.log('   - to: (not included - contract deployment)');
      console.log('   - data:', deploymentData.slice(0, 66) + '...');
      console.log('   - value:', BigInt(0));
      
      // For contract deployment: OMIT 'to' field completely (not null, not undefined!)
      // Push Chain SDK will detect contract deployment from absence of 'to' field
      tx = await pushChainClient.universal.sendTransaction({
        data: deploymentData,
        value: BigInt(0), // No value for deployment (MUST be BigInt!)
        // DO NOT include 'to' field for contract deployment!
      });
      
      console.log('✅ sendTransaction successful!');
    } catch (txError: any) {
      console.error('❌ TRANSACTION SEND ERROR:', txError);
      console.error('❌ Error message:', txError?.message);
      console.error('❌ Error code:', txError?.code);
      throw new Error(`Failed to send deployment transaction: ${txError.message}`);
    }

    console.log('✅ Transaction sent successfully!');
    console.log('   - TX:', tx);
    console.log('   - TX Hash:', tx?.hash || tx?.transactionHash || 'Pending...');

    // ============================================
    // STEP 6: Wait for receipt & extract contract address
    // ============================================
    console.log('⏳ STEP 6: Waiting for transaction confirmation...');
    const receipt = await tx.wait();

    console.log('✅ Transaction confirmed!');
    console.log('   - Block Number:', receipt?.blockNumber);
    console.log('   - Gas Used:', receipt?.gasUsed?.toString());
    console.log('   - Status:', receipt?.status === 1 ? 'Success ✅' : 'Failed ❌');

    // Extract transaction hash
    const txHash = receipt?.hash || receipt?.transactionHash || tx?.hash || tx?.transactionHash;

    // Extract contract address from receipt
    let deployedContractAddress: string | undefined;

    if (receipt?.contractAddress) {
      deployedContractAddress = receipt.contractAddress;
      console.log('✅ Contract address found in receipt.contractAddress');
    } else if (receipt?.logs && receipt.logs.length > 0) {
      // Try to extract from logs
      console.log('📋 Trying to extract contract address from logs...');
      deployedContractAddress = receipt.logs[0]?.address;
      console.log('✅ Contract address extracted from logs');
    } else {
      console.warn('⚠️ Contract address not found in receipt. May need to calculate from deployer address + nonce.');
    }

    // Final success message
    console.log('\n' + '='.repeat(60));
    console.log('🎉 CONTRACT DEPLOYED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('📍 Contract Address:', deployedContractAddress || 'Not available in receipt');
    console.log('🔍 Transaction Hash:', txHash);
    console.log('🌐 Network: Push Chain Testnet (42101)');
    console.log('🔗 Explorer: https://testnet.explorer.push.org/tx/' + txHash);
    console.log('='.repeat(60) + '\n');

    // Show success toast
    toast.success('Contract Deployed Successfully! 🎉', {
      description: `Event contract deployed to Push Chain. TX: ${txHash?.slice(0, 10)}...`,
      duration: 5000,
    });

    return {
      transactionHash: txHash || '',
      contractAddress: deployedContractAddress,
      blockNumber: receipt?.blockNumber ? Number(receipt.blockNumber) : undefined,
    };
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

    // Check if it's an address validation error
    if (error.message?.includes('Address') && error.message?.includes('invalid')) {
      console.error('🔍 Address validation error detected!');
      console.error('📋 Checking constructor args:');
      
      const eventOrganizerAddress = CONTRACTS.testnet.EventOrganizer;
      console.error('   - EventOrganizer address:', eventOrganizerAddress);
      console.error('   - Is valid?', eventOrganizerAddress && eventOrganizerAddress.match(/^0x[a-fA-F0-9]{40}$/));
      
      toast.error('Configuration Error', {
        description: 'EventOrganizer contract address is not properly configured. Please check contracts.ts',
      });
      throw new Error('Invalid EventOrganizer contract address. Please update src/config/contracts.ts');
    }

    // Handle user rejection
    if (error.message?.includes('rejected') || error.message?.includes('denied') || error.message?.includes('cancel')) {
      toast.error('Transaction Cancelled', {
        description: 'You rejected the transaction',
      });
      throw new Error('Transaction rejected by user');
    }

    // Handle insufficient balance
    if (error.message?.includes('insufficient funds') || error.message?.includes('insufficient balance')) {
      toast.error('Insufficient Balance', {
        description: 'You don\'t have enough balance to deploy the contract',
      });
      throw new Error('Insufficient balance for contract deployment');
    }

    // Handle network errors
    if (error.message?.includes('network') || error.message?.includes('connection')) {
      toast.error('Network Error', {
        description: 'Please check your internet connection and try again',
      });
      throw new Error('Network error during deployment');
    }

    // Generic error
    toast.error('Deployment Failed', {
      description: error.message || 'An unknown error occurred',
    });

    throw new Error(error.message || 'Failed to deploy EventTicket contract');
  }
};

export default {
  deployEventTicketUniversal,
};
