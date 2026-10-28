/**
 * The Algorithmic Ambient Room - Pomodoro Focus Timer Engine
 * Handles 25-minute focus cycles, short/long breaks, circular SVG ring updates,
 * drift-proof delta timing, and completion events.
 */

class PomodoroTimer {
  constructor(audioEngine = null) {
    this.audioEngine = audioEngine;

    // Modes durations in seconds
    this.modes = {
      focus: 25 * 60,
      shortBreak: 5 * 60,
      longBreak: 15 * 60,
      custom: 45 * 60
    };

    this.currentMode = 'focus';
    this.totalDuration = this.modes.focus;
    this.timeLeft = this.totalDuration;
    this.isRunning = false;

    // Session Metrics
    this.completedFocusSessions = 0;
    this.todayFocusSessions = 0;
    this.totalFocusMinutes = 0;

    // Interval tracking with high-accuracy timestamp delta
    this.timerInterval = null;
    this.lastTimestamp = null;

    // Event Callbacks
    this.onTickCallback = null;
    this.onStateChangeCallback = null;
    this.onCompleteCallback = null;
  }

  setTodayFocusSessions(count) {
    this.todayFocusSessions = Math.max(0, parseInt(count, 10) || 0);
    this.notifyStateChange();
  }

  setCompletedFocusSessions(count) {
    this.completedFocusSessions = Math.max(0, parseInt(count, 10) || 0);
    this.notifyStateChange();
  }

  setMode(mode) {
    if (!this.modes[mode]) return;
    this.pause();
    this.currentMode = mode;
    this.totalDuration = this.modes[mode];
    this.timeLeft = this.totalDuration;
    this.notifyTick();
    this.notifyStateChange();
  }

  setCustomDuration(minutes) {
    const mins = Math.max(1, Math.min(720, Math.round(Number(minutes) || 45)));
    this.pause();
    this.modes.custom = mins * 60;
    if (this.currentMode === 'custom') {
      this.totalDuration = this.modes.custom;
      this.timeLeft = this.totalDuration;
      this.notifyTick();
      this.notifyStateChange();
    }
    return mins;
  }

  setTimeLeft(seconds) {
    this.timeLeft = Math.max(0, Math.min(this.totalDuration, Number(seconds) || 0));
    this.notifyTick();
    this.notifyStateChange();
  }

  toggle() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimestamp = Date.now();

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => this.tick(), 250);

    this.notifyStateChange();
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.notifyStateChange();
  }

  reset() {
    this.pause();
    this.timeLeft = this.totalDuration;
    this.notifyTick();
    this.notifyStateChange();
  }

  skip() {
    this.pause();
    // Skipping a focus session advances to short break without counting as completed.
    // Long breaks are only awarded upon naturally completing the 4th session of a cycle.
    // Skipping a custom session resets it to its configured duration without completing.
    if (this.currentMode === 'focus') {
      this.setMode('shortBreak');
    } else if (this.currentMode === 'custom') {
      this.reset();
    } else {
      this.setMode('focus');
    }
  }

  tick() {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;

    this.timeLeft = Math.max(0, this.timeLeft - elapsedSeconds);
    this.notifyTick();

    if (this.timeLeft <= 0) {
      this.handleComplete();
    }
  }

  handleComplete() {
    this.pause();
    const completedMode = this.currentMode;

    // Only naturally completed focus sessions count toward completed focus totals
    if (completedMode === 'focus') {
      this.completedFocusSessions++;
      this.todayFocusSessions++;
      this.totalFocusMinutes += Math.round(this.totalDuration / 60);
    }

    // Play synthesized harmonic bowl chime
    if (this.audioEngine) {
      this.audioEngine.playSingingBowl();
    }

    if (this.onCompleteCallback) {
      this.onCompleteCallback(completedMode, this.completedFocusSessions, this.todayFocusSessions);
    }

    // Auto-advance mode progression
    if (completedMode === 'focus') {
      if (this.completedFocusSessions % 4 === 0) {
        this.setMode('longBreak');
      } else {
        this.setMode('shortBreak');
      }
    } else if (completedMode === 'custom') {
      // Keep in custom mode ready for next cycle
      this.timeLeft = this.totalDuration;
      this.notifyTick();
      this.notifyStateChange();
    } else {
      this.setMode('focus');
    }
  }

  getFormattedTime() {
    const totalSec = Math.max(0, Math.floor(this.timeLeft));
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  getProgress() {
    if (this.totalDuration === 0) return 0;
    return (this.totalDuration - this.timeLeft) / this.totalDuration;
  }

  notifyTick() {
    if (this.onTickCallback) {
      this.onTickCallback({
        formattedTime: this.getFormattedTime(),
        timeLeft: this.timeLeft,
        totalDuration: this.totalDuration,
        progress: this.getProgress(),
        currentMode: this.currentMode
      });
    }
  }

  notifyStateChange() {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({
        isRunning: this.isRunning,
        currentMode: this.currentMode,
        completedSessions: this.completedFocusSessions,
        todaySessions: this.todayFocusSessions,
        timeLeft: this.timeLeft,
        totalDuration: this.totalDuration,
        formattedTime: this.getFormattedTime()
      });
    }
  }
}

window.PomodoroTimer = PomodoroTimer;
