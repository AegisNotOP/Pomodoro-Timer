/**
 * The Algorithmic Ambient Room - Fixed Firebase Configuration
 * 
 * ============================================================================
 * WHERE TO PUT YOUR FIREBASE CONFIGURATION
 * ============================================================================
 * Paste your Firebase Web App configuration credentials directly into the
 * `window.FIREBASE_CONFIG` object below.
 * 
 * To get your Firebase Web App configuration:
 * 1. Open the Firebase Console: https://console.firebase.google.com/
 * 2. Select your project -> Click the gear icon (Project Settings).
 * 3. In the "General" tab, scroll down to "Your apps" -> select your Web App (</>).
 * 4. Copy the values from the `firebaseConfig` object and paste them below.
 * 
 * ============================================================================
 * PUBLIC WEB CONFIGURATION VS. PRIVATE SECRETS
 * ============================================================================
 * 
 * 1. PUBLIC WEB CONFIGURATION (Safe to include below):
 *    - apiKey:            Public Google Cloud client identifier.
 *    - authDomain:        Domain handling OAuth verification and auth callbacks.
 *    - projectId:         Unique identifier for your Firebase and Google Cloud project.
 *    - storageBucket:     Cloud Storage bucket container identifier.
 *    - messagingSenderId: Numerical identifier for Firebase Cloud Messaging.
 *    - appId:             Public registration ID of your web application client.
 *    - measurementId:     Optional stream ID for Google Analytics.
 * 
 *    WHY ARE THESE SAFE IN FRONTEND CODE?
 *    Firebase web clients communicate directly with Firebase Authentication and
 *    Cloud Firestore. Access to your database is strictly guarded by Cloud Firestore
 *    Security Rules (firestore.rules) and Firebase Authentication, NOT by hiding
 *    the apiKey. The apiKey merely identifies which Firebase project to contact.
 * 
 * 2. PRIVATE SECRETS (MUST NEVER BE PUT IN FRONTEND CODE):
 *    - Google Cloud Service Account Private Keys (serviceAccountKey.json, private_key).
 *    - Firebase Admin SDK credentials and OAuth client secrets.
 *    - Database master passwords or cloud IAM root credentials.
 * 
 *    WARNING:
 *    Service account keys grant administrative access that bypasses all security rules.
 *    Never place private keys or service account credentials in client-side code.
 * ============================================================================
 */

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDIcyY2qFkCABuf8dAPHhpAex-YUkcnAd8",
  authDomain: "pomodoro-sanctuary.firebaseapp.com",
  projectId: "pomodoro-sanctuary",
  storageBucket: "pomodoro-sanctuary.firebasestorage.app",
  messagingSenderId: "285841108975",
  appId: "1:285841108975:web:d546e5dc3307cb7428501a",
  measurementId: "G-W5ZED9TN7E"
};

// Clean up any legacy in-app localStorage config overrides from previous versions
try {
  localStorage.removeItem('algorithmic_pomodoro_firebase_config');
} catch (_) {}

window.ConfigManager = {
  /**
   * Retrieves the fixed Firebase configuration defined in window.FIREBASE_CONFIG.
   * No localStorage overrides are allowed.
   */
  getConfig() {
    const cfg = window.FIREBASE_CONFIG || {};
    const apiKey = (cfg.apiKey || '').trim();
    const projectId = (cfg.projectId || '').trim();

    const isConfigured = Boolean(
      apiKey &&
      apiKey !== "YOUR_FIREBASE_API_KEY" &&
      projectId &&
      projectId !== "YOUR_PROJECT_ID"
    );

    if (isConfigured) {
      return {
        apiKey,
        authDomain: (cfg.authDomain || `${projectId}.firebaseapp.com`).trim(),
        projectId,
        storageBucket: (cfg.storageBucket || `${projectId}.firebasestorage.app`).trim(),
        messagingSenderId: (cfg.messagingSenderId || '').trim(),
        appId: (cfg.appId || '').trim(),
        measurementId: (cfg.measurementId || '').trim(),
        source: 'config.js'
      };
    }

    return {
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: '',
      measurementId: '',
      source: 'none'
    };
  },

  /**
   * Returns true if valid Firebase credentials are provided in js/config.js.
   */
  isConfigured() {
    const cfg = this.getConfig();
    return Boolean(cfg.apiKey && cfg.projectId);
  }
};
