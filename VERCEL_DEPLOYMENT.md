# Vercel Deployment Guide for Moccet Chat AI Integration

## Prerequisites
1. Vercel account (sign up at vercel.com)
2. Anthropic API key
3. Firebase Admin SDK credentials

## Deployment Steps

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Deploy to Vercel
```bash
# In your project root
vercel

# Follow the prompts:
# - Link to existing project? No
# - What's your project name? moccet-chat
# - Which scope? (select your account)
# - Link to existing project? No
# - What's the name of your existing project? (leave blank)
# - In which directory is your code located? ./
# - Want to override the settings? No
```

### 3. Set Environment Variables in Vercel
Go to your Vercel dashboard → Project Settings → Environment Variables

Add these variables:
```
CLAUDE_API_KEY=your-anthropic-api-key
FIREBASE_ADMIN_PROJECT_ID=moccet-slack
FIREBASE_ADMIN_PRIVATE_KEY=your-firebase-admin-private-key
FIREBASE_ADMIN_CLIENT_EMAIL=your-firebase-admin-client-email
```

### 4. Update Local Environment
After deployment, update `.env.local`:
```
REACT_APP_VERCEL_API_URL=https://your-project-name.vercel.app
```

### 5. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 6. Test the Integration
1. Open your deployed app
2. Type `/ai Hello, can you help me?` in any channel
3. Check if Moccet Assistant responds
4. Right-click any message and select AI actions
5. Check AI Analytics in the header

## Local Development

To run the Vercel functions locally:
```bash
vercel dev
```

This will start:
- React app on http://localhost:3000
- API functions on http://localhost:3000/api

## Troubleshooting

### CORS Issues
- Ensure your domain is added to Firebase Auth authorized domains
- Check Vercel's CORS headers in vercel.json

### Rate Limiting
- Free tier: 50 requests/hour per user
- Premium tier: 200 requests/hour per user
- Check AI Analytics for usage details

### API Key Issues
- Verify CLAUDE_API_KEY is set correctly in Vercel
- Check API key has sufficient credits
- Monitor usage at console.anthropic.com

## Cost Optimization
- Enable response caching (1-hour TTL)
- Monitor usage in AI Analytics dashboard
- Use smart commands for common tasks
- Consider implementing user tiers

## Security Notes
- Never commit API keys to git
- Use environment variables for all secrets
- Firebase Admin SDK is only used in Vercel Functions
- User authentication is verified on every AI request