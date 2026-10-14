export const HeroCrystal = () => (
  <svg className="dashboard-home__crystal" aria-hidden="true" width="88" height="110" viewBox="0 0 100 120" fill="none">
    <defs>
      <linearGradient id="hct" x1="50" y1="10" x2="50" y2="45" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f3e8ff" /><stop offset="1" stopColor="#c084fc" />
      </linearGradient>
      <linearGradient id="hcm" x1="25" y1="20" x2="75" y2="80" gradientUnits="userSpaceOnUse">
        <stop stopColor="#c084fc" /><stop offset="0.6" stopColor="#9333ea" /><stop offset="1" stopColor="#581c87" />
      </linearGradient>
      <linearGradient id="hcl" x1="20" y1="30" x2="50" y2="80" gradientUnits="userSpaceOnUse">
        <stop stopColor="#a855f7" /><stop offset="1" stopColor="#6b21a8" />
      </linearGradient>
      <linearGradient id="hcr" x1="80" y1="30" x2="50" y2="80" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7e22ce" /><stop offset="1" stopColor="#3b0764" />
      </linearGradient>
      <radialGradient id="hrg" cx="50" cy="100" r="45" gradientUnits="userSpaceOnUse">
        <stop stopColor="#c084fc" stopOpacity="0.9" />
        <stop offset="0.5" stopColor="#9333ea" stopOpacity="0.4" />
        <stop offset="1" stopColor="#3b0764" stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx="50" cy="104" rx="44" ry="13" fill="url(#hrg)" />
    <ellipse cx="50" cy="104" rx="36" ry="9" fill="rgba(15,23,42,0.9)" stroke="#c084fc" strokeWidth="1.5" />
    <ellipse cx="50" cy="101" rx="26" ry="6" fill="rgba(30,27,75,0.9)" stroke="#a855f7" strokeWidth="1" strokeDasharray="3 3" />
    <ellipse cx="50" cy="98" rx="16" ry="4" fill="#581c87" stroke="#e9d5ff" strokeWidth="1.5" />
    <polygon points="50,12 66,35 50,44 34,35" fill="url(#hct)" />
    <polygon points="50,12 34,35 24,50 50,88" fill="url(#hcl)" />
    <polygon points="50,12 66,35 76,50 50,88" fill="url(#hcr)" />
    <polygon points="34,35 50,44 66,35 76,50 50,88 24,50" fill="url(#hcm)" opacity="0.95" />
    <polygon points="50,44 58,56 50,76 42,56" fill="#ffffff" opacity="0.4" />
    <circle cx="28" cy="30" r="2" fill="#f3e8ff" opacity="0.9" />
    <circle cx="72" cy="26" r="2" fill="#f3e8ff" opacity="0.9" />
    <circle cx="20" cy="65" r="1.5" fill="#c084fc" />
    <circle cx="80" cy="62" r="1.5" fill="#c084fc" />
  </svg>
);
