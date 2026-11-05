import { countdownCueDelays } from "./ceremony-sync";

/**
 * Local placeholder tones. They are not official FIT Expo audio.
 * Missing or blocked playback is recorded and never stops the visual sequence.
 */
export const PLACEHOLDER_AUDIO = {
  ambient: "/audio/placeholders/ambient.wav",
  activation: "/audio/placeholders/activation.wav",
  countdown: "/audio/placeholders/countdown.wav",
  opening: "/audio/placeholders/opening.wav",
} as const;

export type CueName = keyof typeof PLACEHOLDER_AUDIO;

type AudioLike = {
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
  private readonly clips = new Map<CueName, AudioLike>();
  private readonly timers: ReturnType<typeof setTimeout>[] = [];
  private unlocked = false;
  unavailable = false;
  onChange: (() => void) | null = null;

  constructor(factory: AudioFactory = defaultFactory) {
    this.factory = factory;
  }

  preload(): void {
    for (const [name, src] of Object.entries(PLACEHOLDER_AUDIO) as [CueName, string][]) {
      try {
        const clip = this.factory(src);
        clip.preload = "auto";
        clip.addEventListener("error", () => {
          this.markUnavailable();
        });
        this.clips.set(name, clip);
      } catch {
        this.markUnavailable();
      }
    }
  }

  async unlock(): Promise<void> {
    this.unlocked = true;
    const ambient = this.clips.get("ambient");
    if (!ambient) {
      this.markUnavailable();
      return;
    }
    ambient.loop = true;
    ambient.volume = 0.2;
    try {
      await ambient.play();
    } catch {
      this.markUnavailable();
    }
  }

  play(name: Exclude<CueName, "ambient">): void {
    if (!this.unlocked) {
      return;
    }
    const clip = this.clips.get(name);
    if (!clip) {
      this.markUnavailable();
      return;
    }
    try {
      clip.loop = false;
      clip.currentTime = 0;
      void clip.play().catch(() => {
        this.markUnavailable();
      });
    } catch {
      this.markUnavailable();
    }
  }

  scheduleCountdown(startsAt: number, durationMs: number, now: number): void {
    this.clearTimers();
    for (const delay of countdownCueDelays(startsAt, durationMs, now)) {
      this.timers.push(setTimeout(() => this.play("countdown"), delay));
    }
  }

  stop(): void {
    this.clearTimers();
    for (const clip of this.clips.values()) {
      try {
        clip.pause();
      } catch {
        this.markUnavailable();
      }
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
}

function defaultFactory(src: string): AudioLike {
  return new Audio(src);
}
