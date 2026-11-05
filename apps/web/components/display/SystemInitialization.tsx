"use client";

import { RoboticEnergyCore } from "./RoboticEnergyCore";

export function SystemInitialization() {
  return (
    <div className="display-enter relative z-20 flex w-full max-w-5xl flex-col items-center justify-center gap-8 py-4 text-center">
      {/* Central Rotating Robotic Energy Core in Fully Charged Mode */}
      <div className="relative">
        <RoboticEnergyCore activatedCount={3} />

        {/* Converging Energy Conduits / Brackets */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="size-[420px] rounded-full border border-gold/40 border-dashed animate-[spin_20s_linear_infinite]" />
          <div className="absolute size-[480px] rounded-full border border-cyan-400/30 border-dotted animate-[spin_35s_linear_infinite_reverse]" />
        </div>
      </div>

      {/* Primary Status Banner */}
      <div className="flex flex-col items-center gap-3">
        <div className="inline-flex items-center gap-3 rounded-full border border-gold/60 bg-navy-blue/80 px-6 py-1.5 shadow-[0_0_25px_rgba(201,162,39,0.3)] backdrop-blur-md">
          <span className="size-2 rounded-full bg-gold animate-ping" />
          <span className="font-mono text-sm font-bold tracking-[0.3em] text-gold uppercase">
            3/3 Biometric Locks Released
          </span>
        </div>

        <h1 className="font-heading text-6xl font-extrabold tracking-wider text-white md:text-7xl lg:text-8xl drop-shadow-[0_0_35px_rgba(201,162,39,0.5)]">
          SYSTEM INITIALIZATION
        </h1>

        <p className="font-mono text-2xl tracking-[0.25em] text-cyan-300 md:text-3xl animate-pulse">
          INITIALIZING LAUNCH SEQUENCE...
        </p>
      </div>

      {/* Telemetry Progress Bar */}
      <div className="flex w-full max-w-md flex-col items-center gap-2">
        <div className="flex w-full justify-between font-mono text-xs text-white/70">
          <span>REACTOR CORE</span>
          <span className="text-gold font-bold">100% MAXIMUM POWER</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-gold/40">
          <div className="h-full w-full bg-gradient-to-r from-cyan-400 via-gold to-white shadow-[0_0_15px_#c9a227]" />
        </div>
        <div className="flex justify-between w-full font-mono text-[10px] text-white/50 tracking-widest uppercase">
          <span>TRI-SIGNAL LOCKED</span>
          <span>ALL GUESTS VERIFIED</span>
          <span>READY FOR COUNTDOWN</span>
        </div>
      </div>
    </div>
  );
}
