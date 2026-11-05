"use client";

import Image from "next/image";
import { RoboticEnergyCore } from "./RoboticEnergyCore";

type LaunchRevealProps = {
  audioUnavailable?: boolean;
};

export function LaunchReveal({ audioUnavailable = false }: LaunchRevealProps) {
  return (
    <div className="display-enter relative z-20 flex w-full max-w-6xl flex-col items-center justify-center gap-4 sm:gap-6 px-2 sm:px-4 text-center select-none">
      {/* Main Balanced Composition: Left Anniversary Plaque + Right Announcement Focal Point */}
      <div className="relative z-30 flex w-full flex-col md:flex-row items-center justify-center gap-6 sm:gap-8 lg:gap-12">
        {/* 1. Left: Official FIT 25th Anniversary Prestige Plaque */}
        <div className="relative flex flex-col items-center justify-between w-full max-w-[270px] sm:max-w-[300px] md:max-w-[320px] lg:max-w-[340px] min-h-[300px] sm:min-h-[350px] lg:min-h-[380px] p-5 sm:p-6 rounded-2xl border border-gold/50 bg-navy-blue/60 backdrop-blur-md shadow-[0_0_35px_rgba(201,162,39,0.25)] transition-all duration-700">
          {/* Corner Reticles */}
          <div
            aria-hidden="true"
            className="absolute top-2 left-2 size-3 border-t-2 border-l-2 border-gold"
          />
          <div
            aria-hidden="true"
            className="absolute top-2 right-2 size-3 border-t-2 border-r-2 border-gold"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-2 left-2 size-3 border-b-2 border-l-2 border-gold"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-2 right-2 size-3 border-b-2 border-r-2 border-gold"
          />

          {/* Ambient gold glow behind image */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute size-44 sm:size-52 rounded-full bg-radial from-gold/30 via-gold/10 to-transparent blur-2xl"
          />

          {/* Shimmer light sweep */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
          >
            <div className="animate-laser-sweep absolute inset-y-0 w-1/2 -left-full bg-gradient-to-r from-transparent via-gold/15 to-transparent skew-x-[-25deg]" />
          </div>

          {/* Plaque Header */}
          <div className="relative z-10 flex items-center gap-2 border-b border-gold/20 pb-2 w-full justify-center">
            <span className="size-1 rounded-full bg-gold" />
            <span className="font-mono text-[9px] sm:text-[10px] font-bold tracking-[0.3em] text-gold/80 uppercase">
              25th Anniversary Edition
            </span>
            <span className="size-1 rounded-full bg-cyan-400" />
          </div>

          {/* Official Anniversary Emblem */}
          <div className="relative z-10 my-auto flex items-center justify-center py-2">
            <Image
              src="/images/FIT-25th-Anniversary-White.png"
              alt="FIT 25th Anniversary - 25 Years of Excellence"
              width={1536}
              height={1024}
              priority
              className="h-auto max-h-[clamp(120px,20vh,190px)] w-full max-w-[260px] object-contain drop-shadow-[0_0_30px_rgba(201,162,39,0.55)] transition-transform duration-700 hover:scale-105"
            />
          </div>

          {/* Cohesive Subtitle Badge */}
          <div className="relative z-10 inline-flex items-center gap-2 rounded-full border border-gold/60 bg-navy-blue/90 px-3.5 py-1 shadow-[0_0_15px_rgba(201,162,39,0.35)]">
            <span className="size-1.5 rounded-full bg-gold animate-pulse" />
            <span className="font-mono text-[10px] sm:text-xs font-bold tracking-[0.25em] text-gold uppercase">
              25 Years of Excellence
            </span>
            <span className="size-1.5 rounded-full bg-gold animate-pulse" />
          </div>
        </div>

        {/* Vertical Dividing Energy Conduit (Desktop) */}
        <div
          aria-hidden="true"
          className="hidden md:flex flex-col items-center justify-center h-60 lg:h-72 w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent"
        >
          <span className="size-1.5 rounded-full bg-gold animate-ping" />
        </div>

        {/* 2. Right: Central Announcement Sequence (Primary Focal Point) */}
        <div className="relative z-30 flex flex-1 flex-col items-center justify-center gap-[clamp(0.35rem,1.3vh,0.9rem)] max-w-2xl px-2">
          {/* Energized Compact Robotic Core in Opened State with Shockwave Halo */}
          <div className="relative flex items-center justify-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div className="animate-shockwave size-[220px] sm:size-[300px] rounded-full border-2 border-gold/70" />
              <div
                className="animate-shockwave size-[180px] sm:size-[260px] rounded-full border border-cyan-400/40"
                style={{ animationDelay: "600ms" }}
              />
              <div className="size-[300px] sm:size-[420px] rounded-full bg-radial from-gold/30 via-navy-blue/20 to-transparent blur-3xl animate-pulse" />
            </div>
            <RoboticEnergyCore activatedCount={3} isOpened compact />
          </div>

          {/* Ceremonial Subheading */}
          <h2 className="text-xs sm:text-sm font-mono font-medium tracking-[0.3em] text-cyan-300/90 uppercase">
            FIT Expo Opening Ceremony
          </h2>

          {/* Hero Title: FIT EXPO 2026 */}
          <h1 className="font-heading text-[clamp(2.5rem,5.5vh,5.25rem)] font-black tracking-tight text-white leading-none drop-shadow-[0_0_45px_rgba(201,162,39,0.95)]">
            FIT EXPO 2026
          </h1>

          {/* OFFICIALLY LAUNCHED Badge with Light Sweep */}
          <div className="relative overflow-hidden inline-flex items-center gap-2.5 sm:gap-3 rounded-full border-2 border-gold bg-navy-blue/90 px-6 sm:px-10 py-1.5 sm:py-2.5 shadow-[0_0_35px_rgba(201,162,39,0.65)] backdrop-blur-md">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden"
            >
              <div className="animate-laser-sweep absolute inset-y-0 w-1/2 -left-full bg-gradient-to-r from-transparent via-gold/25 to-transparent skew-x-[-25deg]" />
            </div>
            <span className="relative z-10 size-2 sm:size-2.5 rounded-full bg-gold animate-ping" />
            <span className="relative z-10 font-mono text-sm sm:text-xl md:text-2xl font-extrabold tracking-[0.35em] text-gold uppercase drop-shadow-[0_0_12px_#c9a227]">
              OFFICIALLY LAUNCHED
            </span>
          </div>

          {/* Official Theme / Motto */}
          <p className="font-heading text-sm sm:text-base md:text-lg lg:text-xl font-light italic tracking-wide text-white/95 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
            &ldquo;Let&apos;s Collaborate to Empower the Next Generation.&rdquo;
          </p>

          {audioUnavailable ? <span className="sr-only">Audio unavailable</span> : null}
        </div>
      </div>
    </div>
  );
}
