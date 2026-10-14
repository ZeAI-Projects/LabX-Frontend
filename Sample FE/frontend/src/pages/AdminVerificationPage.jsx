import React, { useCallback, useState, useEffect } from 'react';
import { api } from '../services/api';
import { Navbar } from '../components/common/Navbar';
import { CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';

export const AdminVerificationPage = () => {
  const [statusTab, setStatusTab] = useState('under_review'); // 'under_review' | 'approved' | 'rejected'
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState(false);

  useEscapeKey(Boolean(selectedSub), () => setSelectedSub(null));

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getVerificationQueue({ status: statusTab });
      setSubmissions(res.data || []);
    } catch (err) {
      console.error('Error fetching verification queue:', err);
    } finally {
      setLoading(false);
    }
  }, [statusTab]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleReview = async (action) => {
    if (action === 'reject' && !feedback.trim()) {
      alert('Feedback is required when rejecting work');
      return;
    }

    setProcessing(true);
    try {
      await api.reviewSubmission(selectedSub.id, {
        action: action,
        feedback: feedback,
      });
      setSelectedSub(null);
      setFeedback('');
      fetchQueue();
    } catch (err) {
      alert(err.message || 'Review action failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <Navbar title="Quest Submission Verification Queue" />

      {/* Status Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          className={`btn ${statusTab === 'under_review' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setStatusTab('under_review')}
        >
          <Clock size={16} /> Pending Review
        </button>
        <button
          className={`btn ${statusTab === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setStatusTab('approved')}
        >
          <CheckCircle2 size={16} /> Approved
        </button>
        <button
          className={`btn ${statusTab === 'rejected' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setStatusTab('rejected')}
        >
          <XCircle size={16} /> Rejected
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', minHeight: '40vh' }}>
          <div className="spinner" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No submissions in {statusTab.replace('_', ' ')} queue.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {submissions.map((sub) => {
            const founder = sub.profiles || {};
            const quest = sub.quests || {};
            return (
              <div key={sub.id} className="glass-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                    <span className="badge badge-cyan">{founder.domains?.name || 'Domain'}</span>
                    <span className="badge badge-primary">{quest.quest_type?.toUpperCase()}</span>
                    <span className="badge badge-amber">+{quest.points} Coins</span>
                  </div>

                  <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>
                    {quest.title}
                  </h4>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Submitted by <strong>{founder.full_name}</strong> ({founder.email}) on {new Date(sub.created_at).toLocaleString()}
                  </div>
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedSub(sub);
                    setFeedback(sub.admin_feedback || '');
                  }}
                >
                  Inspect & Verify
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* INSPECTION MODAL */}
      {selectedSub && (
        <div role="dialog" aria-modal="true" aria-label="Review submission" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto', padding: '32px', position: 'relative' }}>
            <button aria-label="Close submission review" onClick={() => setSelectedSub(null)} style={{ position: 'absolute', top: '20px', right: '20px', color: 'var(--text-muted)' }}>✕</button>

            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginBottom: '16px' }}>
              Review Work: {selectedSub.quests?.title}
            </h2>

            <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
              <div><strong>Founder:</strong> {selectedSub.profiles?.full_name} ({selectedSub.profiles?.email})</div>
              <div><strong>Domain:</strong> {selectedSub.profiles?.domains?.name}</div>
              <div><strong>Coins Award:</strong> +{selectedSub.quests?.points} Coins</div>
            </div>

            {/* Submission Content */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Submission Text
              </h4>
              <div style={{ padding: '14px', backgroundColor: 'rgba(11,15,25,0.6)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.95rem', color: '#fff', whiteSpace: 'pre-line', marginBottom: '16px' }}>
                {selectedSub.submission_text || 'No text content provided.'}
              </div>

              {selectedSub.submission_url && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Deliverable URL
                  </h4>
                  <a
                    href={selectedSub.submission_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--accent-cyan)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}
                  >
                    {selectedSub.submission_url} <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>

            {/* Verification Form */}
            {statusTab === 'under_review' ? (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Feedback (Required if rejecting)</label>
                  <textarea
                    className="form-textarea"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide constructive review comments for the founder..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '14px', marginTop: '16px' }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, backgroundColor: 'var(--accent-green)' }}
                    onClick={() => handleReview('approve')}
                    disabled={processing}
                  >
                    <CheckCircle2 size={18} /> Approve Submission
                  </button>

                  <button
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    onClick={() => handleReview('reject')}
                    disabled={processing}
                  >
                    <XCircle size={18} /> Reject Submission
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '14px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '8px', fontSize: '0.9rem' }}>
                <strong>Status:</strong> {statusTab.toUpperCase()}<br />
                {selectedSub.admin_feedback && <div><strong>Feedback:</strong> {selectedSub.admin_feedback}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
