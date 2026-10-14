// Procedural Sci-Fi Sound Synthesizer using Web Audio API
// 100% self-contained, zero external audio assets required

let audioCtx = null;
let soundEnabled = true;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const soundManager = {
  isEnabled: () => soundEnabled,
  toggle: () => {
    soundEnabled = !soundEnabled;
    return soundEnabled;
  },
  setEnabled: (val) => {
    soundEnabled = !!val;
  },

  // Subtle sci-fi hover tick
  playHover: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.045);
    } catch {
      // Audio context might be restricted before user interaction
    }
  },

  // Field focus pulse
  playFocus: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.085);
    } catch {}
  },

  // XP Gain harmonic chime (+250 XP)
  playXpGain: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      
      const now = ctx.currentTime;
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 arpeggio

      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.05, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.2);
      });
    } catch {}
  },

  // Archetype class switch
  playArchetypeSwitch: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {}
  },

  // Warp Launch / Registration Complete
  playWarpLaunch: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Ascending sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.6);

      gain.gain.setValueAtTime(0.02, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

      // Low pass filter sweep
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(4000, now + 0.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.75);

      // Final triumphant chime
      setTimeout(() => {
        if (!soundEnabled) return;
        const chimeNotes = [523.25, 659.25, 783.99, 1046.5]; // C Major Chord
        chimeNotes.forEach((f) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(f, ctx.currentTime);
          g.gain.setValueAtTime(0.05, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
          o.connect(g);
          g.connect(ctx.destination);
          o.start();
          o.stop(ctx.currentTime + 0.52);
        });
      }, 350);
    } catch {}
  },

  // Cinematic Satisfying Sci-Fi Transition (Warm bass pulse + harmonic resonance sweep)
  playTransition: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // 1. Warm Sub-Bass Pulse (gives weight and physical presence)
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(85, now);
      bassOsc.frequency.exponentialRampToValueAtTime(140, now + 0.35);

      bassGain.gain.setValueAtTime(0.06, now);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      bassOsc.connect(bassGain);
      bassGain.connect(ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.46);

      // 2. Holographic Shimmer Sweep
      const sweepOsc = ctx.createOscillator();
      const sweepGain = ctx.createGain();
      sweepOsc.type = 'triangle';
      sweepOsc.frequency.setValueAtTime(360, now);
      sweepOsc.frequency.exponentialRampToValueAtTime(720, now + 0.3);
      sweepOsc.frequency.exponentialRampToValueAtTime(520, now + 0.55);

      sweepGain.gain.setValueAtTime(0.03, now);
      sweepGain.gain.linearRampToValueAtTime(0.05, now + 0.15);
      sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);

      sweepOsc.connect(sweepGain);
      sweepGain.connect(ctx.destination);
      sweepOsc.start(now);
      sweepOsc.stop(now + 0.6);

      // 3. Gentle High Crystal Resolution Chime
      setTimeout(() => {
        if (!soundEnabled) return;
        try {
          const chime = ctx.createOscillator();
          const chimeGain = ctx.createGain();
          chime.type = 'sine';
          chime.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
          chimeGain.gain.setValueAtTime(0.03, ctx.currentTime);
          chimeGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
          chime.connect(chimeGain);
          chimeGain.connect(ctx.destination);
          chime.start();
          chime.stop(ctx.currentTime + 0.46);
        } catch {}
      }, 180);
    } catch {}
  }
};
