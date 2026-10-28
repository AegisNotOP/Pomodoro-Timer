/**
 * The Algorithmic Ambient Room - Cloud Firestore Study Session Sync Engine
 * Handles saving, fetching, syncing, and metrics calculation for Pomodoro sessions.
 * Seamlessly transitions between offline guest storage and Cloud Firestore persistence.
 */

window.StudySync = {
  OFFLINE_STORAGE_KEY: 'algorithmic_pomodoro_offline_sessions',
  listeners: [],
  isSyncing: false,

  // --- LOCAL CALENDAR DATE HELPER ---
  /**
   * Returns a YYYY-MM-DD string according to the device's local calendar day.
   * Ensures identical date evaluation across the on-screen counter and history metrics.
   */
  getLocalDateString(dateInput = new Date()) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // --- OFFLINE / GUEST STORAGE HELPERS ---
  getOfflineSessions() {
    try {
      const raw = localStorage.getItem(this.OFFLINE_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("StudySync: Error reading offline sessions:", e);
      return [];
    }
  },

  saveOfflineSessions(sessions) {
    try {
      localStorage.setItem(this.OFFLINE_STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.warn("StudySync: Error writing offline sessions:", e);
    }
  },

  generateLocalId() {
    return 'loc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  },

  getFirestore() {
    if (typeof window.firebase !== 'undefined' && window.firebase.firestore) {
      return window.firebase.firestore();
    }
    return null;
  },

  getUserSessionsCollection(userUid) {
    const db = this.getFirestore();
    if (!db || !userUid) return null;
    return db.collection('users').doc(userUid).collection('study_sessions');
  },

  // --- RECORD A SESSION ---
  async recordSession({
    mode = 'focus',
    duration_minutes = 25,
    started_at = null,
    ended_at = null,
    completed_naturally = true,
    notes = ''
  }) {
    const now = new Date();
    const startedIso = started_at ? new Date(started_at).toISOString() : new Date(now.getTime() - duration_minutes * 60000).toISOString();
    const endedIso = ended_at ? new Date(ended_at).toISOString() : now.toISOString();

    const sessionPayload = {
      mode,
      duration_minutes: Math.max(0, Math.round(duration_minutes)),
      started_at: startedIso,
      ended_at: endedIso,
      completed_naturally: Boolean(completed_naturally),
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    const isAuth = window.AuthManager && window.AuthManager.isAuthenticated();
    const userUid = window.AuthManager ? window.AuthManager.getUserUid() : null;

    if (isAuth && userUid) {
      const collectionRef = this.getUserSessionsCollection(userUid);
      if (collectionRef) {
        try {
          const docRef = await collectionRef.add({
            ...sessionPayload,
            userId: userUid
          });

          console.log("StudySync: Session saved to Cloud Firestore:", docRef.id);
          this.notifyChange('SAVED_CLOUD');
          return { success: true, cloud: true, id: docRef.id };
        } catch (err) {
          console.warn("StudySync: Cloud Firestore write failed, saving to local queue:", err);
          this.storeOfflineSession({ ...sessionPayload, synced: false, localId: this.generateLocalId() });
          this.notifyChange('SAVED_OFFLINE_FALLBACK');
          return { success: true, cloud: false, fallback: true };
        }
      }
    }

    // Guest / Offline Mode
    this.storeOfflineSession({
      ...sessionPayload,
      synced: false,
      localId: this.generateLocalId()
    });
    console.log("StudySync: Session stored in local guest storage.");
    this.notifyChange('SAVED_GUEST');
    return { success: true, cloud: false, guest: true };
  },

  storeOfflineSession(session) {
    const list = this.getOfflineSessions();
    list.unshift(session);
    if (list.length > 200) list.length = 200;
    this.saveOfflineSessions(list);
  },

  // --- SYNC OFFLINE SESSIONS TO CLOUD UPON SIGN IN ---
  async syncOfflineSessions() {
    if (!window.AuthManager || !window.AuthManager.isAuthenticated()) {
      return { syncedCount: 0, reason: 'not_authenticated' };
    }

    if (this.isSyncing) {
      console.log("StudySync: Sync already in progress, skipping duplicate call.");
      return { syncedCount: 0, reason: 'already_syncing' };
    }

    const userUid = window.AuthManager.getUserUid();
    const collectionRef = this.getUserSessionsCollection(userUid);
    if (!collectionRef) return { syncedCount: 0 };

    const offlineList = this.getOfflineSessions();
    const unsynced = offlineList.filter(s => !s.synced);

    if (unsynced.length === 0) {
      return { syncedCount: 0 };
    }

    this.isSyncing = true;
    console.log(`StudySync: Attempting to sync ${unsynced.length} offline sessions to Firestore...`);

    const db = this.getFirestore();
    let syncedSuccess = 0;

    try {
      // Use Firestore Batched Write with idempotent document keys based on localId
      const batch = db.batch();
      unsynced.forEach(s => {
        const docId = s.localId || this.generateLocalId();
        const docRef = collectionRef.doc(docId);
        batch.set(docRef, {
          userId: userUid,
          mode: s.mode,
          duration_minutes: s.duration_minutes,
          started_at: s.started_at,
          ended_at: s.ended_at,
          completed_naturally: s.completed_naturally,
          notes: s.notes || '',
          created_at: s.created_at || new Date().toISOString()
        });
      });

      await batch.commit();
      syncedSuccess = unsynced.length;

      // Mark offline records as synced
      const updatedList = offlineList.map(s => ({ ...s, synced: true }));
      this.saveOfflineSessions(updatedList);

      console.log(`StudySync: Successfully synced ${syncedSuccess} sessions to Cloud Firestore.`);
      this.notifyChange('OFFLINE_SYNCED');
      return { syncedCount: syncedSuccess };
    } catch (e) {
      console.error("StudySync: Error during Firestore batch sync:", e);
      return { syncedCount: 0, error: e.message };
    } finally {
      this.isSyncing = false;
    }
  },

  // --- FETCH STUDY HISTORY ---
  async fetchHistory(limit = 60) {
    const isAuth = window.AuthManager && window.AuthManager.isAuthenticated();
    const userUid = window.AuthManager ? window.AuthManager.getUserUid() : null;

    if (isAuth && userUid) {
      const collectionRef = this.getUserSessionsCollection(userUid);
      if (collectionRef) {
        try {
          const snapshot = await collectionRef
            .orderBy('started_at', 'desc')
            .limit(limit)
            .get();

          const cloudSessions = [];
          snapshot.forEach(doc => {
            cloudSessions.push({
              id: doc.id,
              ...doc.data()
            });
          });

          // Combine with any unsynced local sessions
          const offlineList = this.getOfflineSessions();
          const unsynced = offlineList.filter(s => !s.synced);

          // Deduplicate across local and cloud collections
          const seenIds = new Set();
          const combined = [];

          // 1. Local unsynced sessions
          unsynced.forEach(s => {
            const key = s.id || s.localId;
            if (key && !seenIds.has(key)) {
              seenIds.add(key);
              combined.push(s);
            }
          });

          // 2. Cloud sessions
          cloudSessions.forEach(s => {
            const key = s.id || s.localId;
            if (key && !seenIds.has(key)) {
              seenIds.add(key);
              combined.push(s);
            }
          });

          combined.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));

          return {
            source: 'cloud',
            sessions: combined,
            hasUnsynced: unsynced.length > 0
          };
        } catch (e) {
          console.warn("StudySync: Firestore fetch error, falling back to local:", e);
          return { source: 'local', sessions: this.getOfflineSessions(), error: e.message };
        }
      }
    }

    // Guest Mode
    return {
      source: 'local',
      sessions: this.getOfflineSessions(),
      hasUnsynced: false
    };
  },

  // --- CALCULATE SUMMARY METRICS ---
  calculateStats(sessions = []) {
    let totalFocusMinutes = 0;
    let completedFocusSessions = 0;
    let todayFocusMinutes = 0;
    let todaySessionsCount = 0;
    let breakMinutes = 0;

    // Use device local calendar date (YYYY-MM-DD), consistently matching the daily focus counter
    const todayStr = this.getLocalDateString(new Date());

    sessions.forEach(s => {
      const isFocus = s.mode === 'focus';
      const dur = parseInt(s.duration_minutes, 10) || 0;
      
      // Determine session start date in device local calendar time
      const sessionLocalDate = this.getLocalDateString(s.started_at);
      const isToday = Boolean(sessionLocalDate && sessionLocalDate === todayStr);

      if (isFocus) {
        totalFocusMinutes += dur;
        if (s.completed_naturally) {
          completedFocusSessions++;
        }
        if (isToday) {
          todayFocusMinutes += dur;
          if (s.completed_naturally) todaySessionsCount++;
        }
      } else {
        breakMinutes += dur;
      }
    });

    const totalHours = (totalFocusMinutes / 60).toFixed(1);
    const todayHours = (todayFocusMinutes / 60).toFixed(1);

    return {
      totalFocusMinutes,
      totalHours,
      completedFocusSessions,
      todayFocusMinutes,
      todayHours,
      todaySessionsCount,
      breakMinutes,
      sessionCount: sessions.length
    };
  },

  // --- DELETE A RECORD ---
  async deleteSession(sessionId) {
    if (!sessionId) return false;

    // Check offline list
    const offlineList = this.getOfflineSessions();
    const filteredOffline = offlineList.filter(s => s.id !== sessionId && s.localId !== sessionId);
    if (filteredOffline.length !== offlineList.length) {
      this.saveOfflineSessions(filteredOffline);
    }

    // If cloud document
    const isAuth = window.AuthManager && window.AuthManager.isAuthenticated();
    const userUid = window.AuthManager ? window.AuthManager.getUserUid() : null;

    if (isAuth && userUid) {
      const collectionRef = this.getUserSessionsCollection(userUid);
      if (collectionRef) {
        try {
          await collectionRef.doc(sessionId).delete();
        } catch (e) {
          console.warn("StudySync: Failed to delete session from Firestore:", e);
          return false;
        }
      }
    }

    this.notifyChange('SESSION_DELETED');
    return true;
  },

  // --- EVENT NOTIFICATIONS ---
  onChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  },

  notifyChange(eventType) {
    this.listeners.forEach(cb => {
      try {
        cb(eventType);
      } catch (e) {
        console.error("StudySync: Error in listener:", e);
      }
    });
  }
};
