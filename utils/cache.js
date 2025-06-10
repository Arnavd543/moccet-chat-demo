/**
 * Cache Utility
 * Simple in-memory caching for AI responses
 */

// In-memory cache store
const cache = new Map();

// Cache configuration
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 1000; // Maximum number of entries

/**
 * Clean up expired cache entries
 */
function cleanupCache() {
  const now = Date.now();
  let deletedCount = 0;

  for (const [key, value] of cache.entries()) {
    if (now > value.expiry) {
      cache.delete(key);
      deletedCount++;
    }
  }

  // If cache is still too large, remove oldest entries
  if (cache.size > MAX_CACHE_SIZE) {
    const sortedEntries = Array.from(cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toDelete = sortedEntries.slice(0, cache.size - MAX_CACHE_SIZE);
    toDelete.forEach(([key]) => cache.delete(key));
  }

  return deletedCount;
}

/**
 * Get a cached response
 * @param {string} key - Cache key
 * @returns {Object|null} Cached data or null if not found/expired
 */
async function getCachedResponse(key) {
  cleanupCache();

  const cached = cache.get(key);
  if (!cached) {
    return null;
  }

  // Check if expired
  if (Date.now() > cached.expiry) {
    cache.delete(key);
    return null;
  }

  // Update hit count
  cached.hits++;
  cached.lastAccessed = Date.now();

  return cached.data;
}

/**
 * Set a cached response
 * @param {string} key - Cache key
 * @param {Object} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds (optional)
 */
async function setCachedResponse(key, data, ttl = CACHE_TTL) {
  cleanupCache();

  const cacheEntry = {
    data,
    timestamp: Date.now(),
    expiry: Date.now() + ttl,
    hits: 0,
    lastAccessed: Date.now(),
  };

  cache.set(key, cacheEntry);
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
function getCacheStats() {
  cleanupCache();

  let totalHits = 0;
  let totalSize = 0;

  for (const value of cache.values()) {
    totalHits += value.hits;
    totalSize += JSON.stringify(value.data).length;
  }

  return {
    entries: cache.size,
    totalHits,
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    maxEntries: MAX_CACHE_SIZE,
  };
}

/**
 * Clear all cache entries
 */
function clearCache() {
  cache.clear();
}

// Export functions
module.exports = {
  getCachedResponse,
  setCachedResponse,
  getCacheStats,
  clearCache
};