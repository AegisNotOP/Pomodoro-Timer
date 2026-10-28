# Firebase Backend Setup & Cloud Sync Guide

This document is the official setup guide for **The Algorithmic Ambient Room** Pomodoro focus sanctuary. The application uses **Firebase Authentication** for user accounts and **Cloud Firestore** for secure, real-time study-session history and statistics.

---

## 1. Architecture & Security Model

### Guest Mode First
- The timer, ambient audio engine, generative canvas, and local session tracking work **100% offline without signing in**.
- When an account is created or signed in, all sessions recorded in guest mode automatically sync to Cloud Firestore without duplicates.

### Public Web-App Configuration vs. Private Secrets
Firebase uses a client-side architecture where web apps communicate directly with Google Cloud services using public identifiers:

| Configuration Item | Status | Purpose |
| :--- | :--- | :--- |
| `apiKey` | **Public** | Identifies your Firebase project to Google APIs. Routes requests from your browser. |
| `authDomain` | **Public** | Domain used for OAuth redirects and auth state verification. |
| `projectId` | **Public** | Unique identifier for your Firebase and Google Cloud project. |
| `storageBucket` | **Public** | Name of the Cloud Storage bucket for asset storage. |
| `messagingSenderId` | **Public** | Numeric sender ID for Firebase Cloud Messaging. |
| `appId` | **Public** | Unique identifier for your registered Firebase web app. |
| `measurementId` | **Public** | Optional Google Analytics stream ID. |

> [!IMPORTANT]
> **What credentials must NEVER be placed in frontend code?**
> - **Google Cloud Service Account Keys** (`serviceAccountKey.json`, containing `"type": "service_account"`, `"private_key": "-----BEGIN PRIVATE KEY..."`).
> - **Firebase Admin SDK credentials** or Google Cloud IAM service account tokens.
> - Database administrative passwords or OAuth client secrets.
> 
> Service account keys grant administrative access that bypasses all security rules. In contrast, client-side Firebase access is strictly protected by **Cloud Firestore Security Rules** (`firestore.rules`), which enforce user-by-user data isolation.

---

## 2. Step-by-Step Firebase Console Setup (5–10 Minutes)

### Step 1: Create a Free Firebase Project
1. Open the [Firebase Console](https://console.firebase.google.com/) and sign in with your Google account.
2. Click **Add project** (or **Create a project**).
3. Enter a project name (e.g. `pomodoro-sanctuary`).
4. (Optional) Disable Google Analytics if not needed, then click **Create project**.
5. Once provisioning completes, click **Continue**.

---

### Step 2: Enable Email/Password Authentication
1. In the left navigation menu, go to **Build** $\to$ **Authentication**.
2. Click **Get started**.
3. Under the **Sign-in method** tab, click **Email/Password**.
4. Switch the **Enable** toggle to ON (leave "Email link (passwordless sign-in)" disabled).
5. Click **Save**.

---

### Step 3: Configure Authorized Domains
1. In the **Authentication** section, click the **Settings** tab at the top.
2. Select **Authorized domains** in the secondary menu.
3. By default, `localhost` and `your-project-id.firebaseapp.com` are already listed.
4. If you run the app from an IP or custom domain, click **Add domain**:
   - For local development servers using an IP, add `127.0.0.1`.
   - For GitHub Pages, add `username.github.io`.
   - For custom hosting, add `yourdomain.com`.
5. Click **Save**.

---

### Step 4: Create Cloud Firestore Database
1. In the left navigation menu, go to **Build** $\to$ **Firestore Database**.
2. Click **Create database**.
3. **Database location**: Choose a multi-region or regional location nearest to your location (e.g. `nam5` [us-central] or `eur3` [europe-west]).
4. **Security rules**: Select **Start in production mode** (we will deploy our rules in the next step).
5. Click **Create** and wait a moment for the database to provision.

---

### Step 5: Deploy Firestore Security Rules
1. In the **Firestore Database** section, click on the **Rules** tab at the top.
2. Open the file [`firestore.rules`](firestore.rules) in this repository and copy its entire contents.
3. Paste the contents into the Firebase Console rules editor, replacing any default rules.
4. Click **Publish**.

#### What These Rules Enforce:
- **Strict User Isolation**: All records live under `/users/{userId}/study_sessions/{sessionId}`. Queries and mutations are restricted to `request.auth.uid == userId`. Users cannot read, write, or query another user's sessions.
- **Schema Validation**: Ensures all required fields exist, `mode` is one of `['focus', 'shortBreak', 'longBreak']`, `duration_minutes` is non-negative, and timestamps are valid.
- **Field Whitelist & Immutability**: Prohibits unexpected fields and prevents altering document ownership (`userId`) upon update.
- **Default Deny**: Closes all other database collections to unauthorized access.

---

### Step 6: Register Web App & Get Configuration
1. Click the **gear icon** (Project Settings) at the top of the left sidebar.
2. In the **General** tab, scroll down to the **Your apps** card.
3. Click the **Web** icon (`</>`).
4. Enter an App nickname (e.g., `Pomodoro Web`).
5. Click **Register app**.
6. Firebase will display your `firebaseConfig` object snippet:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     storageBucket: "your-project.firebasestorage.app",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef..."
   };
   ```

---

## 3. Connecting Firebase to the Website

You have two ways to supply your configuration:

### Method A: In-App UI Configuration (Recommended)
1. Open the website in your browser.
2. Click **Sign In** in the top navigation bar.
3. Click the **Firebase Project Settings** accordion at the bottom of the dialog.
4. Paste your configuration object snippet or enter your **API Key** and **Project ID**.
5. Click **Save & Connect Firebase**.
6. The configuration is saved to your browser's local storage and immediately overrides any default settings.

### Method B: Code-Level Configuration ([`js/config.js`](js/config.js))
1. Open [`js/config.js`](js/config.js) in your editor.
2. Fill in the `window.FIREBASE_CONFIG` object with your project credentials:
   ```javascript
   window.FIREBASE_CONFIG = {
     apiKey: "AIzaSy...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     storageBucket: "your-project.firebasestorage.app",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef..."
   };
   ```
3. Save the file.

> [!TIP]
> **Configuration Priority:**
> In-app settings entered via the UI modal always take precedence over code-level values in `js/config.js`. If you need to clear the in-app override, click **Clear** in the Firebase Project Settings accordion.

---

## 4. Verification & Testing

1. **Guest Mode**: Open the app without entering credentials. The timer, soundscapes, and palette controls function normally. Completed sessions are saved locally and visible in **Study History** with the `Local Guest Storage` badge.
2. **Account Creation**: Click **Sign In**, switch to **Create Account**, enter an email and password ($\ge 6$ characters), and submit.
3. **Cloud Sync**: Upon sign-in, your email appears in the top navigation bar, and any offline sessions are synced into Cloud Firestore.
4. **Session Recording**: Complete a focus or break session; verify that it appears once in the Study History list and that total focus time and today's session counts match the on-screen counter.
