import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import app from './firebase';

// Initialize App Check
const initAppCheck = () => {
  if (process.env.REACT_APP_ENVIRONMENT === 'production') {
    // Production: Use ReCAPTCHA v3
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(process.env.REACT_APP_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
  } else {
    // Development: Use debug token
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-restricted-globals
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.REACT_APP_APPCHECK_DEBUG_TOKEN || true;
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider('6LfMVOEpAAAAAMYATHsFaV-dMr0MJPebUgrLcfqz'), // Test key
      isTokenAutoRefreshEnabled: true
    });
  }
};

export default initAppCheck;