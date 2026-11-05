"use client";

import { RoboticEnergyCore } from "./RoboticEnergyCore";

type LaunchRevealProps = {
  audioUnavailable?: boolean;
};

export function LaunchReveal({ audioUnavailable = false }: LaunchRevealProps) {
  return (
    <div className="display-enter relative z-20 flex w-full max-w-5xl flex-col items-center justify-center gap-[clamp(0.5rem,1.8vh,1.5rem)] py-2 sm:py-4 text-center select-none">
      {/* Cinematic Golden Light Rays & Shockwave Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <div className="animate-shockwave size-[300px] sm:size-[440px] rounded-full border-2 border-gold/70" />
        <div
          className="animate-shockwave size-[260px] sm:size-[380px] rounded-full border border-cyan-400/50"
          style={{ animationDelay: "500ms" }}
        />
        <div className="size-[400px] sm:size-[550px] rounded-full bg-radial from-gold/30 via-navy-blue/20 to-transparent blur-3xl animate-pulse" />
      </div>

      {/* Energized Compact Robotic Core in Opened State */}
      <div className="relative flex items-center justify-center">
        <RoboticEnergyCore activatedCount={3} isOpened compact />
      </div>

      {/* Official Announcement Sequence */}
      <div className="relative z-30 flex flex-col items-center gap-[clamp(0.5rem,1.6vh,1.25rem)] max-w-4xl px-4">
        {/* Ceremonial Subheading */}
        <h2 className="text-xs sm:text-sm font-mono font-medium tracking-[0.3em] text-cyan-300/90 uppercase">
          FIT Expo Opening Ceremony
        </h2>

        {/* Hero Title: FIT EXPO 2026 */}
        <h1 className="font-heading text-[clamp(2.75rem,7vh,6.5rem)] font-black tracking-tight text-white leading-none drop-shadow-[0_0_45px_rgba(201,162,39,0.9)]">
          FIT EXPO 2026
        </h1>

        {/* OFFICIALLY LAUNCHED Badge */}
        <div className="inline-flex items-center gap-2.5 sm:gap-3 rounded-full border-2 border-gold bg-navy-blue/90 px-6 sm:px-10 py-1.5 sm:py-2 shadow-[0_0_35px_rgba(201,162,39,0.6)] backdrop-blur-md">
          <span className="size-2 sm:size-2.5 rounded-full bg-gold animate-ping" />
          <span className="font-mono text-sm sm:text-xl md:text-2xl font-extrabold tracking-[0.35em] text-gold uppercase drop-shadow-[0_0_12px_#c9a227]">
            OFFICIALLY LAUNCHED
          </span>
        </div>

        {/* Official Theme / Motto */}
        <p className="font-heading text-sm sm:text-xl md:text-2xl font-light italic tracking-wide text-white/95 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
          &ldquo;Let&apos;s Collaborate to Empower the Next Generation.&rdquo;
        </p>

        {/* FIT 25 Anniversary Logo Frame & Motto */}
        <div className="mt-1 inline-flex items-center gap-2.5 sm:gap-3.5 rounded-full border border-gold/60 bg-navy-blue/80 px-5 sm:px-7 py-1.5 sm:py-2 shadow-[0_0_20px_rgba(201,162,39,0.35)] backdrop-blur-md">
          <span className="font-heading text-xs sm:text-base font-black tracking-wider text-gold">
            FIT 25
          </span>
          <span className="h-3.5 w-px bg-gold/50" />
          <span className="font-mono text-[10px] sm:text-xs font-bold tracking-[0.25em] text-white/90 uppercase">
            25 YEARS OF EXCELLENCE
          </span>
        </div>

        {audioUnavailable ? <span className="sr-only">Audio unavailable</span> : null}
      </div>
    </div>
  );
}
