import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Map, Trophy, Menu, X, Users, Calendar, Award, User, Bell, LogOut, ShieldCheck, CheckSquare, Megaphone } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import './MobileNavigation.css';

const founderLinks = [
  ['/dashboard', 'Home', Home], ['/roadmap', 'Roadmap', Map], ['/leaderboard', 'Rankings', Trophy],
  ['/guild', 'Guilds', Users], ['/social', 'Community', Users], ['/events', 'Events', Calendar],
  ['/achievements', 'Achievements', Award], ['/profile', 'Profile', User], ['/notifications', 'Notifications', Bell],
];
const adminLinks = [
  ['/admin', 'Overview', Home], ['/admin/verification', 'Reviews', ShieldCheck], ['/admin/quests', 'Quests', CheckSquare],
  ['/admin/roadmap', 'Roadmap', Map], ['/admin/founders', 'Founders', Users], ['/admin/events', 'Announcements', Megaphone],
];

export const MobileNavigation = () => {
  const { isAdmin, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dialog = useRef(null);
  const [open, setOpen] = useState(false);
  const links = isAdmin ? adminLinks : founderLinks;
  const primary = links.slice(0, 3);
  const moreActive = !primary.some(([path]) => pathname === path || (path !== '/admin' && pathname.startsWith(`${path}/`)));
  const close = () => dialog.current?.close();

  useEffect(() => { dialog.current?.close(); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflowY;
    document.body.style.overflowY = 'hidden';
    return () => { document.body.style.overflowY = previous; };
  }, [open]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 901px)');
    const handleResize = () => { if (desktop.matches) dialog.current?.close(); };
    desktop.addEventListener('change', handleResize);
    return () => desktop.removeEventListener('change', handleResize);
  }, []);

  return (
    <>
      <nav className="mobile-navigation" aria-label="Main navigation">
        {primary.map(([path, label, Icon]) => (
          <NavLink key={path} to={path} end={path === '/admin'}><Icon size={20} /><span>{label}</span></NavLink>
        ))}
        <button type="button" className={moreActive || open ? 'active' : ''} aria-label="More navigation" aria-haspopup="dialog" aria-expanded={open} aria-controls="mobile-menu" onClick={() => { dialog.current.showModal(); setOpen(true); }}>
          <Menu size={20} /><span>More</span>
        </button>
      </nav>
      <dialog id="mobile-menu" className="mobile-menu" ref={dialog} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) close(); }} aria-labelledby="mobile-menu-title">
        <div className="mobile-menu__surface">
          <div className="mobile-menu__handle" aria-hidden="true" />
          <header><div><span>LABX</span><h2 id="mobile-menu-title">{isAdmin ? 'Admin workspace' : 'Your workspace'}</h2></div><button type="button" autoFocus aria-label="Close navigation" onClick={close}><X size={20} /></button></header>
          <nav aria-label="All pages" className="mobile-menu__links">
            {links.map(([path, label, Icon]) => <NavLink key={path} to={path} end={path === '/admin'} onClick={close}><Icon size={19} /><span>{label}</span></NavLink>)}
          </nav>
          <button type="button" className="mobile-menu__logout" onClick={() => { close(); logout(); navigate('/login'); }}><LogOut size={18} />Log out</button>
        </div>
      </dialog>
    </>
  );
};
