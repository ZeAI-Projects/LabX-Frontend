import React, { useEffect, useState } from 'react';
import './FloatingXp.css';

export const FloatingXp = ({ points = 0 }) => {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const value = points.toLocaleString();
  const [decoded, setDecoded] = useState(value);
  const [decodedLabel, setDecodedLabel] = useState('LabX Coins');
  const [decodedUnit, setDecodedUnit] = useState('Coins');
  const visible = open || hovered || focused;

  useEffect(() => {
    if (!visible || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDecoded(value);
      setDecodedLabel('LabX Coins');
      setDecodedUnit('Coins');
      return;
    }
    const symbols = '0123456789ABCDEF#%';
    const started = performance.now();
    const scramble = () => {
      const progress = Math.min(1, Math.max(0, (performance.now() - started - 300) / 1100));
      const decode = text => [...text].map((char, index) =>
        index < Math.floor(progress * text.length) || !/[a-z0-9]/i.test(char)
          ? char : symbols[Math.floor(Math.random() * symbols.length)]
      ).join('');
      setDecoded(decode(value));
      setDecodedLabel(decode('LabX Coins'));
      setDecodedUnit(decode('Coins'));
      return progress === 1;
    };
    scramble();
    const timer = window.setInterval(() => {
      if (scramble()) window.clearInterval(timer);
    }, 45);
    return () => window.clearInterval(timer);
  }, [visible, value]);

  return (
  <button type="button" className={`floating-xp ${visible ? 'floating-xp--open' : ''}`}
    style={{ '--xp-readout-width': `${Math.max(130, value.length * 15 + 64)}px` }}
    aria-label={`${points.toLocaleString()} LabX Coins`}
    onPointerEnter={event => { if (event.pointerType !== 'touch') setHovered(true); }}
    onPointerLeave={() => setHovered(false)}
    onFocus={event => setFocused(event.currentTarget.matches(':focus-visible'))}
    onClick={() => setOpen(value => !value)} onBlur={() => { setOpen(false); setFocused(false); }}
    onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); setHovered(false); setFocused(false); event.currentTarget.blur(); } }}>
    <span className="floating-xp__projector" aria-hidden="true">
      <span className="floating-xp__beam" />
      <span className="floating-xp__levitation">
        <span className="floating-xp__orbit" />
        <span className="floating-xp__air floating-xp__air--one" />
        <span className="floating-xp__air floating-xp__air--two" />
        <span className="floating-xp__coin">
          <span className="floating-xp__face floating-xp__face--front"><span className="floating-xp__engraving" /><i /><span className="floating-xp__glint" /></span>
          <span className="floating-xp__face floating-xp__face--back"><span className="floating-xp__engraving" /><i /><span className="floating-xp__glint" /></span>
        </span>
      </span>
      <span className="floating-xp__base" />
    </span>
    <span className="floating-xp__readout" aria-hidden="true">
      <span className="floating-xp__label">{decodedLabel}</span>
      <span className="floating-xp__amount"><strong style={{ minWidth: `${value.length}ch` }}>{decoded}</strong><span>{decodedUnit}</span></span>
    </span>
  </button>
);
};
