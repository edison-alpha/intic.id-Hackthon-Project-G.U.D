/**
 * Request Manager
 * Prevents duplicate requests, implements caching, rate limiting, and retry logic
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
}

interface RequestConfig {
  cacheTTL?: number; // Cache time-to-live in ms
  maxRetries?: number; // Max retry attempts
  retryDelay?: number; // Initial retry delay in ms
  deduplicate?: boolean; // Deduplicate identical requests
}

class RequestManager {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 250; // Min 250ms between requests

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();

  }

  /**
   * Clear specific cache entry
   */
  clearCacheKey(key: string) {
    this.cache.delete(key);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      pending: this.pendingRequests.size,
      queued: this.requestQueue.length,
    };
  }

  /**
   * Process request queue with rate limiting
   */
  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      // Rate limiting: Wait if we're going too fast
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        await this.delay(this.MIN_REQUEST_INTERVAL - timeSinceLastRequest);
      }

      const request = this.requestQueue.shift();
      if (request) {
        try {
          this.lastRequestTime = Date.now();
          await request();
        } catch (error) {
          console.warn('Queue request failed:', error);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute request with caching, deduplication, and retry logic
   */
  async request<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      cacheTTL = 60000, // Default 1 minute
      maxRetries = 3,
      retryDelay = 1000,
      deduplicate = true,
    } = config;

    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTTL) {

      return cached.data as T;
    }

    // Check if same request is already pending (deduplication)
    if (deduplicate) {
      const pending = this.pendingRequests.get(key);
      if (pending) {

        return pending as Promise<T>;
      }
    }

    // Create new request with retry logic
    const requestPromise = this.executeWithRetry(fetcher, maxRetries, retryDelay);

    // Store as pending
    this.pendingRequests.set(key, requestPromise);

    try {
      const data = await requestPromise;

      // Cache the result
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
      });

      return data;
    } finally {
      // Remove from pending
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Execute request with exponential backoff retry
   */
  private async executeWithRetry<T>(
    fetcher: () => Promise<T>,
    maxRetries: number,
    initialDelay: number
  ): Promise<T> {
    let lastError: any;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fetcher();
      } catch (error: any) {
        lastError = error;

        // Don't retry on certain errors
        if (error.message?.includes('404') || error.message?.includes('not found')) {
          throw error;
        }

        // If it's a rate limit error (429), wait longer
        const isRateLimit = error.message?.includes('429') ||
                           error.message?.includes('Too Many Requests');

        if (isRateLimit) {
          const rateLimitDelay = Math.min(delay * Math.pow(2, attempt), 10000);
          console.warn(`⏳ [RequestManager] Rate limited, retrying in ${rateLimitDelay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          await this.delay(rateLimitDelay);
        } else if (attempt < maxRetries) {
          // Exponential backoff for other errors
          const backoffDelay = delay * Math.pow(1.5, attempt);
          console.warn(`⚠️ [RequestManager] Request failed, retrying in ${backoffDelay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          await this.delay(backoffDelay);
        }
      }
    }

    console.error(`❌ [RequestManager] Request failed after ${maxRetries + 1} attempts`);
    throw lastError;
  }

  /**
   * Batch multiple requests
   */
  async batchRequest<T>(
    requests: Array<{
      key: string;
      fetcher: () => Promise<T>;
      config?: RequestConfig;
    }>
  ): Promise<T[]> {

    // Process requests with staggered timing to avoid rate limits
    const results: T[] = [];

    for (const { key, fetcher, config } of requests) {
      const result = await this.request(key, fetcher, config);
      results.push(result);

      // Small delay between batch items
      await this.delay(100);
    }

    return results;
  }

  /**
   * Prefetch data (fire and forget)
   */
  prefetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    config?: RequestConfig
  ): void {
    // Don't await, just start the request
    this.request(key, fetcher, config).catch(err => {
      console.warn(`Prefetch failed for ${key}:`, err);
    });
  }
}

// Export singleton instance
export const requestManager = new RequestManager();

// Helper function for common API requests
export async function cachedFetch<T>(
  url: string,
  options: RequestInit = {},
  cacheTTL: number = 60000
): Promise<T> {
  const key = `fetch:${url}:${JSON.stringify(options)}`;

  return requestManager.request(
    key,
    async () => {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    { cacheTTL, deduplicate: true, maxRetries: 3, retryDelay: 1000 }
  );
}
