"use client";

import { RoboticEnergyCore } from "./RoboticEnergyCore";

type LaunchRevealProps = {
  audioUnavailable?: boolean;
};

export function LaunchReveal({ audioUnavailable = false }: LaunchRevealProps) {
  return (
    <div className="display-enter relative z-20 flex w-full max-w-5xl flex-col items-center justify-center gap-[clamp(0.35rem,1.4vh,1rem)] py-1 sm:py-2 text-center select-none">
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

      {/* Official Announcement Sequence (Content in exact required order) */}
      <div className="relative z-30 flex flex-col items-center gap-[clamp(0.25rem,1.2vh,0.75rem)] max-w-4xl px-2">
        {/* 1. University of Moratuwa Crest Frame */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="size-1.5 sm:size-2 rounded-full bg-cyan-400" />
            <p className="font-mono text-[10px] sm:text-xs md:text-sm font-semibold tracking-[0.25em] text-cyan-300 uppercase">
              University of Moratuwa · Faculty of Information Technology
            </p>
            <span className="size-1.5 sm:size-2 rounded-full bg-gold" />
          </div>
          <h2 className="text-[10px] sm:text-xs font-mono tracking-widest text-white/70 uppercase">
            FIT Expo Opening Ceremony
          </h2>
        </div>

        {/* 2. FIT EXPO 2026 (Main Visual Focal Point) */}
        <h1 className="font-heading text-[clamp(2.5rem,6vh,6rem)] font-black tracking-tight text-white leading-none drop-shadow-[0_0_40px_rgba(201,162,39,0.85)]">
          FIT EXPO 2026
        </h1>

        {/* 3. OFFICIALLY LAUNCHED */}
        <div className="inline-flex items-center gap-2 sm:gap-3 rounded-full border-2 border-gold bg-navy-blue/90 px-6 sm:px-8 py-1 sm:py-1.5 shadow-[0_0_30px_rgba(201,162,39,0.55)] backdrop-blur-md">
          <span className="size-2 sm:size-2.5 rounded-full bg-gold animate-ping" />
          <span className="font-mono text-sm sm:text-xl md:text-2xl font-extrabold tracking-[0.3em] text-gold uppercase drop-shadow-[0_0_10px_#c9a227]">
            OFFICIALLY LAUNCHED
          </span>
        </div>

        {/* 4. Ceremony Motto */}
        <p className="font-heading text-sm sm:text-xl md:text-2xl font-light italic tracking-wide text-white/95 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
          &ldquo;Let&apos;s Collaborate to Empower the Next Generation.&rdquo;
        </p>

        {/* 5. Date, Time & Venue */}
        <p className="font-mono text-[11px] sm:text-xs md:text-sm tracking-[0.15em] text-cyan-200/90 uppercase drop-shadow">
          Friday, 6th November 2026 • 1:00 PM • Steel Building, University of Moratuwa
        </p>

        {/* 6. FIT 25 Anniversary Logo Frame & Motto */}
        <div className="inline-flex items-center gap-2.5 sm:gap-3 rounded-full border border-gold/60 bg-navy-blue/80 px-4 sm:px-6 py-1 sm:py-1.5 shadow-[0_0_15px_rgba(201,162,39,0.3)] backdrop-blur-md">
          <span className="font-heading text-xs sm:text-sm font-black tracking-wider text-gold">
            FIT 25
          </span>
          <span className="h-3 w-px bg-gold/50" />
          <span className="font-mono text-[10px] sm:text-xs font-bold tracking-[0.2em] text-white/90 uppercase">
            25 YEARS OF EXCELLENCE
          </span>
        </div>

        {audioUnavailable ? <span className="sr-only">Audio unavailable</span> : null}
      </div>
    </div>
  );
}
