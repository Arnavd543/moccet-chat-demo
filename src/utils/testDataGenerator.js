import { firestoreService } from '../services/firestore';
import { createMessage } from '../models';

// Sample messages for testing
const sampleMessages = [
  "Hey team! Just pushed the latest updates to the repository 🚀",
  "Great work on the presentation yesterday!",
  "Can someone review my PR when they get a chance?",
  "The new feature is looking amazing! 🎉",
  "Quick reminder: Team meeting at 3 PM today",
  "Has anyone seen the latest design mockups?",
  "I'll be working from home tomorrow",
  "Just fixed that bug we discussed earlier ✅",
  "Coffee break anyone? ☕",
  "The client loved our proposal! 🎊",
  "Need help with the API integration",
  "Deploying to production in 30 minutes",
  "Thanks for your help with the debugging session!",
  "Weekend plans: Finally finishing that side project 💻",
  "New documentation is live on the wiki",
  "Performance improvements are incredible! Page loads 50% faster now",
  "Who's up for lunch? 🍕",
  "Just shared the meeting notes in the shared drive",
  "Remember to update your timesheets",
  "Congratulations on shipping the new feature! 🎯"
];

// Generate test messages for a channel
export const generateTestMessages = async (channelId, workspaceId, currentUser, count = 20) => {
  const messages = [];
  
  for (let i = 0; i < count; i++) {
    const message = createMessage({
      channelId,
      workspaceId,
      userId: currentUser.uid,
      sender: {
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'Test User',
        photoURL: currentUser.photoURL || '',
        email: currentUser.email || '',
        status: 'online'
      },
      content: sampleMessages[i % sampleMessages.length],
      type: 'text'
    });
    
    messages.push(message);
  }
  
  // Send messages with slight delays to maintain order
  for (const message of messages) {
    try {
      await firestoreService.sendMessage(channelId, message);
      // Small delay to ensure proper ordering
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error sending test message:', error);
    }
  }
  
  console.log(`Generated ${count} test messages in channel ${channelId}`);
};

// Generate test reactions
export const generateTestReactions = async (channelId, messageId, currentUserId) => {
  const reactions = ['👍', '❤️', '😂', '🔥', '👏'];
  const randomReactions = reactions.slice(0, Math.floor(Math.random() * 3) + 1);
  
  for (const reaction of randomReactions) {
    try {
      await firestoreService.addReaction(channelId, messageId, currentUserId, reaction);
    } catch (error) {
      console.error('Error adding test reaction:', error);
    }
  }
};

// Test file attachments (creates a mock attachment without actual file upload)
export const generateTestFileMessage = async (channelId, workspaceId, currentUser) => {
  const fileTypes = [
    { name: 'Project_Proposal.pdf', type: 'application/pdf', size: 2048576, icon: 'fa-file-pdf' },
    { name: 'Spreadsheet_Q4.xlsx', type: 'application/vnd.ms-excel', size: 1024000, icon: 'fa-file-excel' },
    { name: 'Design_Mockup.png', type: 'image/png', size: 3145728, icon: 'fa-image' },
    { name: 'Meeting_Recording.mp4', type: 'video/mp4', size: 52428800, icon: 'fa-file-video' }
  ];
  
  const randomFile = fileTypes[Math.floor(Math.random() * fileTypes.length)];
  
  const message = createMessage({
    channelId,
    workspaceId,
    userId: currentUser.uid,
    sender: {
      uid: currentUser.uid,
      displayName: currentUser.displayName || 'Test User',
      photoURL: currentUser.photoURL || '',
      email: currentUser.email || '',
      status: 'online'
    },
    content: `Shared ${randomFile.name}`,
    type: randomFile.type.startsWith('image/') ? 'image' : 'file',
    attachments: [{
      id: Date.now().toString(),
      url: '#', // Mock URL
      name: randomFile.name,
      size: randomFile.size,
      type: randomFile.type,
      category: randomFile.type.startsWith('image/') ? 'image' : 'file',
      uploadedBy: currentUser.uid,
      uploadedAt: new Date()
    }]
  });
  
  try {
    await firestoreService.sendMessage(channelId, message);
    console.log('Generated test file message');
  } catch (error) {
    console.error('Error sending test file message:', error);
  }
};

// Create a test workspace with channels
export const createTestWorkspace = async (ownerId, workspaceName = 'Test Workspace') => {
  try {
    const workspace = await firestoreService.createWorkspace({
      name: workspaceName,
      description: 'A test workspace for development',
      ownerId
    });
    
    console.log('Created test workspace:', workspace.id);
    return workspace;
  } catch (error) {
    console.error('Error creating test workspace:', error);
    throw error;
  }
};

// Populate app with test data
export const populateTestData = async (currentUser, workspaceId, channelId) => {
  console.log('Starting test data generation...');
  
  try {
    // Generate regular messages
    await generateTestMessages(channelId, workspaceId, currentUser, 15);
    
    // Generate a file message
    await generateTestFileMessage(channelId, workspaceId, currentUser);
    
    // Add some more messages
    await generateTestMessages(channelId, workspaceId, currentUser, 5);
    
    console.log('Test data generation complete!');
  } catch (error) {
    console.error('Error generating test data:', error);
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testDataGenerator = {
    generateTestMessages,
    generateTestReactions,
    generateTestFileMessage,
    createTestWorkspace,
    populateTestData
  };
}