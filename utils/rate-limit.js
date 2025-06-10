/**
 * Rate Limiting Utility
 * Implements in-memory rate limiting for Vercel Functions
 */

// In-memory store for rate limit data
// Note: This persists for ~10 minutes in Vercel Functions
const rateLimitStore = new Map();

// Configuration
const RATE_LIMITS = {
  FREE: {
    hourly: 50,
    daily: 500,
  },
  PREMIUM: {
    hourly: 200,
    daily: 5000,
  },
};

// Clean up old entries periodically
function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.lastReset > 24 * 60 * 60 * 1000) { // 24 hours
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check and update rate limit for a user
 * @param {string} userId - User ID to check
 * @param {string} tier - User tier (FREE or PREMIUM)
 * @returns {Object} Rate limit result
 */
async function rateLimit(userId, tier = 'FREE') {
  cleanupOldEntries();

  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  const dayAgo = now - 24 * 60 * 60 * 1000;

  // Get or create user rate limit data
  let userData = rateLimitStore.get(userId);
  if (!userData) {
    userData = {
      requests: [],
      lastReset: now,
    };
    rateLimitStore.set(userId, userData);
  }

  // Clean up old requests
  userData.requests = userData.requests.filter(timestamp => timestamp > dayAgo);

  // Count requests
  const hourlyCount = userData.requests.filter(timestamp => timestamp > hourAgo).length;
  const dailyCount = userData.requests.length;

  // Get limits for tier
  const limits = RATE_LIMITS[tier] || RATE_LIMITS.FREE;

  // Check limits
  if (hourlyCount >= limits.hourly) {
    const oldestHourlyRequest = userData.requests
      .filter(timestamp => timestamp > hourAgo)
      .sort()[0];
    const retryAfter = Math.ceil((oldestHourlyRequest + 60 * 60 * 1000 - now) / 1000);

    return {
      success: false,
      limit: limits.hourly,
      remaining: 0,
      retryAfter,
      message: 'Hourly rate limit exceeded',
    };
  }

  if (dailyCount >= limits.daily) {
    const oldestDailyRequest = userData.requests.sort()[0];
    const retryAfter = Math.ceil((oldestDailyRequest + 24 * 60 * 60 * 1000 - now) / 1000);

    return {
      success: false,
      limit: limits.daily,
      remaining: 0,
      retryAfter,
      message: 'Daily rate limit exceeded',
    };
  }

  // Add current request
  userData.requests.push(now);

  // Return success
  return {
    success: true,
    limit: limits.hourly,
    remaining: limits.hourly - hourlyCount - 1,
    hourlyUsage: hourlyCount + 1,
    dailyUsage: dailyCount + 1,
    dailyLimit: limits.daily,
  };
}

// Export function and configuration
module.exports = rateLimit;
module.exports.RATE_LIMITS = RATE_LIMITS;