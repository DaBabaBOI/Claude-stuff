/**
 * AudioManager — every sound in the game is synthesised here at runtime.
 *
 * No audio files: the project has no asset pipeline and no network at runtime,
 * and a blockout does not need recorded foley. Each cue is a handful of
 * oscillators and noise through an envelope, which also means pitch and length
 * can follow gameplay — a fully drawn bow twangs lower and louder than a snap
 * shot, a big hit thuds deeper than a scratch.
 *
 * Browsers refuse to start audio before a gesture, so the context is created on
 * the first click or key press and every cue before that is silently dropped.
 */

const MASTER_VOLUME = 0.35;

/** Minimum gap between two cues of the same kind, to stop machine-gun stacking. */
const THROTTLE_MS = {
  swing: 60,
  hit: 40,
  'bow-draw': 200,
  'bow-release': 60,
  'arrow-ground': 80,
  'zombie-groan': 400,
  'player-hurt': 120,
};

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.lastPlayed = new Map();
    this.noiseBuffer = null;
  }

  /** Hook the first user gesture; browsers will not start audio before one. */
  attachUnlock(target = window) {
    const unlock = () => {
      this.ensureContext();
      this.ctx?.resume?.();
    };
    target.addEventListener('pointerdown', unlock);
    target.addEventListener('keydown', unlock);
  }

  ensureContext() {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
    this.master.connect(this.ctx.destination);

    // One second of white noise, reused by every percussive cue.
    const frames = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

    return this.ctx;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : MASTER_VOLUME;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // --- building blocks -----------------------------------------------------
  tone({ type = 'sine', from, to, duration, gain = 0.5, delay = 0 }) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + duration);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + duration * 0.12);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(env).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  noise({ duration, gain = 0.4, type = 'bandpass', from = 1200, to = 400, q = 1, delay = 0 }) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + duration);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + duration * 0.1);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter).connect(env).connect(this.master);
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  }

  // --- cues ----------------------------------------------------------------
  /**
   * @param {string} type
   * @param {{power?: number, amount?: number, source?: string}} [options]
   */
  play(type, options = {}) {
    const ctx = this.ensureContext();
    if (!ctx || this.muted || ctx.state === 'suspended') return;

    const throttle = THROTTLE_MS[type];
    if (throttle) {
      const now = performance.now();
      if (now - (this.lastPlayed.get(type) ?? -Infinity) < throttle) return;
      this.lastPlayed.set(type, now);
    }

    const power = options.power ?? 1;

    switch (type) {
      case 'swing':
        this.noise({ duration: 0.22, gain: 0.35, from: 2400, to: 500, q: 0.8 });
        break;

      case 'hit': {
        // Heavier hits thud lower — the number on screen and the sound agree.
        const weight = Math.min(1, (options.amount ?? 10) / 25);
        this.tone({ type: 'sine', from: 180 - weight * 60, to: 55, duration: 0.16, gain: 0.55 });
        this.noise({ duration: 0.08, gain: 0.3, from: 1800, to: 700, q: 0.7 });
        break;
      }

      case 'bow-draw':
        this.noise({ duration: 0.35, gain: 0.12, type: 'bandpass', from: 700, to: 1500, q: 6 });
        break;

      case 'bow-release':
        // Twang: a full draw is lower and louder than a snap shot.
        this.tone({
          type: 'triangle',
          from: 620 - power * 200,
          to: 150,
          duration: 0.12 + power * 0.08,
          gain: 0.25 + power * 0.3,
        });
        this.noise({ duration: 0.09, gain: 0.25, from: 3000, to: 900, q: 1.2 });
        break;

      case 'arrow-ground':
        this.noise({ duration: 0.07, gain: 0.25, type: 'highpass', from: 2200, to: 1400 });
        break;

      case 'zombie-groan':
        this.tone({ type: 'sawtooth', from: 95, to: 62, duration: 0.55, gain: 0.16 });
        this.tone({ type: 'sawtooth', from: 143, to: 88, duration: 0.5, gain: 0.07, delay: 0.04 });
        break;

      case 'enemy-death':
        this.tone({ type: 'square', from: 260, to: 60, duration: 0.42, gain: 0.22 });
        this.noise({ duration: 0.3, gain: 0.18, from: 900, to: 200, q: 0.6 });
        break;

      case 'player-hurt':
        this.tone({ type: 'sawtooth', from: 220, to: 70, duration: 0.3, gain: 0.4 });
        break;

      case 'player-death':
        this.tone({ type: 'sine', from: 420, to: 55, duration: 1.1, gain: 0.45 });
        break;

      case 'pickup':
        this.tone({ type: 'triangle', from: 660, to: 990, duration: 0.1, gain: 0.22 });
        this.tone({ type: 'triangle', from: 990, to: 1320, duration: 0.12, gain: 0.16, delay: 0.07 });
        break;

      case 'wave':
        this.tone({ type: 'square', from: 180, to: 178, duration: 0.18, gain: 0.2 });
        this.tone({ type: 'square', from: 135, to: 133, duration: 0.34, gain: 0.22, delay: 0.19 });
        break;

      default:
        break;
    }
  }

  /** Drain this frame's gameplay events into sound. */
  update(state) {
    for (const event of state.events) this.play(event.type, event);
    state.events.length = 0;
  }
}
