import {useEffect, useRef} from 'react';

// Keep the reference modal markup while providing keyboard focus and dismissal.
export function usePreviewDialog(open, onClose) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => {closeRef.current = onClose;}, [onClose]);
  useEffect(() => {
    if (!open || !ref.current) return;
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controls = () => [...dialog.querySelectorAll('button,input,textarea,select,a[href],[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
    controls()[0]?.focus();
    function onKey(event) {
      if (event.key === 'Escape') {event.preventDefault(); closeRef.current();}
      if (event.key !== 'Tab') return;
      const items = controls();
      if (!items.length) return;
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {event.preventDefault();last.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first.focus();}
    }
    document.addEventListener('keydown', onKey);
    return () => {document.removeEventListener('keydown', onKey);document.body.style.overflow = previousOverflow;previousFocus?.focus();};
  }, [open]);
  return ref;
}
