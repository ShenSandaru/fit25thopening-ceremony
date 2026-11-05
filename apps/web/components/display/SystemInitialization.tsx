"use client";

import { useEffect, useState } from "react";
import { RoboticEnergyCore } from "./RoboticEnergyCore";

export function SystemInitialization() {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1600);
    const t2 = setTimeout(() => setPhase(2), 3400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="display-enter relative z-20 flex w-full max-w-5xl flex-col items-center justify-center gap-6 py-4 text-center">
      {/* Central Rotating Robotic Energy Core with Converging Energy Conduits */}
      <div className="relative">
        <RoboticEnergyCore activatedCount={3} />

        {/* Converging Tri-Conduit Energy Rays */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="size-[420px] rounded-full border border-gold/50 border-dashed animate-[spin_18s_linear_infinite]" />
          <div className="absolute size-[480px] rounded-full border border-cyan-400/40 border-dotted animate-[spin_30s_linear_infinite_reverse]" />
          <div className="absolute size-[540px] rounded-full border border-gold/20 animate-pulse" />
        </div>
      </div>

      {/* Primary Status Banner */}
      <div className="flex flex-col items-center gap-3 min-h-[170px] justify-center">
        <div className="inline-flex items-center gap-3 rounded-full border border-gold/70 bg-navy-blue/90 px-6 py-1.5 shadow-[0_0_25px_rgba(201,162,39,0.35)] backdrop-blur-md">
          <span className="size-2 rounded-full bg-gold animate-ping" />
          <span className="font-mono text-xs font-bold tracking-[0.3em] text-gold uppercase">
            3/3 Biometric Locks Released · Converging Energy Core
          </span>
        </div>

        {phase === 0 ? (
          <div className="display-enter flex flex-col items-center gap-2">
            <h1 className="font-heading text-6xl font-extrabold tracking-wider text-white md:text-7xl drop-shadow-[0_0_35px_rgba(201,162,39,0.5)]">
              SYSTEM INITIALIZATION
            </h1>
            <p className="font-mono text-xl tracking-[0.25em] text-cyan-300 md:text-2xl animate-pulse">
              INITIALIZING LAUNCH SEQUENCE...
            </p>
          </div>
        ) : phase === 1 ? (
          <div className="display-enter flex flex-col items-center gap-2">
            <p className="font-heading text-3xl font-light italic text-white/95 md:text-5xl drop-shadow-[0_0_30px_rgba(201,162,39,0.6)]">
              &ldquo;Three minds, one vision, one future.&rdquo;
            </p>
            <p className="font-mono text-xs tracking-[0.3em] text-gold/80 uppercase">
              [ OFFICIAL CEREMONY CREED ]
            </p>
          </div>
        ) : (
          <div className="display-enter flex flex-col items-center gap-2">
            <h1 className="font-heading text-5xl font-black tracking-wide text-white md:text-6xl drop-shadow-[0_0_30px_rgba(0,240,255,0.6)]">
              CONNECTING IDEAS...
            </h1>
            <p className="font-mono text-2xl font-bold tracking-[0.25em] text-gold md:text-3xl animate-pulse drop-shadow-[0_0_25px_#c9a227]">
              EMPOWERING INNOVATION...
            </p>
          </div>
        )}
      </div>

      {/* Futuristic Telemetry Progress Indicators */}
      <div className="flex w-full max-w-lg flex-col items-center gap-2">
        <div className="flex w-full justify-between font-mono text-xs text-white/70">
          <span className="text-cyan-300">QUANTUM CORE REACTOR</span>
          <span className="text-gold font-bold">100% MAXIMUM CHARGE</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-gold/50 shadow-[0_0_15px_rgba(201,162,39,0.3)]">
          <div className="h-full w-full bg-gradient-to-r from-cyan-400 via-gold to-white shadow-[0_0_15px_#c9a227]" />
        </div>
        <div className="flex justify-between w-full font-mono text-[10px] text-white/60 tracking-widest uppercase">
          <span>TRI-SIGNAL LOCKED</span>
          <span>ROBOTICS ONLINE</span>
          <span>READY FOR COUNTDOWN</span>
        </div>
      </div>
    </div>
  );
}
