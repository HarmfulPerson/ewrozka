'use client';

import { useEffect, useRef } from 'react';
import './subtle-stars.css';

interface SubtleStarsProps {
  /** Max number of stars. Defaults to 60. */
  count?: number;
  /** Max opacity for brightest stars. Defaults to 0.45. */
  maxOpacity?: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
  maxAlpha: number;
  rotation: number;
}

/** Draw a 4-pointed star shape */
function drawStar4(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerR: number,
  innerR: number,
  rotation: number,
) {
  const points = 4;
  const step = Math.PI / points;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = i * step - Math.PI / 2 + rotation;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function SubtleStars({ count = 60, maxOpacity = 0.45 }: SubtleStarsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mobile = isTouchDevice();
    let w = 0;
    let h = 0;
    let stars: Star[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      w = parent.offsetWidth;
      h = parent.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    };

    const createStars = () => {
      stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: 1.5 + Math.random() * 3,
          phase: Math.random() * Math.PI * 2,
          speed: 0.003 + Math.random() * 0.008,
          maxAlpha: (0.15 + Math.random() * 0.85) * maxOpacity,
          rotation: Math.random() * Math.PI * 0.5,
        });
      }
    };

    const drawStaticFrame = () => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const alpha = s.maxAlpha * 0.6;
        if (alpha < 0.01) continue;
        ctx.fillStyle = `rgba(230, 234, 243, ${alpha})`;
        drawStar4(ctx, s.x, s.y, s.size, s.size * 0.3, s.rotation);
        ctx.fill();
      }
    };

    resize();
    createStars();

    const ro = new ResizeObserver(() => {
      resize();
      createStars();
      if (mobile) drawStaticFrame();
    });
    ro.observe(canvas.parentElement!);

    // Mobile: render once, no animation
    if (mobile) {
      drawStaticFrame();
      return () => { ro.disconnect(); };
    }

    // Desktop: animated with glow
    let animId: number;

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      const t = now * 0.001;

      for (const s of stars) {
        const alpha = ((Math.sin(t * s.speed * 60 + s.phase) + 1) / 2) * s.maxAlpha;
        if (alpha < 0.01) continue;

        // glow
        const glowR = s.size * 2.5;
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
        grad.addColorStop(0, `rgba(167, 139, 250, ${alpha * 0.4})`);
        grad.addColorStop(1, 'rgba(167, 139, 250, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
        ctx.fill();

        // 4-pointed star
        ctx.fillStyle = `rgba(230, 234, 243, ${alpha})`;
        drawStar4(ctx, s.x, s.y, s.size, s.size * 0.3, s.rotation);
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [count, maxOpacity]);

  return <canvas ref={canvasRef} className="subtle-stars" />;
}
