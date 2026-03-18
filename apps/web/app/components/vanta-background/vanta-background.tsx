'use client';

import { useEffect, useRef } from 'react';
import './vanta-background.css';

interface VantaBackgroundProps {
  children: React.ReactNode;
}

// Star types with different visual characteristics
interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: [number, number, number]; // RGB
}

interface Nebula {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rotation: number;
  color: [number, number, number];
  opacity: number;
  pulsePhase: number;
  pulseSpeed: number;
}

interface Constellation {
  points: { x: number; y: number }[];
  connections: [number, number][];
  opacity: number;
  fadeDir: number;
  fadeSpeed: number;
}

// Star color palette — realistic astronomical colors
const STAR_COLORS: [number, number, number][] = [
  [200, 220, 255],   // blue-white (hot)
  [255, 255, 255],   // pure white
  [255, 240, 220],   // warm white
  [255, 210, 170],   // yellow-orange
  [170, 190, 255],   // blue
  [220, 200, 255],   // lavender
  [255, 200, 200],   // pale red (cool)
];

// Nebula colors — cosmic palette
const NEBULA_COLORS: [number, number, number][] = [
  [58, 74, 143],     // deep indigo (accent)
  [80, 50, 140],     // purple
  [40, 80, 150],     // blue
  [100, 60, 120],    // magenta-purple
  [30, 60, 100],     // dark teal
  [70, 40, 90],      // dark violet
];

const ZODIAC_TEMPLATES = [
  { points: [{ x: 50, y: 0 }, { x: 30, y: 40 }, { x: 70, y: 40 }, { x: 20, y: 70 }, { x: 80, y: 70 }], connections: [[0,1],[0,2],[1,3],[2,4]] as [number,number][] },
  { points: [{ x: 20, y: 0 }, { x: 80, y: 0 }, { x: 40, y: 30 }, { x: 60, y: 30 }, { x: 50, y: 60 }], connections: [[0,2],[1,3],[2,4],[3,4]] as [number,number][] },
  { points: [{ x: 30, y: 0 }, { x: 30, y: 70 }, { x: 70, y: 0 }, { x: 70, y: 70 }, { x: 50, y: 35 }], connections: [[0,1],[2,3],[0,4],[2,4]] as [number,number][] },
  { points: [{ x: 50, y: 0 }, { x: 30, y: 30 }, { x: 70, y: 30 }, { x: 50, y: 50 }, { x: 30, y: 70 }, { x: 70, y: 70 }], connections: [[0,1],[0,2],[1,3],[2,3],[3,4],[3,5]] as [number,number][] },
  { points: [{ x: 20, y: 30 }, { x: 80, y: 30 }, { x: 50, y: 0 }, { x: 50, y: 60 }], connections: [[0,1],[2,1],[1,3]] as [number,number][] },
  { points: [{ x: 20, y: 20 }, { x: 40, y: 40 }, { x: 60, y: 40 }, { x: 80, y: 20 }, { x: 70, y: 60 }], connections: [[0,1],[1,2],[2,3],[2,4]] as [number,number][] },
  { points: [{ x: 30, y: 20 }, { x: 30, y: 60 }, { x: 70, y: 20 }, { x: 70, y: 60 }, { x: 50, y: 40 }], connections: [[0,1],[2,3],[1,4],[3,4]] as [number,number][] },
];

