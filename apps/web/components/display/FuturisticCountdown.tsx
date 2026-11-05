"use client";

import { RoboticEnergyCore } from "./RoboticEnergyCore";

type FuturisticCountdownProps = {
  seconds: number | null;
};

export function FuturisticCountdown({ seconds }: FuturisticCountdownProps) {
  const currentDigit = seconds ?? 0;

  return (
    <div className="relative z-20 flex w-full max-w-4xl flex-col items-center justify-center gap-6 py-2 text-center">
      {/* Central Rotating Robotic Core with Nested Holographic Digit */}
      <div className="relative flex items-center justify-center">
        <RoboticEnergyCore activatedCount={3} isCountdown />

        {/* Dynamic Holographic Countdown Digit Frame */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {/* Laser Scanning Line across the digit */}
          <div className="relative overflow-hidden w-64 h-64 flex items-center justify-center">
            <div
              aria-hidden="true"
              className="animate-laser-sweep absolute top-0 bottom-0 w-2 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_15px_#00f0ff]"
            />

            <p
              key={currentDigit}
              aria-live="assertive"
              className="display-digit font-heading text-[32vh] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-gold to-yellow-600 drop-shadow-[0_0_40px_rgba(201,162,39,0.8)] tabular-nums select-none"
            >
              {currentDigit}
            </p>
          </div>
        </div>
      </div>

      {/* Futuristic Telemetry Label */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <span className="size-2 rounded-full bg-cyan-400 animate-ping" />
          <p className="font-mono text-sm tracking-[0.35em] text-cyan-300 uppercase">
            SYNCHRONIZED LAUNCH COUNTDOWN
          </p>
        </div>

        {/* 5-4-3-2-1 Progress Indicators */}
        <div className="flex items-center gap-3 sm:gap-4 mt-1">
          {[5, 4, 3, 2, 1].map((step) => {
            const isPassedOrCurrent = currentDigit <= step;
            return (
              <div
                key={step}
                className={`flex items-center gap-2 px-4 py-1 rounded-full border font-mono text-xs transition-all duration-300 ${
                  currentDigit === step
                    ? "border-gold bg-gold/25 text-gold font-bold shadow-[0_0_15px_rgba(201,162,39,0.5)] scale-110"
                    : isPassedOrCurrent
                      ? "border-gold/40 bg-gold/10 text-gold/70"
                      : "border-slate-700 bg-slate-900/40 text-slate-500"
                }`}
              >
                <span className="size-1.5 rounded-full bg-current" />
                <span>T - 0{step}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
