import { useEffect, useState } from 'react';
import { Award, Check, Compass, Flag, Mountain, Route, Trophy, X, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/use_auth.js';
import { ACHIEVEMENTS_CHANGE_EVENT, getAchievementsSnapshot } from '../../features/achievements/services/mock_achievements.js';
import { Medal } from './Medal.jsx';

const icons = { flag: Flag, compass: Compass, mountain: Mountain, route: Route, zap: Zap, trophy: Trophy };
export function ProgressCelebration() {
  const { user } = useAuth();
  const [celebration, setCelebration] = useState(null);
  useEffect(() => {
    if (user?.role !== 'founder') return;
    let previous = getAchievementsSnapshot(user);
    let timer;
    let pending;
    const clear = () => { setCelebration(null); document.documentElement.removeAttribute('data-labx-progress'); };
    const reveal = () => {
      if (!pending || document.querySelector('dialog[open]')) return;
      setCelebration(pending); pending = null;
      document.documentElement.setAttribute('data-labx-progress', 'celebrating');
      clearTimeout(timer); timer = setTimeout(clear, 6500);
    };
    const update = () => {
      const next = getAchievementsSnapshot(user);
      const badge = next.badges.find(item => item.isEarned && !previous.badges.some(old => old.id === item.id && old.isEarned));
      if (badge || next.completedQuests > previous.completedQuests) {
        pending = { badge, title: badge ? 'Badge unlocked' : 'Checkpoint completed', description: badge?.name || 'Your approved work is saved to your journey.' };
        reveal();
      }
      previous = next;
    };
    window.addEventListener(ACHIEVEMENTS_CHANGE_EVENT, update);
    const observer = new MutationObserver(reveal);
    observer.observe(document.body, { attributes:true,attributeFilter:['open'],childList:true,subtree:true });
    return () => { observer.disconnect(); window.removeEventListener(ACHIEVEMENTS_CHANGE_EVENT, update); clearTimeout(timer); document.documentElement.removeAttribute('data-labx-progress'); };
  }, [user]);
  if (!celebration) return null;
  return <aside className="progress-celebration" role="status" aria-live="polite"><span className="celebration-confetti" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--particle': i }}/>)}</span>{celebration.badge ? <Medal icon={icons[celebration.badge.icon] || Award} size={54} tone={celebration.badge.metric === 'milestones' ? 'gold' : 'mint'}/> : <span className="celebration-check"><Check size={24}/></span>}<div><span>{celebration.title}</span><strong>{celebration.description}</strong>{celebration.badge && <Link to={`/achievements?badge=${celebration.badge.id}`}>View your badge</Link>}</div><button type="button" aria-label="Dismiss celebration" onClick={() => { setCelebration(null); document.documentElement.removeAttribute('data-labx-progress'); }}><X size={17}/></button></aside>;
}
