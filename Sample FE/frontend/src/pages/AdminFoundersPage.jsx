import React, { useCallback, useRef, useState, useEffect } from 'react';
import { api } from '../services/api';
import { Navbar } from '../components/common/Navbar';
import { Search, RefreshCw } from 'lucide-react';

export const AdminFoundersPage = () => {
  const [founders, setFounders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const searchRef = useRef('');

  const fetchFounders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminFounders({ search: searchRef.current });
      setFounders(res.data || []);
    } catch (err) {
      console.error('Error fetching founders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFounders();
  }, [fetchFounders]);

  const handleResetAssessment = async (userId, founderName) => {
    if (!window.confirm(`Reset assessment for ${founderName}? They will be required to take the diagnostic assessment again.`)) {
      return;
    }

    try {
      await api.resetFounderAssessment(userId);
      alert(`Assessment reset for ${founderName}`);
      fetchFounders();
    } catch (err) {
      alert(err.message || 'Reset failed');
    }
  };

  return (
    <div>
      <Navbar title="Founders Directory" />

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search founders by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              searchRef.current = e.target.value;
            }}
            onKeyDown={(e) => e.key === 'Enter' && fetchFounders()}
          />
        </div>
        <button className="btn btn-primary" onClick={fetchFounders}>
          <Search size={16} /> Search
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
                <th style={{ padding: '16px' }}>Founder Name</th>
                <th style={{ padding: '16px' }}>Email</th>
                <th style={{ padding: '16px' }}>Domain</th>
                <th style={{ padding: '16px' }}>Guild</th>
                <th style={{ padding: '16px' }}>LabX Coins</th>
                <th style={{ padding: '16px' }}>Assessment</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {founders.map((f) => (
                <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px', fontWeight: '700', color: '#fff' }}>{f.full_name || 'Founder'}</td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{f.email}</td>
                  <td style={{ padding: '16px', color: 'var(--accent-cyan)' }}>{f.domains?.name || 'Unassigned'}</td>
                  <td style={{ padding: '16px' }}>{f.guilds?.name || 'Unassigned'}</td>
                  <td style={{ padding: '16px', color: 'var(--accent-amber)', fontWeight: '700' }}>{f.total_points || 0}</td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge ${f.assessment_completed ? 'badge-green' : 'badge-amber'}`}>
                      {f.assessment_completed ? 'Completed' : 'Pending'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    {f.assessment_completed && (
                      <button
                        onClick={() => handleResetAssessment(f.id, f.full_name)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        title="Reset Assessment"
                      >
                        <RefreshCw size={12} /> Reset Assessment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
