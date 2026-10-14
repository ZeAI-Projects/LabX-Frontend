import React, { useCallback, useState, useEffect } from 'react';
import { api } from '../services/api';
import { Navbar } from '../components/common/Navbar';
import { Bell, Check, CheckCheck } from 'lucide-react';

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      fetchNotifications();
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      fetchNotifications();
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  return (
    <div className="founder-world founder-world--notifications">
      <div className="founder-world__backdrop" aria-hidden="true" />
      <Navbar title="Notifications" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
          {unreadCount > 0 ? `${unreadCount} Unread Notifications` : 'All caught up!'}
        </div>

        {unreadCount > 0 && (
          <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={handleMarkAllRead}>
            <CheckCheck size={16} /> Mark All as Read
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', minHeight: '40vh' }}>
          <div className="spinner" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No notifications yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '680px' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              className="glass-card"
              style={{
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: n.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(99,102,241,0.08)',
                borderLeft: n.is_read ? '3px solid transparent' : '3px solid var(--primary)',
              }}
            >
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', marginTop: '2px' }}>
                  <Bell size={16} />
                </div>

                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#fff', marginBottom: '2px' }}>{n.title}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{n.message}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {!n.is_read && (
                <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => handleMarkRead(n.id)}>
                  <Check size={14} /> Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
