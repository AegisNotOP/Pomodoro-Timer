/**
 * The Algorithmic Ambient Room - Procedural Web Audio Engine
 * Generates 100% client-side synthesized Rain, White/Brownian Noise,
 * Lo-fi Jazz Chords & Beat Sequencer, and Meditation Bowl Chimes.
 */

class AmbientAudioEngine {
  constructor(canvasEngine = null) {
    this.canvasEngine = canvasEngine;
    this.ctx = null;
    this.isInitialized = false;
    this.isMuted = false;

    // Master Volume
    this.masterGain = null;
    this.masterVolume = 0.85;

    // Channels
    this.rainVolume = 0;
    this.noiseVolume = 0;
    this.lofiVolume = 0;

    // Nodes & States
    this.rainGain = null;
    this.rainDropletTimer = null;

    this.noiseGain = null;
    this.noiseLfo = null;

    this.lofiGain = null;
    this.vinylGain = null;
    this.lofiBpm = 72;
    this.lofiInterval = null;
    this.lofiStep = 0;
    this.lofiChordIndex = 0;

    // Lo-Fi Jazz Chord Progressions (Frequencies in Hz)
    this.chordProgressions = [
      // Progression 1: Dm9 -> G13 -> Cmaj9 -> A7alt
      [
        [146.83, 220.00, 261.63, 329.63, 392.00], // Dm9: D3, A3, C4, E4, G4
        [196.00, 246.94, 293.66, 329.63, 440.00], // G13: G3, B3, D4, E4, A4
        [130.81, 196.00, 246.94, 329.63, 392.00], // Cmaj9: C3, G3, B3, E4, G4
        [220.00, 277.18, 329.63, 392.00, 493.88]  // A7alt: A3, C#4, E4, G4, B4
      ],
      // Progression 2: Fmaj9 -> Em7 -> Dm9 -> Gsus4
      [
        [174.61, 261.63, 329.63, 392.00, 523.25], // Fmaj9: F3, C4, E4, G4, C5
        [164.81, 246.94, 293.66, 392.00, 493.88], // Em7: E3, B3, D4, G4, B4
        [146.83, 220.00, 261.63, 329.63, 440.00], // Dm9: D3, A3, C4, E4, A4
        [196.00, 261.63, 293.66, 392.00, 440.00]  // Gsus: G3, C4, D4, G4, A4
      ]
    ];
    this.activeProgression = 0;
  }

  // Safe lazy initialization on first user interaction
  init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Setup Sub-systems
      this.setupRainEngine();
      this.setupNoiseEngine();
      this.setupLofiEngine();

      // Apply initial/saved volume levels directly to the gain nodes
      this.applySavedVolumes();

