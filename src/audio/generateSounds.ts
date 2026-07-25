/**
 * Programmatic sound generation using Web Audio API.
 * Each function creates an AudioBuffer by synthesizing the waveform directly.
 * No external audio files needed — all sounds are generated from math.
 */

export type SfxName =
  | "pop"
  | "dart_throw"
  | "bottle_hit"
  | "bottle_chain"
  | "bottle_crash"
  | "splash"
  | "reveal"
  | "jackpot"
  | "fanfare"
  | "lose"
  | "prize"
  | "ticket"
  | "denied"
  | "whoosh"
  | "bell"
  | "curtain"
  | "tink";

/** Fill a buffer channel with values from a generator function */
function fillBuffer(
  ctx: AudioContext,
  duration: number,
  fn: (t: number, i: number, len: number) => number,
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.ceil(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    data[i] = Math.max(-1, Math.min(1, fn(t, i, length)));
  }
  return buffer;
}

/** White noise sample (deterministic-ish via simple LCG) */
function noiseSample(_seed: number): number {
  // Simple pseudo-random that's fast enough for audio generation
  return Math.random() * 2 - 1;
}

// ── Individual Sound Generators ──────────────────────

/** Loud burst with quick decay — realistic balloon pop */
function generatePop(ctx: AudioContext): AudioBuffer {
  return fillBuffer(ctx, 0.22, (t) => {
    // Sharp attack envelope — burst peaks at 1ms, then fast decay
    const attack = Math.min(t / 0.001, 1);
    const envelope = attack * Math.exp(-t * 28);
    // Broad-spectrum burst: mix of low thud + high crack
    const lowBurst = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 40) * 0.7;
    const midCrack = Math.sin(2 * Math.PI * 600 * t + Math.sin(t * 500) * 2) * 0.5;
    const highFizz = Math.sin(2 * Math.PI * 2400 * t) * 0.25 * Math.exp(-t * 55);
    // Initial click transient
    const click = t < 0.003 ? (1 - t / 0.003) * 0.5 : 0;
    return (lowBurst * 0.5 + midCrack * 0.4 + highFizz * 0.3 + click) * envelope;
  });
}

/** Quick downward sweep — dart throw whoosh */
function generateDartThrow(ctx: AudioContext): AudioBuffer {
  return fillBuffer(ctx, 0.12, (t) => {
    const envelope = Math.exp(-t * 25);
    const freq = 1400 - t * 7000;
    return Math.sin(2 * Math.PI * Math.max(200, freq) * t) * envelope * 0.4;
  });
}

/** Mid-frequency glass thunk with resonance tail — bottle hit */
function generateBottleHit(ctx: AudioContext): AudioBuffer {
  return fillBuffer(ctx, 0.35, (t) => {
    // Glass impact: sharp attack + ringing resonance
    const attack = Math.min(t / 0.002, 1);
    const bodyEnv = attack * Math.exp(-t * 14);
    const ringEnv = attack * Math.exp(-t * 6);
    // Impact body
    const freq = 340 + Math.sin(t * 90) * 50;
    const body = Math.sin(2 * Math.PI * freq * t);
    // Glass resonance harmonics
    const ring1 = Math.sin(2 * Math.PI * 680 * t) * 0.3;
    const ring2 = Math.sin(2 * Math.PI * 1020 * t) * 0.15;
    const ring3 = Math.sin(2 * Math.PI * 1367 * t) * 0.08;
    // Initial click
    const click = t < 0.004 ? (1 - t / 0.004) * 0.45 : 0;
    return (body * 0.5 + ring1 * 0.25 + ring2 * 0.12 + ring3 * 0.06 + click) * bodyEnv
      + (ring1 + ring2 + ring3) * ringEnv * 0.15;
  });
}

