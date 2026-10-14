import { useState } from 'react';
import { useAuth } from '../../../hooks/use_auth.js';
import { getRegistrationDestination } from '../../../utils/onboarding.js';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Volume2,
  VolumeX,
  Sparkles,
  Check,
  Activity,
  AlertCircle
} from 'lucide-react';
import { ParticleNetwork } from '../components/gamified/ParticleNetwork';
import { HologramX } from '../components/gamified/HologramX';
import { soundManager } from '../components/gamified/soundEffects';
import { useAuthEffects } from '../components/gamified/useAuthEffects';
import { validatePassword } from '../validation/auth_validation.js';
import '../components/Register.css';

export const Register = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [soundActive, setSoundActive] = useState(soundManager.isEnabled);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [launchingWarp, setLaunchingWarp] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();
  const { schedule, isMounted } = useAuthEffects();

  const handleSwitchToLogin = (e) => {
    if (e) e.preventDefault();
    if (isSwitching || loading) return;
    soundManager.playTransition();
    setIsSwitching(true);
    schedule(() => {
      navigate('/login');
    }, 400);
  };

  // Password strength matrix
  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 9 && password.length <= 20) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9\s]/.test(password)) score++;
    return score;
  };

  const passwordScore = getPasswordStrength();
  const passwordLabels = [
    'ENCRYPTION REQUIRED',
    'VULNERABLE PROTOCOL',
    'HARDENED SHIELD',
    'FORTIFIED VAULT',
    'INDESTRUCTIBLE CYPHER'
  ];

  const toggleSound = () => {
    const newState = soundManager.toggle();
    setSoundActive(newState);
    if (newState) soundManager.playHover();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || isSwitching) return;
    setError('');
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!['founder', 'mentor'].includes(role)) {
      setError('Please select Founder or Mentor.');
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (confirmPassword !== password) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);

    try {
      soundManager.playWarpLaunch();
      setLaunchingWarp(true);

      const data = await register(email.trim(), password, fullName.trim(), { role, rememberMe });
      if (!isMounted()) return;

      // Short delay for warp animation
      schedule(() => {
        navigate(getRegistrationDestination(data.user), { replace: true });
      }, 700);
    } catch (err) {
      if (!isMounted()) return;
      setError(err.message || 'Registration encountered an issue. Please try again.');
      setLoading(false);
      setLaunchingWarp(false);
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
          <div className="hud-xp-text" style={{ color: '#38bdf8' }}>PORTAL: [ONLINE]</div>
        </div>
      </div>

      {/* Master Dual Card Container */}
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
            <h1 className="showcase-title">Join the LabX Community</h1>
            <p className="showcase-desc">
              Create your account as a founder or mentor and begin your LabX journey.
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

        {/* ================= RIGHT REGISTRATION FORM ================= */}
        <div className="form-panel">
          {/* Top Mode Switcher Tabs */}
          <div className="auth-mode-switch-tabs">
            <button
              type="button"
              className="mode-tab-btn active"
              onClick={() => soundManager.playHover()}
            >
              <Sparkles size={13} />
              <span>Register</span>
            </button>
            <button
              type="button"
              className="mode-tab-btn"
              onClick={handleSwitchToLogin}
              onMouseEnter={soundManager.playHover}
            >
              <span>Login</span>
            </button>
          </div>

          <div className="form-header">
            <h2 className="form-title">Create an account</h2>
            <p className="form-subtitle">Start building your future today.</p>
          </div>

          <div className="auth-demo-notice">
            <p>Mock preview — create a sample account to explore LabX.</p>
            <p>Use sample details and a password you do not use elsewhere.</p>
          </div>

          {/* Anomaly / Error Banner */}
          {error && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} aria-busy={loading}>
            {/* Step 1: Full Name */}
            <div className="gamified-field-group">
              <div className="gamified-field-label-row">
                <label className="gamified-field-label" htmlFor="register-name">Full Name</label>
              </div>
              <div className="gamified-input-wrap">
                <input
                  type="text"
                  id="register-name"
                  name="fullName"
                  autoComplete="name"
                  className="gamified-input"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onFocus={soundManager.playFocus}
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            {/* Step 2: Email Address */}
            <div className="gamified-field-group">
              <div className="gamified-field-label-row">
                <label className="gamified-field-label" htmlFor="register-email">Email Address</label>
              </div>
              <div className="gamified-input-wrap">
                <input
                  type="email"
                  id="register-email"
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

            <div className="gamified-field-group">
              <label className="gamified-field-label" htmlFor="register-role">Role</label>
              <select
                id="register-role"
                name="role"
                className="gamified-input auth-role-select"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                onFocus={soundManager.playFocus}
              >
                <option value="" disabled>Select your role</option>
                <option value="founder">Founder</option>
                <option value="mentor">Mentor</option>
              </select>
              <p className="auth-field-hint">Team members join under Founder.</p>
            </div>

            {/* Password with Security Shield Matrix */}
            <div className="gamified-field-group">
              <div className="gamified-field-label-row">
                <label className="gamified-field-label" htmlFor="register-password">Password</label>
              </div>
              <div className="gamified-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="register-password"
                  name="password"
                  autoComplete="new-password"
                  aria-describedby="password-requirements password-strength"
                  className="gamified-input"
                  required
                  minLength={9}
                  maxLength={20}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={soundManager.playFocus}
                  placeholder="Create a password"
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
              <p className="auth-field-hint" id="password-requirements">
                9–20 characters with uppercase, lowercase, a number, and a special character.
              </p>

              {/* Cyber Security Matrix Indicator */}
              <div className="security-matrix">
                <div className="matrix-bars">
                  <div className={`matrix-bar ${passwordScore >= 1 ? 'active-1' : ''}`} />
                  <div className={`matrix-bar ${passwordScore >= 2 ? 'active-2' : ''}`} />
                  <div className={`matrix-bar ${passwordScore >= 3 ? 'active-3' : ''}`} />
                  <div className={`matrix-bar ${passwordScore >= 4 ? 'active-4' : ''}`} />
                </div>
                <div className="matrix-label" id="password-strength">
                  <span>VAULT INTEGRITY:</span>
                  <span style={{ color: passwordScore >= 3 ? '#22d3ee' : passwordScore >= 2 ? '#f59e0b' : '#94a3b8' }}>
                    {passwordLabels[passwordScore]}
                  </span>
                </div>
              </div>
            </div>

            <div className="gamified-field-group">
              <label className="gamified-field-label" htmlFor="register-confirm-password">Confirm Password</label>
              <div className="gamified-input-wrap">
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="gamified-input"
                  required
                  minLength={9}
                  maxLength={20}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={soundManager.playFocus}
                  placeholder="Re-enter your password"
                />
                <button
                  type="button"
                  className="input-action-icon"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  aria-pressed={showConfirmPassword}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="login-options-row">
              <label className="remember-terminal" htmlFor="register-remember-me">
                <input
                  id="register-remember-me"
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
            </div>
            <p className="auth-field-hint remember-hint">Keep me signed in for 10 days.</p>

            {/* Submit CTA Button */}
            <button
              type="submit"
              className="btn-warp-create"
              disabled={loading || launchingWarp || isSwitching}
              onMouseEnter={soundManager.playHover}
            >
              {launchingWarp ? (
                <>
                  <Sparkles size={18} className="animate-spin" />
                  <span>CREATING YOUR ACCOUNT...</span>
                </>
              ) : loading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18 }} />
                  <span>TRANSMITTING DATA...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer Back-to-Login */}
          <div className="form-footer-login">
            Already have an account?{' '}
            <a
              href="/login"
              className="login-link"
              onClick={handleSwitchToLogin}
              onMouseEnter={soundManager.playHover}
            >
              Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
