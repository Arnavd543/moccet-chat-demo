const { Anthropic } = require('@anthropic-ai/sdk');
const Cors = require('cors');
const rateLimit = require('../utils/rate-limit.js');
const { getCachedResponse, setCachedResponse } = require('../utils/cache.js');
const admin = require('./firebase-admin.js');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || '',
});

// Configure CORS
const cors = Cors({
  methods: ['POST', 'OPTIONS'],
  origin: process.env.ALLOWED_ORIGIN ? process.env.ALLOWED_ORIGIN.split(',') : ['http://localhost:3000'],
  credentials: true,
});

// Helper to run middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

/**
 * AI Chat API Endpoint
 * Handles chat requests to Claude AI with rate limiting and caching
 */
module.exports = async function handler(req, res) {
  // Run CORS middleware
  await runMiddleware(req, res, cors);

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // For local development, check if we have actual credentials (not from .env files loaded by Vercel)
    const hasValidPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY && 
                              process.env.FIREBASE_ADMIN_PRIVATE_KEY.includes('BEGIN PRIVATE KEY');
    const useEmulator = !hasValidPrivateKey || process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true' || process.env.USE_FIREBASE_EMULATOR === 'true';
    
    console.log('Environment check:', {
      hasValidPrivateKey: hasValidPrivateKey,
      CLAUDE_API_KEY: process.env.CLAUDE_API_KEY ? 'Present' : 'Missing',
      useEmulator: useEmulator,
      privateKeyPreview: process.env.FIREBASE_ADMIN_PRIVATE_KEY ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.substring(0, 50) + '...' : 'Missing'
    });
    
    // Verify Firebase ID token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    console.log('Token received:', idToken.substring(0, 50) + '...');
    
    let decodedToken;
    
    try {
      // Check if this is an emulator token (has "alg": "none")
      const tokenParts = idToken.split('.');
      if (tokenParts.length === 3) {
        const headerBase64 = tokenParts[0];
        const headerJson = Buffer.from(headerBase64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
        const header = JSON.parse(headerJson);
        
        if (header.alg === 'none' || useEmulator) {
          // This is an emulator token, decode without verification
          console.log('Detected emulator token (alg: none), decoding without verification');
          
          const base64Url = tokenParts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = Buffer.from(base64, 'base64').toString();
          
          decodedToken = JSON.parse(jsonPayload);
          console.log('Decoded token:', decodedToken);
          
          // Ensure uid exists
          if (!decodedToken.uid && decodedToken.user_id) {
            decodedToken.uid = decodedToken.user_id;
          }
          if (!decodedToken.uid && decodedToken.sub) {
            decodedToken.uid = decodedToken.sub;
          }
          
          if (!decodedToken.uid) {
            throw new Error('No user ID found in token');
          }
        } else {
          // Production token - verify normally
          decodedToken = await admin.auth().verifyIdToken(idToken);
        }
      } else {
        throw new Error('Invalid token format');
      }
    } catch (error) {
      console.error('Token verification error:', error);
      console.error('Token structure:', {
        parts: idToken.split('.').length,
        firstPart: idToken.split('.')[0]?.substring(0, 20),
      });
      return res.status(401).json({ error: 'Invalid authorization token' });
    }

    // Validate request body
    const { message, context = [], channelInfo = {} } = req.body;
    const userId = decodedToken.uid;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message' });
    }

    // Check rate limit
    const rateLimitResult = await rateLimit(userId);
    if (!rateLimitResult.success) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter,
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
      });
    }

    // Generate cache key
    const cacheKey = `${userId}:${message}:${JSON.stringify(context.slice(-5))}`;
    
    // Check cache
    const cachedResponse = await getCachedResponse(cacheKey);
    if (cachedResponse) {
      return res.status(200).json({
        response: cachedResponse.response,
        usage: cachedResponse.usage,
        cached: true,
      });
    }

    // Prepare system prompt
    const systemPrompt = `You are Moccet Assistant, a helpful AI assistant integrated into the Moccet chat application. 
    You're currently helping in the "${channelInfo.name || 'general'}" channel.
    Be concise, friendly, and professional. Use markdown formatting when appropriate.
    If asked to help with code, use syntax highlighting.
    Keep responses under 500 words unless specifically asked for more detail.`;

    // Build conversation context (no system messages)
    const messages = [];

    // Add context messages
    context.slice(-10).forEach((msg) => {
      messages.push({
        role: msg.userId === userId ? 'user' : 'assistant',
        content: `${msg.senderName}: ${msg.content}`,
      });
    });

    // Add current message
    messages.push({
      role: 'user',
      content: message,
    });

    // Call Claude API with system as top-level parameter
    const completion = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Using Haiku for faster responses
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages,
      temperature: 0.7,
    });

    const response = completion.content[0].text;
    const usage = {
      input_tokens: completion.usage.input_tokens,
      output_tokens: completion.usage.output_tokens,
      total_tokens: completion.usage.input_tokens + completion.usage.output_tokens,
    };

    // Cache the response
    await setCachedResponse(cacheKey, { response, usage });

    // Return success response
    return res.status(200).json({
      response,
      usage,
      cached: false,
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      status: error.status,
      stack: error.stack
    });

    // Handle specific errors
    if (error.status === 401) {
      return res.status(502).json({ error: 'AI service authentication failed - check API key' });
    }
    
    if (error.status === 429) {
      return res.status(502).json({ error: 'AI service rate limit exceeded' });
    }

    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return res.status(504).json({ error: 'Request timeout' });
    }

    // Generic error - include more details in development
    const isDev = process.env.NODE_ENV !== 'production';
    return res.status(500).json({ 
      error: 'Internal server error',
      details: isDev ? error.message : undefined
    });
  }
}