import React from 'react';

/*
 * High-Detail PUBG-Style Tier Rank Crest Component
 * Supports Large Floating Crests with Metallic Bevels, Winged Armor & Roman Sub-Ranks
 */
export const TierRankBadge = ({
  stageIndex = 0,
  subRank = 1,
  size = 80,
  label = '',
  state = 'active', // 'completed' | 'active' | 'locked'
}) => {
  const THEMES = [
    {
      name: 'INITIATOR',
      metalStart: '#38bdf8',
      metalMid: '#0284c7',
      metalEnd: '#075985',
      accentGlow: 'rgba(6, 182, 212, 0.85)',
      plateGrad: ['#0369a1', '#082f49'],
    },
    {
      name: 'BUILDER',
      metalStart: '#c084fc',
      metalMid: '#9333ea',
      metalEnd: '#581c87',
      accentGlow: 'rgba(168, 85, 247, 0.85)',
      plateGrad: ['#6b21a8', '#3b0764'],
    },
    {
      name: 'OPERATOR',
      metalStart: '#fcd34d',
      metalMid: '#d97706',
      metalEnd: '#78350f',
      accentGlow: 'rgba(245, 158, 11, 0.85)',
      plateGrad: ['#b45309', '#451a03'],
    },
    {
      name: 'SCALER',
      metalStart: '#fda4af',
      metalMid: '#e11d48',
      metalEnd: '#881337',
      accentGlow: 'rgba(244, 63, 94, 0.85)',
      plateGrad: ['#be123c', '#4c0519'],
    },
    {
      name: 'CONQUEROR',
      metalStart: '#fef08a',
      metalMid: '#eab308',
      metalEnd: '#713f12',
      accentGlow: 'rgba(234, 179, 8, 0.95)',
      plateGrad: ['#a16207', '#422006'],
    },
  ];

  const theme = THEMES[stageIndex % THEMES.length];
  const rankRoman = subRank === 1 ? 'I' : subRank === 2 ? 'II' : subRank === 3 ? 'III' : `${subRank}`;
  const displayLabel = label || theme.name;
  const isLocked = state === 'locked';
  const isCompleted = state === 'completed';

  const glowColor = isCompleted
    ? 'rgba(16, 185, 129, 0.9)'
    : isLocked
    ? 'rgba(30, 41, 59, 0.4)'
    : theme.accentGlow;

  return (
    <div
      className={`pubg-tier-crest-container ${state}`}
      style={{
        width: `${size}px`,
        height: `${size * 1.3}px`,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: isLocked
          ? 'grayscale(0.85) opacity(0.6)'
          : `drop-shadow(0 8px 24px ${glowColor})`,
        userSelect: 'none',
        transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    >
      <svg
        width={size}
        height={size * 1.3}
        viewBox="0 0 100 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Metallic Armor Gradient */}
          <linearGradient id={`crestMetal_${stageIndex}_${state}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="30%" stopColor={isCompleted ? '#34d399' : isLocked ? '#64748b' : theme.metalStart} />
            <stop offset="70%" stopColor={isCompleted ? '#10b981' : isLocked ? '#475569' : theme.metalMid} />
            <stop offset="100%" stopColor={isCompleted ? '#065f46' : isLocked ? '#1e293b' : theme.metalEnd} />
          </linearGradient>

          {/* Center Plate Gradient */}
          <linearGradient id={`plateGrad_${stageIndex}_${state}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isCompleted ? '#065f46' : isLocked ? '#1e293b' : theme.plateGrad[0]} />
            <stop offset="100%" stopColor={isCompleted ? '#022c22' : isLocked ? '#0a0f1d' : theme.plateGrad[1]} />
          </linearGradient>

          {/* Dark Core Shadow Gradient */}
          <linearGradient id={`coreShadow_${stageIndex}_${state}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
        </defs>

        {/* 1. Outer Winged Armored Crest */}
        <path
          d="M 10 36 L 22 16 L 50 4 L 78 16 L 90 36 L 84 74 L 50 100 L 16 74 Z"
          fill={`url(#crestMetal_${stageIndex}_${state})`}
          stroke="#ffffff"
          strokeWidth="1.5"
          opacity="0.95"
        />

        {/* 2. Inner Shield Armor Bevel */}
        <path
          d="M 18 38 L 50 16 L 82 38 L 78 74 L 50 94 L 22 74 Z"
          fill={`url(#coreShadow_${stageIndex}_${state})`}
          stroke={isCompleted ? '#10b981' : isLocked ? '#475569' : theme.metalStart}
          strokeWidth="2"
        />

        {/* 3. Crossed Swords / Wings Behind Center */}
        <line
          x1="26"
          y1="28"
          x2="74"
          y2="78"
          stroke={`url(#crestMetal_${stageIndex}_${state})`}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <line
          x1="74"
          y1="28"
          x2="26"
          y2="78"
          stroke={`url(#crestMetal_${stageIndex}_${state})`}
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* 4. Top Star Crest Crown */}
        <polygon
          points="50,10 57,24 71,26 60,35 64,48 50,40 36,48 40,35 29,26 43,24"
          fill={`url(#crestMetal_${stageIndex}_${state})`}
          stroke="#ffffff"
          strokeWidth="1"
        />

        {/* 5. Center Sub-Rank Roman Numeral Box */}
        <rect
          x="32"
          y="44"
          width="36"
          height="28"
          rx="6"
          fill={`url(#plateGrad_${stageIndex}_${state})`}
          stroke={isCompleted ? '#10b981' : isLocked ? '#475569' : theme.metalStart}
          strokeWidth="1.8"
        />

        <text
          x="50"
          y="64"
          fill="#ffffff"
          fontSize="15"
          fontWeight="900"
          textAnchor="middle"
          fontFamily="Impact, Arial Black, sans-serif"
          letterSpacing="1"
          style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.9))' }}
        >
          {isLocked ? '🔒' : rankRoman}
        </text>

        {/* 6. Bottom Metallic Ribbon Plate */}
        <path
          d="M 6 100 L 50 90 L 94 100 L 88 120 L 50 129 L 12 120 Z"
          fill={`url(#plateGrad_${stageIndex}_${state})`}
          stroke={isCompleted ? '#10b981' : isLocked ? '#475569' : theme.metalStart}
          strokeWidth="1.8"
        />

        <text
          x="50"
          y="116"
          fill="#ffffff"
          fontSize="9.5"
          fontWeight="900"
          textAnchor="middle"
          fontFamily="Arial Black, Impact, sans-serif"
          letterSpacing="0.9"
          style={{ textTransform: 'uppercase', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.95))' }}
        >
          {displayLabel}
        </text>
      </svg>
    </div>
  );
};
