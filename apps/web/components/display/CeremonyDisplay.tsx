"use client";

import { PROJECT_NAME } from "@fit-expo/shared";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useCeremonyChannel } from "@/hooks/use-ceremony-channel";
import { countdownSecondsRemaining, displayView } from "@/lib/ceremony-sync";
import { FuturisticHudOverlay } from "./FuturisticHudOverlay";
import { UniversityLogoProgress } from "./UniversityLogoProgress";
import { HolographicHandprints } from "./HolographicHandprints";
import { SystemInitialization } from "./SystemInitialization";
import { FuturisticCountdown } from "./FuturisticCountdown";
import { LaunchReveal } from "./LaunchReveal";

type Claim = "pending" | "ready" | "taken" | "guest-browser";

export function CeremonyDisplay() {
  const [claim, setClaim] = useState<Claim>("pending");
  const channel = useCeremonyChannel(claim === "ready", true);
  const synced = displayView({
    state: channel.ceremony,
    connected: channel.connected,
    now: channel.now,
  });
  const view = claim === "ready" ? synced : claim === "pending" ? "reconnecting" : claim;
  const seconds =
    channel.ceremony?.countdown && view === "countdown"
      ? countdownSecondsRemaining(channel.ceremony.countdown.opensAt, channel.now)
      : null;

  const activatedCount = channel.ceremony?.activations
    ? Object.values(channel.ceremony.activations).filter((a) => a !== null).length
    : 0;

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/display-sessions/claim", { method: "POST", credentials: "include" })
      .then(async (response) => {
        if (cancelled) {
          return;
        }
        if (response.ok) {
          setClaim("ready");
          return;
        }
        const body = (await response.json()) as { error?: { message?: string } };
        setClaim(body.error?.message?.includes("guest") ? "guest-browser" : "taken");
      })
      .catch(() => {
        if (!cancelled) {
          setClaim("taken");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function begin() {
    await channel.audioRef.current?.unlock("waiting");
    await fetch("/api/event/begin-activations", {
      method: "POST",
      credentials: "include",
    });
  }

  async function present() {
    const root = document.documentElement;
    try {
      if (!document.fullscreenElement && document.fullscreenEnabled) {
        await Promise.race([
          root.requestFullscreen(),
          new Promise((resolve) => setTimeout(resolve, 400)),
        ]);
      }
    } catch {
      // Fullscreen can be denied; ceremony continues.
    }
    const initialTrack =
      channel.ceremony?.status === "COLLECTING_ACTIVATIONS"
        ? "waiting"
        : channel.ceremony?.status === "OPENED"
          ? "launch"
          : "welcome";
    await channel.audioRef.current?.unlock(initialTrack);
  }

  return (
    <main
      data-display-view={view}
      className="display-stage relative flex h-dvh w-screen items-center justify-center overflow-hidden bg-slate-950 text-white font-sans selection:bg-gold selection:text-navy-blue"
    >
      {/* Sci-Fi HUD Ambient Canvas & Grid Overlay */}
      <FuturisticHudOverlay />

      {/* Main Display Stage Container */}
      <section className="relative z-10 flex h-full max-h-dvh w-full max-w-[calc(100dvh*16/9)] flex-col items-center justify-between overflow-hidden px-4 py-4 sm:px-8 sm:py-6 text-center">
        {/* View-Specific Content Frame */}
        <div className="flex w-full flex-1 flex-col items-center justify-center">
          {view === "reconnecting" ? (
            <div className="flex flex-col items-center gap-4">
              <div className="size-16 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <h1
                style={{ fontFamily: "var(--font-outfit), Outfit, sans-serif" }}
                className="font-heading text-4xl sm:text-5xl font-bold tracking-wide"
              >
                Connecting to Launch Subsystem…
              </h1>
              <p className="font-mono text-cyan-300/80 text-sm">INITIALIZING SECURE SOCKET LINK</p>
            </div>
          ) : view === "taken" ? (
            <div className="flex flex-col items-center gap-4">
              <h1 className="font-heading text-4xl sm:text-5xl font-bold text-red-400">
                Display Terminal Active Elsewhere
              </h1>
              <p className="font-mono text-white/70">
                Only one authoritative display session is permitted.
              </p>
            </div>
          ) : view === "guest-browser" ? (
            <div className="flex flex-col items-center gap-4">
              <h1 className="font-heading text-4xl sm:text-5xl font-bold text-amber-300">
                Tablet Assigned to Guest
              </h1>
              <p className="font-mono text-white/70">
                This browser instance is currently linked to an active guest tablet session.
              </p>
            </div>
          ) : view === "welcome" ? (
            <div className="display-enter flex flex-col items-center justify-center gap-[clamp(0.5rem,1.8vh,1.5rem)] max-w-4xl px-4 select-none">
              {/* Official Ceremony Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-navy-blue/80 px-4 py-1 text-gold font-mono text-[11px] sm:text-xs tracking-[0.25em] uppercase shadow-[0_0_15px_rgba(201,162,39,0.2)]">
                <span className="size-1.5 rounded-full bg-gold animate-pulse" />
                OFFICIAL OPENING CEREMONY
                <span className="size-1.5 rounded-full bg-cyan-400" />
              </div>

              {/* Prominent Official FIT 25th Anniversary Logo */}
              <div className="relative my-1 sm:my-3 flex items-center justify-center">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute size-[clamp(160px,26vh,280px)] rounded-full bg-radial from-gold/25 via-gold/10 to-transparent blur-2xl"
                />
                <Image
                  src="/images/FIT-25th-Anniversary-White.png"
                  alt="FIT 25th Anniversary"
                  width={1536}
                  height={1024}
                  priority
                  className="relative z-10 h-[clamp(130px,24vh,230px)] w-auto max-w-[min(88vw,460px)] object-contain drop-shadow-[0_0_35px_rgba(201,162,39,0.45)]"
                />
              </div>

              {/* Ceremony Heading */}
              <h1
                style={{ fontFamily: "var(--font-outfit), Outfit, sans-serif" }}
                className="font-heading text-[clamp(2.5rem,6vh,5rem)] font-black tracking-tight text-white leading-none drop-shadow-[0_0_35px_rgba(201,162,39,0.7)]"
              >
                {PROJECT_NAME}
              </h1>
              <div
                aria-hidden="true"
                className="h-1 w-36 sm:w-48 rounded-full bg-gold shadow-[0_0_15px_#c9a227]"
              />
              <p className="font-heading text-lg sm:text-2xl font-bold tracking-widest text-cyan-200 uppercase">
                FIT EXPO 2026
              </p>
            </div>
          ) : view === "waiting-for-activations" ? (
            <div className="display-enter flex w-full flex-col items-center gap-[clamp(0.75rem,2.5vh,2rem)]">
              {/* Central University of Moratuwa Identity with Progress Border */}
              <div className="relative">
                <UniversityLogoProgress activatedCount={activatedCount} />
              </div>

              {/* Status Header */}
              <div className="flex flex-col items-center gap-1.5">
                <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-wide text-white drop-shadow-[0_0_25px_rgba(0,240,255,0.4)]">
                  WAITING FOR GUEST AUTHORIZATION
                </h1>
                <p className="font-mono text-base sm:text-xl md:text-2xl tracking-[0.2em] text-cyan-300">
                  {activatedCount} OF 3 BIOMETRIC SIGNALS CONNECTED
                </p>
              </div>

              {/* Holographic Handprint Stations for Guest 1, Guest 2, Guest 3 */}
              <HolographicHandprints state={channel.ceremony} devices={channel.devices} />
            </div>
          ) : view === "all-activated" ? (
            <SystemInitialization />
          ) : view === "countdown" ? (
            <FuturisticCountdown seconds={seconds} />
          ) : view === "opened" ? (
            <LaunchReveal audioUnavailable={channel.audioUnavailable} />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <h1 className="font-heading text-4xl sm:text-5xl font-bold text-amber-400">
                Ceremony Sequence Aborted
              </h1>
              <p className="font-mono text-white/80 text-lg sm:text-xl">
                System standing by. Please contact event organizers.
              </p>
            </div>
          )}
        </div>

        {/* Footer Telemetry & Actions */}
        <div className="flex w-full items-center justify-between border-t border-white/10 pt-2 sm:pt-3 pb-1 text-[11px] sm:text-xs font-mono">
          <p className="text-white/70" role="status">
            <span
              className={`inline-block size-2 rounded-full mr-2 ${
                channel.connected ? "bg-cyan-400 animate-pulse" : "bg-red-400"
              }`}
            />
            {channel.connected ? "TERMINAL LINKED" : "RECONNECTING"}
            {channel.audioUnavailable ? " · AUDIO OFFLINE" : " · AUDIO SYNTH ONLINE"}
          </p>

          {view === "welcome" ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                className="display-control text-xs sm:text-sm hover:bg-white/10 transition-colors"
                onClick={() => void present()}
              >
                Enable presentation
              </button>
              <button
                type="button"
                className="display-control text-xs sm:text-sm bg-gold/20 border-gold hover:bg-gold/30 text-gold font-bold transition-all shadow-[0_0_15px_rgba(201,162,39,0.3)]"
                onClick={() => void begin()}
              >
                Begin activations
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="text-white/60 hover:text-white underline underline-offset-4 transition-colors"
              onClick={() => void present()}
            >
              Enable presentation
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
