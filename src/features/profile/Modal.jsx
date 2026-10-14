import {useEffect, useRef} from 'react';
import {X} from 'lucide-react';

export function Modal({title, onClose, children}) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {dialog.close(); document.body.style.overflow = overflow; previous?.focus();};
  }, []);
  return <dialog ref={ref} className="profile-modal glass-card" aria-labelledby="profile-dialog-title" onCancel={onClose} onClick={e => {if (e.target === e.currentTarget) onClose();}}>
    <header className="profile-section-heading"><h3 id="profile-dialog-title">{title}</h3><button className="btn btn-secondary" aria-label="Close dialog" onClick={onClose}><X size={18}/></button></header>
    {children}
  </dialog>;
}
