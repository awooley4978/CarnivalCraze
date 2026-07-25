import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { generateAllSounds } from "~/audio/generateSounds";

// ── Types ─────────────────────────────────────────────

export interface SoundContextType {
  playSfx: (name: string) => void;
  playMusic: (name: string) => void;
  setTempo: (speed: number) => void;
  stopMusic: () => void;
  isMuted: boolean;
  toggleMute: () => void;
}

// ── Music Track Definitions ──────────────────────────

interface MusicNote {
  freq: number;
  dur: number; // relative duration (scaled by tempo)
}

interface MusicTrack {
  notes: MusicNote[];
  bpm: number; // base BPM
}

const MUSIC_TRACKS: Record<string, MusicTrack> = {
  midway: {
    bpm: 140,
    notes: [
      { freq: 523, dur: 1 },
      { freq: 659, dur: 1 },
      { freq: 784, dur: 1 },
      { freq: 659, dur: 0.5 },
      { freq: 523, dur: 0.5 },
      { freq: 659, dur: 1 },
      { freq: 784, dur: 0.5 },
      { freq: 880, dur: 0.5 },
      { freq: 784, dur: 0.5 },
      { freq: 659, dur: 0.5 },
    ],
  },
  balloon: {
    bpm: 130,
    notes: [
      { freq: 330, dur: 0.5 },
      { freq: 349, dur: 0.5 },
      { freq: 330, dur: 0.5 },
      { freq: 349, dur: 0.5 },
      { freq: 330, dur: 1 },
      { freq: 349, dur: 0.25 },
      { freq: 330, dur: 0.25 },
      { freq: 349, dur: 1 },
    ],
  },
  "milk-bottle": {
    bpm: 120,
    notes: [
      { freq: 392, dur: 1 },
      { freq: 440, dur: 0.5 },
      { freq: 494, dur: 0.5 },
      { freq: 440, dur: 0.5 },
      { freq: 392, dur: 0.5 },
      { freq: 349, dur: 1 },
      { freq: 392, dur: 1 },
    ],
  },
  "duck-pond": {
    bpm: 90,
    notes: [
      { freq: 587, dur: 2 },
      { freq: 659, dur: 1.5 },
      { freq: 587, dur: 1 },
      { freq: 523, dur: 2 },
      { freq: 440, dur: 1.5 },
      { freq: 523, dur: 1 },
    ],
  },
  trophy: {
    bpm: 70,
    notes: [
      { freq: 440, dur: 2 },
      { freq: 523, dur: 2 },
      { freq: 659, dur: 2 },
      { freq: 523, dur: 1 },
      { freq: 440, dur: 1.5 },
      { freq: 392, dur: 1.5 },
      { freq: 440, dur: 1 },
    ],
  },
};

// ── Context ───────────────────────────────────────────

