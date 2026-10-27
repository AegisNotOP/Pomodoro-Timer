/**
 * The Algorithmic Ambient Room - Main Application Controller
 * Orchestrates canvas visuals, procedural Web Audio mixing,
 * Pomodoro timer interactions, UI state, and keyboard shortcuts.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Visual Canvas Engine
  const canvasEngine = new AmbientCanvasEngine('ambient-canvas');

  // 2. Initialize Procedural Audio Engine
  const audioEngine = new AmbientAudioEngine(canvasEngine);

  // 3. Initialize Pomodoro Timer Engine
  const timer = new PomodoroTimer(audioEngine);

  // UI Element References
  const timeDisplay = document.getElementById('time-display');
  const timerRing = document.getElementById('timer-progress-ring');
  const timerPlayBtn = document.getElementById('timer-play-btn');
  const timerPlayIcon = document.getElementById('timer-play-icon');
  const timerPauseIcon = document.getElementById('timer-pause-icon');
  const timerResetBtn = document.getElementById('timer-reset-btn');
  const timerSkipBtn = document.getElementById('timer-skip-btn');
  const modeTabs = document.querySelectorAll('.mode-tab');
  const sessionCounter = document.getElementById('session-counter');
  const modeIndicator = document.getElementById('mode-indicator');

  // Audio Slider Elements
  const rainSlider = document.getElementById('slider-rain');
  const rainVal = document.getElementById('val-rain');
  const noiseSlider = document.getElementById('slider-noise');
  const noiseVal = document.getElementById('val-noise');
  const lofiSlider = document.getElementById('slider-lofi');
  const lofiVal = document.getElementById('val-lofi');
  const masterMuteBtn = document.getElementById('master-mute-btn');
  const soundStatusDot = document.getElementById('sound-status-dot');

  // Dashboard & Zen Mode
  const dashboard = document.getElementById('sanctuary-dashboard');
  const zenToggleBtn = document.getElementById('zen-toggle-btn');
  const zenNotice = document.getElementById('zen-notice');
  let isZenMode = false;

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
    document.title = `${state.formattedTime} • The Algorithmic Ambient Room`;
  };

  timer.onStateChangeCallback = (state) => {
    if (state.isRunning) {
      timerPlayIcon.classList.add('hidden');
      timerPauseIcon.classList.remove('hidden');
      timerPlayBtn.classList.add('ring-2', 'ring-amber-400/50', 'bg-white/20');
      timerPlayBtn.classList.remove('bg-white/10');
    } else {
      timerPlayIcon.classList.remove('hidden');
      timerPauseIcon.classList.add('hidden');
      timerPlayBtn.classList.remove('ring-2', 'ring-amber-400/50', 'bg-white/20');
      timerPlayBtn.classList.add('bg-white/10');
    }

    // Update active tab style
    modeTabs.forEach(tab => {
      if (tab.dataset.mode === state.currentMode) {
        tab.classList.add('bg-white/20', 'text-white', 'shadow-inner', 'border-white/20');
        tab.classList.remove('text-slate-400', 'border-transparent');
      } else {
        tab.classList.remove('bg-white/20', 'text-white', 'shadow-inner', 'border-white/20');
        tab.classList.add('text-slate-400', 'border-transparent');
      }
    });

    // Update Session Badge
    const cycleNum = (state.completedSessions % 4) + 1;
    sessionCounter.textContent = `Cycle ${cycleNum} / 4`;
    
    const modeNames = {
      focus: 'Deep Focus',
      shortBreak: 'Short Chill',
      longBreak: 'Long Recharge'
    };
    modeIndicator.textContent = modeNames[state.currentMode] || 'Deep Focus';
  };

  timer.onCompleteCallback = (completedMode, totalSessions) => {
    if (completedMode === 'focus') {
      showToast(`✨ Focus session complete! Completed: ${totalSessions} cycles. Time for a peaceful pause.`);
    } else {
      showToast(`🧘 Break finished. Ready for your next focus session?`);
    }
  };

  // Timer Controls
  timerPlayBtn.addEventListener('click', () => {
    audioEngine.init();
    timer.toggle();
  });

  timerResetBtn.addEventListener('click', () => {
    timer.reset();
    showToast('Timer reset');
  });

  timerSkipBtn.addEventListener('click', () => {
    timer.skip();
    showToast('Session skipped');
  });

  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      audioEngine.init();
      const mode = tab.dataset.mode;
      timer.setMode(mode);
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
      showToast(`🎧 Preset loaded: ${btn.dataset.name}`);
    });
  });

  // --- PALETTE CONTROLS ---
  const paletteBtns = document.querySelectorAll('.palette-pill');
  const paletteIndicator = document.getElementById('palette-indicator');

  paletteBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      if (idx === -1) {
        canvasEngine.autoShift = true;
        showToast('🌅 Auto Sunset Palette Flow enabled');
      } else {
        canvasEngine.autoShift = false;
        canvasEngine.setPaletteIndex(idx);
        showToast(`🎨 Palette: ${canvasEngine.palettes[idx].name}`);
      }

      paletteBtns.forEach(b => b.classList.remove('ring-2', 'ring-white/60', 'bg-white/20'));
      btn.classList.add('ring-2', 'ring-white/60', 'bg-white/20');
      paletteIndicator.textContent = idx === -1 ? 'Auto Sunset Drift' : canvasEngine.palettes[idx].name;
    });
  });

  // --- ZEN / SANCTUARY MODE ---
  function setZenMode(active) {
    isZenMode = active;
    if (isZenMode) {
      dashboard.classList.add('zen-active');
      zenNotice.classList.remove('hidden');
      setTimeout(() => zenNotice.classList.remove('opacity-0'), 50);
    } else {
      dashboard.classList.remove('zen-active');
      zenNotice.classList.add('opacity-0');
      setTimeout(() => zenNotice.classList.add('hidden'), 500);
    }
  }

  zenToggleBtn.addEventListener('click', () => {
    setZenMode(!isZenMode);
  });

  // Click on background in Zen mode restores dashboard
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
    // Prevent shortcuts if typing in any potential input
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;

    if (e.code === 'Space') {
      e.preventDefault();
      audioEngine.init();
      timer.toggle();
    } else if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      setZenMode(!isZenMode);
    } else if (e.key === 'r' || e.key === 'R') {
      timer.reset();
      showToast('Timer Reset');
    } else if (e.key === 's' || e.key === 'S') {
      timer.skip();
      showToast('Session Skipped');
    } else if (e.key === 'm' || e.key === 'M') {
      audioEngine.init();
      masterMuteBtn.click();
    } else if (e.key === 'Escape' && isZenMode) {
      setZenMode(false);
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

  // Initialize initial slider track fills
  updateSliderFill(rainSlider, 0, '#38bdf8');
  updateSliderFill(noiseSlider, 0, '#a855f7');
  updateSliderFill(lofiSlider, 0, '#f97316');

  // Trigger initial tick state
  timer.notifyTick();
  timer.notifyStateChange();

  console.log("The Algorithmic Ambient Room initialized successfully.");
});
