"use client";

import { useEffect, useRef } from "react";

export const briefCelebrationDurationMs = 3800;

const colourTokens = [
  "--brisk-brand-primary", "--brisk-pink-40", "--brisk-extra-stars",
  "--brisk-extra-cyanic-secondary", "--brisk-green-40", "--brisk-orange-40",
];

export function BriefApprovalConfetti() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!canvas || motion.matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const styles = getComputedStyle(canvas);
    const colours = colourTokens.map((token) => styles.getPropertyValue(token).trim());
    let width = 0;
    let height = 0;
    function resize() {
      if (!canvas || !ctx) return;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // Two salvos from the corners, followed by paper drifting in from overhead.
    // Positions and launch velocities use viewport units so wide screens fill too.
    const particles = Array.from({ length: 520 }, (_, index) => {
      const overhead = index >= 360;
      const fromLeft = index % 2 === 0;
      const side = fromLeft ? 1 : -1;
      const depth = 0.6 + Math.random() * 0.6;
      return {
        start: (overhead ? 0.4 + Math.random() * 1.35 : index < 220 ? 0 : 0.55) + Math.random() * 0.15,
        x: overhead ? Math.random() : fromLeft ? -0.015 : 1.015,
        y: overhead ? -0.04 : 0.83 + Math.random() * 0.16,
        vx: side * (overhead ? Math.random() * 0.13 : 0.18 + Math.random() * 1.55),
        vy: overhead ? 0.12 : -(1.4 + Math.random() * 2.25),
        fall: (0.27 + Math.random() * 0.23) * depth,
        phase: Math.random() * Math.PI * 2,
        spin: side * (2 + Math.random() * 6),
        width: (4 + Math.random() * 5) * depth,
        length: (7 + Math.random() * 11) * depth,
        round: index % 6 === 0,
        colour: colours[Math.floor(Math.random() * colours.length)],
      };
    });

    const started = performance.now();
    let frame = 0;
    function draw(now: number) {
      if (!ctx) return;
      const elapsed = now - started;
      ctx.clearRect(0, 0, width, height);
      if (motion.matches || elapsed >= briefCelebrationDurationMs) return;
      ctx.globalAlpha = Math.min(1, (briefCelebrationDurationMs - elapsed) / 350);
      for (const p of particles) {
        const t = elapsed / 1000 - p.start;
        if (t < 0) continue;
        // Drag slows the launch into a flutter at terminal fall speed.
        const travel = (1 - Math.exp(-1.8 * t)) / 1.8;
        const angle = p.phase + p.spin * t;
        const x = width * (p.x + p.vx * travel) + 12 * (Math.sin(angle) - Math.sin(p.phase));
        const y = height * (p.y + p.fall * t + (p.vy - p.fall) * travel);
        if (y < -24 || y > height + 24 || x < -24 || x > width + 24) continue;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.scale(0.18 + 0.82 * Math.abs(Math.cos(angle * 1.3)), 1);
        ctx.fillStyle = p.colour;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.width / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.width / 2, -p.length / 2, p.width, p.length);
        }
        ctx.restore();
      }
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="brief-approval-confetti" aria-hidden="true" />;
}
