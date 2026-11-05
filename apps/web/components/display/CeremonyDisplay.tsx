"use client";

import { PROJECT_NAME } from "@fit-expo/shared";
import { useEffect, useState } from "react";
import { useCeremonyChannel } from "@/hooks/use-ceremony-channel";
import { countdownSecondsRemaining, displayView } from "@/lib/ceremony-sync";
import { GuestIndicators } from "./GuestIndicators";

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
    // Fullscreen applies to this browser window only. The operator places that
    // window on the mirrored or extended projector screen first.
    const root = document.documentElement;
    try {
      if (!document.fullscreenElement && document.fullscreenEnabled) {
        await Promise.race([
          root.requestFullscreen(),
          new Promise((resolve) => setTimeout(resolve, 400)),
        ]);
      }
    } catch {
      // Fullscreen can be denied. The ceremony still runs in the window.
    }
    await channel.audioRef.current?.unlock();
  }

  const showGuests =
    view === "waiting-for-activations" || view === "all-activated" || view === "countdown";

  return (
    <main
      data-display-view={view}
      className="display-stage relative flex h-dvh w-screen items-center justify-center overflow-hidden bg-black text-white"
    >
      <section className="display-frame relative flex h-full max-h-dvh w-full max-w-[calc(100dvh*16/9)] flex-col items-center justify-center gap-10 overflow-hidden bg-navy-blue px-16 py-12 text-center">
        <p className="text-3xl tracking-[0.28em] text-white/80 uppercase">
          Faculty of Information Technology
        </p>
        <Frame view={view} seconds={seconds} audioUnavailable={channel.audioUnavailable} />
        {showGuests ? <GuestIndicators state={channel.ceremony} devices={channel.devices} /> : null}
        <p className="absolute bottom-6 left-8 text-sm text-white/70" role="status">
          {channel.connected ? "Display connected" : "Reconnecting"}
          {channel.audioUnavailable ? " · Audio unavailable" : ""}
        </p>
        {view === "welcome" ? (
          <div className="absolute right-8 bottom-6 flex gap-3">
            <button type="button" className="display-control" onClick={() => void present()}>
              Enable presentation
            </button>
            <button type="button" className="display-control" onClick={() => void begin()}>
              Begin activations
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="absolute right-8 bottom-6 text-sm text-white/70 underline"
            onClick={() => void present()}
          >
            Enable presentation
          </button>
        )}
      </section>
    </main>
  );
}

function Frame({
  view,
  seconds,
  audioUnavailable,
}: {
  view: string;
  seconds: number | null;
  audioUnavailable: boolean;
}) {
  if (view === "reconnecting" || view === "pending") {
    return <h1 className="font-heading text-6xl font-bold">Connecting the display…</h1>;
  }
  if (view === "taken") {
    return (
      <h1 className="font-heading text-5xl font-bold">The display is already open elsewhere.</h1>
    );
  }
  if (view === "guest-browser") {
    return (
      <h1 className="font-heading text-5xl font-bold">This browser is assigned to a guest.</h1>
    );
  }
  if (view === "welcome") {
    return (
      <>
        <h1 className="font-heading text-7xl font-bold xl:text-8xl">{PROJECT_NAME}</h1>
        <div aria-hidden="true" className="h-1 w-40 rounded-full bg-gold" />
        <p className="max-w-4xl text-5xl leading-tight">University of Moratuwa</p>
        <p className="max-w-5xl text-3xl leading-snug text-white/85">
          This browser is the ceremony screen. Show this window on the projector, then enable
          presentation. Sound plays from this laptop.
        </p>
      </>
    );
  }
  if (view === "waiting-for-activations") {
    return (
      <>
        <h1 className="font-heading text-6xl font-bold">Waiting for the guests</h1>
        <p className="text-5xl text-white/85">Each guest activates from their tablet.</p>
      </>
    );
  }
  if (view === "all-activated") {
    return <h1 className="display-enter font-heading text-7xl font-bold">All guests are ready</h1>;
  }
  if (view === "countdown") {
    return (
      <p
        key={seconds ?? 0}
        aria-live="assertive"
        className="display-digit font-heading text-[40vh] leading-none font-bold tabular-nums"
      >
        {seconds ?? 0}
      </p>
    );
  }
  if (view === "opened") {
    return (
      <div className="display-enter flex flex-col items-center gap-8">
        <p className="text-5xl tracking-[0.2em] text-gold uppercase">Officially open</p>
        <h1 className="font-heading text-8xl font-bold">{PROJECT_NAME}</h1>
        <p className="text-5xl">Faculty of Information Technology</p>
        {audioUnavailable ? <span className="sr-only">Audio unavailable</span> : null}
      </div>
    );
  }
  return (
    <>
      <h1 className="font-heading text-6xl font-bold">The ceremony has been stopped</h1>
      <p className="text-5xl text-white/85">Please wait for the organizers.</p>
    </>
  );
}
