/**
 * The Algorithmic Ambient Room - Cloud Firestore Study Session Sync Engine
 * Handles saving, fetching, syncing, live in-progress tracking, and metrics calculation
 * for Pomodoro sessions. Seamlessly transitions between offline guest storage and Cloud Firestore.
 */

window.StudySync = {
  OFFLINE_STORAGE_KEY: 'algorithmic_pomodoro_offline_sessions',
  ACTIVE_STORAGE_KEY: 'algorithmic_pomodoro_active_session',
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

  upsertOfflineSession(session) {
    if (!session || (!session.id && !session.localId)) return;
    const key = session.id || session.localId;
    const list = this.getOfflineSessions();
    const idx = list.findIndex(s => (s.id && s.id === key) || (s.localId && s.localId === key));

    if (idx >= 0) {
      list[idx] = { ...list[idx], ...session };
    } else {
      list.unshift(session);
    }

    if (list.length > 200) list.length = 200;
    this.saveOfflineSessions(list);
  },

  generateLocalId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
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

  // --- ACTIVE SESSION MANAGEMENT ---
  getActiveSession() {
    try {
      const raw = localStorage.getItem(this.ACTIVE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === 'object' && parsed.id) ? parsed : null;
    } catch (e) {
      console.warn("StudySync: Error reading active session:", e);
      return null;
    }
  },

  saveActiveSession(session) {
    try {
      if (!session) {
        this.clearActiveSession();
        return;
      }
      localStorage.setItem(this.ACTIVE_STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn("StudySync: Error saving active session:", e);
    }
  },

  clearActiveSession() {
    try {
      localStorage.removeItem(this.ACTIVE_STORAGE_KEY);
    } catch (e) {
      console.warn("StudySync: Error clearing active session:", e);
    }
  },

  // --- LIVE SESSION LIFECYCLE ---

  /**
   * Starts a new study session in "in_progress" status.
   * Immediately records the session in local/guest storage and syncs to Firestore if authenticated.
   */
  async startLiveSession({ mode = 'focus', duration_minutes = 25 }) {
    const sessionId = this.generateLocalId();
    const nowIso = new Date().toISOString();
    const duration = Math.max(0, Math.round(Number(duration_minutes) || 25));

    const activeSession = {
      id: sessionId,
      localId: sessionId,
      mode,
      duration_minutes: duration,
      started_at: nowIso,
      ended_at: null,
      completed_naturally: false,
      status: 'in_progress',
      elapsed_seconds: 0,
      notes: '',
      created_at: nowIso,
      updated_at: nowIso,
      synced: false,
      lastActiveTimestamp: Date.now()
    };

    // Save as active session
    this.saveActiveSession(activeSession);
    this.upsertOfflineSession(activeSession);

    const isAuth = window.AuthManager && window.AuthManager.isAuthenticated();
    const userUid = window.AuthManager ? window.AuthManager.getUserUid() : null;

    if (isAuth && userUid) {
      const collectionRef = this.getUserSessionsCollection(userUid);
      if (collectionRef) {
        try {
          await collectionRef.doc(sessionId).set({
            userId: userUid,
            mode: activeSession.mode,
            duration_minutes: activeSession.duration_minutes,
            started_at: activeSession.started_at,
            ended_at: null,
            completed_naturally: false,
            status: 'in_progress',
            elapsed_seconds: 0,
            notes: '',
            created_at: activeSession.created_at,
            updated_at: activeSession.updated_at
          });
          activeSession.synced = true;
          this.saveActiveSession(activeSession);
          this.upsertOfflineSession(activeSession);
          console.log("StudySync: Live session created in Cloud Firestore:", sessionId);
        } catch (err) {
          console.warn("StudySync: Cloud Firestore start failed, fallback to local:", err);
        }
      }
    }

    this.notifyChange('SESSION_STARTED');
    return activeSession;
  },

  /**
   * Updates an ongoing live session (e.g. paused, resumed, or periodic elapsed seconds update).
   * Throttles cloud writes so we do not call Firestore every second.
   */
  async updateLiveSession(sessionId, updates = {}, syncToCloud = false) {
    if (!sessionId) return null;

    let active = this.getActiveSession();
    const nowIso = new Date().toISOString();

    if (active && (active.id === sessionId || active.localId === sessionId)) {
      active = {
        ...active,
        ...updates,
        updated_at: nowIso,
        lastActiveTimestamp: Date.now()
      };
      this.saveActiveSession(active);
      this.upsertOfflineSession(active);
    } else {
      // Offline fallback lookup
      const list = this.getOfflineSessions();
      const existing = list.find(s => s.id === sessionId || s.localId === sessionId);
      if (existing) {
        const merged = {
          ...existing,
          ...updates,
          updated_at: nowIso,
          lastActiveTimestamp: Date.now()
        };
        this.saveActiveSession(merged);
        this.upsertOfflineSession(merged);
        active = merged;
      }
    }

    if (syncToCloud) {
      const isAuth = window.AuthManager && window.AuthManager.isAuthenticated();
      const userUid = window.AuthManager ? window.AuthManager.getUserUid() : null;

      if (isAuth && userUid) {
        const collectionRef = this.getUserSessionsCollection(userUid);
        if (collectionRef) {
          try {
            const payload = {
              updated_at: nowIso
            };
            if (updates.status) payload.status = updates.status;
            if (typeof updates.elapsed_seconds === 'number') {
              payload.elapsed_seconds = Math.max(0, Math.round(updates.elapsed_seconds));
            }
            if (updates.ended_at !== undefined) {
              payload.ended_at = updates.ended_at;
            } else if (updates.status === 'in_progress') {
              payload.ended_at = null;
            }
            if (updates.completed_naturally !== undefined) {
              payload.completed_naturally = Boolean(updates.completed_naturally);
            }
            await collectionRef.doc(sessionId).set(payload, { merge: true });
          } catch (e) {
            console.warn("StudySync: Cloud update failed:", e);
          }
        }
      }
    }

    this.notifyChange('SESSION_UPDATED');
    return active;
  },

  /**
   * Terminal transition: concludes an ongoing live session.
   * finalStatus must be one of: 'completed', 'interrupted', 'reset', 'skipped'
   */
  async endLiveSession(sessionId, finalStatus, { elapsed_seconds = null, completed_naturally = false } = {}) {
    if (!sessionId) return null;

    const nowIso = new Date().toISOString();
    let session = this.getActiveSession();

    if (!session || (session.id !== sessionId && session.localId !== sessionId)) {
      const list = this.getOfflineSessions();
      session = list.find(s => s.id === sessionId || s.localId === sessionId) || null;
    }

    const calculatedElapsed = elapsed_seconds !== null
      ? Math.max(0, Math.round(elapsed_seconds))
      : (session && typeof session.elapsed_seconds === 'number' ? session.elapsed_seconds : 0);

    const completed = Boolean(completed_naturally);

    const finalized = {
      ...(session || {}),
      id: sessionId,
      localId: sessionId,
      status: finalStatus,
      ended_at: nowIso,
      completed_naturally: completed,
      elapsed_seconds: calculatedElapsed,
      updated_at: nowIso
    };

    // Remove from active state
    this.clearActiveSession();
    this.upsertOfflineSession(finalized);

    const isAuth = window.AuthManager && window.AuthManager.isAuthenticated();
    const userUid = window.AuthManager ? window.AuthManager.getUserUid() : null;

    if (isAuth && userUid) {
      const collectionRef = this.getUserSessionsCollection(userUid);
      if (collectionRef) {
        try {
          await collectionRef.doc(sessionId).set({
            status: finalStatus,
            ended_at: nowIso,
            completed_naturally: completed,
            elapsed_seconds: calculatedElapsed,
            updated_at: nowIso
          }, { merge: true });
          console.log(`StudySync: Live session ${sessionId} finalized in Firestore as '${finalStatus}'.`);
        } catch (err) {
          console.warn("StudySync: Failed to finalize session in Firestore:", err);
        }
      }
    }

    this.notifyChange('SESSION_ENDED');
    return finalized;
  },

  /**
   * Finds any active or resumable session across local storage and Firestore.
   * Checks:
   * 1. ACTIVE_STORAGE_KEY
   * 2. OFFLINE_STORAGE_KEY list
   * 3. Cloud Firestore study_sessions for signed-in users
   * Returns the session object if found in 'paused' or 'in_progress' state, or null.
   */
  async findResumableSession() {
    // 1. Check active session in local storage
    let active = this.getActiveSession();
    if (active && (active.status === 'paused' || active.status === 'in_progress')) {
      return active;
    }

    // 2. Check offline sessions list in local storage
    const offlineList = this.getOfflineSessions();
    const localResumable = offlineList.find(s => s && (s.status === 'paused' || s.status === 'in_progress'));
    if (localResumable) {
      this.saveActiveSession(localResumable);
      return localResumable;
    }

    // 3. For a signed-in user, check the user's Firestore records
    const isAuth = window.AuthManager && window.AuthManager.isAuthenticated();
    const userUid = window.AuthManager ? window.AuthManager.getUserUid() : null;

    if (isAuth && userUid) {
      const collectionRef = this.getUserSessionsCollection(userUid);
      if (collectionRef) {
        try {
          // Query for paused or in-progress sessions in Firestore
          const snapshot = await collectionRef
            .where('status', 'in', ['paused', 'in_progress'])
            .get();

          if (!snapshot.empty) {
            const matches = [];
            snapshot.forEach(doc => {
              matches.push({ id: doc.id, ...doc.data() });
            });

            // Sort by updated_at or started_at descending to find the latest
            matches.sort((a, b) => {
              const tA = new Date(a.updated_at || a.started_at || 0).getTime();
              const tB = new Date(b.updated_at || b.started_at || 0).getTime();
              return tB - tA;
            });

            const cloudResumable = matches[0];
            if (cloudResumable) {
              this.saveActiveSession(cloudResumable);
              this.upsertOfflineSession(cloudResumable);
              return cloudResumable;
            }
          }
        } catch (err) {
          console.warn("StudySync: Error querying resumable session in Firestore:", err);
          // Fallback: fetch recent sessions and inspect in case 'in' query encounters an issue
          try {
            const fallbackSnap = await collectionRef
              .orderBy('started_at', 'desc')
              .limit(5)
              .get();
            let fallbackMatch = null;
            fallbackSnap.forEach(doc => {
              const data = doc.data();
              if (!fallbackMatch && (data.status === 'paused' || data.status === 'in_progress')) {
                fallbackMatch = { id: doc.id, ...data };
              }
            });
            if (fallbackMatch) {
              this.saveActiveSession(fallbackMatch);
              this.upsertOfflineSession(fallbackMatch);
              return fallbackMatch;
            }
          } catch (fallbackErr) {
            console.warn("StudySync: Fallback Firestore query failed:", fallbackErr);
          }
        }
      }
    }

    return null;
  },

  /**
   * Reconciles any active session on app boot or page reload.
   * - A session explicitly marked "paused" remains resumable indefinitely (not interrupted).
   * - A closed tab's "in_progress" session is treated as paused on recovery,
   *   preserving its saved elapsed time without counting time while closed.
   */
  async reconcileActiveSession() {
    const resumable = await this.findResumableSession();
    if (!resumable) {
      this.clearActiveSession();
      return { status: 'idle' };
    }

    const wasInProgress = resumable.status === 'in_progress';
    resumable.status = 'paused';
    resumable.updated_at = new Date().toISOString();
    resumable.lastActiveTimestamp = Date.now();

    this.saveActiveSession(resumable);
    this.upsertOfflineSession(resumable);

    // If it was in_progress when the tab closed, sync the paused status to cloud
    if (wasInProgress) {
      await this.updateLiveSession(resumable.id, {
        status: 'paused',
        elapsed_seconds: resumable.elapsed_seconds || 0
      }, true);
      console.log("StudySync: In-progress session reconciled to paused on recovery:", resumable.id);
    } else {
      console.log("StudySync: Paused session restored from storage/cloud:", resumable.id);
    }

    this.notifyChange('SESSION_UPDATED');
    return { status: 'resumable', session: resumable };
  },

  // Legacy helper for single-shot session creation
  async recordSession({
    mode = 'focus',
    duration_minutes = 25,
    started_at = null,
    ended_at = null,
    completed_naturally = true,
    notes = ''
  }) {
    const liveSession = await this.startLiveSession({ mode, duration_minutes });
    const finalStatus = completed_naturally ? 'completed' : 'interrupted';
    const totalSec = Math.round(duration_minutes * 60);
    return await this.endLiveSession(liveSession.id, finalStatus, {
      elapsed_seconds: totalSec,
      completed_naturally
    });
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
      const batch = db.batch();
      unsynced.forEach(s => {
        const docId = s.id || s.localId || this.generateLocalId();
        const docRef = collectionRef.doc(docId);
        const payload = {
          userId: userUid,
          mode: s.mode || 'focus',
          duration_minutes: Math.max(0, Math.round(Number(s.duration_minutes) || 0)),
          started_at: s.started_at || new Date().toISOString(),
          completed_naturally: Boolean(s.completed_naturally),
          notes: s.notes || '',
          created_at: s.created_at || new Date().toISOString(),
          updated_at: s.updated_at || new Date().toISOString()
        };

        if (s.status) {
          payload.status = s.status;
        }

        if (s.ended_at) {
          payload.ended_at = s.ended_at;
        } else if (s.status === 'in_progress' || s.status === 'paused') {
          payload.ended_at = null;
        } else {
          payload.ended_at = payload.started_at;
        }

        if (typeof s.elapsed_seconds === 'number') {
          payload.elapsed_seconds = Math.max(0, Math.round(s.elapsed_seconds));
        }

        batch.set(docRef, payload, { merge: true });
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
    const activeSession = this.getActiveSession();

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

          // 1. If active session exists, prioritize it
          if (activeSession) {
            seenIds.add(activeSession.id);
            if (activeSession.localId) seenIds.add(activeSession.localId);
            combined.push({ ...activeSession, isActive: true });
          }

          // 2. Local unsynced sessions
          unsynced.forEach(s => {
            const key = s.id || s.localId;
            if (key && !seenIds.has(key)) {
              seenIds.add(key);
              if (s.localId) seenIds.add(s.localId);
              combined.push(s);
            }
          });

          // 3. Cloud sessions
          cloudSessions.forEach(s => {
            const key = s.id || s.localId;
            if (key && !seenIds.has(key)) {
              seenIds.add(key);
              if (s.localId) seenIds.add(s.localId);
              combined.push(s);
            }
          });

          combined.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));

          return {
            source: 'cloud',
            sessions: combined,
            activeSession,
            hasUnsynced: unsynced.length > 0
          };
        } catch (e) {
          console.warn("StudySync: Firestore fetch error, falling back to local:", e);
          const list = this.getOfflineSessions();
          return {
            source: 'local',
            sessions: list,
            activeSession,
            error: e.message
          };
        }
      }
    }

    // Guest Mode
    const list = this.getOfflineSessions();
    if (activeSession) {
      const exists = list.some(s => s.id === activeSession.id || s.localId === activeSession.id);
      if (!exists) list.unshift({ ...activeSession, isActive: true });
    }

    return {
      source: 'local',
      sessions: list,
      activeSession,
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
    let customMinutes = 0;
    let customSessionsCount = 0;

    // Use device local calendar date (YYYY-MM-DD), consistently matching the daily focus counter
    const todayStr = this.getLocalDateString(new Date());

    sessions.forEach(s => {
      const mode = s.mode || 'focus';
      const dur = parseInt(s.duration_minutes, 10) || 0;
      const elapsedSec = parseInt(s.elapsed_seconds, 10) || 0;
      const elapsedMins = elapsedSec > 0 ? Math.floor(elapsedSec / 60) : dur;
      const isCompletedNaturally = Boolean(s.completed_naturally) && (s.status === 'completed' || !s.status);

      // Determine session start date in device local calendar time
      const sessionLocalDate = this.getLocalDateString(s.started_at);
      const isToday = Boolean(sessionLocalDate && sessionLocalDate === todayStr);

      if (mode === 'focus') {
        // Only naturally completed focus sessions increment completedFocusSessions
        const minsToAdd = isCompletedNaturally ? dur : elapsedMins;
        totalFocusMinutes += minsToAdd;

        if (isCompletedNaturally) {
          completedFocusSessions++;
        }

        if (isToday) {
          todayFocusMinutes += minsToAdd;
          if (isCompletedNaturally) {
            todaySessionsCount++;
          }
        }
      } else if (mode === 'custom') {
        const minsToAdd = isCompletedNaturally ? dur : elapsedMins;
        customMinutes += minsToAdd;
        if (isCompletedNaturally) {
          customSessionsCount++;
        }
      } else {
        // Break sessions (shortBreak, longBreak)
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
      customMinutes,
      customSessionsCount,
      sessionCount: sessions.length
    };
  },

  // --- DELETE A RECORD ---
  async deleteSession(sessionId) {
    if (!sessionId) return false;

    // Clear active session if it matches
    const active = this.getActiveSession();
    if (active && (active.id === sessionId || active.localId === sessionId)) {
      this.clearActiveSession();
    }

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
