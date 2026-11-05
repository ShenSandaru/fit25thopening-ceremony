"use client";

type RoboticEnergyCoreProps = {
  activatedCount: number; // 0, 1, 2, 3
  isCountdown?: boolean;
  isOpened?: boolean;
  countdownSeconds?: number | null;
  compact?: boolean;
};

export function RoboticEnergyCore({
  activatedCount,
  isCountdown = false,
  isOpened = false,
  countdownSeconds = null,
  compact = false,
}: RoboticEnergyCoreProps) {
  const isFullyCharged = activatedCount === 3 || isCountdown || isOpened;
  const glowColor = isFullyCharged ? "#c9a227" : activatedCount > 0 ? "#38bdf8" : "#00f0ff";
  const coreScale = compact
    ? "scale-100"
    : isOpened
      ? "scale-110 sm:scale-120"
      : isCountdown
        ? "scale-105 sm:scale-110"
        : "scale-100";

  const svgSize = compact
    ? "size-[160px] sm:size-[200px] lg:size-[230px]"
    : "size-[260px] sm:size-[340px] lg:size-[400px]";

  return (
    <div
      className={`relative flex items-center justify-center transition-transform duration-700 ${coreScale}`}
    >
      {/* Outer Glow Halo */}
      <div
        aria-hidden="true"
        className={`absolute rounded-full transition-all duration-1000 ${
          isOpened
            ? "size-[360px] sm:size-[460px] bg-gold/30 blur-3xl animate-pulse"
            : isCountdown
              ? "size-[300px] sm:size-[380px] bg-gold/25 blur-2xl animate-pulse"
              : activatedCount > 0
                ? "size-[260px] sm:size-[320px] bg-cyan-500/20 blur-2xl"
                : "size-[220px] sm:size-[280px] bg-blue-600/15 blur-xl"
        }`}
      />

      {/* SVG Mechanical Reactor Rings */}
      <svg
        viewBox="0 0 400 400"
        className={`${svgSize} drop-shadow-[0_0_25px_rgba(0,240,255,0.25)] select-none`}
      >
        <defs>
          <radialGradient id="plasmaCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isFullyCharged ? "#ffffff" : "#cbfaff"} stopOpacity="1" />
            <stop
              offset="45%"
              stopColor={isFullyCharged ? "#fef08a" : "#38bdf8"}
              stopOpacity="0.8"
            />
            <stop
              offset="80%"
              stopColor={isFullyCharged ? "#c9a227" : "#0284c7"}
              stopOpacity="0.4"
            />
            <stop
              offset="100%"
              stopColor={isFullyCharged ? "#1b3a6b" : "#0f172a"}
              stopOpacity="0"
            />
          </radialGradient>

          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Outer Mechanical Segmented Ring (Rotates counter-clockwise) */}
        <g className="animate-[spin_32s_linear_infinite_reverse] origin-center">
          <circle
            cx="200"
            cy="200"
            r="185"
            fill="none"
            stroke={glowColor}
            strokeWidth="1.5"
            strokeDasharray="4 8"
            opacity="0.4"
          />
          <circle
            cx="200"
            cy="200"
            r="175"
            fill="none"
            stroke={glowColor}
            strokeWidth="3"
            strokeDasharray="45 15 25 15"
            opacity="0.8"
          />
          {/* Mechanical Calipers at 90-degree points */}
          <path d="M 195 15 L 205 15 L 200 25 Z" fill={glowColor} />
          <path d="M 195 385 L 205 385 L 200 375 Z" fill={glowColor} />
          <path d="M 15 195 L 15 205 L 25 200 Z" fill={glowColor} />
          <path d="M 385 195 L 385 205 L 375 200 Z" fill={glowColor} />
        </g>

        {/* 2. Middle Planetary Gear & Chevron Ring (Rotates clockwise) */}
        <g className="animate-[spin_24s_linear_infinite] origin-center">
          <circle
            cx="200"
            cy="200"
            r="150"
            fill="none"
            stroke={isFullyCharged ? "#fef08a" : "#00f0ff"}
            strokeWidth="2"
            strokeDasharray="8 6 2 6"
            opacity="0.6"
          />
          <circle
            cx="200"
            cy="200"
            r="135"
            fill="none"
            stroke={glowColor}
            strokeWidth="6"
            strokeDasharray="3 9"
            opacity="0.75"
          />
          {/* Orbital Data Notches */}
          <circle cx="200" cy="50" r="4" fill={glowColor} />
          <circle cx="200" cy="350" r="4" fill={glowColor} />
          <circle cx="50" cy="200" r="4" fill={glowColor} />
          <circle cx="350" cy="200" r="4" fill={glowColor} />
        </g>

        {/* 3. High-Speed Inner Cyan Turbine (Rotates counter-clockwise) */}
        <g className="animate-[spin_12s_linear_infinite_reverse] origin-center">
          <circle
            cx="200"
            cy="200"
            r="112"
            fill="none"
            stroke={isFullyCharged ? "#fbbf24" : "#38bdf8"}
            strokeWidth="2.5"
            strokeDasharray="60 30"
            opacity="0.9"
          />
          <circle
            cx="200"
            cy="200"
            r="98"
            fill="none"
            stroke={glowColor}
            strokeWidth="1.5"
            strokeDasharray="12 4"
            opacity="0.7"
          />
        </g>

        {/* 4. Central Glowing Plasma Core Sphere */}
        <circle
          cx="200"
          cy="200"
          r="84"
          fill="url(#plasmaCore)"
          className="transition-all duration-1000"
        />

        {/* Dynamic Energy Level Arc */}
        <circle
          cx="200"
          cy="200"
          r="80"
          fill="none"
          stroke={isFullyCharged ? "#fbbf24" : "#00f0ff"}
          strokeWidth="4"
          strokeDasharray="502"
          strokeDashoffset={502 - 502 * (activatedCount / 3)}
          strokeLinecap="round"
          transform="rotate(-90 200 200)"
          className="transition-all duration-700 ease-out"
          filter="url(#glow)"
        />

        {/* Laser Crosshair Reticles in Core Center */}
        <g
          stroke={glowColor}
          strokeWidth="1"
          opacity={activatedCount > 0 || isOpened ? "0.2" : "0.4"}
        >
          <line x1="200" y1="170" x2="200" y2="185" />
          <line x1="200" y1="215" x2="200" y2="230" />
          <line x1="170" y1="200" x2="185" y2="200" />
          <line x1="215" y1="200" x2="230" y2="200" />
          <circle cx="200" cy="200" r="12" fill="none" />
        </g>
      </svg>

      {/* Center Readout Text / Countdown Digit */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {isCountdown ? (
          <span
            key={countdownSeconds}
            className="font-heading text-7xl sm:text-9xl font-extrabold tabular-nums tracking-tighter text-white drop-shadow-[0_0_35px_#c9a227] animate-[display-digit_450ms_ease]"
          >
            {countdownSeconds}
          </span>
        ) : isOpened ? (
          <div className="flex flex-col items-center gap-0.5 animate-pulse">
            <span className="font-mono text-[10px] sm:text-xs tracking-widest text-gold uppercase drop-shadow">
              REACTOR
            </span>
            <span className="font-heading text-xl sm:text-2xl font-extrabold text-white tracking-wider drop-shadow-[0_0_10px_#c9a227]">
              ONLINE
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-0.5">
            <span className="font-mono text-[9px] sm:text-[10px] tracking-widest text-cyan-300/80 uppercase">
              ENERGY CORE
            </span>
            <span className="font-mono text-base sm:text-2xl font-black text-white drop-shadow-[0_0_12px_rgba(0,240,255,0.9)] leading-none my-0.5">
              {Math.round((activatedCount / 3) * 100)}%
            </span>
            <span className="font-mono text-[8px] sm:text-[9px] font-semibold tracking-wider text-cyan-300 uppercase bg-navy-blue/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
              {activatedCount === 3 ? "LOCKED // ARMED" : `${activatedCount}/3 SIGNALS`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
