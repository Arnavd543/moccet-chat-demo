import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './config/firebase'; // Initialize Firebase before other imports
import { AuthProvider } from './contexts/AuthContext';
import { SecurityProvider } from './contexts/SecurityContext';
import { MessageProvider } from './contexts/MessageContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import Onboarding from './components/auth/Onboarding';
import ProtectedRoute from './components/auth/ProtectedRoute';
import EmailVerification from './components/auth/EmailVerification';
import GoogleSignInDebug from './components/auth/GoogleSignInDebug';
import MoccetChat from './MoccetChat';
import MoccetChatFirebase from './MoccetChat.firebase';
import { FEATURES } from './config/featureFlags';
import FeatureToggle from './components/FeatureToggle';
import './App.css';

// Import test utilities (development only)
if (process.env.NODE_ENV === 'development') {
  import('./utils/quickTest');
  import('./utils/messageTest');
  import('./utils/debugFirestore');
  import('./utils/setupWorkspace');
  import('./utils/debugMessages');
  import('./utils/emergencyFix');
  import('./utils/verifyUnifiedDebug');
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <SecurityProvider>
          <MessageProvider>
            <FeatureToggle />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/debug-google" element={<GoogleSignInDebug />} />
              <Route 
                path="/onboarding" 
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <EmailVerification />
                    {FEATURES.USE_FIREBASE_CHAT ? <MoccetChatFirebase /> : <MoccetChat />}
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </MessageProvider>
        </SecurityProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;