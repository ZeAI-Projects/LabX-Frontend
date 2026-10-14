import React, { useCallback, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Navbar } from '../components/common/Navbar';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Zap,
  Sparkles,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { soundManager } from '../components/auth/gamified/soundEffects';
import { useEscapeKey } from '../hooks/useEscapeKey';

export const MilestoneQuestPage = () => {
  const { milestoneId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  useEscapeKey(Boolean(selectedQuest), () => setSelectedQuest(null));

  const fetchQuests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getMilestoneQuests(milestoneId);
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load quests for this milestone');
    } finally {
      setLoading(false);
    }
  }, [milestoneId]);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  const handleOpenQuestModal = (quest) => {
    soundManager.playHover();
    setSelectedQuest(quest);
    setSubmissionText(quest.submission?.submission_text || '');
    setSubmissionUrl(quest.submission?.submission_url || '');
    setSubmitError('');
    setSubmitSuccess('');
  };

  const handleSubmitWork = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const res = await api.submitQuest(selectedQuest.id, {
        submission_text: submissionText,
        submission_url: submissionUrl,
      });

      soundManager.playWarpLaunch();
      setSubmitSuccess(res.message || 'Mission deliverable submitted for verification!');
      setTimeout(() => {
        setSelectedQuest(null);
        fetchQuests();
      }, 1500);
    } catch (err) {
      setSubmitError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#38bdf8' }}>
        <div className="spinner" style={{ width: 34, height: 34 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ padding: '36px', textAlign: 'center', color: '#ef4444', borderRadius: '18px' }}>
        <p style={{ marginBottom: 16 }}>{error}</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/roadmap')}>
          Back to Roadmap Highway
        </button>
      </div>
    );
  }

  const { milestone, core_quests, side_quests } = data || {};

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: '100px' }}>
      <button
        type="button"
        onClick={() => {
          soundManager.playHover();
          navigate('/roadmap');
        }}
        className="btn btn-secondary"
        style={{ marginBottom: '20px', padding: '8px 18px', fontWeight: 800, gap: 6 }}
      >
        <ArrowLeft size={16} /> Roadmap Highway
      </button>

      <Navbar title={milestone?.name || 'Mission Objectives'} />

      {/* Milestone Scope Banner */}
      <div
        className="glass-card"
        style={{
          padding: '28px 32px',
          marginBottom: '32px',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.16) 0%, rgba(99, 102, 241, 0.1) 100%)',
          border: '1.5px solid rgba(6, 182, 212, 0.4)',
          borderRadius: '20px',
          boxShadow: '0 16px 45px rgba(0, 0, 0, 0.7), 0 0 35px rgba(6, 182, 212, 0.15)',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span className="badge badge-cyan" style={{ fontWeight: 850 }}>
            {milestone?.stages?.name?.toUpperCase() || 'STAGE 01'}
          </span>
          <span className="badge badge-purple" style={{ fontWeight: 850 }}>
            {milestone?.levels?.name?.toUpperCase() || 'LEVEL 01'}
          </span>
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#fff', marginBottom: '8px', letterSpacing: '-0.02em' }}>
          {milestone?.name}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.92rem', maxWidth: '720px', lineHeight: '1.5' }}>
          {milestone?.description}
        </p>
      </div>

      {/* CORE QUESTS SECTION */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.01em' }}>
            MANDATORY CORE MISSIONS
          </h3>
          <span className="badge badge-primary" style={{ fontSize: '0.7rem', fontWeight: 850 }}>
            Required for Highway Unlock
          </span>
        </div>

        {core_quests?.length === 0 ? (
          <div className="glass-card" style={{ padding: '32px', color: '#94a3b8', textAlign: 'center', borderRadius: '16px' }}>
            No core quests configured for this milestone yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '20px' }}>
            {core_quests?.map((quest) => (
              <QuestCard key={quest.id} quest={quest} onClick={() => handleOpenQuestModal(quest)} />
            ))}
          </div>
        )}
      </div>

      {/* SIDE QUESTS SECTION */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.01em' }}>
            OPTIONAL SIDE MISSIONS
          </h3>
          <span className="badge badge-cyan" style={{ fontSize: '0.7rem', fontWeight: 850 }}>
            Bonus LabX Coins
          </span>
        </div>

        {side_quests?.length === 0 ? (
          <div className="glass-card" style={{ padding: '32px', color: '#94a3b8', textAlign: 'center', borderRadius: '16px' }}>
            No side quests currently assigned to this sector.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '20px' }}>
            {side_quests?.map((quest) => (
              <QuestCard key={quest.id} quest={quest} onClick={() => handleOpenQuestModal(quest)} />
            ))}
          </div>
        )}
      </div>

      {/* QUEST DETAIL & SUBMISSION MODAL */}
      {selectedQuest && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Quest details and submission"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setSelectedQuest(null)}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '700px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '36px',
              position: 'relative',
              borderRadius: '22px',
              border: '1.5px solid rgba(6, 182, 212, 0.4)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(6, 182, 212, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close quest details"
              onClick={() => setSelectedQuest(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem' }}
            >
              ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <span className={`badge ${selectedQuest.quest_type === 'core' ? 'badge-primary' : 'badge-cyan'}`} style={{ fontWeight: 850 }}>
                {selectedQuest.quest_type.toUpperCase()} MISSION
              </span>
              <span className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 850 }}>
                <Zap size={13} /> +{selectedQuest.points} LabX Coins
              </span>
              <StatusBadge status={selectedQuest.user_status} />
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: '900', color: '#fff', marginBottom: '16px', letterSpacing: '-0.01em' }}>
              {selectedQuest.title}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ fontSize: '0.78rem', fontWeight: '850', color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  Mission Objective
                </h4>
                <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: '1.5' }}>
                  {selectedQuest.objective || selectedQuest.description}
                </p>
              </div>

              {selectedQuest.instructions && (
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h4 style={{ fontSize: '0.78rem', fontWeight: '850', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                    Deployment Instructions
                  </h4>
                  <p style={{ color: '#cbd5e1', fontSize: '0.92rem', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                    {selectedQuest.instructions}
                  </p>
                </div>
              )}

              {selectedQuest.expected_output && (
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h4 style={{ fontSize: '0.78rem', fontWeight: '850', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                    Expected Deliverable
                  </h4>
                  <p style={{ color: '#cbd5e1', fontSize: '0.92rem' }}>{selectedQuest.expected_output}</p>
                </div>
              )}
            </div>

            {/* Admin Rejection Alert */}
            {selectedQuest.submission?.admin_feedback && (
              <div style={{ padding: '16px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '12px', marginBottom: '22px' }}>
                <div style={{ fontWeight: '800', color: '#ef4444', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                  <AlertCircle size={16} /> Verification Officer Feedback
                </div>
                <div style={{ fontSize: '0.88rem', color: '#fff' }}>{selectedQuest.submission.admin_feedback}</div>
              </div>
            )}

            {/* Submission Form */}
            {['approved', 'completed'].includes(selectedQuest.user_status) ? (
              <div style={{ padding: '18px', backgroundColor: 'rgba(16,185,129,0.15)', border: '1.5px solid rgba(16,185,129,0.4)', borderRadius: '12px', textAlign: 'center', color: '#10b981', fontWeight: '800' }}>
                ✅ Mission Conquered & Verified! LabX Coins Awarded.
              </div>
            ) : selectedQuest.user_status === 'under_review' ? (
              <div style={{ padding: '18px', backgroundColor: 'rgba(245,158,11,0.15)', border: '1.5px solid rgba(245,158,11,0.4)', borderRadius: '12px', textAlign: 'center', color: '#f59e0b', fontWeight: '800' }}>
                ⏳ Deliverables Submitted — Under Verification Protocol.
              </div>
            ) : (
              <form onSubmit={handleSubmitWork} style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '22px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '850', marginBottom: '16px', color: '#fff' }}>
                  Submit Mission Deliverables
                </h3>

                {submitError && (
                  <div style={{ padding: '12px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: '8px', marginBottom: '14px', fontSize: '0.85rem', fontWeight: 700 }}>
                    {submitError}
                  </div>
                )}

                {submitSuccess && (
                  <div style={{ padding: '12px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', borderRadius: '8px', marginBottom: '14px', fontSize: '0.85rem', fontWeight: 700 }}>
                    {submitSuccess}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Submission Debrief / Notes</label>
                  <textarea
                    className="form-textarea"
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Describe your execution, key findings, or architecture..."
                    style={{ minHeight: '100px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Artifact URL (Figma, GitHub, Loom, Notion, Docs)</label>
                  <input
                    type="url"
                    className="form-input"
                    value={submissionUrl}
                    onChange={(e) => setSubmissionUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px', marginTop: '14px', justifyContent: 'center', fontWeight: 850 }}
                  disabled={submitting}
                >
                  {submitting ? 'Transmitting Deliverable...' : selectedQuest.user_status === 'rejected' ? 'Resubmit Fixed Deliverable' : 'Transmit Mission Deliverable ▶'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const QuestCard = ({ quest, onClick }) => (
  <div
    className="glass-card"
    onClick={onClick}
    onMouseEnter={soundManager.playHover}
    style={{
      padding: '22px',
      borderRadius: '18px',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 16, 32, 0.95) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
    }}
  >
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span className={`badge ${quest.quest_type === 'core' ? 'badge-primary' : 'badge-cyan'}`} style={{ fontSize: '0.68rem', fontWeight: 850 }}>
          {quest.quest_type.toUpperCase()}
        </span>
        <span style={{ fontSize: '0.82rem', fontWeight: '850', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Zap size={13} /> +{quest.points} Coins
        </span>
      </div>

      <h4 style={{ fontSize: '1.15rem', fontWeight: '850', color: '#fff', marginBottom: '6px', lineHeight: 1.3 }}>
        {quest.title}
      </h4>
      <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: '18px', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {quest.objective || quest.description}
      </p>
    </div>

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
      <StatusBadge status={quest.user_status} />
      <span style={{ fontSize: '0.8rem', color: '#22d3ee', fontWeight: '800' }}>Initialize →</span>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  if (['approved', 'completed'].includes(status)) {
    return <span className="badge badge-green" style={{ fontSize: '0.7rem', fontWeight: 850 }}><CheckCircle2 size={12} /> Approved</span>;
  }
  if (status === 'under_review') {
    return <span className="badge badge-amber" style={{ fontSize: '0.7rem', fontWeight: 850 }}><Clock size={12} /> Under Review</span>;
  }
  if (status === 'rejected') {
    return <span className="badge badge-red" style={{ fontSize: '0.7rem', fontWeight: 850 }}><XCircle size={12} /> Rejected</span>;
  }
  return <span className="badge badge-cyan" style={{ fontSize: '0.7rem', fontWeight: 850 }}><Sparkles size={12} /> Available</span>;
};
