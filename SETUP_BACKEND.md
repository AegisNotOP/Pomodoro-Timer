# Firebase Setup & Deployment Guide

This document is the official setup and deployment guide for **The Algorithmic Ambient Room** Pomodoro focus sanctuary. The application uses **Firebase Authentication** for user accounts and **Cloud Firestore** for cross-device study-session history and statistics.

---

## 1. Where to Put Your Firebase Web Configuration

The application uses **one fixed, code-level Firebase configuration**. There are no in-app settings forms or `localStorage` overrides.

Open [`js/config.js`](js/config.js) and paste your public web app credentials directly into `window.FIREBASE_CONFIG`:

```javascript
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX" // Optional Google Analytics stream ID
};
```

---

## 2. Public Web Configuration vs. Forbidden Private Credentials

### Public Web Configuration (Safe in `js/config.js`)
The values in `window.FIREBASE_CONFIG` (`apiKey`, `projectId`, `authDomain`, `storageBucket`, `messagingSenderId`, `appId`) identify your client web application to Google Cloud endpoints. 

In Firebase's architecture, browsers connect directly to Firebase Authentication and Cloud Firestore without a custom intermediate server. Data privacy and user isolation are enforced by **Cloud Firestore Security Rules** ([`firestore.rules`](firestore.rules)), not by keeping the `apiKey` secret.

### Forbidden Private Credentials (NEVER Put in Frontend Code)
> [!CAUTION]
> **Never include any of the following in this repository or client-side files:**
> - **Google Cloud Service Account Keys** (`serviceAccountKey.json`, or any JSON containing `"private_key": "-----BEGIN PRIVATE KEY..."`).
> - **Firebase Admin SDK private keys**.
> - Database master passwords or cloud IAM root credentials.
> 
> Service account credentials bypass all Firestore Security Rules, granting unrestricted administrative access to read, overwrite, or delete all databases. Client-side applications only ever need the public web app configuration shown above.

---

## 3. Step-by-Step Firebase Console Setup

