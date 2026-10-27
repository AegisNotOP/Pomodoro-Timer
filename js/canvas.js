/**
 * The Algorithmic Ambient Room - Generative Canvas Art Engine
 * Renders spatial perspective grids, circular seating geometries,
 * ambient dust motes, and smooth color palette transitions.
 */

class AmbientCanvasEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Color Palettes for Smooth Morphing (Cool Deep Blues -> Dusk Purple -> Warm Sunset Orange)
    this.palettes = [
      {
        name: "Deep Cosmic Blue",
        bgTop: [4, 8, 20],        // #040814
        bgBottom: [10, 24, 48],    // #0a1830
        bgGlow: [20, 60, 110],     // Deep Ocean Glow
        grid: "rgba(56, 189, 248, 0.12)",
        gridAccent: "rgba(125, 211, 252, 0.4)",
        rings: "rgba(56, 189, 248, 0.22)",
        particles: "rgba(186, 230, 253, 0.6)",
        accentLight: "rgba(56, 189, 248, 0.8)",
        glowColor: "rgba(14, 165, 233, 0.15)"
      },
      {
        name: "Twilight Amethyst",
        bgTop: [12, 8, 26],       // #0c081a
        bgBottom: [28, 16, 52],   // #1c1034
        bgGlow: [76, 29, 115],    // Velvet purple
        grid: "rgba(192, 132, 252, 0.12)",
        gridAccent: "rgba(216, 180, 254, 0.4)",
        rings: "rgba(192, 132, 252, 0.22)",
        particles: "rgba(233, 213, 255, 0.6)",
        accentLight: "rgba(192, 132, 252, 0.8)",
        glowColor: "rgba(168, 85, 247, 0.15)"
      },
      {
        name: "Dusk Rose",
        bgTop: [22, 10, 24],      // #160a18
        bgBottom: [48, 18, 44],   // #30122c
        bgGlow: [120, 36, 80],    // Dusk berry
        grid: "rgba(244, 114, 182, 0.12)",
        gridAccent: "rgba(249, 168, 212, 0.4)",
        rings: "rgba(244, 114, 182, 0.22)",
        particles: "rgba(252, 231, 243, 0.6)",
        accentLight: "rgba(244, 114, 182, 0.8)",
        glowColor: "rgba(236, 72, 153, 0.15)"
      },
      {
        name: "Warm Sunset Orange",
        bgTop: [24, 9, 5],        // #180905
        bgBottom: [62, 22, 10],   // #3e160a
        bgGlow: [160, 55, 18],    // Warm radiant sunset
        grid: "rgba(251, 146, 60, 0.14)",
        gridAccent: "rgba(253, 186, 116, 0.45)",
        rings: "rgba(251, 146, 60, 0.25)",
        particles: "rgba(254, 215, 170, 0.65)",
        accentLight: "rgba(251, 146, 60, 0.85)",
        glowColor: "rgba(249, 115, 22, 0.18)"
      }
    ];

    // Transition State
    this.paletteIndex = 0;
    this.transitionProgress = 0; // 0 to 1 between current and next palette
    this.autoShift = true;
    this.shiftSpeed = 0.0003; // Slow, meditative transition speed

    // Time & Motion
    this.time = 0;
    this.audioPulse = 0; // External pulse from audio beats

    // Spatial Layout Objects (Seating Pods & Geometries)
    this.seatingNodes = [];
    this.particles = [];
    
    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.createSeatingNodes();
    this.createParticles();
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
  }

  createSeatingNodes() {
    // Generate harmonious circular seating arrangements placed gracefully around the room
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const minDim = Math.min(this.width, this.height);

    this.seatingNodes = [
      // Central sanctuary seating ring
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
      // Left intimate conversation lounge
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
      // Right contemplation node
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
      // Distant perimeter ambient alcove
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
      // Distant right ambient alcove
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
        vy: -Math.random() * 0.3 - 0.1, // Float gently upwards
        sineFreq: Math.random() * 0.02 + 0.005,
        sineOffset: Math.random() * Math.PI * 2
      });
    }
  }

  // Color Interpolation Helper
  lerpColor(c1, c2, factor) {
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * factor),
      Math.round(c1[1] + (c2[1] - c1[1]) * factor),
      Math.round(c1[2] + (c2[2] - c1[2]) * factor)
    ];
  }

  getCurrentPalette() {
    const current = this.palettes[this.paletteIndex];
    const next = this.palettes[(this.paletteIndex + 1) % this.palettes.length];
    const t = this.transitionProgress;

    const bgTop = this.lerpColor(current.bgTop, next.bgTop, t);
    const bgBottom = this.lerpColor(current.bgBottom, next.bgBottom, t);
    const bgGlow = this.lerpColor(current.bgGlow, next.bgGlow, t);

    return {
      name: t < 0.5 ? current.name : next.name,
      bgTop: `rgb(${bgTop[0]}, ${bgTop[1]}, ${bgTop[2]})`,
      bgBottom: `rgb(${bgBottom[0]}, ${bgBottom[1]}, ${bgBottom[2]})`,
      bgGlow: `rgba(${bgGlow[0]}, ${bgGlow[1]}, ${bgGlow[2]}, 0.45)`,
      grid: t < 0.5 ? current.grid : next.grid,
      gridAccent: t < 0.5 ? current.gridAccent : next.gridAccent,
      rings: t < 0.5 ? current.rings : next.rings,
      particles: t < 0.5 ? current.particles : next.particles,
      accentLight: t < 0.5 ? current.accentLight : next.accentLight,
      glowColor: t < 0.5 ? current.glowColor : next.glowColor
    };
  }

  setPaletteIndex(index) {
    this.paletteIndex = index % this.palettes.length;
    this.transitionProgress = 0;
  }

  update(dt) {
    this.time += dt * 0.001;

    // Palette Auto Progression
    if (this.autoShift) {
      this.transitionProgress += this.shiftSpeed * (dt / 16.6);
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 0;
        this.paletteIndex = (this.paletteIndex + 1) % this.palettes.length;
      }
    }

    // Audio pulse decay
    this.audioPulse *= 0.94;

    // Update Particles
    for (const p of this.particles) {
      p.y += p.vy;
      p.x += p.vx + Math.sin(this.time * p.sineFreq + p.sineOffset) * 0.2;
      
      // Wrap around edges
      if (p.y < -10) {
        p.y = this.height + 10;
        p.x = Math.random() * this.width;
      }
      if (p.x < -10) p.x = this.width + 10;
      if (p.x > this.width + 10) p.x = -10;
    }
  }

  render() {
    const palette = this.getCurrentPalette();
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Fullscreen Atmosphere Background Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGradient.addColorStop(0, palette.bgTop);
    bgGradient.addColorStop(1, palette.bgBottom);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Soft Ambient Radial Glow (Sunset / Atmospheric Center)
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

    // 3. Render Moving Spatial Grid
    this.renderSpatialGrid(ctx, palette);

    // 4. Render Filament Connections between Seating Nodes
    this.renderConnections(ctx, palette);

    // 5. Render Circular Seating Formations & Orbital Rings
    this.renderSeatingNodes(ctx, palette);

    // 6. Render Floating Dust Motes / Particles
    this.renderParticles(ctx, palette);
  }

  renderSpatialGrid(ctx, palette) {
    const horizonY = this.height * 0.42;
    const bottomY = this.height + 40;
    const centerX = this.width * 0.5;

    ctx.save();

    // Subtle undulating wave offset for organic breathing
    const waveOffset = Math.sin(this.time * 0.4) * 8;
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
      // Draw smooth curve with sinusoidal ambient sway
      const cpX = (topX + bottomX) / 2 + Math.sin(this.time * 0.5 + i * 0.2) * 12;
      const cpY = (horizonY + bottomY) / 2;
      ctx.moveTo(topX, horizonY);
      ctx.quadraticCurveTo(cpX, cpY, bottomX, bottomY);
      ctx.stroke();
    }

    // Latitude Perspective Iso-Lines flowing forward
    for (let r = 1; r <= gridRows; r++) {
      // Exponential distribution for realistic camera depth
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

      // Draw subtle intersection glowing dots
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

    for (let i = 0; i < this.seatingNodes.length; i++) {
      for (let j = i + 1; j < this.seatingNodes.length; j++) {
        const n1 = this.seatingNodes[i];
        const n2 = this.seatingNodes[j];

        const dist = Math.hypot(n2.x - n1.x, n2.y - n1.y);
        const maxDist = Math.max(this.width, this.height) * 0.7;

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.25;
          ctx.strokeStyle = palette.rings.replace(/[\d\.]+\)$/, `${alpha})`);

          ctx.beginPath();
          // Gentle curved filament
          const midX = (n1.x + n2.x) / 2 + Math.sin(this.time * 0.3 + i) * 15;
          const midY = (n1.y + n2.y) / 2 + Math.cos(this.time * 0.3 + j) * 15;
          ctx.moveTo(n1.x, n1.y);
          ctx.quadraticCurveTo(midX, midY, n2.x, n2.y);
          ctx.stroke();

          // Traveling light pulse on filament
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

      // Render concentric sub-rings (tatami contours / seating perimeters)
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

      // Render Satellite Seating Orbs / Meditation nodes
      for (let k = 0; k < node.satellites; k++) {
        const satAngle = rotation * 1.5 + (k * Math.PI * 2) / node.satellites;
        const satDist = effectiveRadius * 0.95;
        const satX = node.x + Math.cos(satAngle) * satDist;
        const satY = node.y + Math.sin(satAngle) * satDist;

        // Small satellite cushion / orb
        ctx.fillStyle = palette.accentLight;
        ctx.beginPath();
        ctx.arc(satX, satY, 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Subtle outer ring around satellite
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
    for (const p of this.particles) {
      const alpha = p.baseAlpha + Math.sin(this.time * 2 + p.sineOffset) * 0.15;
      ctx.fillStyle = palette.particles.replace(/[\d\.]+\)$/, `${Math.max(0.1, alpha)})`);
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
