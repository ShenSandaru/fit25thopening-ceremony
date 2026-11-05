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
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
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
              className={`relative flex flex-col items-center justify-between rounded-2xl border p-4 sm:p-6 backdrop-blur-md transition-all duration-700 ${
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
              <div className="flex w-full items-center justify-between border-b border-white/10 pb-2 sm:pb-3">
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
              <div className="relative my-3 sm:my-6 flex size-36 sm:size-44 items-center justify-center">
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

                {/* Biometric Fingerprint Vector Icon */}
                <div className="relative size-20 sm:size-24 flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className={`size-full transition-all duration-700 ${
                      isActivated
                        ? "text-gold drop-shadow-[0_0_15px_#c9a227]"
                        : isConnected
                          ? "text-cyan-400 drop-shadow-[0_0_12px_#00f0ff]"
                          : "text-slate-600/70"
                    }`}
                  >
                    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                    <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
                    <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
                    <path d="M2 12a10 10 0 0 1 18-6" />
                    <path d="M2 16h.01" />
                    <path d="M21.8 16c.2-2 .131-5.354 0-6" />
                    <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
                    <path d="M8.65 22c.21-.66.45-1.32.57-2" />
                    <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
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
                <h3 className="font-heading text-lg sm:text-xl font-extrabold text-white tracking-wide">
                  {generic.label}
                </h3>
                <p
                  className={`mt-1 font-mono text-[10px] sm:text-xs font-semibold tracking-widest uppercase ${
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

              {/* Energy Signal Conduits (Pulsing upwards toward central core) */}
              {isActivated && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 z-30"
                >
                  <span className="font-mono text-[8px] font-bold text-gold tracking-widest uppercase drop-shadow-[0_0_6px_#c9a227]">
                    ▲ SIGNAL TRANSMITTING
                  </span>
                  <span className="size-2 rounded-full bg-gold animate-ping" />
                  <span className="h-5 w-0.5 bg-gradient-to-t from-gold to-transparent" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
