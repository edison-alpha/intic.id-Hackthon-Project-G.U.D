/**
 * LocalStorage User Management (Replacing Redis)
 * Based on Stackout's Redis implementation
 */

const USER_PREFIX = 'pulse:user:';
const WALLET_PREFIX = 'pulse:wallet:';

export type StoredUser = {
  userId: string;
  walletId: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Get user by userId from localStorage
 */
export const getUser = (userId: string): StoredUser | null => {
  try {
    const key = `${USER_PREFIX}${userId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

/**
 * Get user by walletAddress from localStorage
 */
export const getUserByAddress = (walletAddress: string): StoredUser | null => {
  try {
    const key = `${WALLET_PREFIX}${walletAddress}`;
    const userId = localStorage.getItem(key);
    if (!userId) return null;
    return getUser(userId);
  } catch (error) {
    console.error('Error getting user by address:', error);
    return null;
  }
};

/**
 * Create or update user in localStorage
 */
export const setUser = (user: StoredUser): void => {
  try {
    const now = new Date().toISOString();
    const userData = {
      ...user,
      updatedAt: now,
    };
    
    // Store by userId
    const userKey = `${USER_PREFIX}${user.userId}`;
    localStorage.setItem(userKey, JSON.stringify(userData));
    
    // Store wallet address mapping
    const walletKey = `${WALLET_PREFIX}${user.walletAddress}`;
    localStorage.setItem(walletKey, user.userId);
  } catch (error) {
    console.error('Error setting user:', error);
  }
};

/**
 * Get or create user (like Stackout's getOrCreateUser)
 */
export const getOrCreateUser = (
  userId: string,
  walletId: string,
  walletAddress: string,
): StoredUser => {
  let user = getUser(userId);
  
  if (!user) {
    const now = new Date().toISOString();
    user = {
      userId,
      walletId,
      walletAddress,
      createdAt: now,
      updatedAt: now,
    };
    setUser(user);
  } else if (user.walletId !== walletId || user.walletAddress !== walletAddress) {
    // Update if wallet changed
    user = {
      ...user,
      walletId,
      walletAddress,
    };
    setUser(user);
  }
  
  return user;
};

/**
 * Delete user from localStorage
 */
export const deleteUser = (userId: string): void => {
  try {
    const user = getUser(userId);
    if (user) {
      // Remove user data
      localStorage.removeItem(`${USER_PREFIX}${userId}`);
      // Remove wallet mapping
      localStorage.removeItem(`${WALLET_PREFIX}${user.walletAddress}`);
    }
  } catch (error) {
    console.error('Error deleting user:', error);
  }
};

/**
 * Clear all user data (for logout)
 */
export const clearAllUsers = (): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(USER_PREFIX) || key.startsWith(WALLET_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing users:', error);
  }
};
