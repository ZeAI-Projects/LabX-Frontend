import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { soundManager } from '../components/gamified/soundEffects';
import { useAuthEffects } from '../components/gamified/useAuthEffects';
import { validatePassword } from '../validation/auth_validation.js';
import { PasswordRecoveryShell } from './ForgotPassword';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const { resetPassword } = useAuth();
  const { isMounted } = useAuthEffects();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || complete) return;
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(token, password);
      if (!isMounted()) return;
      setComplete(true);
      setPassword('');
      setConfirmPassword('');
      soundManager.playXpGain();
    } catch (error) {
      if (isMounted()) setError(error.message || 'This reset link is invalid. Please request another link.');
    } finally {
      if (isMounted()) setLoading(false);
    }
  };

  return (
    <PasswordRecoveryShell title="Reset Password" subtitle="Choose a new password for your LabX account.">
      {complete ? (
        <>
          <div className="auth-success-banner" role="status">
            <CheckCircle2 size={18} /><p>Your password has been reset. Log in with your new password.</p>
          </div>
          <Link className="btn-warp-create" to="/login">Login<ArrowRight size={18} /></Link>
        </>
      ) : !token ? (
        <>
          <div className="auth-error-banner" role="alert"><AlertCircle size={17} /><span>This reset link is missing or invalid.</span></div>
          <Link className="btn-warp-create" to="/forgot-password">Request a reset link<ArrowRight size={18} /></Link>
        </>
      ) : (
        <>
          {error && <div className="auth-error-banner" role="alert"><AlertCircle size={17} /><span>{error}</span></div>}
          <form onSubmit={handleSubmit} aria-busy={loading}>
            <div className="gamified-field-group">
              <label className="gamified-field-label" htmlFor="reset-password">New Password</label>
              <div className="gamified-input-wrap">
                <input
                  id="reset-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="gamified-input"
                  required
                  minLength={9}
                  maxLength={20}
                  aria-describedby="reset-password-requirements"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onFocus={soundManager.playFocus}
                  placeholder="Create a new password"
                />
                <button type="button" className="input-action-icon" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="auth-field-hint" id="reset-password-requirements">9–20 characters with uppercase, lowercase, a number, and a special character.</p>
            </div>
            <div className="gamified-field-group">
              <label className="gamified-field-label" htmlFor="reset-confirm-password">Confirm Password</label>
              <div className="gamified-input-wrap">
                <input
                  id="reset-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="gamified-input"
                  required
                  minLength={9}
                  maxLength={20}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  onFocus={soundManager.playFocus}
                  placeholder="Re-enter your new password"
                />
                <button type="button" className="input-action-icon" aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-warp-create" disabled={loading} onMouseEnter={soundManager.playHover}>
              <span>{loading ? 'Updating password...' : 'Reset Password'}</span><ArrowRight size={18} />
            </button>
          </form>
          <div className="form-footer-login"><Link className="login-link" to="/forgot-password">Request another reset link</Link></div>
        </>
      )}
    </PasswordRecoveryShell>
  );
}
