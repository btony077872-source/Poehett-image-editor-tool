import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface IntroSplashCurtainProps {
  onComplete: () => void;
}

type IntroPhase = 'swarm' | 'bottle' | 'spraying' | 'clearing';

interface RoachEntity {
  id: number;
  kind: 'crawler' | 'flyer';
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  scale: number;
  legPhase: number;
  wingPhase: number;
  turnTimer: number;
  altitude: number; // > 0 for flying roaches
  altitudeSpeed: number;
  scared: boolean;
  spinSpeed: number;
  opacity: number;
}

interface MistParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
  tint: string;
}

interface GlassDroplet {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  growProgress: number;
  slideSpeed: number;
}

const SWARM_TO_BOTTLE_MS = 1550;
const BOTTLE_AUTO_SPRAY_MS = 1050;
const SPRAY_DURATION_MS = 1050;
const CLEAR_FADE_MS = 450;

function drawCartoonRoach(ctx: CanvasRenderingContext2D, r: RoachEntity) {
  ctx.save();

  // Subtle desert ground shadow underneath flying or crawling roaches
  if (r.kind === 'flyer') {
    ctx.save();
    ctx.translate(r.x + r.altitude * 0.35, r.y + r.altitude * 0.65);
    ctx.rotate(r.angle);
    ctx.scale(r.scale * 0.85, r.scale * 0.85);
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(43, 30, 22, ${0.14 * r.opacity})`;
    ctx.fill();
    ctx.restore();
  }

  ctx.translate(r.x, r.y);
  ctx.rotate(r.angle);
  const airBoost = r.kind === 'flyer' ? 1 + r.altitude * 0.004 : 1;
  ctx.scale(r.scale * airBoost, r.scale * airBoost);
  ctx.globalAlpha = r.opacity;

  // 6 articulated scuttling legs (3 pairs)
  ctx.strokeStyle = '#4A2511';
  ctx.lineWidth = 2.1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const legOffsets = [-6, 0, 6];
  for (let i = 0; i < 3; i += 1) {
    const stride = Math.sin(r.legPhase + i * 2.1) * (r.scared ? 5.5 : 3.6);
    const bx = legOffsets[i];

    // Top-side leg
    ctx.beginPath();
    ctx.moveTo(bx, -6);
    ctx.lineTo(bx + stride * 0.5, -13);
    ctx.lineTo(bx + stride - 3, -17);
    ctx.stroke();

    // Bottom-side leg
    ctx.beginPath();
    ctx.moveTo(bx, 6);
    ctx.lineTo(bx - stride * 0.5, 13);
    ctx.lineTo(bx - stride - 3, 17);
    ctx.stroke();
  }

  // Sweeping antennae at the front (+x direction)
  const antWiggle = Math.sin(r.legPhase * 0.7) * 3.2;
  ctx.strokeStyle = '#3E2111';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(14, -3);
  ctx.quadraticCurveTo(22, -10 + antWiggle, 29, -8 - antWiggle * 0.6);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(14, 3);
  ctx.quadraticCurveTo(22, 10 - antWiggle, 29, 8 + antWiggle * 0.6);
  ctx.stroke();

  // Abdomen / carapace (warm chestnut matching CowboyRoachLogo)
  ctx.beginPath();
  ctx.ellipse(-2, 0, 14, 9.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#85431E';
  ctx.fill();
  ctx.lineWidth = 1.9;
  ctx.strokeStyle = '#3E2111';
  ctx.stroke();

  // Shell wing split & glossy warm highlight
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(7, 0);
  ctx.strokeStyle = '#5A2C12';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(-3, -3.5, 7.5, 2.5, -0.1, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(166, 90, 46, 0.7)';
  ctx.fill();

  // Fluttering translucent wings for flying roaches
  if (r.kind === 'flyer') {
    const flap = Math.sin(r.wingPhase);
    const wingSpread = 0.55 + Math.abs(flap) * 0.45;

    ctx.save();
    ctx.translate(4, -2);
    ctx.rotate(-wingSpread);
    ctx.beginPath();
    ctx.ellipse(-8, -5, 13, 5.2, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(254, 243, 199, 0.72)';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#9A5128';
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(4, 2);
    ctx.rotate(wingSpread);
    ctx.beginPath();
    ctx.ellipse(-8, 5, 13, 5.2, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(254, 243, 199, 0.72)';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#9A5128';
    ctx.stroke();
    ctx.restore();
  }

  // Head shield
  ctx.beginPath();
  ctx.ellipse(11.5, 0, 5.5, 6.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#9A5128';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#3E2111';
  ctx.stroke();

  // Expressive cartoon eyes
  ctx.fillStyle = '#FFFDF8';
  ctx.beginPath();
  ctx.arc(13.5, -2.5, 2.1, 0, Math.PI * 2);
  ctx.arc(13.5, 2.5, 2.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1E130D';
  ctx.beginPath();
  ctx.arc(14.3, -2.5, 1.05, 0, Math.PI * 2);
  ctx.arc(14.3, 2.5, 1.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function IntroSplashCurtain({ onComplete }: IntroSplashCurtainProps) {
  const [phase, setPhase] = useState<IntroPhase>('swarm');
  const [reducedMotion, setReducedMotion] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<IntroPhase>('swarm');
  const roachesRef = useRef<RoachEntity[]>([]);
  const mistRef = useRef<MistParticle[]>([]);
  const dropletsRef = useRef<GlassDroplet[]>([]);
  const sprayTriggeredRef = useRef(false);
  const completedRef = useRef(false);

  phaseRef.current = phase;

  const finishIntro = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  const spawnSprayBurst = useCallback(() => {
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const nozzleX = viewW * 0.5 + 32;
    const nozzleY = viewH * 0.5 - 52;

    // Dense mist cone particles radiating across the whole screen
    const tints = [
      'rgba(255, 253, 248, 0.92)',
      'rgba(254, 243, 199, 0.85)',
      'rgba(253, 230, 138, 0.72)',
      'rgba(245, 158, 11, 0.35)',
    ];

    for (let i = 0; i < 95; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 190 + Math.random() * 680;
      mistRef.current.push({
        x: nozzleX + (Math.random() - 0.5) * 18,
        y: nozzleY + (Math.random() - 0.5) * 18,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 10 + Math.random() * 34,
        alpha: 0.7 + Math.random() * 0.3,
        life: 0,
        maxLife: 0.65 + Math.random() * 0.55,
        tint: tints[i % tints.length],
      });
    }

    // Screen-clinging spray droplets across the viewport
    const dropCount = viewW < 640 ? 22 : 38;
    for (let d = 0; d < dropCount; d += 1) {
      dropletsRef.current.push({
        x: Math.random() * viewW,
        y: Math.random() * viewH,
        radius: 4 + Math.random() * 14,
        alpha: 0.45 + Math.random() * 0.35,
        growProgress: 0,
        slideSpeed: 8 + Math.random() * 22,
      });
    }

    // Scare all cockroaches radially away from the spray center
    for (const r of roachesRef.current) {
      const dx = r.x - viewW * 0.5;
      const dy = r.y - viewH * 0.5;
      const fleeAngle = Math.atan2(dy || (Math.random() - 0.5), dx || (Math.random() - 0.5));
      const fleeSpeed = 620 + Math.random() * 420;
      r.scared = true;
      r.vx = Math.cos(fleeAngle) * fleeSpeed;
      r.vy = Math.sin(fleeAngle) * fleeSpeed;
      r.spinSpeed = (Math.random() - 0.5) * 12;
    }
  }, []);

  const triggerSpray = useCallback(() => {
    if (sprayTriggeredRef.current) return;
    sprayTriggeredRef.current = true;
    setPhase('spraying');
    spawnSprayBurst();
  }, [spawnSprayBurst]);

  // Honor prefers-reduced-motion gracefully
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setReducedMotion(true);
      setPhase('clearing');
      const timer = window.setTimeout(finishIntro, 360);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [finishIntro]);

  // Allow Escape key to skip intro anytime
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        finishIntro();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finishIntro]);

  // Timeline state machine (swarm -> bottle -> spraying -> clearing -> done)
  useEffect(() => {
    if (reducedMotion) return;

    if (phase === 'swarm') {
      const t = window.setTimeout(() => setPhase('bottle'), SWARM_TO_BOTTLE_MS);
      return () => window.clearTimeout(t);
    }

    if (phase === 'bottle') {
      const t = window.setTimeout(() => triggerSpray(), BOTTLE_AUTO_SPRAY_MS);
      return () => window.clearTimeout(t);
    }

    if (phase === 'spraying') {
      const t = window.setTimeout(() => setPhase('clearing'), SPRAY_DURATION_MS);
      return () => window.clearTimeout(t);
    }

    if (phase === 'clearing') {
      const t = window.setTimeout(() => finishIntro(), CLEAR_FADE_MS);
      return () => window.clearTimeout(t);
    }

    return undefined;
  }, [phase, reducedMotion, triggerSpray, finishIntro]);

  // High-DPI 60fps cockroach swarm + spray mist canvas loop
  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const syncSize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncSize();
    window.addEventListener('resize', syncSize);

    // Initialize swarm (mix of crawling & flying cockroaches entering from all edges + scattered on stage)
    const w = window.innerWidth;
    const h = window.innerHeight;
    const count = w < 640 ? 20 : 32;
    const initialRoaches: RoachEntity[] = [];

    for (let i = 0; i < count; i += 1) {
      const kind: 'crawler' | 'flyer' = i % 3 === 0 ? 'flyer' : 'crawler';
      const fromEdge = i % 2 === 0;
      let startX = Math.random() * w;
      let startY = Math.random() * h;
      let angle = Math.random() * Math.PI * 2;

      if (fromEdge) {
        const edge = i % 4;
        if (edge === 0) {
          startX = -30;
          startY = Math.random() * h;
          angle = (Math.random() - 0.5) * 1.1;
        } else if (edge === 1) {
          startX = w + 30;
          startY = Math.random() * h;
          angle = Math.PI + (Math.random() - 0.5) * 1.1;
        } else if (edge === 2) {
          startX = Math.random() * w;
          startY = -30;
          angle = Math.PI * 0.5 + (Math.random() - 0.5) * 1.1;
        } else {
          startX = Math.random() * w;
          startY = h + 30;
          angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.1;
        }
      }

      const baseSpeed = kind === 'flyer' ? 240 + Math.random() * 170 : 140 + Math.random() * 130;

      initialRoaches.push({
        id: i,
        kind,
        x: startX,
        y: startY,
        vx: Math.cos(angle) * baseSpeed,
        vy: Math.sin(angle) * baseSpeed,
        angle,
        scale: (w < 640 ? 0.72 : 0.85) + Math.random() * 0.48,
        legPhase: Math.random() * Math.PI * 2,
        wingPhase: Math.random() * Math.PI * 2,
        turnTimer: 0.25 + Math.random() * 0.9,
        altitude: kind === 'flyer' ? 18 + Math.random() * 24 : 0,
        altitudeSpeed: (Math.random() - 0.5) * 16,
        scared: false,
        spinSpeed: 0,
        opacity: 1,
      });
    }

    roachesRef.current = initialRoaches;

    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.033, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const viewW = window.innerWidth;
      const viewH = window.innerHeight;
      ctx.clearRect(0, 0, viewW, viewH);

      // Update & draw cockroaches
      for (const r of roachesRef.current) {
        if (!r.scared) {
          r.turnTimer -= dt;
          if (r.turnTimer <= 0) {
            r.turnTimer = 0.22 + Math.random() * 0.65;
            const turnDelta = (Math.random() - 0.5) * (r.kind === 'flyer' ? 1.5 : 1.15);
            const currentSpeed = Math.hypot(r.vx, r.vy);
            const nextAngle = Math.atan2(r.vy, r.vx) + turnDelta;
            r.vx = Math.cos(nextAngle) * currentSpeed;
            r.vy = Math.sin(nextAngle) * currentSpeed;
          }

          // Gentle wrap / bounce inward if leaving screen during swarm phase
          const pad = 28;
          if (r.x < -pad && r.vx < 0) r.vx = Math.abs(r.vx);
          if (r.x > viewW + pad && r.vx > 0) r.vx = -Math.abs(r.vx);
          if (r.y < -pad && r.vy < 0) r.vy = Math.abs(r.vy);
          if (r.y > viewH + pad && r.vy > 0) r.vy = -Math.abs(r.vy);

          r.angle = Math.atan2(r.vy, r.vx);
        } else {
          r.angle += r.spinSpeed * dt;
          r.opacity = Math.max(0, r.opacity - dt * 1.15);
        }

        r.x += r.vx * dt;
        r.y += r.vy * dt;
        r.legPhase += dt * (r.scared ? 38 : 22);
        if (r.kind === 'flyer') {
          r.wingPhase += dt * 46;
          r.altitude = Math.max(10, Math.min(44, r.altitude + r.altitudeSpeed * dt));
        }

        if (r.opacity > 0.02) {
          drawCartoonRoach(ctx, r);
        }
      }

      // Update & draw spray mist clouds
      const nextMist: MistParticle[] = [];
      for (const m of mistRef.current) {
        m.life += dt;
        if (m.life >= m.maxLife) continue;
        const progress = m.life / m.maxLife;
        m.vx *= 0.94;
        m.vy *= 0.94;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.radius += dt * 42;

        ctx.save();
        ctx.globalAlpha = (1 - progress) * m.alpha;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fillStyle = m.tint;
        ctx.fill();
        ctx.restore();

        nextMist.push(m);
      }
      mistRef.current = nextMist;

      // Update & draw glossy droplets clinging to the display
      for (const d of dropletsRef.current) {
        d.growProgress = Math.min(1, d.growProgress + dt * 5.5);
        d.y += d.slideSpeed * dt;
        const curRadius = d.radius * d.growProgress;

        ctx.save();
        ctx.globalAlpha = d.alpha * (phaseRef.current === 'clearing' ? 0.45 : 1);
        ctx.beginPath();
        ctx.arc(d.x, d.y, curRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 253, 248, 0.55)';
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(194, 94, 0, 0.28)';
        ctx.stroke();

        // Specular highlight dot inside each mist droplet
        if (curRadius > 4) {
          ctx.beginPath();
          ctx.arc(d.x - curRadius * 0.3, d.y - curRadius * 0.3, curRadius * 0.22, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.fill();
        }
        ctx.restore();
      }

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', syncSize);
    };
  }, [reducedMotion]);

  const isBottleVisible = phase === 'bottle' || phase === 'spraying' || phase === 'clearing';
  const isSpraying = phase === 'spraying';
  const isClearing = phase === 'clearing';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Loading workspace animation"
      data-intro-phase={phase}
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden transition-opacity duration-500 ${
        isClearing ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* Progressive frosted mist blur layer over the home workspace */}
      <div
        aria-hidden="true"
        className="absolute inset-0 transition-all duration-700 ease-out"
        style={{
          backgroundColor: isSpraying
            ? 'rgba(250, 246, 238, 0.72)'
            : isClearing
            ? 'rgba(250, 246, 238, 0.2)'
            : 'rgba(250, 246, 238, 0.88)',
          backdropFilter: isSpraying
            ? 'blur(16px)'
            : isClearing
            ? 'blur(4px)'
            : 'blur(2px)',
          WebkitBackdropFilter: isSpraying
            ? 'blur(16px)'
            : isClearing
            ? 'blur(4px)'
            : 'blur(2px)',
        }}
      />

      {/* High-DPI animated cockroach swarm & mist droplets canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      />

      {/* Top corner brand lockup & always-available Skip button */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <span className="font-display text-sm font-bold tracking-tight text-[#2B1E16] sm:text-base">
          ပိုးဟက် အယ်ဒီတာ
        </span>

        <button
          type="button"
          onClick={finishIntro}
          className="pointer-events-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#D4C2A8] bg-[#FFFDF8]/95 px-3.5 py-2 text-xs font-semibold text-[#2B1E16] shadow-sm transition-colors hover:bg-[#F3EBDD] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706]"
        >
          <span>Skip</span>
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Interactive Center Cartoon Bug Spray Bottle (Stage 2 & Stage 3) */}
      {isBottleVisible && (
        <div
          className={`relative z-10 flex flex-col items-center gap-3 transition-all duration-300 ${
            isClearing ? 'scale-90 opacity-0' : 'opacity-100'
          }`}
        >
          <button
            type="button"
            onClick={triggerSpray}
            aria-label="Spray bug mist to clear cockroaches and enter home page"
            className={`group relative flex flex-col items-center rounded-2xl p-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D97706] ${
              isSpraying
                ? 'spray-bottle-pump'
                : 'spray-bottle-pop hover:scale-105 active:scale-95'
            }`}
          >
            {/* Cartoon Western Aerosol Bug Spray Bottle SVG */}
            <svg
              viewBox="0 0 180 220"
              fill="none"
              aria-hidden="true"
              className="h-44 w-36 drop-shadow-[0_14px_24px_rgba(43,30,22,0.22)] sm:h-52 sm:w-44"
            >
              {/* Animated spray plume lines from nozzle when spraying */}
              {isSpraying && (
                <g>
                  <path
                    d="M114 48 L164 26 M116 54 L172 52 M114 60 L162 82"
                    stroke="#C25E00"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray="6 6"
                  />
                  <circle cx="145" cy="39" r="9" fill="#FFFDF8" fillOpacity="0.88" />
                  <circle cx="156" cy="54" r="13" fill="#FEF3C7" fillOpacity="0.8" />
                  <circle cx="144" cy="70" r="8" fill="#FFFDF8" fillOpacity="0.82" />
                </g>
              )}

              {/* Ground shadow */}
              <ellipse cx="86" cy="204" rx="44" ry="8" fill="#2B1E16" fillOpacity="0.16" />

              {/* Trigger neck & pump cap */}
              <path
                d="M66 64 H104 L110 78 H60 Z"
                fill="#2B1E16"
                stroke="#1E130D"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />

              {/* Red aerosol nozzle dome & spray trigger */}
              <path
                d="M70 42 C70 30 100 30 100 42 V64 H70 Z"
                fill="#DC2626"
                stroke="#3E2111"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              {/* Pressable trigger finger groove */}
              <path
                d="M62 46 Q50 52 54 64 L70 62 V46 Z"
                fill="#B91C1C"
                stroke="#3E2111"
                strokeWidth="2.8"
                strokeLinejoin="round"
              />
              {/* Brass spray nozzle tip */}
              <rect
                x="98"
                y="45"
                width="14"
                height="11"
                rx="3"
                fill="#F59E0B"
                stroke="#3E2111"
                strokeWidth="2.5"
              />
              <circle cx="107" cy="50.5" r="2.2" fill="#2B1E16" />

              {/* Main Canister Body (Warm Western Crimson & Cream) */}
              <rect
                x="48"
                y="76"
                width="76"
                height="122"
                rx="16"
                fill="#DC2626"
                stroke="#3E2111"
                strokeWidth="3.5"
              />
              {/* Glossy highlight stripe along left edge */}
              <rect
                x="56"
                y="86"
                width="9"
                height="102"
                rx="4.5"
                fill="#FCA5A5"
                fillOpacity="0.45"
              />

              {/* Cream Desert Label Band */}
              <rect
                x="50"
                y="102"
                width="72"
                height="68"
                fill="#FAF6EE"
                stroke="#3E2111"
                strokeWidth="2.5"
              />
              <rect x="50" y="102" width="72" height="9" fill="#F59E0B" />
              <rect x="50" y="161" width="72" height="9" fill="#C25E00" />

              {/* Crossed-out little roach emblem inside bottle label */}
              <ellipse
                cx="86"
                cy="137"
                rx="11"
                ry="14"
                fill="#85431E"
                stroke="#3E2111"
                strokeWidth="2.2"
              />
              <path
                d="M80 124 L74 117 M92 124 L98 117"
                stroke="#3E2111"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle
                cx="86"
                cy="137"
                r="19"
                stroke="#DC2626"
                strokeWidth="3.2"
              />
              <path
                d="M72 151 L100 123"
                stroke="#DC2626"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
            </svg>

            <span className="mt-1 rounded-lg bg-[#FFFDF8]/95 px-3 py-1 text-xs font-semibold text-[#2B1E16] shadow-sm border border-[#E4D7C3]">
              {isSpraying ? 'Clearing roaches…' : 'Click bottle to spray'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
