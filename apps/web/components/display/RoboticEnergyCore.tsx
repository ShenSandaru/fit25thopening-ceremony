"use client";

type RoboticEnergyCoreProps = {
  activatedCount: number; // 0, 1, 2, 3
  isCountdown?: boolean;
  isOpened?: boolean;
  countdownSeconds?: number | null;
};

export function RoboticEnergyCore({
  activatedCount,
  isCountdown = false,
  isOpened = false,
  countdownSeconds = null,
}: RoboticEnergyCoreProps) {
  const isFullyCharged = activatedCount === 3 || isCountdown || isOpened;
  const glowColor = isFullyCharged ? "#c9a227" : activatedCount > 0 ? "#38bdf8" : "#00f0ff";
  const coreScale = isOpened ? "scale-125" : isCountdown ? "scale-110" : "scale-100";

  return (
    <div
      className={`relative flex items-center justify-center transition-transform duration-700 ${coreScale}`}
    >
      {/* Outer Glow Halo */}
      <div
        aria-hidden="true"
        className={`absolute rounded-full transition-all duration-1000 ${
          isOpened
            ? "size-[500px] bg-gold/30 blur-3xl animate-pulse"
            : isCountdown
              ? "size-[420px] bg-gold/25 blur-2xl animate-pulse"
              : activatedCount > 0
                ? "size-[360px] bg-cyan-500/20 blur-2xl"
                : "size-[300px] bg-blue-600/15 blur-xl"
        }`}
      />

      {/* SVG Mechanical Reactor Rings */}
      <svg
        viewBox="0 0 400 400"
        className="size-[320px] sm:size-[380px] lg:size-[440px] drop-shadow-[0_0_25px_rgba(0,240,255,0.25)] select-none"
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
            r="180"
            fill="none"
            stroke="rgba(0, 240, 255, 0.2)"
            strokeWidth="1.5"
            strokeDasharray="8 6"
          />
          <circle
            cx="200"
            cy="200"
            r="188"
            fill="none"
            stroke={isFullyCharged ? "#c9a227" : "rgba(255, 255, 255, 0.3)"}
            strokeWidth="2.5"
            strokeDasharray="40 80"
          />
          {/* Heavy Mechanical Brackets */}
          {[0, 90, 180, 270].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 200 200)`}>
              <rect
                x="195"
                y="8"
                width="10"
                height="12"
                fill={isFullyCharged ? "#c9a227" : "#00f0ff"}
              />
              <path
                d="M 185 20 L 215 20 L 205 28 L 195 28 Z"
                fill={isFullyCharged ? "rgba(201,162,39,0.7)" : "rgba(0,240,255,0.5)"}
              />
            </g>
          ))}
        </g>

        {/* 2. Middle Telemetry Gear Ring (Rotates clockwise) */}
        <g className="animate-[spin_20s_linear_infinite] origin-center">
          <circle
            cx="200"
            cy="200"
            r="150"
            fill="none"
            stroke={isFullyCharged ? "rgba(201, 162, 39, 0.4)" : "rgba(56, 189, 248, 0.3)"}
            strokeWidth="6"
            strokeDasharray="3 4"
          />
          <circle
            cx="200"
            cy="200"
            r="142"
            fill="none"
            stroke={isFullyCharged ? "#fbbf24" : "#00f0ff"}
            strokeWidth="1.5"
            strokeDasharray="30 20 10 20"
          />
          {/* Angular Chevron Guides */}
          {[45, 135, 225, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 200 200)`}>
              <path
                d="M 197 52 L 200 56 L 203 52"
                fill="none"
                stroke={isFullyCharged ? "#c9a227" : "#38bdf8"}
                strokeWidth="2"
              />
            </g>
          ))}
        </g>

        {/* 3. High-Speed Inner Magnetic Containment Ring */}
        <g className="animate-[spin_8s_linear_infinite] origin-center">
          <circle
            cx="200"
            cy="200"
            r="115"
            fill="none"
            stroke={isFullyCharged ? "#fef08a" : "#00f0ff"}
            strokeWidth="3"
            strokeDasharray="60 30"
            filter="url(#glow)"
          />
          <circle
            cx="200"
            cy="200"
            r="105"
            fill="none"
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        </g>

        {/* 4. Center Glowing Plasma Sphere */}
        <circle
          cx="200"
          cy="200"
          r={isOpened ? 90 : isCountdown ? 85 : 75}
          fill="url(#plasmaCore)"
          className={`transition-all duration-500 ${isCountdown ? "animate-pulse" : ""}`}
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
        <g stroke={glowColor} strokeWidth="1" opacity="0.6">
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
            className="font-heading text-8xl sm:text-9xl font-extrabold tabular-nums tracking-tighter text-white drop-shadow-[0_0_35px_#c9a227] animate-[display-digit_450ms_ease]"
          >
            {countdownSeconds}
          </span>
        ) : isOpened ? (
          <div className="flex flex-col items-center gap-1 animate-pulse">
            <span className="font-mono text-xs tracking-widest text-gold uppercase">REACTOR</span>
            <span className="font-heading text-3xl font-extrabold text-white tracking-wider">
              ONLINE
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <span className="font-mono text-[10px] tracking-widest text-cyan-300/80 uppercase">
              ENERGY CORE
            </span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]">
              {Math.round((activatedCount / 3) * 100)}%
            </span>
            <span className="font-mono text-[9px] tracking-widest text-cyan-400/60 uppercase">
              {activatedCount === 3 ? "LOCKED // ARMED" : `${activatedCount}/3 SIGNALS`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
