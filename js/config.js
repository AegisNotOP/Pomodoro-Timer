/**
 * The Algorithmic Ambient Room - Firebase Configuration
 * 
 * ============================================================================
 * PUBLIC FIREBASE WEB-APP CONFIGURATION VS. PRIVATE SECRETS
 * ============================================================================
 * 
 * 1. PUBLIC WEB CONFIGURATION (Safe in Frontend Code):
 *    - apiKey:            Client identifier routing requests to your Google Cloud project.
 *    - authDomain:        Domain handling OAuth verification and auth callbacks.
 *    - projectId:         Unique identifier for your Firebase and Google Cloud project.
 *    - storageBucket:     Cloud Storage bucket container identifier.
 *    - messagingSenderId: Numerical ID for Google Cloud Messaging.
 *    - appId:             Public registration ID of your web application client.
 *    - measurementId:     Optional stream ID for Google Analytics.
 * 
 *    WHY ARE THESE SAFE IN FRONTEND CODE?
 *    Firebase operates on an open client architecture where web browsers connect
 *    directly to Firebase Authentication and Cloud Firestore without an intermediate
 *    backend server. Data access and user privacy are strictly enforced at the
 *    database layer by Cloud Firestore Security Rules (firestore.rules), NOT by
 *    keeping the apiKey secret.
 * 
 * 2. PRIVATE SECRETS (MUST NEVER BE PUT IN FRONTEND CODE):
 *    - Google Cloud Service Account Private Keys (serviceAccountKey.json, private_key).
 *    - Firebase Admin SDK credentials and OAuth client secrets.
 *    - Database master passwords or cloud IAM root credentials.
 * 
 *    DANGER:
 *    Service account keys completely bypass all Firestore Security Rules, giving
 *    full administrative read, write, and drop access to your entire database.
 *    Antigravity and standard security practices forbid service-account keys in client files.
 * ============================================================================
 * 
 * CONFIGURATION PRIORITY:
 * 1. In-App UI Configuration (localStorage):
 *    Credentials entered via "Firebase Project Settings" in the website dialog
 *    take top priority and reliably override code-level values.
 * 2. Code-Level Configuration (window.FIREBASE_CONFIG):
 *    Fill in the placeholders below for a persistent zero-configuration setup.
 * 3. Guest Mode (Unconfigured):
 *    If no credentials are provided, the app operates 100% in local guest mode.
 */

window.FIREBASE_CONFIG = {
  apiKey: "",             // e.g. "AIzaSy..." (Public web client identifier)
  authDomain: "",         // e.g. "your-project-id.firebaseapp.com"
  projectId: "",          // e.g. "your-project-id"
  storageBucket: "",      // e.g. "your-project-id.firebasestorage.app"
  messagingSenderId: "",  // e.g. "123456789012"
  appId: "",              // e.g. "1:123456789012:web:abcdef123456"
  measurementId: ""       // Optional e.g. "G-XXXXXXXXXX"
};

window.ConfigManager = {
  STORAGE_KEY: 'algorithmic_pomodoro_firebase_config',

  /**
   * Retrieves active configuration with strict priority:
   * Priority 1: In-app user configuration stored in localStorage (reliable UI override)
   * Priority 2: Code defaults in window.FIREBASE_CONFIG (if filled with real keys)
   * Priority 3: Empty unconfigured object (guest mode fallback)
   */
  getConfig() {
    // 1. Check in-app configuration (localStorage) first
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          const apiKey = (parsed.apiKey || '').trim();
          const projectId = (parsed.projectId || '').trim();
          if (apiKey && projectId && apiKey !== 'YOUR_FIREBASE_API_KEY') {
            return {
              apiKey,
              authDomain: (parsed.authDomain || `${projectId}.firebaseapp.com`).trim(),
              projectId,
              storageBucket: (parsed.storageBucket || `${projectId}.firebasestorage.app`).trim(),
              messagingSenderId: (parsed.messagingSenderId || '').trim(),
              appId: (parsed.appId || '').trim(),
              measurementId: (parsed.measurementId || '').trim(),
              source: 'localStorage'
            };
          }
        }
      }
    } catch (e) {
      console.warn("ConfigManager: Error reading stored in-app Firebase config:", e);
    }

    // 2. Fall back to code-level defaults in window.FIREBASE_CONFIG if populated
    const cfg = window.FIREBASE_CONFIG || {};
    const codeApiKey = (cfg.apiKey || '').trim();
    const codeProjectId = (cfg.projectId || '').trim();
    const hasValidCodeConfig = Boolean(
      codeApiKey &&
      codeApiKey !== "YOUR_FIREBASE_API_KEY" &&
      codeProjectId &&
      codeProjectId !== "YOUR_PROJECT_ID"
    );

    if (hasValidCodeConfig) {
      return {
        apiKey: codeApiKey,
        authDomain: (cfg.authDomain || `${codeProjectId}.firebaseapp.com`).trim(),
        projectId: codeProjectId,
        storageBucket: (cfg.storageBucket || `${codeProjectId}.firebasestorage.app`).trim(),
        messagingSenderId: (cfg.messagingSenderId || '').trim(),
        appId: (cfg.appId || '').trim(),
        measurementId: (cfg.measurementId || '').trim(),
        source: 'config.js'
      };
    }

    // 3. Fallback: Unconfigured Guest Mode
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

  isConfigured() {
    const cfg = this.getConfig();
    return Boolean(cfg.apiKey && cfg.projectId);
  },

  saveOverride(configInput) {
    let cleanConfig = {};

    if (typeof configInput === 'string') {
      const trimmed = configInput.trim();
      try {
        cleanConfig = JSON.parse(trimmed);
      } catch (e) {
        // Parse loose key: "value" pairs if user pasted a JavaScript object snippet
        const matches = trimmed.match(/([a-zA-Z0-9_]+)\s*:\s*["']([^"']+)["']/g);
        if (matches) {
          matches.forEach(m => {
            const colonIdx = m.indexOf(':');
            const k = m.slice(0, colonIdx).trim();
            const v = m.slice(colonIdx + 1).replace(/["',]/g, '').trim();
            cleanConfig[k] = v;
          });
        }
      }
    } else if (typeof configInput === 'object' && configInput !== null) {
      cleanConfig = { ...configInput };
    }

    if (!cleanConfig.apiKey || !cleanConfig.projectId) {
      throw new Error("Both 'apiKey' and 'projectId' are required to connect Firebase.");
    }

    const savedPayload = {
      apiKey: cleanConfig.apiKey.trim(),
      authDomain: (cleanConfig.authDomain || `${cleanConfig.projectId}.firebaseapp.com`).trim(),
      projectId: cleanConfig.projectId.trim(),
      storageBucket: (cleanConfig.storageBucket || `${cleanConfig.projectId}.firebasestorage.app`).trim(),
      messagingSenderId: (cleanConfig.messagingSenderId || '').trim(),
      appId: (cleanConfig.appId || '').trim(),
      measurementId: (cleanConfig.measurementId || '').trim(),
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(savedPayload));
    return true;
  },

  clearOverride() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
};
