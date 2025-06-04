# Using Moccet Chat Without Cloud Functions (Free Tier)

This guide explains how to use Moccet Chat on Firebase's free Spark plan without Cloud Functions.

## What Works Without Cloud Functions

✅ **Core Features (100% Functional)**
- User authentication (Email/Password and Google Sign-in)
- Real-time messaging
- File uploads and downloads
- Channel creation and management
- Direct messages
- Message reactions
- Typing indicators
- User presence (online/offline status)
- Message history
- Search functionality

✅ **What's Different**
- **Image Thumbnails**: Full-size images are displayed instead of thumbnails (CSS handles resizing)
- **Workspace Creation**: Done directly in the app instead of via API
- **User Invitations**: Manual user addition instead of email invitations

## Setup Instructions

### 1. Configure Environment Variables

In your `.env.development` file, set:
```
REACT_APP_USE_FIREBASE_EMULATOR=true
REACT_APP_ENABLE_FUNCTIONS=false
```

### 2. Running Locally with Emulators

Start the Firebase emulators (includes functions locally):
```bash
npm run emulators
```

In another terminal, start the React app:
```bash
npm start
```

### 3. Deploying Without Functions

Deploy only the free-tier services:
```bash
# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Deploy Storage rules
firebase deploy --only storage

# Deploy Hosting (if needed)
firebase deploy --only hosting
```

## Feature Comparison

| Feature | With Functions | Without Functions |
|---------|----------------|-------------------|
| Message Sending | ✅ | ✅ |
| File Uploads | ✅ | ✅ |
| Image Thumbnails | Auto-generated | CSS resized |
| Image Processing | Optimized sizes | Original size |
| Workspace Creation | API endpoint | Direct Firestore |
| User Invitations | Email system | Manual addition |
| Rate Limiting | Server-side | Client-side |
| Audit Logs | Automatic | Manual |

## Performance Considerations

Without Cloud Functions:
- **Images**: Will load at full size (consider implementing client-side compression)
- **Storage**: No automatic cleanup of old files
- **Security**: Relies more on Firestore security rules

## Migration Path

When you're ready to upgrade to the Blaze plan:
1. Change `REACT_APP_ENABLE_FUNCTIONS=true` in your environment
2. Deploy functions: `firebase deploy --only functions`
3. All features will automatically start using Cloud Functions

## Tips for Free Tier Usage

1. **Image Optimization**: 
   - Encourage users to upload reasonably sized images
   - Consider adding client-side image compression

2. **Storage Management**:
   - Monitor your storage usage in Firebase Console
   - Implement client-side file size limits

3. **Security**:
   - Ensure your Firestore rules are properly configured
   - Use Firebase App Check for additional security

## Limitations

- **Storage**: 5GB limit on free tier
- **Firestore**: 
  - 50K reads/day
  - 20K writes/day
  - 20K deletes/day
- **Authentication**: 10K verifications/month
- **Bandwidth**: 10GB/month

For most small to medium teams, these limits are more than sufficient.