function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function VantaBackground({ children }: VantaBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mobile = isTouchDevice();
    let w = 0, h = 0;
    let stars: Star[] = [];
    let nebulae: Nebula[] = [];
    let constellations: Constellation[] = [];
    // Static layer drawn once per resize
    let staticCanvas: HTMLCanvasElement | null = null;
    let lastW = 0;
    let initialized = false;

    const resize = () => {
      const newW = container.offsetWidth;
      const newH = container.offsetHeight;

      // Na mobilce: przebuduj tylko gdy zmieni się szerokość (nie przy scroll/header)
      if (mobile && initialized && newW === lastW) return;

      w = newW;
      h = newH;
      lastW = newW;
      canvas.width = w;
      canvas.height = h;
      createAll();
      drawStatic();
      if (mobile) drawMobileFrame();
      initialized = true;
    };

    const createAll = () => {
      createStars();
      createNebulae();
      createConstellations();
    };

    // ── Stars ──
    const createStars = () => {
      stars = [];
      const area = w * h;
      const density = w < 500 ? 0.0003 : 0.0004;
      const count = Math.max(400, Math.min(2500, Math.round(area * density)));

      for (let i = 0; i < count; i++) {
        const isBright = Math.random() < 0.08;
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: isBright ? 1 + Math.random() * 2 : 0.3 + Math.random() * 1.2,
          brightness: isBright ? 0.6 + Math.random() * 0.4 : 0.1 + Math.random() * 0.5,
          twinkleSpeed: 0.002 + Math.random() * 0.006,
          twinklePhase: Math.random() * Math.PI * 2,
          color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]!,
        });
      }
    };

    // ── Nebulae ──
    const createNebulae = () => {
      nebulae = [];
      const pages = Math.max(1, h / Math.max(window.innerHeight, 1));
      const count = Math.round(4 * pages);

      for (let i = 0; i < count; i++) {
        const baseSize = Math.min(w, 900);
        nebulae.push({
          x: Math.random() * w,
          y: Math.random() * h,
          rx: baseSize * (0.2 + Math.random() * 0.35),
          ry: baseSize * (0.15 + Math.random() * 0.25),
          rotation: Math.random() * Math.PI * 2,
          color: NEBULA_COLORS[Math.floor(Math.random() * NEBULA_COLORS.length)]!,
          opacity: 0.015 + Math.random() * 0.025,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.0005 + Math.random() * 0.001,
        });
      }
    };

    // ── Constellations ──
    const createConstellations = () => {
      constellations = [];
      const pages = Math.max(1, h / Math.max(window.innerHeight, 1));
      const count = Math.min(10, Math.round((w < 500 ? 2 : 3) * pages));

      for (let i = 0; i < count; i++) {
        const template = ZODIAC_TEMPLATES[Math.floor(Math.random() * ZODIAC_TEMPLATES.length)]!;
        const screenFactor = Math.min(w, 1200) / 1200;
        const scale = (0.8 + Math.random() * 0.6) * Math.max(screenFactor, 0.45);
        const margin = 100 * scale;
        const px = margin + Math.random() * Math.max(0, w - margin * 2);
        const py = margin + Math.random() * Math.max(0, h - margin * 2);

        constellations.push({
          points: template.points.map(p => ({ x: px + p.x * scale, y: py + p.y * scale })),
          connections: template.connections,
          opacity: 0.05 + Math.random() * 0.1,
          fadeDir: Math.random() > 0.5 ? 1 : -1,
          fadeSpeed: 0.0002 + Math.random() * 0.0004,
        });
      }
    };

    // ── Static layer (nebulae + faint background stars) ──
    const drawStatic = () => {
      staticCanvas = document.createElement('canvas');
      staticCanvas.width = w;
      staticCanvas.height = h;
      const sCtx = staticCanvas.getContext('2d');
      if (!sCtx) return;

      // Draw nebulae
      nebulae.forEach(n => {
        const [r, g, b] = n.color;
        const maxR = Math.max(n.rx, n.ry);
        const layers = [
          { scale: 1.0,  opMul: 0.4 },
          { scale: 0.65, opMul: 0.7 },
          { scale: 0.35, opMul: 1.0 },
        ];
        for (const layer of layers) {
          const lr = maxR * layer.scale;
          const grad = sCtx.createRadialGradient(n.x, n.y, 0, n.x, n.y, lr);
          const op = n.opacity * layer.opMul;
          grad.addColorStop(0, `rgba(${r},${g},${b},${op})`);
          grad.addColorStop(0.5, `rgba(${r},${g},${b},${op * 0.4})`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          sCtx.fillStyle = grad;
          sCtx.beginPath();
          sCtx.arc(n.x, n.y, lr, 0, Math.PI * 2);
          sCtx.fill();
        }
      });

      // Draw faint background stars
      const bgCount = Math.round((w * h) * 0.0003);
      for (let i = 0; i < bgCount; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const alpha = 0.05 + Math.random() * 0.15;
        const sz = 0.2 + Math.random() * 0.6;
        sCtx.fillStyle = `rgba(200,210,240,${alpha})`;
        sCtx.beginPath();
        sCtx.arc(x, y, sz, 0, Math.PI * 2);
        sCtx.fill();
      }
    };

    // ── Mobile: single static frame ──
    const drawMobileFrame = () => {
      ctx.clearRect(0, 0, w, h);
      if (staticCanvas) ctx.drawImage(staticCanvas, 0, 0);

      // Draw stars at fixed brightness (no animation)
      for (const star of stars) {
        const alpha = star.brightness * 0.7;
        if (alpha < 0.02) continue;
        const [r, g, b] = star.color;
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw constellations at fixed opacity
      for (const c of constellations) {
        if (c.opacity <= 0) continue;
        ctx.strokeStyle = `rgba(100, 120, 200, ${c.opacity * 0.5})`;
        ctx.lineWidth = 1;
        for (const [from, to] of c.connections) {
          const a = c.points[from], b = c.points[to];
          if (!a || !b) continue;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        for (const p of c.points) {
          ctx.fillStyle = `rgba(255, 255, 255, ${c.opacity * 0.8})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    // ── Mouse (desktop only) ──
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    if (!mobile) window.addEventListener('mousemove', handleMouseMove);

    // ── Resize ──
    resize();
    window.addEventListener('resize', resize);
    const ro = new ResizeObserver(() => resize());
    ro.observe(container);

    // ── Animation (desktop only) ──
    let animId: number;

    if (!mobile) {
      const animate = (now: number) => {
        const t = now * 0.001;
        ctx.clearRect(0, 0, w, h);

        if (staticCanvas) ctx.drawImage(staticCanvas, 0, 0);

        // Nebula pulse
        nebulae.forEach(n => {
          const pulse = Math.sin(t * n.pulseSpeed * 60 + n.pulsePhase) * 0.015;
          const [r, g, b] = n.color;
          const alpha = n.opacity + pulse;
          if (alpha > 0.005) {
            const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, Math.max(n.rx, n.ry) * 0.5);
            grad.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.5})`);
            grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(n.x, n.y, Math.max(n.rx, n.ry) * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        const mouseX = mouseRef.current.x;
        const mouseY = mouseRef.current.y + window.scrollY;

        // Draw twinkling stars with mouse interaction
        for (const star of stars) {
          star.x += (Math.random() - 0.5) * 0.02;
          star.y += (Math.random() - 0.5) * 0.02;

          // Mouse repel
          const dx = star.x - mouseX;
          const dy = star.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80 && dist > 0) {
            const force = (80 - dist) / 80 * 0.8;
            star.x += (dx / dist) * force;
            star.y += (dy / dist) * force;
          }

          // Wrap
          if (star.x < -5) star.x = w + 5;
          if (star.x > w + 5) star.x = -5;
          if (star.y < -5) star.y = h + 5;
          if (star.y > h + 5) star.y = -5;

          // Twinkle
          const twinkle = (Math.sin(t * star.twinkleSpeed * 60 + star.twinklePhase) + 1) * 0.5;
          const alpha = star.brightness * (0.4 + twinkle * 0.6);
          if (alpha < 0.02) continue;

          const [r, g, b] = star.color;

          // Glow for brighter stars
          if (star.size > 1.2) {
            const glowR = star.size * 4;
            const grad = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowR);
            grad.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.3})`);
            grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.08})`);
            grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(star.x, star.y, glowR, 0, Math.PI * 2);
            ctx.fill();

            if (star.size > 2) {
              ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.2})`;
              ctx.lineWidth = 0.5;
              const spike = star.size * 5;
              ctx.beginPath();
              ctx.moveTo(star.x - spike, star.y);
              ctx.lineTo(star.x + spike, star.y);
              ctx.moveTo(star.x, star.y - spike);
              ctx.lineTo(star.x, star.y + spike);
              ctx.stroke();
            }
          }

          ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        }

        // Constellations
        for (const c of constellations) {
          c.opacity += c.fadeDir * c.fadeSpeed;
          if (c.opacity >= 0.2) c.fadeDir = -1;
          else if (c.opacity <= 0) {
            c.fadeDir = 1;
            c.opacity = 0;
          }
          if (c.opacity <= 0) continue;

          ctx.strokeStyle = `rgba(100, 120, 200, ${c.opacity * 0.5})`;
          ctx.lineWidth = 1;
          for (const [from, to] of c.connections) {
            const a = c.points[from], b = c.points[to];
            if (!a || !b) continue;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }

          for (const p of c.points) {
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 4);
            grad.addColorStop(0, `rgba(160, 180, 255, ${c.opacity})`);
            grad.addColorStop(1, 'rgba(100, 120, 200, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 255, 255, ${c.opacity * 0.8})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        animId = requestAnimationFrame(animate);
      };
      animId = requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (!mobile) window.removeEventListener('mousemove', handleMouseMove);
      ro.disconnect();
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div ref={containerRef} className="vanta-background">
      <canvas ref={canvasRef} className="vanta-background__canvas" />
      <div className="vanta-background__content">
        {children}
      </div>
    </div>
  );
}
