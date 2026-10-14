import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';

import {
  Home,
  Map,
  Users,
  Calendar,
  Trophy,
  Award,
  User,
  LogOut,
  ShieldCheck,
  CheckSquare,
  Megaphone,
  Bot,
  LayoutDashboard,
} from 'lucide-react';
import { soundManager } from '../auth/gamified/soundEffects';
import labxLogo from '../../assets/labx-logo.png';
import './labxshell.css';
import { MobileNavigation } from './MobileNavigation';

export const Sidebar = () => {
  const { user, isFounder, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.full_name || user?.name || user?.username || 'Founder';
  const displayHandle = user?.username ? `@${user.username}` : user?.email ? `@${user.email.split('@')[0]}` : (isAdmin ? 'Administrator' : 'Founder');
  
  const initials = (displayName.charAt(0) || user?.email?.charAt(0) || 'F').toUpperCase();
  const deckName = isAdmin ? 'ADMIN COMMAND' : 'FOUNDER COMMAND';

  return (
    <>
    <aside className="labx-sidebar">

      {/* Brand */}
      <div className="labx-brand">
        <img className="labx-brand-logo" src={labxLogo} alt="LabX by ZeAI" />
      </div>

      <div className="labx-deck-status">
        <div className="labx-deck-status__name">
          <span aria-hidden="true" />
          {deckName}
        </div>
      </div>

      {/* Navigation */}
      <nav className="labx-sidebar-nav" aria-label={`${deckName} navigation`}>

        {isFounder && (
          <>
            <SidebarItem
              to="/dashboard"
              icon={<Home size={18} />}
              label="Dashboard"
            />

            <SidebarItem
              to="/roadmap"
              icon={<Map size={18} />}
              label="Roadmap"
            />

            <SidebarItem
              to="/leaderboard"
              icon={<Trophy size={18} />}
              label="Leaderboard"
            />

            <SidebarItem
              to="/guild"
              icon={<Bot size={18} />}
              label="Guilds"
            />

            <SidebarItem
              to="/social"
              icon={<Users size={18} />}
              label="Social"
            />

            <SidebarItem
              to="/events"
              icon={<Calendar size={18} />}
              label="Events"
            />

            <SidebarItem
              to="/achievements"
              icon={<Award size={18} />}
              label="Achievements"
            />

            <SidebarItem
              to="/profile"
              icon={<User size={18} />}
              label="Profile"
            />
          </>
        )}

        {isAdmin && (
          <>
            <div className="labx-nav-section-label">
              ADMIN CONTROLS
            </div>

            <SidebarItem
              to="/admin"
              icon={<LayoutDashboard size={18} />}
              label="Admin Dashboard"
            />

            <SidebarItem
              to="/admin/verification"
              icon={<ShieldCheck size={18} />}
              label="Quest Verification"
            />

            <SidebarItem
              to="/admin/quests"
              icon={<CheckSquare size={18} />}
              label="Quest Management"
            />

            <SidebarItem
              to="/admin/roadmap"
              icon={<Map size={18} />}
              label="Roadmap Config"
            />

            <SidebarItem
              to="/admin/founders"
              icon={<Users size={18} />}
              label="Founders Directory"
            />

            <SidebarItem
              to="/admin/events"
              icon={<Megaphone size={18} />}
              label="Events & Announcements"
            />
          </>
        )}

      </nav>

      {/* User Profile Footer */}
      <div className="labx-sidebar-footer">

        <div
          className="labx-user-card"
          onClick={() => {
            soundManager.playHover();
            navigate('/profile');
          }}
          style={{ cursor: 'pointer' }}
          title="View profile"
        >

          <div className="labx-user-avatar">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={displayName}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              initials
            )}
          </div>

          <div className="labx-user-info" style={{ overflow: 'hidden' }}>
            <div className="labx-user-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </div>

            <div className="labx-user-role" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#22d3ee' }}>
              {displayHandle}
            </div>
          </div>

          <button
            className="labx-logout-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleLogout();
            }}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={17} />
          </button>

        </div>

      </div>
    </aside>
    <MobileNavigation />
    </>
  );
};

const SidebarItem = ({ to, icon, label }) => {
  return (
    <NavLink
      to={to}
      onMouseEnter={soundManager.playHover}
      className={({ isActive }) =>
        `labx-nav-item ${isActive ? 'active' : ''}`
      }
    >
      <span className="labx-nav-icon">
        {icon}
      </span>

      <span className="labx-nav-label">
        {label}
      </span>
    </NavLink>
  );
};
