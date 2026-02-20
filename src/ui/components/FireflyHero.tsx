import { motion, useSpring, useTransform } from 'framer-motion';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import './FireflyHero.css';

/**
 * FireflyHero — visual-only brand centrepiece.
 *
 * Renders the glowing orb, copper trace SVG circuit, orbital ring,
 * and OLED HUD overlay with framer-motion spring physics.
 *
 * No text content — h1 / subtitle / CTA all live in FireflyLanding.
 *
 * Props:
 *   isExiting      — set true from parent to trigger the thread-travel exit sequence.
 *   onExitComplete — called ~600ms after isExiting=true, after the firefly travels the trace.
 */
interface FireflyHeroProps {
  isExiting?: boolean;
  onExitComplete?: () => void;
}

export const FireflyHero: React.FC<FireflyHeroProps> = ({
  isExiting = false,
  onExitComplete,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);

  const [latency, setLatency] = useState(0);
  const [status, setStatus] = useState('SCANNING...');
  const [isBooting, setIsBooting] = useState(true);
  const [isGlitching, setIsGlitching] = useState(false);
  const [isBursting, setIsBursting] = useState(false);
  const isGlitchingRef = useRef(false);
  const isBurstingRef = useRef(false);
  // Tracked so the burst recovery timeout can be cancelled on unmount
  const orbBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Jitter updated in rAF loop (~7.5Hz) so Math.random() never runs at render time
  const jitterRef = useRef({ x: 0, y: 0 });

  // --- PHYSICS SPRINGS ---
  const springConfig = { stiffness: 40, damping: 20, mass: 1 };
  const mouseX = useSpring(0, springConfig);
  const mouseY = useSpring(0, springConfig);
  const scale = useSpring(1, springConfig);

  // --- BREATHING STATE ---
  const [breathVal, setBreathVal] = useState(0);

  useEffect(() => {
    isGlitchingRef.current = isGlitching;
  }, [isGlitching]);

  useEffect(() => {
    isBurstingRef.current = isBursting;
  }, [isBursting]);

  // --- SIGNAL ORCHESTRATION ---
  const triggerPackets = useCallback((isInstant = false) => {
    const packets = document.querySelectorAll('.packet');
    packets.forEach((p, i) => {
      const el = p as SVGPathElement;
      el.style.setProperty('--p-duration', isInstant ? '0.4s' : '1.4s');

      setTimeout(() => {
        el.classList.remove('packet-active');
        void el.getBoundingClientRect();
        el.classList.add('packet-active');

        // Node feedback
        setTimeout(() => {
          const nodeId = p.id.replace('p-', 'n-');
          const rippleId = p.id.replace('p-', 'r-');
          const node = document.getElementById(nodeId);
          const ripple = document.getElementById(rippleId);

          if (node && ripple) {
            node.style.fill = 'var(--firefly-signal)';
            node.style.filter = 'drop-shadow(0 0 12px var(--firefly-signal))';
            ripple.style.animation = 'ripple-out 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards';

            setTimeout(() => {
              node.style.fill = '';
              node.style.filter = '';
              ripple.style.animation = '';
            }, 800);
          }
        }, (isInstant ? 0.3 : 1.3) * 1000);
      }, i * (isInstant ? 100 : 250));
    });
  }, []);

  // --- ANIMATION LOOP (with visibility + reduced-motion guards) ---
  useEffect(() => {
    // @emilkowalski: "best animation is no animation" for reduced-motion users
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setIsBooting(false);
      return;
    }

    let animationFrameId: number;
    let localFrame = 0;
    let isVisible = true;

    const loop = () => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      localFrame++;

      // Breathing (12s @ 60fps = 720 frames)
      const breathPhase = (localFrame % 720) / 720;
      const bMultiplier = (Math.sin(breathPhase * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      setBreathVal(bMultiplier);

      // Write breath value to :root so .brand-firefly in the h1 can read it via CSS calc().
      // Intentional global side-effect: assumes a single FireflyHero instance per page.
      document.documentElement.style.setProperty('--firefly-breath', String(bMultiplier));

      // Update jitter every 8 frames (~7.5Hz) — organic micro-tremble without render-time Math.random()
      if (localFrame % 8 === 0) {
        jitterRef.current = {
          x: (Math.random() - 0.5) * 0.8,
          y: (Math.random() - 0.5) * 0.8,
        };
      }

      // Glitch every 20s
      if (localFrame % 1200 === 0) {
        setIsGlitching(true);
        setTimeout(() => setIsGlitching(false), 120);
      }

      if (!isGlitchingRef.current) {
        let lat = Math.floor(bMultiplier * 120);
        if (Math.random() > 0.9) lat += Math.floor(Math.random() * 5);
        setLatency(lat);
      }

      // Trigger signals at breath peak
      if (localFrame % 720 === 360) {
        triggerPackets();
      }

      // Cycle status text every ~3s to look like an active scan
      const scanStates = ['SCANNING...', 'INDEXING...', 'TRACING...', 'ANALYZING...'];
      if (localFrame % 180 === 0 && !isBurstingRef.current) {
        setStatus(scanStates[Math.floor(localFrame / 180) % scanStates.length]);
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    // IntersectionObserver: pause rAF when off-screen (per motion-performance-guardrails)
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.1 },
    );

    if (stageRef.current) {
      observer.observe(stageRef.current);
    }

    const bootTimer = setTimeout(() => setIsBooting(false), 2200);
    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(bootTimer);
      observer.disconnect();
      // Clean up the global CSS var — leaves :root clean for any future re-mount
      document.documentElement.style.removeProperty('--firefly-breath');
      // Cancel any in-flight orb burst recovery timer
      if (orbBurstTimerRef.current) clearTimeout(orbBurstTimerRef.current);
    };
  }, [triggerPackets]);

  // --- EXIT SEQUENCE: firefly travels the trace thread, then fades ---
  useEffect(() => {
    if (!isExiting) return;

    // 1. Burst mode: status confirms signal sent
    setIsBursting(true);
    setStatus('SIGNAL_SENT');
    mouseX.jump(0);
    mouseY.jump(0);
    scale.jump(1);

    // 2. Fire all packets at high speed down the trace threads
    triggerPackets(true);

    // 3. After the packet travels (400ms travel + 200ms settle), call parent
    const exitTimer = setTimeout(() => {
      onExitComplete?.();
    }, 620);

    return () => clearTimeout(exitTimer);
  }, [isExiting, triggerPackets, onExitComplete, mouseX, mouseY, scale]);

  // --- MOUSE INTERACTION (ambient follow only) ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!stageRef.current) return;

      const rect = stageRef.current.getBoundingClientRect();
      const sCX = rect.left + rect.width / 2;
      const sCY = rect.top + rect.height / 2;
      const dist = Math.sqrt((e.clientX - sCX) ** 2 + (e.clientY - sCY) ** 2);

      if (dist < 600) {
        const power = 1 - dist / 600;
        mouseX.set((e.clientX - sCX) * 0.18 * power);
        mouseY.set((e.clientY - sCY) * 0.18 * power);
        scale.set(1 + power * 0.3);
      } else {
        mouseX.set(0);
        mouseY.set(0);
        scale.set(1);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY, scale]);

  // Unified click handler — orb click triggers a burst (not a full exit; CTA does the exit)
  const handleOrbClick = () => {
    if (isBursting) return;
    setIsBursting(true);
    triggerPackets(true);
    setStatus('SIGNAL_BURST');
    mouseX.jump(0);
    mouseY.jump(0);
    scale.jump(1);
    // Track the timer so it can be cancelled if the component unmounts mid-burst
    orbBurstTimerRef.current = setTimeout(() => {
      setIsBursting(false);
      setStatus('SCANNING...');
    }, 1000);
  };

  // --- DERIVED STYLES ---
  const rotateX = useTransform(mouseY, (v) => v * -0.05);
  const rotateY = useTransform(mouseX, (v) => v * 0.05);

  const breathScale = 0.4 + breathVal * 1.1;
  const breathBlur = 4 * (1 - breathVal);
  const breathOpacity = 0.7 + breathVal * 0.3;

  // Read latest jitter from ref — updated at ~7.5Hz in the rAF loop
  const { x: jitterX, y: jitterY } = jitterRef.current;

  return (
    <div className={`firefly-hero-container ${isBursting ? 'pulse-flash' : ''} ${isBooting ? 'booting' : ''} ${isExiting ? 'exiting' : ''}`}>
      <div className="grid-bg" />

      <div className="firefly-stage" ref={stageRef}>
        <div className="orbital-ring" />

        {/* HUD leaders — reduced opacity so they frame without cluttering */}
        <svg
          aria-hidden="true"
          focusable="false"
          style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          <path d="M 520,380 L 610,290" fill="none" stroke="rgba(245,158,11,0.08)" strokeWidth="0.5" strokeDasharray="2,2" />
          <path d="M 500,440 L 430,540" fill="none" stroke="rgba(245,158,11,0.08)" strokeWidth="0.5" strokeDasharray="2,2" />
        </svg>

        {/* Circuitry */}
        <svg aria-hidden="true" focusable="false" className="circuitry-svg" viewBox="0 0 800 800">
          <defs>
            <filter id="led-glow-ui">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <g transform="translate(400, 400)">
            <circle cx="0" cy="0" r="45" fill="rgba(245,158,11,0.05)" stroke="rgba(245,158,11,0.2)" strokeWidth="1" />

            {/* Conversion Trace — offset 120px right so it doesn't bisect subtitle text */}
            <path className="trace-base" d="M 120,10 L 120,280" />
            <path className="trace-copper" d="M 120,10 L 120,280" strokeWidth="2" />
            <path className="trace-bg-pulse" d="M 120,10 L 120,280" />
            <rect className="node-pad" x="110" y="275" width="20" height="20" rx="2" />
            <circle className="node-led" cx="120" cy="285" r="4" filter="url(#led-glow-ui)" id="n-conversion" />
            <circle className="node-ripple" cx="120" cy="285" r="4" id="r-conversion" />
            <path className="packet" d="M 120,10 L 120,280" id="p-conversion" />

            {/* Right Traces */}
            <path className="trace-base" d="M 15,0 L 140,-50 L 260,-50 L 340,-130" />
            <path className="trace-copper" d="M 15,0 L 140,-50 L 260,-50 L 340,-130" strokeWidth="2.5" />
            <rect className="node-pad" x="330" y="-140" width="20" height="20" rx="4" transform="rotate(45, 340, -130)" />
            <circle className="node-led" cx="340" cy="-130" r="5" id="n-r1" />
            <circle className="node-ripple" cx="340" cy="-130" r="5" id="r-r1" />
            <path className="packet" d="M 15,0 L 140,-50 L 260,-50 L 340,-130" id="p-r1" />

            {/* Left Traces */}
            <g transform="scale(-1, 1)">
              <path className="trace-base" d="M 15,0 L 140,-50 L 260,-50 L 340,-130" />
              <path className="trace-copper" d="M 15,0 L 140,-50 L 260,-50 L 340,-130" strokeWidth="2.5" />
              <rect className="node-pad" x="330" y="-140" width="20" height="20" rx="4" transform="rotate(45, 340, -130)" />
              <circle className="node-led" cx="340" cy="-130" r="5" id="n-l1" />
              <circle className="node-ripple" cx="340" cy="-130" r="5" id="r-l1" />
              <path className="packet" d="M 15,0 L 140,-50 L 260,-50 L 340,-130" id="p-l1" />
            </g>
          </g>
        </svg>

        {/* Spring-physics assembly */}
        <motion.div
          className="core-assembly"
          style={{ x: mouseX, y: mouseY, scale, rotateX, rotateY }}
        >
          <div
            className="breathing-wrapper"
            style={{
              transform: `scale(${breathScale})`,
              filter: `blur(${breathBlur}px)`,
              opacity: breathOpacity,
            }}
          >
            <div className="shard shard-inner" />
            <div className="shard shard-outer" />
            <button
              type="button"
              className="core-orb"
              onClick={handleOrbClick}
              aria-label="Trigger signal burst"
            />
          </div>

          <div
            className="hud-tag oled-hud"
            style={{ transform: 'translate3d(-200px, -180px, 80px)', marginLeft: jitterX, marginTop: jitterY }}
          >
            STATUS: {status}
          </div>
          <div
            className="hud-tag oled-hud"
            style={{ transform: 'translate3d(180px, 200px, 100px)', marginLeft: -jitterX, marginTop: -jitterY }}
          >
            TRACE: {isGlitching ? '---' : latency}ms_LATENCY
          </div>
        </motion.div>
      </div>
    </div>
  );
};
