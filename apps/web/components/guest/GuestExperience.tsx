"use client";

import { CLIENT_EVENTS, type GuestRole } from "@fit-expo/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCeremonyChannel } from "@/hooks/use-ceremony-channel";
import { countdownSecondsRemaining } from "@/lib/ceremony-sync";
import { GUEST_LABELS, viewFromCeremony } from "@/lib/guest-config";
import { ConnectionIndicator } from "./ConnectionIndicator";
import { SlideToActivate } from "./SlideToActivate";

type GuestExperienceProps = {
  expectedRole: GuestRole;
};

export function GuestExperience({ expectedRole }: GuestExperienceProps) {
  const router = useRouter();
  const label = GUEST_LABELS[expectedRole];
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 py-10 text-center">
      <p className="text-sm tracking-wide text-navy-blue uppercase">
        Faculty of Information Technology
      </p>
      <h1 className="text-4xl font-bold text-navy-blue">{label.title}</h1>
      <div aria-hidden="true" className="h-1 w-24 rounded-full bg-gold" />
      {assignedRole === undefined ? <p>Checking this tablet…</p> : null}
      {assignedRole === null ? (
        <a className="text-navy-blue underline" href="/guest">
          Choose a guest
        </a>
      ) : null}
      {assignedRole && assignedRole !== expectedRole && assignedRole !== "display" ? (
        <a className="text-navy-blue underline" href={`/guest/${assignedRole}`}>
          This tablet is assigned to {GUEST_LABELS[assignedRole].title}
        </a>
      ) : null}
      {assignedRole === "display" ? (
        <Link className="text-navy-blue underline" href="/">
          This browser is the ceremony display
        </Link>
      ) : null}
      {assignedRole === expectedRole ? (
        <>
          <ConnectionIndicator connected={channel.connected} />
          <p className="max-w-lg text-lg">
            Welcome. When the ceremony is ready, slide to open the FIT Expo with the other guests.
          </p>
          {error ? <p role="alert">{error}</p> : <p>{messageFor(view, seconds)}</p>}
          {!channel.connected && channel.ceremony ? (
            <p role="status">Reconnecting. Your activation is kept on the server.</p>
          ) : null}
          <SlideToActivate
            disabled={view !== "ready" || !channel.connected}
            busy={submitting && !serverActivated}
            onActivate={activate}
          />
          <button type="button" className="text-sm underline" onClick={() => void release()}>
            Release this tablet
          </button>
        </>
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
