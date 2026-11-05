import { countdownCueDelays } from "./ceremony-sync";

/**
 * Centralized Ceremony Audio Configuration.
 * Volume levels and asset mappings adhere to formal university event requirements.
 */
export const CEREMONY_AUDIO_CONFIG = {
  tracks: {
    welcome: "/audio/bg_music.mp3",
    waiting: "/audio/bg_music.mp3",
    launch: "/audio/bg_music.mp3",
  },
  cues: {
    activation: "/audio/placeholders/activation.wav",
    countdown: "/audio/placeholders/countdown.wav",
    sync: "/audio/placeholders/voiceover.wav",
    impact: "/audio/placeholders/fitexpo.wav",
    voiceover: "/audio/placeholders/voiceover.wav",
    opening: "/audio/placeholders/fitexpo.wav",
    ambient: "/audio/placeholders/ambient.wav",
  },
  volumes: {
    welcomeAmbience: 0.3, // 25–35%
    guestWaitingMusic: 0.35, // 30–40%
    activationConfirmation: 0.55, // 45–60%
    countdownCues: 0.65, // 55–70%
    finalLaunchMusic: 0.5, // 40–55%
    syncTransition: 0.55, // 50–60%
    impactCue: 1.0, // 100% full-power celebratory launch voiceover
  },
  fades: {
    standardMs: 800,
    quickCutMs: 250,
    launchFadeInMs: 2000,
    voiceoverHoldMs: 5000,
    voiceoverFadeOutMs: 2000,
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
  private readonly clipFadeIntervals = new Map<AudioLike, ReturnType<typeof setInterval>>();
  private audioCtx: AudioContext | null = null;
  private unlocked = false;
  private currentBgTrack: BackgroundTrackName | null = null;
  private pausedBgTrack: BackgroundTrackName | null = null;
  private lastBlastAt = 0;

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

    const newSrc = CEREMONY_AUDIO_CONFIG.tracks[track];
    const prevSrc = prevTrack ? CEREMONY_AUDIO_CONFIG.tracks[prevTrack] : null;

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

    // If transitioning between stages that share the exact same audio asset
    // (e.g. welcome -> waiting using bg_music.mp3), adjust volume smoothly
    // without cutting, pausing, or restarting the track.
    if (prevSrc && prevSrc === newSrc) {
      const clip = this.clips.get(newSrc);
      if (clip) {
        this.fadeVolume(clip, targetVolume, CEREMONY_AUDIO_CONFIG.fades.standardMs);
        return;
      }
    }

    // Stop and fade out previous background track to prevent overlapping music
    if (prevTrack) {
      const prevClip = prevSrc ? this.clips.get(prevSrc) : null;
      if (prevClip) {
        this.fadeVolume(prevClip, 0, CEREMONY_AUDIO_CONFIG.fades.standardMs, () => {
          prevClip.pause();
        });
      }
    }

    // Ensure any other background tracks that are not newSrc are fully paused and cleared
    for (const src of Object.values(CEREMONY_AUDIO_CONFIG.tracks)) {
      if (src !== newSrc && src !== prevSrc) {
        const otherClip = this.clips.get(src);
        if (otherClip) {
          this.clearFadeForClip(otherClip);
          otherClip.pause();
          otherClip.volume = 0;
        }
      }
    }

    const newClip = this.getOrCreateClip(newSrc, true);
    if (!newClip) {
      this.markUnavailable();
      return;
    }

    this.clearFadeForClip(newClip);
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
   * Mutes and pauses background music (e.g. during countdown),
   * preserving playback position so it can be resumed after countdown is over.
   */
  pauseBackground(immediate = false): void {
    if (!this.currentBgTrack) {
      return;
    }
    const currentSrc = CEREMONY_AUDIO_CONFIG.tracks[this.currentBgTrack];
    this.pausedBgTrack = this.currentBgTrack;
    this.currentBgTrack = null;
    const clip = this.clips.get(currentSrc);
    if (!clip) {
      return;
    }

    if (immediate) {
      this.clearFadeForClip(clip);
      clip.pause();
      clip.volume = 0;
    } else {
      this.fadeVolume(clip, 0, CEREMONY_AUDIO_CONFIG.fades.quickCutMs, () => {
        clip.pause();
      });
    }
  }

  /**
   * Resumes background music after countdown finishes or pause ends.
   * Restores playback from the paused position rather than restarting from zero.
   */
  async resumeBackground(track?: BackgroundTrackName): Promise<void> {
    const targetTrack = track ?? this.pausedBgTrack ?? "launch";
    this.pausedBgTrack = null;

    if (!this.unlocked) {
      this.currentBgTrack = targetTrack;
      return;
    }

    if (this.currentBgTrack === targetTrack) {
      return;
    }

    this.currentBgTrack = targetTrack;

    const newSrc = CEREMONY_AUDIO_CONFIG.tracks[targetTrack];
    const newClip = this.getOrCreateClip(newSrc, true);
    if (!newClip) {
      this.markUnavailable();
      return;
    }

    const targetVolume =
      targetTrack === "welcome"
        ? CEREMONY_AUDIO_CONFIG.volumes.welcomeAmbience
        : targetTrack === "waiting"
          ? CEREMONY_AUDIO_CONFIG.volumes.guestWaitingMusic
          : CEREMONY_AUDIO_CONFIG.volumes.finalLaunchMusic;

    const fadeInDuration =
      targetTrack === "launch"
        ? CEREMONY_AUDIO_CONFIG.fades.launchFadeInMs
        : CEREMONY_AUDIO_CONFIG.fades.standardMs;

    this.clearFadeForClip(newClip);
    newClip.loop = true;
    newClip.volume = 0;
    // Note: Do not reset currentTime = 0, resume from current position

    try {
      await newClip.play();
      this.fadeVolume(newClip, targetVolume, fadeInDuration);
    } catch {
      this.markUnavailable();
    }
  }

  /**
   * Stops background music and resets playback position.
   */
  stopBackground(immediate = false): void {
    this.pausedBgTrack = null;
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
      this.clearFadeForClip(clip);
      clip.pause();
      clip.volume = 0;
      clip.currentTime = 0;
    } else {
      this.fadeVolume(clip, 0, CEREMONY_AUDIO_CONFIG.fades.quickCutMs, () => {
        clip.pause();
        clip.currentTime = 0;
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

    if (name === "impact" || name === "opening") {
      const now = Date.now();
      if (this.lastBlastAt > 0 && now - this.lastBlastAt < 1500) {
        return;
      }
      this.lastBlastAt = now;
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

    if (name === "impact" || name === "opening") {
      // Keep background music paused while the 5-second inauguration voiceover plays
      this.pauseBackground(true);
      this.clearFadeForClip(clip);
    }

    try {
      clip.loop = false;
      clip.volume = volume;
      clip.currentTime = 0;
      void clip.play().catch(() => {
        this.markUnavailable();
      });

      if (name === "impact" || name === "opening") {
        // After 5 seconds of the fitexpo.wav voice clip, gradually reduce its sound
        // and smoothly continue the previous background music track.
        const holdTimer = setTimeout(() => {
          this.fadeVolume(clip, 0, CEREMONY_AUDIO_CONFIG.fades.voiceoverFadeOutMs, () => {
            clip.pause();
            clip.currentTime = 0;
          });
          void this.resumeBackground("launch");
        }, CEREMONY_AUDIO_CONFIG.fades.voiceoverHoldMs);
        this.timers.push(holdTimer);
      }
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
   * Background music is muted and paused to guarantee countdown audio priority.
   */
  scheduleCountdown(startsAt: number, durationMs: number, now: number): void {
    this.clearTimers();
    // Countdown audio has absolute priority; mute/pause background music during countdown
    this.pauseBackground(true);

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
    this.pausedBgTrack = null;
    this.lastBlastAt = 0;
    for (const clip of this.clips.values()) {
      try {
        clip.pause();
        clip.volume = 0;
        clip.currentTime = 0;
      } catch {
        this.markUnavailable();
      }
    }
  }

  private clearFadeForClip(clip: AudioLike): void {
    const existing = this.clipFadeIntervals.get(clip);
    if (existing) {
      clearInterval(existing);
      this.fadeIntervals.delete(existing);
      this.clipFadeIntervals.delete(clip);
    }
  }

  private fadeVolume(
    clip: AudioLike,
    targetVolume: number,
    durationMs: number,
    onComplete?: () => void,
  ): void {
    this.clearFadeForClip(clip);

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
        this.clipFadeIntervals.delete(clip);
        onComplete?.();
      } else {
        clip.volume = Math.max(0, Math.min(1, clip.volume + delta));
      }
    }, intervalMs);

    this.fadeIntervals.add(timer);
    this.clipFadeIntervals.set(clip, timer);
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
      }
      // Note: "impact" and "opening" use the dedicated /audio/placeholders/opening.mp3 asset directly without synthetic overlay.
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
    this.clipFadeIntervals.clear();
  }
}

function defaultFactory(src: string): AudioLike {
  return new Audio(src);
}
