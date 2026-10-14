import React, { useState } from 'react';
import { useAuth } from '../../contexts/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Volume2,
  VolumeX,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { ParticleNetwork } from './gamified/ParticleNetwork';
import { HologramX } from './gamified/HologramX';
import { soundManager } from './gamified/soundEffects';
import './Register.css';

export const Register = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [soundActive, setSoundActive] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [launchingWarp, setLaunchingWarp] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSwitchToLogin = (e) => {
    if (e) e.preventDefault();
    if (isSwitching) return;
    soundManager.playTransition();
    setIsSwitching(true);
    setTimeout(() => {
      navigate('/login');
    }, 400);
  };

  // Password strength matrix
  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
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
    setError('');
    setLoading(true);

    try {
      soundManager.playWarpLaunch();
      setLaunchingWarp(true);

      const result = await register(email, password, fullName);

      // If confirmation email is required
      if (!result?.access_token) {
        setError('Registration successful! Confirmation beacon dispatched. Check your email to sign in.');
        setLoading(false);
        setLaunchingWarp(false);
        return;
      }

      // Short delay for warp animation
      setTimeout(() => {
        navigate('/assessment');
      }, 700);
    } catch (err) {
      setError(err.message || 'Founder registration encountered an issue.');
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
        >
          {soundActive ? <Volume2 size={16} color="#38bdf8" /> : <VolumeX size={16} color="#64748b" />}
          <span>SFX: {soundActive ? 'ONLINE' : 'MUTED'}</span>
        </button>

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
            <h1 className="showcase-title">Join the Founder Movement</h1>
            <p className="showcase-desc">
              Create your account and begin your founder progression journey.
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
              <span>Sign In</span>
            </button>
          </div>

          <div className="form-header">
            <h2 className="form-title">Create Your LabX Account</h2>
            <p className="form-subtitle">Start building your future today.</p>
          </div>

          {/* Anomaly / Error Banner */}
          {error && (
            <div className="auth-error-banner">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Full Name */}
            <div className="gamified-field-group">
              <div className="gamified-field-label-row">
                <label className="gamified-field-label">Full Name</label>
              </div>
              <div className="gamified-input-wrap">
                <input
                  type="text"
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
                <label className="gamified-field-label">Email Address</label>
              </div>
              <div className="gamified-input-wrap">
                <input
                  type="email"
                  className="gamified-input"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={soundManager.playFocus}
                  placeholder="founder@venture.com"
                />
              </div>
            </div>

            {/* Step 3: Password with Security Shield Matrix */}
            <div className="gamified-field-group">
              <div className="gamified-field-label-row">
                <label className="gamified-field-label">Password</label>
              </div>
              <div className="gamified-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="gamified-input"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={soundManager.playFocus}
                  placeholder="Create a strong password (min. 6 chars)"
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

              {/* Cyber Security Matrix Indicator */}
              <div className="security-matrix">
                <div className="matrix-bars">
                  <div className={`matrix-bar ${passwordScore >= 1 ? 'active-1' : ''}`} />
                  <div className={`matrix-bar ${passwordScore >= 2 ? 'active-2' : ''}`} />
                  <div className={`matrix-bar ${passwordScore >= 3 ? 'active-3' : ''}`} />
                  <div className={`matrix-bar ${passwordScore >= 4 ? 'active-4' : ''}`} />
                </div>
                <div className="matrix-label">
                  <span>VAULT INTEGRITY:</span>
                  <span style={{ color: passwordScore >= 3 ? '#22d3ee' : passwordScore >= 2 ? '#f59e0b' : '#94a3b8' }}>
                    {passwordLabels[passwordScore]}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit CTA Button */}
            <button
              type="submit"
              className="btn-warp-create"
              disabled={loading || launchingWarp}
              onMouseEnter={soundManager.playHover}
            >
              {launchingWarp ? (
                <>
                  <Sparkles size={18} className="animate-spin" />
                  <span>CALIBRATING FOUNDER PROTOCOL...</span>
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
