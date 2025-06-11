# Moccet Chat - Slack-like Messaging Application with AI Assistant

A modern, real-time messaging application built with React, Firebase, and Anthropic Claude AI, featuring channels, direct messages, file uploads, and an integrated AI assistant.

## 🚀 Features

- **Workspace Management**: Create or join workspaces using shareable workspace IDs
- **Real-time Messaging**: Instant message delivery with Firebase Realtime Database
- **AI Assistant Integration**: Built-in Claude AI assistant for every conversation
- **Smart Commands**: Use `/ai`, `/summarize`, `/translate`, and more AI-powered commands
- **Voice/Video Calls**: WebRTC-powered calls with screen sharing
- **Channels**: Create public/private channels for team communication
- **Direct Messages**: One-on-one conversations with team members
- **File Uploads**: Share images, documents, and other files up to 100MB
- **User Presence**: See who's online and typing indicators
- **Dark Theme**: Toggle between light and dark modes
- **Responsive Design**: Works on desktop and mobile devices
- **AI Analytics**: Track AI usage and performance metrics
- **Context Menu**: Right-click messages for AI actions

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account with a project set up
- Anthropic Claude API key
- Git

## 🛠️ Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/moccet-chat-demo.git
cd moccet-chat-demo
```

### 2. Install all dependencies
```bash
# Install root dependencies
npm install

# Install API dependencies for Vercel functions
cd api && npm install && cd ..

# Install functions dependencies (if using Firebase functions)
cd functions && npm install && cd ..
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:
```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase Emulator (set to true for local development)
REACT_APP_USE_FIREBASE_EMULATOR=true

# Environment
REACT_APP_ENVIRONMENT=development

# Optional: App Check
REACT_APP_RECAPTCHA_SITE_KEY=your_recaptcha_key
REACT_APP_APPCHECK_DEBUG_TOKEN=your_debug_token

# API URLs
REACT_APP_API_URL=http://localhost:5001/your-project-id/us-central1/api
REACT_APP_VERCEL_API_URL=http://localhost:3001

# AI Integration - Anthropic Claude
CLAUDE_API_KEY=your_anthropic_api_key

# Firebase Admin SDK (for production deployment)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

### 4. Verify your setup
```bash
node verify-setup.js
```

This will check that all required configurations are in place.

## 🚀 Running the Application

### Option 1: Using the all-in-one script (Recommended)
```bash
./run-local.sh
```

This script will:
- Start Firebase emulators (Auth, Firestore, Storage)
- Start Vercel dev server with AI endpoints
- Open the app at http://localhost:3001

### Option 2: Run services separately

**Terminal 1 - Firebase Emulators:**
```bash
firebase emulators:start
```

**Terminal 2 - Vercel Dev Server:**
```bash
vercel dev --listen 3001
```

### Option 3: Traditional React development
```bash
# Without AI features
npm start

