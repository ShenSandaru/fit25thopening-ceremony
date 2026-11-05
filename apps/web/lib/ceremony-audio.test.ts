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
    await audio.unlock("waiting");
    expect(audio.unavailable).toBe(true);
    vi.useFakeTimers();
    audio.scheduleCountdown(1_000, 3_000, 1_000);
    vi.advanceTimersByTime(2_100);
    expect(played.length).toBeGreaterThan(1);
    audio.stop();
    vi.useRealTimers();
  });

  it("does not start background music on generic unlock until activation begins", async () => {
    const { factory, played } = fakeFactory(true);
    const audio = new CeremonyAudio(factory);
    audio.preload();

    // Standby / presentation unlock without initial track: does not play music
    await audio.unlock();
    expect(played).toHaveLength(0);

    // Operator clicks begin activations: music starts
    await audio.playBackground("waiting");
    expect(played).toContain("/audio/bg_music.mp3");

    audio.stop();
  });

  it("mutes and pauses during countdown, then resumes after countdown finishes", async () => {
    const { factory, played, paused, instances } = fakeFactory(true);
    const audio = new CeremonyAudio(factory);
    audio.preload();

    // Start music upon activation
    await audio.unlock("waiting");
    expect(played).toContain("/audio/bg_music.mp3");
    const clip = instances.get("/audio/bg_music.mp3")!;
    clip.currentTime = 12.5;

    // Countdown starts: music is muted and paused
    vi.useFakeTimers();
    audio.scheduleCountdown(10_000, 3_000, 10_000);
    expect(paused).toContain("/audio/bg_music.mp3");
    expect(clip.volume).toBe(0);

    // Countdown completes: music is resumed from previous position (currentTime not reset to 0)
    await audio.resumeBackground("launch");
    expect(clip.currentTime).toBe(12.5);

    audio.stop();
    vi.useRealTimers();
  });

  it("configures the new background music asset while preserving cues", () => {
    expect(CEREMONY_AUDIO_CONFIG.tracks.welcome).toBe("/audio/bg_music.mp3");
    expect(CEREMONY_AUDIO_CONFIG.tracks.waiting).toBe("/audio/bg_music.mp3");
    expect(CEREMONY_AUDIO_CONFIG.tracks.launch).toBe("/audio/bg_music.mp3");
    expect(CEREMONY_AUDIO_CONFIG.cues.activation).toBe("/audio/placeholders/activation.wav");
    expect(CEREMONY_AUDIO_CONFIG.cues.countdown).toBe("/audio/placeholders/countdown.wav");
    expect(CEREMONY_AUDIO_CONFIG.cues.sync).toBe("/audio/placeholders/voiceover.wav");
    expect(CEREMONY_AUDIO_CONFIG.cues.impact).toBe("/audio/placeholders/fitexpo.wav");
    expect(CEREMONY_AUDIO_CONFIG.cues.opening).toBe("/audio/placeholders/fitexpo.wav");
  });

  it("fades out fitexpo.wav after 5 seconds and smoothly resumes background music", async () => {
    const { factory, played, paused, instances } = fakeFactory(true);
    const audio = new CeremonyAudio(factory);
    audio.preload();

    await audio.unlock("waiting");
    const bgClip = instances.get("/audio/bg_music.mp3")!;
    bgClip.currentTime = 18.4;

    vi.useFakeTimers();
    audio.pauseBackground(true);
    audio.playCue("impact");

    const voiceClip = instances.get("/audio/placeholders/fitexpo.wav")!;
    expect(played).toContain("/audio/placeholders/fitexpo.wav");
    expect(voiceClip.volume).toBe(1);

    // Advance 5 seconds: voice clip begins fading out and bg_music resumes from 18.4s
    await vi.advanceTimersByTimeAsync(5_000);
    expect(bgClip.currentTime).toBe(18.4);

    // Advance through the 2-second fade transition
    await vi.advanceTimersByTimeAsync(2_100);
    expect(voiceClip.volume).toBe(0);
    expect(paused).toContain("/audio/placeholders/fitexpo.wav");
    expect(bgClip.volume).toBeCloseTo(CEREMONY_AUDIO_CONFIG.volumes.finalLaunchMusic, 2);

    audio.stop();
    vi.useRealTimers();
  });

  it("transitions background music tracks according to ceremony state", async () => {
    const { factory, played, instances } = fakeFactory(true);
    const audio = new CeremonyAudio(factory);
    audio.preload();

    // 1. Unlock with welcome ambience
    await audio.unlock("welcome");
    expect(played).toContain("/audio/bg_music.mp3");
    const welcomeClip = instances.get(CEREMONY_AUDIO_CONFIG.tracks.welcome);
    expect(welcomeClip?.loop).toBe(true);

    // 2. Transition to guest waiting track (adjusts volume without restarting)
    await audio.playBackground("waiting");
    expect(played).toContain("/audio/bg_music.mp3");
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
