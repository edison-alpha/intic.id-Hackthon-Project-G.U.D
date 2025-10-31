/**
 * IPFS Utility Service
 * Handles IPFS URL conversion and fetching with multiple gateway fallbacks
 * Solves CORS and rate limiting issues with Pinata gateway
 */

export interface IPFSFetchOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface IPFSGatewayResult {
  success: boolean;
  data?: any;
  error?: string;
  gateway?: string;
}

/**
 * Multiple IPFS gateways for fallback support
 * Ordered by reliability and CORS compatibility
 * Priority: Cloudflare subdomain (no CORS issues) > Path-style gateways
 */
const IPFS_GATEWAYS = [
  // Cloudflare subdomain gateway (recommended - no CORS issues)
  { type: 'subdomain', url: 'cf-ipfs.com' },
  // Path-style gateways (may have CORS issues) - use only as last resort
  { type: 'path', url: 'https://ipfs.io/ipfs/' },
  { type: 'path', url: 'https://gateway.pinata.cloud/ipfs/' },
  { type: 'path', url: 'https://dweb.link/ipfs/' },
  { type: 'path', url: 'https://ipfs.infura.io/ipfs/' },
  { type: 'path', url: 'https://gateway.ipfs.io/ipfs/' },
];

/**
 * Convert IPFS URI to HTTP gateway URL
 * Supports ipfs://, gateway URLs, and bare CIDs
 * Uses subdomain format for Cloudflare gateway (CORS-safe)
 */
export const convertIPFSToGateway = (ipfsUri: string, gatewayIndex: number = 0): string => {
  if (!ipfsUri) return '';

  let cid = '';

  if (ipfsUri.startsWith('ipfs://')) {
    cid = ipfsUri.replace('ipfs://', '');
  } else if (ipfsUri.includes('/ipfs/')) {
    // Extract CID from gateway URL
    const match = ipfsUri.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      cid = match[1];
    }
  } else if (ipfsUri.match(/^(Qm[a-zA-Z0-9]{44}|baf[a-zA-Z0-9]+)$/)) {
    // Bare CID
    cid = ipfsUri;
  } else {
    console.warn('Invalid IPFS URI format:', ipfsUri);
    return ipfsUri; // Return as-is if unrecognized
  }

  if (!cid) {
    console.warn('Could not extract CID from IPFS URI:', ipfsUri);
    return ipfsUri;
  }

  const gateway = IPFS_GATEWAYS[gatewayIndex];
  if (!gateway) {
    const fallbackGateway = IPFS_GATEWAYS[0];
    return fallbackGateway ? `https://${fallbackGateway.url}/ipfs/${cid}` : `https://ipfs.io/ipfs/${cid}`;
  }

  // Use subdomain format for Cloudflare (CORS-safe)
  if (gateway.type === 'subdomain') {
    return `https://${cid}.ipfs.${gateway.url}`;
  }

  // Use path format for other gateways
  return `${gateway.url}${cid}`;
};

/**
 * Fetch data from IPFS with automatic gateway fallback
 */
export const fetchFromIPFS = async (
  ipfsUri: string,
  options: IPFSFetchOptions = {}
): Promise<IPFSGatewayResult> => {
  const {
    timeout = 10000,
    retries = 3,
    retryDelay = 1000,
    headers = {}
  } = options;

  if (!ipfsUri) {
    return { success: false, error: 'Empty IPFS URI' };
  }

  // Try Cloudflare subdomain gateway first (CORS-safe)
  const cloudflareGateway = IPFS_GATEWAYS[0];
  if (cloudflareGateway && cloudflareGateway.type === 'subdomain') {
    const cloudflareUrl = convertIPFSToGateway(ipfsUri, 0);

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        console.log(`🔍 Trying Cloudflare gateway: ${cloudflareUrl}`);
        const response = await fetch(cloudflareUrl, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json, image/*, */*',
            // No custom headers to avoid CORS issues
            ...headers
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`✅ Cloudflare gateway succeeded`);
          try {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const data = await response.json();
              return { success: true, data, gateway: cloudflareGateway.url };
            } else {
              const data = await response.blob();
              return { success: true, data, gateway: cloudflareGateway.url };
            }
          } catch (parseError) {
            const data = await response.text();
            return { success: true, data, gateway: cloudflareGateway.url };
          }
        } else if (response.status === 429) {
          console.warn(`⚠️ Cloudflare gateway rate limited (429)`);
          break;
        } else {
          console.warn(`⚠️ Cloudflare gateway returned ${response.status}`);
          break;
        }
      } catch (error: any) {
        console.warn(`⚠️ Cloudflare gateway failed:`, error.message);
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
  }

  // Fallback to other gateways if Cloudflare fails
  console.log(`🔄 Cloudflare failed, trying fallback gateways...`);
  for (let gatewayIndex = 1; gatewayIndex < IPFS_GATEWAYS.length; gatewayIndex++) {
    const gateway = IPFS_GATEWAYS[gatewayIndex];
    if (!gateway) continue;

    const gatewayUrl = convertIPFSToGateway(ipfsUri, gatewayIndex);

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(gatewayUrl, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json, image/*, */*',
            // Removed 'Cache-Control': 'no-cache' to avoid CORS issues
            ...headers
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          try {
            // Try to parse as JSON first
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const data = await response.json();
              return { success: true, data, gateway: gateway.url };
            } else {
              // For images or other binary data, return the response
              const data = await response.blob();
              return { success: true, data, gateway: gateway.url };
            }
          } catch (parseError) {
            // If JSON parsing fails, return the response text
            const data = await response.text();
            return { success: true, data, gateway: gateway.url };
          }
        } else if (response.status === 429) {
          // Rate limited - try next gateway immediately
          console.warn(`⚠️ Gateway ${gateway.url} rate limited (429)`);
          break;
        } else if (response.status >= 500) {
          // Server error - retry with same gateway
          if (attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
          break; // Try next gateway
        } else {
          // Client error - try next gateway
          break;
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn(`⚠️ Gateway ${gateway.url} timeout after ${timeout}ms`);
        } else {
          console.warn(`⚠️ Gateway ${gateway.url} failed:`, error.message);
        }

        // Wait before retry
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
  }

  return {
    success: false,
    error: `Failed to fetch from all ${IPFS_GATEWAYS.length} gateways`
  };
};

