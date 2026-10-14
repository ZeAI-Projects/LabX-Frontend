import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Navbar } from '../components/common/Navbar';
import { Plus, Trash2 } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';

export const AdminQuestsPage = () => {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [treeData, setTreeData] = useState(null); // { domains, stages, levels, milestones }

  // ── Cascading Selection ─────────────────────────────────────────
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedMilestone, setSelectedMilestone] = useState('');

  // ── Form Fields ─────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [objective, setObjective] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [questType, setQuestType] = useState('core');
  const [difficulty, setDifficulty] = useState('medium');
  const [points, setPoints] = useState(100);
  const [submissionType, setSubmissionType] = useState('text');
  const [verificationRequired, setVerificationRequired] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEscapeKey(showCreateModal, () => setShowCreateModal(false));

  const fetchQuests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminQuests({});
      setQuests(res.data || []);
    } catch (err) {
      console.error('Error loading quests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTree = useCallback(async () => {
    try {
      const res = await api.getAdminRoadmapTree();
      setTreeData(res.data);
    } catch (err) {
      console.error('Error loading roadmap tree:', err);
    }
  }, []);

  useEffect(() => {
    fetchQuests();
    fetchTree();
  }, [fetchQuests, fetchTree]);

  // ── Derived options from cascading selection ────────────────────
  const stageOptions = useMemo(() => treeData?.stages || [], [treeData]);

  const levelOptions = useMemo(() => {
    if (!selectedStage || !treeData) return [];
    return (treeData.levels || []).filter(l => l.stage_id === selectedStage);
  }, [selectedStage, treeData]);

  const milestoneOptions = useMemo(() => {
    if (!selectedDomain || !selectedLevel || !treeData) return [];
    return (treeData.milestones || []).filter(
      m => m.domain_id === selectedDomain && m.level_id === selectedLevel
    );
  }, [selectedDomain, selectedLevel, treeData]);

  // Reset downstream when upstream changes
  const handleDomainChange = (val) => {
    setSelectedDomain(val);
    setSelectedStage('');
    setSelectedLevel('');
    setSelectedMilestone('');
  };
  const handleStageChange = (val) => {
    setSelectedStage(val);
    setSelectedLevel('');
    setSelectedMilestone('');
  };
  const handleLevelChange = (val) => {
    setSelectedLevel(val);
    setSelectedMilestone('');
  };

  // ── Submit ──────────────────────────────────────────────────────
  const handleCreateQuest = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!selectedDomain || !selectedStage || !selectedLevel || !selectedMilestone) {
      setFormError('Please complete all four cascading selections: Domain → Stage → Level → Milestone');
      return;
    }

    setSaving(true);
    try {
      await api.createQuest({
        title,
        description,
        instructions,
        objective,
        expected_output: expectedOutput,
        domain_id: selectedDomain,
        stage_id: selectedStage,
        level_id: selectedLevel,
        milestone_id: selectedMilestone,
        quest_type: questType,
        difficulty,
        points: parseInt(points, 10),
        submission_type: submissionType,
        verification_required: verificationRequired,
      });

      setShowCreateModal(false);
      resetForm();
      fetchQuests();
    } catch (err) {
      setFormError(err.message || 'Failed to create quest');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuest = async (questId) => {
    if (!window.confirm('Deactivate or delete this quest? (If it has user submissions, it will be safely archived).')) return;
    try {
      const res = await api.deleteQuest(questId);
      alert(res.message || 'Quest removed');
      fetchQuests();
    } catch (err) {
      alert(err.message || 'Delete failed');
    }
  };

  const resetForm = () => {
    setSelectedDomain(''); setSelectedStage(''); setSelectedLevel(''); setSelectedMilestone('');
    setTitle(''); setDescription(''); setInstructions(''); setObjective('');
    setExpectedOutput(''); setPoints(100); setFormError('');
  };

  // ── Helpers ──────────────────────────────────────────────────────
  const domainNameById = (id) => (treeData?.domains || []).find(d => d.id === id)?.name || '—';

  return (
    <div>
      <Navbar title="Quest Management Console" />

      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
          Manage Core and Side Quests across all 12 Founder Domains
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} /> Create New Quest
        </button>
      </div>

      {/* Quest Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', minHeight: '40vh' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                <th style={{ padding: '16px' }}>Quest Title</th>
                <th style={{ padding: '16px' }}>Domain</th>
                <th style={{ padding: '16px' }}>Type</th>
                <th style={{ padding: '16px' }}>Points</th>
                <th style={{ padding: '16px' }}>Status</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quests.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No quests yet. Create the first one!</td></tr>
              )}
              {quests.map((q) => (
                <tr key={q.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px', fontWeight: '700', color: '#fff' }}>{q.title}</td>
                  <td style={{ padding: '16px', color: 'var(--accent-cyan)' }}>{q.domains?.name || domainNameById(q.domain_id)}</td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge ${q.quest_type === 'core' ? 'badge-primary' : 'badge-cyan'}`}>
                      {q.quest_type?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--accent-amber)', fontWeight: '700' }}>+{q.points}</td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge ${q.is_active ? 'badge-green' : 'badge-red'}`}>
                      {q.is_active ? 'Active' : 'Archived'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button onClick={() => handleDeleteQuest(q.id)} style={{ color: 'var(--accent-red)', padding: '6px' }} title="Deactivate / Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CREATE QUEST MODAL ── */}
      {showCreateModal && (
        <div role="dialog" aria-modal="true" aria-label="Create quest" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '720px', maxHeight: '92vh', overflowY: 'auto', padding: '32px', position: 'relative' }}>
            <button aria-label="Close quest form" onClick={() => { setShowCreateModal(false); resetForm(); }} style={{ position: 'absolute', top: '20px', right: '20px', color: 'var(--text-muted)', fontSize: '1.2rem' }}>✕</button>

            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>
              Create New Roadmap Quest
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Select a location in the roadmap tree, then fill in the quest details.
            </p>

            {formError && (
              <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)', borderRadius: '8px', marginBottom: '20px', fontSize: '0.88rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateQuest}>

              {/* ── STEP 1: CASCADING LOCATION ── */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
                  📍 Step 1 — Roadmap Location
                </p>

                {/* Row 1: Domain + Stage */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Domain</label>
                    <select
                      className="form-select"
                      required
                      value={selectedDomain}
                      onChange={(e) => handleDomainChange(e.target.value)}
                    >
                      <option value="">Select Domain…</option>
                      {(treeData?.domains || []).map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Stage</label>
                    <select
                      className="form-select"
                      required
                      value={selectedStage}
                      onChange={(e) => handleStageChange(e.target.value)}
                      disabled={!selectedDomain}
                    >
                      <option value="">Select Stage…</option>
                      {stageOptions.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Level + Milestone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Level</label>
                    <select
                      className="form-select"
                      required
                      value={selectedLevel}
                      onChange={(e) => handleLevelChange(e.target.value)}
                      disabled={!selectedStage}
                    >
                      <option value="">Select Level…</option>
                      {levelOptions.map((l) => (
                        <option key={l.id} value={l.id}>Level {l.level_order} — {l.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Milestone</label>
                    <select
                      className="form-select"
                      required
                      value={selectedMilestone}
                      onChange={(e) => setSelectedMilestone(e.target.value)}
                      disabled={!selectedLevel || milestoneOptions.length === 0}
                    >
                      <option value="">Select Milestone…</option>
                      {milestoneOptions.map((m) => (
                        <option key={m.id} value={m.id}>M{m.milestone_order}: {m.name}</option>
                      ))}
                    </select>
                    {selectedLevel && milestoneOptions.length === 0 && (
                      <p style={{ color: 'var(--accent-amber)', fontSize: '0.78rem', marginTop: '4px' }}>
                        No milestones found for this domain + level combination
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── STEP 2: QUEST DETAILS ── */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
                  📝 Step 2 — Quest Details
                </p>

                <div className="form-group">
                  <label className="form-label">Quest Title</label>
                  <input type="text" className="form-input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Define Customer Persona" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Quest Type</label>
                    <select className="form-select" value={questType} onChange={(e) => setQuestType(e.target.value)}>
                      <option value="core">Core (Mandatory)</option>
                      <option value="side">Side (Optional)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Difficulty</label>
                    <select className="form-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">LABX Coins</label>
                    <input type="number" className="form-input" value={points} onChange={(e) => setPoints(e.target.value)} required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Submission Type</label>
                    <select className="form-select" value={submissionType} onChange={(e) => setSubmissionType(e.target.value)}>
                      <option value="text">Text</option>
                      <option value="url">URL / Link</option>
                      <option value="file">File Upload</option>
                      <option value="image">Image</option>
                      <option value="multiple">Multiple</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', paddingBottom: '8px' }}>
                      <input
                        type="checkbox"
                        checked={verificationRequired}
                        onChange={(e) => setVerificationRequired(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                      />
                      <span className="form-label" style={{ margin: 0 }}>Requires Admin Verification</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Objective</label>
                  <textarea className="form-textarea" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="What should the founder accomplish?" />
                </div>

                <div className="form-group">
                  <label className="form-label">Instructions</label>
                  <textarea className="form-textarea" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Step-by-step guidance for completing the quest…" />
                </div>

                <div className="form-group">
                  <label className="form-label">Expected Deliverable / Output</label>
                  <input type="text" className="form-input" value={expectedOutput} onChange={(e) => setExpectedOutput(e.target.value)} placeholder="1-page PDF or Notion URL link…" />
                </div>

                <div className="form-group">
                  <label className="form-label">Description (optional)</label>
                  <textarea className="form-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief overview of this quest…" />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1rem' }} disabled={saving}>
                {saving ? 'Creating Quest…' : '✓ Save Quest to Supabase'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
