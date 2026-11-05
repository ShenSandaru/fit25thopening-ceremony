import { describe, expect, it, vi } from "vitest";
import {
  CEREMONY_AUDIO_CONFIG,
  CeremonyAudio,
  type AudioFactory,
  type AudioLike,
} from "./ceremony-audio";

function fakeFactory(autoResolve = false): {
  factory: AudioFactory;
  played: string[];
  paused: string[];
  instances: Map<string, AudioLike>;
} {
  const played: string[] = [];
  const paused: string[] = [];
  const instances = new Map<string, AudioLike>();

  const factory: AudioFactory = (src) => {
    const clip: AudioLike = {
      src,
      loop: false,
      volume: 1,
      preload: "none",
      currentTime: 0,
      play: () => {
        played.push(src);
        return autoResolve ? Promise.resolve() : Promise.reject(new Error("autoplay blocked"));
      },
      pause: () => {
        paused.push(src);
      },
      addEventListener: () => undefined,
    };
    instances.set(src, clip);
    return clip;
  };
  return { factory, played, paused, instances };
}

describe("CeremonyAudio", () => {
  it("records playback failure and still schedules cues", async () => {
    const { factory, played } = fakeFactory(false);
    const audio = new CeremonyAudio(factory);
    audio.preload();
    await audio.unlock();
    expect(audio.unavailable).toBe(true);
    vi.useFakeTimers();
    audio.scheduleCountdown(1_000, 3_000, 1_000);
    vi.advanceTimersByTime(2_100);
    expect(played.length).toBeGreaterThan(1);
    audio.stop();
    vi.useRealTimers();
  });

  it("transitions background music tracks according to ceremony state", async () => {
    const { factory, played, instances } = fakeFactory(true);
    const audio = new CeremonyAudio(factory);
    audio.preload();

    // 1. Unlock with welcome ambience
    await audio.unlock("welcome");
    expect(played).toContain(CEREMONY_AUDIO_CONFIG.tracks.welcome);
    const welcomeClip = instances.get(CEREMONY_AUDIO_CONFIG.tracks.welcome);
    expect(welcomeClip?.loop).toBe(true);

    // 2. Transition to guest waiting track
    await audio.playBackground("waiting");
    expect(played).toContain(CEREMONY_AUDIO_CONFIG.tracks.waiting);
    const waitingClip = instances.get(CEREMONY_AUDIO_CONFIG.tracks.waiting);
    expect(waitingClip?.loop).toBe(true);

    // 3. Transition to launch music
    await audio.playBackground("launch");
    expect(played).toContain(CEREMONY_AUDIO_CONFIG.tracks.launch);

    audio.stop();
  });

  it("cuts background music immediately when countdown begins", () => {
    const { factory, paused, instances } = fakeFactory(true);
    const audio = new CeremonyAudio(factory);
    audio.preload();
    void audio.unlock("waiting");

    vi.useFakeTimers();
    // Countdown start cut
    audio.scheduleCountdown(10_000, 3_000, 10_000);
    const waitingClip = instances.get(CEREMONY_AUDIO_CONFIG.tracks.waiting);
    expect(paused).toContain(CEREMONY_AUDIO_CONFIG.tracks.waiting);
    expect(waitingClip?.volume).toBe(0);

    audio.stop();
    vi.useRealTimers();
  });

  it("schedules countdown ticks and final impact cue", () => {
    const { factory, played } = fakeFactory(true);
    const audio = new CeremonyAudio(factory);
    audio.preload();
    void audio.unlock();

    vi.useFakeTimers();
    audio.scheduleCountdown(1_000, 3_000, 1_000);

    // Advance through 3-second countdown and zero impact
    vi.advanceTimersByTime(3_100);

    // Should play countdown tick cues and impact cue
    expect(played).toContain(CEREMONY_AUDIO_CONFIG.cues.countdown);
    expect(played).toContain(CEREMONY_AUDIO_CONFIG.cues.impact);

    audio.stop();
    vi.useRealTimers();
  });

  it("plays activation confirmation cue without disrupting background music", () => {
    const { factory, played } = fakeFactory(true);
    const audio = new CeremonyAudio(factory);
    audio.preload();
    void audio.unlock("waiting");

    audio.playCue("activation");
    expect(played).toContain(CEREMONY_AUDIO_CONFIG.cues.activation);

    audio.stop();
  });
});
