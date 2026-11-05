"use client";

import { GUEST_ROLES, type CeremonyState, type DeviceStatus } from "@fit-expo/shared";
import { GENERIC_GUEST_LABELS } from "@/lib/guest-config";
import { guestIndicatorStatus } from "@/lib/ceremony-sync";

type HolographicHandprintsProps = {
  state: CeremonyState | null;
  devices: readonly DeviceStatus[];
};

export function HolographicHandprints({ state, devices }: HolographicHandprintsProps) {
  return (
    <div className="relative z-20 w-full max-w-6xl px-4">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {GUEST_ROLES.map((role) => {
          const status = guestIndicatorStatus(role, state, devices);
          const isActivated = status === "activated";
          const isConnected = status === "connected";
          const generic = GENERIC_GUEST_LABELS[role];

          return (
            <div
              key={role}
              data-guest={role}
              data-guest-status={status}
              className={`relative flex flex-col items-center justify-between rounded-2xl border p-6 backdrop-blur-md transition-all duration-700 ${
                isActivated
                  ? "border-gold/80 bg-navy-blue/80 shadow-[0_0_30px_rgba(201,162,39,0.25)]"
                  : isConnected
                    ? "border-cyan-500/50 bg-navy-blue/60 shadow-[0_0_20px_rgba(0,240,255,0.15)]"
                    : "border-slate-700/50 bg-slate-950/40 opacity-70"
              }`}
            >
              {/* Corner Reticles */}
              <div
                aria-hidden="true"
                className={`absolute top-2 left-2 size-3 border-t-2 border-l-2 ${
                  isActivated ? "border-gold" : "border-cyan-400"
                }`}
              />
              <div
                aria-hidden="true"
                className={`absolute top-2 right-2 size-3 border-t-2 border-r-2 ${
                  isActivated ? "border-gold" : "border-cyan-400"
                }`}
              />
              <div
                aria-hidden="true"
                className={`absolute bottom-2 left-2 size-3 border-b-2 border-l-2 ${
                  isActivated ? "border-gold" : "border-cyan-400"
                }`}
              />
              <div
                aria-hidden="true"
                className={`absolute bottom-2 right-2 size-3 border-b-2 border-r-2 ${
                  isActivated ? "border-gold" : "border-cyan-400"
                }`}
              />

              {/* Station Header */}
              <div className="flex w-full items-center justify-between border-b border-white/10 pb-3">
                <span className="font-mono text-xs font-bold tracking-widest text-gold uppercase">
                  {generic.station} · {generic.position}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase ${
                    isActivated
                      ? "bg-gold/20 text-gold border border-gold/40"
                      : isConnected
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "bg-slate-800 text-slate-400"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      isActivated
                        ? "bg-gold animate-ping"
                        : isConnected
                          ? "bg-cyan-400 animate-pulse"
                          : "bg-slate-500"
                    }`}
                  />
                  {isActivated ? "VERIFIED" : isConnected ? "LINKED" : "AWAITING"}
                </span>
              </div>

              {/* Holographic Handprint Biometric Pod */}
              <div className="relative my-6 flex size-44 items-center justify-center">
                {/* Rotating Mechanical Bracket Ring */}
                <svg
                  viewBox="0 0 200 200"
                  className={`absolute inset-0 size-full ${
                    isActivated
                      ? "animate-[spin_10s_linear_infinite]"
                      : "animate-[spin_25s_linear_infinite]"
                  }`}
                >
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke={isActivated ? "rgba(201,162,39,0.6)" : "rgba(0,240,255,0.3)"}
                    strokeWidth="1.5"
                    strokeDasharray="16 12 4 12"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="82"
                    fill="none"
                    stroke={isActivated ? "#c9a227" : "#00f0ff"}
                    strokeWidth="2"
                    strokeDasharray="40 50"
                  />
                </svg>

                {/* Handprint Vector Illustration */}
                <div className="relative size-28">
                  <svg
                    viewBox="0 0 100 120"
                    className={`size-full transition-all duration-700 ${
                      isActivated
                        ? "text-gold drop-shadow-[0_0_15px_#c9a227]"
                        : isConnected
                          ? "text-cyan-400 drop-shadow-[0_0_10px_#00f0ff]"
                          : "text-slate-600"
                    }`}
                  >
                    {/* Palm Silhouette & Circuit Lines */}
                    <path
                      d="M30 45 C28 35 25 22 25 15 C25 10 32 10 33 15 C35 28 37 38 37 45 M42 40 C42 28 42 12 43 8 C44 4 51 4 52 8 C53 18 53 32 52 40 M57 42 C58 32 60 18 61 14 C62 10 69 11 69 15 C68 25 66 35 65 44 M70 52 C73 42 77 30 79 26 C81 22 87 25 86 30 C83 40 78 52 75 60 M22 55 C16 60 10 68 8 74 C6 80 12 84 16 80 C20 75 25 68 28 62 M28 62 C28 75 30 95 38 105 C45 112 58 112 65 105 C73 95 75 75 75 60 Z"
                      fill="currentColor"
                      fillOpacity={isActivated ? "0.25" : "0.15"}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Inner Cybernetic Nodes */}
                    <circle cx="50" cy="75" r="4" fill="currentColor" />
                    <line
                      x1="50"
                      y1="75"
                      x2="35"
                      y2="60"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <line
                      x1="50"
                      y1="75"
                      x2="65"
                      y2="60"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <line x1="50" y1="75" x2="50" y2="95" stroke="currentColor" strokeWidth="1.5" />
                  </svg>

                  {/* Vertical Digital Scanning Laser Beam (Sweeps when activated or linked) */}
                  <div
                    aria-hidden="true"
                    className={`absolute inset-x-0 h-1 rounded-full ${
                      isActivated
                        ? "bg-gold shadow-[0_0_12px_#c9a227] animate-[scanline_2s_ease-in-out_infinite]"
                        : isConnected
                          ? "bg-cyan-400 shadow-[0_0_8px_#00f0ff] animate-[scanline_3s_ease-in-out_infinite]"
                          : "hidden"
                    }`}
                  />
                </div>
              </div>

              {/* Designation & Status Readout */}
              <div className="w-full text-center">
                <h3 className="font-heading text-xl font-extrabold text-white tracking-wide">
                  {generic.label}
                </h3>
                <p
                  className={`mt-1 font-mono text-xs font-semibold tracking-widest uppercase ${
                    isActivated
                      ? "text-gold drop-shadow-[0_0_8px_rgba(201,162,39,0.5)]"
                      : isConnected
                        ? "text-cyan-300"
                        : "text-slate-500"
                  }`}
                >
                  {isActivated
                    ? "BIOMETRIC LOCKED // TRANSMITTING"
                    : isConnected
                      ? "SCANNER READY // AWAITING TOUCH"
                      : "OFFLINE // TABLET NOT CLAIMED"}
                </p>
              </div>

              {/* Energy Signal Conduits (Pulsing towards central core) */}
              {isActivated && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
                >
                  <span className="size-2 rounded-full bg-gold animate-ping" />
                  <span className="h-6 w-0.5 bg-gradient-to-b from-gold to-transparent" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
