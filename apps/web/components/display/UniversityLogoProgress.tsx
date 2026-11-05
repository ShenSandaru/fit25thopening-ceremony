"use client";

import Image from "next/image";

type UniversityLogoProgressProps = {
  activatedCount: number; // 0, 1, 2, 3
};

export function UniversityLogoProgress({ activatedCount }: UniversityLogoProgressProps) {
  const isFullyActivated = activatedCount >= 3;
  const clampedCount = Math.max(0, Math.min(3, activatedCount));

  // Circular progress math: radius = 86 -> circumference ≈ 540.35
  const radius = 86;
  const circumference = 2 * Math.PI * radius;
  const progressFraction = clampedCount / 3;
  const strokeDashoffset = circumference * (1 - progressFraction);

  const glowColor = isFullyActivated ? "#c9a227" : "#00f0ff";

  return (
    <div
      className="relative flex items-center justify-center size-[160px] sm:size-[190px] lg:size-[220px] select-none"
      aria-label={`University of Moratuwa logo with activation progress: ${clampedCount} of 3 guests connected`}
    >
      {/* Ambient Radial Backdrop Glow */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute rounded-full transition-all duration-700 ${
          isFullyActivated
            ? "size-[180px] sm:size-[220px] bg-gold/25 blur-2xl animate-pulse"
            : clampedCount > 0
              ? "size-[160px] sm:size-[200px] bg-cyan-500/20 blur-xl"
              : "size-[140px] sm:size-[170px] bg-blue-600/10 blur-lg"
        }`}
      />

      {/* Futuristic Circular Border Progress Frame */}
      <svg
        viewBox="0 0 200 200"
        aria-hidden="true"
        className="absolute inset-0 size-full pointer-events-none drop-shadow-[0_0_20px_rgba(0,240,255,0.25)]"
      >
        <defs>
          <filter id="logoProgressGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Decorative Tech Ring (Slow rotation) */}
        <circle
          cx="100"
          cy="100"
          r="95"
          fill="none"
          stroke={glowColor}
          strokeWidth="1"
          strokeDasharray="4 8"
          opacity="0.3"
          className="animate-[spin_40s_linear_infinite] origin-center"
        />

        {/* Inactive Track Border */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(0, 240, 255, 0.15)"
          strokeWidth="4"
        />

        {/* Illuminated Progress Border (Cyan during progress, transitions to Gold at 3/3) */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={glowColor}
          strokeWidth="4.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
          filter="url(#logoProgressGlow)"
          className="transition-all duration-700 ease-out"
        />

        {/* 3 Equidistant Tri-Node Notch Markers (at 0/3, 1/3, 2/3 progress points) */}
        {/* Node 1: Top (12 o'clock, starting milestone) */}
        <circle
          cx="100"
          cy="14"
          r="3"
          fill={clampedCount >= 1 ? glowColor : "rgba(0, 240, 255, 0.3)"}
          className="transition-colors duration-500"
        />
        {/* Node 2: Bottom-Right (4 o'clock, 2nd milestone) */}
        <circle
          cx="174.5"
          cy="143"
          r="3"
          fill={clampedCount >= 2 ? glowColor : "rgba(0, 240, 255, 0.3)"}
          className="transition-colors duration-500"
        />
        {/* Node 3: Bottom-Left (8 o'clock, 3rd milestone) */}
        <circle
          cx="25.5"
          cy="143"
          r="3"
          fill={clampedCount >= 3 ? "#c9a227" : "rgba(0, 240, 255, 0.3)"}
          className="transition-colors duration-500"
        />
      </svg>

      {/* Official University of Moratuwa Logo (Central Identity) */}
      <div className="relative z-10 flex items-center justify-center p-3">
        <Image
          src="/images/University_of_Moratuwa_logo.png"
          alt="University of Moratuwa"
          width={306}
          height={325}
          priority
          className={`h-[90px] sm:h-[110px] lg:h-[125px] w-auto max-w-[85%] object-contain transition-all duration-700 ${
            isFullyActivated
              ? "drop-shadow-[0_0_25px_rgba(201,162,39,0.55)]"
              : clampedCount > 0
                ? "drop-shadow-[0_0_18px_rgba(0,240,255,0.45)]"
                : "drop-shadow-[0_0_12px_rgba(0,240,255,0.25)] opacity-95"
          }`}
        />
      </div>
    </div>
  );
}

