import React, { useCallback, useState, useEffect } from 'react';
import { api } from '../services/api';
import { Navbar } from '../components/common/Navbar';
import { CheckCircle2, Lock, Trophy } from 'lucide-react';
import './AchievementsPage.css';

export const AchievementsPage = () => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getAchievements();
      setAchievements(res.data || []);
    } catch {
      setError('Your achievements could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAchievements(); }, [fetchAchievements]);

  const earnedCount = achievements.filter((a) => a.is_earned).length;
  const progressPct = achievements.length ? Math.round((earnedCount / achievements.length) * 100) : 0;
  const visible = achievements.filter((a) => filter === 'all' || (filter === 'earned' ? a.is_earned : !a.is_earned));
  const filters = [ ['all', 'All', achievements.length], ['earned', 'Earned', earnedCount], ['locked', 'Locked', achievements.length - earnedCount] ];

  return (
    <div className="founder-world founder-world--achievements achievements-page">
      <div className="founder-world__backdrop" aria-hidden="true" />
      <Navbar title="Achievements" />

      <section className="achievements-hero">
        <div className="achievements-hero__copy">
          <span className="achievements-eyebrow"><Trophy size={14} /> YOUR TROPHY COLLECTION</span>
          <h2>Small wins. Lasting milestones.</h2>
          <p>Every mission moves you forward. Build your collection as you learn, create, and connect.</p>
        </div>
        <div className="achievements-progress">
          <div className="achievements-progress__numbers"><strong>{earnedCount}<span> / {achievements.length}</span></strong><span>badges earned</span></div>
          <div className="achievements-progress__track" role="progressbar" aria-label="Achievement progress" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progressPct}%` }} />
          </div>
          <span className="achievements-progress__caption">{progressPct}% of your collection unlocked</span>
        </div>
      </section>

      <div className="achievements-filters" aria-label="Filter achievements">
        {filters.map(([value, label, count]) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {label}<span>{count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="achievements-status" role="status"><div className="spinner" /><p>Loading your collection...</p></div>
      ) : error ? (
        <div className="achievements-status" role="alert"><p>{error}</p><button className="btn btn-secondary" onClick={fetchAchievements}>Try again</button></div>
      ) : visible.length === 0 ? (
        <div className="achievements-status"><Trophy size={32} /><h3>{filter === 'earned' ? 'Your first badge is ahead' : 'No badges to show'}</h3><p>{filter === 'earned' ? 'Complete missions to start your collection.' : 'Try another filter or check back soon.'}</p></div>
      ) : (
        <div className="achievements-grid">
          {visible.map((ach) => (
            <article key={ach.id} className={`achievement-card ${ach.is_earned ? 'is-earned' : 'is-locked'}`}>
              <div className="achievement-card__top">
                <div className="achievement-card__icon" aria-hidden="true">{ach.icon || <Trophy size={26} />}</div>
                {ach.is_earned ? <CheckCircle2 className="achievement-card__status" size={17} aria-label="Earned" /> : <Lock className="achievement-card__status" size={15} aria-label="Locked" />}
              </div>
              <h3>{ach.name}</h3>
              <p>{ach.description}</p>
              <div className="achievement-card__footer"><span />{ach.is_earned ? 'Earned' : 'Locked'}</div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
