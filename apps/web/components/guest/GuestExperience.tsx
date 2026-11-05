"use client";

import { CLIENT_EVENTS, type GuestRole } from "@fit-expo/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCeremonyChannel } from "@/hooks/use-ceremony-channel";
import { countdownSecondsRemaining } from "@/lib/ceremony-sync";
import { GENERIC_GUEST_LABELS, GUEST_LABELS, viewFromCeremony } from "@/lib/guest-config";
import { ConnectionIndicator } from "./ConnectionIndicator";
import { SlideToActivate } from "./SlideToActivate";

type GuestExperienceProps = {
  expectedRole: GuestRole;
};

export function GuestExperience({ expectedRole }: GuestExperienceProps) {
  const router = useRouter();
  const label = GUEST_LABELS[expectedRole];
  const generic = GENERIC_GUEST_LABELS[expectedRole];

  const [assignedRole, setAssignedRole] = useState<GuestRole | "display" | null | undefined>(
    undefined,
  );
  const channel = useCeremonyChannel(assignedRole === expectedRole);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/guest-sessions/current", { credentials: "include" })
      .then(async (response) =>
        response.ok ? ((await response.json()) as { data: { role: GuestRole | "display" } }) : null,
      )
      .then((body) => {
        if (!cancelled) {
          setAssignedRole(body?.data.role ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAssignedRole(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const serverActivated = Boolean(channel.ceremony?.activations[expectedRole]);
  const view = viewFromCeremony(
    channel.ceremony,
    expectedRole,
    submitting && !serverActivated,
    channel.connected,
  );
  const seconds =
    channel.ceremony?.status === "COUNTDOWN" && channel.ceremony.countdown
      ? countdownSecondsRemaining(channel.ceremony.countdown.opensAt, channel.now)
      : null;

  function activate() {
    const socket = channel.socketRef.current;
    if (!socket || submitting) {
      setError("Not connected. Try again when the tablet reconnects.");
      return;
    }
    setSubmitting(true);
    setError(null);
    socket.emit(CLIENT_EVENTS.GUEST_ACTIVATE, {}, (result) => {
      setSubmitting(false);
      if (!result.ok) {
        setError(
          result.error.code === "INVALID_TRANSITION"
            ? "The ceremony is not ready for activation yet."
            : result.error.code === "ALREADY_ACTIVATED"
              ? "This guest has already activated."
              : "Activation was not accepted. You can try again.",
        );
      }
    });
  }

  async function release() {
    await fetch("/api/guest-sessions/release", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    router.push("/guest");
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 py-10 text-center text-white selection:bg-gold selection:text-navy-blue">
      {/* Background cybernetic grid lines */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1b3a6b_1px,transparent_1px)] [background-size:24px_24px] opacity-30"
      />

      {/* Header Tag */}
      <div className="relative z-10 flex items-center gap-2">
        <span className="size-2 rounded-full bg-cyan-400" />
        <p className="font-mono text-xs font-semibold tracking-[0.25em] text-cyan-300 uppercase">
          Faculty of Information Technology · University of Moratuwa
        </p>
        <span className="size-2 rounded-full bg-gold" />
      </div>

      {/* Generic Station & Designation Heading */}
      <div className="relative z-10 flex flex-col items-center gap-1">
        <span className="font-mono text-xs font-bold tracking-[0.3em] text-gold uppercase">
          {generic.station} · {generic.position} POSITION
        </span>
        <h1
          aria-label={label.title}
          className="font-heading text-5xl sm:text-6xl font-black text-white tracking-wide drop-shadow-[0_0_20px_rgba(201,162,39,0.4)]"
        >
          {generic.label}
        </h1>
        <div
          aria-hidden="true"
          className="mt-2 h-1 w-28 rounded-full bg-gold shadow-[0_0_12px_#c9a227]"
        />
      </div>

      {assignedRole === undefined ? (
        <p className="font-mono text-cyan-300/80 animate-pulse">Checking tablet link…</p>
      ) : null}

      {assignedRole === null ? (
        <a className="font-mono text-sm text-gold underline underline-offset-4" href="/guest">
          Choose a guest station
        </a>
      ) : null}

      {assignedRole && assignedRole !== expectedRole && assignedRole !== "display" ? (
        <a
          className="font-mono text-sm text-gold underline underline-offset-4"
          href={`/guest/${assignedRole}`}
        >
          This tablet is assigned to {GENERIC_GUEST_LABELS[assignedRole].label}
        </a>
      ) : null}

      {assignedRole === "display" ? (
        <Link className="font-mono text-sm text-gold underline underline-offset-4" href="/">
          This browser is the ceremony display
        </Link>
      ) : null}

      {assignedRole === expectedRole ? (
        <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-6">
          <ConnectionIndicator connected={channel.connected} />

          <p className="max-w-lg font-mono text-sm sm:text-base text-white/80 leading-relaxed">
            Welcome. When the ceremony is ready, slide across to release your biometric lock with
            the other guests.
          </p>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-red-500/40 bg-red-950/60 px-4 py-2 font-mono text-xs text-red-300 shadow"
            >
              {error}
            </p>
          ) : (
            <p className="font-mono text-sm tracking-wider text-cyan-300 font-semibold drop-shadow">
              {messageFor(view, seconds)}
            </p>
          )}

          {!channel.connected && channel.ceremony ? (
            <p role="status" className="font-mono text-xs text-amber-300">
              Reconnecting. Your activation is kept on the server.
            </p>
          ) : null}

          {/* Interactive Slide Control */}
          <SlideToActivate
            disabled={view !== "ready" || !channel.connected}
            busy={submitting && !serverActivated}
            isActivated={
              serverActivated ||
              view === "activated" ||
              view === "countdown" ||
              view === "completed"
            }
            onActivate={activate}
          />

          <button
            type="button"
            className="font-mono text-xs text-white/50 hover:text-white underline underline-offset-4 transition-colors"
            onClick={() => void release()}
          >
            Release this tablet
          </button>
        </div>
      ) : null}
    </main>
  );
}

function messageFor(view: string, seconds: number | null): string {
  switch (view) {
    case "ready":
      return "Slide across to take your part in the opening.";
    case "submitting":
      return "Waiting for the server to confirm.";
    case "activated":
      return "You have activated. Waiting for the other guests.";
    case "countdown":
      return seconds && seconds > 0
        ? `The opening countdown has begun. ${seconds}`
        : "The opening countdown has begun.";
    case "completed":
      return "The FIT Expo is open.";
    case "aborted":
      return "The ceremony was stopped.";
    case "disconnected":
      return "Reconnecting to the ceremony.";
    default:
      return "Please wait. The ceremony has not started.";
  }
}