### Step 1: Create a Free Firebase Project
1. Open the [Firebase Console](https://console.firebase.google.com/) and sign in with your Google account.
2. Click **Add project** (or **Create a project**).
3. Name your project (e.g., `pomodoro-sanctuary`).
4. (Optional) Disable Google Analytics if not needed, then click **Create project**.

---

### Step 2: Enable Email/Password Authentication
1. In the left navigation menu, go to **Build** $\to$ **Authentication**.
2. Click **Get started**.
3. Under the **Sign-in method** tab, click **Email/Password**.
4. Switch the **Enable** toggle to ON (leave "Email link (passwordless sign-in)" disabled).
5. Click **Save**.

---

### Step 3: Configure Authorized Domains
Firebase Authentication only accepts requests originating from approved domains.
1. In **Authentication**, click the **Settings** tab at the top.
2. Select **Authorized domains** in the sub-menu.
3. `localhost` and `your-project-id.firebaseapp.com` are authorized by default.
4. Click **Add domain** for any environment you use:
   - For VS Code Live Server or IP testing, add: `127.0.0.1`
   - For GitHub Pages, add: `your-username.github.io`
   - For custom hosting, add: `yourdomain.com`

> [!NOTE]
> When adding domains, enter only the hostname (e.g. `127.0.0.1` or `username.github.io`). Do not include `http://`, `https://`, port numbers, or trailing slashes.

---

### Step 4: Create Cloud Firestore Database
1. In the left navigation menu, go to **Build** $\to$ **Firestore Database**.
2. Click **Create database**.
3. **Database location**: Choose a regional location near you (e.g. `nam5` [us-central] or `eur3` [europe-west]).
4. **Security rules**: Select **Start in production mode**.
5. Click **Create**.

---

### Step 5: Deploy Firestore Security Rules
1. In **Firestore Database**, click the **Rules** tab at the top.
2. Open [`firestore.rules`](firestore.rules) from this project and copy its entire contents.
3. Paste the contents into the Firebase Console rules editor.
4. Click **Publish**.

#### What These Rules Guarantee:
- **Strict User Isolation**: All records live under `/users/{userId}/study_sessions/{sessionId}`. Read, write, and delete permissions are granted strictly when `request.auth.uid == userId`.
- **Validation**: Enforces non-negative `duration_minutes`, valid timestamps, and allowed modes (`'focus'`, `'shortBreak'`, `'longBreak'`).
- **Immutability**: Prevents tampering with ownership (`userId`) or creation timestamps.
- **Default Deny**: Closes all other paths to unauthorized access.

---

### Step 6: Register Web App & Copy Configuration
1. Click the **gear icon** (Project Settings) at the top of the left sidebar.
2. In the **General** tab, scroll to the **Your apps** card and click the **Web icon** (`</>`).
3. Enter an App nickname (e.g., `Pomodoro Web`) and click **Register app**.
4. Copy the values inside `firebaseConfig` and paste them into `window.FIREBASE_CONFIG` in [`js/config.js`](js/config.js).

---

## 4. How to Deploy the Application

This is a static web application (HTML, CSS, vanilla JavaScript). It requires no build step (`npm run build`), no Node.js runtime, and no backend server.

### Option A: Deploy to GitHub Pages (Recommended, Free)
1. Initialize a git repository and commit your files:
   ```bash
   git init
   git add .
   git commit -m "Initial Pomodoro setup"
   ```
2. Push your repository to GitHub:
   ```bash
   git remote add origin https://github.com/your-username/pomodoro-timer.git
   git branch -M main
   git push -u origin main
   ```
3. In your GitHub repository:
   - Go to **Settings** $\to$ **Pages**.
   - Under **Build and deployment $\to$ Source**, select **Deploy from a branch**.
   - Select `main` branch and `/ (root)` folder, then click **Save**.
4. GitHub Pages will publish your site at `https://your-username.github.io/pomodoro-timer/`.
5. **Important**: In the Firebase Console, go to **Authentication $\to$ Settings $\to$ Authorized domains** and add `your-username.github.io`.

---

### Option B: Deploy to Firebase Hosting (Free, Fast)
1. Install the Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Log in and initialize hosting in your project root:
   ```bash
   firebase login
   firebase init hosting
   ```
   - Select your Firebase project.
   - When asked for your public directory, type `.` (or press Enter if default).
   - Configure as a single-page app: `No`.
   - Overwrite `index.html`: `No`.
3. Deploy to production:
   ```bash
   firebase deploy --only hosting
   ```
4. Firebase Hosting URLs (`https://your-project-id.web.app`) are **automatically pre-authorized** for authentication.

---

### Option C: Deploy to Netlify or Vercel
1. Drag and drop the project folder onto the [Netlify Drop](https://app.netlify.com/drop) page, or import the GitHub repository in [Vercel](https://vercel.com).
2. Copy your assigned production URL (e.g., `pomodoro-timer.netlify.app` or `pomodoro.vercel.app`).
3. Add that domain to **Authentication $\to$ Settings $\to$ Authorized domains** in the Firebase Console.

---

### Option D: Local Development Server
Modern browsers disallow authentication from `file:///` URLs (because `file:///` produces a `null` origin). To test locally, use any static web server:

```bash
# Using Python 3:
python -m http.server 8000

# Using Node / npx:
npx serve .
```

Then open `http://localhost:8000` or `http://127.0.0.1:8000`. (Ensure `127.0.0.1` is in your Authorized Domains list).

---

## 5. Offline Guest Mode & Status Messaging

- **Unconfigured Notice**: When Firebase credentials are not yet entered in `js/config.js`, opening the Sign-In modal displays an informative message explaining that the app is in offline Guest Mode, and prompts you to configure `js/config.js`.
- **Guest Mode Functionality**: Users can run focus timers, change sound mixer sliders, switch themes, and track study history completely offline.
- **Automatic Cloud Sync**: As soon as valid credentials are added in `js/config.js` and an account is created or signed in, all previously logged offline sessions automatically sync into Cloud Firestore without creating duplicate records.
