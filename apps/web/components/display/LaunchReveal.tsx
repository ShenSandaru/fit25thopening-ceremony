"use client";

import { PROJECT_NAME } from "@fit-expo/shared";
import { RoboticEnergyCore } from "./RoboticEnergyCore";

type LaunchRevealProps = {
  audioUnavailable?: boolean;
};

export function LaunchReveal({ audioUnavailable = false }: LaunchRevealProps) {
  return (
    <div className="display-enter relative z-20 flex w-full max-w-6xl flex-col items-center justify-center gap-8 py-6 text-center">
      {/* Shockwave Energy Bursts */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="animate-shockwave size-[500px] rounded-full border-2 border-gold/70" />
        <div
          className="animate-shockwave size-[400px] rounded-full border border-cyan-400/50"
          style={{ animationDelay: "400ms" }}
        />
        <div className="size-[600px] rounded-full bg-radial from-gold/30 via-navy-blue/20 to-transparent blur-3xl animate-pulse" />
      </div>

      {/* Energized Robotic Core in Opened State */}
      <div className="relative mb-2">
        <RoboticEnergyCore activatedCount={3} isOpened />
      </div>

      {/* Announcement Content */}
      <div className="relative z-30 flex flex-col items-center gap-4">
        {/* Officially Open Status Pill */}
        <div className="inline-flex items-center gap-3 rounded-full border-2 border-gold bg-navy-blue/90 px-8 py-2 shadow-[0_0_35px_rgba(201,162,39,0.6)] backdrop-blur-md">
          <span className="size-3 rounded-full bg-gold animate-ping" />
          <span className="font-mono text-xl font-bold tracking-[0.35em] text-gold uppercase md:text-2xl">
            OFFICIALLY OPEN
          </span>
        </div>

        {/* Official Ceremony Heading */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-heading text-6xl font-black tracking-tight text-white md:text-8xl lg:text-9xl drop-shadow-[0_0_50px_rgba(201,162,39,0.7)]">
            {PROJECT_NAME}
          </h1>
          <p className="font-heading text-3xl font-extrabold tracking-[0.2em] text-cyan-300 md:text-4xl drop-shadow-[0_0_20px_#00f0ff]">
            FIT EXPO 2026
          </p>
        </div>

        {/* Institution Details */}
        <div className="flex flex-col items-center gap-1 text-white/90">
          <p className="text-2xl font-medium tracking-wider md:text-3xl">
            Faculty of Information Technology
          </p>
          <p className="font-mono text-lg tracking-[0.25em] text-white/70 uppercase md:text-xl">
            University of Moratuwa
          </p>
        </div>

        {audioUnavailable ? <span className="sr-only">Audio unavailable</span> : null}
      </div>
    </div>
  );
}
