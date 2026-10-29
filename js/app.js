/**
 * Pomodoro Timer - Main Application Controller
 * Orchestrates canvas visuals, procedural Web Audio mixing,
 * Pomodoro timer interactions, localStorage persistence, UI state, and keyboard shortcuts.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- STORAGE MANAGER ---
  // Safely persists and restores daily focus sessions and user settings in localStorage.
  const StorageManager = {
    STORAGE_KEY: 'algorithmic_ambient_room_data_v1',

    getTodayDateString() {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    },

    load() {
      const today = this.getTodayDateString();
      const defaultData = {
        dailyFocus: {
          date: today,
          count: 0
        },
        settings: {
          scene: 'ocean',
          timerMode: 'focus',
          completedSessions: 0,
          audio: {
            rainVolume: 0,
            noiseVolume: 0,
            lofiVolume: 0,
            isMuted: false
          },
          palette: {
            mode: 'auto',
            autoShift: true,
            paletteIndex: -1,
            customColor: {
              hex: '#10b981',
              hue: 160,
              sat: 80,
              light: 50
            }
          }
        }
      };

      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (!raw) return defaultData;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return defaultData;

        // Daily focus count associated with local calendar date
        let todayCount = 0;
        if (
          parsed.dailyFocus &&
          typeof parsed.dailyFocus === 'object' &&
          parsed.dailyFocus.date === today &&
          typeof parsed.dailyFocus.count === 'number' &&
          !isNaN(parsed.dailyFocus.count) &&
          parsed.dailyFocus.count >= 0
        ) {
          todayCount = Math.floor(parsed.dailyFocus.count);
        }

        // Scenic background validation
        const validScenes = ['ocean', 'clouds', 'forest', 'sanctuary'];
        const scene = (parsed.settings && validScenes.includes(parsed.settings.scene))
          ? parsed.settings.scene
          : 'ocean';

        // Timer mode validation
        const validModes = ['focus', 'shortBreak', 'longBreak', 'custom'];
        const timerMode = (parsed.settings && validModes.includes(parsed.settings.timerMode))
          ? parsed.settings.timerMode
          : 'focus';

        // Completed sessions cycle count
        const completedSessions = (parsed.settings && typeof parsed.settings.completedSessions === 'number' && parsed.settings.completedSessions >= 0)
          ? Math.floor(parsed.settings.completedSessions)
          : 0;

        // Audio levels validation
        const audio = (parsed.settings && typeof parsed.settings.audio === 'object') ? parsed.settings.audio : {};
        const safeVolume = (v) => (typeof v === 'number' && !isNaN(v) ? Math.max(0, Math.min(1, v)) : 0);
        const rainVolume = safeVolume(audio.rainVolume);
        const noiseVolume = safeVolume(audio.noiseVolume);
        const lofiVolume = safeVolume(audio.lofiVolume);
        const isMuted = Boolean(audio.isMuted);

        // Palette validation
        const palette = (parsed.settings && typeof parsed.settings.palette === 'object') ? parsed.settings.palette : {};
        let paletteMode = 'auto';
        if (['auto', 'preset', 'custom'].includes(palette.mode)) {
          paletteMode = palette.mode;
        } else if (palette.paletteIndex === -2) {
          paletteMode = 'custom';
        } else if (palette.autoShift === false && typeof palette.paletteIndex === 'number' && palette.paletteIndex >= 0) {
          paletteMode = 'preset';
        }

        let paletteIndex = -1;
        if (typeof palette.paletteIndex === 'number' && palette.paletteIndex >= -2 && palette.paletteIndex <= 3) {
          paletteIndex = Math.floor(palette.paletteIndex);
        }

        const autoShift = (paletteMode === 'auto');

        const customColor = {
          hex: '#10b981',
          hue: 160,
          sat: 80,
          light: 50
        };
        if (palette.customColor && typeof palette.customColor === 'object') {
          if (typeof palette.customColor.hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(palette.customColor.hex)) {
            customColor.hex = palette.customColor.hex;
          }
          if (typeof palette.customColor.hue === 'number') {
            customColor.hue = Math.max(0, Math.min(360, Math.floor(palette.customColor.hue)));
          }
          if (typeof palette.customColor.sat === 'number') {
            customColor.sat = Math.max(10, Math.min(100, Math.floor(palette.customColor.sat)));
          }
          if (typeof palette.customColor.light === 'number') {
            customColor.light = Math.max(15, Math.min(80, Math.floor(palette.customColor.light)));
          }
        }

        return {
          dailyFocus: {
            date: today,
            count: todayCount
          },
          settings: {
            scene,
            timerMode,
            completedSessions,
            audio: {
              rainVolume,
              noiseVolume,
              lofiVolume,
              isMuted
            },
            palette: {
              mode: paletteMode,
              autoShift,
              paletteIndex,
              customColor
            }
          }
        };
      } catch (e) {
        console.warn("StorageManager: Could not safely parse stored state, using defaults.", e);
        return defaultData;
      }
    },

    save(data) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn("StorageManager: Could not persist state to localStorage.", e);
      }
    }
  };

  // Load persisted state safely
  const appState = StorageManager.load();

  // 1. Initialize Visual Canvas Engine
  const canvasEngine = new AmbientCanvasEngine('ambient-canvas');
  window.ambientCanvasEngine = canvasEngine;
  window.canvasEngine = canvasEngine;

  // 2. Initialize Procedural Audio Engine
  const audioEngine = new AmbientAudioEngine(canvasEngine);

  // 3. Initialize Pomodoro Timer Engine
  const timer = new PomodoroTimer(audioEngine);

  // UI Element References
  const timeDisplay = document.getElementById('time-display');
  const timerRing = document.getElementById('timer-progress-ring');
  const timerStartBtn = document.getElementById('timer-start-btn');
  const timerPauseBtn = document.getElementById('timer-pause-btn');
  const timerResetBtn = document.getElementById('timer-reset-btn');
  const timerSkipBtn = document.getElementById('timer-skip-btn');
  const floatTimerBtn = document.getElementById('float-timer-btn');
  const floatTimerBtnDash = document.getElementById('float-timer-btn-dash');
  const modeTabs = document.querySelectorAll('.mode-tab');
  const sessionCounter = document.getElementById('session-counter');
  const sessionCycleBadge = document.getElementById('session-cycle-badge');
  const modeIndicator = document.getElementById('mode-indicator');
  const circleModeText = document.getElementById('circle-mode-text');
  const todayFocusCount = document.getElementById('today-focus-count');

  // Custom Timer UI Elements
  const customTabDurationLabel = document.getElementById('custom-tab-duration-label');
  const customDurationPanel = document.getElementById('custom-duration-panel');
  const customHoursInput = document.getElementById('custom-hours-input');
  const customMinutesInput = document.getElementById('custom-minutes-input');
  const customDurationApplyBtn = document.getElementById('custom-duration-apply-btn');
  const customDurationError = document.getElementById('custom-duration-error');

  // Audio Slider Elements
  const rainSlider = document.getElementById('slider-rain');
  const rainVal = document.getElementById('val-rain');
  const noiseSlider = document.getElementById('slider-noise');
  const noiseVal = document.getElementById('val-noise');
  const lofiSlider = document.getElementById('slider-lofi');
  const lofiVal = document.getElementById('val-lofi');
  const masterMuteBtn = document.getElementById('master-mute-btn');
  const soundStatusDot = document.getElementById('sound-status-dot');

  // Containers & Zen Mode Elements
  const centerContainer = document.getElementById('sanctuary-center-container');
  const dashboard = document.getElementById('sanctuary-dashboard');
  const audioMixerDock = document.getElementById('ambient-audio-mixer');
  const zenToggleBtn = document.getElementById('zen-toggle-btn');
  const zenNotice = document.getElementById('zen-notice');
  let isZenMode = false;

  // Collapsible Ambient Audio Mixer Elements
  const ambientMixerTrigger = document.getElementById('ambient-mixer-trigger');
  const ambientMixerContent = document.getElementById('ambient-mixer-content');
  const mixerSlidersBody = document.getElementById('mixer-sliders-body');
  const mixerChevronIcon = document.getElementById('mixer-chevron-icon');

  // Custom Color UI Elements
  const customColorBtn = document.getElementById('custom-color-btn');
  const customColorSwatch = document.getElementById('custom-color-swatch');
  const customColorPopover = document.getElementById('custom-color-popover');
  const closeColorPopover = document.getElementById('close-color-popover');
  const popoverColorDot = document.getElementById('popover-color-dot');
  const customHueSlider = document.getElementById('custom-hue-slider');
  const customHueVal = document.getElementById('custom-hue-val');
  const customSatSlider = document.getElementById('custom-sat-slider');
  const customSatVal = document.getElementById('custom-sat-val');
  const customLightSlider = document.getElementById('custom-light-slider');
  const customLightVal = document.getElementById('custom-light-val');
  const nativeColorPicker = document.getElementById('native-color-picker');
  const presetChips = document.querySelectorAll('.custom-preset-chip');

  // Authentication & Account UI Elements
  const openAuthBtn = document.getElementById('open-auth-btn');
  const userProfileWrapper = document.getElementById('user-profile-wrapper');
  const userProfileBtn = document.getElementById('user-profile-btn');
  const headerUserEmail = document.getElementById('header-user-email');
  const userDropdownMenu = document.getElementById('user-dropdown-menu');
  const dropdownUserEmail = document.getElementById('dropdown-user-email');
  const dropdownHistoryBtn = document.getElementById('dropdown-history-btn');
  const dropdownSignoutBtn = document.getElementById('dropdown-signout-btn');

  const authModal = document.getElementById('auth-modal');
  const closeAuthModal = document.getElementById('close-auth-modal');
  const tabSignin = document.getElementById('tab-signin');
  const tabSignup = document.getElementById('tab-signup');
  const authForm = document.getElementById('auth-form');
  const authEmail = document.getElementById('auth-email');
  const authPassword = document.getElementById('auth-password');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const authSubmitText = document.getElementById('auth-submit-text');
  const authSubmitSpinner = document.getElementById('auth-submit-spinner');
  const authAlert = document.getElementById('auth-alert');

  // Study History Modal Elements
  const historyBtn = document.getElementById('history-btn');
  const historyModal = document.getElementById('history-modal');
  const closeHistoryModal = document.getElementById('close-history-modal');
  const historySyncStatus = document.getElementById('history-sync-status');
  const historyTotalTime = document.getElementById('history-total-time');
  const historyTotalSessions = document.getElementById('history-total-sessions');
  const historyTodayTime = document.getElementById('history-today-time');
  const historyOfflineBanner = document.getElementById('history-offline-banner');
  const historyOfflineCountText = document.getElementById('history-offline-count-text');
  const historySyncNowBtn = document.getElementById('history-sync-now-btn');
  const historyList = document.getElementById('history-list');
  const historyEmptyState = document.getElementById('history-empty-state');
  const historyFilterBtns = document.querySelectorAll('.history-filter-btn');

  let currentAuthMode = 'signin'; // 'signin' or 'signup'
  let currentHistoryFilter = 'all';

  // Live Custom Color State (Restored from StorageManager or Defaults)
  let currentCustomHue = (appState.settings.palette.customColor && appState.settings.palette.customColor.hue) || 160;
  let currentCustomSat = (appState.settings.palette.customColor && appState.settings.palette.customColor.sat) || 80;
  let currentCustomLight = (appState.settings.palette.customColor && appState.settings.palette.customColor.light) || 50;
  let currentCustomHex = (appState.settings.palette.customColor && appState.settings.palette.customColor.hex) || '#10b981';

  // Toast Notification
  const toast = document.getElementById('ambient-toast');
  const toastText = document.getElementById('toast-text');
  let toastTimeout = null;

  function showToast(message, duration = 3000) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastText.textContent = message;
    toast.classList.remove('toast-hidden');
    toast.classList.add('toast-notice');

    toastTimeout = setTimeout(() => {
      toast.classList.remove('toast-notice');
      toast.classList.add('toast-hidden');
    }, duration);
  }

  // --- SAVE STATE HELPER ---
  function saveCurrentState() {
    appState.settings.scene = (canvasEngine && canvasEngine.currentScene) ? canvasEngine.currentScene : 'ocean';
    appState.settings.timerMode = timer.currentMode;
    appState.settings.completedSessions = timer.completedFocusSessions;
    appState.settings.audio.rainVolume = audioEngine.rainVolume;
    appState.settings.audio.noiseVolume = audioEngine.noiseVolume;
    appState.settings.audio.lofiVolume = audioEngine.lofiVolume;
    appState.settings.audio.isMuted = audioEngine.isMuted;
    appState.settings.palette.mode = canvasEngine.paletteMode;
    appState.settings.palette.autoShift = (canvasEngine.paletteMode === 'auto');
    appState.settings.palette.paletteIndex = (canvasEngine.paletteMode === 'preset')
      ? canvasEngine.presetIndex
      : (canvasEngine.paletteMode === 'custom' ? -2 : -1);
    appState.settings.palette.customColor = {
      hex: currentCustomHex,
      hue: currentCustomHue,
      sat: currentCustomSat,
      light: currentCustomLight
    };
    StorageManager.save(appState);
  }

  // Checks and applies date rollover so idle pages update immediately when midnight passes
  function checkDateRollover() {
    const today = StorageManager.getTodayDateString();
    if (appState.dailyFocus.date !== today) {
      appState.dailyFocus.date = today;
      appState.dailyFocus.count = 0;
      timer.setTodayFocusSessions(0);
      if (todayFocusCount) {
        todayFocusCount.textContent = '0';
      }
      saveCurrentState();
    }
  }

  // Record a naturally completed focus session (increment today's count)
  function recordNaturalFocusCompletion() {
    checkDateRollover();
    appState.dailyFocus.count++;
    timer.setTodayFocusSessions(appState.dailyFocus.count);
    saveCurrentState();
    return appState.dailyFocus.count;
  }

  // Format mode names for tab title and UI labels
  function getModeLabel(mode) {
    switch (mode) {
      case 'focus':
        return 'Focus';
      case 'shortBreak':
        return 'Break';
      case 'longBreak':
        return 'Long Break';
      case 'custom':
        return 'Custom';
      default:
        return 'Focus';
    }
  }

  // --- CUSTOM DURATION MANAGER ---
  const CustomDurationManager = {
    STORAGE_KEY: 'algorithmic_pomodoro_custom_duration',
    load() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            const h = Math.max(0, Math.min(12, parseInt(parsed.hours, 10) || 0));
            const m = Math.max(0, Math.min(59, parseInt(parsed.minutes, 10) || 0));
            const total = h * 60 + m;
            if (total >= 1 && total <= 720) {
              return { hours: h, minutes: m, totalMinutes: total };
            }
          }
        }
      } catch (e) {
        console.warn("CustomDurationManager: Error parsing stored duration:", e);
      }
      return { hours: 0, minutes: 45, totalMinutes: 45 };
    },
    save(hours, minutes) {
      try {
        const h = Math.max(0, Math.min(12, parseInt(hours, 10) || 0));
        const m = Math.max(0, Math.min(59, parseInt(minutes, 10) || 0));
        const total = Math.max(1, Math.min(720, h * 60 + m));
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ hours: h, minutes: m, totalMinutes: total }));
        return total;
      } catch (e) {
        console.warn("CustomDurationManager: Error saving duration:", e);
        return 45;
      }
    },
    formatLabel(hours, minutes) {
      if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h`;
      return `${minutes}m`;
    }
  };

  let customDurationState = CustomDurationManager.load();
  if (customHoursInput) customHoursInput.value = customDurationState.hours;
  if (customMinutesInput) customMinutesInput.value = customDurationState.minutes;
  if (customTabDurationLabel) {
    customTabDurationLabel.textContent = CustomDurationManager.formatLabel(customDurationState.hours, customDurationState.minutes);
  }
  timer.setCustomDuration(customDurationState.totalMinutes);

  function updateCustomPanelVisibility(mode) {
    if (!customDurationPanel) return;
    if (mode === 'custom') {
      customDurationPanel.classList.remove('hidden');
    } else {
      customDurationPanel.classList.add('hidden');
      if (customDurationError) customDurationError.classList.add('hidden');
    }
  }

  function applyCustomDuration() {
    const h = parseInt(customHoursInput ? customHoursInput.value : 0, 10) || 0;
    const m = parseInt(customMinutesInput ? customMinutesInput.value : 0, 10) || 0;
    const total = h * 60 + m;

    if (total < 1 || total > 720) {
      if (customDurationError) customDurationError.classList.remove('hidden');
      return;
    }

    if (customDurationError) customDurationError.classList.add('hidden');
    customDurationState = { hours: h, minutes: m, totalMinutes: total };
    CustomDurationManager.save(h, m);

    if (customTabDurationLabel) {
      customTabDurationLabel.textContent = CustomDurationManager.formatLabel(h, m);
    }

    timer.setCustomDuration(total);

    const active = window.StudySync ? window.StudySync.getActiveSession() : null;
    if (active && active.mode === 'custom' && !timer.isRunning) {
      window.StudySync.updateLiveSession(active.id, { duration_minutes: total });
    }

    showToast(`Custom duration set to ${CustomDurationManager.formatLabel(h, m)} (${total} mins)`);
  }

  if (customDurationApplyBtn) {
    customDurationApplyBtn.addEventListener('click', applyCustomDuration);
  }
  [customHoursInput, customMinutesInput].forEach(inp => {
    if (inp) {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyCustomDuration();
        }
      });
      inp.addEventListener('input', () => {
        if (customDurationError) customDurationError.classList.add('hidden');
      });
    }
  });

  // --- SVG PROGRESS RING CONFIGURATION ---
  const ringRadius = 110;
  const ringCircumference = 2 * Math.PI * ringRadius;
  if (timerRing) {
    timerRing.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
    timerRing.style.strokeDashoffset = '0';
  }

  function updateProgressRing(progress) {
    if (!timerRing) return;
    const offset = ringCircumference * (1 - progress);
    timerRing.style.strokeDashoffset = offset;
  }

  // --- RECONCILE / RESTORE ACTIVE SESSION HELPER ---
  function applyReconciledSession(s) {
    if (!s) return;
    const validModes = ['focus', 'shortBreak', 'longBreak', 'custom'];
    const targetMode = validModes.includes(s.mode) ? s.mode : 'focus';

    timer.currentMode = targetMode;

    if (targetMode === 'custom') {
      const mins = Math.max(1, Math.min(720, Math.round(Number(s.duration_minutes) || 45)));
      timer.modes.custom = mins * 60;
      timer.totalDuration = mins * 60;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      customDurationState = { hours: h, minutes: m, totalMinutes: mins };
      if (customHoursInput) customHoursInput.value = h;
      if (customMinutesInput) customMinutesInput.value = m;
      if (customTabDurationLabel) {
        customTabDurationLabel.textContent = CustomDurationManager.formatLabel(h, m);
      }
      updateCustomPanelVisibility('custom');
    } else {
      timer.totalDuration = (timer.modes[targetMode] || 25 * 60);
      updateCustomPanelVisibility(targetMode);
    }

    const elapsedSec = Math.max(0, Math.min(timer.totalDuration, Math.round(Number(s.elapsed_seconds) || 0)));
    const remaining = Math.max(0, timer.totalDuration - elapsedSec);
    timer.timeLeft = remaining;
    timer.pause();
    timer.notifyTick();
    timer.notifyStateChange();
    updatePipDisplay();
  }

  // --- TIMER CALLBACKS ---
  let lastLocalSaveTime = 0;
  let lastCloudSyncTime = 0;

  function updateTimeDisplay(formattedTime) {
    if (!timeDisplay) return;
    timeDisplay.textContent = formattedTime;

    const parts = (formattedTime || '').split(':');
    const hasHours = parts.length > 2;

    if (hasHours) {
      const hoursPart = parts[0];
      if (hoursPart.length >= 2) {
        // Double-digit hours: e.g. "10:45:00", "12:00:00"
        timeDisplay.className = "font-mono font-bold text-white drop-shadow-md timer-time-hours-double";
      } else {
        // Single-digit hours: e.g. "1:00:00", "9:59:59"
        timeDisplay.className = "font-mono font-bold text-white drop-shadow-md timer-time-hours-single";
      }
    } else {
      // Standard MM:SS timer: e.g. "25:00", "05:00" - preserves existing large size
      timeDisplay.className = "font-mono text-4xl sm:text-5xl font-bold tracking-tighter text-white drop-shadow-md timer-time-standard";
    }
  }

  // --- FLOAT TIMER: DOCUMENT PICTURE-IN-PICTURE CONTROLLER ---
  let pipWindow = null;

  function setFloatButtonsActive(isActive) {
    [floatTimerBtn, floatTimerBtnDash].forEach(btn => {
      if (!btn) return;
      if (isActive) {
        btn.classList.add('float-timer-active');
        btn.setAttribute('title', 'Close Floating Timer (Picture-in-Picture)');
      } else {
        btn.classList.remove('float-timer-active');
        btn.setAttribute('title', 'Float Timer (Picture-in-Picture)');
      }
    });
  }

  function updatePipDisplay() {
    if (!pipWindow || pipWindow.closed) return;
    const doc = pipWindow.document;
    if (!doc) return;

    const formatted = timer.getFormattedTime();
    const timeEl = doc.getElementById('pip-time-display');
    if (timeEl) {
      timeEl.textContent = formatted;
      const parts = (formatted || '').split(':');
      if (parts.length > 2) {
        if (parts[0].length >= 2) {
          timeEl.className = 'pip-time-hours-double';
        } else {
          timeEl.className = 'pip-time-hours-single';
        }
      } else {
        timeEl.className = 'pip-time-standard';
      }
    }

    const modeTextEl = doc.getElementById('pip-mode-text');
    const modeDotEl = doc.getElementById('pip-mode-dot');
    const modeLabel = getModeLabel(timer.currentMode);
    if (modeTextEl) modeTextEl.textContent = modeLabel;
    if (modeDotEl) {
      switch (timer.currentMode) {
        case 'focus': modeDotEl.style.background = '#34d399'; break;
        case 'shortBreak': modeDotEl.style.background = '#38bdf8'; break;
        case 'longBreak': modeDotEl.style.background = '#818cf8'; break;
        case 'custom': modeDotEl.style.background = '#c084fc'; break;
        default: modeDotEl.style.background = '#34d399';
      }
    }

    const cycleEl = doc.getElementById('pip-cycle-text');
    if (cycleEl) {
      const cycleNum = (timer.completedFocusSessions % 4) + 1;
      cycleEl.textContent = `Cycle ${cycleNum} / 4`;
    }

    const countEl = doc.getElementById('pip-today-count');
    if (countEl) {
      countEl.textContent = String(appState.dailyFocus.count || timer.todayFocusSessions || 0);
    }

    const subLabelEl = doc.getElementById('pip-sub-label');
    if (subLabelEl) {
      if (timer.isRunning) {
        subLabelEl.textContent = `${modeLabel} • Running`;
      } else if (timer.timeLeft < timer.totalDuration) {
        subLabelEl.textContent = `${modeLabel} • Paused`;
      } else {
        subLabelEl.textContent = `${modeLabel} • Ready`;
      }
    }

    const startBtn = doc.getElementById('pip-start-btn');
    if (startBtn) {
      if (timer.isRunning) {
        startBtn.textContent = '⏸ Pause';
        startBtn.className = 'pip-btn pip-btn-pause';
        startBtn.title = 'Pause Timer';
      } else {
        const isMid = timer.timeLeft < timer.totalDuration;
        startBtn.textContent = isMid ? '▶ Resume' : '▶ Start';
        startBtn.className = 'pip-btn pip-btn-start';
        startBtn.title = isMid ? 'Resume Timer' : 'Start Timer';
      }
    }

    doc.querySelectorAll('.pip-mode-btn').forEach(btn => {
      if (btn.dataset.mode === timer.currentMode) {
        btn.classList.add('pip-mode-active');
      } else {
        btn.classList.remove('pip-mode-active');
      }
    });
  }

  function setupPipDocument(pWin) {
    const doc = pWin.document;
    doc.title = "Pomodoro Timer • Floating Window";

    // Inject dedicated self-contained styling
    const styleEl = doc.createElement('style');
    styleEl.textContent = `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        background: #090d16;
        color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 10px 12px;
        overflow: hidden;
        user-select: none;
        -webkit-user-select: none;
      }
      .pip-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
      }
      .pip-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 2.5px 8px;
        border-radius: 9999px;
        color: #cbd5e1;
        font-size: 11px;
        font-weight: 500;
      }
      .pip-mode-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #34d399;
        box-shadow: 0 0 6px rgba(52, 211, 153, 0.6);
      }
      .pip-sep {
        color: rgba(255, 255, 255, 0.3);
      }
      .pip-header-right {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .pip-stat-pill {
        font-size: 10px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        color: #fde68a;
        background: rgba(245, 158, 11, 0.12);
        border: 1px solid rgba(251, 191, 36, 0.25);
        padding: 2px 6px;
        border-radius: 6px;
        font-weight: 600;
      }
      .pip-close-btn {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #94a3b8;
        width: 22px;
        height: 22px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        line-height: 1;
        transition: all 0.2s ease;
      }
      .pip-close-btn:hover {
        background: rgba(244, 63, 94, 0.25);
        border-color: rgba(244, 63, 94, 0.5);
        color: #fda4af;
      }
      .pip-timer-body {
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2px 0;
      }
      #pip-time-display {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-weight: 700;
        color: #ffffff;
        font-variant-numeric: tabular-nums;
        line-height: 1;
        text-shadow: 0 0 24px rgba(56, 189, 248, 0.35);
        transition: font-size 0.2s ease;
      }
      .pip-time-standard {
        font-size: 44px;
        letter-spacing: -0.05em;
      }
      .pip-time-hours-single {
        font-size: 32px;
        letter-spacing: -0.035em;
      }
      .pip-time-hours-double {
        font-size: 27px;
        letter-spacing: -0.04em;
      }
      .pip-sub-label {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 5px;
        letter-spacing: 0.02em;
      }
      .pip-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .pip-btn {
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.08);
        color: #e2e8f0;
        font-size: 12px;
        font-weight: 500;
        padding: 6px 14px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .pip-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #ffffff;
      }
      .pip-btn-start {
        background: rgba(16, 185, 129, 0.2);
        border-color: rgba(52, 211, 153, 0.4);
        color: #6ee7b7;
        flex: 1.2;
      }
      .pip-btn-start:hover {
        background: rgba(16, 185, 129, 0.3);
        color: #a7f3d0;
      }
      .pip-btn-pause {
        background: rgba(245, 158, 11, 0.2);
        border-color: rgba(251, 191, 36, 0.4);
        color: #fde68a;
        flex: 1.2;
      }
      .pip-btn-pause:hover {
        background: rgba(245, 158, 11, 0.3);
        color: #fef3c7;
      }
      .pip-btn-subtle {
        flex: 0.9;
        font-size: 11px;
        padding: 6px 10px;
      }
      .pip-modes-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 3px;
        border-radius: 10px;
      }
      .pip-mode-btn {
        flex: 1;
        background: transparent;
        border: 1px solid transparent;
        color: #94a3b8;
        font-size: 10px;
        font-weight: 500;
        padding: 3px 4px;
        border-radius: 7px;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
      }
      .pip-mode-btn:hover {
        color: #e2e8f0;
      }
      .pip-mode-btn.pip-mode-active {
        background: rgba(255, 255, 255, 0.18);
        border-color: rgba(255, 255, 255, 0.2);
        color: #ffffff;
      }
    `;
    doc.head.appendChild(styleEl);

    // Build body markup
    doc.body.innerHTML = `
      <div class="pip-header">
        <div class="pip-badge">
          <span id="pip-mode-dot" class="pip-mode-dot"></span>
          <span id="pip-mode-text">Focus</span>
          <span class="pip-sep">•</span>
          <span id="pip-cycle-text">Cycle 1 / 4</span>
        </div>
        <div class="pip-header-right">
          <span class="pip-stat-pill" title="Today's completed focus sessions">🎯 <span id="pip-today-count">0</span></span>
          <button id="pip-close-btn" class="pip-close-btn" title="Close Float Window" aria-label="Close">✕</button>
        </div>
      </div>

      <div class="pip-timer-body">
        <div id="pip-time-display" class="pip-time-standard">25:00</div>
        <div id="pip-sub-label" class="pip-sub-label">Focus Session • Ready</div>
      </div>

      <div class="pip-controls">
        <button id="pip-start-btn" class="pip-btn pip-btn-start">▶ Start</button>
        <button id="pip-reset-btn" class="pip-btn pip-btn-subtle" title="Reset Session">↺ Reset</button>
        <button id="pip-skip-btn" class="pip-btn pip-btn-subtle" title="Skip Session">⏭ Skip</button>
      </div>

      <div class="pip-modes-bar">
        <button data-mode="focus" class="pip-mode-btn pip-mode-active">Focus</button>
        <button data-mode="shortBreak" class="pip-mode-btn">Break</button>
        <button data-mode="longBreak" class="pip-mode-btn">Long</button>
        <button data-mode="custom" class="pip-mode-btn">Custom</button>
      </div>
    `;

    // Connect event listeners forwarding to main app
    doc.getElementById('pip-close-btn').addEventListener('click', () => {
      pWin.close();
    });

    doc.getElementById('pip-start-btn').addEventListener('click', () => {
      audioEngine.init();
      if (timer.isRunning) {
        timerPauseBtn.click();
      } else {
        timerStartBtn.click();
      }
    });

    doc.getElementById('pip-reset-btn').addEventListener('click', () => {
      timerResetBtn.click();
    });

    doc.getElementById('pip-skip-btn').addEventListener('click', () => {
      timerSkipBtn.click();
    });

    doc.querySelectorAll('.pip-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        const tab = document.querySelector(`.mode-tab[data-mode="${mode}"]`);
        if (tab) tab.click();
      });
    });

    // Keyboard shortcuts inside PiP window
    doc.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        audioEngine.init();
        if (timer.isRunning) {
          timerPauseBtn.click();
        } else {
          timerStartBtn.click();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        timerResetBtn.click();
      } else if (e.key === 's' || e.key === 'S') {
        timerSkipBtn.click();
      } else if (e.key === 'Escape') {
        pWin.close();
      }
    });
  }

  async function toggleFloatTimer() {
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
      pipWindow = null;
      setFloatButtonsActive(false);
      return;
    }

    if (!('documentPictureInPicture' in window)) {
      showToast("ℹ️ Float Timer uses Document Picture-in-Picture, supported in Chrome and Edge 116+. In other browsers, keep this window open alongside your work.", 5000);
      return;
    }

    try {
      pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 320,
        height: 255
      });

      setupPipDocument(pipWindow);
      setFloatButtonsActive(true);
      updatePipDisplay();

      pipWindow.addEventListener('pagehide', () => {
        pipWindow = null;
        setFloatButtonsActive(false);
      });

      showToast("Floating timer opened. Synchronized with your session.");
    } catch (err) {
      console.warn("Document Picture-in-Picture error:", err);
      pipWindow = null;
      setFloatButtonsActive(false);
      if (err.name === 'NotAllowedError') {
        showToast("Floating timer request was cancelled or blocked.", 3500);
      } else {
        showToast(`Float timer could not be opened: ${err.message}`, 4000);
      }
    }
  }

  if (floatTimerBtn) floatTimerBtn.addEventListener('click', toggleFloatTimer);
  if (floatTimerBtnDash) floatTimerBtnDash.addEventListener('click', toggleFloatTimer);

  timer.onTickCallback = (state) => {
    updateTimeDisplay(state.formattedTime);
    updateProgressRing(state.progress);
    updatePipDisplay();
    
    // Tab title formatted: "24:59 • Focus — Pomodoro Timer"
    const label = getModeLabel(state.currentMode);
    document.title = `${state.formattedTime} • ${label} — Pomodoro Timer`;

    // Update live session elapsed seconds and throttle persistence
    const active = window.StudySync ? window.StudySync.getActiveSession() : null;
    if (active && (active.status === 'in_progress' || active.status === 'paused')) {
      const elapsedSec = Math.max(0, Math.round(state.totalDuration - state.timeLeft));
      active.elapsed_seconds = elapsedSec;
      active.lastActiveTimestamp = Date.now();

      const now = Date.now();
      // Throttled local storage update: every 5 seconds
      if (now - lastLocalSaveTime > 5000) {
        window.StudySync.saveActiveSession(active);
        lastLocalSaveTime = now;
      }

      // Throttled Firestore sync: every 60 seconds while continuously running (avoids spamming Firestore)
      if (state.isRunning && now - lastCloudSyncTime > 60000) {
        window.StudySync.updateLiveSession(active.id, { elapsed_seconds: elapsedSec }, true);
        lastCloudSyncTime = now;
      }

      // Update active card display if history modal is open
      updateLiveHistoryCard(active);
    }
  };

  timer.onStateChangeCallback = (state) => {
    // Check if day rolled over while open
    checkDateRollover();

    // Update Start & Pause visual button states
    if (state.isRunning) {
      timerStartBtn.classList.add('timer-start-active');
      timerPauseBtn.classList.remove('timer-pause-active');
    } else {
      timerStartBtn.classList.remove('timer-start-active');
      if (state.timeLeft < state.totalDuration) {
        // Paused mid-session
        timerPauseBtn.classList.add('timer-pause-active');
      } else {
        // Fresh mode or reset
        timerPauseBtn.classList.remove('timer-pause-active');
      }
    }

    // Update active mode tab styles immediately
    modeTabs.forEach(tab => {
      if (tab.dataset.mode === state.currentMode) {
        tab.classList.add('bg-white/20', 'text-white', 'shadow-inner', 'border-white/20');
        tab.classList.remove('text-slate-400', 'border-transparent');
      } else {
        tab.classList.remove('bg-white/20', 'text-white', 'shadow-inner', 'border-white/20');
        tab.classList.add('text-slate-400', 'border-transparent');
      }
    });

    // Update Cycle and Mode labels
    const cycleNum = (state.completedSessions % 4) + 1;
    const cycleText = `Cycle ${cycleNum} / 4`;
    if (sessionCounter) sessionCounter.textContent = cycleText;
    if (sessionCycleBadge) sessionCycleBadge.textContent = cycleText;

    const currentLabel = getModeLabel(state.currentMode);
    if (modeIndicator) modeIndicator.textContent = currentLabel;
    if (circleModeText) circleModeText.textContent = currentLabel;

    // Update Today's focus sessions count display
    if (todayFocusCount) {
      todayFocusCount.textContent = String(state.todaySessions);
    }

    // Keep tab title synchronized
    const label = getModeLabel(state.currentMode);
    document.title = `${state.formattedTime} • ${label} — Pomodoro Timer`;

    // Keep floating Picture-in-Picture window synchronized
    updatePipDisplay();
  };

  // Called when a session finishes naturally
  timer.onCompleteCallback = async (completedMode, totalCompletedSessions, todayCompletedSessions) => {
    const active = window.StudySync ? window.StudySync.getActiveSession() : null;
    const durationMinutes = Math.round(timer.totalDuration / 60);
    const totalElapsedSec = durationMinutes * 60;

    if (active) {
      await window.StudySync.endLiveSession(active.id, 'completed', {
        elapsed_seconds: totalElapsedSec,
        completed_naturally: true
      });
    } else if (window.StudySync && typeof window.StudySync.recordSession === 'function') {
      await window.StudySync.recordSession({
        mode: completedMode,
        duration_minutes: durationMinutes,
        completed_naturally: true
      });
    }

    if (completedMode === 'focus') {
      const todayTotal = recordNaturalFocusCompletion();
      showToast(`✨ Focus session complete! Today's total: ${todayTotal} focus sessions. Time for a restful pause.`, 4500);
    } else if (completedMode === 'custom') {
      saveCurrentState();
      showToast(`✨ Custom study session complete! Outstanding focus.`, 4500);
    } else {
      saveCurrentState();
      showToast(`🧘 Break finished. Ready for your next focus session?`, 4000);
    }

    updateCustomPanelVisibility(timer.currentMode);
    updatePipDisplay();
  };

  // --- TIMER CONTROLS: START, PAUSE, RESET, SKIP ---
  timerStartBtn.addEventListener('click', async () => {
    audioEngine.init();
    if (timer.isRunning) return;

    timerStartBtn.disabled = true;

    try {
      // Step 1: Check for any resumable session in local storage or Firestore
      const resumable = window.StudySync && typeof window.StudySync.findResumableSession === 'function'
        ? await window.StudySync.findResumableSession()
        : (window.StudySync ? window.StudySync.getActiveSession() : null);

      if (resumable && (resumable.status === 'paused' || resumable.status === 'in_progress')) {
        // Step 2: Restore mode, planned duration, elapsed time, and existing record ID
        applyReconciledSession(resumable);

        const elapsedSec = Math.max(0, Math.round(timer.totalDuration - timer.timeLeft));

        // Step 3: Change that same record back to "in_progress" without creating a new record
        resumable.status = 'in_progress';
        resumable.elapsed_seconds = elapsedSec;
        resumable.updated_at = new Date().toISOString();
        resumable.lastActiveTimestamp = Date.now();
        if (window.StudySync) {
          window.StudySync.saveActiveSession(resumable);
          window.StudySync.upsertOfflineSession(resumable);
          await window.StudySync.updateLiveSession(resumable.id, {
            status: 'in_progress',
            elapsed_seconds: elapsedSec
          }, true);
        }

        // Step 4: Resume timer
        timer.start();
        showToast('Timer resumed');
      } else {
        // Step 5: No resumable session exists - create a fresh record
        const durationMinutes = Math.round(timer.totalDuration / 60);
        if (window.StudySync && typeof window.StudySync.startLiveSession === 'function') {
          await window.StudySync.startLiveSession({
            mode: timer.currentMode,
            duration_minutes: durationMinutes
          });
        }
        timer.start();
        showToast('Timer started');
      }
    } catch (err) {
      console.error("Error starting/resuming timer:", err);
      timer.start();
    } finally {
      timerStartBtn.disabled = false;
    }
  });

  timerPauseBtn.addEventListener('click', async () => {
    if (!timer.isRunning) return;
    timer.pause();
    const active = window.StudySync ? window.StudySync.getActiveSession() : null;
    if (active) {
      const elapsedSec = Math.max(0, Math.round(timer.totalDuration - timer.timeLeft));
      await window.StudySync.updateLiveSession(active.id, {
        status: 'paused',
        elapsed_seconds: elapsedSec
      }, true);
    }
    showToast('Timer paused');
  });

  timerResetBtn.addEventListener('click', async () => {
    const active = window.StudySync ? (window.StudySync.getActiveSession() || await window.StudySync.findResumableSession()) : null;
    if (active) {
      const elapsedSec = Math.max(0, Math.round(timer.totalDuration - timer.timeLeft));
      await window.StudySync.endLiveSession(active.id, 'reset', {
        elapsed_seconds: elapsedSec,
        completed_naturally: false
      });
    }
    timer.reset();
    showToast('Timer reset');
    saveCurrentState();
  });

  timerSkipBtn.addEventListener('click', async () => {
    const active = window.StudySync ? (window.StudySync.getActiveSession() || await window.StudySync.findResumableSession()) : null;
    if (active) {
      const elapsedSec = Math.max(0, Math.round(timer.totalDuration - timer.timeLeft));
      await window.StudySync.endLiveSession(active.id, 'skipped', {
        elapsed_seconds: elapsedSec,
        completed_naturally: false
      });
    }
    timer.skip();
    updateCustomPanelVisibility(timer.currentMode);
    showToast('Session skipped');
    saveCurrentState();
  });

  modeTabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      audioEngine.init();
      const newMode = tab.dataset.mode;
      if (newMode === timer.currentMode && !timer.isRunning) {
        if (newMode === 'custom') updateCustomPanelVisibility('custom');
        return;
      }

      const active = window.StudySync ? (window.StudySync.getActiveSession() || await window.StudySync.findResumableSession()) : null;
      if (active && (timer.isRunning || (active.elapsed_seconds && active.elapsed_seconds > 0))) {
        const elapsedSec = Math.max(0, Math.round(timer.totalDuration - timer.timeLeft));
        await window.StudySync.endLiveSession(active.id, 'interrupted', {
          elapsed_seconds: elapsedSec,
          completed_naturally: false
        });
      } else if (active) {
        window.StudySync.clearActiveSession();
      }

      timer.setMode(newMode);
      updateCustomPanelVisibility(newMode);
      saveCurrentState();
    });
  });

  // --- AUDIO SLIDERS & CONTROLS ---
  function updateSliderFill(slider, percentage, color = '#38bdf8') {
    slider.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, rgba(255, 255, 255, 0.12) ${percentage}%, rgba(255, 255, 255, 0.12) 100%)`;
  }

  // Rain Slider
  rainSlider.addEventListener('input', (e) => {
    audioEngine.init();
    const val = parseFloat(e.target.value);
    audioEngine.setRainVolume(val);
    const percent = Math.round(val * 100);
    rainVal.textContent = `${percent}%`;
    updateSliderFill(rainSlider, percent, '#38bdf8');
    updateAudioStateBadge();
    saveCurrentState();
  });

  // White Noise Slider
  noiseSlider.addEventListener('input', (e) => {
    audioEngine.init();
    const val = parseFloat(e.target.value);
    audioEngine.setNoiseVolume(val);
    const percent = Math.round(val * 100);
    noiseVal.textContent = `${percent}%`;
    updateSliderFill(noiseSlider, percent, '#a855f7');
    updateAudioStateBadge();
    saveCurrentState();
  });

  // Lo-fi Beats Slider
  lofiSlider.addEventListener('input', (e) => {
    audioEngine.init();
    const val = parseFloat(e.target.value);
    audioEngine.setLofiVolume(val);
    const percent = Math.round(val * 100);
    lofiVal.textContent = `${percent}%`;
    updateSliderFill(lofiSlider, percent, '#f97316');
    updateAudioStateBadge();
    saveCurrentState();
  });

  function updateAudioStateBadge() {
    const hasAudio = (audioEngine.rainVolume > 0 || audioEngine.noiseVolume > 0 || audioEngine.lofiVolume > 0) && !audioEngine.isMuted;
    if (hasAudio) {
      soundStatusDot.classList.add('bg-emerald-400');
      soundStatusDot.classList.remove('bg-slate-500');
    } else {
      soundStatusDot.classList.remove('bg-emerald-400');
      soundStatusDot.classList.add('bg-slate-500');
    }
  }

  // Master Mute Button
  masterMuteBtn.addEventListener('click', () => {
    audioEngine.init();
    const muted = audioEngine.toggleMute();
    if (muted) {
      masterMuteBtn.classList.add('text-rose-400', 'bg-rose-500/10');
      masterMuteBtn.classList.remove('text-slate-300', 'bg-white/5');
      showToast('🔇 Audio Muted');
    } else {
      masterMuteBtn.classList.remove('text-rose-400', 'bg-rose-500/10');
      masterMuteBtn.classList.add('text-slate-300', 'bg-white/5');
      showToast('🔊 Audio Active');
    }
    updateAudioStateBadge();
    saveCurrentState();
  });

  // Preset Buttons
  const presetBtns = document.querySelectorAll('.sound-preset-btn');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      audioEngine.init();
      const rain = parseFloat(btn.dataset.rain || 0);
      const noise = parseFloat(btn.dataset.noise || 0);
      const lofi = parseFloat(btn.dataset.lofi || 0);

      // Set sliders
      rainSlider.value = rain;
      noiseSlider.value = noise;
      lofiSlider.value = lofi;

      // Update engine
      audioEngine.setRainVolume(rain);
      audioEngine.setNoiseVolume(noise);
      audioEngine.setLofiVolume(lofi);

      // Update labels
      rainVal.textContent = `${Math.round(rain * 100)}%`;
      noiseVal.textContent = `${Math.round(noise * 100)}%`;
      lofiVal.textContent = `${Math.round(lofi * 100)}%`;

      updateSliderFill(rainSlider, rain * 100, '#38bdf8');
      updateSliderFill(noiseSlider, noise * 100, '#a855f7');
      updateSliderFill(lofiSlider, lofi * 100, '#f97316');

      updateAudioStateBadge();
      saveCurrentState();
      showToast(`🎧 Preset loaded: ${btn.dataset.name}`);
    });
  });

  // =========================================================================
  // --- SCENIC ANIMATED BACKGROUND CONTROLLER ---
  // =========================================================================
  const SCENE_META = {
    ocean: { name: 'Ocean Shore', icon: '🌊', toast: '🌊 Scenic background: Ocean Shore' },
    clouds: { name: 'Sunset Clouds', icon: '🌅', toast: '🌅 Scenic background: Sunset Clouds' },
    forest: { name: 'Quiet Forest', icon: '🌲', toast: '🌲 Scenic background: Quiet Forest' },
    sanctuary: { name: 'Sanctuary', icon: '✨', toast: '✨ Scenic background: Sanctuary' }
  };

  const sceneHeaderBtn = document.getElementById('scene-header-btn');
  const sceneHeaderIcon = document.getElementById('scene-header-icon');
  const sceneHeaderLabel = document.getElementById('scene-header-label');
  const sceneSelectorGroup = document.getElementById('scene-selector-group');
  const scenePills = document.querySelectorAll('.scene-pill');

  function updateSceneUI(activeScene) {
    const meta = SCENE_META[activeScene] || SCENE_META.ocean;
    if (sceneHeaderIcon) sceneHeaderIcon.textContent = meta.icon;
    if (sceneHeaderLabel) sceneHeaderLabel.textContent = meta.name;

    scenePills.forEach(pill => {
      const isCurrent = (pill.dataset.scene === activeScene);
      if (isCurrent) {
        pill.classList.add('is-active');
        pill.setAttribute('aria-checked', 'true');
        pill.setAttribute('tabindex', '0');
      } else {
        pill.classList.remove('is-active');
        pill.setAttribute('aria-checked', 'false');
        pill.setAttribute('tabindex', '-1');
      }
    });
  }

  function applyScene(newScene, showNotification = true) {
    if (!SCENE_META[newScene]) return;
    if (canvasEngine && typeof canvasEngine.setScene === 'function') {
      canvasEngine.setScene(newScene);
    }
    updateSceneUI(newScene);
    saveCurrentState();
    if (showNotification) {
      showToast(SCENE_META[newScene].toast, 2500);
    }
  }

  // Click & touch events on segmented scene pills
  scenePills.forEach(pill => {
    pill.addEventListener('click', () => {
      const scene = pill.dataset.scene;
      if (scene) applyScene(scene, true);
    });
  });

  // WAI-ARIA Radio Group keyboard navigation for scenic background selector
  if (sceneSelectorGroup) {
    sceneSelectorGroup.addEventListener('keydown', (e) => {
      const sceneKeys = ['ocean', 'clouds', 'forest', 'sanctuary'];
      const current = (canvasEngine && canvasEngine.currentScene) ? canvasEngine.currentScene : 'ocean';
      const currentIndex = sceneKeys.indexOf(current);
      let targetIndex = -1;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        targetIndex = (currentIndex + 1) % sceneKeys.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        targetIndex = (currentIndex - 1 + sceneKeys.length) % sceneKeys.length;
      }

      if (targetIndex >= 0) {
        const nextScene = sceneKeys[targetIndex];
        applyScene(nextScene, true);
        const targetBtn = sceneSelectorGroup.querySelector(`[data-scene="${nextScene}"]`);
        if (targetBtn) targetBtn.focus();
      }
    });
  }

  // Header quick scene cycle button
  if (sceneHeaderBtn) {
    sceneHeaderBtn.addEventListener('click', () => {
      const sceneKeys = ['ocean', 'clouds', 'forest', 'sanctuary'];
      const current = (canvasEngine && canvasEngine.currentScene) ? canvasEngine.currentScene : 'ocean';
      const currentIndex = sceneKeys.indexOf(current);
      const nextScene = sceneKeys[(currentIndex + 1) % sceneKeys.length];
      applyScene(nextScene, true);
    });
  }

  // --- PALETTE & CUSTOM COLOR CONTROLS ---
  const paletteBtns = document.querySelectorAll('.palette-pill');
  const paletteIndicator = document.getElementById('palette-indicator');

  function updateCustomColorSwatch() {
    const hslStr = `hsl(${currentCustomHue}, ${currentCustomSat}%, ${currentCustomLight}%)`;
    if (customColorSwatch) {
      customColorSwatch.style.backgroundColor = hslStr;
      customColorSwatch.style.boxShadow = `0 0 10px ${hslStr}`;
    }
    if (popoverColorDot) {
      popoverColorDot.style.backgroundColor = hslStr;
      popoverColorDot.style.boxShadow = `0 0 8px ${hslStr}`;
    }
  }

  function applyCustomColorChange() {
    const [r, g, b] = AmbientCanvasEngine.hslToRgb(currentCustomHue, currentCustomSat / 100, currentCustomLight / 100);
    currentCustomHex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    if (nativeColorPicker) nativeColorPicker.value = currentCustomHex;
    updateCustomColorSwatch();
    canvasEngine.setCustomHsl(currentCustomHue, currentCustomSat / 100, currentCustomLight / 100);
    updatePaletteUI(-2);
    saveCurrentState();
  }

  function updatePaletteUI(activeIdx) {
    paletteBtns.forEach(b => {
      const bIdx = parseInt(b.dataset.index, 10);
      if (bIdx === activeIdx) {
        b.classList.add('ring-2', 'ring-white/80', 'bg-white/20');
      } else {
        b.classList.remove('ring-2', 'ring-white/80', 'bg-white/20');
      }
    });

    if (customColorBtn) {
      if (activeIdx === -2) {
        customColorBtn.classList.add('ring-2', 'ring-white/90', 'shadow-[0_0_12px_rgba(255,255,255,0.4)]');
      } else {
        customColorBtn.classList.remove('ring-2', 'ring-white/90', 'shadow-[0_0_12px_rgba(255,255,255,0.4)]');
      }
    }

    if (activeIdx === -1) {
      if (paletteIndicator) paletteIndicator.textContent = 'Auto Sunset Drift';
    } else if (activeIdx === -2) {
      if (paletteIndicator) paletteIndicator.textContent = 'Custom Atmosphere';
    } else if (canvasEngine.palettes[activeIdx]) {
      if (paletteIndicator) paletteIndicator.textContent = canvasEngine.palettes[activeIdx].name;
    }
  }

  // Preset & Auto palette buttons
  paletteBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      if (isNaN(idx)) return;

      if (idx === -1) {
        canvasEngine.setAutoMode();
        showToast('🌅 Auto Sunset Palette Flow enabled');
      } else {
        canvasEngine.setPreset(idx);
        showToast(`🎨 Palette: ${canvasEngine.palettes[idx].name}`);
      }
      updatePaletteUI(idx);
      saveCurrentState();
    });
  });

  // Custom Color Popover Toggle & Controls
  function toggleColorPopover(forceOpen = null) {
    if (!customColorPopover) return;
    const isCurrentlyHidden = customColorPopover.classList.contains('hidden');
    const shouldOpen = forceOpen !== null ? forceOpen : isCurrentlyHidden;

    if (shouldOpen) {
      customColorPopover.classList.remove('hidden');
      requestAnimationFrame(() => {
        customColorPopover.classList.remove('opacity-0');
        customColorPopover.classList.add('opacity-100');
      });
    } else {
      customColorPopover.classList.remove('opacity-100');
      customColorPopover.classList.add('opacity-0');
      setTimeout(() => {
        customColorPopover.classList.add('hidden');
      }, 250);
    }
  }

  if (customColorBtn) {
    customColorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleColorPopover();
      // Activate custom color mode if not already active
      if (canvasEngine.paletteMode !== 'custom') {
        canvasEngine.setCustomHsl(currentCustomHue, currentCustomSat / 100, currentCustomLight / 100);
        updatePaletteUI(-2);
        saveCurrentState();
        showToast('🎨 Custom Atmosphere Color Active');
      }
    });
  }

  if (closeColorPopover) {
    closeColorPopover.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleColorPopover(false);
    });
  }

  // Hue Slider
  if (customHueSlider) {
    customHueSlider.addEventListener('input', (e) => {
      currentCustomHue = parseInt(e.target.value, 10);
      if (customHueVal) customHueVal.textContent = `${currentCustomHue}°`;
      applyCustomColorChange();
    });
  }

  // Saturation Slider
  if (customSatSlider) {
    customSatSlider.addEventListener('input', (e) => {
      currentCustomSat = parseInt(e.target.value, 10);
      if (customSatVal) customSatVal.textContent = `${currentCustomSat}%`;
      applyCustomColorChange();
    });
  }

  // Lightness Slider
  if (customLightSlider) {
    customLightSlider.addEventListener('input', (e) => {
      currentCustomLight = parseInt(e.target.value, 10);
      if (customLightVal) customLightVal.textContent = `${currentCustomLight}%`;
      applyCustomColorChange();
    });
  }

  // Quick Curated Tone Chips
  presetChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      currentCustomHue = parseInt(chip.dataset.hue, 10);
      currentCustomSat = parseInt(chip.dataset.sat, 10);
      currentCustomLight = parseInt(chip.dataset.light, 10);

      if (customHueSlider) customHueSlider.value = currentCustomHue;
      if (customSatSlider) customSatSlider.value = currentCustomSat;
      if (customLightSlider) customLightSlider.value = currentCustomLight;

      if (customHueVal) customHueVal.textContent = `${currentCustomHue}°`;
      if (customSatVal) customSatVal.textContent = `${currentCustomSat}%`;
      if (customLightVal) customLightVal.textContent = `${currentCustomLight}%`;

      applyCustomColorChange();
      showToast(`✨ Tone: ${chip.title || 'Selected'}`);
    });
  });

  // Native OS Color Wheel Picker
  if (nativeColorPicker) {
    nativeColorPicker.addEventListener('input', (e) => {
      currentCustomHex = e.target.value;
      const [h, s, l] = AmbientCanvasEngine.hexToHsl(currentCustomHex);
      currentCustomHue = h;
      currentCustomSat = Math.round(s * 100);
      currentCustomLight = Math.round(l * 100);

      if (customHueSlider) customHueSlider.value = currentCustomHue;
      if (customSatSlider) customSatSlider.value = currentCustomSat;
      if (customLightSlider) customLightSlider.value = currentCustomLight;

      if (customHueVal) customHueVal.textContent = `${currentCustomHue}°`;
      if (customSatVal) customSatVal.textContent = `${currentCustomSat}%`;
      if (customLightVal) customLightVal.textContent = `${currentCustomLight}%`;

      updateCustomColorSwatch();
      canvasEngine.setCustomColor(currentCustomHex);
      updatePaletteUI(-2);
      saveCurrentState();
    });
  }

  // --- COMPACT COLLAPSIBLE AMBIENT AUDIO MIXER SECTION ---
  let isMixerExpanded = false;

  function setMixerExpanded(expanded) {
    isMixerExpanded = !!expanded;
    if (audioMixerDock) {
      if (isMixerExpanded) {
        audioMixerDock.classList.add('is-expanded');
      } else {
        audioMixerDock.classList.remove('is-expanded');
      }
    }
    if (ambientMixerTrigger) {
      ambientMixerTrigger.setAttribute('aria-expanded', isMixerExpanded ? 'true' : 'false');
    }
  }

  function toggleMixer() {
    setMixerExpanded(!isMixerExpanded);
  }

  // Trigger button: toggles open and closed (supports click, touch tap, Enter, and Space)
  if (ambientMixerTrigger) {
    ambientMixerTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      toggleMixer();
    });
    ambientMixerTrigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleMixer();
      }
    });
  }

  // Keyboard navigation: Escape key closes mixer if expanded
  if (audioMixerDock) {
    audioMixerDock.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isMixerExpanded) {
        e.stopPropagation();
        e.preventDefault();
        setMixerExpanded(false);
        if (ambientMixerTrigger) ambientMixerTrigger.focus();
      }
    });
  }

  // --- ZEN / SANCTUARY MODE ---
  function setZenMode(active) {
    isZenMode = active;
    const mixerDockWrapper = document.getElementById('ambient-mixer-dock-wrapper');
    if (isZenMode) {
      if (centerContainer) centerContainer.classList.add('zen-active');
      if (audioMixerDock) audioMixerDock.classList.add('zen-active');
      if (mixerDockWrapper) mixerDockWrapper.classList.add('zen-active');
      zenNotice.classList.remove('hidden');
      setTimeout(() => zenNotice.classList.remove('opacity-0'), 50);
    } else {
      if (centerContainer) centerContainer.classList.remove('zen-active');
      if (audioMixerDock) audioMixerDock.classList.remove('zen-active');
      if (mixerDockWrapper) mixerDockWrapper.classList.remove('zen-active');
      zenNotice.classList.add('opacity-0');
      setTimeout(() => zenNotice.classList.add('hidden'), 500);
    }
  }

  zenToggleBtn.addEventListener('click', () => {
    setZenMode(!isZenMode);
  });

  document.getElementById('ambient-canvas').addEventListener('click', () => {
    if (isZenMode) {
      setZenMode(false);
    }
  });

  zenNotice.addEventListener('click', () => {
    setZenMode(false);
  });

  // --- KEYBOARD SHORTCUTS ---
  document.addEventListener('keydown', (e) => {
    // Prevent shortcuts if typing in any text input
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range' && e.target.type !== 'color') return;

    if (e.code === 'Space') {
      e.preventDefault();
      audioEngine.init();
      if (timer.isRunning) {
        timerPauseBtn.click();
      } else {
        timerStartBtn.click();
      }
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      if (timer.isRunning) {
        timerPauseBtn.click();
      }
    } else if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      setZenMode(!isZenMode);
    } else if (e.key === 'r' || e.key === 'R') {
      currentSessionStartTime = null;
      timerResetBtn.click();
    } else if (e.key === 's' || e.key === 'S') {
      currentSessionStartTime = null;
      timerSkipBtn.click();
    } else if (e.key === 'm' || e.key === 'M') {
      audioEngine.init();
      masterMuteBtn.click();
    } else if (e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      if (sceneHeaderBtn) sceneHeaderBtn.click();
    } else if (e.key === 'Escape') {
      if (typeof hideAuthModal === 'function' && authModal && authModal.classList.contains('modal-visible')) {
        hideAuthModal();
      } else if (typeof hideHistoryModal === 'function' && historyModal && historyModal.classList.contains('modal-visible')) {
        hideHistoryModal();
      } else if (customColorPopover && !customColorPopover.classList.contains('hidden')) {
        toggleColorPopover(false);
      } else if (isMixerExpanded) {
        setMixerExpanded(false);
        if (ambientMixerTrigger) ambientMixerTrigger.focus();
      } else if (isZenMode) {
        setZenMode(false);
      }
    }
  });

  // Global first interaction audio unlock listener
  const unlockAudio = () => {
    audioEngine.init();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);

  // =========================================================================
  // --- AUTHENTICATION & FIREBASE CLOUD HISTORY CONTROLLER ---
  // =========================================================================
  // --- Modal Helpers ---
  function showAuthModal() {
    if (!authModal) return;
    authModal.classList.remove('modal-hidden');
    authModal.classList.add('modal-visible');
    hideAuthAlert();

    const isConfigured = window.ConfigManager && window.ConfigManager.isConfigured();

    if (!isConfigured) {
      showAuthAlert("ℹ️ Firebase is not configured yet. The timer is running in offline Guest Mode. To enable user accounts and cloud sync, add your public Firebase web configuration in js/config.js.", 'info');
    }

    if (authEmail) authEmail.focus();
  }

  function hideAuthModal() {
    if (!authModal) return;
    authModal.classList.remove('modal-visible');
    authModal.classList.add('modal-hidden');
    hideAuthAlert();
  }

  function showAuthAlert(msg, type = 'error') {
    if (!authAlert) return;
    authAlert.textContent = msg;
    if (type === 'success' || type === true) {
      authAlert.className = 'mb-3 p-2.5 rounded-xl text-xs bg-emerald-500/15 border border-emerald-400/30 text-emerald-300';
    } else if (type === 'info') {
      authAlert.className = 'mb-3 p-2.5 rounded-xl text-xs bg-amber-500/15 border border-amber-400/30 text-amber-300';
    } else {
      authAlert.className = 'mb-3 p-2.5 rounded-xl text-xs bg-rose-500/15 border border-rose-400/30 text-rose-300';
    }
    authAlert.classList.remove('hidden');
  }

  function hideAuthAlert() {
    if (authAlert) authAlert.classList.add('hidden');
  }

  function setAuthMode(mode) {
    currentAuthMode = mode;
    hideAuthAlert();
    if (mode === 'signin') {
      tabSignin.classList.add('bg-white/20', 'text-white', 'shadow-sm', 'border-white/20');
      tabSignin.classList.remove('text-slate-400', 'border-transparent');
      tabSignup.classList.remove('bg-white/20', 'text-white', 'shadow-sm', 'border-white/20');
      tabSignup.classList.add('text-slate-400', 'border-transparent');
      authSubmitText.textContent = 'Sign In to Sanctuary';
    } else {
      tabSignup.classList.add('bg-white/20', 'text-white', 'shadow-sm', 'border-white/20');
      tabSignup.classList.remove('text-slate-400', 'border-transparent');
      tabSignin.classList.remove('bg-white/20', 'text-white', 'shadow-sm', 'border-white/20');
      tabSignin.classList.add('text-slate-400', 'border-transparent');
      authSubmitText.textContent = 'Create Free Account';
    }
  }

  if (tabSignin) tabSignin.addEventListener('click', () => setAuthMode('signin'));
  if (tabSignup) tabSignup.addEventListener('click', () => setAuthMode('signup'));

  if (openAuthBtn) openAuthBtn.addEventListener('click', () => showAuthModal());
  if (closeAuthModal) closeAuthModal.addEventListener('click', hideAuthModal);

  // Auth Form Submission
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAuthAlert();

      // Check if Firebase credentials are configured in js/config.js
      if (!window.ConfigManager.isConfigured()) {
        showAuthAlert("Firebase is not configured. Please add your public Firebase web configuration in js/config.js to enable user accounts, or continue using Guest Mode.", 'error');
        return;
      }

      const email = authEmail.value.trim();
      const password = authPassword.value;

      if (!email || !password) {
        showAuthAlert("Please provide both email and password.", false);
        return;
      }

      // UI Loading state
      authSubmitBtn.disabled = true;
      authSubmitSpinner.classList.remove('hidden');
      authSubmitText.textContent = currentAuthMode === 'signin' ? 'Signing In...' : 'Creating Account...';

      try {
        if (currentAuthMode === 'signin') {
          await window.AuthManager.signIn(email, password);
          showToast(`✨ Welcome back, ${email}!`);
          hideAuthModal();
        } else {
          const res = await window.AuthManager.signUp(email, password);
          if (res && (res.uid || res.email || res.session)) {
            showToast(`✨ Welcome to your focus sanctuary, ${email}!`);
            hideAuthModal();
          } else {
            showAuthAlert("Account created successfully! You may now sign in.", true);
          }
        }
      } catch (err) {
        showAuthAlert(err.message, false);
      } finally {
        authSubmitBtn.disabled = false;
        authSubmitSpinner.classList.add('hidden');
        authSubmitText.textContent = currentAuthMode === 'signin' ? 'Sign In to Sanctuary' : 'Create Free Account';
      }
    });
  }

  // User Profile Pill & Dropdown
  if (userProfileBtn) {
    userProfileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdownMenu.classList.toggle('hidden');
    });
  }

  if (dropdownHistoryBtn) {
    dropdownHistoryBtn.addEventListener('click', () => {
      userDropdownMenu.classList.add('hidden');
      showHistoryModal();
    });
  }

  if (dropdownSignoutBtn) {
    dropdownSignoutBtn.addEventListener('click', async () => {
      userDropdownMenu.classList.add('hidden');
      await window.AuthManager.signOut();
      showToast("Signed out. Operating in local guest mode.");
    });
  }

  // --- STUDY HISTORY MODAL CONTROLLER ---
  function formatSessionDate(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();

      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (isToday) return `Today at ${timeStr}`;
      if (isYesterday) return `Yesterday at ${timeStr}`;
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
    } catch (e) {
      return isoString;
    }
  }

  function updateLiveHistoryCard(active) {
    if (!historyModal || !historyModal.classList.contains('modal-visible') || !active) return;
    const card = document.querySelector(`[data-session-id="${active.id}"]`);
    if (!card) return;

    const elapsedEl = card.querySelector('.live-elapsed-time');
    if (elapsedEl) {
      const totalSec = active.elapsed_seconds || 0;
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      elapsedEl.textContent = `${m}m ${String(s).padStart(2, '0')}s elapsed`;
    }
    const statusEl = card.querySelector('.live-status-pill');
    if (statusEl) {
      const isPaused = active.status === 'paused';
      statusEl.className = `live-status-pill inline-flex items-center gap-1 text-[10px] ${isPaused ? 'text-amber-400 font-medium' : 'text-emerald-400 font-semibold'}`;
      statusEl.innerHTML = isPaused
        ? `<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Paused`
        : `<span class="w-2 h-2 rounded-full bg-emerald-400 status-dot"></span> In Progress`;
    }
  }

  async function loadAndRenderHistory(filter = currentHistoryFilter) {
    currentHistoryFilter = filter;
    if (!historyList) return;

    // Update active filter button styling
    historyFilterBtns.forEach(btn => {
      if (btn.dataset.filter === filter) {
        btn.className = "history-filter-btn px-2 py-0.5 rounded-md bg-white/20 text-white font-medium border border-white/20";
      } else {
        btn.className = "history-filter-btn px-2 py-0.5 rounded-md text-slate-400 hover:text-slate-200 border border-transparent";
      }
    });

    const isConfigured = window.ConfigManager && window.ConfigManager.isConfigured();
    const isAuth = window.AuthManager && window.AuthManager.isAuthenticated();
    const userEmail = window.AuthManager ? window.AuthManager.getUserEmail() : null;

    // Fetch records
    const res = await window.StudySync.fetchHistory(60);
    const sessions = res.sessions || [];

    // Update Sync Badge
    if (historySyncStatus) {
      if (isAuth) {
        if (res.error) {
          historySyncStatus.innerHTML = `
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span class="text-amber-300 truncate" title="Cloud database temporarily unreachable. Using local storage.">Cloud Offline • Showing Local Sessions</span>
          `;
        } else {
          historySyncStatus.innerHTML = `
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 status-dot"></span>
            <span class="text-emerald-300 truncate">Cloud Synced • ${userEmail}</span>
          `;
        }
      } else if (isConfigured) {
        historySyncStatus.innerHTML = `
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          <span class="text-amber-300">Local Guest Storage (Sign in to sync)</span>
        `;
      } else {
        historySyncStatus.innerHTML = `
          <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          <span class="text-slate-300">Local Guest Storage (Cloud Sync Unconfigured)</span>
        `;
      }
    }

    // Calculate metrics
    const stats = window.StudySync.calculateStats(sessions);
    if (historyTotalTime) historyTotalTime.textContent = `${stats.totalHours} hrs`;
    if (historyTotalSessions) historyTotalSessions.textContent = `${stats.completedFocusSessions} focus`;
    if (historyTodayTime) historyTodayTime.textContent = `${stats.todayFocusMinutes} mins`;

    // Check unsynced offline sessions
    if (historyOfflineBanner) {
      const offline = window.StudySync.getOfflineSessions();
      const unsyncedCount = offline.filter(s => !s.synced).length;
      if (isAuth && unsyncedCount > 0) {
        historyOfflineBanner.classList.remove('hidden');
        if (historyOfflineCountText) {
          historyOfflineCountText.textContent = `${unsyncedCount} session(s) recorded in guest mode waiting to sync.`;
        }
      } else {
        historyOfflineBanner.classList.add('hidden');
      }
    }

    // Filter sessions
    const filtered = sessions.filter(s => {
      if (filter === 'focus') return s.mode === 'focus';
      if (filter === 'break') return s.mode === 'shortBreak' || s.mode === 'longBreak';
      if (filter === 'custom') return s.mode === 'custom';
      return true;
    });

    if (filtered.length === 0) {
      historyList.innerHTML = '';
      if (historyEmptyState) historyEmptyState.classList.remove('hidden');
      return;
    }

    if (historyEmptyState) historyEmptyState.classList.add('hidden');

    // Build session cards HTML
    let html = '';
    filtered.forEach(session => {
      let label = 'Deep Focus';
      let badgeClass = 'bg-sky-500/15 border-sky-400/30 text-sky-300';

      if (session.mode === 'custom') {
        label = 'Custom';
        badgeClass = 'bg-indigo-500/15 border-indigo-400/30 text-indigo-300';
      } else if (session.mode === 'longBreak') {
        label = 'Long Break';
        badgeClass = 'bg-purple-500/15 border-purple-400/30 text-purple-300';
      } else if (session.mode === 'shortBreak') {
        label = 'Rest Break';
        badgeClass = 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300';
      }

      const dateStr = formatSessionDate(session.started_at);
      const isOngoing = session.status === 'in_progress' || session.status === 'paused';
      const isPaused = session.status === 'paused';

      let statusBadge = '';
      if (session.status === 'in_progress') {
        statusBadge = `<span class="live-status-pill inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold" title="In Progress">
          <span class="w-2 h-2 rounded-full bg-emerald-400 status-dot"></span>
          In Progress
        </span>`;
      } else if (session.status === 'paused') {
        statusBadge = `<span class="live-status-pill inline-flex items-center gap-1 text-[10px] text-amber-400 font-medium" title="Paused">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          Paused
        </span>`;
      } else if (session.status === 'completed' || (session.completed_naturally && !session.status)) {
        statusBadge = `<span class="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium" title="Completed naturally">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          Completed
        </span>`;
      } else if (session.status === 'interrupted') {
        statusBadge = `<span class="inline-flex items-center gap-1 text-[10px] text-rose-300" title="Interrupted">
          <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          Interrupted
        </span>`;
      } else if (session.status === 'reset') {
        statusBadge = `<span class="inline-flex items-center gap-1 text-[10px] text-slate-400" title="Reset">
          <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
          Reset
        </span>`;
      } else if (session.status === 'skipped') {
        statusBadge = `<span class="inline-flex items-center gap-1 text-[10px] text-amber-400/80" title="Skipped">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500/80"></span>
          Skipped
        </span>`;
      } else {
        statusBadge = `<span class="inline-flex items-center gap-1 text-[10px] text-slate-400" title="Partial">
          <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
          Partial
        </span>`;
      }

      let durationDisplay = '';
      if (isOngoing) {
        const totalSec = session.elapsed_seconds || 0;
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        durationDisplay = `
          <div class="flex items-center gap-1.5">
            <span class="font-mono font-medium text-white text-[11px] sm:text-xs">${session.duration_minutes}m planned</span>
            <span class="text-slate-500">•</span>
            <span class="live-elapsed-time font-mono text-emerald-300 text-[10px] sm:text-[11px]">${m}m ${String(s).padStart(2, '0')}s elapsed</span>
          </div>
        `;
      } else if (session.status === 'completed' || (session.completed_naturally && !session.status)) {
        durationDisplay = `
          <span class="font-mono font-medium text-white text-[11px] sm:text-xs">${session.duration_minutes} min</span>
        `;
      } else {
        const elapsedM = Math.max(0, Math.round((session.elapsed_seconds || 0) / 60));
        durationDisplay = `
          <div class="flex items-center gap-1.5">
            <span class="font-mono font-medium text-white text-[11px] sm:text-xs">${elapsedM}m elapsed</span>
            <span class="text-[10px] text-slate-500">(${session.duration_minutes}m planned)</span>
          </div>
        `;
      }

      const id = session.id || session.localId;
      const cardBorder = isOngoing
        ? (isPaused ? 'border-amber-500/40 bg-amber-500/5' : 'border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]')
        : 'border-white/5 glass-panel-subtle';

      html += `
        <div class="p-2.5 rounded-2xl ${cardBorder} border flex items-center justify-between gap-2 hover:border-white/15 transition-all text-xs" data-session-id="${id}">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${badgeClass} shrink-0">${label}</span>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                ${durationDisplay}
                ${statusBadge}
              </div>
              <span class="text-[10px] text-slate-400 block truncate">${dateStr}</span>
            </div>
          </div>
          ${!isOngoing ? `
          <button class="delete-session-btn text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0" data-id="${id}" title="Remove record">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>` : `
          <span class="text-[10px] text-emerald-400/80 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 shrink-0 font-medium">Active</span>
          `}
        </div>
      `;
    });

    historyList.innerHTML = html;

    // Attach delete listeners
    historyList.querySelectorAll('.delete-session-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        await window.StudySync.deleteSession(id);
        loadAndRenderHistory();
      });
    });
  }

  function showHistoryModal() {
    if (!historyModal) return;
    historyModal.classList.remove('modal-hidden');
    historyModal.classList.add('modal-visible');
    loadAndRenderHistory();
  }

  function hideHistoryModal() {
    if (!historyModal) return;
    historyModal.classList.remove('modal-visible');
    historyModal.classList.add('modal-hidden');
  }

  if (historyBtn) historyBtn.addEventListener('click', showHistoryModal);
  if (closeHistoryModal) closeHistoryModal.addEventListener('click', hideHistoryModal);

  historyFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      loadAndRenderHistory(btn.dataset.filter);
    });
  });

  if (historySyncNowBtn) {
    historySyncNowBtn.addEventListener('click', async () => {
      historySyncNowBtn.disabled = true;
      historySyncNowBtn.textContent = 'Syncing...';
      const res = await window.StudySync.syncOfflineSessions();
      historySyncNowBtn.disabled = false;
      historySyncNowBtn.textContent = 'Sync Now';
      if (res && res.syncedCount > 0) {
        showToast(`✨ Successfully synced ${res.syncedCount} session(s) to cloud!`);
      }
      loadAndRenderHistory();
    });
  }

  // Close modals on clicking backdrop
  window.addEventListener('click', (e) => {
    if (e.target === authModal) hideAuthModal();
    if (e.target === historyModal) hideHistoryModal();
    if (userProfileWrapper && !userProfileWrapper.contains(e.target)) {
      if (userDropdownMenu) userDropdownMenu.classList.add('hidden');
    }
  });

  // Listen to Auth State Changes to update UI and trigger automatic sync
  if (window.AuthManager) {
    window.AuthManager.onAuthStateChange(async (event, user) => {
      if (user) {
        if (openAuthBtn) openAuthBtn.classList.add('hidden');
        if (userProfileWrapper) userProfileWrapper.classList.remove('hidden');
        if (headerUserEmail) headerUserEmail.textContent = user.email;
        if (dropdownUserEmail) dropdownUserEmail.textContent = user.email;

        // Auto-sync offline guest sessions upon sign-in
        if (window.StudySync) {
          const syncRes = await window.StudySync.syncOfflineSessions();
          if (syncRes && syncRes.syncedCount > 0) {
            showToast(`✨ Synced ${syncRes.syncedCount} offline session(s) to your cloud account!`, 4000);
          }

          // If timer is not running, reconcile any resumable session from the cloud or local storage
          if (!timer.isRunning && typeof window.StudySync.reconcileActiveSession === 'function') {
            const res = await window.StudySync.reconcileActiveSession();
            if (res && res.status === 'resumable' && res.session) {
              applyReconciledSession(res.session);
            }
          }
        }
      } else {
        if (openAuthBtn) openAuthBtn.classList.remove('hidden');
        if (userProfileWrapper) userProfileWrapper.classList.add('hidden');
        if (userDropdownMenu) userDropdownMenu.classList.add('hidden');
      }
    });

    // Initialize Auth client
    window.AuthManager.init();
  }

  // =========================================================================
  // --- RESTORE SAVED SETTINGS & ACTIVE SESSION ON PAGE LOAD ---
  // =========================================================================
  // 1. Restore Daily Focus Count & Completed Sessions
  timer.setTodayFocusSessions(appState.dailyFocus.count);
  timer.setCompletedFocusSessions(appState.settings.completedSessions);

  // 2. Restore Timer Mode (focus, shortBreak, longBreak, custom)
  timer.setMode(appState.settings.timerMode);
  updateCustomPanelVisibility(appState.settings.timerMode);

  // 3. Restore Audio Levels and Mute State
  const savedRain = appState.settings.audio.rainVolume;
  const savedNoise = appState.settings.audio.noiseVolume;
  const savedLofi = appState.settings.audio.lofiVolume;
  const savedMuted = appState.settings.audio.isMuted;

  audioEngine.rainVolume = savedRain;
  audioEngine.noiseVolume = savedNoise;
  audioEngine.lofiVolume = savedLofi;
  audioEngine.isMuted = savedMuted;

  rainSlider.value = savedRain;
  noiseSlider.value = savedNoise;
  lofiSlider.value = savedLofi;

  rainVal.textContent = `${Math.round(savedRain * 100)}%`;
  noiseVal.textContent = `${Math.round(savedNoise * 100)}%`;
  lofiVal.textContent = `${Math.round(savedLofi * 100)}%`;

  updateSliderFill(rainSlider, Math.round(savedRain * 100), '#38bdf8');
  updateSliderFill(noiseSlider, Math.round(savedNoise * 100), '#a855f7');
  updateSliderFill(lofiSlider, Math.round(savedLofi * 100), '#f97316');

  if (savedMuted) {
    masterMuteBtn.classList.add('text-rose-400', 'bg-rose-500/10');
    masterMuteBtn.classList.remove('text-slate-300', 'bg-white/5');
  } else {
    masterMuteBtn.classList.remove('text-rose-400', 'bg-rose-500/10');
    masterMuteBtn.classList.add('text-slate-300', 'bg-white/5');
  }
  updateAudioStateBadge();

  // 4. Restore Custom Color Controls & State
  if (customHueSlider) customHueSlider.value = currentCustomHue;
  if (customSatSlider) customSatSlider.value = currentCustomSat;
  if (customLightSlider) customLightSlider.value = currentCustomLight;

  if (customHueVal) customHueVal.textContent = `${currentCustomHue}°`;
  if (customSatVal) customSatVal.textContent = `${currentCustomSat}%`;
  if (customLightVal) customLightVal.textContent = `${currentCustomLight}%`;

  if (nativeColorPicker) nativeColorPicker.value = currentCustomHex;
  updateCustomColorSwatch();

  // 5. Restore Palette Mode
  const savedPaletteMode = appState.settings.palette.mode;
  const savedPaletteIdx = appState.settings.palette.paletteIndex;

  if (savedPaletteMode === 'custom' || savedPaletteIdx === -2) {
    canvasEngine.setCustomHsl(currentCustomHue, currentCustomSat / 100, currentCustomLight / 100);
    updatePaletteUI(-2);
  } else if (savedPaletteMode === 'preset' && savedPaletteIdx >= 0 && savedPaletteIdx < canvasEngine.palettes.length) {
    canvasEngine.setPreset(savedPaletteIdx);
    updatePaletteUI(savedPaletteIdx);
  } else {
    canvasEngine.setAutoMode();
    updatePaletteUI(-1);
  }

  // 6. Restore Scenic Animated Background
  const savedScene = appState.settings.scene || 'ocean';
  if (canvasEngine && typeof canvasEngine.setScene === 'function') {
    canvasEngine.setScene(savedScene);
  }
  updateSceneUI(savedScene);

  // Trigger initial tick & state render
  timer.notifyTick();
  timer.notifyStateChange();

  // Reconcile any in-progress or paused active session on startup / reload
  if (window.StudySync && typeof window.StudySync.reconcileActiveSession === 'function') {
    window.StudySync.reconcileActiveSession().then(res => {
      if (res && res.status === 'resumable' && res.session) {
        applyReconciledSession(res.session);
        showToast('Restored previous session in paused state. Click Start to resume.', 5000);
      } else if (res && res.status === 'interrupted') {
        showToast('Previous in-progress session was interrupted and recorded in history.', 4000);
      }
    });
  }

  // Persist latest active session elapsed time synchronously on beforeunload
  window.addEventListener('beforeunload', () => {
    const active = window.StudySync ? window.StudySync.getActiveSession() : null;
    if (active && (timer.isRunning || active.status === 'in_progress')) {
      const elapsedSec = Math.max(0, Math.round(timer.totalDuration - timer.timeLeft));
      active.elapsed_seconds = elapsedSec;
      active.status = 'paused';
      active.lastActiveTimestamp = Date.now();
      window.StudySync.saveActiveSession(active);
    }
  });

  // Active date rollover watcher: updates display automatically when midnight passes even if page is idle
  setInterval(checkDateRollover, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkDateRollover();
  });
  window.addEventListener('focus', checkDateRollover);

  console.log("Pomodoro Timer initialized with restored preferences.");
});
