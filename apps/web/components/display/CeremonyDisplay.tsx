"use client";

import { PROJECT_NAME } from "@fit-expo/shared";
import { useEffect, useState } from "react";
import { useCeremonyChannel } from "@/hooks/use-ceremony-channel";
import { countdownSecondsRemaining, displayView } from "@/lib/ceremony-sync";
import { FuturisticHudOverlay } from "./FuturisticHudOverlay";
import { RoboticEnergyCore } from "./RoboticEnergyCore";
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
    await channel.audioRef.current?.unlock();
  }

  return (
    <main
      data-display-view={view}
      className="display-stage relative flex h-dvh w-screen items-center justify-center overflow-hidden bg-slate-950 text-white font-sans selection:bg-gold selection:text-navy-blue"
    >
      {/* Sci-Fi HUD Ambient Canvas & Grid Overlay */}
      <FuturisticHudOverlay
        connected={channel.connected}
        audioUnavailable={channel.audioUnavailable}
      />

      {/* Main Display Stage Container */}
      <section className="relative z-10 flex h-full max-h-dvh w-full max-w-[calc(100dvh*16/9)] flex-col items-center justify-center gap-6 overflow-hidden px-8 py-10 text-center">
        {/* View-Specific Content Frame */}
        <div className="flex w-full flex-1 flex-col items-center justify-center">
          {view === "reconnecting" ? (
            <div className="flex flex-col items-center gap-4">
              <div className="size-16 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <h1
                style={{ fontFamily: "var(--font-outfit), Outfit, sans-serif" }}
                className="font-heading text-5xl font-bold tracking-wide"
              >
                Connecting to Launch Subsystem…
              </h1>
              <p className="font-mono text-cyan-300/80 text-sm">INITIALIZING SECURE SOCKET LINK</p>
            </div>
          ) : view === "taken" ? (
            <div className="flex flex-col items-center gap-4">
              <h1 className="font-heading text-5xl font-bold text-red-400">
                Display Terminal Active Elsewhere
              </h1>
              <p className="font-mono text-white/70">
                Only one authoritative display session is permitted.
              </p>
            </div>
          ) : view === "guest-browser" ? (
            <div className="flex flex-col items-center gap-4">
              <h1 className="font-heading text-5xl font-bold text-amber-300">
                Tablet Assigned to Guest
              </h1>
              <p className="font-mono text-white/70">
                This browser instance is currently linked to an active guest tablet session.
              </p>
            </div>
          ) : view === "welcome" ? (
            <div className="display-enter flex flex-col items-center gap-6">
              {/* University of Moratuwa Crest / Branding Frame */}
              <div className="flex flex-col items-center gap-2">
                <div className="inline-flex items-center gap-3 rounded-full border border-gold/40 bg-navy-blue/80 px-6 py-1.5 shadow-[0_0_20px_rgba(201,162,39,0.25)] backdrop-blur-md">
                  <span className="size-2 rounded-full bg-gold animate-ping" />
                  <span className="font-mono text-xs font-bold tracking-[0.3em] text-gold uppercase">
                    UNIVERSITY OF MORATUWA
                  </span>
                  <span className="size-2 rounded-full bg-cyan-400" />
                </div>
                <p className="font-mono text-xs tracking-[0.25em] text-cyan-300 uppercase">
                  FACULTY OF INFORMATION TECHNOLOGY
                </p>
              </div>

              <div className="relative my-1">
                <RoboticEnergyCore activatedCount={0} />
              </div>

              <h1
                style={{ fontFamily: "var(--font-outfit), Outfit, sans-serif" }}
                className="font-heading text-6xl font-black tracking-tight text-white md:text-8xl drop-shadow-[0_0_40px_rgba(201,162,39,0.7)]"
              >
                {PROJECT_NAME}
              </h1>
              <div
                aria-hidden="true"
                className="h-1 w-48 rounded-full bg-gold shadow-[0_0_15px_#c9a227]"
              />
              <p className="font-heading text-2xl font-bold tracking-widest text-cyan-200 md:text-3xl">
                FIT EXPO 2026
              </p>
              <p className="max-w-3xl font-mono text-base text-white/80 leading-relaxed">
                Ceremony display ready. Mirror or extend this window onto the auditorium projector
                and enable presentation mode. Sound plays from this device.
              </p>
            </div>
          ) : view === "waiting-for-activations" ? (
            <div className="display-enter flex w-full flex-col items-center gap-8">
              {/* Dynamic Robotic Core reacting to guest activations */}
              <div className="relative">
                <RoboticEnergyCore activatedCount={activatedCount} />
              </div>

              {/* Status Header */}
              <div className="flex flex-col items-center gap-2">
                <h1 className="font-heading text-5xl font-extrabold tracking-wide text-white md:text-6xl drop-shadow-[0_0_25px_rgba(0,240,255,0.4)]">
                  WAITING FOR GUEST AUTHORIZATION
                </h1>
                <p className="font-mono text-xl tracking-[0.2em] text-cyan-300 md:text-2xl">
                  {activatedCount} OF 3 BIOMETRIC SIGNALS CONNECTED
                </p>
              </div>

              {/* Holographic Handprint Stations for Chief, VC, Dean */}
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
              <h1 className="font-heading text-5xl font-bold text-amber-400">
                Ceremony Sequence Aborted
              </h1>
              <p className="font-mono text-white/80 text-xl">
                System standing by. Please contact event organizers.
              </p>
            </div>
          )}
        </div>

        {/* Footer Telemetry & Actions */}
        <div className="flex w-full items-center justify-between border-t border-white/10 pt-4 text-xs font-mono">
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
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="display-control hover:bg-white/10 transition-colors"
                onClick={() => void present()}
              >
                Enable presentation
              </button>
              <button
                type="button"
                className="display-control bg-gold/20 border-gold hover:bg-gold/30 text-gold font-bold transition-all shadow-[0_0_15px_rgba(201,162,39,0.3)]"
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
