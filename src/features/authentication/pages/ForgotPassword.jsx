import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Shield } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { sessionStore } from '../../../services/storage/local_storage.js';
import { HologramX } from '../components/gamified/HologramX';
import { ParticleNetwork } from '../components/gamified/ParticleNetwork';
import { soundManager } from '../components/gamified/soundEffects';
import { useAuthEffects } from '../components/gamified/useAuthEffects';
import '../components/Register.css';
import { SoundToggle } from '../components/AuthShell.jsx';
import '../components/Recovery.css';

export function PasswordRecoveryShell({ title, subtitle, step = 1, children }) {

  return (
    <div className={`gamified-auth-container compact-auth-page password-recovery-container${step === 2 ? " is-reset" : ""}`}>
      <ParticleNetwork />
      <div className="auth-top-hud">
        <Link className="recovery-exit-link" to="/register" onMouseEnter={soundManager.playHover}>
          <ArrowLeft size={14} aria-hidden="true" />Back to sign up
        </Link>
        <SoundToggle />
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
          <p className="auth-brand-note"><Shield size={14} aria-hidden="true" /><span>One Ecosystem. Infinite Opportunities.</span></p>
        </div>
        <div className="form-panel">
          <ol className="recovery-steps" aria-label="Password recovery progress">
            <li className={step === 1 ? 'current' : 'complete'} aria-current={step === 1 ? 'step' : undefined}>
              <span aria-hidden="true">1</span>Email address
            </li>
            <li className={step === 2 ? 'current' : ''} aria-current={step === 2 ? 'step' : undefined}>
              <span aria-hidden="true">2</span>Reset password
            </li>
          </ol>
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

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailInput = useRef(null);
  const pending = useRef(false);
  const navigate = useNavigate();
  const { requestPasswordReset } = useAuth();
  const { isMounted } = useAuthEffects();

  useEffect(() => {
    if (error) emailInput.current?.focus();
  }, [error]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError(normalizedEmail ? 'Enter a valid email address.' : 'Email address is required.');
      emailInput.current?.focus();
      return;
    }
    pending.current = true;
    setLoading(true);
    setError('');
    sessionStore.removeItem('labx_password_recovery');
    try {
      const recovery = await requestPasswordReset(normalizedEmail);
      if (!isMounted()) return;
      sessionStore.writeJSON('labx_password_recovery', recovery);
      soundManager.playXpGain();
      navigate('/reset-password', { state: recovery });
    } catch (requestError) {
      if (isMounted()) {
        setError(requestError.message || 'We couldn’t send the verification code. Please try again.');
        emailInput.current?.focus();
      }
    } finally {
      pending.current = false;
      if (isMounted()) setLoading(false);
    }
  };

  return (
    <PasswordRecoveryShell title="Forgot Password" subtitle="Enter the email address registered with your LabX account.">
      {error && <div id="recovery-email-error" className="auth-error-banner" role="alert"><AlertCircle size={17} /><span>{error}</span></div>}
      <form onSubmit={handleSubmit} aria-busy={loading} noValidate>
        <div className="gamified-field-group">
          <label className="gamified-field-label" htmlFor="recovery-email">Email Address<span className="required-mark" aria-hidden="true" /></label>
          <input
            ref={emailInput}
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            className="gamified-input"
            required
            disabled={loading}
            aria-invalid={Boolean(error)}
            aria-describedby={`recovery-email-instruction${error ? ' recovery-email-error' : ''}`}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError('');
            }}
            onFocus={soundManager.playFocus}
            placeholder="you@example.com"
          />
          <p className="auth-field-hint" id="recovery-email-instruction">Enter your registered email address to receive a six-digit verification code.</p>
        </div>
        <button type="submit" className="btn-warp-create" disabled={loading} onMouseEnter={soundManager.playHover}>
          <span>{loading ? 'Sending code…' : 'Send six-digit code'}</span><ArrowRight size={18} aria-hidden="true" />
        </button>
      </form>
      <div className="form-footer-login">
        <Link className="login-link recovery-back-link" to="/login"><ArrowLeft size={15} aria-hidden="true" />Back to sign in</Link>
      </div>
    </PasswordRecoveryShell>
  );
}
