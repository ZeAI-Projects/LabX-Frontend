import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Compass, Shield, Users, ArrowRight } from 'lucide-react';

export const AssessmentResult = ({ result }) => {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '640px', margin: '60px auto', textAlign: 'center' }}>
      <div className="glass-card" style={{ padding: '40px 32px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            color: '#fff',
          }}
        >
          <Award size={32} />
        </div>

        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px', color: '#fff' }}>
          Your LABX Starting Point
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
          Based on your diagnostic assessment, your founder progression path has been configured.
        </p>

        {/* Result Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            marginBottom: '32px',
            textAlign: 'left',
          }}
        >
          <ResultTile
            icon={<Compass color="var(--accent-cyan)" />}
            title="Domain"
            value={result?.domain || 'Not assigned'}
          />
          <ResultTile
            icon={<Shield color="var(--accent-purple)" />}
            title="Stage"
            value={result?.stage || 'Not assigned'}
          />
          <ResultTile
            icon={<Award color="var(--accent-amber)" />}
            title="Starting Level"
            value={result?.level ? `Level ${result.level}` : 'Not assigned'}
          />
          <ResultTile
            icon={<Users color="var(--accent-green)" />}
            title="Assigned Guild"
            value={result?.guild || 'Not assigned'}
          />
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: '1.05rem' }}
          onClick={() => navigate('/roadmap')}
        >
          Enter My Roadmap <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

const ResultTile = ({ icon, title, value }) => (
  <div
    style={{
      padding: '16px',
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
      {icon}
      <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
        {title}
      </span>
    </div>
    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>{value}</div>
  </div>
);
