import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Shield, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { HologramX } from '../components/gamified/HologramX';
import { ParticleNetwork } from '../components/gamified/ParticleNetwork';
import { soundManager } from '../components/gamified/soundEffects';
import { useAuthEffects } from '../components/gamified/useAuthEffects';
import '../components/Register.css';

export function PasswordRecoveryShell({ title, subtitle, children }) {
  const [soundActive, setSoundActive] = useState(soundManager.isEnabled);

  return (
    <div className="gamified-auth-container">
      <ParticleNetwork />
      <div className="auth-top-hud">
        <button
          type="button"
          className="hud-sound-toggle"
          title="Toggle SFX"
          aria-pressed={soundActive}
          onMouseEnter={soundManager.playHover}
          onClick={() => {
            const enabled = soundManager.toggle();
            setSoundActive(enabled);
            if (enabled) soundManager.playHover();
          }}
        >
          {soundActive ? <Volume2 size={16} color="#38bdf8" /> : <VolumeX size={16} color="#64748b" />}
          <span>SFX: {soundActive ? 'ONLINE' : 'MUTED'}</span>
        </button>
      </div>
      <div className="gamified-card-shell">
        <div className="card-laser-scanner" />
        <div className="showcase-panel">
          <div className="showcase-header">
            <div className="brand-logo-wrap">
              <span className="brand-logo-text">Lab<span className="brand-x-neon">X</span></span>
              <span className="brand-sub-badge">by ZeAI</span>
            </div>
            <p className="showcase-subhead">Build Tomorrow.</p>
            <h1 className="showcase-title">Your Journey Continues</h1>
            <p className="showcase-desc">Recover access to your LabX account and pick up where you left off.</p>
          </div>
          <HologramX />
          <div className="showcase-bottom-pill">
            <div className="pill-left">
              <div className="pill-shield-icon"><Shield size={16} /></div>
              <span className="pill-text">One Ecosystem. Infinite Opportunities.</span>
            </div>
          </div>
        </div>
        <div className="form-panel">
          <div className="auth-mode-switch-tabs">
            <Link className="mode-tab-btn" to="/register" onMouseEnter={soundManager.playHover}>Register</Link>
            <Link className="mode-tab-btn" to="/login" onMouseEnter={soundManager.playHover}>Login</Link>
          </div>
          <div className="form-header">
            <h2 className="form-title">{title}</h2>
            <p className="form-subtitle">{subtitle}</p>
          </div>
          <div className="auth-demo-notice"><p>Demo only — no email is sent.</p></div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { requestPasswordReset } = useAuth();
  const { isMounted } = useAuthEffects();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await requestPasswordReset(email.trim());
      if (!isMounted()) return;
      setResult(response);
      soundManager.playXpGain();
    } catch (error) {
      if (isMounted()) setError(error.message || 'Unable to create a reset link. Please try again.');
    } finally {
      if (isMounted()) setLoading(false);
    }
  };

  return (
    <PasswordRecoveryShell title="Forgot Password" subtitle="Enter your registered email to request a password reset link.">
      {error && <div className="auth-error-banner" role="alert"><AlertCircle size={17} /><span>{error}</span></div>}
      {result && (
        <div className="auth-success-banner" role="status">
          <CheckCircle2 size={18} />
          <div>
            <p>If an account exists for that email, a password reset link has been prepared.</p>
            {result.resetToken && (
              <Link className="login-link auth-reset-link" to={`/reset-password?token=${encodeURIComponent(result.resetToken)}`}>
                Open demo reset link
              </Link>
            )}
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} aria-busy={loading}>
        <div className="gamified-field-group">
          <label className="gamified-field-label" htmlFor="recovery-email">Email Address</label>
          <input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            className="gamified-input"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setResult(null);
            }}
            onFocus={soundManager.playFocus}
            placeholder="you@example.com"
          />
        </div>
        <button type="submit" className="btn-warp-create" disabled={loading} onMouseEnter={soundManager.playHover}>
          <span>{loading ? 'Preparing reset link...' : 'Send reset link'}</span><ArrowRight size={18} />
        </button>
      </form>
      <div className="form-footer-login"><Link className="login-link" to="/login">Back to Login</Link></div>
    </PasswordRecoveryShell>
  );
}