/** Slightly higher variant for chain reaction bottles — glassy cascade */
function generateBottleChain(ctx: AudioContext): AudioBuffer {
  return fillBuffer(ctx, 0.28, (t) => {
    const attack = Math.min(t / 0.002, 1);
    const envelope = attack * Math.exp(-t * 16);
    const freq = 420 + Math.sin(t * 110) * 60;
    const body = Math.sin(2 * Math.PI * freq * t);
    const ring1 = Math.sin(2 * Math.PI * 840 * t) * 0.22;
    const ring2 = Math.sin(2 * Math.PI * 1260 * t) * 0.1;
    const click = t < 0.003 ? (1 - t / 0.003) * 0.35 : 0;
    return (body * 0.4 + ring1 * 0.2 + ring2 * 0.08 + click) * envelope;
  });
}

/** Glass-like crash with rich resonance — bottle tumble impact */
function generateBottleCrash(ctx: AudioContext): AudioBuffer {
  return fillBuffer(ctx, 0.45, (t) => {
    const attack = Math.min(t / 0.0015, 1);
    const env = attack * Math.exp(-t * 10);
    const ringEnv = attack * Math.exp(-t * 5);
    // Layered glass frequencies
    const f1 = Math.sin(2 * Math.PI * 380 * t) * 0.45;
    const f2 = Math.sin(2 * Math.PI * 570 * t) * 0.3;
    const f3 = Math.sin(2 * Math.PI * 760 * t + 0.5) * 0.2;
    const f4 = Math.sin(2 * Math.PI * 1140 * t + 1.2) * 0.12;
    const f5 = Math.sin(2 * Math.PI * 1520 * t) * 0.06;
    // Shatter noise burst
    const noiseBurst = (Math.random() * 2 - 1) * Math.exp(-t * 30) * 0.2;
    const click = t < 0.002 ? (1 - t / 0.002) * 0.5 : 0;
    return (f1 + f2 + f3 + f4 + f5 + noiseBurst + click) * env
      + (f1 * 0.3 + f2 * 0.2 + f3 * 0.1) * ringEnv;
  });
}

/** Short sharp metallic ping — "tink tink" for duck shoot */
function generateTink(ctx: AudioContext): AudioBuffer {
  return fillBuffer(ctx, 0.15, (t) => {
    const attack = Math.min(t / 0.0005, 1);
    const envelope = attack * Math.exp(-t * 40);
    // Two metallic high frequencies with slight detune for richness
    const freq1 = 2600 + Math.sin(t * 300) * 200;
    const freq2 = 2650 + Math.cos(t * 350) * 180;
    const ping1 = Math.sin(2 * Math.PI * freq1 * t);
    const ping2 = Math.sin(2 * Math.PI * freq2 * t);
    // Subtle overtone
    const overtone = Math.sin(2 * Math.PI * 5200 * t) * 0.15 * Math.exp(-t * 55);
    const click = t < 0.001 ? (1 - t / 0.001) * 0.6 : 0;
    return (ping1 * 0.35 + ping2 * 0.3 + overtone + click) * envelope;
  });
}

/** Filtered noise burst — water splash */
function generateSplash(ctx: AudioContext): AudioBuffer {
  return fillBuffer(ctx, 0.25, (t, i) => {
    const envelope = Math.exp(-t * 16) * (t < 0.02 ? t / 0.02 : 1);
    const raw = noiseSample(i) * envelope;
    // Simple bandpass-ish via AM: modulate noise with a mid frequency
    const center = 600 + Math.sin(t * 300) * 200;
    const filtered = raw * Math.sin(2 * Math.PI * center * t) * 1.5;
    return filtered * 0.45;
  });
}

/** Rising two-note chime — duck reveal */
function generateReveal(ctx: AudioContext): AudioBuffer {
  return fillBuffer(ctx, 0.3, (t) => {
    const envelope = Math.exp(-t * 10);
    const note1 = t < 0.15 ? Math.sin(2 * Math.PI * 660 * t) : 0;
    const note2 =
      t >= 0.12 && t < 0.3 ? Math.sin(2 * Math.PI * 880 * (t - 0.12)) : 0;
    const env2 =
      t >= 0.12 ? Math.exp(-(t - 0.12) * 10) : 0;
    return (note1 * envelope + note2 * env2) * 0.45;
  });
}

