import React, { useCallback, useState, useEffect } from 'react';
import { api } from '../services/api';
import { Navbar } from '../components/common/Navbar';
import { Calendar, MapPin, ExternalLink, Clock, User, Megaphone, Radio } from 'lucide-react';
import { soundManager } from '../components/auth/gamified/soundEffects';
import { useEscapeKey } from '../hooks/useEscapeKey';
import './EventsPage.css';

const EventBanner = ({ item, detail = false }) => {
  const [failedUrl, setFailedUrl] = useState(null);
  const src = item.banner_url?.trim();
  if (!src) return null;

  return (
    <div className={`event-banner ${detail ? 'event-banner--detail' : ''}`}>
      {failedUrl === src ? (
        <div role="img" aria-label={`${item.title}: image unavailable`} style={{ minHeight: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#94a3b8' }}>
          <Calendar size={32} color="#22d3ee" />
          <span>Event image unavailable</span>
        </div>
      ) : (
        <img src={src} alt={item.title} loading={detail ? 'eager' : 'lazy'} decoding="async"
          onError={() => setFailedUrl(src)}
          style={{ display: 'block', width: '100%', aspectRatio: detail ? undefined : '16 / 9', maxHeight: detail ? '45vh' : undefined, objectFit: detail ? 'contain' : 'cover' }} />
      )}
    </div>
  );
};

export const EventsPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'event' | 'announcement'
  const [selectedItem, setSelectedItem] = useState(null);

  useEscapeKey(Boolean(selectedItem), () => setSelectedItem(null));

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterType !== 'all' ? { type: filterType } : {};
      const res = await api.getAnnouncements(params);
      setAnnouncements(res.data || []);
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className="founder-world founder-world--events" style={{ position: 'relative', minHeight: '100vh', paddingBottom: '100px' }}>
      <div className="founder-world__backdrop" aria-hidden="true" />
      <Navbar title="Events & Transmissions" />

      {/* Hero Showcase Banner */}
      <div
        className="glass-card"
        style={{
          padding: '28px 32px',
          marginBottom: '28px',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)',
          border: '1.5px solid rgba(6, 182, 212, 0.35)',
          boxShadow: '0 16px 45px rgba(0, 0, 0, 0.7), 0 0 35px rgba(6, 182, 212, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: '850', letterSpacing: '0.14em', color: '#22d3ee', textTransform: 'uppercase', marginBottom: '6px' }}>
            <Radio size={14} />
            <span>GLOBAL BROADCAST NETWORK</span>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#fff', marginBottom: '6px', letterSpacing: '-0.02em' }}>
            Showcase Events & Keynotes
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '600px', lineHeight: '1.5' }}>
            Join live founder masterclasses, investor demo days, and global venture ecosystem announcements.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${filterType === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              soundManager.playHover();
              setFilterType('all');
            }}
          >
            All Broadcasts
          </button>
          <button
            type="button"
            className={`btn ${filterType === 'event' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              soundManager.playHover();
              setFilterType('event');
            }}
          >
            <Calendar size={15} /> Showcase Events
          </button>
          <button
            type="button"
            className={`btn ${filterType === 'announcement' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              soundManager.playHover();
              setFilterType('announcement');
            }}
          >
            <Megaphone size={15} /> Transmissions
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh', color: '#38bdf8' }}>
          <div className="spinner" style={{ width: 34, height: 34 }} />
        </div>
      ) : announcements.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
          <Calendar size={42} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <h3 style={{ color: '#fff', marginBottom: 6 }}>No Broadcasts Scheduled</h3>
          <p style={{ fontSize: '0.88rem' }}>Check back soon for upcoming masterclasses and ecosystem events.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: '22px' }}>
          {announcements.map((item) => (
            <div
              key={item.id}
              className={`glass-card event-card ${item.banner_url ? 'event-card--with-banner' : ''}`}
              onMouseEnter={soundManager.playHover}
              style={{
                padding: '24px',
                borderRadius: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(10, 16, 32, 0.95) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
                transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              <div>
                <EventBanner item={item} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span className={`badge ${item.type === 'event' ? 'badge-cyan' : 'badge-primary'}`} style={{ fontSize: '0.72rem', fontWeight: 850 }}>
                    {item.type === 'event' ? '⚡ SHOWCASE EVENT' : '📢 TRANSMISSION'}
                  </span>
                  {item.event_date && (
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
                      <Clock size={13} color="#22d3ee" /> {new Date(item.event_date).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: '850', color: '#fff', marginBottom: '8px', lineHeight: 1.3 }}>
                  {item.title}
                </h3>

                <p style={{ fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '18px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.description}
                </p>

                {item.type === 'event' && (
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px', fontSize: '0.82rem' }}>
                    {item.speaker && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0' }}>
                        <User size={14} color="#a855f7" /> <strong>Speaker:</strong> {item.speaker}
                      </div>
                    )}
                    {item.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0' }}>
                        <MapPin size={14} color="#06b6d4" /> <strong>Location:</strong> {item.location}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '0.82rem', fontWeight: 750 }}
                  onClick={() => {
                    soundManager.playHover();
                    setSelectedItem(item);
                  }}
                >
                  View Details
                </button>
                {item.external_url && (
                  <a
                    href={item.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: 750, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    Join <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedItem && (
        <div role="dialog" aria-modal="true" aria-label="Event details" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(3,7,18,0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setSelectedItem(null)}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '620px', maxHeight: '90dvh', overflowY: 'auto', padding: '32px', position: 'relative', borderRadius: '20px', border: '1.5px solid rgba(6,182,212,0.4)', boxShadow: '0 24px 60px rgba(0,0,0,0.9), 0 0 35px rgba(6,182,212,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label="Close event details" onClick={() => setSelectedItem(null)} style={{ position: 'absolute', top: '18px', right: '18px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem' }}>✕</button>

            <span className={`badge ${selectedItem.type === 'event' ? 'badge-cyan' : 'badge-primary'}`} style={{ marginBottom: '12px' }}>
              {selectedItem.type.toUpperCase()}
            </span>

            <h2 style={{ fontSize: '1.55rem', fontWeight: '900', color: '#fff', marginBottom: '12px' }}>
              {selectedItem.title}
            </h2>

            <EventBanner item={selectedItem} detail />

            <p style={{ fontSize: '0.92rem', color: '#cbd5e1', marginBottom: '22px', whiteSpace: 'pre-line', lineHeight: '1.55' }}>
              {selectedItem.description}
            </p>

            {selectedItem.type === 'event' && (
              <div style={{ padding: '18px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                {selectedItem.speaker && <div><strong style={{ color: '#c084fc' }}>Speaker:</strong> {selectedItem.speaker}</div>}
                {selectedItem.event_date && <div><strong style={{ color: '#38bdf8' }}>Date:</strong> {new Date(selectedItem.event_date).toLocaleString()}</div>}
                {selectedItem.location && <div><strong style={{ color: '#10b981' }}>Location:</strong> {selectedItem.location}</div>}
                {selectedItem.meeting_url && <div><strong style={{ color: '#fbbf24' }}>Meeting URL:</strong> <a href={selectedItem.meeting_url} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>{selectedItem.meeting_url}</a></div>}
              </div>
            )}

            {selectedItem.external_url && (
              <a
                href={selectedItem.external_url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                Access Broadcast Link <ExternalLink size={16} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
