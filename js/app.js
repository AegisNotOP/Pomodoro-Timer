/**
 * The Algorithmic Ambient Room - Main Application Controller
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

        // Timer mode validation
        const validModes = ['focus', 'shortBreak', 'longBreak'];
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
  const modeTabs = document.querySelectorAll('.mode-tab');
  const sessionCounter = document.getElementById('session-counter');
  const sessionCycleBadge = document.getElementById('session-cycle-badge');
  const modeIndicator = document.getElementById('mode-indicator');
  const circleModeText = document.getElementById('circle-mode-text');
  const todayFocusCount = document.getElementById('today-focus-count');

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

  // Mobile Audio Mixer Elements
  const mixerToggleBtn = document.getElementById('mixer-toggle-btn');
  const mixerTitleBar = document.getElementById('mixer-title-bar');
  const mixerSlidersBody = document.getElementById('mixer-sliders-body');
  const mixerToggleIcon = document.getElementById('mixer-toggle-icon');

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
      default:
        return 'Focus';
    }
  }

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

  // --- TIMER CALLBACKS ---
  timer.onTickCallback = (state) => {
    timeDisplay.textContent = state.formattedTime;
    updateProgressRing(state.progress);
    
    // Tab title formatted: "24:59 • Focus — The Algorithmic Ambient Room"
    const label = getModeLabel(state.currentMode);
    document.title = `${state.formattedTime} • ${label} — The Algorithmic Ambient Room`;
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
    document.title = `${state.formattedTime} • ${label} — The Algorithmic Ambient Room`;
  };

  // Called when a session finishes naturally
  timer.onCompleteCallback = (completedMode, totalCompletedSessions, todayCompletedSessions) => {
    if (completedMode === 'focus') {
      const todayTotal = recordNaturalFocusCompletion();
      showToast(`✨ Focus session complete! Today's total: ${todayTotal} focus sessions. Time for a restful pause.`, 4500);
    } else {
      saveCurrentState();
      showToast(`🧘 Break finished. Ready for your next focus session?`, 4000);
    }
  };

  // --- TIMER CONTROLS: START, PAUSE, RESET, SKIP ---
  timerStartBtn.addEventListener('click', () => {
    audioEngine.init();
    if (!timer.isRunning) {
      timer.start();
      showToast('Timer started');
    }
  });

  timerPauseBtn.addEventListener('click', () => {
    if (timer.isRunning) {
      timer.pause();
      showToast('Timer paused');
    }
  });

  timerResetBtn.addEventListener('click', () => {
    timer.reset();
    showToast('Timer reset');
    saveCurrentState();
  });

  timerSkipBtn.addEventListener('click', () => {
    timer.skip();
    showToast('Session skipped');
    saveCurrentState();
  });

  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      audioEngine.init();
      const mode = tab.dataset.mode;
      timer.setMode(mode);
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

  // --- MOBILE AUDIO MIXER COLLAPSE/EXPAND CONTROLS ---
  function toggleMixerCollapse() {
    if (!mixerSlidersBody) return;
    const isHidden = mixerSlidersBody.classList.contains('hidden');
    if (isHidden) {
      mixerSlidersBody.classList.remove('hidden');
      if (mixerToggleIcon) mixerToggleIcon.style.transform = 'rotate(0deg)';
    } else {
      mixerSlidersBody.classList.add('hidden');
      if (mixerToggleIcon) mixerToggleIcon.style.transform = 'rotate(180deg)';
    }
  }

  if (mixerToggleBtn) {
    mixerToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMixerCollapse();
    });
  }

  if (mixerTitleBar) {
    mixerTitleBar.addEventListener('click', () => {
      if (window.innerWidth < 640) {
        toggleMixerCollapse();
      }
    });
  }

  // --- ZEN / SANCTUARY MODE ---
  function setZenMode(active) {
    isZenMode = active;
    if (isZenMode) {
      if (centerContainer) centerContainer.classList.add('zen-active');
      if (audioMixerDock) audioMixerDock.classList.add('zen-active');
      zenNotice.classList.remove('hidden');
      setTimeout(() => zenNotice.classList.remove('opacity-0'), 50);
    } else {
      if (centerContainer) centerContainer.classList.remove('zen-active');
      if (audioMixerDock) audioMixerDock.classList.remove('zen-active');
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
        timer.pause();
        showToast('Timer paused');
      } else {
        timer.start();
        showToast('Timer started');
      }
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      if (timer.isRunning) {
        timer.pause();
        showToast('Timer paused');
      }
    } else if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      setZenMode(!isZenMode);
    } else if (e.key === 'r' || e.key === 'R') {
      timer.reset();
      showToast('Timer reset');
      saveCurrentState();
    } else if (e.key === 's' || e.key === 'S') {
      timer.skip();
      showToast('Session skipped');
      saveCurrentState();
    } else if (e.key === 'm' || e.key === 'M') {
      audioEngine.init();
      masterMuteBtn.click();
    } else if (e.key === 'Escape') {
      if (customColorPopover && !customColorPopover.classList.contains('hidden')) {
        toggleColorPopover(false);
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

  // --- RESTORE SAVED SETTINGS ON PAGE LOAD ---
  // 1. Restore Daily Focus Count & Completed Sessions
  timer.setTodayFocusSessions(appState.dailyFocus.count);
  timer.setCompletedFocusSessions(appState.settings.completedSessions);

  // 2. Restore Timer Mode (focus, shortBreak, longBreak)
  timer.setMode(appState.settings.timerMode);

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

  // Trigger initial tick & state render
  timer.notifyTick();
  timer.notifyStateChange();

  // Active date rollover watcher: updates display automatically when midnight passes even if page is idle
  setInterval(checkDateRollover, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkDateRollover();
  });
  window.addEventListener('focus', checkDateRollover);

  console.log("The Algorithmic Ambient Room initialized with restored preferences.");
});
