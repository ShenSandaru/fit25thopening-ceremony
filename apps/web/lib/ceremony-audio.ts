import { countdownCueDelays } from "./ceremony-sync";

/**
 * Centralized Ceremony Audio Configuration.
 * Volume levels and asset mappings adhere to formal university event requirements.
 */
export const CEREMONY_AUDIO_CONFIG = {
  tracks: {
    welcome: "/audio/placeholders/ambient.wav",
    waiting: "/audio/placeholders/Bluewave - A Better Future (freetouse.com).mp3",
    launch: "/audio/placeholders/Bluewave - A Better Future (freetouse.com).mp3",
  },
  cues: {
    activation: "/audio/placeholders/activation.wav",
    countdown: "/audio/placeholders/countdown.wav",
    sync: "/audio/placeholders/voiceover.wav",
    impact: "/audio/placeholders/opening.wav",
    voiceover: "/audio/placeholders/voiceover.wav",
    opening: "/audio/placeholders/opening.wav",
    ambient: "/audio/placeholders/ambient.wav",
  },
  volumes: {
    welcomeAmbience: 0.3, // 25–35%
    guestWaitingMusic: 0.35, // 30–40%
    activationConfirmation: 0.55, // 45–60%
    countdownCues: 0.65, // 55–70%
    finalLaunchMusic: 0.5, // 40–55%
    syncTransition: 0.55, // 50–60%
    impactCue: 0.65, // 55–70%
  },
  fades: {
    standardMs: 800,
    quickCutMs: 250,
    launchFadeInMs: 1200,
  },
} as const;

export type BackgroundTrackName = keyof typeof CEREMONY_AUDIO_CONFIG.tracks;
export type CueName = keyof typeof CEREMONY_AUDIO_CONFIG.cues;

export type AudioLike = {
  src: string;
  loop: boolean;
  volume: number;
  preload: string;
  currentTime: number;
  play: () => Promise<void>;
  pause: () => void;
  addEventListener: (type: string, listener: () => void) => void;
};

export type AudioFactory = (src: string) => AudioLike;

export class CeremonyAudio {
  private readonly factory: AudioFactory;
  private readonly clips = new Map<string, AudioLike>();
  private readonly timers: ReturnType<typeof setTimeout>[] = [];
  private readonly fadeIntervals = new Set<ReturnType<typeof setInterval>>();
  private audioCtx: AudioContext | null = null;
  private unlocked = false;
  private currentBgTrack: BackgroundTrackName | null = null;

  unavailable = false;
  onChange: (() => void) | null = null;

  constructor(factory: AudioFactory = defaultFactory) {
    this.factory = factory;
  }

  preload(): void {
    // Preload background music tracks
    for (const src of Object.values(CEREMONY_AUDIO_CONFIG.tracks)) {
      this.getOrCreateClip(src, true);
    }
    // Preload one-time sound effect cues
    for (const src of Object.values(CEREMONY_AUDIO_CONFIG.cues)) {
      this.getOrCreateClip(src, false);
    }
  }

  private getOrCreateClip(src: string, loop: boolean): AudioLike | null {
    if (this.clips.has(src)) {
      return this.clips.get(src)!;
    }
    try {
      const clip = this.factory(src);
      clip.preload = "auto";
      clip.loop = loop;
      clip.volume = 0;
      clip.addEventListener("error", () => {
        this.markUnavailable();
      });
      this.clips.set(src, clip);
      return clip;
    } catch {
      this.markUnavailable();
      return null;
    }
  }

  async unlock(initialTrack?: BackgroundTrackName): Promise<void> {
    this.unlocked = true;
    this.initAudioContext();
    if (initialTrack) {
      await this.playBackground(initialTrack);
    } else {
      await this.playBackground("welcome");
    }
  }

  /**
   * Smoothly transitions background music according to the ceremony state.
   * Only one background music track plays at any given time.
   */
  async playBackground(track: BackgroundTrackName): Promise<void> {
    if (!this.unlocked) {
      this.currentBgTrack = track;
      return;
    }

    if (this.currentBgTrack === track) {
      // Already playing this background track
      return;
    }

    const prevTrack = this.currentBgTrack;
    this.currentBgTrack = track;

    // Smoothly fade out previous track if playing
    if (prevTrack) {
      const prevSrc = CEREMONY_AUDIO_CONFIG.tracks[prevTrack];
      const prevClip = this.clips.get(prevSrc);
      if (prevClip) {
        this.fadeVolume(prevClip, 0, CEREMONY_AUDIO_CONFIG.fades.standardMs, () => {
          prevClip.pause();
        });
      }
    }

    const newSrc = CEREMONY_AUDIO_CONFIG.tracks[track];
    const newClip = this.getOrCreateClip(newSrc, true);
    if (!newClip) {
      this.markUnavailable();
      return;
    }

    const targetVolume =
      track === "welcome"
        ? CEREMONY_AUDIO_CONFIG.volumes.welcomeAmbience
        : track === "waiting"
          ? CEREMONY_AUDIO_CONFIG.volumes.guestWaitingMusic
          : CEREMONY_AUDIO_CONFIG.volumes.finalLaunchMusic;

    const fadeInDuration =
      track === "launch"
        ? CEREMONY_AUDIO_CONFIG.fades.launchFadeInMs
        : CEREMONY_AUDIO_CONFIG.fades.standardMs;

    newClip.loop = true;
    newClip.volume = 0;
    newClip.currentTime = 0;

    try {
      await newClip.play();
      this.fadeVolume(newClip, targetVolume, fadeInDuration);
    } catch {
      this.markUnavailable();
    }
  }

