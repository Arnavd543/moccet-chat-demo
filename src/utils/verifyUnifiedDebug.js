// Verify the unified debug panel is working
export const verifyUnifiedDebug = () => {
  console.log('=== VERIFYING UNIFIED DEBUG PANEL ===');
  
  // Check if old debug panels are gone
  const oldDebugExists = !!window.debugPanel;
  const oldQuickTestExists = !!window.quickTest;
  const oldDebugFirestoreExists = !!window.debugFirestore;
  
  // Check if new unified debug exists
  const unifiedDebugExists = !!window.moccetDebug;
  
  console.log('Old debug utilities:', {
    debugPanel: oldDebugExists,
    quickTest: oldQuickTestExists,
    debugFirestore: oldDebugFirestoreExists
  });
  
  console.log('New unified debug:', {
    exists: unifiedDebugExists,
    methods: unifiedDebugExists ? Object.keys(window.moccetDebug) : []
  });
  
  // Check DOM for debug buttons
  const oldDebugButton = document.querySelector('button:has(+ div > .test-panel)');
  const oldTestButton = document.querySelector('.test-panel-toggle');
  const unifiedDebugButton = document.querySelector('.unified-debug-toggle');
  
  console.log('DOM elements:', {
    oldDebugButton: !!oldDebugButton,
    oldTestButton: !!oldTestButton,
    unifiedDebugButton: !!unifiedDebugButton
  });
  
  // Try to open the unified debug panel
  if (window.moccetDebug && window.moccetDebug.open) {
    console.log('Opening unified debug panel...');
    window.moccetDebug.open();
  }
  
  return {
    oldDebugRemoved: !oldDebugExists && !oldQuickTestExists && !oldDebugFirestoreExists,
    unifiedDebugActive: unifiedDebugExists,
    ready: unifiedDebugExists && !oldDebugExists
  };
};

// Attach to window
window.verifyUnifiedDebug = verifyUnifiedDebug;
console.log('Verification utility available at window.verifyUnifiedDebug()');