'use client';

import { useEffect, useRef } from 'react';
import './vanta-background.css';

interface VantaBackgroundProps {
  children: React.ReactNode;
}

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  brightness: number;
  speedX: number;
  speedY: number;
}

interface ZodiacConstellation {
  name: string;
  points: { x: number; y: number }[];
  connections: [number, number][];
  posX: number;
  posY: number;
  opacity: number;
  fadeDirection: number;
  fadeSpeed: number;
  scale: number;
  flashIntensity: number;
}

export function VantaBackground({ children }: VantaBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const starsRef = useRef<Star[]>([]);
  const zodiacConstellationsRef = useRef<ZodiacConstellation[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Szablony konstelacji znaków zodiaku
    const zodiacTemplates = [
      {
        name: 'Aries',
        points: [{ x: 50, y: 0 }, { x: 30, y: 40 }, { x: 70, y: 40 }, { x: 20, y: 70 }, { x: 80, y: 70 }],
        connections: [[0, 1], [0, 2], [1, 3], [2, 4]] as [number, number][],
      },
      {
        name: 'Taurus',
        points: [{ x: 20, y: 0 }, { x: 80, y: 0 }, { x: 40, y: 30 }, { x: 60, y: 30 }, { x: 50, y: 60 }],
        connections: [[0, 2], [1, 3], [2, 4], [3, 4]] as [number, number][],
      },
      {
        name: 'Gemini',
        points: [{ x: 30, y: 0 }, { x: 30, y: 70 }, { x: 70, y: 0 }, { x: 70, y: 70 }, { x: 50, y: 35 }],
        connections: [[0, 1], [2, 3], [0, 4], [2, 4]] as [number, number][],
      },
      {
        name: 'Cancer',
        points: [{ x: 50, y: 0 }, { x: 30, y: 30 }, { x: 70, y: 30 }, { x: 20, y: 60 }, { x: 80, y: 60 }],
        connections: [[0, 1], [0, 2], [1, 3], [2, 4]] as [number, number][],
      },
      {
        name: 'Leo',
        points: [{ x: 50, y: 0 }, { x: 30, y: 30 }, { x: 70, y: 30 }, { x: 50, y: 50 }, { x: 30, y: 70 }, { x: 70, y: 70 }],
        connections: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5]] as [number, number][],
      },
      {
        name: 'Virgo',
        points: [{ x: 20, y: 20 }, { x: 40, y: 0 }, { x: 60, y: 20 }, { x: 80, y: 0 }, { x: 50, y: 40 }, { x: 50, y: 70 }],
        connections: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5]] as [number, number][],
      },
      {
        name: 'Libra',
        points: [{ x: 20, y: 30 }, { x: 80, y: 30 }, { x: 50, y: 0 }, { x: 50, y: 60 }],
        connections: [[0, 1], [2, 1], [1, 3]] as [number, number][],
      },
      {
        name: 'Scorpio',
        points: [{ x: 20, y: 20 }, { x: 40, y: 40 }, { x: 60, y: 40 }, { x: 80, y: 20 }, { x: 70, y: 60 }],
        connections: [[0, 1], [1, 2], [2, 3], [2, 4]] as [number, number][],
      },
      {
        name: 'Sagittarius',
        points: [{ x: 20, y: 60 }, { x: 80, y: 20 }, { x: 70, y: 0 }, { x: 90, y: 30 }],
        connections: [[0, 1], [1, 2], [1, 3]] as [number, number][],
      },
      {
        name: 'Capricorn',
        points: [{ x: 30, y: 0 }, { x: 50, y: 30 }, { x: 70, y: 50 }, { x: 60, y: 70 }, { x: 40, y: 60 }],
        connections: [[0, 1], [1, 2], [2, 3], [1, 4]] as [number, number][],
      },
      {
        name: 'Aquarius',
        points: [{ x: 20, y: 30 }, { x: 40, y: 40 }, { x: 60, y: 30 }, { x: 80, y: 40 }, { x: 50, y: 0 }],
        connections: [[0, 1], [1, 2], [2, 3], [2, 4]] as [number, number][],
      },
      {
        name: 'Pisces',
        points: [{ x: 30, y: 20 }, { x: 30, y: 60 }, { x: 70, y: 20 }, { x: 70, y: 60 }, { x: 50, y: 40 }],
        connections: [[0, 1], [2, 3], [1, 4], [3, 4]] as [number, number][],
      },
    ];

    // Ustawienie rozmiaru canvas
    let previousWidth = container.offsetWidth;
    let previousHeight = container.offsetHeight;
    
    const resizeCanvas = () => {
      const newWidth = container.offsetWidth;
      const newHeight = container.offsetHeight;
      
      if (previousWidth > 0 && previousHeight > 0) {
        zodiacConstellationsRef.current.forEach((constellation) => {
          constellation.posX = (constellation.posX / previousWidth) * newWidth;
          constellation.posY = (constellation.posY / previousHeight) * newHeight;
        });
        
        starsRef.current.forEach((star) => {
          star.x = (star.x / previousWidth) * newWidth;
          star.y = (star.y / previousHeight) * newHeight;
        });
      }
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      previousWidth = newWidth;
      previousHeight = newHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Tworzenie gwiazd
    const createStars = () => {
      const stars: Star[] = [];
      const numStars = 300;

      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random() * 1000,
          size: Math.random() * 2 + 0.5,
          brightness: Math.random(),
          speedX: (Math.random() - 0.5) * 0.1,
          speedY: (Math.random() - 0.5) * 0.1,
        });
      }
      starsRef.current = stars;
    };
    createStars();

    // Tworzenie konstelacji znaków zodiaku
    const createZodiacConstellations = () => {
      const constellations: ZodiacConstellation[] = [];
      const numConstellations = 3;

      for (let i = 0; i < numConstellations; i++) {
        const template = zodiacTemplates[Math.floor(Math.random() * zodiacTemplates.length)];
        constellations.push({
          name: template?.name ?? '',
          points: template?.points ?? [],
          connections: template?.connections ?? [],
          posX: Math.random() * canvas.width,
          posY: Math.random() * canvas.height,
          opacity: Math.random() * 0.2,
          fadeDirection: Math.random() > 0.5 ? 1 : -1,
          fadeSpeed: 0.0003 + Math.random() * 0.0005,
          scale: 0.8 + Math.random() * 0.6,
          flashIntensity: 0,
        });
      }
      zodiacConstellationsRef.current = constellations;
    };
    createZodiacConstellations();

    // Obsługa ruchu myszki
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      mouseRef.current.x = (e.clientX - rect.left) * scaleX;
      mouseRef.current.y = (e.clientY - rect.top) * scaleY;
    };
    container.addEventListener('mousemove', handleMouseMove);

    // Animacja
    let animationId: number;
    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 26, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;

      const positions: { x: number; y: number; size: number; alpha: number }[] = [];

      starsRef.current.forEach((star) => {
        star.x += star.speedX;
        star.y += star.speedY;

        // Odpychanie przez myszkę
        const dx = star.x - mouseX;
        const dy = star.y - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const repelRadius = 100;

        if (distance < repelRadius) {
          const force = (repelRadius - distance) / repelRadius;
          star.x += (dx / distance) * force * 1.5;
          star.y += (dy / distance) * force * 1.5;
        }

        if (star.x < 0) star.x = canvas.width;
        if (star.x > canvas.width) star.x = 0;
        if (star.y < 0) star.y = canvas.height;
        if (star.y > canvas.height) star.y = 0;

        star.brightness += (Math.random() - 0.5) * 0.03;
        star.brightness = Math.max(0.3, Math.min(1, star.brightness));

        const scale = 1000 / (1000 + star.z);
        const x = star.x;
        const y = star.y;
        const size = star.size * scale;
        const alpha = star.brightness;
        positions.push({ x, y, size, alpha });
      });

      // Linie między gwiazdami
      const maxConnectionDistance = 100;
      const maxConnections = 3;

      for (let i = 0; i < positions.length; i++) {
        let connections = 0;
        for (let j = i + 1; j < positions.length; j++) {
          if (connections >= maxConnections) break;

          const dx = (positions[i]?.x ?? 0) - (positions[j]?.x ?? 0);
          const dy = (positions[i]?.y ?? 0) - (positions[j]?.y ?? 0);
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxConnectionDistance) {
            const alpha = (1 - distance / maxConnectionDistance) * 0.35;
            ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(positions[i]?.x ?? 0, positions[i]?.y ?? 0);
            ctx.lineTo(positions[j]?.x ?? 0, positions[j]?.y ?? 0);
            ctx.stroke();
            connections++;
          }
        }
      }

      // Rysuj gwiazdy
      positions.forEach((pos) => {
        const { x, y, size, alpha } = pos;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
        gradient.addColorStop(0, `rgba(139, 92, 246, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(139, 92, 246, ${alpha * 0.3})`);
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Animuj konstelacje zodiaku
      zodiacConstellationsRef.current.forEach((constellation) => {
        constellation.opacity += constellation.fadeDirection * constellation.fadeSpeed;

        if (constellation.opacity >= 0.25) {
          constellation.fadeDirection = -1;
        } else if (constellation.opacity <= 0) {
          constellation.fadeDirection = 1;
          constellation.posX = Math.random() * canvas.width;
          constellation.posY = Math.random() * canvas.height;
          const template = zodiacTemplates[Math.floor(Math.random() * zodiacTemplates.length)];
          constellation.name = template?.name ?? '';
          constellation.points = template?.points ?? [];
          constellation.connections = template?.connections ?? [];
          constellation.scale = 0.8 + Math.random() * 0.6;
          constellation.flashIntensity = 1;
        }

        if (constellation.flashIntensity > 0) {
          constellation.flashIntensity -= 0.008;
          if (constellation.flashIntensity < 0) constellation.flashIntensity = 0;
        }

        if (constellation.opacity > 0) {
          const centerX = constellation.posX + (50 * constellation.scale);
          const centerY = constellation.posY + (35 * constellation.scale);

          // Rozbłysk
          if (constellation.flashIntensity > 0) {
            const flashRadius = 120 * constellation.scale * constellation.flashIntensity;
            const flashGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, flashRadius);
            flashGradient.addColorStop(0, `rgba(167, 139, 250, ${constellation.flashIntensity * 0.4})`);
            flashGradient.addColorStop(0.5, `rgba(139, 92, 246, ${constellation.flashIntensity * 0.2})`);
            flashGradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
            
            ctx.fillStyle = flashGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, flashRadius, 0, Math.PI * 2);
            ctx.fill();
          }

          // Linie konstelacji
          const lineOpacity = constellation.opacity * 0.6 + (constellation.flashIntensity * 0.3);
          ctx.strokeStyle = `rgba(139, 92, 246, ${lineOpacity})`;
          ctx.lineWidth = 1.5;
          constellation.connections.forEach(([from, to]) => {
            const fromPoint = constellation.points[from];
            const toPoint = constellation.points[to];
            const x1 = constellation.posX + (fromPoint?.x ?? 0) * constellation.scale;
            const y1 = constellation.posY + (fromPoint?.y ?? 0) * constellation.scale;
            const x2 = constellation.posX + (toPoint?.x ?? 0) * constellation.scale;
            const y2 = constellation.posY + (toPoint?.y ?? 0) * constellation.scale;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          });

          // Gwiazdki w konstelacji
          constellation.points.forEach((point) => {
            const x = constellation.posX + point.x * constellation.scale;
            const y = constellation.posY + point.y * constellation.scale;
            const glowSize = 4 + (constellation.flashIntensity * 3);
            const starOpacity = constellation.opacity + (constellation.flashIntensity * 0.5);

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
            gradient.addColorStop(0, `rgba(167, 139, 250, ${starOpacity})`);
            gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, glowSize, 0, Math.PI * 2);
            ctx.fill();

            const coreSize = 1.5 + (constellation.flashIntensity * 1);
            ctx.fillStyle = `rgba(255, 255, 255, ${starOpacity * 0.9})`;
            ctx.beginPath();
            ctx.arc(x, y, coreSize, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      });

      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      container.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
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
