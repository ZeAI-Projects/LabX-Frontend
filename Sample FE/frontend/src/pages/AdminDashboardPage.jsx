import React, { useCallback, useState, useEffect } from 'react';
import { api } from '../services/api';
import { Navbar } from '../components/common/Navbar';
import { Users, ShieldCheck, CheckSquare, Share2, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminDashboardPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminAnalytics();
      setAnalytics(res.data);
    } catch (err) {
      console.error('Error loading admin analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const {
    total_founders,
    active_founders,
    total_submissions,
    pending_verifications,
    total_posts,
    total_quests,
    domain_distribution,
  } = analytics || {};

  return (
    <div>
      <Navbar title="Platform Overview & Analytics" />

      {/* Primary KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '20px', marginBottom: '32px' }}>
        <AdminStatTile
          icon={<Users color="var(--accent-cyan)" size={24} />}
          label="Total Founders"
          value={total_founders || 0}
          sub={`${active_founders || 0} active`}
          onClick={() => navigate('/admin/founders')}
        />

        <AdminStatTile
          icon={<ShieldCheck color="var(--accent-amber)" size={24} />}
          label="Pending Verification"
          value={pending_verifications || 0}
          sub="Requires Action"
          highlight={pending_verifications > 0}
          onClick={() => navigate('/admin/verification')}
        />

        <AdminStatTile
          icon={<CheckSquare color="var(--primary)" size={24} />}
          label="Total Quests"
          value={total_quests || 0}
          sub={`${total_submissions || 0} total submissions`}
          onClick={() => navigate('/admin/quests')}
        />

        <AdminStatTile
          icon={<Share2 color="var(--accent-purple)" size={24} />}
          label="Social Activity"
          value={total_posts || 0}
          sub="Platform Posts"
          onClick={() => navigate('/social')}
        />
      </div>

      {/* Domain Distribution Breakdown */}
      <div className="glass-card" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '20px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={20} color="var(--accent-cyan)" /> Founder Distribution Across 12 Domains
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '16px' }}>
          {(domain_distribution || []).map((d) => (
            <div
              key={d.domain_id}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '600' }}>{d.domain_name}</span>
              <span className="badge badge-cyan">{d.founder_count} Founders</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AdminStatTile = ({ icon, label, value, sub, highlight, onClick }) => (
  <div
    className="glass-card"
    onClick={onClick}
    style={{
      padding: '20px',
      cursor: onClick ? 'pointer' : 'default',
      border: highlight ? '1.5px solid var(--accent-amber)' : '1px solid var(--border-color)',
      backgroundColor: highlight ? 'rgba(245,158,11,0.08)' : 'rgba(19,27,46,0.75)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
      <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.04)' }}>{icon}</div>
      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff' }}>{value}</div>
    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>{sub}</div>
  </div>
);
