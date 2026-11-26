import { useEffect, useRef } from 'react';

interface BouncyBulletStageProps {
  enabled: boolean;
  muzzleRef: React.RefObject<HTMLSpanElement | null>;
  burstSignal: number;
  onAutoShot: () => void;
}

interface TrailPoint {
  x: number;
  y: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  bounces: number;
  maxBounces: number;
  age: number;
  maxAge: number;
  spin: number;
  trail: TrailPoint[];
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface ColliderRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const MAX_ACTIVE_BULLETS = 22;
const AUTO_FIRE_INTERVAL_MS = 2700;

export function BouncyBulletStage({
  enabled,
  muzzleRef,
  burstSignal,
  onAutoShot,
}: BouncyBulletStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bulletsRef = useRef<Bullet[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const collidersRef = useRef<ColliderRect[]>([]);
  const lastBurstRef = useRef(burstSignal);
  const onAutoShotRef = useRef(onAutoShot);
  onAutoShotRef.current = onAutoShot;

  const spawnBurst = (count: number) => {
    const muzzleEl = muzzleRef.current;
    const rect = muzzleEl?.getBoundingClientRect();
    const startX = rect ? rect.left + rect.width / 2 : 72;
    const startY = rect ? rect.top + rect.height / 2 : 28;

    for (let i = 0; i < count; i += 1) {
      if (bulletsRef.current.length >= MAX_ACTIVE_BULLETS) {
        bulletsRef.current.shift();
      }
      // Spread downward-right across the entire viewport
      const baseAngle = count === 1 ? 0.36 + (Math.random() - 0.5) * 0.42 : 0.18 + i * 0.28 + (Math.random() - 0.5) * 0.14;
      const speed = 520 + Math.random() * 210;

      bulletsRef.current.push({
        x: startX,
        y: startY,
        vx: Math.cos(baseAngle) * speed,
        vy: Math.sin(baseAngle) * speed,
        radius: 5.5,
        bounces: 0,
        maxBounces: 12,
        age: 0,
        maxAge: 9.5,
        spin: Math.atan2(Math.sin(baseAngle), Math.cos(baseAngle)),
        trail: [{ x: startX, y: startY }],
      });
    }

    // Muzzle spark puffs
    for (let s = 0; s < 5; s += 1) {
      const ang = (Math.random() - 0.35) * 1.1;
      const spd = 120 + Math.random() * 190;
      sparksRef.current.push({
        x: startX,
        y: startY,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0,
        maxLife: 0.28 + Math.random() * 0.16,
        size: 1.8 + Math.random() * 1.8,
      });
    }
  };

  // Trigger extra rapid burst when user clicks the Cowboy Cockroach mascot
  useEffect(() => {
    if (burstSignal === lastBurstRef.current) return;
    lastBurstRef.current = burstSignal;
    if (!enabled) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    spawnBurst(3);
  }, [burstSignal, enabled]);

  // Clear active projectiles immediately when paused
  useEffect(() => {
    if (!enabled) {
      bulletsRef.current = [];
      sparksRef.current = [];
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const syncCanvasSize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const refreshColliders = () => {
      const nodes = document.querySelectorAll<HTMLElement>('[data-bullet-collider]');
      const rects: ColliderRect[] = [];
      nodes.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 40 && r.height > 40 && r.bottom > 0 && r.top < window.innerHeight) {
          rects.push({
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
          });
        }
      });
      collidersRef.current = rects;
    };

    syncCanvasSize();
    refreshColliders();

    window.addEventListener('resize', syncCanvasSize);
    const colliderTimer = window.setInterval(refreshColliders, 180);

    // Initial welcoming shot shortly after load
    const initialShotTimer = window.setTimeout(() => {
      if (document.visibilityState === 'visible') {
        onAutoShotRef.current();
        spawnBurst(1);
      }
    }, 650);

    // Periodic automatic cowboy shots across the whole website
    const autoFireTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        onAutoShotRef.current();
        spawnBurst(1);
      }
    }, AUTO_FIRE_INTERVAL_MS);

    let rafId = 0;
    let lastTime = performance.now();

    const addImpactSparks = (x: number, y: number, nx: number, ny: number) => {
      for (let i = 0; i < 4; i += 1) {
        const spread = (Math.random() - 0.5) * 1.7;
        const cos = Math.cos(spread);
        const sin = Math.sin(spread);
        const dx = nx * cos - ny * sin;
        const dy = nx * sin + ny * cos;
        const spd = 90 + Math.random() * 140;
        sparksRef.current.push({
          x,
          y,
          vx: dx * spd,
          vy: dy * spd,
          life: 0,
          maxLife: 0.24 + Math.random() * 0.14,
          size: 1.5 + Math.random() * 1.5,
        });
      }
    };

    const step = (now: number) => {
      const dt = Math.min(0.033, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const viewW = window.innerWidth;
      const viewH = window.innerHeight;
      const headerSafeTop = 52;
      ctx.clearRect(0, 0, viewW, viewH);

      const nextBullets: Bullet[] = [];
      for (const b of bulletsRef.current) {
        b.age += dt;
        if (b.age >= b.maxAge || b.bounces > b.maxBounces) continue;

        const prevX = b.x;
        const prevY = b.y;
        b.vy += 110 * dt; // subtle western gravity arc for lively bounces
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        let bounced = false;
        let hitNx = 0;
        let hitNy = 0;

        // Viewport boundary bounces
        if (b.x - b.radius < 0) {
          b.x = b.radius;
          b.vx = Math.abs(b.vx) * 0.96;
          bounced = true;
          hitNx = 1;
        } else if (b.x + b.radius > viewW) {
          b.x = viewW - b.radius;
          b.vx = -Math.abs(b.vx) * 0.96;
          bounced = true;
          hitNx = -1;
        }

        if (b.y - b.radius < headerSafeTop && prevY >= headerSafeTop) {
          b.y = headerSafeTop + b.radius;
          b.vy = Math.abs(b.vy) * 0.95;
          bounced = true;
          hitNy = 1;
        } else if (b.y - b.radius < 0) {
          b.y = b.radius;
          b.vy = Math.abs(b.vy) * 0.95;
          bounced = true;
          hitNy = 1;
        } else if (b.y + b.radius > viewH) {
          b.y = viewH - b.radius;
          b.vy = -Math.max(260, Math.abs(b.vy) * 0.94);
          bounced = true;
          hitNy = -1;
        }

        // Ricochet off major editor panels so bullets bounce around the UI
        for (const box of collidersRef.current) {
          if (
            b.x + b.radius > box.left &&
            b.x - b.radius < box.right &&
            b.y + b.radius > box.top &&
            b.y - b.radius < box.bottom
          ) {
            const wasOutsideLeft = prevX + b.radius <= box.left + 4;
            const wasOutsideRight = prevX - b.radius >= box.right - 4;
            const wasOutsideTop = prevY + b.radius <= box.top + 4;
            const wasOutsideBottom = prevY - b.radius >= box.bottom - 4;

            if (wasOutsideLeft) {
              b.x = box.left - b.radius;
              b.vx = -Math.abs(b.vx) * 0.97;
              bounced = true;
              hitNx = -1;
            } else if (wasOutsideRight) {
              b.x = box.right + b.radius;
              b.vx = Math.abs(b.vx) * 0.97;
              bounced = true;
              hitNx = 1;
            } else if (wasOutsideTop) {
              b.y = box.top - b.radius;
              b.vy = -Math.max(220, Math.abs(b.vy) * 0.95);
              bounced = true;
              hitNy = -1;
            } else if (wasOutsideBottom) {
              b.y = box.bottom + b.radius;
              b.vy = Math.abs(b.vy) * 0.95;
              bounced = true;
              hitNy = 1;
            }
          }
        }

        if (bounced) {
          b.bounces += 1;
          addImpactSparks(b.x, b.y, hitNx, hitNy);
        }

        b.spin = Math.atan2(b.vy, b.vx);
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 10) b.trail.shift();

        // Fade smoothly near end of life
        const bounceFade =
          b.bounces >= b.maxBounces - 1 ? 0.45 : 1;
        const ageFade =
          b.age > b.maxAge - 1.2 ? Math.max(0, (b.maxAge - b.age) / 1.2) : 1;
        const alpha = Math.min(bounceFade, ageFade);

        // Draw golden bullet tracer tail
        if (b.trail.length >= 2) {
          for (let i = 1; i < b.trail.length; i += 1) {
            const t = i / b.trail.length;
            ctx.beginPath();
            ctx.moveTo(b.trail[i - 1].x, b.trail[i - 1].y);
            ctx.lineTo(b.trail[i].x, b.trail[i].y);
            ctx.strokeStyle = `rgba(217, 119, 6, ${t * 0.45 * alpha})`;
            ctx.lineWidth = t * 4.5;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        }

        // Draw brass cowboy slug oriented along velocity
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.spin);
        ctx.globalAlpha = alpha;

        // Subtle warm glow
        ctx.beginPath();
        ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
        ctx.fill();

        // Bullet shell & rounded nose
        ctx.beginPath();
        ctx.moveTo(-6, -3);
        ctx.lineTo(2, -3);
        ctx.quadraticCurveTo(8, 0, 2, 3);
        ctx.lineTo(-6, 3);
        ctx.closePath();
        ctx.fillStyle = '#D97706';
        ctx.fill();
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = '#78350F';
        ctx.stroke();

        // Bright metallic highlight stripe
        ctx.beginPath();
        ctx.moveTo(-4, -1.2);
        ctx.lineTo(3, -1.2);
        ctx.strokeStyle = '#FEF3C7';
        ctx.lineWidth = 1.4;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.restore();
        nextBullets.push(b);
      }
      bulletsRef.current = nextBullets;

      // Update & render impact sparks
      const nextSparks: Spark[] = [];
      for (const sp of sparksRef.current) {
        sp.life += dt;
        if (sp.life >= sp.maxLife) continue;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        const spAlpha = 1 - sp.life / sp.maxLife;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size * spAlpha, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 158, 11, ${spAlpha})`;
        ctx.fill();
        nextSparks.push(sp);
      }
      sparksRef.current = nextSparks;

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', syncCanvasSize);
      window.clearInterval(colliderTimer);
      window.clearInterval(autoFireTimer);
      window.clearTimeout(initialShotTimer);
    };
  }, [enabled, muzzleRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40"
    />
  );
}
