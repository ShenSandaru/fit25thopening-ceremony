"use client";

import { useEffect, useRef } from "react";

type CornerParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  glow: string;
  rotation: number;
  rotationSpeed: number;
  tilt: number;
  tiltSpeed: number;
  opacity: number;
  decay: number;
  shape: "ribbon" | "spark" | "diamond";
};

const CELEBRATION_PALETTE = [
  { color: "#c9a227", glow: "rgba(201, 162, 39, 0.8)" }, // Brand Gold
  { color: "#f6e076", glow: "rgba(246, 224, 118, 0.85)" }, // Champagne Gold
  { color: "#00f0ff", glow: "rgba(0, 240, 255, 0.75)" }, // Cyber Cyan
  { color: "#ffffff", glow: "rgba(255, 255, 255, 0.85)" }, // Starlight White
  { color: "#38bdf8", glow: "rgba(56, 189, 248, 0.7)" }, // Ice Blue
] as const;

export function UpperCornerCelebration() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let animationFrameId = 0;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles: CornerParticle[] = [];

    const spawnFromCorner = (corner: "top-left" | "top-right", count: number, power = 1) => {
      const originX = corner === "top-left" ? -8 : width + 8;
      const originY = -8;
      // Aim diagonally inward and downward from the upper corners
      const baseAngle = corner === "top-left" ? Math.PI * 0.22 : Math.PI * 0.78;
      const spread = Math.PI * 0.28;

      for (let i = 0; i < count; i++) {
        const angle = baseAngle + (Math.random() - 0.5) * spread;
        const speed = (Math.random() * 14 + 7) * power;
        const palette =
          CELEBRATION_PALETTE[Math.floor(Math.random() * CELEBRATION_PALETTE.length)]!;
        const roll = Math.random();
        const shape: CornerParticle["shape"] =
          roll < 0.6 ? "ribbon" : roll < 0.85 ? "diamond" : "spark";

        particles.push({
          x: originX + (corner === "top-left" ? Math.random() * 45 : -Math.random() * 45),
          y: originY + Math.random() * 35,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.75,
          width: shape === "ribbon" ? Math.random() * 10 + 7 : Math.random() * 6 + 4,
          height: shape === "ribbon" ? Math.random() * 5 + 3.5 : Math.random() * 6 + 4,
          color: palette.color,
          glow: palette.glow,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.14,
          tilt: Math.random() * Math.PI * 2,
          tiltSpeed: Math.random() * 0.12 + 0.05,
          opacity: 1,
          decay: Math.random() * 0.0028 + 0.0018,
          shape,
        });
      }
    };

    // Grand opening bursts from both upper corners
    spawnFromCorner("top-left", 55, 1.15);
    spawnFromCorner("top-right", 55, 1.15);

    const waveTimers = [
      window.setTimeout(() => {
        spawnFromCorner("top-left", 40, 1);
        spawnFromCorner("top-right", 40, 1);
      }, 450),
      window.setTimeout(() => {
        spawnFromCorner("top-left", 35, 0.9);
        spawnFromCorner("top-right", 35, 0.9);
      }, 1100),
    ];

    let tick = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      tick++;

      // Emit gentle celebratory streams from top-left and top-right corners
      if (tick % 6 === 0 && particles.length < 220) {
        spawnFromCorner("top-left", 2, 0.75);
        spawnFromCorner("top-right", 2, 0.75);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + 0.14;
        p.rotation += p.rotationSpeed;
        p.tilt += p.tiltSpeed;
        p.x += Math.sin(p.tilt) * 0.55;
        p.opacity -= p.decay;

        if (p.opacity <= 0.02 || p.y > height + 40) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(1, Math.cos(p.tilt));

        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.glow;

        if (p.shape === "ribbon") {
          ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        } else if (p.shape === "diamond") {
          ctx.beginPath();
          ctx.moveTo(0, -p.width * 0.7);
          ctx.lineTo(p.width * 0.5, 0);
          ctx.lineTo(0, p.width * 0.7);
          ctx.lineTo(-p.width * 0.5, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.width * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      for (const timer of waveTimers) {
        clearTimeout(timer);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-40"
      />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
        <div
          className="absolute -top-24 -left-24 h-[520px] w-[520px] rounded-full opacity-55 blur-3xl animate-pulse"
          style={{
            background:
              "radial-gradient(circle at top left, rgba(201,162,39,0.45), rgba(0,240,255,0.16) 45%, transparent 72%)",
          }}
        />
        <div
          className="absolute -top-24 -right-24 h-[520px] w-[520px] rounded-full opacity-55 blur-3xl animate-pulse"
          style={{
            background:
              "radial-gradient(circle at top right, rgba(201,162,39,0.45), rgba(0,240,255,0.16) 45%, transparent 72%)",
          }}
        />
      </div>
    </>
  );
}

