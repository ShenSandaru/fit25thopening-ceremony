"use client";

import { GUEST_ROLES, type GuestRole } from "@fit-expo/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GENERIC_GUEST_LABELS } from "@/lib/guest-config";

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
    router.push(GENERIC_GUEST_LABELS[role].route);
  }

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white selection:bg-gold selection:text-navy-blue flex flex-col justify-center overflow-x-hidden">
      {/* Background cybernetic grid lines */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1b3a6b_1px,transparent_1px)] [background-size:24px_24px] opacity-35"
      />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-6 sm:gap-8 px-6 py-8 sm:py-12 text-white">
        <header className="text-center flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-navy-blue/80 px-4 py-1 backdrop-blur-md">
            <span className="size-2 rounded-full bg-gold animate-pulse" />
            <p className="font-mono text-xs font-semibold tracking-[0.25em] text-cyan-300 uppercase">
              University of Moratuwa · FIT EXPO 2026
            </p>
          </div>
          <h1 className="mt-2 font-heading text-3xl sm:text-5xl font-black text-white tracking-wide drop-shadow-[0_0_20px_rgba(201,162,39,0.3)]">
            Assign Tablet Station
          </h1>
          <p className="max-w-xl font-mono text-xs sm:text-sm text-white/70 leading-relaxed">
            Select the guest station for this device before handing it to the guest.
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

        {/* Responsive grid: stacks vertically on portrait tablets (<1024px) and 3-columns on landscape/desktop */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
          {GUEST_ROLES.map((role) => {
            const generic = GENERIC_GUEST_LABELS[role];

            return (
              <button
                key={role}
                type="button"
                aria-label={`${generic.label} - ${generic.position} Position`}
                disabled={pending !== null}
                onClick={() => void assign(role)}
                className="group relative flex min-h-44 sm:min-h-48 flex-col justify-between rounded-2xl border border-cyan-500/40 bg-navy-blue/70 p-5 sm:p-6 text-left shadow-lg backdrop-blur-md transition-all hover:border-gold hover:bg-navy-blue/90 hover:shadow-[0_0_25px_rgba(201,162,39,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50 cursor-pointer"
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
                  <h2 className="mt-3 font-heading text-2xl sm:text-3xl font-extrabold text-white group-hover:text-gold transition-colors">
                    {generic.label}
                  </h2>
                </div>

                <div className="mt-4 sm:mt-6 flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="font-mono text-xs font-semibold text-cyan-400 group-hover:text-gold transition-colors">
                    {pending === role ? "ASSIGNING DEVICE…" : "INITIALIZE TABLET →"}
                  </span>
                  <span className="size-2 rounded-full bg-cyan-400 group-hover:bg-gold transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
