"use client";

import { useEffect, useRef } from "react";

export function FuturisticHudOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Ambient floating energy particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Particle definition
    const particleCount = prefersReducedMotion ? 20 : 45;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.8,
      speedY: Math.random() * 0.4 + 0.15,
      speedX: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.5 + 0.2,
      isGold: Math.random() > 0.4,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        if (!prefersReducedMotion) {
          p.y -= p.speedY;
          p.x += p.speedX;

          if (p.y < 0) {
            p.y = height;
            p.x = Math.random() * width;
          }
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.isGold
          ? `rgba(201, 162, 39, ${p.opacity})`
          : `rgba(0, 240, 255, ${p.opacity * 0.7})`;
        ctx.shadowBlur = p.size * 3;
        ctx.shadowColor = p.isGold ? "#c9a227" : "#00f0ff";
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      {/* Background Particle Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-60"
      />

      {/* Cybernetic Grid & Circuit Pattern Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(27,58,107,0.45)_0%,rgba(7,19,38,0.95)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 240, 255, 0.12) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 240, 255, 0.12) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Technical HUD Framing Brackets */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-4 sm:inset-6 z-10 border border-cyan-500/20"
      >
        {/* Top-Left Corner */}
        <div className="absolute -top-1 -left-1 size-6 border-t-2 border-l-2 border-gold" />
        <div className="absolute top-2 left-3 font-mono text-[10px] tracking-widest text-cyan-400/60 uppercase">
          SYS.LOC // 06°47&apos;N 79°54&apos;E [UOM-FIT]
        </div>

        {/* Top-Right Corner */}
        <div className="absolute -top-1 -right-1 size-6 border-t-2 border-r-2 border-gold" />
        <div className="absolute top-2 right-3 flex items-center gap-2 font-mono text-[10px] tracking-widest text-cyan-400/60 uppercase">
          <span className="size-1.5 animate-pulse rounded-full bg-cyan-400" />
          QUANTUM CORE // TRIPLE-BIOMETRIC
        </div>

        {/* Bottom-Left Corner Reticle (Clean, non-colliding) */}
        <div className="absolute -bottom-1 -left-1 size-6 border-b-2 border-l-2 border-gold" />

        {/* Bottom-Right Corner Reticle (Clean, non-colliding) */}
        <div className="absolute -bottom-1 -right-1 size-6 border-b-2 border-r-2 border-gold" />
      </div>
    </>
  );
}
