/**
 * AI Analytics Service
 * Tracks AI usage, costs, and performance metrics
 */

import { firestore } from '../config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  Timestamp
} from 'firebase/firestore';

// Pricing configuration (per 1K tokens)
const AI_PRICING = {
  'claude-3-haiku': {
    input: 0.00025,  // $0.25 per 1M tokens
    output: 0.00125  // $1.25 per 1M tokens
  }
};

class AIAnalyticsService {
  constructor() {
    this.analyticsRef = collection(firestore, 'ai_analytics');
    this.userStatsRef = collection(firestore, 'ai_user_stats');
  }

  /**
   * Track an AI request
   * @param {Object} data - Request data
   */
  async trackRequest(data) {
    const {
      userId,
      channelId,
      workspaceId,
      command,
      usage,
      cached,
      responseTime,
      error = null
    } = data;

    try {
      // Calculate cost
      const cost = this.calculateCost(usage);

      // Create analytics entry
      const analyticsDoc = doc(this.analyticsRef);
      await setDoc(analyticsDoc, {
        userId,
        channelId,
        workspaceId,
        command,
        usage: usage || null,
        cost,
        cached: cached || false,
        responseTime,
        error: error || null,
        timestamp: serverTimestamp(),
        date: new Date().toISOString().split('T')[0], // For daily aggregation
        hour: new Date().getHours(), // For hourly patterns
        model: 'claude-3-haiku'
      });

      // Update user stats
      await this.updateUserStats(userId, usage, cost, error);

      return { success: true, docId: analyticsDoc.id };
    } catch (error) {
      console.error('Error tracking AI request:', error);
      return { success: false, error };
    }
  }

  /**
   * Calculate cost based on token usage
   * @param {Object} usage - Token usage object
   * @returns {Object} Cost breakdown
   */
  calculateCost(usage) {
    if (!usage) return { input: 0, output: 0, total: 0 };

    const pricing = AI_PRICING['claude-3-haiku'];
    const inputCost = (usage.input_tokens / 1000) * pricing.input;
    const outputCost = (usage.output_tokens / 1000) * pricing.output;

    return {
      input: inputCost,
      output: outputCost,
      total: inputCost + outputCost
    };
  }

  /**
   * Update user statistics
   * @param {string} userId - User ID
   * @param {Object} usage - Token usage
   * @param {Object} cost - Cost breakdown
   * @param {Object} error - Error if any
   */
  async updateUserStats(userId, usage, cost, error) {
    const userStatDoc = doc(this.userStatsRef, userId);

    try {
      const docSnap = await getDoc(userStatDoc);
      
      if (docSnap.exists()) {
        // Update existing stats
        await updateDoc(userStatDoc, {
          totalRequests: increment(1),
          successfulRequests: increment(error ? 0 : 1),
          failedRequests: increment(error ? 1 : 0),
          totalTokens: increment(usage?.total_tokens || 0),
          inputTokens: increment(usage?.input_tokens || 0),
          outputTokens: increment(usage?.output_tokens || 0),
          totalCost: increment(cost.total),
          lastUsed: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new stats document
        await setDoc(userStatDoc, {
          userId,
          totalRequests: 1,
          successfulRequests: error ? 0 : 1,
          failedRequests: error ? 1 : 0,
          totalTokens: usage?.total_tokens || 0,
          inputTokens: usage?.input_tokens || 0,
          outputTokens: usage?.output_tokens || 0,
          totalCost: cost.total,
          firstUsed: serverTimestamp(),
          lastUsed: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  }

  /**
   * Get user statistics
   * @param {string} userId - User ID
   * @returns {Object} User statistics
   */
  async getUserStats(userId) {
    try {
      const userStatDoc = doc(this.userStatsRef, userId);
      const docSnap = await getDoc(userStatDoc);
      
      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() };
      } else {
        return { success: true, data: null };
      }
    } catch (error) {
      console.error('Error getting user stats:', error);
      return { success: false, error };
    }
  }

  /**
   * Get analytics for a time period
   * @param {string} workspaceId - Workspace ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Analytics data
   */
  async getAnalytics(workspaceId, startDate, endDate) {
    try {
      const q = query(
        this.analyticsRef,
        where('workspaceId', '==', workspaceId),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const analytics = [];
      
      querySnapshot.forEach((doc) => {
        analytics.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return { success: true, data: analytics };
    } catch (error) {
      console.error('Error getting analytics:', error);
      return { success: false, error };
    }
  }

  /**
   * Get command usage statistics
   * @param {string} workspaceId - Workspace ID
   * @returns {Object} Command usage stats
   */
  async getCommandStats(workspaceId) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const q = query(
        this.analyticsRef,
        where('workspaceId', '==', workspaceId),
        where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo))
      );

      const querySnapshot = await getDocs(q);
      const commandStats = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const command = data.command || 'ai';
        
        if (!commandStats[command]) {
          commandStats[command] = {
            count: 0,
            totalTokens: 0,
            totalCost: 0,
            cacheHits: 0
          };
        }
        
        commandStats[command].count++;
        commandStats[command].totalTokens += data.usage?.total_tokens || 0;
        commandStats[command].totalCost += data.cost?.total || 0;
        if (data.cached) commandStats[command].cacheHits++;
      });

      return { success: true, data: commandStats };
    } catch (error) {
      console.error('Error getting command stats:', error);
      return { success: false, error };
    }
  }

  /**
   * Get hourly usage pattern
   * @param {string} workspaceId - Workspace ID
   * @returns {Object} Hourly usage data
   */
  async getHourlyPattern(workspaceId) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const q = query(
        this.analyticsRef,
        where('workspaceId', '==', workspaceId),
        where('timestamp', '>=', Timestamp.fromDate(sevenDaysAgo))
      );

      const querySnapshot = await getDocs(q);
      const hourlyData = Array(24).fill(0);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.hour !== undefined) {
          hourlyData[data.hour]++;
        }
      });

      return { success: true, data: hourlyData };
    } catch (error) {
      console.error('Error getting hourly pattern:', error);
      return { success: false, error };
    }
  }

  /**
   * Get cost summary for a workspace
   * @param {string} workspaceId - Workspace ID
   * @param {string} period - 'day', 'week', 'month'
   * @returns {Object} Cost summary
   */
  async getCostSummary(workspaceId, period = 'month') {
    try {
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
        default:
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      const analytics = await this.getAnalytics(workspaceId, startDate, now);
      
      if (!analytics.success) {
        return analytics;
      }

      let totalCost = 0;
      let totalRequests = 0;
      let totalTokens = 0;
      let cacheHits = 0;

      analytics.data.forEach(item => {
        totalCost += item.cost?.total || 0;
        totalRequests++;
        totalTokens += item.usage?.total_tokens || 0;
        if (item.cached) cacheHits++;
      });

      const cacheRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
      const avgCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;
      const avgTokensPerRequest = totalRequests > 0 ? totalTokens / totalRequests : 0;

      return {
        success: true,
        data: {
          period,
          totalCost,
          totalRequests,
          totalTokens,
          cacheHits,
          cacheRate: cacheRate.toFixed(2),
          avgCostPerRequest: avgCostPerRequest.toFixed(6),
          avgTokensPerRequest: Math.round(avgTokensPerRequest),
          startDate,
          endDate: now
        }
      };
    } catch (error) {
      console.error('Error getting cost summary:', error);
      return { success: false, error };
    }
  }
}

// Create and export singleton instance
const aiAnalyticsService = new AIAnalyticsService();
export default aiAnalyticsService;