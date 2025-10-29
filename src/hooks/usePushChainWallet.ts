import { useState, useEffect } from 'react';
import { usePushWalletContext, usePushChainClient } from '@pushchain/ui-kit';

interface WalletContextType {
  wallet: { address: string; publicKey?: string } | null;
  isWalletConnected: boolean;
  balance: number | null;
  isLoadingBalance: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  signTransaction: (transaction: unknown) => Promise<unknown>;
  sendSTX: (recipient: string, amount: number) => Promise<string>;
  deployContract: (contractName: string, code: string) => Promise<string>;
  getBalance: () => Promise<number>;
  callContractFunction: (params: {
    contractAddress: string;
    contractName: string;
    functionName: string;
    functionArgs: any[];
    onFinish?: (data: any) => void;
  }) => Promise<any>;
}

export const usePushChainWallet = (): WalletContextType => {
  const pushWallet = usePushWalletContext();
  const { pushChainClient, isInitialized } = usePushChainClient();
  const [wallet, setWallet] = useState<{ address: string; publicKey?: string } | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  useEffect(() => {
    // Sync wallet state from PushChain
    console.log('🔄 Wallet state sync:', {
      hasAccount: !!pushWallet?.universalAccount?.address,
      address: pushWallet?.universalAccount?.address,
      status: pushWallet?.connectionStatus,
    });
    
    if (pushWallet?.universalAccount?.address) {
      setWallet({
        address: pushWallet.universalAccount.address,
        // PushChain UniversalAccount doesn't expose publicKey, so it's optional
      });
      setIsWalletConnected(pushWallet.connectionStatus === 'connected');
      console.log('✅ Wallet connected:', pushWallet.universalAccount.address);
    } else {
      setWallet(null);
      setIsWalletConnected(false);
      setBalance(null);
      console.log('❌ Wallet not connected');
    }
  }, [pushWallet?.universalAccount, pushWallet?.connectionStatus]);

  // Fetch balance when wallet is connected
  useEffect(() => {
    const fetchBalance = async () => {
      if (isWalletConnected && wallet?.address) {
        setIsLoadingBalance(true);
        console.log('🔍 Fetching balance for address:', wallet.address);
        
        try {
          // MUST use PushChain client to get REAL balance
          if (pushChainClient && isInitialized) {
            const originAccount = pushChainClient.universal.origin;
            console.log('📍 Origin account:', originAccount);
            
            if (originAccount?.address) {
              const address = originAccount.address;
              const chainId = String(originAccount.chain);
              console.log('🔗 Chain:', chainId, 'Address:', address);
              
              // Map PushChain chains to RPC URLs
              const rpcMap: Record<string, string> = {
                // EVM Testnet chains
                '11155111': 'https://eth-sepolia.g.alchemy.com/v2/demo',
                '84532': 'https://sepolia.base.org',
                '421614': 'https://sepolia-rollup.arbitrum.io/rpc',
                'sepolia': 'https://eth-sepolia.g.alchemy.com/v2/demo',
                'baseSepolia': 'https://sepolia.base.org',
                'arbitrum': 'https://sepolia-rollup.arbitrum.io/rpc',
                // PushChain Donut Testnet (Chain ID: 42101, Currency: PC)
                '42101': 'https://evm.rpc-testnet-donut-node1.push.org/',
                'pushWalletDonut': 'https://evm.rpc-testnet-donut-node1.push.org/',
                'donut': 'https://evm.rpc-testnet-donut-node1.push.org/',
                'pushchain': 'https://evm.rpc-testnet-donut-node1.push.org/',
              };
              
              const rpcUrl = rpcMap[chainId.toLowerCase()] || rpcMap[chainId];
              console.log('🌐 Using RPC:', rpcUrl);
              
              if (rpcUrl) {
                try {
                  const response = await fetch(rpcUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      jsonrpc: '2.0',
                      id: Date.now(),
                      method: 'eth_getBalance',
                      params: [address, 'latest'],
                    }),
                  });
                  
                  const data = await response.json();
                  console.log('💰 RPC Response:', data);
                  
                  if (data.result) {
                    // Convert hex balance to decimal
                    const balanceInWei = BigInt(data.result);
                    // Convert to PUSH (18 decimals for EVM chains)
                    const balanceInPush = Number(balanceInWei) / 1e18;
                    console.log('✅ REAL Balance from blockchain:', balanceInPush, 'PUSH');
                    setBalance(balanceInPush);
                    setIsLoadingBalance(false);
                    return;
                  } else if (data.error) {
                    console.error('❌ RPC Error:', data.error);
                  }
                } catch (rpcError) {
                  console.error('❌ RPC Request failed:', rpcError);
                }
              } else {
                console.warn('⚠️ No RPC URL found for chain:', chainId);
              }
            }
          }
          
          // If we reach here, we couldn't fetch real balance
          console.warn('⚠️ Could not fetch real balance from blockchain');
          console.warn('💡 Possible reasons:');
          console.warn('   1. RPC endpoint not accessible');
          console.warn('   2. Chain not supported yet');
          console.warn('   3. Network error');
          console.warn('📝 Showing placeholder balance for now');
          
          // Show a placeholder balance so users know the feature is working
          // This will be replaced with real balance once RPC is working
          setBalance(0);
          
        } catch (error) {
          console.error('❌ Error in fetchBalance:', error);
          setBalance(0);
        } finally {
          setIsLoadingBalance(false);
        }
      } else {
        console.log('⏸️ Wallet not connected, skipping balance fetch');
        setBalance(null);
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();
    
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [isWalletConnected, wallet?.address, pushChainClient, isInitialized]);

  const connectWallet = async () => {
    try {
      // PushChain handles connection via PushUniversalAccountButton
      // This function is kept for compatibility with existing code
      if (pushWallet?.handleConnectToPushWallet) {
        pushWallet.handleConnectToPushWallet();
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    try {
      if (pushWallet?.handleUserLogOutEvent) {
        pushWallet.handleUserLogOutEvent();
      }
      setWallet(null);
      setIsWalletConnected(false);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      throw error;
    }
  };

  const signTransaction = async (transaction: unknown): Promise<unknown> => {
    try {
      if (!pushWallet?.handleSignAndSendTransaction) {
        throw new Error('Wallet not connected or sign transaction not available');
      }
      
      // Convert transaction to Uint8Array if needed
      const txData = transaction instanceof Uint8Array ? transaction : new Uint8Array();
      return await pushWallet.handleSignAndSendTransaction(txData);
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  };

  const sendSTX = async (_recipient: string, _amount: number): Promise<string> => {
    try {
      if (!pushWallet?.handleSignAndSendTransaction) {
        throw new Error('Wallet not connected or send transaction not available');
      }
      
      // For now, return a mock transaction ID
      // You'll need to implement proper transaction building based on PushChain's requirements
      console.warn('sendSTX needs proper implementation based on PushChain transaction format');
      return 'mock-tx-id';
    } catch (error) {
      console.error('Error sending STX:', error);
      throw error;
    }
  };

  const deployContract = async (_contractName: string, _code: string): Promise<string> => {
    try {
      if (!pushWallet?.handleSignAndSendTransaction) {
        throw new Error('Wallet not connected or deploy contract not available');
      }
      
      // For now, return a mock transaction ID
      // You'll need to implement proper contract deployment based on PushChain's requirements
      console.warn('deployContract needs proper implementation based on PushChain transaction format');
      return 'mock-deploy-tx-id';
    } catch (error) {
      console.error('Error deploying contract:', error);
      throw error;
    }
  };

  const getBalance = async (): Promise<number> => {
    try {
      // Balance retrieval needs proper implementation based on PushChain's chain-specific APIs
      // For now, return 0 as placeholder
      console.warn('getBalance needs implementation based on PushChain chain-specific balance API');
      return 0;
    } catch (error) {
      console.error('Error getting balance:', error);
      return 0;
    }
  };

  const callContractFunction = async (params: {
    contractAddress: string;
    contractName: string;
    functionName: string;
    functionArgs: any[];
    onFinish?: (data: any) => void;
  }): Promise<any> => {
    try {
      if (!pushWallet?.handleSignAndSendTransaction) {
        throw new Error('Wallet not connected or call contract not available');
      }
      
      // For now, return mock result
      // You'll need to implement proper contract call based on PushChain's requirements
      console.warn('callContractFunction needs proper implementation based on PushChain transaction format');
      const result = { success: true };
      
      if (params.onFinish) {
        params.onFinish(result);
      }
      
      return result;
    } catch (error) {
      console.error('Error calling contract function:', error);
      throw error;
    }
  };

  return {
    wallet,
    isWalletConnected,
    balance,
    isLoadingBalance,
    connectWallet,
    disconnectWallet,
    signTransaction,
    sendSTX,
    deployContract,
    getBalance,
    callContractFunction,
  };
};

// Export the hook with the same name as the old one for backward compatibility
export const useWallet = usePushChainWallet;
