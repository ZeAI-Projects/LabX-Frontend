import React, { useState } from 'react';

export const HologramX = () => {
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 24; // -12 to 12 deg
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -24; // -12 to 12 deg
    setCoords({ x, y });
  };

  const handleMouseLeave = () => {
    setCoords({ x: 0, y: 0 });
  };

  return (
    <div
      className="hologram-reactor-wrapper"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: '1000px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '28px 0',
        position: 'relative',
      }}
    >
      {/* Background ambient radial glow */}
      <div
        style={{
          position: 'absolute',
          width: '260px',
          height: '260px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.22) 0%, rgba(168,85,247,0.12) 50%, transparent 70%)',
          filter: 'blur(35px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        className="hologram-3d-stage"
        style={{
          transform: `rotateX(${coords.y}deg) rotateY(${coords.x}deg)`,
          transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="240"
          height="240"
          viewBox="0 0 240 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* Hologram neon gradients */}
            <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            <linearGradient id="neonBevel" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#083344" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#67e8f9" />
            </linearGradient>

            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
            </linearGradient>

            {/* Neon Glow Filters */}
            <filter id="coreGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur1" />
              <feGaussianBlur stdDeviation="16" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer Rotating Cyber Grid Ring */}
          <g className="holo-orbit-ring-outer">
            <circle
              cx="120"
              cy="120"
              r="105"
              stroke="url(#ringGrad)"
              strokeWidth="1.5"
              strokeDasharray="6 12 2 8"
              opacity="0.6"
            />
            {/* Orbiting Satellite Node 1 */}
            <circle cx="120" cy="15" r="3.5" fill="#22d3ee" filter="url(#subtleGlow)" />
            <circle cx="225" cy="120" r="2.5" fill="#a855f7" />
            <circle cx="15" cy="120" r="2.5" fill="#38bdf8" />
          </g>

          {/* Inner Counter-Rotating Hex / Dash Ring */}
          <g className="holo-orbit-ring-inner">
            <circle
              cx="120"
              cy="120"
              r="85"
              stroke="#06b6d4"
              strokeWidth="1"
              strokeDasharray="24 8 4 8"
              opacity="0.4"
            />
            {/* Orbiting Satellite Node 2 */}
            <circle cx="120" cy="205" r="3" fill="#67e8f9" filter="url(#subtleGlow)" />
          </g>

          {/* Cyber Corner Reticles / HUD Brackets */}
          <path d="M 50 65 L 50 50 L 65 50" stroke="#06b6d4" strokeWidth="1.5" opacity="0.7" fill="none" />
          <path d="M 190 65 L 190 50 L 175 50" stroke="#06b6d4" strokeWidth="1.5" opacity="0.7" fill="none" />
          <path d="M 50 175 L 50 190 L 65 190" stroke="#06b6d4" strokeWidth="1.5" opacity="0.7" fill="none" />
          <path d="M 190 175 L 190 190 L 175 190" stroke="#06b6d4" strokeWidth="1.5" opacity="0.7" fill="none" />

          {/* The Holographic 3D 'X' Core */}
          <g filter="url(#coreGlow)">
            {/* Shadow Depth Layer (Offset) */}
            <path
              d="M 74 62 L 98 62 L 120 96 L 142 62 L 166 62 L 132 114 L 168 170 L 144 170 L 120 132 L 96 170 L 72 170 L 108 114 Z"
              fill="#082f49"
              opacity="0.8"
              transform="translate(4, 6)"
            />

            {/* Base Neon Bevel / Body */}
            <path
              d="M 74 62 L 98 62 L 120 96 L 142 62 L 166 62 L 132 114 L 168 170 L 144 170 L 120 132 L 96 170 L 72 170 L 108 114 Z"
              fill="url(#neonBevel)"
              stroke="#06b6d4"
              strokeWidth="2"
            />

            {/* Front Crisp Neon Core Layer */}
            <path
              d="M 77 65 L 95 65 L 120 102 L 145 65 L 163 65 L 130 115 L 165 167 L 147 167 L 120 126 L 93 167 L 75 167 L 110 115 Z"
              fill="url(#neonCyan)"
            />

            {/* Specular Edge Highlights */}
            <path
              d="M 77 65 L 95 65 L 120 102 L 115 102 Z"
              fill="#ffffff"
              opacity="0.6"
            />
            <path
              d="M 145 65 L 163 65 L 130 115 L 125 115 Z"
              fill="#cffafe"
              opacity="0.4"
            />
            <path
              d="M 75 167 L 93 167 L 120 126 L 115 126 Z"
              fill="#a5f3fc"
              opacity="0.5"
            />
          </g>

          {/* Central Reactor Energy Core */}
          <circle
            cx="120"
            cy="114"
            r="7"
            fill="#ffffff"
            filter="url(#subtleGlow)"
            className="holo-pulse-core"
          />
          <circle
            cx="120"
            cy="114"
            r="16"
            stroke="#67e8f9"
            strokeWidth="1.5"
            opacity="0.8"
            className="holo-pulse-ring"
          />

          {/* Micro HUD Coordinate Tags */}
          <text x="75" y="44" fill="#06b6d4" fontSize="8" fontFamily="monospace" opacity="0.75" letterSpacing="1">
            REACTOR: [ONLINE]
          </text>
          <text x="135" y="198" fill="#a855f7" fontSize="8" fontFamily="monospace" opacity="0.75" letterSpacing="1">
            ZEAI-SYS: 0x9F
          </text>
        </svg>
      </div>

      <style>{`
        @keyframes holoRotateClockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes holoRotateCounter {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes holoCorePulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.3); opacity: 1; filter: drop-shadow(0 0 12px #22d3ee); }
        }
        @keyframes holoRingPulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.4); opacity: 0.9; }
        }

        .holo-orbit-ring-outer {
          transform-origin: 120px 120px;
          animation: holoRotateClockwise 25s linear infinite;
        }
        .holo-orbit-ring-inner {
          transform-origin: 120px 120px;
          animation: holoRotateCounter 18s linear infinite;
        }
        .holo-pulse-core {
          transform-origin: 120px 114px;
          animation: holoCorePulse 3s ease-in-out infinite;
        }
        .holo-pulse-ring {
          transform-origin: 120px 114px;
          animation: holoRingPulse 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