/** Three-note ascending cha-ching — jackpot */
function generateJackpot(ctx: AudioContext): AudioBuffer {
  return fillBuffer(ctx, 0.5, (t) => {
    const freqs = [523, 659, 784]; // C5, E5, G5
    let sample = 0;
    for (let n = 0; n < 3; n++) {
      const start = n * 0.13;
      const localT = t - start;
      if (localT >= 0 && localT < 0.15) {
        const env = Math.exp(-localT * 14);
        // Bell-like: mix of sine + some harmonics
        const sine = Math.sin(2 * Math.PI * freqs[n] * localT);
        const overtone =
          Math.sin(2 * Math.PI * freqs[n] * 2.01 * localT) * 0.2;
        sample += (sine + overtone) * env * 0.4;
      }
    }
    return sample;
  });
}

/** Ascending arpeggio of 4 notes — victory fanfare */
function generateFanfare(ctx: AudioContext): AudioBuffer {
  return fillBuffer(ctx, 1.0, (t) => {
    const freqs = [523, 659, 784, 1047]; // C5, E5, G5, C6
    let sample = 0;
    for (let n = 0; n < 4; n++) {
      const start = n * 0.2;
      const localT = t - start;
      if (localT >= 0 && localT < 0.22) {
        const env = Math.exp(-localT * 7);
        const sine = Math.sin(2 * Math.PI * freqs[n] * localT);
        const overtone =
          Math.sin(2 * Math.PI * freqs[n] * 2.01 * localT) * 0.25;
        const tri =
          Math.sin(2 * Math.PI * freqs[n] * 3.0 * localT) * 0.1;
        sample += (sine * 0.5 + overtone + tri) * env;
      }
    }
    // Sustained final note
    if (t >= 0.8) {
      const env = Math.exp(-(t - 0.8) * 4);
      sample += Math.sin(2 * Math.PI * 1047 * t) * env * 0.3;
    }
    return sample;
  });
}

/** Descending sad two-note — lose sound */
function generateLose(ctx: AudioContext): AudioBuffer {
  return fillBuffer(ctx, 0.7, (t) => {
    let sample = 0;
    // First note
    if (t < 0.35) {
      const env = Math.exp(-t * 5);
      sample += Math.sin(2 * Math.PI * 392 * t) * env * 0.3;
      sample += Math.sin(2 * Math.PI * 196 * t) * env * 0.15;
    }
    // Second note (lower, sadder)
    if (t >= 0.3) {
      const localT = t - 0.3;
      const env = Math.exp(-localT * 6);
      sample += Math.sin(2 * Math.PI * 311 * localT) * env * 0.35;
      sample += Math.sin(2 * Math.PI * 156 * localT) * env * 0.2;
    }
    return sample;
  });
}

/** Sparkling high chimes — prize awarded */
function generatePrize(ctx: AudioContext): AudioBuffer {
  return fillBuffer(ctx, 0.4, (t) => {
    const envelope = Math.exp(-t * 8);
    const sparkle =
      Math.sin(2 * Math.PI * 1200 * t) * 0.3 +
      Math.sin(2 * Math.PI * 1800 * t) * 0.2 +
      Math.sin(2 * Math.PI * 2400 * t) * 0.1;
    // Tremolo effect
    const tremolo = 1 + Math.sin(2 * Math.PI * 15 * t) * 0.3;
    return sparkle * envelope * tremolo * 0.6;
  });
}

