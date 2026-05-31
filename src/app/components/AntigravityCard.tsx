import type React from 'react';
import { useRef, useState } from 'react';

interface AntigravityCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // Maximum tilt angle in degrees
}

export default function AntigravityCard({
  children,
  className = 'p-6',
  maxTilt = 10,
}: AntigravityCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const box = card.getBoundingClientRect();

    // Relative coordinates from card center (-1 to 1)
    const x = (e.clientX - box.left - box.width / 2) / (box.width / 2);
    const y = (e.clientY - box.top - box.height / 2) / (box.height / 2);

    // Smooth tilt limit
    setRotate({
      x: -y * maxTilt,
      y: x * maxTilt,
    });

    // Glare position (percentage: 0 to 100)
    const glareX = ((e.clientX - box.left) / box.width) * 100;
    const glareY = ((e.clientY - box.top) / box.height) * 100;
    setGlarePos({ x: glareX, y: glareY });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 }); // Reset to flat smoothly
  };

  return (
    <div style={{ perspective: 1200 }} className="w-full inline-block">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) translateZ(${isHovered ? '15px' : '0px'})`,
          transition: isHovered ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
          transformStyle: 'preserve-3d',
        }}
        className={`
          relative overflow-hidden cursor-pointer w-full
          backdrop-blur-xl bg-white/75 border border-white/40
          rounded-2xl shadow-[0_20px_45px_rgba(0,0,0,0.03)]
          hover:shadow-[0_30px_60px_rgba(243,210,48,0.12)]
          transition-shadow duration-500
          ${className}
        `}
      >
        {/* Anti-gravity inner hover light beams (Neon border glowing aura) */}
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-500"
          style={{
            opacity: isHovered ? 0.8 : 0,
            background: `radial-gradient(circle 220px at ${glarePos.x}% ${glarePos.y}%, rgba(243,210,48,0.15) 0%, transparent 80%)`,
          }}
        />

        {/* Dynamic Refractive Glare Sheet */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 mix-blend-overlay"
          style={{
            opacity: isHovered ? 0.35 : 0,
            background: `radial-gradient(circle 120px at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 80%)`,
          }}
        />

        {/* 3D Depth Inner Wrapper */}
        <div
          style={{
            transform: `translateZ(${isHovered ? '20px' : '0px'})`,
            transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
          className="relative z-10"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
