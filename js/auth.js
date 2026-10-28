/**
 * The Algorithmic Ambient Room - Firebase Authentication Manager
 * Handles Firebase Auth (Sign Up, Sign In, Sign Out, Persistent Sessions)
 * Automatically falls back to Guest Mode when unauthenticated or unconfigured.
 */

window.AuthManager = {
  app: null,
  auth: null,
  currentUser: null,
  isInitialized: false,
  listeners: [],

  init() {
    if (!window.ConfigManager || !window.ConfigManager.isConfigured()) {
      console.log("AuthManager: Firebase is not configured yet. Operating in local Guest Mode.");
      this.isInitialized = true;
      this.notifyListeners('CONFIG_MISSING', null);
      return false;
    }

    if (typeof window.firebase === 'undefined' || !window.firebase.initializeApp) {
      console.warn("AuthManager: Firebase SDK not loaded on window.");
      return false;
    }

    try {
      const config = window.ConfigManager.getConfig();

      // Initialize or reuse Firebase App instance
      if (!window.firebase.apps.length) {
        this.app = window.firebase.initializeApp(config);
      } else {
        this.app = window.firebase.app();
      }

      this.auth = window.firebase.auth();

      // Listen for persistent auth state changes
      this.auth.onAuthStateChanged((user) => {
        this.currentUser = user;
        console.log("AuthManager: Firebase Auth state changed ->", user ? user.email : 'Guest');
        this.notifyListeners(user ? 'SIGNED_IN' : 'SIGNED_OUT', user);
      });

      this.isInitialized = true;
      return true;
    } catch (e) {
      console.error("AuthManager: Failed to initialize Firebase:", e);
      return false;
    }
  },

  reinitialize() {
    this.app = null;
    this.auth = null;
    this.currentUser = null;
    return this.init();
  },

  onAuthStateChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
      if (this.isInitialized) {
        callback(this.currentUser ? 'CURRENT_STATE' : 'GUEST', this.currentUser, this.currentUser);
      }
    }
  },

  notifyListeners(event, user) {
    this.listeners.forEach(cb => {
      try {
        cb(event, user, user);
      } catch (e) {
        console.error("AuthManager: Listener error:", e);
      }
    });
  },

  isAuthenticated() {
    return Boolean(this.currentUser);
  },

  getUser() {
    return this.currentUser;
  },

  getUserUid() {
    return this.currentUser ? this.currentUser.uid : null;
  },

  getUserEmail() {
    return this.currentUser ? this.currentUser.email : null;
  },

  async signUp(email, password) {
    if (!this.auth) {
      throw new Error("Firebase is not configured yet. Please configure your project credentials first.");
    }

    if (!email || !password) {
      throw new Error("Please enter both an email and a password.");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email.trim(), password);
      return userCredential.user;
    } catch (error) {
      throw new Error(this.humanizeError(error));
    }
  },

  async signIn(email, password) {
    if (!this.auth) {
      throw new Error("Firebase is not configured yet. Please configure your project credentials first.");
    }

    if (!email || !password) {
      throw new Error("Please enter both an email and a password.");
    }

    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email.trim(), password);
      return userCredential.user;
    } catch (error) {
      throw new Error(this.humanizeError(error));
    }
  },

  async signOut() {
    if (!this.auth) return;
    try {
      await this.auth.signOut();
    } catch (e) {
      console.warn("AuthManager: Sign out error:", e);
    }
    this.currentUser = null;
    this.notifyListeners('SIGNED_OUT', null);
  },

  humanizeError(error) {
    if (!error) return "An unknown error occurred.";
    const code = error.code || '';
    const message = (error.message || '').toLowerCase();

    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return "Incorrect email or password. Please verify and try again.";
      case 'auth/email-already-in-use':
        return "An account with this email already exists. Try signing in instead.";
      case 'auth/weak-password':
        return "Password is too weak. Please use at least 6 characters.";
      case 'auth/invalid-email':
        return "Please enter a valid email address.";
      case 'auth/too-many-requests':
        return "Too many failed attempts. Please wait a moment and try again.";
      case 'auth/network-request-failed':
        return "Network connection issue. Please check your internet connection.";
      case 'auth/operation-not-allowed':
        return "Email/Password sign-in is not enabled in Firebase Console. Go to Authentication -> Sign-in method -> Email/Password to enable it.";
      case 'auth/unauthorized-domain':
        return "This domain is not authorized for Firebase Auth. Go to Authentication -> Settings -> Authorized domains in Firebase Console to add it.";
      default:
        return error.message || "Authentication error.";
    }
  }
};
