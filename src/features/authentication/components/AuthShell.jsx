import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { ParticleNetwork } from './gamified/ParticleNetwork';
import { HologramX } from './gamified/HologramX';
import './Register.css';
import './AuthShell.css';

export function AuthShell({ mode, title, subtitle, busy = false, children }) {
  const navigate = useNavigate();
  const signingIn = mode === 'signin';

  const switchMode = (destination) => {
    if (busy) return;
    navigate(destination);
  };

  return (
    <div className={`gamified-auth-container compact-auth-page auth-mode-${mode}`}>
    <ParticleNetwork />
    <div className="auth-top-hud" />
      <div className="gamified-card-shell">
        <div className="card-laser-scanner" />
        <div className="showcase-panel">
          <div className="showcase-header">
            <div className="brand-logo-wrap">
              <span className="brand-logo-text">Lab<span className="brand-x-neon">X</span></span>
              <span className="brand-sub-badge">by ZeAI</span>
            </div>
            <p className="showcase-subhead">Build Tomorrow.</p>
            <h1 className="showcase-title">{signingIn ? 'Access Your LabX Terminal.' : 'Join the LabX Community'}</h1>
            <p className="showcase-desc">{signingIn ? 'Sign in to continue your journey, connect with your community, and build tomorrow.' : 'Create your account as a founder, mentor or investor and begin your LabX journey.'}</p>
          </div>
          <HologramX />
          <p className="auth-brand-note"><Shield size={14} aria-hidden="true" /><span>One Ecosystem. Infinite Opportunities.</span></p>
        </div>
        <div className="form-panel">
          {mode !== 'verify' && <nav className="auth-mode-switch-tabs" aria-label="Account access">
            <button type="button" className={`mode-tab-btn ${mode === 'signup' ? 'active' : ''}`}
              aria-current={mode === 'signup' ? 'page' : undefined} disabled={busy}
              onClick={() => { if (mode !== 'signup') switchMode('/register'); }}>
              Sign up
            </button>
            <button type="button" className={`mode-tab-btn ${mode === 'signin' ? 'active' : ''}`}
              aria-current={mode === 'signin' ? 'page' : undefined} disabled={busy}
              onClick={() => { if (mode !== 'signin') switchMode('/login'); }}>
              Sign in
            </button>
          </nav>}
          <div className="form-header">
            <h2 className="form-title">{title}</h2>
            <p className="form-subtitle">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
