import { forwardRef, useImperativeHandle, useRef } from 'react';

export const VerificationCodeInput = forwardRef(function VerificationCodeInput({ value, onChange, disabled, invalid, describedBy, labelId, idPrefix = 'reset-code', onFocus }, ref) {
  const inputs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, index) => /\d/.test(value[index] || '') ? value[index] : '');
  const focus = (index) => { const input = inputs.current[Math.max(0, Math.min(5, index))]; input?.focus(); input?.select(); };
  useImperativeHandle(ref, () => ({ focus: () => focus(Math.max(0, digits.findIndex(digit => !digit))) }));
  const update = (index, incoming) => {
    const cleaned = incoming.replace(/\D/g, '').slice(0, 6);
    const start = cleaned.length === 6 ? 0 : index;
    const next = [...digits];
    if (!cleaned) next[index] = '';
    else [...cleaned].forEach((digit, offset) => { if (start + offset < 6) next[start + offset] = digit; });
    onChange(next.map(digit => digit || ' ').join('').trimEnd());
    if (cleaned) focus(Math.min(5, start + cleaned.length));
  };
  return <div className="verification-digits" role="group" aria-labelledby={labelId} aria-describedby={describedBy}>
    {digits.map((digit, index) => <input key={index} ref={element => { inputs.current[index] = element; }} id={`${idPrefix}-${index}`} name={`verification-digit-${index + 1}`} type="text" inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} aria-label={`Digit ${index + 1} of 6`} aria-invalid={invalid || undefined} aria-describedby={describedBy} className={`verification-digit${digit ? ' is-filled' : ''}`} value={digit} maxLength={6} pattern="[0-9]" required disabled={disabled} placeholder="–" onChange={event => update(index, event.target.value)} onFocus={event => { event.target.select(); onFocus?.(); }} onPaste={event => { const pasted = event.clipboardData.getData('text'); if (/\d/.test(pasted)) { event.preventDefault(); update(index, pasted); } }} onKeyDown={event => {
      if (event.key === 'Backspace') { event.preventDefault(); const next = [...digits]; const target = digit || index === 0 ? index : index - 1; next[target] = ''; onChange(next.map(item => item || ' ').join('').trimEnd()); focus(target); }
      else if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); focus(event.key === 'Home' ? 0 : event.key === 'End' ? 5 : index + (event.key === 'ArrowLeft' ? -1 : 1)); }
    }} />)}
  </div>;
});
