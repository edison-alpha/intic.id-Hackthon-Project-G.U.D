/**
 * useUser Hook (Stackout Pattern) - DISABLED
 * Manages wallet, balances, and user data with React Query
 */

export const useUser = () => {
  // Mock implementation - wallet functionality via PushChain
  return {
    // Wallet info - disabled
    wallet: null,
    walletId: null,
    userOrgId: null,
    walletLoading: false,
    walletError: null,

    // User info - disabled
    user: null,
    userLoading: false,
    userError: null,

    // Balances - disabled
    balances: null,
    balancesLoading: false,
    balancesError: null,

    // Combined loading state
    isLoading: false,

    // Combined error state
    error: null,

    // Refresh function - disabled
    refresh: async () => {
    },
  };
};

export type UseUserResult = ReturnType<typeof useUser>;
