"use client";

import { RoboticEnergyCore } from "./RoboticEnergyCore";

type LaunchRevealProps = {
  audioUnavailable?: boolean;
};

export function LaunchReveal({ audioUnavailable = false }: LaunchRevealProps) {
  return (
    <div className="display-enter relative z-20 flex w-full max-w-6xl flex-col items-center justify-center gap-6 py-4 text-center">
      {/* Cinematic Golden Light Rays & Shockwave Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="animate-shockwave size-[500px] rounded-full border-2 border-gold/70" />
        <div
          className="animate-shockwave size-[420px] rounded-full border border-cyan-400/50"
          style={{ animationDelay: "500ms" }}
        />
        <div className="size-[650px] rounded-full bg-radial from-gold/30 via-navy-blue/20 to-transparent blur-3xl animate-pulse" />
      </div>

      {/* Energized Robotic Core in Opened State */}
      <div className="relative -mb-2">
        <RoboticEnergyCore activatedCount={3} isOpened />
      </div>

      {/* Official Announcement Sequence (Content in exact required order) */}
      <div className="relative z-30 flex flex-col items-center gap-4 max-w-4xl">
        {/* 1. University of Moratuwa Crest Frame */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-3">
            <span className="size-2 rounded-full bg-cyan-400" />
            <p className="font-mono text-xs sm:text-sm font-semibold tracking-[0.3em] text-cyan-300 uppercase">
              University of Moratuwa · Faculty of Information Technology
            </p>
            <span className="size-2 rounded-full bg-gold" />
          </div>
          <h2 className="text-sm font-mono tracking-widest text-white/70 uppercase">
            FIT Expo Opening Ceremony
          </h2>
        </div>

        {/* 2. FIT EXPO 2026 (Main Visual Focal Point) */}
        <h1 className="font-heading text-6xl sm:text-8xl lg:text-9xl font-black tracking-tight text-white drop-shadow-[0_0_50px_rgba(201,162,39,0.85)]">
          FIT EXPO 2026
        </h1>

        {/* 3. OFFICIALLY LAUNCHED */}
        <div className="inline-flex items-center gap-3 rounded-full border-2 border-gold bg-navy-blue/90 px-8 py-2 shadow-[0_0_35px_rgba(201,162,39,0.6)] backdrop-blur-md">
          <span className="size-2.5 rounded-full bg-gold animate-ping" />
          <span className="font-mono text-xl sm:text-2xl font-extrabold tracking-[0.35em] text-gold uppercase drop-shadow-[0_0_12px_#c9a227]">
            OFFICIALLY LAUNCHED
          </span>
        </div>

        {/* 4. Ceremony Motto */}
        <p className="font-heading text-2xl sm:text-3xl font-light italic tracking-wide text-white/95 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
          &ldquo;Let&apos;s Collaborate to Empower the Next Generation.&rdquo;
        </p>

        {/* 5. Date, Time & Venue */}
        <p className="font-mono text-sm sm:text-base tracking-[0.2em] text-cyan-200/90 uppercase drop-shadow">
          Friday, 6th November 2026 • 1:00 PM • Steel Building, University of Moratuwa
        </p>

        {/* 6. FIT 25 Anniversary Logo Frame & Motto */}
        <div className="mt-2 inline-flex items-center gap-3 rounded-full border border-gold/60 bg-navy-blue/80 px-6 py-2 shadow-[0_0_20px_rgba(201,162,39,0.3)] backdrop-blur-md">
          <span className="font-heading text-base font-black tracking-wider text-gold">FIT 25</span>
          <span className="h-3 w-px bg-gold/50" />
          <span className="font-mono text-xs font-bold tracking-[0.25em] text-white/90 uppercase">
            25 YEARS OF EXCELLENCE
          </span>
        </div>

        {audioUnavailable ? <span className="sr-only">Audio unavailable</span> : null}
      </div>
    </div>
  );
}