const SoundContext = createContext<SoundContextType | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);

  // Refs for audio infrastructure (persist across renders, no state needed)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundsRef = useRef<Map<string, AudioBuffer> | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const sfxGainRef = useRef<GainNode | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const subtoneGainRef = useRef<GainNode | null>(null);

  // Music sequencer state
  const musicPlayingRef = useRef(false);
  const currentMusicRef = useRef<string | null>(null);
  const tempoMultiplierRef = useRef(1.0);
  const noteIndexRef = useRef(0);
  const noteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const musicOscRef = useRef<OscillatorNode | null>(null);
  const subtoneOscRef = useRef<OscillatorNode | null>(null);

  // Mute ref for closure access
  const isMutedRef = useRef(false);
  isMutedRef.current = isMuted;

  // ── Lazy-init audio context ─────────────────────────

  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      // Create gain chain: sources → sfx/music gains → master → destination
      masterGainRef.current = ctx.createGain();
      masterGainRef.current.gain.value = 0.7;
      masterGainRef.current.connect(ctx.destination);

      sfxGainRef.current = ctx.createGain();
      sfxGainRef.current.gain.value = 1.0;
      sfxGainRef.current.connect(masterGainRef.current);

      musicGainRef.current = ctx.createGain();
      musicGainRef.current.gain.value = 0.35;
      musicGainRef.current.connect(masterGainRef.current);

      subtoneGainRef.current = ctx.createGain();
      subtoneGainRef.current.gain.value = 0;
      subtoneGainRef.current.connect(masterGainRef.current);

      // Generate all SFX buffers
      soundsRef.current = generateAllSounds(ctx);
    }

    // Resume if suspended (autoplay policy)
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  }, []);

  // ── Play SFX ────────────────────────────────────────

  const playSfx = useCallback(
    (name: string) => {
      if (isMutedRef.current) return;
      ensureAudio();
      const ctx = audioCtxRef.current;
      const sounds = soundsRef.current;
      const sfxGain = sfxGainRef.current;
      if (!ctx || !sounds || !sfxGain) return;

      const buffer = sounds.get(name);
      if (!buffer) return;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(sfxGain);
      source.start();
    },
    [ensureAudio],
  );

  // ── Stop music sequencer ────────────────────────────

  const stopSequencer = useCallback(() => {
    if (noteTimeoutRef.current) {
      clearTimeout(noteTimeoutRef.current);
      noteTimeoutRef.current = null;
    }
    if (musicOscRef.current) {
      try {
        musicOscRef.current.stop();
      } catch {
        // already stopped
      }
      musicOscRef.current.disconnect();
      musicOscRef.current = null;
    }
    if (subtoneOscRef.current) {
      try {
        subtoneOscRef.current.stop();
      } catch {
        // already stopped
      }
      subtoneOscRef.current.disconnect();
      subtoneOscRef.current = null;
    }
    musicPlayingRef.current = false;
  }, []);

  // ── Play a single note on the music oscillator ──────

  const playMusicNote = useCallback(
    (freq: number, durSec: number) => {
      const ctx = audioCtxRef.current;
      const musicGain = musicGainRef.current;
      if (!ctx || !musicGain) return;

      // Create a new oscillator for this note
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;

      // Envelope: quick attack, sustain, quick release
      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0, ctx.currentTime);
      noteGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.01);
      noteGain.gain.setValueAtTime(0.5, ctx.currentTime + durSec - 0.02);
      noteGain.gain.linearRampToValueAtTime(0, ctx.currentTime + durSec);

      osc.connect(noteGain);
      noteGain.connect(musicGain);

      osc.start();
      osc.stop(ctx.currentTime + durSec + 0.05);

      // Store reference for stop
      musicOscRef.current = osc;

      // Cleanup when done
      osc.onended = () => {
        if (musicOscRef.current === osc) {
          musicOscRef.current = null;
        }
      };
    },
    [],
  );

  // ── Schedule next note in sequence ──────────────────

  const scheduleNextNote = useCallback(() => {
    if (!musicPlayingRef.current) return;

    const trackName = currentMusicRef.current;
    if (!trackName) return;

    const track = MUSIC_TRACKS[trackName];
    if (!track) return;

    const note = track.notes[noteIndexRef.current % track.notes.length];
    const tempo = tempoMultiplierRef.current;
    const beatSec = 60 / track.bpm / tempo;
    const durSec = note.dur * beatSec;

    playMusicNote(note.freq, durSec);

    noteIndexRef.current =
      (noteIndexRef.current + 1) % track.notes.length;

    // Schedule next note
    noteTimeoutRef.current = setTimeout(() => {
      scheduleNextNote();
    }, durSec * 1000 * 0.85); // slight overlap for legato feel
  }, [playMusicNote]);

  // ── Play Music ──────────────────────────────────────

  const playMusic = useCallback(
    (name: string) => {
      if (isMutedRef.current) return;
      ensureAudio();
      const ctx = audioCtxRef.current;
      const musicGain = musicGainRef.current;
      if (!ctx || !musicGain) return;

      // If same track already playing, skip
      if (currentMusicRef.current === name && musicPlayingRef.current) return;

      // Crossfade: briefly dip gain, switch, bring back
      if (musicPlayingRef.current && currentMusicRef.current) {
        musicGain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        stopSequencer();

        // Start new after brief pause
        setTimeout(() => {
          if (!isMutedRef.current && audioCtxRef.current) {
            currentMusicRef.current = name;
            noteIndexRef.current = 0;
            musicPlayingRef.current = true;
            musicGain.gain.linearRampToValueAtTime(
              0.35,
              audioCtxRef.current.currentTime + 0.2,
            );
            scheduleNextNote();
          }
        }, 250);
      } else {
        // First time starting music
        currentMusicRef.current = name;
        noteIndexRef.current = 0;
        musicPlayingRef.current = true;
        musicGain.gain.setValueAtTime(0.35, ctx.currentTime);
        scheduleNextNote();
      }
    },
    [ensureAudio, stopSequencer, scheduleNextNote],
  );

  // ── Set Tempo ───────────────────────────────────────

  const setTempo = useCallback(
    (speed: number) => {
      tempoMultiplierRef.current = speed;

      // Subtone/hum: activate low oscillator when speed > 1.0
      const ctx = audioCtxRef.current;
      const subtoneGain = subtoneGainRef.current;
      if (!ctx || !subtoneGain) return;

      if (speed > 1.0 && !subtoneOscRef.current) {
        // Start subtone
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 55; // Low A — sub-bass hum
        osc.connect(subtoneGain);
        osc.start();
        subtoneOscRef.current = osc;
        subtoneGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.3);
      } else if (speed <= 1.0 && subtoneOscRef.current) {
        // Remove subtone
        subtoneGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        setTimeout(() => {
          if (subtoneOscRef.current) {
            try {
              subtoneOscRef.current.stop();
            } catch {
              // already stopped
            }
            subtoneOscRef.current.disconnect();
            subtoneOscRef.current = null;
          }
        }, 600);
      }
    },
    [],
  );

  // ── Stop Music ──────────────────────────────────────

  const stopMusic = useCallback(() => {
    const ctx = audioCtxRef.current;
    const musicGain = musicGainRef.current;
    const subtoneGain = subtoneGainRef.current;

    if (musicGain && ctx) {
      musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    }
    if (subtoneGain && ctx) {
      subtoneGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    }

    stopSequencer();
    tempoMultiplierRef.current = 1.0;
    currentMusicRef.current = null;
  }, [stopSequencer]);

  // ── Toggle Mute ─────────────────────────────────────

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newMuted = !prev;
      const masterGain = masterGainRef.current;
      const ctx = audioCtxRef.current;

      if (masterGain && ctx) {
        masterGain.gain.linearRampToValueAtTime(
          newMuted ? 0 : 0.7,
          ctx.currentTime + 0.1,
        );
      }

      return newMuted;
    });
  }, []);

  // ── Cleanup on unmount ──────────────────────────────

  useEffect(() => {
    return () => {
      stopSequencer();
      if (subtoneOscRef.current) {
        try {
          subtoneOscRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopSequencer]);

  // ── Value ───────────────────────────────────────────

  const value: SoundContextType = {
    playSfx,
    playMusic,
    setTempo,
    stopMusic,
    isMuted,
    toggleMute,
  };

  return (
    <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────

export function useSound(): SoundContextType {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    throw new Error("useSound must be used within a SoundProvider");
  }
  return ctx;
}