  /**
   * Fades out or immediately halts background music (e.g. during countdown).
   */
  stopBackground(immediate = false): void {
    if (!this.currentBgTrack) {
      return;
    }
    const currentSrc = CEREMONY_AUDIO_CONFIG.tracks[this.currentBgTrack];
    this.currentBgTrack = null;
    const clip = this.clips.get(currentSrc);
    if (!clip) {
      return;
    }

    if (immediate) {
      clip.pause();
      clip.volume = 0;
    } else {
      this.fadeVolume(clip, 0, CEREMONY_AUDIO_CONFIG.fades.quickCutMs, () => {
        clip.pause();
      });
    }
  }

  /**
   * Plays a one-time sound effect cue without interrupting background music.
   */
  playCue(name: CueName): void {
    if (!this.unlocked) {
      return;
    }

    this.playSynthesizedCue(name);

    const src = CEREMONY_AUDIO_CONFIG.cues[name];
    if (!src) {
      return;
    }
    const clip = this.getOrCreateClip(src, false);
    if (!clip) {
      this.markUnavailable();
      return;
    }

    const volume =
      name === "activation"
        ? CEREMONY_AUDIO_CONFIG.volumes.activationConfirmation
        : name === "countdown"
          ? CEREMONY_AUDIO_CONFIG.volumes.countdownCues
          : name === "sync"
            ? CEREMONY_AUDIO_CONFIG.volumes.syncTransition
            : CEREMONY_AUDIO_CONFIG.volumes.impactCue;

    try {
      clip.loop = false;
      clip.volume = volume;
      clip.currentTime = 0;
      void clip.play().catch(() => {
        this.markUnavailable();
      });
    } catch {
      this.markUnavailable();
    }
  }

  /**
   * Backwards-compatible alias for playCue.
   */
  play(name: CueName): void {
    this.playCue(name);
  }

  /**
   * Schedules countdown audio synchronized with server time.
   * Background music is immediately cut to guarantee countdown audio priority.
   */
  scheduleCountdown(startsAt: number, durationMs: number, now: number): void {
    this.clearTimers();
    // Countdown audio has absolute priority; cut previous background tracks immediately
    this.stopBackground(true);

    // Schedule 3, 2, 1 countdown audio cues
    for (const delay of countdownCueDelays(startsAt, durationMs, now)) {
      this.timers.push(setTimeout(() => this.playCue("countdown"), delay));
    }

    // Schedule final impact / transition cue when countdown reaches zero
    const impactDelay = startsAt + durationMs - now;
    if (impactDelay >= -200) {
      this.timers.push(setTimeout(() => this.playCue("impact"), Math.max(0, impactDelay)));
    }
  }

  stop(): void {
    this.clearTimers();
    this.clearFadeIntervals();
    this.currentBgTrack = null;
    for (const clip of this.clips.values()) {
      try {
        clip.pause();
        clip.volume = 0;
      } catch {
        this.markUnavailable();
      }
    }
  }

  private fadeVolume(
    clip: AudioLike,
    targetVolume: number,
    durationMs: number,
    onComplete?: () => void,
  ): void {
    const steps = 16;
    const intervalMs = Math.max(16, Math.floor(durationMs / steps));
    const startVolume = clip.volume;
    const delta = (targetVolume - startVolume) / steps;
    let stepCount = 0;

    const timer = setInterval(() => {
      stepCount += 1;
      if (stepCount >= steps) {
        clip.volume = Math.max(0, Math.min(1, targetVolume));
        clearInterval(timer);
        this.fadeIntervals.delete(timer);
        onComplete?.();
      } else {
        clip.volume = Math.max(0, Math.min(1, clip.volume + delta));
      }
    }, intervalMs);

    this.fadeIntervals.add(timer);
  }

  private initAudioContext(): AudioContext | null {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        return null;
      }
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === "suspended") {
        void this.audioCtx.resume().catch(() => undefined);
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  private playSynthesizedCue(cue: CueName): void {
    const ctx = this.initAudioContext();
    if (!ctx) {
      return;
    }
    try {
      const now = ctx.currentTime;
      if (cue === "activation") {
        // High-tech ascending laser chirp
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (cue === "countdown") {
        // Deep sub-bass pulse with resonant attack
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (cue === "sync" || cue === "voiceover") {
        // Robotic harmonic chime for synchronization sequence
        const freqs = [330, 440, 660];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.2, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + 1.3);
        });
      } else if (cue === "impact" || cue === "opening") {
        // Futuristic chord sweep in gold harmony
        const freqs = [220, 277.18, 329.63, 440, 554.37, 659.25];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = idx % 2 === 0 ? "triangle" : "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.04);
          gain.gain.setValueAtTime(0.12, now + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.04);
          osc.stop(now + 2.3);
        });
      }
    } catch {
      // Audio synthesis is non-blocking and best-effort
    }
  }

  private markUnavailable(): void {
    this.unavailable = true;
    this.onChange?.();
  }

  private clearTimers(): void {
    for (const timer of this.timers.splice(0)) {
      clearTimeout(timer);
    }
  }

  private clearFadeIntervals(): void {
    for (const interval of this.fadeIntervals) {
      clearInterval(interval);
    }
    this.fadeIntervals.clear();
  }
}

function defaultFactory(src: string): AudioLike {
  return new Audio(src);
}
