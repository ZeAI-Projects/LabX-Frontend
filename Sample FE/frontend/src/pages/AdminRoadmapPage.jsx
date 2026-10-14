import React, { useCallback, useState, useEffect } from 'react';
import { api } from '../services/api';
import { Navbar } from '../components/common/Navbar';
import { Compass } from 'lucide-react';

export const AdminRoadmapPage = () => {
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRoadmap = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getRoadmap();
      setRoadmap(res.data);
    } catch (err) {
      console.error('Error fetching roadmap:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const { domain, stages } = roadmap || {};

  return (
    <div>
      <Navbar title="Roadmap Configuration Console" />

      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <Compass size={24} color="var(--accent-cyan)" />
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>
            Domain: {domain?.name}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            System configuration showing 5 Stages, 25 Levels, and 900 database milestones.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {(stages || []).map((s) => (
          <div key={s.id} className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
              STAGE {s.stage_order}: {s.name.toUpperCase()}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>{s.description}</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '12px' }}>
              {(s.levels || []).map((l) => (
                <div key={l.id} style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.9rem' }}>{l.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    3 Milestones configured
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
