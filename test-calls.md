# Testing WebRTC Calls Guide

## Prerequisites
- Two devices or two browser windows
- Camera and microphone permissions enabled
- Both users in the same channel

## Step-by-Step Testing

### 1. Setup Two Test Users

**Browser Window 1 (User A):**
1. Open `http://localhost:3001`
2. Register with email: `usera@test.com`
3. Join the "general" channel

**Browser Window 2 (User B):**
1. Open `http://localhost:3001` in incognito/different browser
2. Register with email: `userb@test.com`
3. Join the "general" channel

### 2. Start a Call

**From User A:**
1. Click the video camera icon in the channel header
2. Allow camera/microphone permissions when prompted
3. You should see your own video in the call modal

**From User B:**
1. You should see an incoming call notification
2. Click "Accept" to join the call
3. Allow camera/microphone permissions

### 3. Test Call Features

**Both Users Can:**
- Toggle microphone on/off
- Toggle camera on/off
- Share screen (desktop only)
- Switch devices (if multiple cameras/mics)
- End the call

### 4. Test Screen Sharing

1. Click the desktop icon in call controls
2. Select a window or entire screen to share
3. Other user should see your screen
4. Click desktop icon again to stop sharing

## Troubleshooting

### No Incoming Call Notification
- Ensure both users are in the same channel
- Check browser console for errors
- Verify Firestore rules are deployed

### Connection Issues
- Check firewall settings
- Try using Chrome/Edge (best WebRTC support)
- Ensure both users have good internet

### Permission Denied
- Check browser settings for camera/mic permissions
- Try in incognito mode to reset permissions
- Ensure HTTPS or localhost is being used

### Echo or Feedback
- Use headphones
- Ensure users are in different rooms
- Check echo cancellation is enabled

## Browser Compatibility

**Best Support:**
- Chrome (Desktop & Mobile)
- Edge (Desktop)
- Safari (Desktop & iOS)

**Limited Support:**
- Firefox (may have connection issues)
- Mobile browsers (no screen sharing)

## Quick Test Commands

Open browser console and run:
```javascript
// Check if WebRTC is supported
console.log('WebRTC supported:', !!window.RTCPeerConnection);

// Check media devices
navigator.mediaDevices.enumerateDevices()
  .then(devices => console.log('Media devices:', devices))
  .catch(err => console.error('Error:', err));

// Check current call state (if in call)
console.log('Current call:', webRTCService.currentCall);
```

## Production Considerations

1. **TURN Server**: Add for better connectivity behind firewalls
2. **Push Notifications**: For incoming calls when app is closed
3. **Call History**: Store call logs in Firestore
4. **Group Calls**: Implement mesh or SFU for 3+ participants
5. **Recording**: Add call recording functionality
6. **Quality Settings**: Add bandwidth/quality controls