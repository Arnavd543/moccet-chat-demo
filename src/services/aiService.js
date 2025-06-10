/**
 * AI Service
 * Handles communication with the Vercel AI endpoint
 */

import { auth } from '../config/firebase';
import aiAnalytics from './aiAnalytics';

// Configuration
const AI_ENDPOINT = process.env.REACT_APP_VERCEL_API_URL 
  ? `${process.env.REACT_APP_VERCEL_API_URL}/api/ai-chat`
  : 'http://localhost:3000/api/ai-chat';
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * AI Service Class
 */
class AIService {
  constructor() {
    this.requestsInProgress = new Map();
  }

  /**
   * Send a message to the AI
   * @param {string} message - User's message
   * @param {Array} context - Previous messages for context
   * @param {Object} channelInfo - Information about the current channel
   * @param {string} command - The AI command type
   * @returns {Promise<Object>} AI response
   */
  async sendMessage(message, context = [], channelInfo = {}, command = 'ai') {
    // Check if user is authenticated
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to use AI features');
    }

    // Track start time for response time measurement
    const startTime = Date.now();

    // Get ID token for authentication (force refresh to ensure it's valid)
    const idToken = await user.getIdToken(true);

    // Prepare request body
    const requestBody = {
      message,
      context: context.slice(-10), // Last 10 messages for context
      channelInfo,
      userId: user.uid,
    };

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    let analyticsData = {
      userId: user.uid,
      channelId: channelInfo.channelId,
      workspaceId: channelInfo.workspaceId,
      command,
      responseTime: 0
    };

