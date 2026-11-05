import { describe, expect, it, vi } from "vitest";
import { CeremonyAudio, type AudioFactory } from "./ceremony-audio";

function fakeFactory(): { factory: AudioFactory; played: string[] } {
  const played: string[] = [];
  const factory: AudioFactory = (src) => ({
    src,
    loop: false,
    volume: 1,
    preload: "none",
    currentTime: 0,
    play: () => {
      played.push(src);
      return Promise.reject(new Error("autoplay blocked"));
    },
    pause: () => undefined,
    addEventListener: () => undefined,
  });
  return { factory, played };
}

describe("CeremonyAudio", () => {
  it("records playback failure and still schedules cues", async () => {
    const { factory, played } = fakeFactory();
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
});