# With Firebase emulators
npm run emulators  # Terminal 1
npm start          # Terminal 2
```

## 📱 User Guide

### Getting Started

1. **Sign Up / Login**
   - Create an account using email/password
   - Verify your email address

2. **First Time Setup**
   - You'll be automatically added to a default workspace
   - A general channel will be created for you

### AI Assistant Features

#### Using AI Commands

1. **Quick AI Access**
   - Click the "AI Assist" button in the message input toolbar
   - Or press `Ctrl+Space` to activate AI mode
   - Or type `/ai` followed by your question

2. **Available AI Commands**
   - `/ai [question]` - Ask the AI anything
   - `/summarize` - Summarize recent channel messages
   - `/translate [language]` - Translate the last message
   - `/explain` - Explain complex terms in the conversation
   - `/action-items` - Extract tasks from the conversation
   - `/tldr` - Get a quick summary

3. **Context Menu AI Actions**
   - Right-click any message to access AI actions:
     - Translate message
     - Summarize message
     - Explain message
     - Improve writing
     - Fix grammar
     - Extract tasks
     - Change tone

#### AI Features

- **Contextual Awareness**: AI reads the last 10 messages for context
- **Markdown Support**: AI responses support formatting and code blocks
- **Token Usage Tracking**: See how many tokens each response uses
- **Response Caching**: Repeated questions get instant cached responses
- **Rate Limiting**: Prevents API abuse with smart rate limiting

### Messaging Features

1. **Send a Message**
   - Type in the message input field
   - Press Enter to send (Shift+Enter for new line)
   - Use `/` to access AI commands

2. **File Attachments**
   - Click the paperclip icon or drag & drop files
   - Preview staged files before sending
   - Supports images, documents, videos up to 100MB
   - Multiple files can be attached to a single message

3. **Keyboard Shortcuts**
   - `Enter` - Send message
   - `Shift + Enter` - New line in message
   - `Ctrl + Space` - Activate AI assistant
   - `Esc` - Cancel AI mode
   - `/` - Open command suggestions

### Channel Management

1. **Create a Channel**
   - Click the `+` icon next to "Pinned Spaces"
   - Enter a channel name
   - Choose between Public or Private
   - Click "Create Channel"

2. **Channel Features**
   - See channel members in the header
   - View typing indicators
   - AI assistant available in every channel

3. **Workspace Management**
   - Create a new workspace or join existing one
   - Share workspace ID with team members
   - Multiple users can collaborate in the same workspace
   - See [WORKSPACE_TESTING.md](./WORKSPACE_TESTING.md) for detailed testing guide

4. **Voice/Video Calls**
   - Click phone/video icons in channel header
   - WebRTC-based peer-to-peer connections
   - Screen sharing support (desktop only)
   - See [test-calls.md](./test-calls.md) for testing guide

## 🔧 Configuration

### Firebase Setup

1. **Enable Services**
   - Authentication (Email/Password)
   - Firestore Database
   - Realtime Database
   - Storage
   - App Check (optional)

2. **Security Rules**
   - Copy `firestore.rules` to Firestore Rules
   - Copy `database.rules.json` to Realtime Database Rules
   - Copy `storage.rules` to Storage Rules

### AI Configuration

1. **Get Claude API Key**
   - Sign up at [Anthropic Console](https://console.anthropic.com)
   - Create an API key
   - Add to `.env.local` as `CLAUDE_API_KEY`

2. **Configure AI Settings**
   - Model: Claude 3 Haiku (fast responses)
   - Max tokens: 1000 per response
   - Temperature: 0.7
   - Context window: Last 10 messages

## 🛠️ Development Scripts

### Core Commands
- `npm start` - Start React development server
- `npm run build` - Build for production
- `npm test` - Run tests

### Development Tools
- `./run-local.sh` - Start all services for local development
- `vercel dev --listen 3001` - Run Vercel dev server with AI endpoints
- `firebase emulators:start` - Start Firebase emulators
- `node verify-setup.js` - Verify your setup is correct

### Deployment
- `vercel` - Deploy to Vercel
- `firebase deploy` - Deploy Firebase rules and functions

## 🆘 Troubleshooting

### AI Issues

1. **"Invalid authorization token" error**
   - Ensure `REACT_APP_USE_FIREBASE_EMULATOR=true` in `.env.local`
   - Check that Firebase emulators are running
   - Try refreshing the page and logging in again

2. **AI not responding**
   - Verify `CLAUDE_API_KEY` is set correctly
   - Check browser console for errors
   - Ensure you're running `vercel dev` not just `npm start`

3. **Rate limit errors**
   - AI has rate limiting: 10 requests per minute
   - Wait for the specified retry time
   - Consider upgrading your Anthropic plan

### General Issues

1. **Can't see channels**
   - Refresh the page
   - Check Firebase emulator UI at http://localhost:4000
   - Verify you're logged in

2. **File upload fails**
   - Ensure file is under 100MB
   - Check Firebase Storage emulator is running
   - Verify storage rules allow uploads

3. **Messages not sending**
   - Check all emulators are running
   - Verify active channel is selected
   - Check browser console for errors

## 🏗️ Architecture

### Frontend
- React 18 with functional components
- Firebase SDK for real-time features
- Context API for state management
- CSS modules for styling

### Backend
- Vercel Serverless Functions for AI endpoints
- Firebase Admin SDK for authentication
- Anthropic SDK for Claude AI integration
- Rate limiting and caching middleware

### AI Integration
- `/api/ai-chat` - Main AI chat endpoint
- Smart command processing
- Context-aware responses
- Token usage tracking
- Response caching

## 🤝 Contributing

Please read `dev_instructions.md` for details on our code structure and development process.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with React and Firebase
- AI powered by Anthropic Claude
- Icons from Font Awesome
- Inspired by Slack's UI/UX
- Deployed on Vercel

## 📞 Support

For issues and feature requests, please use the GitHub issues tracker.