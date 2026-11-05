"use client";

import { GUEST_ROLES, type GuestRole } from "@fit-expo/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GUEST_LABELS } from "@/lib/guest-config";

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
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-8 px-6 py-10">
      <header className="text-center">
        <p className="text-sm tracking-wide text-navy-blue uppercase">University of Moratuwa</p>
        <h1 className="mt-2 text-4xl font-bold text-navy-blue">Assign this tablet</h1>
        <p className="mt-3 text-dark-grey">
          Choose the guest who will use this tablet. An organizer should hand the tablet to that
          guest.
        </p>
      </header>
      {error ? (
        <p role="alert" className="text-center text-dark-grey">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        {GUEST_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            disabled={pending !== null}
            onClick={() => void assign(role)}
            className="min-h-40 rounded-2xl border border-navy-blue bg-white p-6 text-left shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-blue disabled:opacity-60"
          >
            <span className="block h-1 w-12 rounded-full bg-gold" />
            <span className="mt-4 block text-2xl font-semibold text-navy-blue">
              {GUEST_LABELS[role].title}
            </span>
            <span className="mt-2 block text-sm text-dark-grey">
              {pending === role ? "Assigning…" : "Use this tablet"}
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}