    try {
      const response = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Calculate response time
      analyticsData.responseTime = Date.now() - startTime;

      // Handle rate limiting
      if (response.status === 429) {
        const data = await response.json();
        const error = new Error(data.error || 'Rate limit exceeded');
        error.code = 'RATE_LIMIT';
        error.retryAfter = data.retryAfter;
        error.limit = data.limit;
        error.remaining = data.remaining;
        
        // Track failed request
        analyticsData.error = { code: 'RATE_LIMIT', message: error.message };
        await aiAnalytics.trackRequest(analyticsData);
        
        throw error;
      }

      // Handle other errors
      if (!response.ok) {
        const data = await response.json();
        console.error('AI Service Error Response:', {
          status: response.status,
          data: data,
          headers: {
            authorization: `Bearer ${idToken.substring(0, 20)}...`
          }
        });
        const error = new Error(data.error || `AI service error: ${response.status}`);
        
        // Track failed request
        analyticsData.error = { code: 'API_ERROR', message: error.message };
        await aiAnalytics.trackRequest(analyticsData);
        
        throw error;
      }

      // Parse response
      const data = await response.json();
      
      // Track successful request
      analyticsData.usage = data.usage;
      analyticsData.cached = data.cached || false;
      await aiAnalytics.trackRequest(analyticsData);

      return {
        content: data.response,
        usage: data.usage,
        cached: data.cached,
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      // Calculate response time for errors too
      analyticsData.responseTime = Date.now() - startTime;

      // Handle abort/timeout
      if (error.name === 'AbortError') {
        const timeoutError = new Error('AI request timed out');
        timeoutError.code = 'TIMEOUT';
        
        // Track timeout
        analyticsData.error = { code: 'TIMEOUT', message: timeoutError.message };
        await aiAnalytics.trackRequest(analyticsData);
        
        throw timeoutError;
      }

      // Handle network errors
      if (!navigator.onLine) {
        const networkError = new Error('No internet connection');
        networkError.code = 'NETWORK';
        
        // Track network error
        analyticsData.error = { code: 'NETWORK', message: networkError.message };
        await aiAnalytics.trackRequest(analyticsData);
        
        throw networkError;
      }

      // Track other errors if not already tracked
      if (!analyticsData.error) {
        analyticsData.error = { code: 'UNKNOWN', message: error.message };
        await aiAnalytics.trackRequest(analyticsData);
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Check if a message should trigger AI
   * @param {string} message - Message to check
   * @returns {Object} AI trigger info
   */
  checkAITrigger(message) {
    const trimmedMessage = message.trim();

    // Check for direct AI commands
    if (trimmedMessage.startsWith('/ai ')) {
      return {
        triggered: true,
        command: 'ai',
        query: trimmedMessage.substring(4).trim(),
      };
    }

    // Check for @Moccet mention
    if (trimmedMessage.toLowerCase().includes('@moccet')) {
      return {
        triggered: true,
        command: 'mention',
        query: trimmedMessage.replace(/@moccet/gi, '').trim(),
      };
    }

    // Check for smart commands
    const smartCommands = [
      { command: '/summarize', name: 'summarize', description: 'Summarize recent messages' },
      { command: '/translate', name: 'translate', description: 'Translate the last message' },
      { command: '/explain', name: 'explain', description: 'Explain complex terms' },
      { command: '/action-items', name: 'action-items', description: 'Extract action items' },
      { command: '/tldr', name: 'tldr', description: 'Quick summary' },
    ];

    for (const cmd of smartCommands) {
      if (trimmedMessage.startsWith(cmd.command)) {
        return {
          triggered: true,
          command: cmd.name,
          query: trimmedMessage.substring(cmd.command.length).trim(),
        };
      }
    }

    return {
      triggered: false,
      command: null,
      query: null,
    };
  }

  /**
   * Format AI response for display
   * @param {string} content - AI response content
   * @param {Object} usage - Token usage info
   * @returns {Object} Formatted message
   */
  formatAIResponse(content, usage = {}) {
    return {
      content,
      type: 'ai',
      senderId: 'moccet-ai',
      senderName: 'Moccet Assistant',
      senderAvatar: '/moccet-ai-avatar.png', // Add AI avatar to public folder
      isAI: true,
      usage,
      timestamp: new Date(),
    };
  }

  /**
   * Get smart command suggestions
   * @param {string} input - Current input
   * @returns {Array} Matching commands
   */
  getCommandSuggestions(input) {
    if (!input.startsWith('/')) return [];

    const commands = [
      { command: '/ai', description: 'Ask AI anything' },
      { command: '/summarize', description: 'Summarize recent messages' },
      { command: '/translate', description: 'Translate to another language' },
      { command: '/explain', description: 'Explain complex terms' },
      { command: '/action-items', description: 'Extract tasks and action items' },
      { command: '/tldr', description: 'Get a quick summary' },
    ];

    return commands.filter(cmd => 
      cmd.command.startsWith(input.toLowerCase())
    );
  }

  /**
   * Process smart commands with context
   * @param {string} command - Command name
   * @param {string} query - Additional query
   * @param {Array} messages - Channel messages for context
   * @returns {string} Processed prompt for AI
   */
  processSmartCommand(command, query, messages = []) {
    const lastMessages = messages.slice(-50);
    const messageContent = lastMessages
      .map(msg => `${msg.senderName}: ${msg.content}`)
      .join('\n');

    switch (command) {
      case 'summarize':
        return `Please summarize the following conversation:\n\n${messageContent}`;
      
      case 'translate':
        const language = query || 'Spanish';
        const lastMessage = messages[messages.length - 1];
        return `Translate the following message to ${language}: "${lastMessage?.content || ''}"`;
      
      case 'explain':
        return `Please explain any complex terms or concepts in: ${query || messageContent}`;
      
      case 'action-items':
        return `Extract all action items and tasks from this conversation:\n\n${messageContent}`;
      
      case 'tldr':
        return `Provide a very brief summary (2-3 sentences) of:\n\n${messageContent}`;
      
      default:
        return query;
    }
  }

  /**
   * Process advanced AI actions on specific messages
   * @param {string} action - The action to perform
   * @param {Object} message - The message to process
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Processed result
   */
  async processMessageAction(action, message, options = {}) {
    const content = message.content;
    let prompt = '';

    switch (action) {
      case 'translate':
        const targetLang = options.language || 'Spanish';
        prompt = `Translate the following message to ${targetLang}. Only provide the translation, no explanations:\n\n"${content}"`;
        break;
      
      case 'summarize':
        prompt = `Summarize the following message in 1-2 sentences:\n\n"${content}"`;
        break;
      
      case 'explain':
        prompt = `Explain the following message in simple terms, clarifying any complex concepts:\n\n"${content}"`;
        break;
      
      case 'improve':
        prompt = `Suggest improvements to the following message to make it clearer and more professional:\n\n"${content}"`;
        break;
      
      case 'grammar':
        prompt = `Fix any grammar, spelling, or punctuation errors in the following message. Only provide the corrected version:\n\n"${content}"`;
        break;
      
      case 'tasks':
        prompt = `Extract any action items, tasks, or to-dos from the following message. List them as bullet points:\n\n"${content}"`;
        break;
      
      case 'tone':
        const targetTone = options.tone || 'professional';
        prompt = `Rewrite the following message in a more ${targetTone} tone:\n\n"${content}"`;
        break;
      
      case 'code':
        prompt = `Extract any code snippets from the following message and format them properly with syntax highlighting hints:\n\n"${content}"`;
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Send to AI with the action as command for analytics
    const response = await this.sendMessage(
      prompt,
      [],
      options.channelInfo || {},
      `action-${action}`
    );

    return response.content;
  }

  /**
   * Generate thread summary
   * @param {Array} messages - Thread messages
   * @returns {Promise<string>} Thread summary
   */
  async generateThreadSummary(messages) {
    const messageContent = messages
      .map(msg => `${msg.senderName} (${new Date(msg.createdAt).toLocaleTimeString()}): ${msg.content}`)
      .join('\n');

    const prompt = `Create a concise summary of this conversation thread, highlighting key points and decisions:\n\n${messageContent}`;
    
    const response = await this.sendMessage(prompt, [], {}, 'thread-summary');
    return response.content;
  }

  /**
   * Generate suggested replies
   * @param {Array} messages - Recent messages for context
   * @param {Object} options - Options for reply generation
   * @returns {Promise<Array>} Suggested replies
   */
  async generateSuggestedReplies(messages, options = {}) {
    const recentMessages = messages.slice(-5);
    const context = recentMessages
      .map(msg => `${msg.senderName}: ${msg.content}`)
      .join('\n');

    const prompt = `Based on this conversation, suggest 3 appropriate reply options. Keep them brief and relevant. Format as JSON array of strings:\n\n${context}`;
    
    const response = await this.sendMessage(prompt, [], options.channelInfo || {}, 'suggested-replies');
    
    try {
      // Extract JSON array from response
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing suggested replies:', error);
    }
    
    // Fallback to simple string split if JSON parsing fails
    return response.content
      .split('\n')
      .filter(line => line.trim())
      .slice(0, 3);
  }
}

// Create and export singleton instance
const aiService = new AIService();
export default aiService;