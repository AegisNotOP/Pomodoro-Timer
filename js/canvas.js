/**
 * The Algorithmic Ambient Room - Generative Canvas Art Engine
 * Renders spatial perspective grids, circular seating geometries,
 * ambient dust motes, and ultra-smooth continuous color palette transitions.
 */

class AmbientCanvasEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Color Palettes with numeric RGBA arrays for seamless continuous blending
    this.palettes = [
      {
        name: "Deep Cosmic Blue",
        bgTop: [4, 8, 20],
        bgBottom: [10, 24, 48],
        bgGlow: [20, 60, 110, 0.45],
        grid: [56, 189, 248, 0.12],
        gridAccent: [125, 211, 252, 0.40],
        rings: [56, 189, 248, 0.22],
        particles: [186, 230, 253, 0.60],
        accentLight: [56, 189, 248, 0.80],
        glowColor: [14, 165, 233, 0.15]
      },
      {
        name: "Twilight Amethyst",
        bgTop: [12, 8, 26],
        bgBottom: [28, 16, 52],
        bgGlow: [76, 29, 115, 0.45],
        grid: [192, 132, 252, 0.12],
        gridAccent: [216, 180, 254, 0.40],
        rings: [192, 132, 252, 0.22],
        particles: [233, 213, 255, 0.60],
        accentLight: [192, 132, 252, 0.80],
        glowColor: [168, 85, 247, 0.15]
      },
      {
        name: "Dusk Rose",
        bgTop: [22, 10, 24],
        bgBottom: [48, 18, 44],
        bgGlow: [120, 36, 80, 0.45],
        grid: [244, 114, 182, 0.12],
        gridAccent: [249, 168, 212, 0.40],
        rings: [244, 114, 182, 0.22],
        particles: [252, 231, 243, 0.60],
        accentLight: [244, 114, 182, 0.80],
        glowColor: [236, 72, 153, 0.15]
      },
      {
        name: "Warm Sunset Orange",
        bgTop: [24, 9, 5],
        bgBottom: [62, 22, 10],
        bgGlow: [160, 55, 18, 0.45],
        grid: [251, 146, 60, 0.14],
        gridAccent: [253, 186, 116, 0.45],
        rings: [251, 146, 60, 0.25],
        particles: [254, 215, 170, 0.65],
        accentLight: [251, 146, 60, 0.85],
        glowColor: [249, 115, 22, 0.18]
      }
    ];

    // Transition & Mode State
    this.paletteMode = 'auto'; // 'auto', 'preset', or 'custom'
    this.presetIndex = 0;
    this.customColorHex = '#10b981';
    this.customPalette = this.createCustomPalette(this.customColorHex);

    // Continuous floating cycle counter for autoShift
    this.autoProgress = 0;
    this.shiftSpeed = 0.00008; // Smooth, meditative speed

    // Live interpolated state
    this.currentState = this.clonePalette(this.palettes[0]);

    // Time & Motion
    this.time = 0;
    this.audioPulse = 0;

    // Scenic Background Mode: 'ocean', 'clouds', 'forest', or 'sanctuary'
    this.currentScene = 'ocean';

    // Reduced Motion Preference Detection
    this.isReducedMotion = false;
    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.isReducedMotion = media.matches;
      if (media.addEventListener) {
        media.addEventListener('change', (e) => {
          this.isReducedMotion = e.matches;
        });
      }
    }

    // Spatial Layout Objects
    this.seatingNodes = [];
    this.particles = [];

    // Scenic Background Objects
    this.stars = [];
    this.cloudBanks = [];
    this.forestPines = [];
    this.forestGodRays = [];
    this.fireflies = [];
    this.oceanMotes = [];
    this.sunsetMotes = [];
    
    this.init();
  }

  get autoShift() {
    return this.paletteMode === 'auto';
  }

  set autoShift(val) {
    if (val) {
      this.paletteMode = 'auto';
    } else if (this.paletteMode === 'auto') {
      this.paletteMode = 'preset';
    }
  }

  get paletteIndex() {
    return this.presetIndex;
  }

  set paletteIndex(val) {
    this.setPaletteIndex(val);
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.createSeatingNodes();
    this.createParticles();
    this.createScenicElements();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(this.dpr, this.dpr);
    this.createSeatingNodes();
    this.createScenicElements();
  }

  createScenicElements() {
    this.createStars();
    this.createCloudBanks();
    this.createForest();
    this.createFireflies();
    this.createOceanMotes();
    this.createSunsetMotes();
  }

  createStars() {
    this.stars = [];
    const count = Math.floor(Math.min(this.width * 0.05, 55));
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * (this.height * 0.55),
        radius: Math.random() * 1.4 + 0.6,
        baseAlpha: Math.random() * 0.5 + 0.2,
        twinkleSpeed: Math.random() * 2 + 0.8,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  createCloudBanks() {
    this.cloudBanks = [];
    const layers = [
      { yFrac: 0.18, speed: 0.035, baseAlpha: 0.18, scale: 0.75, count: 5 },
      { yFrac: 0.32, speed: 0.055, baseAlpha: 0.24, scale: 0.95, count: 6 },
      { yFrac: 0.46, speed: 0.08, baseAlpha: 0.32, scale: 1.15, count: 5 },
      { yFrac: 0.60, speed: 0.11, baseAlpha: 0.38, scale: 1.35, count: 4 }
    ];

    layers.forEach((layer, layerIdx) => {
      const clouds = [];
      const spacing = (this.width + 600) / layer.count;
      for (let i = 0; i < layer.count; i++) {
        const puffCount = 5 + Math.floor(Math.random() * 4);
        const puffs = [];
        const baseR = (35 + Math.random() * 25) * layer.scale;

        for (let p = 0; p < puffCount; p++) {
          puffs.push({
            ox: (p - puffCount / 2) * (baseR * 0.55) + (Math.random() - 0.5) * 15,
            oy: (Math.random() - 0.5) * (baseR * 0.35),
            r: baseR * (0.65 + Math.random() * 0.5)
          });
        }

        clouds.push({
          x: i * spacing + (Math.random() - 0.5) * 80,
          y: this.height * layer.yFrac + (Math.random() - 0.5) * 25,
          speed: layer.speed * (0.85 + Math.random() * 0.3),
          alpha: layer.baseAlpha,
          layerIndex: layerIdx,
          puffs
        });
      }
      this.cloudBanks.push(clouds);
    });
  }

  createForest() {
    this.forestPines = [];
    const w = this.width;
    const h = this.height;

    const midCount = Math.floor(Math.max(22, w / 35));
    for (let i = 0; i < midCount; i++) {
      const x = (i / midCount) * w + (Math.random() - 0.5) * 15;
      const height = (70 + Math.random() * 60) * Math.min(1.2, Math.max(0.7, h / 700));
      const width = height * (0.4 + Math.random() * 0.15);
      this.forestPines.push({
        layer: 'mid',
        x,
        baseY: h * 0.68 + (Math.sin(i * 0.5) * 15),
        height,
        width,
        tiers: 4 + Math.floor(Math.random() * 2),
        color: '#03140e'
      });
    }

    const foreCount = Math.floor(Math.max(15, w / 60));
    for (let i = 0; i < foreCount; i++) {
      const x = (i / foreCount) * w + (Math.random() - 0.5) * 20;
      const height = (110 + Math.random() * 90) * Math.min(1.3, Math.max(0.75, h / 700));
      const width = height * (0.42 + Math.random() * 0.16);
      this.forestPines.push({
        layer: 'fore',
        x,
        baseY: h * 0.8 + (Math.sin(i * 0.4) * 20),
        height,
        width,
        tiers: 5 + Math.floor(Math.random() * 2),
        color: '#020b07'
      });
    }

    this.forestPines.sort((a, b) => a.baseY - b.baseY);

    this.forestGodRays = [
      { xFrac: 0.25, width: 70, angle: 0.42, alpha: 0.04, phase: 0 },
      { xFrac: 0.45, width: 100, angle: 0.45, alpha: 0.05, phase: 1.8 },
      { xFrac: 0.72, width: 85, angle: 0.40, alpha: 0.045, phase: 3.5 },
      { xFrac: 0.88, width: 60, angle: 0.38, alpha: 0.035, phase: 5.0 }
    ];
  }

  createFireflies() {
    this.fireflies = [];
    const count = 32;
    for (let i = 0; i < count; i++) {
      this.fireflies.push({
        baseX: Math.random() * this.width,
        baseY: this.height * (0.35 + Math.random() * 0.55),
        ampX: 20 + Math.random() * 35,
        ampY: 15 + Math.random() * 25,
        freqX: 0.5 + Math.random() * 0.5,
        freqY: 0.6 + Math.random() * 0.6,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        pulseSpeed: 1.5 + Math.random() * 2,
        pulsePhase: Math.random() * Math.PI * 2,
        radius: 1.5 + Math.random() * 1.5,
        isGolden: Math.random() > 0.45
      });
    }
  }

  createOceanMotes() {
    this.oceanMotes = [];
    const count = 28;
    for (let i = 0; i < count; i++) {
      this.oceanMotes.push({
        x: Math.random() * this.width,
        y: this.height * 0.48 + Math.random() * (this.height * 0.52),
        vy: -0.2 - Math.random() * 0.25,
        vx: (Math.random() - 0.5) * 0.2,
        radius: Math.random() * 1.8 + 0.6,
        baseAlpha: Math.random() * 0.4 + 0.15,
        sineFreq: Math.random() * 0.02 + 0.005,
        sineOffset: Math.random() * Math.PI * 2
      });
    }
  }

  createSunsetMotes() {
    this.sunsetMotes = [];
    const count = 25;
    for (let i = 0; i < count; i++) {
      this.sunsetMotes.push({
        x: Math.random() * this.width,
        y: this.height * 0.3 + Math.random() * (this.height * 0.65),
        vy: -0.1 - Math.random() * 0.2,
        vx: 0.1 + Math.random() * 0.25,
        radius: Math.random() * 2 + 0.7,
        baseAlpha: Math.random() * 0.4 + 0.15,
        sineFreq: Math.random() * 0.02 + 0.005,
        sineOffset: Math.random() * Math.PI * 2
      });
    }
  }

  createSeatingNodes() {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const minDim = Math.min(this.width, this.height);

    this.seatingNodes = [
      {
        x: centerX,
        y: centerY + minDim * 0.05,
        radius: minDim * 0.32,
        subRings: [0.3, 0.6, 0.85, 1.0],
        satellites: 8,
        rotationSpeed: 0.0008,
        pulseSpeed: 0.0012,
        phase: 0
      },
      {
        x: centerX - minDim * 0.42,
        y: centerY - minDim * 0.15,
        radius: minDim * 0.18,
        subRings: [0.4, 0.8, 1.0],
        satellites: 4,
        rotationSpeed: -0.0012,
        pulseSpeed: 0.0016,
        phase: 1.5
      },
      {
        x: centerX + minDim * 0.42,
        y: centerY - minDim * 0.12,
        radius: minDim * 0.2,
        subRings: [0.35, 0.7, 1.0],
        satellites: 5,
        rotationSpeed: 0.001,
        pulseSpeed: 0.0014,
        phase: 3.0
      },
      {
        x: centerX - minDim * 0.28,
        y: centerY + minDim * 0.38,
        radius: minDim * 0.14,
        subRings: [0.5, 1.0],
        satellites: 3,
        rotationSpeed: -0.0015,
        pulseSpeed: 0.002,
        phase: 4.5
      },
      {
        x: centerX + minDim * 0.3,
        y: centerY + minDim * 0.36,
        radius: minDim * 0.15,
        subRings: [0.5, 1.0],
        satellites: 3,
        rotationSpeed: 0.0014,
        pulseSpeed: 0.0018,
        phase: 2.2
      }
    ];
  }

  createParticles() {
    this.particles = [];
    const count = Math.floor(Math.min(this.width * 0.06, 90));
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 2 + 0.8,
        baseAlpha: Math.random() * 0.5 + 0.2,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -Math.random() * 0.3 - 0.1,
        sineFreq: Math.random() * 0.02 + 0.005,
        sineOffset: Math.random() * Math.PI * 2
      });
    }
  }

  // --- COLOR MATH & CONVERSION HELPERS ---
  clonePalette(p) {
    return {
      name: p.name,
      bgTop: [...p.bgTop],
      bgBottom: [...p.bgBottom],
      bgGlow: [...p.bgGlow],
      grid: [...p.grid],
      gridAccent: [...p.gridAccent],
      rings: [...p.rings],
      particles: [...p.particles],
      accentLight: [...p.accentLight],
      glowColor: [...p.glowColor]
    };
  }

  lerpArray(a1, a2, factor) {
    const res = [];
    for (let i = 0; i < a1.length; i++) {
      res[i] = a1[i] + (a2[i] - a1[i]) * factor;
    }
    return res;
  }

  interpolatePalettes(p1, p2, t) {
    return {
      name: t < 0.5 ? p1.name : p2.name,
      bgTop: this.lerpArray(p1.bgTop, p2.bgTop, t),
      bgBottom: this.lerpArray(p1.bgBottom, p2.bgBottom, t),
      bgGlow: this.lerpArray(p1.bgGlow, p2.bgGlow, t),
      grid: this.lerpArray(p1.grid, p2.grid, t),
      gridAccent: this.lerpArray(p1.gridAccent, p2.gridAccent, t),
      rings: this.lerpArray(p1.rings, p2.rings, t),
      particles: this.lerpArray(p1.particles, p2.particles, t),
      accentLight: this.lerpArray(p1.accentLight, p2.accentLight, t),
      glowColor: this.lerpArray(p1.glowColor, p2.glowColor, t)
    };
  }

  static hexToHsl(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return [Math.round(h), s, l];
  }

  static hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  createCustomPalette(hexOrHsl) {
    let h, s, l;
    if (typeof hexOrHsl === 'string') {
      [h, s, l] = AmbientCanvasEngine.hexToHsl(hexOrHsl);
    } else {
      [h, s, l] = hexOrHsl;
    }

    const baseSat = Math.max(0.35, Math.min(0.95, s));
    
    // Generate dark atmospheric values ensuring contrast and readability
    const bgTopRgb = AmbientCanvasEngine.hslToRgb(h, baseSat * 0.7, 0.05);
    const bgBottomRgb = AmbientCanvasEngine.hslToRgb(h, baseSat * 0.85, 0.12);
    const bgGlowRgb = AmbientCanvasEngine.hslToRgb(h, baseSat * 0.9, 0.30);
    const accentRgb = AmbientCanvasEngine.hslToRgb(h, Math.min(1, baseSat * 1.1), 0.72);
    const accentLightRgb = AmbientCanvasEngine.hslToRgb(h, baseSat * 0.85, 0.86);

    return {
      name: "Custom Atmosphere",
      bgTop: bgTopRgb,
      bgBottom: bgBottomRgb,
      bgGlow: [...bgGlowRgb, 0.45],
      grid: [...accentRgb, 0.14],
      gridAccent: [...accentLightRgb, 0.42],
      rings: [...accentRgb, 0.25],
      particles: [...accentLightRgb, 0.65],
      accentLight: [...accentLightRgb, 0.85],
      glowColor: [...bgGlowRgb, 0.18]
    };
  }

  // --- PALETTE SELECTION API ---
  setAutoMode() {
    this.paletteMode = 'auto';
  }

  setPreset(index) {
    this.paletteMode = 'preset';
    this.presetIndex = Math.max(0, Math.min(this.palettes.length - 1, index));
  }

  setPaletteIndex(index) {
    this.setPreset(index);
  }

  setCustomColor(hex) {
    this.paletteMode = 'custom';
    this.customColorHex = hex;
    this.customPalette = this.createCustomPalette(hex);
  }

  setCustomHsl(h, s, l) {
    this.paletteMode = 'custom';
    this.customPalette = this.createCustomPalette([h, s, l]);
  }

  // Convert numeric RGBA arrays into CSS strings for canvas rendering
  getRenderablePalette() {
    const s = this.currentState;
    const toRgb = (arr) => `rgb(${Math.round(arr[0])}, ${Math.round(arr[1])}, ${Math.round(arr[2])})`;
    const toRgba = (arr) => `rgba(${Math.round(arr[0])}, ${Math.round(arr[1])}, ${Math.round(arr[2])}, ${Math.max(0, Math.min(1, arr[3])).toFixed(3)})`;

    return {
      name: s.name,
      bgTop: toRgb(s.bgTop),
      bgBottom: toRgb(s.bgBottom),
      bgGlow: toRgba(s.bgGlow),
      grid: toRgba(s.grid),
      gridAccent: toRgba(s.gridAccent),
      rings: toRgba(s.rings),
      particles: toRgba(s.particles),
      accentLight: toRgba(s.accentLight),
      glowColor: toRgba(s.glowColor),
      rawRings: s.rings,
      rawParticles: s.particles
    };
  }

  setScene(scene) {
    const valid = ['ocean', 'clouds', 'forest', 'sanctuary'];
    if (valid.includes(scene)) {
      this.currentScene = scene;
    }
  }

  update(dt) {
    const effectiveDt = this.isReducedMotion ? 0 : dt;
    this.time += effectiveDt * 0.001;

    // Determine target palette state
    let targetState;
    if (this.paletteMode === 'auto') {
      this.autoProgress += effectiveDt * this.shiftSpeed;
      const count = this.palettes.length;
      const p = ((this.autoProgress % count) + count) % count;
      const i1 = Math.floor(p);
      const i2 = (i1 + 1) % count;
      const factor = p - i1;

      targetState = this.interpolatePalettes(this.palettes[i1], this.palettes[i2], factor);
      targetState.name = "Auto Sunset Drift";
    } else if (this.paletteMode === 'preset') {
      targetState = this.palettes[this.presetIndex % this.palettes.length];
    } else if (this.paletteMode === 'custom') {
      targetState = this.customPalette;
    }

    // Smooth exponential blend from current live state to target state
    const blendFactor = Math.min(1, 1 - Math.exp(-dt * 0.004));
    this.currentState = this.interpolatePalettes(this.currentState, targetState, blendFactor);
    this.currentState.name = targetState.name;

    // Audio pulse decay
    this.audioPulse *= 0.94;

    // Update Sanctuary Particles
    for (const p of this.particles) {
      if (!this.isReducedMotion) {
        p.y += p.vy;
        p.x += p.vx + Math.sin(this.time * p.sineFreq + p.sineOffset) * 0.2;
        if (p.y < -10) {
          p.y = this.height + 10;
          p.x = Math.random() * this.width;
        }
        if (p.x < -10) p.x = this.width + 10;
        if (p.x > this.width + 10) p.x = -10;
      }
    }

    // Update Ocean Motes
    for (const p of this.oceanMotes) {
      if (!this.isReducedMotion) {
        p.y += p.vy;
        p.x += p.vx + Math.sin(this.time * p.sineFreq + p.sineOffset) * 0.25;
        if (p.y < this.height * 0.45) {
          p.y = this.height + 10;
          p.x = Math.random() * this.width;
        }
        if (p.x < -10) p.x = this.width + 10;
        if (p.x > this.width + 10) p.x = -10;
      }
    }

    // Update Sunset Motes
    for (const p of this.sunsetMotes) {
      if (!this.isReducedMotion) {
        p.y += p.vy;
        p.x += p.vx + Math.cos(this.time * p.sineFreq + p.sineOffset) * 0.2;
        if (p.y < this.height * 0.2) {
          p.y = this.height * 0.85;
          p.x = Math.random() * this.width;
        }
        if (p.x > this.width + 10) p.x = -10;
      }
    }

    // Update Drifting Clouds
    for (const layer of this.cloudBanks) {
      for (const c of layer) {
        if (!this.isReducedMotion) {
          c.x += c.speed * dt * 0.06;
          if (c.x > this.width + 300) {
            c.x = -300;
          }
        }
      }
    }
  }

  render() {
    const palette = this.getRenderablePalette();
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.width, this.height);

    switch (this.currentScene) {
      case 'ocean':
        this.renderOceanScene(ctx, palette);
        break;
      case 'clouds':
        this.renderCloudsScene(ctx, palette);
        break;
      case 'forest':
        this.renderForestScene(ctx, palette);
        break;
      case 'sanctuary':
      default:
        this.renderSanctuaryScene(ctx, palette);
        break;
    }
  }

  // --- SCENE 1: CALM OCEAN SHORELINE ---
  renderOceanScene(ctx, palette) {
    const w = this.width;
    const h = this.height;
    const horizonY = h * 0.48;

    // Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, '#020611');
    skyGrad.addColorStop(0.65, '#07162b');
    skyGrad.addColorStop(1, '#0e2b4f');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, horizonY + 2);

    // Subtle stars in night sky
    this.renderStars(ctx, horizonY - 15);

    // Moon & Lunar Corona
    const moonX = w * 0.5;
    const moonY = horizonY - h * 0.14;
    const moonR = Math.max(16, Math.min(26, w * 0.026));

    const corona = ctx.createRadialGradient(moonX, moonY, moonR * 0.4, moonX, moonY, moonR * 7);
    corona.addColorStop(0, 'rgba(186, 230, 253, 0.16)');
    corona.addColorStop(0.35, 'rgba(125, 211, 252, 0.06)');
    corona.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 7, 0, Math.PI * 2);
    ctx.fill();

    const moonGrad = ctx.createRadialGradient(moonX - moonR * 0.35, moonY - moonR * 0.35, 1, moonX, moonY, moonR);
    moonGrad.addColorStop(0, '#ffffff');
    moonGrad.addColorStop(0.75, '#e0f2fe');
    moonGrad.addColorStop(1, '#93c5fd');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();

    // Ocean Base Gradient
    const waterGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    waterGrad.addColorStop(0, '#071e3b');
    waterGrad.addColorStop(0.45, '#051427');
    waterGrad.addColorStop(1, '#020914');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    // Lunar Reflection Shimmer Column
    const shimmerGrad = ctx.createLinearGradient(moonX - 90, 0, moonX + 90, 0);
    shimmerGrad.addColorStop(0, 'rgba(186, 230, 253, 0)');
    shimmerGrad.addColorStop(0.5, 'rgba(186, 230, 253, 0.12)');
    shimmerGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
    ctx.fillStyle = shimmerGrad;
    ctx.fillRect(moonX - 110, horizonY, 220, h - horizonY);

    // 4 Layered Waves
    const t = this.isReducedMotion ? 0 : this.time;
    const tide = Math.sin(t * 0.45) * 6;

    const waveLayers = [
      { yFrac: 0.52, amp: 4, freq: 0.005, speed: 0.45, color: 'rgba(8, 32, 60, 0.95)', crest: 'rgba(125, 211, 252, 0.22)' },
      { yFrac: 0.63, amp: 7, freq: 0.004, speed: 0.6, color: 'rgba(7, 26, 48, 0.92)', crest: 'rgba(125, 211, 252, 0.28)' },
      { yFrac: 0.76, amp: 11, freq: 0.003, speed: 0.75, color: 'rgba(5, 20, 38, 0.9)', crest: 'rgba(186, 230, 253, 0.35)' },
      { yFrac: 0.90, amp: 14, freq: 0.0025, speed: 0.9, color: 'rgba(4, 14, 28, 0.96)', crest: 'rgba(224, 242, 254, 0.45)' }
    ];

    waveLayers.forEach((wave, idx) => {
      const waveY = h * wave.yFrac + tide * (idx * 0.35);
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, waveY);

      const step = 20;
      for (let x = 0; x <= w + step; x += step) {
        const y = waveY +
          Math.sin(x * wave.freq + t * wave.speed) * wave.amp +
          Math.cos(x * wave.freq * 1.8 - t * wave.speed * 0.7) * (wave.amp * 0.4);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();

      ctx.fillStyle = wave.color;
      ctx.fill();

      ctx.lineWidth = 1.2 + idx * 0.3;
      ctx.strokeStyle = wave.crest;
      ctx.stroke();
    });

    // Sea Spray & Luminous Motes
    this.renderSeaMotes(ctx);
  }

  // --- SCENE 2: SUNSET CLOUDSCAPE ---
  renderCloudsScene(ctx, palette) {
    const w = this.width;
    const h = this.height;

    // Evening Twilight Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#0d0a1b');
    skyGrad.addColorStop(0.28, '#211234');
    skyGrad.addColorStop(0.55, '#451834');
    skyGrad.addColorStop(0.78, '#702d1f');
    skyGrad.addColorStop(1, '#94441e');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Radiant Setting Sun
    const sunX = w * 0.5;
    const sunY = h * 0.62;
    const sunR = Math.max(28, Math.min(52, w * 0.04));

    const sunAura = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, Math.max(w, h) * 0.55);
    sunAura.addColorStop(0, 'rgba(254, 215, 170, 0.42)');
    sunAura.addColorStop(0.25, 'rgba(251, 146, 60, 0.22)');
    sunAura.addColorStop(0.6, 'rgba(244, 114, 182, 0.08)');
    sunAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunAura;
    ctx.fillRect(0, 0, w, h);

    const sunDisk = ctx.createRadialGradient(sunX, sunY, 1, sunX, sunY, sunR);
    sunDisk.addColorStop(0, '#fffbeb');
    sunDisk.addColorStop(0.65, '#fde68a');
    sunDisk.addColorStop(1, 'rgba(251, 146, 60, 0.7)');
    ctx.fillStyle = sunDisk;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    // 4 Layers of Volumetric Drifting Clouds
    this.renderCloudBanks(ctx);

    // Warm Sunset Dust Motes
    this.renderSunsetMotes(ctx);
  }

  // --- SCENE 3: QUIET FOREST CANOPY ---
  renderForestScene(ctx, palette) {
    const w = this.width;
    const h = this.height;

    // Midnight Forest Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#020906');
    skyGrad.addColorStop(0.5, '#071f16');
    skyGrad.addColorStop(1, '#0e2e22');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Stars filtering through canopy
    this.renderStars(ctx, h * 0.55);

    // Moonlight Aura
    const moonX = w * 0.74;
    const moonY = h * 0.16;
    const aura = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, w * 0.45);
    aura.addColorStop(0, 'rgba(167, 243, 208, 0.16)');
    aura.addColorStop(0.45, 'rgba(52, 211, 153, 0.05)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, w, h);

    // Moonlight Shafts / God Rays
    this.renderMoonlightBeams(ctx, moonX, moonY);

    // Distant Mountain Ridge
    this.renderMountainRidge(ctx, h * 0.55, '#04160f');

    // Procedural Pine Treeline (Midground & Foreground)
    this.renderPineTreeline(ctx);

    // Foreground Canopy Framing Silhouettes
    this.renderCanopyFraming(ctx);

    // Glowing Fireflies
    this.renderFireflies(ctx);
  }

  // --- SCENE 0: ORIGINAL SANCTUARY / ABSTRACT GEOMETRY ---
  renderSanctuaryScene(ctx, palette) {
    // 1. Fullscreen Atmosphere Background Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGradient.addColorStop(0, palette.bgTop);
    bgGradient.addColorStop(1, palette.bgBottom);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Soft Ambient Radial Glow
    const glowX = this.width * 0.5 + Math.sin(this.time * 0.2) * 50;
    const glowY = this.height * 0.55 + Math.cos(this.time * 0.15) * 30;
    const glowRadius = Math.max(this.width, this.height) * 0.65;
    
    const radialGlow = ctx.createRadialGradient(
      glowX, glowY, 10,
      glowX, glowY, glowRadius
    );
    radialGlow.addColorStop(0, palette.bgGlow);
    radialGlow.addColorStop(0.5, palette.glowColor);
    radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radialGlow;
    ctx.fillRect(0, 0, this.width, this.height);

    // 3. Spatial Grid
    this.renderSpatialGrid(ctx, palette);

    // 4. Seating Filament Connections
    this.renderConnections(ctx, palette);

    // 5. Seating Nodes & Orbital Rings
    this.renderSeatingNodes(ctx, palette);

    // 6. Dust Motes
    this.renderParticles(ctx, palette);
  }

  // --- SUB-RENDERERS FOR SCENIC ASSETS ---
  renderStars(ctx, maxY) {
    ctx.save();
    const t = this.isReducedMotion ? 0 : this.time;
    for (const s of this.stars) {
      if (s.y > maxY) continue;
      const alpha = Math.max(0.08, Math.min(0.85, s.baseAlpha + Math.sin(t * s.twinkleSpeed + s.phase) * 0.2));
      ctx.fillStyle = `rgba(224, 242, 254, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderSeaMotes(ctx) {
    ctx.save();
    for (const p of this.oceanMotes) {
      ctx.fillStyle = `rgba(186, 230, 253, ${p.baseAlpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderSunsetMotes(ctx) {
    ctx.save();
    for (const p of this.sunsetMotes) {
      ctx.fillStyle = `rgba(254, 215, 170, ${p.baseAlpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderCloudBanks(ctx) {
    ctx.save();
    for (const layer of this.cloudBanks) {
      for (const c of layer) {
        ctx.save();
        ctx.translate(c.x, c.y);

        for (const p of c.puffs) {
          const puffGrad = ctx.createRadialGradient(p.ox, p.oy - p.r * 0.35, p.r * 0.2, p.ox, p.oy, p.r);
          puffGrad.addColorStop(0, `rgba(254, 215, 170, ${(c.alpha * 1.1).toFixed(3)})`);
          puffGrad.addColorStop(0.5, `rgba(244, 114, 182, ${(c.alpha * 0.7).toFixed(3)})`);
          puffGrad.addColorStop(1, 'rgba(35, 16, 45, 0)');

          ctx.fillStyle = puffGrad;
          ctx.beginPath();
          ctx.arc(p.ox, p.oy, p.r, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }
    ctx.restore();
  }

  renderMountainRidge(ctx, horizonY, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    ctx.lineTo(0, horizonY);

    const step = 25;
    for (let x = 0; x <= this.width + step; x += step) {
      const y = horizonY + Math.sin(x * 0.003) * 22 + Math.cos(x * 0.007) * 14;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  renderPineTreeline(ctx) {
    ctx.save();
    for (const tree of this.forestPines) {
      ctx.fillStyle = tree.color;
      const x = tree.x;
      const baseY = tree.baseY;
      const h = tree.height;
      const w = tree.width;
      const tiers = tree.tiers;

      // Render triangular tiers from top to bottom
      for (let i = 0; i < tiers; i++) {
        const tierH = h * (0.35 + (i / tiers) * 0.2);
        const tierW = w * (0.3 + (i / tiers) * 0.7);
        const tierTopY = baseY - h + (i / tiers) * (h * 0.75);
        const tierBottomY = tierTopY + tierH;

        ctx.beginPath();
        ctx.moveTo(x, tierTopY);
        ctx.lineTo(x + tierW * 0.5, tierBottomY);
        ctx.lineTo(x - tierW * 0.5, tierBottomY);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  renderCanopyFraming(ctx) {
    ctx.save();
    ctx.fillStyle = '#010805';

    // Left overhanging branch
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(this.width * 0.18, this.height * 0.08, this.width * 0.28, this.height * 0.02);
    ctx.quadraticCurveTo(this.width * 0.15, this.height * 0.15, 0, this.height * 0.18);
    ctx.closePath();
    ctx.fill();

    // Right overhanging branch
    ctx.beginPath();
    ctx.moveTo(this.width, 0);
    ctx.quadraticCurveTo(this.width * 0.82, this.height * 0.08, this.width * 0.72, this.height * 0.02);
    ctx.quadraticCurveTo(this.width * 0.85, this.height * 0.16, this.width, this.height * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  renderMoonlightBeams(ctx, originX, originY) {
    ctx.save();
    const t = this.isReducedMotion ? 0 : this.time;

    for (let i = 0; i < this.forestGodRays.length; i++) {
      const ray = this.forestGodRays[i];
      const startX = this.width * ray.xFrac;
      const breathAlpha = ray.alpha + (this.isReducedMotion ? 0 : Math.sin(t * 0.4 + ray.phase) * 0.015);

      const grad = ctx.createLinearGradient(startX, 0, startX + this.height * ray.angle, this.height);
      grad.addColorStop(0, `rgba(167, 243, 208, ${(breathAlpha * 1.5).toFixed(3)})`);
      grad.addColorStop(0.5, `rgba(52, 211, 153, ${breathAlpha.toFixed(3)})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX + ray.width * 0.4, 0);
      ctx.lineTo(startX + ray.width + this.height * ray.angle, this.height);
      ctx.lineTo(startX - ray.width * 0.5 + this.height * ray.angle, this.height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  renderFireflies(ctx) {
    ctx.save();
    const t = this.isReducedMotion ? 0 : this.time;

    for (const f of this.fireflies) {
      const x = f.baseX + (this.isReducedMotion ? 0 : Math.sin(t * f.freqX + f.phaseX) * f.ampX);
      const y = f.baseY + (this.isReducedMotion ? 0 : Math.cos(t * f.freqY + f.phaseY) * f.ampY);
      const pulse = this.isReducedMotion ? 0.7 : Math.max(0.15, Math.sin(t * f.pulseSpeed + f.pulsePhase) * 0.5 + 0.5);

      const color = f.isGolden
        ? { core: '#fef08a', halo: 'rgba(250, 204, 21, ' }
        : { core: '#a7f3d0', halo: 'rgba(52, 211, 153, ' };

      const haloR = f.radius * (3.5 + pulse * 2.5);
      const haloGrad = ctx.createRadialGradient(x, y, 1, x, y, haloR);
      haloGrad.addColorStop(0, color.halo + (pulse * 0.8).toFixed(3) + ')');
      haloGrad.addColorStop(0.4, color.halo + (pulse * 0.3).toFixed(3) + ')');
      haloGrad.addColorStop(1, color.halo + '0)');

      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(x, y, haloR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color.core;
      ctx.beginPath();
      ctx.arc(x, y, f.radius * (0.8 + pulse * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderSpatialGrid(ctx, palette) {
    const horizonY = this.height * 0.42;
    const bottomY = this.height + 40;
    const centerX = this.width * 0.5;

    ctx.save();

    const gridCols = 24;
    const gridRows = 14;

    // Perspective Longitude Lines radiating from horizon
    ctx.lineWidth = 1;
    for (let i = -gridCols / 2; i <= gridCols / 2; i++) {
      const spreadFactor = (i / (gridCols / 2));
      const bottomX = centerX + spreadFactor * (this.width * 0.85);
      const topX = centerX + spreadFactor * (this.width * 0.12);

      const isMajor = Math.abs(i) % 4 === 0;
      ctx.strokeStyle = isMajor ? palette.gridAccent : palette.grid;

      ctx.beginPath();
      const cpX = (topX + bottomX) / 2 + Math.sin(this.time * 0.5 + i * 0.2) * 12;
      const cpY = (horizonY + bottomY) / 2;
      ctx.moveTo(topX, horizonY);
      ctx.quadraticCurveTo(cpX, cpY, bottomX, bottomY);
      ctx.stroke();
    }

    // Latitude Perspective Iso-Lines flowing forward
    for (let r = 1; r <= gridRows; r++) {
      const depthProgress = Math.pow(r / gridRows, 2.2);
      const lineY = horizonY + depthProgress * (bottomY - horizonY);
      const lateralWidth = (this.width * 0.12) + depthProgress * (this.width * 0.85);

      const rowWave = Math.sin(this.time * 0.8 - r * 0.4) * (2 + depthProgress * 6);
      const isMajorRow = r % 3 === 0;

      ctx.strokeStyle = isMajorRow ? palette.gridAccent : palette.grid;
      ctx.beginPath();
      
      const leftX = centerX - lateralWidth;
      const rightX = centerX + lateralWidth;

      ctx.moveTo(leftX, lineY + rowWave);
      ctx.quadraticCurveTo(centerX, lineY - rowWave * 1.5, rightX, lineY + rowWave);
      ctx.stroke();

      if (isMajorRow && r > 4) {
        for (let k = -3; k <= 3; k++) {
          const dotX = centerX + (k / 3) * lateralWidth * 0.8;
          ctx.fillStyle = palette.accentLight;
          ctx.beginPath();
          ctx.arc(dotX, lineY + rowWave * 0.5, 1.4 + depthProgress * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  renderConnections(ctx, palette) {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);

    const ringsRgba = palette.rawRings;

    for (let i = 0; i < this.seatingNodes.length; i++) {
      for (let j = i + 1; j < this.seatingNodes.length; j++) {
        const n1 = this.seatingNodes[i];
        const n2 = this.seatingNodes[j];

        const dist = Math.hypot(n2.x - n1.x, n2.y - n1.y);
        const maxDist = Math.max(this.width, this.height) * 0.7;

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.25;
          ctx.strokeStyle = `rgba(${Math.round(ringsRgba[0])}, ${Math.round(ringsRgba[1])}, ${Math.round(ringsRgba[2])}, ${alpha.toFixed(3)})`;

          ctx.beginPath();
          const midX = (n1.x + n2.x) / 2 + Math.sin(this.time * 0.3 + i) * 15;
          const midY = (n1.y + n2.y) / 2 + Math.cos(this.time * 0.3 + j) * 15;
          ctx.moveTo(n1.x, n1.y);
          ctx.quadraticCurveTo(midX, midY, n2.x, n2.y);
          ctx.stroke();

          const pulseT = (this.time * 0.2 + (i * 0.3)) % 1;
          const px = (1 - pulseT) * (1 - pulseT) * n1.x + 2 * (1 - pulseT) * pulseT * midX + pulseT * pulseT * n2.x;
          const py = (1 - pulseT) * (1 - pulseT) * n1.y + 2 * (1 - pulseT) * pulseT * midY + pulseT * pulseT * n2.y;

          ctx.fillStyle = palette.accentLight;
          ctx.beginPath();
          ctx.arc(px, py, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  renderSeatingNodes(ctx, palette) {
    ctx.save();

    for (const node of this.seatingNodes) {
      const pulse = Math.sin(this.time * node.pulseSpeed * 1000 + node.phase) * 0.08 + (this.audioPulse * 0.15);
      const effectiveRadius = node.radius * (1 + pulse);
      const rotation = this.time * node.rotationSpeed * 1000 + node.phase;

      // Soft center glowing core
      const coreGlow = ctx.createRadialGradient(
        node.x, node.y, 2,
        node.x, node.y, effectiveRadius * 0.4
      );
      coreGlow.addColorStop(0, palette.accentLight);
      coreGlow.addColorStop(0.5, palette.glowColor);
      coreGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(node.x, node.y, effectiveRadius * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Render concentric sub-rings
      for (let s = 0; s < node.subRings.length; s++) {
        const ringFactor = node.subRings[s];
        const r = effectiveRadius * ringFactor;

        ctx.strokeStyle = palette.rings;
        ctx.lineWidth = s === node.subRings.length - 1 ? 1.5 : 0.8;

        if (s % 2 === 1) {
          ctx.setLineDash([6, 10]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Architectural arc segments & tick marks
        if (s === node.subRings.length - 1) {
          ctx.setLineDash([]);
          const arcSegments = 4;
          for (let a = 0; a < arcSegments; a++) {
            const startAngle = rotation + (a * Math.PI * 2) / arcSegments;
            const arcLength = Math.PI * 0.25;

            ctx.strokeStyle = palette.accentLight;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, startAngle, startAngle + arcLength);
            ctx.stroke();
          }
        }
      }

      // Render Satellite Seating Orbs
      for (let k = 0; k < node.satellites; k++) {
        const satAngle = rotation * 1.5 + (k * Math.PI * 2) / node.satellites;
        const satDist = effectiveRadius * 0.95;
        const satX = node.x + Math.cos(satAngle) * satDist;
        const satY = node.y + Math.sin(satAngle) * satDist;

        ctx.fillStyle = palette.accentLight;
        ctx.beginPath();
        ctx.arc(satX, satY, 2.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = palette.rings;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(satX, satY, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  renderParticles(ctx, palette) {
    ctx.save();
    const pRgba = palette.rawParticles;

    for (const p of this.particles) {
      const alpha = Math.max(0.08, Math.min(1, p.baseAlpha + Math.sin(this.time * 2 + p.sineOffset) * 0.15));
      ctx.fillStyle = `rgba(${Math.round(pRgba[0])}, ${Math.round(pRgba[1])}, ${Math.round(pRgba[2])}, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  triggerAudioBeat() {
    this.audioPulse = Math.min(this.audioPulse + 0.45, 1.0);
  }

  animate(currentTime) {
    if (!this.lastTime) this.lastTime = currentTime;
    const dt = Math.min(currentTime - this.lastTime, 100);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.animate);
  }
}

window.AmbientCanvasEngine = AmbientCanvasEngine;
