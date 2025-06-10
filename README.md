# Moccet Chat - Slack-like Messaging Application

A modern, real-time messaging application built with React and Firebase, featuring channels, direct messages, file uploads, and AI assistant integration.

**NOTE: PLEASE FILL IN FIREBASE PRIVATE KEY AND ANTHROPIC API KEY IN .env.local and api/ai-chat.js before running the app

## 🚀 Features

- **Real-time Messaging**: Instant message delivery with Firebase Realtime Database
- **Channels**: Create public/private channels for team communication
- **Direct Messages**: One-on-one conversations with team members
- **File Uploads**: Share images, documents, and other files up to 100MB
- **User Presence**: See who's online and typing indicators
- **Message Reactions**: React to messages with emojis (coming soon)
- **AI Assistant**: Built-in AI helper for each conversation (coming soon)
- **Voice & Video Calls**: WebRTC-based communication (coming soon)
- **Dark Theme**: Toggle between light and dark modes
- **Responsive Design**: Works on desktop and mobile devices

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account with a project set up
- Git

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/moccet-chat-demo.git
   cd moccet-chat-demo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication (Email/Password and Google Sign-in)
   - Enable Firestore Database
   - Enable Realtime Database
   - Enable Storage
   - Enable App Check (optional but recommended)

4. **Configure environment variables**
   - Copy `.env.example` to `.env.development`
   - Add your Firebase configuration:
   ```env
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   REACT_APP_FIREBASE_DATABASE_URL=your_database_url
   REACT_APP_RECAPTCHA_SITE_KEY=your_recaptcha_key
   ```

5. **Set up Firebase Security Rules**
   - Copy the rules from `firestore.rules` to your Firestore Rules
   - Copy the rules from `database.rules.json` to your Realtime Database Rules
   - Copy the rules from `storage.rules` to your Storage Rules

6. **Run the application**
   ```bash
   npm start
   ```

   For development with Firebase emulators:
   ```bash
   # Terminal 1: Start Firebase emulators
   npm run emulators
   
   # Terminal 2: Start React app
   npm start
   ```

## 📱 User Guide

### Getting Started

1. **Sign Up / Login**
   - Create an account using email/password or sign in with Google
   - Verify your email address if using email/password authentication

2. **First Time Setup**
   - You'll be automatically added to a default workspace
   - A general channel will be created for you

### Using the Application

#### Navigation
- **Left Sidebar**: Main navigation with icons for different sections
  - 💬 Chat (active)
  - 💼 Projects (coming soon)
  - 👥 Team (coming soon)
  - 📅 Calendar (coming soon)
  - 📊 Analytics (coming soon)
  - ⚙️ Settings (coming soon)
- **Channels Sidebar**: Toggle with the hamburger menu icon
- **Theme Toggle**: Switch between light/dark mode (moon/sun icon)
- **Profile Menu**: Click your avatar to access profile and logout

#### Channels
1. **Create a Channel**
   - Click the `+` icon next to "Pinned Spaces"
   - Enter a channel name (lowercase, no spaces)
   - Choose between Public or Private
   - Click "Create Channel"

2. **Join a Channel**
   - Public channels: Click on any channel in the list
   - Private channels: Need to be invited by an admin

3. **Channel Features**
   - See channel members in the header
   - View typing indicators when others are typing
   - Send messages with Enter key

#### Messaging
1. **Send a Message**
   - Type in the message input field
   - Press Enter to send (Shift+Enter for new line)
   - Use `/` to access smart commands (coming soon)

2. **File Attachments**
   - Click the paperclip icon or drag & drop files
   - Preview staged files before sending
   - Supports images, documents, videos up to 100MB
   - Multiple files can be attached to a single message

3. **Emojis**
   - Click the emoji button to open emoji picker
   - Select an emoji to add to your message

4. **Message Features**
   - Hover over messages to see action buttons
   - Reply in thread (coming soon)
   - Add reactions (coming soon)
   - Edit/Delete your own messages (coming soon)

#### Direct Messages
- Click the `+` next to "Direct Messages"
- Search for users and start a conversation
- All DM features work the same as channels

#### AI Assistant (Coming Soon)
- Each channel will have an AI assistant
- Use `/ai` command to interact with the assistant
- Assistant can help with:
  - Summarizing conversations
  - Answering questions
  - Generating content
  - Task management

### Keyboard Shortcuts
- `Enter` - Send message
- `Shift + Enter` - New line in message
- `Esc` - Close modals/panels
- `/` - Open smart commands

### Tips
- Messages are saved in real-time
- Your presence status updates automatically
- Files are securely stored in Firebase Storage
- All messages are encrypted in transit

## 🔒 Security Features

- Firebase Authentication for secure login
- Role-based access control (Owner, Admin, Moderator, Member)
- Private channels with invite-only access
- File upload validation and virus scanning (coming soon)
- Rate limiting to prevent spam
- App Check for bot protection

## 🆘 Troubleshooting

### Common Issues

1. **Can't see any channels**
   - Refresh the page
   - Check if you're properly logged in
   - Ensure your workspace has channels

2. **Messages not sending**
   - Check your internet connection
   - Verify you have permission to post in the channel
   - Check browser console for errors

3. **File upload fails**
   - Ensure file is under 100MB
   - Check supported file types
   - Verify storage permissions in Firebase

4. **Google Sign-in not working**
   - Enable popups for the site
   - Check Firebase Auth settings
   - Ensure Google provider is enabled

## 🛠️ Available Scripts

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm test`
Launches the test runner in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder

### `npm run emulators`
Starts Firebase emulators for local development

### `npm run eject`
**Note: this is a one-way operation. Once you `eject`, you can't go back!**

## 🤝 Contributing

Please read `dev_instructions.md` for details on our code structure and development process.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with React and Firebase
- Icons from Font Awesome
- Inspired by Slack's UI/UX
- Created with Create React App

## 📞 Support

For issues and feature requests, please use the GitHub issues tracker.