import React, { useCallback, useState, useEffect } from 'react';
import { api } from '../services/api';
import { Navbar } from '../components/common/Navbar';
import { Plus, Trash2 } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';

export const AdminEventsPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('event'); // 'event' | 'announcement'
  const [eventDate, setEventDate] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [location, setLocation] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEscapeKey(showCreateModal, () => setShowCreateModal(false));

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminAnnouncements();
      setAnnouncements(res.data || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      await api.createAnnouncement({
        title,
        description,
        type,
        event_date: eventDate || null,
        speaker,
        location,
        external_url: externalUrl,
        status: 'published',
      });
      setShowCreateModal(false);
      resetForm();
      fetchAnnouncements();
    } catch (err) {
      alert(err.message || 'Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event/announcement?')) return;
    try {
      await api.deleteAnnouncement(id);
      fetchAnnouncements();
    } catch (err) {
      alert(err.message || 'Delete failed');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEventDate('');
    setSpeaker('');
    setLocation('');
    setExternalUrl('');
  };

  return (
    <div>
      <Navbar title="Events & Announcements Console" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
          Create showcase events or announcements for founders (Showcase view only, no registration system)
        </div>

        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} /> Post New Update
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', minHeight: '40vh' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                <th style={{ padding: '16px' }}>Title</th>
                <th style={{ padding: '16px' }}>Type</th>
                <th style={{ padding: '16px' }}>Date</th>
                <th style={{ padding: '16px' }}>Speaker</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px', fontWeight: '700', color: '#fff' }}>{a.title}</td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge ${a.type === 'event' ? 'badge-cyan' : 'badge-primary'}`}>
                      {a.type.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                    {a.event_date ? new Date(a.event_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{a.speaker || 'N/A'}</td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button onClick={() => handleDelete(a.id)} style={{ color: 'var(--accent-red)', padding: '6px' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div role="dialog" aria-modal="true" aria-label="Create event or announcement" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '540px', padding: '32px', position: 'relative' }}>
            <button aria-label="Close event form" onClick={() => setShowCreateModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', color: 'var(--text-muted)' }}>✕</button>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginBottom: '20px' }}>
              Publish Event / Announcement
            </h2>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="event">Showcase Event</option>
                  <option value="announcement">Platform Announcement</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="LABX Demo Day 2026"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details about the event or announcement..."
                />
              </div>

              {type === 'event' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Event Date & Time</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Speaker Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={speaker}
                      onChange={(e) => setSpeaker(e.target.value)}
                      placeholder="Dr. Ananya Roy"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Location / Online Link</label>
                    <input
                      type="text"
                      className="form-input"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Virtual / Main Auditorium"
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">External Web Link (Optional)</label>
                <input
                  type="url"
                  className="form-input"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '12px' }} disabled={saving}>
                {saving ? 'Publishing...' : 'Publish Update'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