      // Always explicitly resume AudioContext on user interaction
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.isInitialized = true;
      console.log("Ambient Audio Engine successfully initialized.");
    } catch (e) {
      console.error("Failed to initialize AudioContext:", e);
    }
  }

  // Ensures gain nodes reflect current restored volume settings
  applySavedVolumes() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.rainGain) {
      this.rainGain.gain.setValueAtTime(this.rainVolume * 0.9, now);
    }
    if (this.noiseGain) {
      this.noiseGain.gain.setValueAtTime(this.noiseVolume * 0.8, now);
    }
    if (this.lofiGain) {
      this.lofiGain.gain.setValueAtTime(this.lofiVolume * 0.75, now);
    }
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, now);
    }
  }

  // --- NOISE GENERATOR HELPERS ---
  createPinkNoiseBuffer(seconds = 5) {
    const bufferSize = this.ctx.sampleRate * seconds;
    const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }
    return buffer;
  }

  createBrownianNoiseBuffer(seconds = 5) {
    const bufferSize = this.ctx.sampleRate * seconds;
    const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // Gain boost for deep warmth
      }
    }
    return buffer;
  }

  // --- 1. RAIN SYNTHESIS ENGINE ---
  setupRainEngine() {
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(this.rainVolume * 0.9, this.ctx.currentTime);
    this.rainGain.connect(this.masterGain);

    // Continuous Rainfall Bed (Filtered Pink Noise)
    const rainBuffer = this.createPinkNoiseBuffer(6);
    const rainSource = this.ctx.createBufferSource();
    rainSource.buffer = rainBuffer;
    rainSource.loop = true;

    const rainBandpass = this.ctx.createBiquadFilter();
    rainBandpass.type = 'bandpass';
    rainBandpass.frequency.setValueAtTime(1100, this.ctx.currentTime);
    rainBandpass.Q.setValueAtTime(0.8, this.ctx.currentTime);

    const rainLowpass = this.ctx.createBiquadFilter();
    rainLowpass.type = 'lowpass';
    rainLowpass.frequency.setValueAtTime(3200, this.ctx.currentTime);

    rainSource.connect(rainBandpass);
    rainBandpass.connect(rainLowpass);
    rainLowpass.connect(this.rainGain);
    rainSource.start();

    // Start droplet loop
    this.scheduleRainDroplets();
  }

  scheduleRainDroplets() {
    if (this.rainDropletTimer) clearTimeout(this.rainDropletTimer);

    const nextDelay = Math.random() * 240 + 80; // Rapid sporadic droplets
    this.rainDropletTimer = setTimeout(() => {
      if (this.isInitialized && this.rainVolume > 0.02 && !this.isMuted) {
        this.playWaterDroplet();
      }
      this.scheduleRainDroplets();
    }, nextDelay);
  }

  playWaterDroplet() {
    if (!this.ctx || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const dropGain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    const baseFreq = 900 + Math.random() * 800; // 900Hz to 1700Hz
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.45, now + 0.06);

    const dropletVol = (Math.random() * 0.12 + 0.03) * this.rainVolume;
    dropGain.gain.setValueAtTime(0, now);
    dropGain.gain.linearRampToValueAtTime(dropletVol, now + 0.005);
    dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    if (panner) {
      panner.pan.setValueAtTime(Math.random() * 1.6 - 0.8, now);
      osc.connect(dropGain);
      dropGain.connect(panner);
      panner.connect(this.rainGain);
    } else {
      osc.connect(dropGain);
      dropGain.connect(this.rainGain);
    }

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // --- 2. WHITE / BROWNIAN NOISE ENGINE (OCEAN & WIND AMBIENCE) ---
  setupNoiseEngine() {
    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.setValueAtTime(this.noiseVolume * 0.8, this.ctx.currentTime);
    this.noiseGain.connect(this.masterGain);

    const brownBuffer = this.createBrownianNoiseBuffer(6);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = brownBuffer;
    noiseSource.loop = true;

    // Dynamic Filter modulated by slow wave LFO
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(350, this.ctx.currentTime);
    noiseFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    // LFO for slow ambient surf swell (0.07 Hz ~ 14-second wave cycle)
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.07, this.ctx.currentTime);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(220, this.ctx.currentTime); // modulate ±220 Hz

    lfo.connect(lfoGain);
    lfoGain.connect(noiseFilter.frequency);
    lfo.start();

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(this.noiseGain);
    noiseSource.start();
  }

  // --- 3. PROCEDURAL LO-FI JAZZ & BEAT ENGINE ---
  setupLofiEngine() {
    this.lofiGain = this.ctx.createGain();
    this.lofiGain.gain.setValueAtTime(this.lofiVolume * 0.75, this.ctx.currentTime);
    this.lofiGain.connect(this.masterGain);

    // Vinyl crackle noise layer
    this.setupVinylCrackle();

    // Start 16-step Lo-fi Sequencer Clock
    this.startLofiSequencer();
  }

  setupVinylCrackle() {
    const vinylBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const data = vinylBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      if (Math.random() < 0.003) {
        data[i] = (Math.random() * 2 - 1) * 0.4;
      } else {
        data[i] = (Math.random() * 2 - 1) * 0.015;
      }
    }

    const vinylSource = this.ctx.createBufferSource();
    vinylSource.buffer = vinylBuffer;
    vinylSource.loop = true;

    const vinylFilter = this.ctx.createBiquadFilter();
    vinylFilter.type = 'highpass';
    vinylFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);

    this.vinylGain = this.ctx.createGain();
    this.vinylGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

    vinylSource.connect(vinylFilter);
    vinylFilter.connect(this.vinylGain);
    this.vinylGain.connect(this.lofiGain);
    vinylSource.start();
  }

  startLofiSequencer() {
    if (this.lofiInterval) clearInterval(this.lofiInterval);

    const stepDurationMs = ((60 / this.lofiBpm) / 4) * 1000; // 16th note in ms
    this.lofiInterval = setInterval(() => {
      if (this.isInitialized && this.lofiVolume > 0.01 && !this.isMuted && this.ctx.state === 'running') {
        this.triggerLofiStep(this.lofiStep);
      }

      this.lofiStep = (this.lofiStep + 1) % 16;
    }, stepDurationMs);
  }

  triggerLofiStep(step) {
    const now = this.ctx.currentTime;

    // Chord Trigger (Played on Steps 0 and 8 with laid-back swing)
    if (step === 0 || step === 8) {
      const progression = this.chordProgressions[this.activeProgression];
      const chord = progression[this.lofiChordIndex];
      this.playRhodesChord(chord, now);

      if (step === 8) {
        this.lofiChordIndex = (this.lofiChordIndex + 1) % progression.length;
      }
    }

    // Drum Patterns (Lo-Fi Laid Back Boom-Bap)
    // Kick on 0, 6, 10
    if (step === 0 || step === 6 || step === 10) {
      this.playLofiKick(now, step === 0 ? 0.85 : 0.6);
      if (this.canvasEngine) {
        this.canvasEngine.triggerAudioBeat();
      }
    }

    // Snare / Rim on 4, 12
    if (step === 4 || step === 12) {
      this.playLofiSnare(now, 0.7);
    }

    // Closed Hi-hat on even steps + subtle swing velocity
    if (step % 2 === 0 || step === 7 || step === 15) {
      const vel = (step % 4 === 2) ? 0.45 : 0.28;
      this.playLofiHiHat(now, vel);
    }
  }

  // Synthesize Electric Rhodes Piano Chord
  playRhodesChord(frequencies, startTime) {
    frequencies.forEach((freq, idx) => {
      // Slight strum spread (5ms per note)
      const noteTime = startTime + idx * 0.008;

      // Primary Rhodes Oscillator (Warm Sine)
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, noteTime);

      // Overtone / Chorus Oscillator (Detuned Triangle for electric tine chime)
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2 + 0.3, noteTime);

      // Lowpass Filter for lo-fi tape warmth
      const voiceFilter = this.ctx.createBiquadFilter();
      voiceFilter.type = 'lowpass';
      voiceFilter.frequency.setValueAtTime(1300, noteTime);
      voiceFilter.frequency.exponentialRampToValueAtTime(700, noteTime + 1.8);

      // Amplitude Envelope
      const voiceGain = this.ctx.createGain();
      voiceGain.gain.setValueAtTime(0.0001, noteTime);
      voiceGain.gain.linearRampToValueAtTime(0.13, noteTime + 0.04);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 2.2);

      // Sub gain for tine overtone
      const tineGain = this.ctx.createGain();
      tineGain.gain.setValueAtTime(0.03, noteTime);

      osc1.connect(voiceGain);
      osc2.connect(tineGain);
      tineGain.connect(voiceGain);

      voiceGain.connect(voiceFilter);
      voiceFilter.connect(this.lofiGain);

      osc1.start(noteTime);
      osc2.start(noteTime);
      osc1.stop(noteTime + 2.3);
      osc2.stop(noteTime + 2.3);
    });
  }

  playLofiKick(time, velocity = 0.8) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);

    gain.gain.setValueAtTime(velocity * 0.55, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(gain);
    gain.connect(this.lofiGain);

    osc.start(time);
    osc.stop(time + 0.24);
  }

  playLofiSnare(time, velocity = 0.7) {
    // Noise body
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.18, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, time);
    filter.Q.setValueAtTime(1.2, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(velocity * 0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.lofiGain);

    noiseSource.start(time);
  }

  playLofiHiHat(time, velocity = 0.3) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(8400 + Math.random() * 400, time);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    gain.gain.setValueAtTime(velocity * 0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.lofiGain);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  // --- 4. TIBETAN MEDITATION BOWL / CHIME FOR TIMER COMPLETION ---
  playSingingBowl() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const partials = [
      { freq: 432, gain: 0.45, decay: 5.5 },  // Fundamental A (Verdi 432Hz)
      { freq: 864, gain: 0.22, decay: 4.8 },  // 2nd Harmonic
      { freq: 1296, gain: 0.12, decay: 3.5 }, // 3rd Harmonic
      { freq: 1728, gain: 0.06, decay: 2.8 }  // 4th Harmonic
    ];

    partials.forEach(p => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(p.gain, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + p.decay + 0.1);
    });

    if (this.canvasEngine) {
      this.canvasEngine.triggerAudioBeat();
    }
  }

  // --- VOLUME CONTROLS ---
  setRainVolume(val) {
    this.rainVolume = Math.max(0, Math.min(1, val));
    if (this.rainGain && this.ctx) {
      this.rainGain.gain.setTargetAtTime(this.rainVolume * 0.9, this.ctx.currentTime, 0.05);
    }
  }

  setNoiseVolume(val) {
    this.noiseVolume = Math.max(0, Math.min(1, val));
    if (this.noiseGain && this.ctx) {
      this.noiseGain.gain.setTargetAtTime(this.noiseVolume * 0.8, this.ctx.currentTime, 0.05);
    }
  }

  setLofiVolume(val) {
    this.lofiVolume = Math.max(0, Math.min(1, val));
    if (this.lofiGain && this.ctx) {
      this.lofiGain.gain.setTargetAtTime(this.lofiVolume * 0.75, this.ctx.currentTime, 0.05);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.isMuted ? 0 : this.masterVolume,
        this.ctx.currentTime,
        0.05
      );
    }
    return this.isMuted;
  }
}

window.AmbientAudioEngine = AmbientAudioEngine;
