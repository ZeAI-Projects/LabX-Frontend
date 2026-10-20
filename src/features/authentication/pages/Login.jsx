import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { getLoginDestination } from '../../../utils/onboarding.js';
import { AuthShell } from '../components/AuthShell';
import { soundManager } from '../components/gamified/soundEffects';
import { useAuthEffects } from '../components/gamified/useAuthEffects';

export const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.passwordReset ? location.state.email || '' : '');
  const [passwordResetNotice, setPasswordResetNotice] = useState(Boolean(location.state?.passwordReset));
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const emailInput = useRef(null);
  const passwordInput = useRef(null);
  const pending = useRef(false);
  const { login } = useAuth();
  const { schedule, isMounted } = useAuthEffects();

  useEffect(() => {
    if (error?.field === 'email') emailInput.current?.focus();
    else if (error) passwordInput.current?.focus();
  }, [error]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError({ field: 'email', message: email.trim() ? 'Enter a valid email address.' : 'Email address is required.' });
      return;
    }
    if (!password) {
      setError({ field: 'password', message: 'Password is required.' });
      return;
    }
    pending.current = true;
    setError(null);
    setPasswordResetNotice(false);
    setLoading(true);
    try {
      soundManager.playWarpLaunch();
      const data = await login(email.trim(), password, { rememberMe });
      if (!isMounted()) return;
      schedule(() => navigate(getLoginDestination(data.user), { replace: true }), 400);
    } catch (loginError) {
      pending.current = false;
      if (!isMounted()) return;
      setLoading(false);
      setError({ message: loginError.message || 'Unable to sign in right now. Please try again.' });
    }
  };

  return (
    <AuthShell mode="signin" title="Sign in" subtitle="Welcome back. Continue your LabX journey." busy={loading}>
      {passwordResetNotice && <div className="auth-success-banner" role="status"><Check size={18} aria-hidden="true" /><p>Your password has been reset successfully. Please sign in with your new password.</p></div>}
      {error && <div id="login-error" className="auth-error-banner" role="alert"><AlertCircle size={16} aria-hidden="true" /><span>{error.message}</span></div>}
      <form onSubmit={handleSubmit} aria-busy={loading} noValidate>
        <div className="compact-auth-fields">
          <div className="gamified-field-group">
            <label className="gamified-field-label" htmlFor="login-email">Email Address<span className="required-mark" aria-hidden="true" /></label>
            <input ref={emailInput} type="email" id="login-email" name="email" autoComplete="email"
              autoCapitalize="none" spellCheck={false} className="gamified-input" required disabled={loading}
              aria-invalid={error?.field === 'email'} aria-describedby={error?.field === 'email' ? 'login-error' : undefined}
              value={email} onChange={(event) => { setEmail(event.target.value); setError(null); }}
              onFocus={soundManager.playFocus} placeholder="you@example.com" />
          </div>
          <div className="gamified-field-group">
            <div className="compact-signin-password-label">
              <label className="gamified-field-label" htmlFor="login-password">Password<span className="required-mark" aria-hidden="true" /></label>
              <Link className="forgot-pass-link" to="/forgot-password" onMouseEnter={soundManager.playHover}
                aria-disabled={loading} onClick={(event) => { if (loading) event.preventDefault(); }}>Forgot Password</Link>
            </div>
            <div className="gamified-input-wrap">
              <input ref={passwordInput} type={showPassword ? 'text' : 'password'} id="login-password" name="password"
                autoComplete="current-password" className="gamified-input" required disabled={loading}
                aria-invalid={Boolean(error && error.field !== 'email')} aria-describedby={error && error.field !== 'email' ? 'login-error' : undefined}
                value={password} onChange={(event) => { setPassword(event.target.value); setError(null); }}
                onFocus={soundManager.playFocus} placeholder="Enter your password" />
              <button type="button" className="input-action-icon" disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
        <div className="compact-auth-actions">
          <label className="remember-terminal" htmlFor="remember-terminal">
            <input id="remember-terminal" name="rememberMe" type="checkbox" className="remember-terminal-input"
              checked={rememberMe} disabled={loading} onChange={(event) => { setRememberMe(event.target.checked); soundManager.playHover(); }} />
            <span className={`custom-checkbox ${rememberMe ? 'checked' : ''}`} aria-hidden="true">{rememberMe && <Check size={12} strokeWidth={3} />}</span>
            <span>Remember Me</span>
          </label>
          <button type="submit" className="btn-warp-create" disabled={loading} onMouseEnter={soundManager.playHover}>
            {loading ? <><Sparkles size={16} aria-hidden="true" /><span>Signing in…</span></> : <><span>Sign in</span><ArrowRight size={17} aria-hidden="true" /></>}
          </button>
        </div>
      </form>
    </AuthShell>
  );
};
