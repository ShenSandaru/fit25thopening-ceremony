"use client";

import { GUEST_ROLES, type GuestRole } from "@fit-expo/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GENERIC_GUEST_LABELS, GUEST_LABELS } from "@/lib/guest-config";

export function GuestSelection() {
  const router = useRouter();
  const [pending, setPending] = useState<GuestRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function assign(role: GuestRole) {
    setPending(role);
    setError(null);
    const response = await fetch("/api/guest-sessions/assign", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setPending(null);
    if (!response.ok) {
      const body = (await response.json()) as { error?: { message?: string } };
      setError(body.error?.message ?? "This role could not be assigned.");
      return;
    }
    router.push(`/guest/${role}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-8 px-6 py-12 text-white">
      <header className="text-center flex flex-col items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-navy-blue/80 px-4 py-1">
          <span className="size-2 rounded-full bg-gold animate-pulse" />
          <p className="font-mono text-xs font-semibold tracking-[0.25em] text-cyan-300 uppercase">
            University of Moratuwa · FIT EXPO 2026
          </p>
        </div>
        <h1 className="mt-2 font-heading text-4xl sm:text-5xl font-black text-white tracking-wide">
          Assign Tablet Station
        </h1>
        <p className="max-w-xl font-mono text-sm text-white/70">
          Select the biometric station designation for this device before handing it to the guest.
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          className="text-center font-mono text-sm text-red-400 bg-red-950/40 border border-red-500/30 p-3 rounded-xl max-w-md mx-auto"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-3">
        {GUEST_ROLES.map((role) => {
          const generic = GENERIC_GUEST_LABELS[role];
          const designation = GUEST_LABELS[role].title;

          return (
            <button
              key={role}
              type="button"
              aria-label={designation}
              disabled={pending !== null}
              onClick={() => void assign(role)}
              className="group relative flex min-h-48 flex-col justify-between rounded-2xl border border-cyan-500/40 bg-navy-blue/70 p-6 text-left shadow-lg backdrop-blur-md transition-all hover:border-gold hover:bg-navy-blue/90 hover:shadow-[0_0_25px_rgba(201,162,39,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50 cursor-pointer"
            >
              {/* Corner accents */}
              <div className="absolute top-2 left-2 size-2.5 border-t border-l border-gold/70" />
              <div className="absolute top-2 right-2 size-2.5 border-t border-r border-gold/70" />
              <div className="absolute bottom-2 left-2 size-2.5 border-b border-l border-gold/70" />
              <div className="absolute bottom-2 right-2 size-2.5 border-b border-r border-gold/70" />

              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-mono text-xs font-bold tracking-widest text-gold uppercase">
                    {generic.station}
                  </span>
                  <span className="font-mono text-[10px] text-cyan-300/80 uppercase">
                    {generic.position} POSITION
                  </span>
                </div>
                <h2 className="mt-3 font-heading text-3xl font-extrabold text-white group-hover:text-gold transition-colors">
                  {generic.label}
                </h2>
                <p className="mt-1 font-mono text-xs text-white/60">{designation}</p>
              </div>

              <div className="mt-6 flex items-center justify-between pt-3 border-t border-white/10">
                <span className="font-mono text-xs font-semibold text-cyan-400 group-hover:text-gold">
                  {pending === role ? "ASSIGNING DEVICE…" : "INITIALIZE TABLET →"}
                </span>
                <span className="size-2 rounded-full bg-cyan-400 group-hover:bg-gold transition-colors" />
              </div>
            </button>
          );
        })}
      </div>
    </main>
  );
}
