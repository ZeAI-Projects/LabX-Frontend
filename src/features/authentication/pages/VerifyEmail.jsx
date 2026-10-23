import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { sessionStore } from '../../../services/storage/local_storage.js';
import { getRegistrationDestination } from '../../../utils/onboarding.js';
import { AuthShell } from '../components/AuthShell';
import { VerificationCodeInput } from '../components/VerificationCodeInput.jsx';
import { soundManager } from '../components/gamified/soundEffects';
import { useAuthEffects } from '../components/gamified/useAuthEffects';

const VERIFICATION_KEY = 'labx_signup_verification';

function matchesVerification(left, right) {
  return Boolean(left && right
    && left.email === right.email
    && left.demoCode === right.demoCode
    && left.expiresAt === right.expiresAt);
}

export function VerifyEmail() {
  const [verification, setVerification] = useState(() => {
    const saved = sessionStore.readJSON(VERIFICATION_KEY);
    return typeof saved?.email === 'string' && /^\d{6}$/.test(saved.demoCode) ? saved : null;
  });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const codeInput = useRef(null);
  const pending = useRef(false);
  const navigate = useNavigate();
  const { verifyRegistration, resendRegistration } = useAuth();
  const { isMounted } = useAuthEffects();
  const busy = loading || resending;

  useEffect(() => {
    if (error || status) codeInput.current?.focus();
  }, [error, status]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pending.current || !verification) return;
    if (!/^\d{6}$/.test(code)) {
      setError(code ? 'Enter a valid six-digit code.' : 'Please enter the six-digit code.');
      return;
    }
    pending.current = true;
    setLoading(true);
    setError('');
    setStatus('');
    try {
      const { user } = await verifyRegistration(verification.email, code);
      if (matchesVerification(sessionStore.readJSON(VERIFICATION_KEY), verification)) {
        sessionStore.removeItem(VERIFICATION_KEY);
      }
      if (!isMounted()) return;
      soundManager.playXpGain();
      navigate(getRegistrationDestination(user), { replace: true });
    } catch (verificationError) {
      if (isMounted()) setError(verificationError.message || 'This verification code is invalid. Please try again.');
    } finally {
      pending.current = false;
      if (isMounted()) setLoading(false);
    }
  };

  const handleResend = async () => {
    if (pending.current || !verification) return;
    pending.current = true;
    setResending(true);
    setError('');
    setStatus('');
    try {
      const nextVerification = await resendRegistration(verification.email);
      if (matchesVerification(sessionStore.readJSON(VERIFICATION_KEY), verification)) {
        sessionStore.writeJSON(VERIFICATION_KEY, nextVerification);
      }
      if (!isMounted()) return;
      setVerification(nextVerification);
      setCode('');
      setStatus('A new verification code is ready. Your previous code no longer works.');
      soundManager.playXpGain();
    } catch (resendError) {
      if (isMounted()) setError(resendError.message || 'We couldn’t send the verification code. Please try again.');
    } finally {
      pending.current = false;
      if (isMounted()) setResending(false);
    }
  };

  return (
    <AuthShell mode="verify" title="Enter OTP" subtitle="One more step to start your LabX journey." busy={busy}>
      {!verification ? (
        <>
          <div className="auth-error-banner" role="alert"><AlertCircle size={16} aria-hidden="true" /><span>Enter your sign-up details first to request a verification code.</span></div>
          <Link className="btn-warp-create" to="/register">Back to sign up<ArrowRight size={17} aria-hidden="true" /></Link>
        </>
      ) : (
        <>
          <div className="verification-account"><Mail size={17} aria-hidden="true" /><span>{verification.email}</span></div>
          <div className="auth-demo-notice verification-demo-notice">
            <output className="verification-demo-code" data-testid="demo-signup-code" aria-label="Verification code">{verification.demoCode}</output>
          </div>
          {error && <div id="verify-email-error" className="auth-error-banner" role="alert"><AlertCircle size={16} aria-hidden="true" /><span>{error}</span></div>}
          {status && <p className="verification-status" role="status">{status}</p>}
          <form onSubmit={handleSubmit} aria-busy={busy} noValidate>
            <div className="gamified-field-group">
              <label className="gamified-field-label" id="signup-code-label" htmlFor="signup-code-0">Enter your 6-digit verification code<span className="required-mark" aria-hidden="true" /></label>
              <VerificationCodeInput ref={codeInput} idPrefix="signup-code" labelId="signup-code-label"
                value={code} disabled={busy} invalid={Boolean(error)}
                describedBy={`verification-hint${error ? ' verify-email-error' : ''}`}
                onChange={(value) => { setCode(value); setError(''); }} onFocus={soundManager.playFocus} />
              <p className="verification-hint" id="verification-hint">Codes expire after 10 minutes. Use your latest code.</p>
            </div>
            <div className="compact-auth-actions">
              <button type="button" className="login-link verification-resend" disabled={busy} onClick={handleResend}>
                <RefreshCw size={14} aria-hidden="true" />{resending ? 'Sending code…' : 'Resend code'}
              </button>
              <button type="submit" className="btn-warp-create" disabled={busy} onMouseEnter={soundManager.playHover}>
                <span>{loading ? 'Verifying…' : 'Verify email'}</span><ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </form>
          <p className="verification-footer">
            Need to change your details?
            <Link className="login-link" to="/register" onClick={() => sessionStore.removeItem(VERIFICATION_KEY)}>Back to sign up</Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
