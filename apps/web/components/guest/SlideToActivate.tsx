"use client";

import { useRef, useState } from "react";

type SlideToActivateProps = {
  disabled: boolean;
  busy: boolean;
  onActivate: () => void;
};

const THRESHOLD = 0.92;

export function SlideToActivate({ disabled, busy, onActivate }: SlideToActivateProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const dragging = useRef(false);

  function ratio(clientX: number): number {
    const track = trackRef.current;
    if (!track) {
      return 0;
    }
    const rect = track.getBoundingClientRect();
    const thumb = 64;
    const usable = Math.max(1, rect.width - thumb);
    return Math.min(1, Math.max(0, (clientX - rect.left - thumb / 2) / usable));
  }

  function finish(value: number) {
    dragging.current = false;
    if (!disabled && !busy && value >= THRESHOLD) {
      setProgress(1);
      onActivate();
      return;
    }
    setProgress(0);
  }

  return (
    <div className="w-full max-w-xl">
      <div
        ref={trackRef}
        className="relative h-20 overflow-hidden rounded-full bg-light-grey"
        onPointerDown={(event) => {
          if (disabled || busy) {
            return;
          }
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          setProgress(ratio(event.clientX));
        }}
        onPointerMove={(event) => {
          if (!dragging.current) {
            return;
          }
          setProgress(ratio(event.clientX));
        }}
        onPointerUp={(event) => finish(ratio(event.clientX))}
        onPointerCancel={() => finish(0)}
      >
        <div
          className="absolute inset-y-0 left-0 bg-navy-blue/15"
          style={{ width: `${progress * 100}%` }}
        />
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-medium text-dark-grey">
          {busy ? "Confirming…" : disabled ? "Waiting" : "Slide to open the ceremony"}
        </p>
        <div
          className="absolute top-2 size-16 rounded-full bg-navy-blue shadow-md"
          style={{ left: `calc(0.5rem + ${progress} * (100% - 4.5rem))` }}
          aria-hidden="true"
        />
      </div>
      <button
        type="button"
        className="mt-4 min-h-12 w-full rounded-lg border border-navy-blue px-4 py-3 font-medium text-navy-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-blue disabled:opacity-50"
        disabled={disabled || busy}
        onClick={onActivate}
      >
        Activate with keyboard
      </button>
    </div>
  );
}
