import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Navbar } from '../components/common/Navbar';
import {
  Trophy,
  Medal,
  Award,
  Search,
  Filter,
  Users,
  Compass,
  ChevronRight,
  ExternalLink,
  Crown,
} from 'lucide-react';
import { soundManager } from '../components/auth/gamified/soundEffects';
import './LeaderboardPage.css';

export const LeaderboardPage = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [data, setData] = useState({
    leaderboard: [],
    user_standing: null,
    total_founders: 0,
    current_domain: {},
    domains: [],
  });

  const [scope, setScope] = useState('domain');
  const [search, setSearch] = useState('');
  const searchRef = useRef('');
  const [selectedDomainId, setSelectedDomainId] = useState('');

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);

    try {
      const params = {};

      if (selectedDomainId && selectedDomainId !== 'all') {
        params.domain_id = selectedDomainId;
      } else if (scope === 'domain') {
        params.scope = 'domain';
      } else {
        params.scope = 'all';
      }

      if (searchRef.current.trim()) {
        params.search = searchRef.current.trim();
      }

      const res = await api.getLeaderboard(params);
      setData(res.data || {});
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, [scope, selectedDomainId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLeaderboard();
  };

  const leaderboardList = data.leaderboard || [];
  const top3 = leaderboardList.slice(0, 3);
  const restList = leaderboardList.slice(3);
  const userStanding = data.user_standing;
  const currentDomainName = data.current_domain?.name || 'My Domain';

  const getRankClass = (rank) => {
    if (rank === 1) return 'rank-first';
    if (rank === 2) return 'rank-second';
    if (rank === 3) return 'rank-third';
    return '';
  };

  const getMedal = (rank) => {
    if (rank === 1) return <Crown size={20} />;
    if (rank === 2) return <Medal size={20} />;
    if (rank === 3) return <Medal size={20} />;
    return <Award size={18} />;
  };

  return (
    <div className="leaderboard-page">
      <Navbar title="Leaderboard" />

      {/* BACKGROUND AMBIENT GLOW */}
      <div className="leaderboard-bg">
        <div className="leaderboard-glow glow-purple" />
        <div className="leaderboard-glow glow-cyan" />
        <div className="leaderboard-grid" />
      </div>

      <main className="leaderboard-content">
        {/* =====================================================
            TOP HEADER & FILTERS
        ===================================================== */}
        <section className="leaderboard-header-section">
          <div className="header-text-group">
            <h1 className="leaderboard-main-title">
              Founder <span style={{ color: '#22d3ee' }}>Leaderboard</span>
            </h1>
            <p className="leaderboard-main-sub">
              Compete, complete milestones, and rise to the top of the founder ranks.
            </p>
          </div>

          <div className="leaderboard-controls-row">
            <div className="leaderboard-tabs">
              <button
                type="button"
                className={`leaderboard-tab ${scope === 'domain' && !selectedDomainId ? 'active' : ''}`}
                onClick={() => {
                  soundManager.playHover();
                  setScope('domain');
                  setSelectedDomainId('');
                }}
              >
                <Compass size={15} />
                {currentDomainName}
              </button>

              <button
                type="button"
                className={`leaderboard-tab ${scope === 'all' && !selectedDomainId ? 'active' : ''}`}
                onClick={() => {
                  soundManager.playHover();
                  setScope('all');
                  setSelectedDomainId('');
                }}
              >
                <Users size={15} />
                Global
              </button>

              <div className="domain-select-wrap">
                <Filter size={14} />
                <select
                  aria-label="Filter leaderboard by domain"
                  value={selectedDomainId}
                  onChange={(e) => {
                    soundManager.playHover();
                    setSelectedDomainId(e.target.value);
                    if (e.target.value) setScope('');
                  }}
                >
                  <option value="">Filter by Domain</option>
                  {data.domains?.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.icon || '💡'} {domain.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <form className="leaderboard-search" onSubmit={handleSearchSubmit}>
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                aria-label="Search founders"
                enterKeyHint="search"
                placeholder="Search founder..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  searchRef.current = e.target.value;
                }}
              />
              <button type="submit">Search</button>
            </form>
          </div>
        </section>

        {/* =====================================================
            1. MY CURRENT RANKING (Prominent Hero Card)
        ===================================================== */}
        {userStanding && (
          <section className="your-standing-card-hero">
            <div className="your-standing-left">
              <div className="your-rank-badge">
                <span className="rank-hash">#</span>
                <span className="rank-num">{userStanding.rank}</span>
              </div>

              <div className="your-avatar-wrap">
                {userStanding.avatar_url ? (
                  <img src={userStanding.avatar_url} alt={userStanding.full_name} />
                ) : (
                  <span>{userStanding.full_name?.charAt(0) || 'U'}</span>
                )}
              </div>

              <div className="your-identity-col">
                <div className="your-name-row">
                  <strong className="your-full-name">{userStanding.full_name}</strong>
                  <span className="you-pill-badge">YOU</span>
                  <span className="your-handle">@{userStanding.username}</span>
                </div>

                <div className="your-meta-sub">
                  <span className="your-domain-text">{userStanding.domain || currentDomainName}</span>
                  <span>•</span>
                  <span className="your-badge-count">{userStanding.badges_count || 0} Badges Earned</span>
                </div>
              </div>
            </div>

            <div className="your-standing-right">
              <div className="your-points-block">
                <strong className="points-number">{(userStanding.total_points || 0).toLocaleString()}</strong>
                <span className="points-label">LABX COINS</span>
              </div>

              <button
                type="button"
                className="btn-view-profile"
                onClick={() => {
                  soundManager.playWarpLaunch();
                  navigate('/profile');
                }}
              >
                View Profile
                <ChevronRight size={15} />
              </button>
            </div>
          </section>
        )}

        {/* =====================================================
            LOADING / CONTENT
        ===================================================== */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#38bdf8' }}>
            <div className="spinner" style={{ width: 34, height: 34, margin: '0 auto 14px' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Loading podium and rankings...</span>
          </div>
        ) : leaderboardList.length === 0 ? (
          <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
            <Trophy size={42} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <h3 style={{ color: '#ffffff', marginBottom: 6 }}>No founders found</h3>
            <p style={{ fontSize: '0.88rem' }}>Try switching filters or clearing your search query.</p>
          </div>
        ) : (
          <>
            {/* =================================================
                2. THE PODIUM (Top 3 Champions)
            ================================================= */}
            <section className="podium-section">
              <div className="section-heading">
                <div>
                  <span className="podium-section-kicker">TOP 3 SOVEREIGNS</span>
                  <h2 className="podium-section-title">The Hall of Leaders</h2>
                </div>

                <div className="live-indicator">
                  <span />
                  LIVE RANKINGS
                </div>
              </div>

              <div className="podium-container">
                {/* 2ND PLACE PODIUM */}
                {top3[1] && (
                  <PodiumCard
                    founder={top3[1]}
                    rank={2}
                    navigate={navigate}
                    getRankClass={getRankClass}
                    getMedal={getMedal}
                  />
                )}

                {/* 1ST PLACE PODIUM (CHAMPION) */}
                {top3[0] && (
                  <PodiumCard
                    founder={top3[0]}
                    rank={1}
                    navigate={navigate}
                    getRankClass={getRankClass}
                    getMedal={getMedal}
                  />
                )}

                {/* 3RD PLACE PODIUM */}
                {top3[2] && (
                  <PodiumCard
                    founder={top3[2]}
                    rank={3}
                    navigate={navigate}
                    getRankClass={getRankClass}
                    getMedal={getMedal}
                  />
                )}
              </div>
            </section>

            {/* =================================================
                3. STANDINGS LIST (4th Place Onwards)
            ================================================= */}
            {restList.length > 0 && (
              <section className="rankings-section">
                <div className="rankings-header">
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 850, letterSpacing: '0.12em', color: '#22d3ee', textTransform: 'uppercase' }}>
                      CONTINUED STANDINGS
                    </span>
                    <h2 className="rankings-title">
                      Ranks #4 and Beyond
                    </h2>
                  </div>

                  <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 700 }}>
                    {restList.length} Founders
                  </div>
                </div>

                <div className="rankings-table" role="region" aria-label="Founder standings" tabIndex={0}>
                  <div className="rankings-table-head">
                    <span>RANK</span>
                    <span>FOUNDER</span>
                    <span>DOMAIN</span>
                    <span>PROGRESS</span>
                    <span>BADGES</span>
                    <span>LABX COINS</span>
                    <span />
                  </div>

                  {restList.map((founder) => {
                    const isUser = founder.is_current_user;

                    return (
                      <button
                        type="button"
                        key={founder.id}
                        className={`ranking-row ${isUser ? 'is-user' : ''}`}
                        onClick={() => {
                          soundManager.playWarpLaunch();
                          navigate(`/profile/${founder.id}`);
                        }}
                        onMouseEnter={soundManager.playHover}
                      >
                        {/* RANK */}
                        <div className={`ranking-position ${getRankClass(founder.rank)}`}>
                          <span>#{founder.rank}</span>
                        </div>

                        {/* FOUNDER */}
                        <div className="ranking-founder">
                          <div className="small-avatar">
                            {founder.avatar_url ? (
                              <img src={founder.avatar_url} alt={founder.full_name} />
                            ) : (
                              <span>{founder.full_name?.charAt(0) || 'F'}</span>
                            )}
                          </div>

                          <div>
                            <div className="founder-name">
                              <strong>{founder.full_name}</strong>
                              {isUser && <span className="you-badge">YOU</span>}
                            </div>
                            <span>@{founder.username}</span>
                          </div>
                        </div>

                        {/* DOMAIN */}
                        <div className="ranking-domain">
                          <span>{founder.domain_icon || '🌐'}</span>
                          <span>{founder.domain || currentDomainName}</span>
                        </div>

                        {/* PROGRESS */}
                        <div className="ranking-progress">
                          <strong>{founder.stage || 'Stage 1'}</strong>
                          <span>{founder.level || 'Level 1'}</span>
                        </div>

                        {/* BADGES */}
                        <div className="ranking-badges" aria-label={`${founder.badges_count || 0} badges`}>
                          <Award size={15} color="#c084fc" />
                          <span>{founder.badges_count || 0}<span className="ranking-badge-label"> badges</span></span>
                        </div>

                        {/* POINTS */}
                        <div className="ranking-points">
                          <strong>{(founder.total_points || 0).toLocaleString()}</strong>
                          <span> PTS</span>
                        </div>

                        <ChevronRight className="ranking-arrow" size={18} />
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

/* =========================================================
   PODIUM CARD COMPONENT
========================================================= */

const PodiumCard = ({
  founder,
  rank,
  navigate,
  getRankClass,
  getMedal,
}) => {
  if (!founder) return null;

  return (
    <button
      type="button"
      aria-label={`Rank ${rank}: ${founder.full_name}. View founder profile`}
      className={`podium-card ${getRankClass(rank)}`}
      onClick={() => {
        soundManager.playWarpLaunch();
        navigate(`/profile/${founder.id}`);
      }}
      onMouseEnter={soundManager.playHover}
    >
      {/* MEDAL */}
      <div className="podium-medal">
        {getMedal(rank)}
        <span>{rank === 1 ? 'CHAMPION' : rank === 2 ? 'RUNNER UP' : 'TOP 3'}</span>
      </div>

      {/* AVATAR */}
      <div className="podium-avatar">
        {founder.avatar_url ? (
          <img src={founder.avatar_url} alt={founder.full_name} />
        ) : (
          <span>{founder.full_name?.charAt(0) || rank}</span>
        )}
        <div className="podium-rank">#{rank}</div>
      </div>

      {/* NAME */}
      <h3>{founder.full_name}</h3>
      <span className="podium-username">@{founder.username}</span>

      {/* DOMAIN & STAGE TAGS */}
      <div className="podium-tags">
        <span>
          {founder.domain_icon || '🌐'} {founder.domain}
        </span>
        <span>{founder.stage || 'Stage 1'}</span>
      </div>

      {/* SCORE */}
      <div className="podium-score">
        <div>
          <strong>{(founder.total_points || 0).toLocaleString()}</strong>
          <span>LABX COINS</span>
        </div>

        <div className="score-divider" />

        <div>
          <strong style={{ color: '#c084fc' }}>{founder.badges_count || 0}</strong>
          <span>BADGES</span>
        </div>
      </div>

      <div className="podium-view">
        <span>View Founder</span>
        <ExternalLink size={13} />
      </div>
    </button>
  );
};
