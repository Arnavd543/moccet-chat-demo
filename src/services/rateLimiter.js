import { doc, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { firestore } from '../config/firebase';

class RateLimiter {
  constructor() {
    this.limits = {
      message: { points: 30, duration: 60 }, // 30 messages per minute
      fileUpload: { points: 10, duration: 300 }, // 10 files per 5 minutes
      channelCreate: { points: 5, duration: 3600 }, // 5 channels per hour
      userUpdate: { points: 10, duration: 60 }, // 10 profile updates per minute
      apiCall: { points: 100, duration: 60 }, // 100 API calls per minute
    };
  }

  async checkLimit(userId, action) {
    const limit = this.limits[action];
    if (!limit) {
      throw new Error(`Unknown action: ${action}`);
    }

    const rateLimitRef = doc(firestore, 'rateLimits', `${userId}_${action}`);
    const now = Date.now();

    try {
      const rateLimitDoc = await getDoc(rateLimitRef);

      if (!rateLimitDoc.exists()) {
        // First action
        await setDoc(rateLimitRef, {
          count: 1,
          firstAction: now,
          lastAction: now,
          windowStart: now
        });
        return { allowed: true, remaining: limit.points - 1 };
      }

      const data = rateLimitDoc.data();
      const windowElapsed = now - data.windowStart;

      if (windowElapsed > limit.duration * 1000) {
        // Reset window
        await setDoc(rateLimitRef, {
          count: 1,
          firstAction: now,
          lastAction: now,
          windowStart: now
        });
        return { allowed: true, remaining: limit.points - 1 };
      }

      if (data.count >= limit.points) {
        // Rate limit exceeded
        const resetIn = Math.ceil((limit.duration * 1000 - windowElapsed) / 1000);
        return { 
          allowed: false, 
          remaining: 0, 
          resetIn,
          message: `Rate limit exceeded. Try again in ${resetIn} seconds.`
        };
      }

      // Increment counter
      await updateDoc(rateLimitRef, {
        count: increment(1),
        lastAction: now
      });

      return { 
        allowed: true, 
        remaining: limit.points - data.count - 1 
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open in case of error
      return { allowed: true, remaining: 0 };
    }
  }

  async resetLimit(userId, action) {
    const rateLimitRef = doc(firestore, 'rateLimits', `${userId}_${action}`);
    await setDoc(rateLimitRef, {
      count: 0,
      firstAction: Date.now(),
      lastAction: Date.now(),
      windowStart: Date.now()
    });
  }

  getRemainingTime(userId, action) {
    // Calculate remaining time until rate limit reset
    const limit = this.limits[action];
    return limit ? limit.duration : 0;
  }
}

export const rateLimiter = new RateLimiter();