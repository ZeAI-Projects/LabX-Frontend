import { useState } from 'react';
import {
  LayoutDashboard, Map, Trophy, Users, MessageSquare, Calendar as CalendarDays,
  Award, User as UserRound, Bell, Menu, ExternalLink as ArrowUpRight, Shield as Hexagon,
} from 'lucide-react';

const navigation = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: Map, label: 'Roadmap' },
  { icon: Trophy, label: 'Leaderboard' },
  { icon: Users, label: 'Guilds' },
  { icon: MessageSquare, label: 'Social' },
  { icon: CalendarDays, label: 'Events' },
  { icon: Award, label: 'Achievements' },
  { icon: UserRound, label: 'Profile', active: true },
];

export default function AppShell({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="labx-shell">
      {mobileOpen && <button className="labx-shell__shade" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`labx-shell__sidebar ${mobileOpen ? 'is-open' : ''}`} aria-label="Prototype navigation">
        <div className="labx-shell__logo" aria-label="LabX by ZeAI">
          <span>Lab<span className="labx-shell__logo-x">X</span></span>
          <small>by ZeAI</small>
        </div>
        <div className="labx-shell__command"><i /> FOUNDER COMMAND</div>
        <nav className="labx-shell__nav" aria-label="Navigation preview">
          {navigation.map(({ icon: Icon, label, active }) => (
            <div className={`labx-shell__nav-item ${active ? 'is-active' : ''}`} key={label} aria-current={active ? 'page' : undefined}>
              <span className="labx-shell__nav-icon"><Icon size={18}/></span><span>{label}</span>
              {active && <i className="labx-shell__nav-dot"/>}
            </div>
          ))}
        </nav>
        <div className="labx-shell__sidebar-footer"><span className="labx-shell__footer-avatar">D</span><span><strong>LabX Prototype</strong><small>Design preview</small></span><ArrowUpRight size={15}/></div>
      </aside>
      <div className="labx-shell__main">
        <header className="labx-shell__topbar">
          <div className="labx-shell__top-title">
            <button className="labx-shell__menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20}/></button>
            <div><h1>Profile</h1><span>FOUNDER COMMAND CENTER</span></div>
          </div>
          <div className="labx-shell__top-actions">
            <span className="labx-shell__workspace"><i/> LABX WORKSPACE</span>
            <Bell size={19} aria-hidden="true" />
            <div className="labx-shell__top-avatar" title="Profile prototype"><Hexagon size={21}/></div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
