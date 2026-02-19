import React, { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform, animate } from 'framer-motion';
import './FireflyHero.css';

interface FireflyHeroProps {
  onCtaClick?: () => void;
}

/**
 * FireflyHero Component
 * 
 * A high-fidelity, "bespoke hardware" brand hero element.
 * Features:
 * - 12s synchronized breathing cycle
 * - Spring-physics driven mouse follow and CTA attraction
 * - Reactive typography (rim lighting)
 * - 3D copper traces and mechanical shards
 * - Stochastic jitter and OLED HUD textures
 * 
 * Note: Requires 'Caveat' and 'Space Grotesk' fonts to be loaded globally.
 */
export const FireflyHero: React.FC<FireflyHeroProps> = ({ onCtaClick }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const assemblyRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  
  const [frame, setFrame] = useState(0);
  const [latency, setLatency] = useState(0);
  const [status, setStatus] = useState('SCANNING...');
  const [isBooting, setIsBooting] = useState(true);
  const [isGlitching, setIsGlitching] = useState(false);
  const [isBursting, setIsBursting] = useState(false);

  // --- PHYSICS SPRINGS ---
  const springConfig = { stiffness: 40, damping: 20, mass: 1 };
  const mouseX = useSpring(0, springConfig);
  const mouseY = useSpring(0, springConfig);
  const scale = useSpring(1, springConfig);

  // --- BREATHING STATE ---
  const [breathVal, setBreathVal] = useState(0); // 0 to 1

  // --- ANIMATION LOOP ---
  useEffect(() => {
    let animationFrameId: number;
    let localFrame = 0;

    const loop = () => {
      localFrame++;
      setFrame(localFrame);

      // 1. Breathing Logic (12s @ 60fps = 720 frames)
      const breathPhase = (localFrame % 720) / 720;
      const bMultiplier = (Math.sin(breathPhase * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      setBreathVal(bMultiplier);

      // 2. Latency Logic
      if (localFrame % 1200 === 0) { // Every 20s
        setIsGlitching(true);
        setTimeout(() => setIsGlitching(false), 120);
      }
      
      if (!isGlitching) {
        let lat = Math.floor(bMultiplier * 120);
        if (Math.random() > 0.9) lat += Math.floor(Math.random() * 5);
        setLatency(lat);
      }

      // 3. Trigger Signals at Peak (6s mark)
      if (localFrame % 720 === 360) {
        triggerPackets();
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    const bootTimer = setTimeout(() => setIsBooting(false), 2200);
    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(bootTimer);
    };
  }, [isGlitching]);

  // --- MOUSE INTERACTION ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!stageRef.current || !ctaRef.current) return;

      const stageRect = stageRef.current.getBoundingClientRect();
      const sCX = stageRect.left + stageRect.width / 2;
      const sCY = stageRect.top + stageRect.height / 2;

      const ctaRect = ctaRef.current.getBoundingClientRect();
      const cCX = ctaRect.left + ctaRect.width / 2;
      const cCY = ctaRect.top + ctaRect.height / 2;

      const distToStage = Math.sqrt(Math.pow(e.clientX - sCX, 2) + Math.pow(e.clientY - sCY, 2));
      const distToCTA = Math.sqrt(Math.pow(e.clientX - cCX, 2) + Math.pow(e.clientY - cCY, 2));

      let tX = 0;
      let tY = 0;
      let tS = 1;

      if (distToCTA < 450) {
        // CTA Gravity Well
        const ctaPower = Math.pow(1 - (distToCTA / 450), 1.5);
        const ctaTargetY = (cCY - sCY) * 0.6;
        
        tX = (e.clientX - sCX) * 0.1 * (1 - ctaPower);
        tY = ((e.clientY - sCY) * 0.1 * (1 - ctaPower)) + (ctaTargetY * ctaPower);
        tS = 1 + (ctaPower * 0.5);

        // Dynamic Button Glow
        if (ctaRef.current) {
          ctaRef.current.style.boxShadow = `0 ${4 + (ctaPower * 20)}px ${ctaPower * 60}px rgba(245, 158, 11, ${0.2 + (ctaPower * 0.5)})`;
        }

        if (Math.random() > 0.98) triggerPackets(1.4);
      } else if (distToStage < 600) {
        // Ambient Follow
        const power = 1 - (distToStage / 600);
        tX = (e.clientX - sCX) * 0.18 * power;
        tY = (e.clientY - sCY) * 0.18 * power;
        tS = 1 + (power * 0.5);
        if (ctaRef.current) ctaRef.current.style.boxShadow = '';
      } else {
        if (ctaRef.current) ctaRef.current.style.boxShadow = '';
      }

      mouseX.set(tX);
      mouseY.set(tY);
      scale.set(tS);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY, scale]);

  // --- SIGNAL ORCHESTRATION ---
  const triggerPackets = (isInstant = false) => {
    const packets = document.querySelectorAll('.packet');
    packets.forEach((p, i) => {
      const el = p as SVGPathElement;
      el.style.setProperty('--p-duration', isInstant ? '0.4s' : '1.4s');
      
      setTimeout(() => {
        el.classList.remove('packet-active');
        void el.offsetWidth;
        el.classList.add('packet-active');
        
        // Node Feedback
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
  };

  const handleOrbClick = () => {
    setIsBursting(true);
    triggerPackets(true);
    setStatus('SIGNAL_BURST');
    
    // Snappy reset
    mouseX.set(0, false);
    mouseY.set(0, false);
    scale.set(1, false);

    setTimeout(() => {
      setIsBursting(false);
      setStatus('SCANNING...');
    }, 1000);
  };

  // --- DERIVED STYLES ---
  const rotateX = useTransform(mouseY, (v) => v * -0.05);
  const rotateY = useTransform(mouseX, (v) => v * 0.05);

  const breathScale = 0.4 + (breathVal * 1.1);
  const breathBlur = 4 * (1 - breathVal);
  const breathOpacity = 0.7 + (breathVal * 0.3);

  // Jitter for HUD tags
  const jitterX = (Math.random() - 0.5) * 0.8;
  const jitterY = (Math.random() - 0.5) * 0.8;

  return (
    <div className={`firefly-hero-container ${isBursting ? 'pulse-flash' : ''} ${isBooting ? 'booting' : ''}`}>
      <div className="grid-bg" />

      <div className="hero-content">
        <div className={`brand-title ${isBooting ? 'boot-flicker' : ''}`}>
          <span className="brand-firefly">Firefly</span>
          <span 
            className="brand-narrative" 
            ref={titleRef}
            style={{
              // @ts-ignore - custom properties
              '--title-glow': `0 0 ${breathVal * 20}px rgba(245, 158, 11, ${breathVal * 0.5})`,
              '--title-tint': `${40 + (breathVal * 30)}%`
            } as React.CSSProperties}
          >
            Narrative
          </span>
        </div>
        
        <p className="subtitle">
          Capture the ghost in the machine. A living trace of your development intent, woven into every commit.
        </p>

        <div className="cta-container">
          <button 
            ref={ctaRef}
            className="cta-button"
            onClick={onCtaClick}
          >
            Get Started
          </button>
        </div>
      </div>

      <div className="firefly-stage" ref={stageRef}>
        <div className="orbital-ring" />

        {/* HUD Leaders */}
        <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
          <path d="M 400,380 L 490,290" fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="0.5" strokeDasharray="2,2" />
          <path d="M 380,440 L 310,540" fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="0.5" strokeDasharray="2,2" />
        </svg>

        {/* Circuitry */}
        <svg className="circuitry-svg" viewBox="0 0 800 800">
          <defs>
            <filter id="led-glow-ui">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
          </defs>
          <g transform="translate(400, 400)">
            <circle cx="0" cy="0" r="45" fill="rgba(245,158,11,0.05)" stroke="rgba(245,158,11,0.2)" strokeWidth="1" />
            
            {/* Conversion Trace */}
            <path className="trace-base" d="M 0,10 L 0,350" />
            <path className="trace-copper" d="M 0,10 L 0,350" strokeWidth="2" />
            <path className="trace-bg-pulse" d="M 0,10 L 0,350" />
            <rect className="node-pad" x="-10" y="345" width="20" height="20" rx="2" />
            <circle className="node-led" cx="0" cy="355" r="4" filter="url(#led-glow-ui)" id="n-conversion" />
            <circle className="node-ripple" cx="0" cy="355" r="4" id="r-conversion" />
            <path className="packet" d="M 0,10 L 0,350" id="p-conversion" />

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

        {/* Assembly */}
        <motion.div 
          className="core-assembly" 
          ref={assemblyRef}
          style={{
            x: mouseX,
            y: mouseY,
            scale: scale,
            rotateX,
            rotateY
          }}
        >
          <div 
            className="breathing-wrapper"
            style={{
              transform: `scale(${breathScale})`,
              filter: `blur(${breathBlur}px)`,
              opacity: breathOpacity
            }}
          >
            <div className="shard shard-inner" />
            <div className="shard shard-outer" />
            <div className="core-orb" onClick={handleOrbClick} />
          </div>

          <div 
            className="hud-tag oled-hud" 
            style={{ 
              transform: 'translate3d(105px, -125px, 80px)',
              marginLeft: jitterX,
              marginTop: jitterY
            }}
          >
            STATUS: {status}
          </div>
          <div 
            className="hud-tag oled-hud" 
            style={{ 
              transform: 'translate3d(-160px, 150px, 100px)',
              marginLeft: -jitterX,
              marginTop: -jitterY
            }}
          >
            TRACE: {isGlitching ? '---' : latency}ms_LATENCY
          </div>
        </motion.div>
      </div>
    </div>
  );
};