/**
 * Fetch JSON metadata from IPFS
 */
export const fetchIPFSMetadata = async (
  ipfsUri: string,
  options: IPFSFetchOptions = {}
): Promise<any | null> => {
  try {
    const result = await fetchFromIPFS(ipfsUri, {
      ...options,
      headers: { 'Accept': 'application/json', ...options.headers }
    });

    if (result.success && typeof result.data === 'object') {
      return result.data;
    }

    console.error('❌ Failed to fetch IPFS metadata:', result.error);
    return null;
  } catch (error) {
    console.error('❌ Error fetching IPFS metadata:', error);
    return null;
  }
};

/**
 * Get IPFS image URL with fallback gateway
 * Returns the first working gateway URL for images
 * Prioritizes Cloudflare subdomain gateway for CORS safety
 */
export const getIPFSImageUrl = async (
  ipfsUri: string,
  options: IPFSFetchOptions = {}
): Promise<string | null> => {
  if (!ipfsUri) return null;

  // Try Cloudflare subdomain gateway first (CORS-safe)
  const cloudflareGateway = IPFS_GATEWAYS[0];
  if (cloudflareGateway && cloudflareGateway.type === 'subdomain') {
    const cloudflareUrl = convertIPFSToGateway(ipfsUri, 0);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // Quick check for Cloudflare

      console.log(`🔍 Checking Cloudflare gateway for image: ${cloudflareUrl}`);
      const response = await fetch(cloudflareUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'Accept': 'image/*',
          // No custom headers to avoid CORS issues
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`✅ Cloudflare gateway has image`);
        return cloudflareUrl;
      }
    } catch (error) {
      console.warn(`⚠️ Cloudflare gateway check failed:`, error);
    }
  }

  // Fallback to other gateways
  console.log(`🔄 Cloudflare not available, checking fallback gateways...`);
  for (let gatewayIndex = 1; gatewayIndex < IPFS_GATEWAYS.length; gatewayIndex++) {
    const gatewayUrl = convertIPFSToGateway(ipfsUri, gatewayIndex);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(gatewayUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'Accept': 'image/*',
          // Removed Cache-Control header to avoid CORS issues
          ...options.headers
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return gatewayUrl;
      }
    } catch (error) {
      // Continue to next gateway
      continue;
    }
  }

  // If all gateways fail, return Cloudflare as fallback (most reliable)
  console.log(`⚠️ All gateways failed, using Cloudflare as fallback`);
  return convertIPFSToGateway(ipfsUri, 0);
};

/**
 * Convert IPFS URI to multiple gateway URLs for redundancy
 */
export const getIPFSGatewayUrls = (ipfsUri: string): string[] => {
  if (!ipfsUri) return [];

  return IPFS_GATEWAYS.map((_, index) => convertIPFSToGateway(ipfsUri, index));
};

/**
 * Validate IPFS CID format
 */
export const isValidIPFSCid = (cid: string): boolean => {
  if (!cid) return false;

  // Check for Qm... (IPFS v0) or baf... (IPFS v1) CIDs
  return /^(Qm[a-zA-Z0-9]{44}|baf[a-zA-Z0-9]+)$/.test(cid);
};

/**
 * Extract CID from IPFS URI
 */
export const extractIPFSCid = (ipfsUri: string): string | null => {
  if (!ipfsUri) return null;

  if (ipfsUri.startsWith('ipfs://')) {
    return ipfsUri.replace('ipfs://', '');
  }

  if (ipfsUri.includes('/ipfs/')) {
    const match = ipfsUri.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    return match && match[1] ? match[1] : null;
  }

  if (isValidIPFSCid(ipfsUri)) {
    return ipfsUri;
  }

  return null;
};

export default {
  convertIPFSToGateway,
  fetchFromIPFS,
  fetchIPFSMetadata,
  getIPFSImageUrl,
  getIPFSGatewayUrls,
  isValidIPFSCid,
  extractIPFSCid,
};