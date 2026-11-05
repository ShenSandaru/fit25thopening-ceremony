"use client";

import { useRef, useState } from "react";

type SlideToActivateProps = {
  disabled: boolean;
  busy: boolean;
  isActivated?: boolean;
  onActivate: () => void;
};

const THRESHOLD = 0.78;

export function SlideToActivate({
  disabled,
  busy,
  isActivated = false,
  onActivate,
}: SlideToActivateProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragging = useRef(false);
  const progressRef = useRef(0);
  const triggeredRef = useRef(false);

  function ratio(clientX: number): number {
    const track = trackRef.current;
    if (!track) {
      return 0;
    }
    const rect = track.getBoundingClientRect();
    const thumb = 68;
    const usable = Math.max(1, rect.width - thumb);
    return Math.min(1, Math.max(0, (clientX - rect.left - thumb / 2) / usable));
  }

  function updateDrag(clientX: number) {
    if (!dragging.current || disabled || busy || isActivated) {
      return;
    }
    const next = ratio(clientX);
    progressRef.current = next;
    setProgress(next);

    // Trigger immediately once the guest slides past the threshold for effortless mobile UX
    if (next >= THRESHOLD && !triggeredRef.current) {
      triggeredRef.current = true;
      dragging.current = false;
      setIsDragging(false);
      progressRef.current = 1;
      setProgress(1);
      onActivate();
    }
  }

  function finish(clientX?: number) {
    if (!dragging.current) {
      return;
    }
    dragging.current = false;
    setIsDragging(false);
    const finalValue =
      clientX !== undefined ? Math.max(progressRef.current, ratio(clientX)) : progressRef.current;
    if (!disabled && !busy && !isActivated && finalValue >= THRESHOLD) {
      if (!triggeredRef.current) {
        triggeredRef.current = true;
        progressRef.current = 1;
        setProgress(1);
        onActivate();
      }
      return;
    }
    if (!isActivated) {
      progressRef.current = 0;
      setProgress(0);
    }
  }

  const displayProgress = isActivated || busy ? 1 : progress;
  const isNearlyUnlocked = displayProgress >= 0.65;

  return (
    <div className="w-full max-w-xl">
      {/* Tactile Holographic Slide Track */}
      <div
        ref={trackRef}
        style={{ touchAction: "none", WebkitUserSelect: "none" }}
        className={`relative h-22 overflow-hidden rounded-full border-2 transition-colors duration-300 select-none touch-none ${
          isActivated
            ? "border-gold bg-navy-blue shadow-[0_0_30px_rgba(201,162,39,0.45)]"
            : disabled
              ? "border-slate-700/60 bg-slate-900/60 opacity-60 cursor-not-allowed"
              : busy
                ? "border-gold/80 bg-navy-blue shadow-[0_0_25px_rgba(201,162,39,0.3)] cursor-wait"
                : isNearlyUnlocked
                  ? "border-gold bg-navy-blue shadow-[0_0_30px_rgba(201,162,39,0.4)] cursor-grab active:cursor-grabbing"
                  : "border-cyan-500/50 bg-navy-blue/90 shadow-[0_0_20px_rgba(0,240,255,0.2)] cursor-grab active:cursor-grabbing"
        }`}
        onPointerDown={(event) => {
          if (disabled || busy || isActivated) {
            return;
          }
          triggeredRef.current = false;
          dragging.current = true;
          setIsDragging(true);
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Some mobile browsers do not support pointer capture on touch; touch handlers cover it
          }
          updateDrag(event.clientX);
        }}
        onPointerMove={(event) => {
          updateDrag(event.clientX);
        }}
        onPointerUp={(event) => finish(event.clientX)}
        onPointerCancel={() => finish()}
        onTouchStart={(event) => {
          if (disabled || busy || isActivated) {
            return;
          }
          const touch = event.touches[0];
          if (!touch) {
            return;
          }
          triggeredRef.current = false;
          dragging.current = true;
          setIsDragging(true);
          updateDrag(touch.clientX);
        }}
        onTouchMove={(event) => {
          const touch = event.touches[0];
          if (!touch) {
            return;
          }
          updateDrag(touch.clientX);
        }}
        onTouchEnd={(event) => {
          const touch = event.changedTouches[0];
          finish(touch?.clientX);
        }}
        onTouchCancel={() => finish()}
      >
        {/* Dynamic Energy Fill Bar */}
        <div
          className={`absolute inset-y-0 left-0 ${isDragging ? "" : "transition-all duration-150"} ${
            isNearlyUnlocked
              ? "bg-gradient-to-r from-cyan-500/30 via-gold/40 to-gold/70"
              : "bg-gradient-to-r from-cyan-600/20 to-cyan-400/40"
          }`}
          style={{ width: `${displayProgress * 100}%` }}
        />

        {/* Laser Sweep Beam behind thumb */}
        {isDragging && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-2 bg-white shadow-[0_0_12px_#ffffff] animate-pulse"
            style={{ left: `calc(1rem + ${displayProgress} * (100% - 5.5rem))` }}
          />
        )}

        {/* Track Guidance Text */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-16">
          <p
            className={`font-mono text-xs sm:text-sm font-bold tracking-[0.2em] sm:tracking-[0.25em] uppercase transition-colors ${
              isActivated
                ? "text-gold drop-shadow-[0_0_8px_#c9a227]"
                : disabled
                  ? "text-slate-500"
                  : busy
                    ? "text-gold animate-pulse"
                    : isNearlyUnlocked
                      ? "text-gold drop-shadow-[0_0_8px_#c9a227]"
                      : "text-cyan-300/90"
            }`}
          >
            {isActivated
              ? "BIOMETRIC SIGNAL LOCKED ✓"
              : busy
                ? "TRANSMITTING BIOMETRIC SIGNAL…"
                : disabled
                  ? "AWAITING CEREMONY START"
                  : "SLIDE TO ACTIVATE BIOMETRIC LOCK >>>"}
          </p>
        </div>

        {/* Interactive Holographic Thumb */}
        <div
          className={`pointer-events-none absolute top-2 flex size-18 items-center justify-center rounded-full border-2 ${
            isDragging ? "" : "transition-all duration-150"
          } ${
            isActivated
              ? "border-white bg-gold text-navy-blue shadow-[0_0_25px_#c9a227]"
              : disabled
                ? "border-slate-600 bg-slate-800 text-slate-500 shadow"
                : busy
                  ? "border-gold bg-gold text-navy-blue shadow-[0_0_20px_#c9a227] animate-pulse"
                  : isNearlyUnlocked
                    ? "border-white bg-gold text-navy-blue shadow-[0_0_25px_#c9a227] scale-105"
                    : "border-cyan-300 bg-cyan-500 text-navy-blue shadow-[0_0_20px_rgba(0,240,255,0.7)]"
          }`}
          style={{ left: `calc(0.4rem + ${displayProgress} * (100% - 5rem))` }}
          aria-hidden="true"
        >
          {/* Authentic Holographic Biometric Fingerprint Glyph */}
          <svg
            viewBox="0 0 24 24"
            className="size-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
            <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
            <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
            <path d="M2 12a10 10 0 0 1 18-6" />
            <path d="M2 16h.01" />
            <path d="M21.8 16c.2-2 .131-5.354 0-6" />
            <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
            <path d="M8.65 22c.21-.66.45-1.32.57-2" />
            <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
          </svg>
        </div>
      </div>

      {/* Accessible Keyboard Activation Button (Hidden once activation succeeded) */}
      {!isActivated && (
        <button
          type="button"
          className="mt-4 min-h-12 w-full rounded-xl border border-cyan-500/40 bg-navy-blue/60 px-4 py-3 font-mono text-sm font-semibold tracking-wider text-cyan-300 hover:border-gold hover:text-gold hover:bg-navy-blue/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          disabled={disabled || busy}
          onClick={onActivate}
        >
          Activate with keyboard
        </button>
      )}
    </div>
  );
}
