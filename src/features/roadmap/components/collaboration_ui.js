import { useEffect, useReducer, useRef, useState } from 'react';
import { ROADMAP_CHANGE_EVENT } from '../services/roadmap_collaboration.js';

export const collaborationDate = (value) => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
export const collaborationStatus = (item, kind = 'invitation') => item.statusLabel || ({ pending: kind === 'request' ? 'Pending Founder Review' : 'Pending Member Response', accepted: 'Member Joins Startup Team', resolved: 'Already a team member', declined: kind === 'request' ? 'Declined by Founder' : 'Declined by Member' })[item.status] || item.status;

export function useCollaborationRefresh() {
  const [, refresh] = useReducer((value) => value + 1, 0);
  useEffect(() => {
    for (const event of ['storage', 'focus', ROADMAP_CHANGE_EVENT]) window.addEventListener(event, refresh);
    return () => { for (const event of ['storage', 'focus', ROADMAP_CHANGE_EVENT]) window.removeEventListener(event, refresh); };
  }, []);
  return refresh;
}

// Local operations remain visible while processing. Unmounting an account or
// project form cancels operations that have not begun; stores recheck access.
export function useCollaborationAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const active = useRef(true);
  const running = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function run(action, message, onSuccess, onError) {
    if (running.current) return;
    running.current = true;
    setBusy(true); setError(''); setNotice('');
    await new Promise((resolve) => setTimeout(resolve, 160));
    if (!active.current) { running.current = false; return; }
    try {
      const result = await action();
      if (active.current) { setNotice(message); onSuccess?.(result); }
    } catch (err) {
      if (active.current) { setError(err.message || 'Unable to save. Please try again.'); onError?.(err); }
    } finally { running.current = false; if (active.current) setBusy(false); }
  }
  return { busy, error, notice, run, setError, setNotice };
}
