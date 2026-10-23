import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { sessionStore } from '../../../services/storage/local_storage.js';
import { soundManager } from '../components/gamified/soundEffects';
import { useAuthEffects } from '../components/gamified/useAuthEffects';
import { validatePassword } from '../validation/auth_validation.js';
import { PasswordRecoveryShell } from './ForgotPassword';
import { VerificationCodeInput } from '../components/VerificationCodeInput.jsx';

const RECOVERY_KEY = 'labx_password_recovery';

function isRecoveryContext(value) {
  return typeof value?.email === 'string'
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)
    && /^\d{6}$/.test(value.demoCode);
}

function matchesRecovery(saved, recovery) {
  return saved?.email === recovery.email
    && saved?.demoCode === recovery.demoCode
    && saved?.expiresAt === recovery.expiresAt;
}

export function ResetPassword() {
  const navigate = useNavigate();
  const [recovery, setRecovery] = useState(() => {
    const saved = sessionStore.readJSON(RECOVERY_KEY);
    return isRecoveryContext(saved) ? saved : null;
  });
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const codeInput = useRef(null);
  const passwordInput = useRef(null);
  const confirmInput = useRef(null);
  const pending = useRef(false);
  const { requestPasswordReset, resetPassword } = useAuth();
  const { isMounted } = useAuthEffects();
  const busy = loading || resending;

  useEffect(() => {
    if (error?.field === 'password') passwordInput.current?.focus();
    else if (error?.field === 'confirmPassword') confirmInput.current?.focus();
    else if (error?.field === 'code' || resendMessage) codeInput.current?.focus();
  }, [error, resendMessage]);

  const reportError = (message, field, input) => {
    setError({ message, field });
    input?.current?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pending.current || !recovery) return;
    if (!/^\d{6}$/.test(code)) {
      reportError(code ? 'Enter a valid six-digit code.' : 'Please enter the six-digit code.', 'code', codeInput);
      return;
    }
    const passwordError = password ? validatePassword(password) : 'New password is required.';
    if (passwordError) {
      reportError(passwordError, 'password', passwordInput);
      return;
    }
    if (!confirmPassword || password !== confirmPassword) {
      reportError(confirmPassword ? 'Passwords do not match.' : 'Please re-enter your new password.', 'confirmPassword', confirmInput);
      return;
    }
    pending.current = true;
    setLoading(true);
    setError(null);
    setResendMessage('');
    try {
      await resetPassword(recovery.email, code, password);
      if (matchesRecovery(sessionStore.readJSON(RECOVERY_KEY), recovery)) {
        sessionStore.removeItem(RECOVERY_KEY);
      }
      if (!isMounted()) return;
      soundManager.playXpGain();
      navigate('/login', { replace: true, state: { passwordReset: true, email: recovery.email } });
    } catch (resetError) {
      if (isMounted()) {
        reportError(resetError.message || 'We couldn’t reset your password. Please try again.', 'code', codeInput);
      }
    } finally {
      pending.current = false;
      if (isMounted()) setLoading(false);
    }
  };

  const handleResend = async () => {
    if (pending.current || !recovery) return;
    pending.current = true;
    setResending(true);
    setError(null);
    setResendMessage('');
    try {
      const nextRecovery = await requestPasswordReset(recovery.email);
      if (matchesRecovery(sessionStore.readJSON(RECOVERY_KEY), recovery)) {
        sessionStore.writeJSON(RECOVERY_KEY, nextRecovery);
      }
      if (!isMounted()) return;
      setRecovery(nextRecovery);
      setCode('');
      setResendMessage('A new verification code is ready. Your previous code no longer works.');
      soundManager.playXpGain();
    } catch (resendError) {
      if (isMounted()) setError({ message: resendError.message || 'We couldn’t send the verification code. Please try again.' });
    } finally {
      pending.current = false;
      if (isMounted()) {
        setResending(false);
      }
    }
  };

  return (
    <PasswordRecoveryShell title="Reset your password" subtitle="Enter your 6-digit verification code, then choose a new password." step={2}>
      {!recovery ? (
        <>
          <div className="auth-error-banner" role="alert"><AlertCircle size={17} /><span>Enter your registered email first to request a six-digit code.</span></div>
          <Link className="btn-warp-create" to="/forgot-password">Request a new code<ArrowRight size={18} aria-hidden="true" /></Link>
          <div className="form-footer-login"><Link className="login-link" to="/login">Back to sign in</Link></div>
        </>
      ) : (
        <>
          <div className="recovery-account">
            <Mail size={17} aria-hidden="true" />
            <span>{recovery.email}</span>
            <Link className="login-link" to="/forgot-password" onClick={() => sessionStore.removeItem(RECOVERY_KEY)}>Change email</Link>
          </div>
          <div className="auth-demo-notice recovery-demo-notice">
            <output className="recovery-demo-code" data-testid="demo-reset-code" aria-label="Verification code">{recovery.demoCode}</output>
          </div>
          {error && <div id="reset-error" className="auth-error-banner" role="alert"><AlertCircle size={17} /><span>{error.message}</span></div>}
          {resendMessage && <p className="recovery-status" role="status">{resendMessage}</p>}
          <form onSubmit={handleSubmit} aria-busy={busy} noValidate>
            <div className="gamified-field-group">
              <label className="gamified-field-label" id="reset-code-label" htmlFor="reset-code-0">Enter your 6-digit verification code<span className="required-mark" aria-hidden="true" /></label>
              <VerificationCodeInput ref={codeInput} labelId="reset-code-label" value={code} disabled={busy} invalid={error?.field === 'code'} describedBy={`recovery-code-hint${error?.field === 'code' ? ' reset-error' : ''}`} onChange={value => { setCode(value); if (error?.field === 'code') setError(null); }} onFocus={soundManager.playFocus}/>
              <div className="recovery-code-help">
                <p className="auth-field-hint" id="recovery-code-hint">Codes expire after 10 minutes. Use your latest code.</p>
                <button type="button" className="login-link recovery-resend" disabled={busy} onClick={handleResend}>
                  <RefreshCw size={13} aria-hidden="true" />{resending ? 'Sending code…' : 'Resend code'}
                </button>
              </div>
            </div>
            <div className="gamified-field-group">
              <label className="gamified-field-label" htmlFor="reset-password">Enter New Password<span className="required-mark" aria-hidden="true" /></label>
              <div className="gamified-input-wrap">
                <input
                  ref={passwordInput}
                  id="reset-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="gamified-input"
                  required
                  minLength={9}
                  maxLength={20}
                  disabled={busy}
                  aria-invalid={error?.field === 'password'}
                  aria-describedby={`reset-password-requirements${error?.field === 'password' ? ' reset-error' : ''}`}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error?.field === 'password') setError(null);
                  }}
                  onFocus={soundManager.playFocus}
                  placeholder="Enter your new password"
                />
                <button type="button" className="input-action-icon" disabled={busy} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="auth-field-hint" id="reset-password-requirements">{password ? validatePassword(password) || 'Password requirements met' : '9–20 characters with uppercase, lowercase, a number, and a special character.'}</p>
            </div>
            <div className="gamified-field-group">
              <label className="gamified-field-label" htmlFor="reset-confirm-password">Re-enter New Password<span className="required-mark" aria-hidden="true" /></label>
              <div className="gamified-input-wrap">
                <input
                  ref={confirmInput}
                  id="reset-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="gamified-input"
                  required
                  minLength={9}
                  maxLength={20}
                  disabled={busy}
                  aria-invalid={error?.field === 'confirmPassword'}
                  aria-describedby={error?.field === 'confirmPassword' ? 'reset-error' : undefined}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    if (error?.field === 'confirmPassword') setError(null);
                  }}
                  onFocus={soundManager.playFocus}
                  placeholder="Re-enter your new password"
                />
                <button type="button" className="input-action-icon" disabled={busy} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-warp-create" disabled={busy} onMouseEnter={soundManager.playHover}>
              <span>{loading ? 'Resetting password…' : 'Reset New Password'}</span><ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>
          <div className="form-footer-login">
            <p>Need to change your details?</p>
            <Link className="login-link recovery-back-link" to="/login"><ArrowLeft size={15} aria-hidden="true" />Back to sign in</Link>
          </div>
        </>
      )}
    </PasswordRecoveryShell>
  );
}
