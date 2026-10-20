import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { sessionStore } from '../../../services/storage/local_storage.js';
import { AuthShell } from '../components/AuthShell';
import { soundManager } from '../components/gamified/soundEffects';
import { useAuthEffects } from '../components/gamified/useAuthEffects';
import { validatePassword } from '../validation/auth_validation.js';

export const Register = () => {
  const [searchParams] = useSearchParams();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(() => {
    const requestedRole = searchParams.get('role');
    return ['investor', 'mentor', 'founder'].includes(requestedRole) ? requestedRole : '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const form = useRef(null);
  const pending = useRef(false);
  const { requestRegistration } = useAuth();
  const navigate = useNavigate();
  const { isMounted } = useAuthEffects();

  useEffect(() => {
    if (error?.field) form.current?.elements.namedItem(error.field)?.focus();
  }, [error]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    if (!fullName.trim()) {
      setError({ field: 'fullName', message: 'Full name is required.' });
      return;
    }
    if (!['investor', 'mentor', 'founder'].includes(role)) {
      setError({ field: 'role', message: 'Please select your role.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError({ field: 'email', message: email.trim() ? 'Enter a valid email address.' : 'Email address is required.' });
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError({ field: 'password', message: passwordError });
      return;
    }
    if (confirmPassword !== password) {
      setError({ field: 'confirmPassword', message: confirmPassword ? 'Passwords do not match.' : 'Please confirm your password.' });
      return;
    }
    pending.current = true;
    setLoading(true);
    setError(null);
    try {
      soundManager.playWarpLaunch();
      const verification = await requestRegistration(email.trim(), password, fullName.trim(), { role, rememberMe });
      if (!isMounted()) return;
      sessionStore.writeJSON('labx_signup_verification', verification);
      setPassword('');
      setConfirmPassword('');
      navigate('/verify-email');
    } catch (registrationError) {
      if (!isMounted()) return;
      setError({ field: 'email', message: registrationError.message || 'Unable to complete your request right now. Please try again.' });
    } finally {
      pending.current = false;
      if (isMounted()) setLoading(false);
    }
  };

  const clearError = () => setError(null);
  const fieldError = (field) => ({
    'aria-invalid': error?.field === field,
    'aria-describedby': error?.field === field ? 'register-error' : undefined,
  });

  return (
    <AuthShell mode="signup" title="Create Your LabX Account" subtitle="Start building your future today." busy={loading}>
      {error && <div id="register-error" className="auth-error-banner" role="alert"><AlertCircle size={16} aria-hidden="true" /><span>{error.message}</span></div>}
      <form ref={form} onSubmit={handleSubmit} aria-busy={loading} noValidate>
        <div className="compact-auth-fields compact-signup-fields">
          <div className="gamified-field-group">
            <label className="gamified-field-label" htmlFor="register-name">Full Name<span className="required-mark" aria-hidden="true" /></label>
            <input type="text" id="register-name" name="fullName" autoComplete="name"
              className="gamified-input" required value={fullName} {...fieldError('fullName')}
              onChange={(event) => { setFullName(event.target.value); clearError(); }} onFocus={soundManager.playFocus}
              placeholder="Your name" disabled={loading} />
          </div>
          <div className="gamified-field-group">
            <label className="gamified-field-label" htmlFor="register-role">Role<span className="required-mark" aria-hidden="true" /></label>
            <select id="register-role" name="role" className="gamified-input auth-role-select"
              required value={role} {...fieldError('role')} onChange={(event) => { setRole(event.target.value); clearError(); }}
              onFocus={soundManager.playFocus} disabled={loading}>
              <option value="" disabled>Select your role</option>
              <option value="founder">Founder/Builder</option>
              <option value="investor">Investor</option>
              <option value="mentor">Mentor</option>
            </select>
          </div>
          <div className="gamified-field-group compact-signup-email">
            <label className="gamified-field-label" htmlFor="register-email">Email Address<span className="required-mark" aria-hidden="true" /></label>
            <input type="email" id="register-email" name="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
              className="gamified-input" required value={email} {...fieldError('email')}
              onChange={(event) => { setEmail(event.target.value); clearError(); }} onFocus={soundManager.playFocus}
              placeholder="you@example.com" disabled={loading} />
          </div>
          <div className="gamified-field-group">
            <label className="gamified-field-label" htmlFor="register-password">Password<span className="required-mark" aria-hidden="true" /></label>
            <div className="gamified-input-wrap">
              <input type={showPassword ? 'text' : 'password'} id="register-password" name="password"
                autoComplete="new-password" aria-invalid={error?.field === 'password'}
                aria-describedby={`password-requirements${error?.field === 'password' ? ' register-error' : ''}`}
                className="gamified-input" required minLength={9} maxLength={20} value={password}
                onChange={(event) => { setPassword(event.target.value); clearError(); }} onFocus={soundManager.playFocus}
                placeholder="Create a password" disabled={loading} />
              <button type="button" className="input-action-icon" disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="gamified-field-group">
            <label className="gamified-field-label" htmlFor="register-confirm-password">Confirm Password<span className="required-mark" aria-hidden="true" /></label>
            <div className="gamified-input-wrap">
              <input type={showConfirmPassword ? 'text' : 'password'} id="register-confirm-password"
                name="confirmPassword" autoComplete="new-password" className="gamified-input"
                required minLength={9} maxLength={20} value={confirmPassword} {...fieldError('confirmPassword')}
                onChange={(event) => { setConfirmPassword(event.target.value); clearError(); }} onFocus={soundManager.playFocus}
                placeholder="Re-enter your password" disabled={loading} />
              <button type="button" className="input-action-icon" disabled={loading}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <p className="auth-field-hint compact-password-hint" id="password-requirements">
            {password ? validatePassword(password) || 'Password requirements met' : '9–20 characters with uppercase, lowercase, a number, and a special character.'}
          </p>
        </div>
        <div className="compact-auth-actions">
          <label className="remember-terminal" htmlFor="register-remember-me">
            <input id="register-remember-me" name="rememberMe" type="checkbox"
              className="remember-terminal-input" checked={rememberMe} disabled={loading}
              onChange={(event) => { setRememberMe(event.target.checked); soundManager.playHover(); }} />
            <span className={`custom-checkbox ${rememberMe ? 'checked' : ''}`} aria-hidden="true">
              {rememberMe && <Check size={12} strokeWidth={3} />}
            </span>
            <span>Remember Me</span>
          </label>
          <button type="submit" className="btn-warp-create" disabled={loading} onMouseEnter={soundManager.playHover}>
            {loading ? <><Sparkles size={16} aria-hidden="true" /><span>Creating account…</span></>
              : <><span>Sign up</span><ArrowRight size={17} aria-hidden="true" /></>}
          </button>
        </div>
      </form>
      <p className="compact-demo-note">Next, verify your email with a six-digit code. Demo preview — no email is sent.</p>
    </AuthShell>
  );
};
