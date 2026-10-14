import { useState } from 'react';
import { useAuth } from '../../../hooks/use_auth.js';
import { getLoginDestination } from '../../../utils/onboarding.js';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Volume2,
  VolumeX,
  Sparkles,
  Check,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { ParticleNetwork } from '../components/gamified/ParticleNetwork';
import { HologramX } from '../components/gamified/HologramX';
import { soundManager } from '../components/gamified/soundEffects';
import { useAuthEffects } from '../components/gamified/useAuthEffects';
import '../components/Register.css';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [soundActive, setSoundActive] = useState(soundManager.isEnabled);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uplinkActive, setUplinkActive] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const { schedule, isMounted } = useAuthEffects();

  const handleSwitchToRegister = (e) => {
    if (e) e.preventDefault();
    if (isSwitching || loading) return;
    soundManager.playTransition();
    setIsSwitching(true);
    schedule(() => {
      navigate('/register');
    }, 400);
  };

  const toggleSound = () => {
    const newState = soundManager.toggle();
    setSoundActive(newState);
    if (newState) soundManager.playHover();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || isSwitching) return;
    setError('');
    setLoading(true);

    try {
      soundManager.playWarpLaunch();
      setUplinkActive(true);

      const data = await login(email.trim(), password, { rememberMe });
      if (!isMounted()) return;

      // Short delay for sound & warp effect
      schedule(() => {
        navigate(getLoginDestination(data.user), { replace: true });
      }, 650);
    } catch (err) {
      if (!isMounted()) return;
      setError(err.message || 'Invalid email or password');
      setLoading(false);
      setUplinkActive(false);
    }
  };

  return (
    <div className="gamified-auth-container">
      {/* Interactive Background Particle Constellation */}
      <ParticleNetwork />

      {/* Top Gamification HUD */}
      <div className="auth-top-hud">
        <button
          type="button"
          className="hud-sound-toggle"
          onClick={toggleSound}
          onMouseEnter={soundManager.playHover}
          title="Toggle SFX"
          aria-pressed={soundActive}
        >
          {soundActive ? <Volume2 size={16} color="#38bdf8" /> : <VolumeX size={16} color="#64748b" />}
          <span>SFX: {soundActive ? 'ONLINE' : 'MUTED'}</span>
        </button>

        <div className="hud-xp-meter">
          <div className="hud-level-badge" style={{ color: '#10b981' }}>
            <Activity size={14} color="#10b981" />
            <span>GATEWAY: SECURE</span>
          </div>
          <div className="hud-xp-text" style={{ color: '#38bdf8' }}>
            PORTAL: [ONLINE]
          </div>
        </div>
      </div>

      {/* Master Dual Card Shell */}
      <div className={`gamified-card-shell ${isSwitching ? 'is-switching' : ''}`}>
        {/* Holographic Laser Scanline Sweep */}
        <div className="card-laser-scanner" />

        {/* ================= LEFT SHOWCASE PANEL ================= */}
        <div className="showcase-panel">
          <div className="showcase-header">
            <div className="brand-logo-wrap">
              <span className="brand-logo-text">
                Lab<span className="brand-x-neon">X</span>
              </span>
              <span className="brand-sub-badge">by ZeAI</span>
            </div>

            <p className="showcase-subhead">Build Tomorrow.</p>
            <h1 className="showcase-title">Access Your LabX Terminal</h1>
            <p className="showcase-desc">
              Log in to continue your journey, connect with your community, and build tomorrow.
            </p>
          </div>

          {/* Centerpiece: Interactive 3D Holographic 'X' */}
          <HologramX />

          {/* Bottom Ecosystem Hologram Pill */}
          <div className="showcase-bottom-pill">
            <div className="pill-left">
              <div className="pill-shield-icon">
                <Shield size={16} />
              </div>
              <span className="pill-text">One Ecosystem. Infinite Opportunities.</span>
            </div>
          </div>
        </div>

        {/* ================= RIGHT LOGIN FORM ================= */}
        <div className="form-panel">
          {/* Top Mode Switcher Tabs */}
          <div className="auth-mode-switch-tabs">
            <button
              type="button"
              className="mode-tab-btn"
              onClick={handleSwitchToRegister}
              onMouseEnter={soundManager.playHover}
            >
              <span>Register</span>
            </button>
            <button
              type="button"
              className="mode-tab-btn active"
              onClick={() => soundManager.playHover()}
            >
              <Sparkles size={13} />
              <span>Login</span>
            </button>
          </div>

          <div className="form-header">
            <h2 className="form-title">Welcome Back</h2>
            <p className="form-subtitle">Initiate your neural uplink to proceed.</p>
          </div>

          <div className="auth-demo-notice">
            <p>Mock preview — try a demo account or register your own.</p>
            <p className="auth-demo-credentials">founder@labx.demo · Demo1234!</p>
            <button
              type="button"
              className="login-link demo-fill-button"
              disabled={loading || isSwitching}
              onClick={() => {
                setEmail('founder@labx.demo');
                setPassword('Demo1234!');
                setError('');
                soundManager.playHover();
              }}
            >
              Use demo credentials
            </button>
          </div>

          {/* Anomaly / Error Banner */}
          {error && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} aria-busy={loading}>
            {/* Email Address */}
            <div className="gamified-field-group">
              <div className="gamified-field-label-row">
                <label className="gamified-field-label" htmlFor="login-email">Email Address</label>
              </div>
              <div className="gamified-input-wrap">
                <input
                  type="email"
                  id="login-email"
                  name="email"
                  autoComplete="email"
                  className="gamified-input"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={soundManager.playFocus}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="gamified-field-group">
              <div className="gamified-field-label-row">
                <label className="gamified-field-label" htmlFor="login-password">Password</label>
              </div>
              <div className="gamified-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  name="password"
                  autoComplete="current-password"
                  className="gamified-input"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={soundManager.playFocus}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="input-action-icon"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="login-options-row">
              <label className="remember-terminal" htmlFor="remember-terminal">
                <input
                  id="remember-terminal"
                  name="rememberMe"
                  type="checkbox"
                  className="remember-terminal-input"
                  checked={rememberMe}
                  onChange={(e) => {
                    setRememberMe(e.target.checked);
                    soundManager.playHover();
                  }}
                />
                <span className={`custom-checkbox ${rememberMe ? 'checked' : ''}`} aria-hidden="true">
                  {rememberMe && <Check size={12} strokeWidth={3} />}
                </span>
                <span>Remember Me</span>
              </label>
              <Link
                className="forgot-pass-link"
                to="/forgot-password"
                aria-disabled={loading || isSwitching}
                onClick={(event) => {
                  if (loading || isSwitching) event.preventDefault();
                }}
                onMouseEnter={soundManager.playHover}
              >
                Forgot Password
              </Link>
            </div>
            <p className="auth-field-hint remember-hint">Keep me signed in for 10 days.</p>

            {/* Primary CTA Submit Button */}
            <button
              type="submit"
              className="btn-warp-create"
              disabled={loading || uplinkActive || isSwitching}
              onMouseEnter={soundManager.playHover}
            >
              {uplinkActive ? (
                <>
                  <Sparkles size={18} className="animate-spin" />
                  <span>INITIATING NEURAL UPLINK...</span>
                </>
              ) : loading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18 }} />
                  <span>AUTHENTICATING PROTOCOL...</span>
                </>
              ) : (
                <>
                  <span>Login</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer Link to Register */}
          <div className="form-footer-login">
            Don't have an account?{' '}
            <a
              href="/register"
              className="login-link"
              onClick={handleSwitchToRegister}
              onMouseEnter={soundManager.playHover}
            >
              Create an account
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
