import React from 'react';
import './labxshell.css';
import { useAuth } from '../../contexts/useAuth';
import { Bell, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FloatingXp } from './FloatingXp';

export const Navbar = ({ title }) => {
  const { user, isFounder, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="labx-navbar">

      {/* TITLE */}
      <div className="labx-navbar-title">
        <div className="labx-title-line" />

        <div>
          <h1>{title}</h1>

          {isFounder && (
            <span className="labx-subtitle">
              FOUNDER COMMAND CENTER
            </span>
          )}

          {isAdmin && (
            <span className="labx-subtitle">
              ADMIN COMMAND CENTER
            </span>
          )}
        </div>
      </div>

      {/* ACTIONS */}
      <div className="labx-navbar-actions">

        {/* LABX COINS */}
        {isFounder && (
          <FloatingXp points={user?.total_points || 0} />
        )}

        {/* ADMIN */}
        {isAdmin && (
          <span className="badge badge-amber labx-admin-badge">
            <Shield size={14} />
            Admin Privileges
          </span>
        )}

        {/* NOTIFICATIONS */}
        {isFounder && (
          <button
            className="labx-notification-btn"
            onClick={() => navigate('/notifications')}
            aria-label="Notifications"
          >
            <Bell size={18} color="var(--accent-cyan)" />
          </button>
        )}

      </div>

    </header>
  );
};
