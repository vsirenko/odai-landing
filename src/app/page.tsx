"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export default function Home() {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black overflow-hidden">
      <ParticleCanvas />

      {/* ambient side glows */}
      <div className="pointer-events-none absolute inset-0 z-1 overflow-hidden">
        {/* left — green/lime */}
        <div className="absolute -left-[15%] top-[10%] h-[80%] w-[45%] rounded-full bg-[#7ab83c]/20 blur-[120px] dark:bg-[#7ab83c]/15" />
        {/* right — blue/indigo */}
        <div className="absolute -right-[10%] top-[5%] h-[70%] w-[40%] rounded-full bg-[#3944f7]/25 blur-[120px] dark:bg-[#3944f7]/20" />
        {/* subtle bottom-left accent */}
        <div className="absolute -bottom-[10%] left-[20%] h-[40%] w-[35%] rounded-full bg-[#a3d96c]/10 blur-[100px] dark:bg-[#a3d96c]/8" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        <div
          className="group relative"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* logo hover glow */}
          <div
            className={`pointer-events-none absolute -inset-10 rounded-full transition-all duration-500
            `}
          />
          <ODAILogo size={120} />
        </div>
        <div className="text-center font-(family-name:--font-lexend-deca)">
          <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
            Coming Soon
          </h1>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            We&apos;re building something exciting. 
            Stay tuned.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────
   Interactive particle network background
   ─────────────────────────────────────────── */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
  radius: number;
  opacity: number;
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const mouse = useRef({ x: -9999, y: -9999 });
  const animationId = useRef<number>(0);
  const isDark = useRef(true);

  const CONNECTION_DIST = 120;
  const MOUSE_RADIUS = 200;

  const createParticles = useCallback((w: number, h: number) => {
    // scale count to screen area — uniform density everywhere
    const count = Math.floor((w * h) / 4000);
    const arr: Particle[] = [];

    // grid-jittered placement so no empty zones
    const cols = Math.ceil(Math.sqrt(count * (w / h)));
    const rows = Math.ceil(count / cols);
    const cellW = w / cols;
    const cellH = h / rows;

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const px = col * cellW + Math.random() * cellW;
      const py = row * cellH + Math.random() * cellH;
      arr.push({
        x: px,
        y: py,
        homeX: px,
        homeY: py,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // detect dark mode
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    isDark.current = mql.matches;
    const onThemeChange = (e: MediaQueryListEvent) => {
      isDark.current = e.matches;
    };
    mql.addEventListener("change", onThemeChange);

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
      particles.current = createParticles(
        window.innerWidth,
        window.innerHeight
      );
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };
    const onMouseLeave = () => {
      mouse.current.x = -9999;
      mouse.current.y = -9999;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    const animate = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const pts = particles.current;
      const mx = mouse.current.x;
      const my = mouse.current.y;
      const dark = isDark.current;

      /* ── spatial grid for O(n) neighbor lookup ── */
      const cellSize = CONNECTION_DIST;
      const gridCols = Math.ceil(w / cellSize) + 1;
      const gridRows = Math.ceil(h / cellSize) + 1;
      const grid: number[][] = new Array(gridCols * gridRows);
      for (let i = 0; i < grid.length; i++) grid[i] = [];

      // update positions & populate grid
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];

        // mouse repulsion
        const dmx = p.x - mx;
        const dmy = p.y - my;
        const mDist = Math.sqrt(dmx * dmx + dmy * dmy);
        if (mDist < MOUSE_RADIUS && mDist > 0) {
          const force = (MOUSE_RADIUS - mDist) / MOUSE_RADIUS;
          p.vx += (dmx / mDist) * force * 0.5;
          p.vy += (dmy / mDist) * force * 0.5;
        }

        // gentle homing — keeps particles spread evenly
        p.vx += (p.homeX - p.x) * 0.0008;
        p.vy += (p.homeY - p.y) * 0.0008;

        // random drift
        p.vx += (Math.random() - 0.5) * 0.06;
        p.vy += (Math.random() - 0.5) * 0.06;

        // damping
        p.vx *= 0.99;
        p.vy *= 0.99;

        // clamp max speed
        const maxSpeed = 1.5;
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd > maxSpeed) {
          p.vx = (p.vx / spd) * maxSpeed;
          p.vy = (p.vy / spd) * maxSpeed;
        }

        p.x += p.vx;
        p.y += p.vy;

        // wrap edges
        if (p.x < 0) p.x += w;
        if (p.x > w) p.x -= w;
        if (p.y < 0) p.y += h;
        if (p.y > h) p.y -= h;

        // add to grid cell
        const gc = Math.floor(p.x / cellSize);
        const gr = Math.floor(p.y / cellSize);
        if (gc >= 0 && gc < gridCols && gr >= 0 && gr < gridRows) {
          grid[gr * gridCols + gc].push(i);
        }
      }

      /* ── draw connections using spatial grid ── */
      ctx.lineWidth = 0.5;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const gc = Math.floor(a.x / cellSize);
        const gr = Math.floor(a.y / cellSize);

        // check 3x3 neighborhood
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nc = gc + dc;
            const nr = gr + dr;
            if (nc < 0 || nc >= gridCols || nr < 0 || nr >= gridRows)
              continue;
            const cell = grid[nr * gridCols + nc];
            for (const j of cell) {
              if (j <= i) continue;
              const b = pts[j];
              const dx = a.x - b.x;
              const dy = a.y - b.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < CONNECTION_DIST) {
                const alpha = (1 - dist / CONNECTION_DIST) * 0.2;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = dark
                  ? `rgba(255,255,255,${alpha})`
                  : `rgba(0,0,0,${alpha * 0.5})`;
                ctx.stroke();
              }
            }
          }
        }
      }

      /* ── draw mouse connections ── */
      ctx.lineWidth = 0.8;
      for (const p of pts) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS) {
          const alpha = (1 - dist / MOUSE_RADIUS) * 0.4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mx, my);
          ctx.strokeStyle = dark
            ? `rgba(100,180,255,${alpha})`
            : `rgba(50,100,200,${alpha * 0.7})`;
          ctx.stroke();
        }
      }

      animationId.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      mql.removeEventListener("change", onThemeChange);
    };
  }, [createParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-auto absolute inset-0 z-0"
    />
  );
}
export const ODAILogo = ({ size = 32, className = "" }) => {
  return (
    <svg
      className={className}
      height={size}
      viewBox="0 0 420 154.99"
      xmlns="http://www.w3.org/2000/svg"
    >
      {}
      <g className="hidden dark:block">
        <path
          className="fill-white"
          d="M194.87,111.7c-5.47,0-10.5-.87-15.1-2.6-4.59-1.73-8.6-4.14-12.03-7.23-3.43-3.08-6.06-6.71-7.88-10.87-1.83-4.16-2.74-8.65-2.74-13.51s.92-9.35,2.78-13.51c1.86-4.16,4.48-7.77,7.88-10.87,3.39-3.08,7.39-5.5,11.98-7.23,4.59-1.73,9.62-2.6,15.1-2.6s10.69.85,15.28,2.55c4.59,1.7,8.59,4.11,11.98,7.23,3.39,3.11,6,6.75,7.83,10.91,1.83,4.16,2.74,8.65,2.74,13.51s-.91,9.35-2.74,13.51c-1.83,4.16-4.44,7.8-7.83,10.91-3.39,3.11-7.39,5.53-11.98,7.23-4.59,1.7-9.69,2.55-15.28,2.55h0ZM194.96,98.28c3.39,0,6.53-.52,9.39-1.56,2.86-1.04,5.33-2.5,7.41-4.39,2.07-1.89,3.69-4.09,4.86-6.61,1.16-2.52,1.75-5.26,1.75-8.21s-.58-5.7-1.75-8.21c-1.16-2.52-2.78-4.7-4.86-6.56-2.07-1.86-4.56-3.32-7.45-4.39-2.89-1.07-6-1.61-9.34-1.61s-6.53.54-9.39,1.61c-2.86,1.07-5.36,2.52-7.5,4.35-2.14,1.83-3.76,4.02-4.86,6.56-1.1,2.55-1.65,5.31-1.65,8.27s.55,5.71,1.65,8.27c1.1,2.55,2.72,4.76,4.86,6.61,2.14,1.86,4.64,3.31,7.5,4.35,2.86,1.04,5.99,1.56,9.39,1.56h0Z"
          fillRule="evenodd"
        />
        <path
          className="fill-white"
          d="M304.55,64.74c-1.6-3.99-3.95-7.52-7.03-10.56-3.08-3.05-6.81-5.41-11.18-7.08-4.37-1.66-9.35-2.5-14.95-2.5h-31.32v66.01h31.32c5.6,0,10.6-.83,15-2.5,4.4-1.66,8.13-3.99,11.18-6.98,3.05-2.98,5.38-6.49,6.98-10.51,1.6-4.03,2.41-8.36,2.41-13.02s-.81-8.88-2.41-12.88h0ZM291.06,85.54c-.85,2.45-2.17,4.61-3.96,6.46-1.79,1.86-4.04,3.3-6.74,4.34-2.71,1.04-5.85,1.56-9.43,1.56h-16.7v-40.55h16.7c3.59,0,6.71.54,9.39,1.6,2.67,1.07,4.92,2.54,6.74,4.38,1.83,1.86,3.16,4,4.01,6.41.85,2.42,1.28,5.05,1.28,7.87s-.43,5.47-1.28,7.92h0Z"
          fillRule="evenodd"
        />
        <path
          className="fill-white"
          d="M360.21,110.61h14.71l-29.52-66.01h-13.49l-29.52,66.01h14.14l5.94-13.29h31.82l5.92,13.29h0ZM327.57,85.9s10.42-24.33,10.84-25.54c.41,1.2,10.8,25.54,10.8,25.54h-21.65Z"
          fillRule="evenodd"
        />
        <polygon
          className="fill-white"
          fillRule="evenodd"
          points="378.83 44.6 392.95 44.6 392.95 110.61 378.83 110.61 378.83 44.6 378.83 44.6"
        />
        <g className="animate-spin-logo">
          <path
            className="fill-white"
            d="M79.06,25.49c-28.72,0-52.01,23.28-52.01,52.01s23.28,52.01,52.01,52.01,52.01-23.28,52.01-52.01-23.29-52.01-52.01-52.01h0ZM123.92,75.47l-15.66,1.43-.38-4.23,15.65-1.43.39,4.22h0ZM122.74,67.08l-15.12,4.3-1.06-3.73,15.12-4.3,1.06,3.73h0ZM118.44,55.91l1.57,3.15-14.07,7.02-1.57-3.15,14.07-7.02h0ZM115.81,51.71l-12.54,9.49-1.91-2.52,12.54-9.49,1.91,2.52h0ZM110.32,45.28l-10.6,11.62-2.07-1.89,10.6-11.62,2.07,1.89h0ZM103.72,40l-8.29,13.35-2.08-1.28,8.29-13.35,2.08,1.28h0ZM94.31,35.28l1.94.75-5.69,14.66-1.94-.75,5.69-14.66h0ZM86.45,33.24l1.69.31-2.87,15.46-1.69-.31,2.87-15.46h0ZM78.38,32.63h1.36v15.73h-1.36v-15.73h0ZM118.03,99.88l-13.56-6.77,12.11,9.15-3.43,4.53-10.56-7.99,8.94,9.79-4.46,4.07-7.6-8.33,5.96,9.6-5.44,3.37-4.92-7.93,3.38,8.71-6.31,2.45-2.68-6.92,1.36,7.31-7,1.3-1-5.37v5.48h-7.48v-15.72h6.46l5.3-.99,5.02-1.95,4.59-2.84,3.99-3.64,3.28-4.34h0l2.37-4.76,14.07,7.02-2.37,4.76h-.02ZM121.54,92.16l-15.12-4.3,1.36-4.77,15.12,4.3-1.35,4.77h0ZM107.87,82.48l.42-4.58,15.65,1.43-.42,4.58-15.65-1.43h0Z"
            fillRule="evenodd"
          />
        </g>
      </g>
      {}
      <g className="block dark:hidden">
        <path
          className="fill-[#111]"
          d="M194.87,111.7c-5.47,0-10.5-.87-15.1-2.6-4.59-1.73-8.6-4.14-12.03-7.23-3.43-3.08-6.06-6.71-7.88-10.87-1.83-4.16-2.74-8.65-2.74-13.51s.92-9.35,2.78-13.51c1.86-4.16,4.48-7.77,7.88-10.87,3.39-3.08,7.39-5.5,11.98-7.23,4.59-1.73,9.62-2.6,15.1-2.6s10.69.85,15.28,2.55c4.59,1.7,8.59,4.11,11.98,7.23,3.39,3.11,6,6.75,7.83,10.91,1.83,4.16,2.74,8.65,2.74,13.51s-.91,9.35-2.74,13.51c-1.83,4.16-4.44,7.8-7.83,10.91-3.39,3.11-7.39,5.53-11.98,7.23-4.59,1.7-9.69,2.55-15.28,2.55h0ZM194.96,98.28c3.39,0,6.53-.52,9.39-1.56,2.86-1.04,5.33-2.5,7.41-4.39,2.07-1.89,3.69-4.09,4.86-6.61,1.16-2.52,1.75-5.26,1.75-8.21s-.58-5.7-1.75-8.21c-1.16-2.52-2.78-4.7-4.86-6.56-2.07-1.86-4.56-3.32-7.45-4.39-2.89-1.07-6-1.61-9.34-1.61s-6.53.54-9.39,1.61c-2.86,1.07-5.36,2.52-7.5,4.35-2.14,1.83-3.76,4.02-4.86,6.56-1.1,2.55-1.65,5.31-1.65,8.27s.55,5.71,1.65,8.27c1.1,2.55,2.72,4.76,4.86,6.61,2.14,1.86,4.64,3.31,7.5,4.35,2.86,1.04,5.99,1.56,9.39,1.56h0Z"
          fillRule="evenodd"
        />
        <path
          className="fill-[#111]"
          d="M304.55,64.74c-1.6-3.99-3.95-7.52-7.03-10.56-3.08-3.05-6.81-5.41-11.18-7.08-4.37-1.66-9.35-2.5-14.95-2.5h-31.32v66.01h31.32c5.6,0,10.6-.83,15-2.5,4.4-1.66,8.13-3.99,11.18-6.98,3.05-2.98,5.38-6.49,6.98-10.51,1.6-4.03,2.41-8.36,2.41-13.02s-.81-8.88-2.41-12.88h0ZM291.06,85.54c-.85,2.45-2.17,4.61-3.96,6.46-1.79,1.86-4.04,3.3-6.74,4.34-2.71,1.04-5.85,1.56-9.43,1.56h-16.7v-40.55h16.7c3.59,0,6.71.54,9.39,1.6,2.67,1.07,4.92,2.54,6.74,4.38,1.83,1.86,3.16,4,4.01,6.41.85,2.42,1.28,5.05,1.28,7.87s-.43,5.47-1.28,7.92h0Z"
          fillRule="evenodd"
        />
        <path
          className="fill-[#111]"
          d="M360.21,110.61h14.71l-29.52-66.01h-13.49l-29.52,66.01h14.14l5.94-13.29h31.82l5.92,13.29h0ZM327.57,85.9s10.42-24.33,10.84-25.54c.41,1.2,10.8,25.54,10.8,25.54h-21.65Z"
          fillRule="evenodd"
        />
        <polygon
          className="fill-[#111]"
          fillRule="evenodd"
          points="378.83 44.6 392.95 44.6 392.95 110.61 378.83 110.61 378.83 44.6 378.83 44.6"
        />
        <g className="animate-spin-logo">
          <path
            className="fill-[#111]"
            d="M79.06,25.49c-28.72,0-52.01,23.28-52.01,52.01s23.28,52.01,52.01,52.01,52.01-23.28,52.01-52.01-23.29-52.01-52.01-52.01h0ZM123.92,75.47l-15.66,1.43-.38-4.23,15.65-1.43.39,4.22h0ZM122.74,67.08l-15.12,4.3-1.06-3.73,15.12-4.3,1.06,3.73h0ZM118.44,55.91l1.57,3.15-14.07,7.02-1.57-3.15,14.07-7.02h0ZM115.81,51.71l-12.54,9.49-1.91-2.52,12.54-9.49,1.91,2.52h0ZM110.32,45.28l-10.6,11.62-2.07-1.89,10.6-11.62,2.07,1.89h0ZM103.72,40l-8.29,13.35-2.08-1.28,8.29-13.35,2.08,1.28h0ZM94.31,35.28l1.94.75-5.69,14.66-1.94-.75,5.69-14.66h0ZM86.45,33.24l1.69.31-2.87,15.46-1.69-.31,2.87-15.46h0ZM78.38,32.63h1.36v15.73h-1.36v-15.73h0ZM118.03,99.88l-13.56-6.77,12.11,9.15-3.43,4.53-10.56-7.99,8.94,9.79-4.46,4.07-7.6-8.33,5.96,9.6-5.44,3.37-4.92-7.93,3.38,8.71-6.31,2.45-2.68-6.92,1.36,7.31-7,1.3-1-5.37v5.48h-7.48v-15.72h6.46l5.3-.99,5.02-1.95,4.59-2.84,3.99-3.64,3.28-4.34h0l2.37-4.76,14.07,7.02-2.37,4.76h-.02ZM121.54,92.16l-15.12-4.3,1.36-4.77,15.12,4.3-1.35,4.77h0ZM107.87,82.48l.42-4.58,15.65,1.43-.42,4.58-15.65-1.43h0Z"
            fillRule="evenodd"
          />
        </g>
      </g>
    </svg>
  );
};