/** Short coin-like ding — ticket earn */
function generateTicket(ctx: AudioContext): AudioBuffer {
  return fillBuffer(ctx, 0.12, (t) => {
    const envelope = Math.exp(-t * 30);
    const freq = 1400 + Math.sin(t * 400) * 100;
    const body = Math.sin(2 * Math.PI * freq * t);
    const harmonic = Math.sin(2 * Math.PI * freq * 2.5 * t) * 0.2;
    return (body * 0.5 + harmonic) * envelope;
  });
}

/** Low buzzer — insufficient tickets */
function generateDenied(ctx: AudioContext): AudioBuffer {
  return fillBuffer(ctx, 0.35, (t) => {
    const envelope = Math.exp(-t * 8);
    // Saw-like wave approximation via additive synthesis
    let saw = 0;
    for (let h = 1; h <= 5; h++) {
      saw += (Math.sin(2 * Math.PI * 110 * h * t) / h) * 0.15;
    }
    // Pitch droop
    const droop = 1 - t * 1.5;
    return (
      saw *
      Math.max(0.3, droop) *
      envelope *
      0.5
    );
  });
}

/** Filtered noise sweep — swipe whoosh */
function generateWhoosh(ctx: AudioContext): AudioBuffer {
  return fillBuffer(ctx, 0.2, (t, i) => {
    const envelope = Math.sin(Math.PI * t / 0.2) * 0.5;
    const raw = noiseSample(i);
    // Sweep center frequency from high to low
    const centerFreq = 2000 - t * 8000;
    const filtered =
      raw *
      Math.sin(2 * Math.PI * Math.max(200, centerFreq) * t) *
      1.2;
    return filtered * envelope;
  });
}

/** Sustained bell ring — play button */
function generateBell(ctx: AudioContext): AudioBuffer {
  return fillBuffer(ctx, 0.6, (t) => {
    const envelope = Math.exp(-t * 6);
    const freq = 880;
    const strike =
      Math.sin(2 * Math.PI * freq * t) * 0.4 +
      Math.sin(2 * Math.PI * freq * 2.0 * t) * 0.2 +
      Math.sin(2 * Math.PI * freq * 3.01 * t) * 0.1;
    // Subtle beat frequency for richness
    const beat = 1 + Math.sin(2 * Math.PI * 4 * t) * 0.1;
    return strike * envelope * beat * 0.7;
  });
}

/** Fabric rustle — curtain transition */
function generateCurtain(ctx: AudioContext): AudioBuffer {
  return fillBuffer(ctx, 0.35, (t, i) => {
    const envelope =
      t < 0.05
        ? t / 0.05
        : t > 0.28
          ? (0.35 - t) / 0.07
          : 1;
    const raw = noiseSample(i) * 0.3;
    // Bandpass-ish around mid frequencies
    const filtered =
      raw * Math.sin(2 * Math.PI * 500 * t) * 1.5;
    return filtered * envelope * 0.35;
  });
}

// ── Generate All ──────────────────────────────────────

const generators: Record<SfxName, (ctx: AudioContext) => AudioBuffer> = {
  pop: generatePop,
  dart_throw: generateDartThrow,
  bottle_hit: generateBottleHit,
  bottle_chain: generateBottleChain,
  bottle_crash: generateBottleCrash,
  splash: generateSplash,
  reveal: generateReveal,
  jackpot: generateJackpot,
  fanfare: generateFanfare,
  lose: generateLose,
  prize: generatePrize,
  ticket: generateTicket,
  denied: generateDenied,
  whoosh: generateWhoosh,
  bell: generateBell,
  curtain: generateCurtain,
  tink: generateTink,
};

/**
 * Generate all carnival sound effects and return them as a Map
 * of sound name → AudioBuffer.
 */
export function generateAllSounds(
  ctx: AudioContext,
): Map<string, AudioBuffer> {
  const map = new Map<string, AudioBuffer>();
  for (const [name, gen] of Object.entries(generators)) {
    map.set(name, gen(ctx));
  }
  return map;
}
