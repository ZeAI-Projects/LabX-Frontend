import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Lock,
  Check,
  ArrowRight,
} from 'lucide-react';
import { TierRankBadge } from '../components/common/TierRankBadge';
import { soundManager } from '../components/auth/gamified/soundEffects';
import './RoadmapPage.css';

/*
 * =========================================================
 * 5 PROJECT STAGES & PUBG TIER RANK SYSTEM
 * =========================================================
 * 1. INITIATOR (Discover) -> Initiator III, Initiator II, Initiator I
 * 2. BUILDER (Develop)   -> Builder III, Builder II, Builder I
 * 3. OPERATOR (Launch)   -> Operator III, Operator II, Operator I
 * 4. SCALER (Traction)   -> Scaler III, Scaler II, Scaler I
 * 5. CONQUEROR (Scale)   -> Conqueror III, Conqueror II, Conqueror I
 * =========================================================
 */
const TIER_STAGES = [
  {
    tierName: 'INITIATOR',
    color: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.45)',
  },
  {
    tierName: 'BUILDER',
    color: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.45)',
  },
  {
    tierName: 'OPERATOR',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.45)',
  },
  {
    tierName: 'SCALER',
    color: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.45)',
  },
  {
    tierName: 'CONQUEROR',
    color: '#eab308',
    glow: 'rgba(234, 179, 8, 0.45)',
  },
];

// The stage banner occupies the opening portion of the board. The highway must
// begin at the center of the first milestone row below that banner.
const ROAD_FIRST_NODE_Y = 350;
const ROAD_ROW_HEIGHT = 260;

export const RoadmapPage = () => {
  const [roadmapData, setRoadmapData] = useState(() => {
    try {
      const cached = sessionStorage.getItem('labx_roadmap_cache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!roadmapData);
  const [error, setError] = useState('');
  const [showStageUnlock, setShowStageUnlock] = useState(false);
  const [selectedStageIndex, setSelectedStageIndex] = useState(null);
  const stageNavigation = useRef(null);
  const currentMission = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchRoadmap();
  }, []);

  async function fetchRoadmap() {
    setError('');
    if (!roadmapData) {
      setLoading(true);
    }
    try {
      const res = await api.getRoadmap();
      if (res.data) {
        setRoadmapData(res.data);
        try {
          sessionStorage.setItem('labx_roadmap_cache', JSON.stringify(res.data));
        } catch {
          // ignore session storage limit
        }
      }
    } catch (err) {
      if (!roadmapData) {
        setError(err.message || 'Failed to load founder roadmap');
      }
    } finally {
      setLoading(false);
    }
  }

  /*
   * Flatten stages -> levels -> milestones and enforce sequential unlock progression
   */
  const { processedStages, completedCount, totalCount } = useMemo(() => {
    if (!roadmapData?.stages) {
      return { processedStages: [], completedCount: 0, totalCount: 0 };
    }

    let completed = 0;
    let total = 0;
    const currentStageId = roadmapData.current_location?.current_stage_id;
    const currentLevelId = roadmapData.current_location?.current_level_id;
    const currentMilestoneId = roadmapData.current_location?.current_milestone_id;
    const currentStageIndex = roadmapData.stages.findIndex((stage) => stage.id === currentStageId);

    const stages = roadmapData.stages.map((stage, stageIndex) => {
      const tier = TIER_STAGES[stageIndex % TIER_STAGES.length];
      const levels = (stage.levels || []).map((level, levelIndex) => {
        const totalLevels = stage.levels.length || 3;
        const subRankNumber = totalLevels - levelIndex;
        const levelTierTitle = `${tier.tierName} ${subRankNumber}`;

        const milestones = (level.milestones || []).map((milestone) => {
          const globalIdx = total;
          total++;
          let state = 'locked';
          const currentLevelIndex = stage.levels.findIndex((item) => item.id === currentLevelId);
          const isBeforeStartingPosition =
            stageIndex < currentStageIndex ||
            (stageIndex === currentStageIndex && levelIndex < currentLevelIndex) ||
            (
              stageIndex === currentStageIndex &&
              levelIndex === currentLevelIndex &&
              milestone.id !== currentMilestoneId &&
              milestone.milestone_order < (stage.levels[levelIndex]?.milestones || []).find(
                (item) => item.id === currentMilestoneId
              )?.milestone_order
            );

          if (milestone.is_completed || isBeforeStartingPosition) {
            state = 'completed';
            completed++;
          } else if (milestone.id === currentMilestoneId || milestone.is_unlocked) {
            state = 'active';
          } else {
            state = 'locked';
          }

          const nodeObj = {
            ...milestone,
            globalIndex: globalIdx,
            stageIndex,
            levelIndex,
            stageName: stage.name,
            levelName: level.name,
            tierName: tier.tierName,
            levelTierTitle,
            subRankNumber,
            state,
          };

          return nodeObj;
        });

        return {
          ...level,
          levelTierTitle,
          subRankNumber,
          milestones,
        };
      });

      return {
        ...stage,
        tier,
        levels,
        placementCompleted: stageIndex < currentStageIndex,
      };
    });

    return {
      processedStages: stages,
      completedCount: completed,
      totalCount: total || 75,
    };
  }, [roadmapData]);

  const activeStageIndex = useMemo(() => {
    if (!processedStages.length) return 0;
    if (selectedStageIndex !== null) return selectedStageIndex;

    const currentStageId = roadmapData?.current_location?.current_stage_id;
    const assessedStageIndex = processedStages.findIndex((stage) => stage.id === currentStageId);
    if (assessedStageIndex >= 0) return assessedStageIndex;

    const lastUnlockedStageIndex = processedStages.findLastIndex((stage) => stage.is_unlocked);
    return lastUnlockedStageIndex >= 0 ? lastUnlockedStageIndex : 0;
  }, [processedStages, roadmapData, selectedStageIndex]);

  const activeStage = processedStages[activeStageIndex];
  const nextStage = processedStages[activeStageIndex + 1];
  const isPreviewingLockedStage = Boolean(activeStage && !activeStage.is_unlocked);
  const visibleMilestoneNodes = useMemo(
    () => activeStage?.levels.flatMap((level) => level.milestones) || [],
    [activeStage]
  );
  const currentMilestoneId = roadmapData?.current_location?.current_milestone_id;
  useEffect(() => {
    const navigation = stageNavigation.current;
    const selected = navigation?.querySelector('[aria-pressed="true"]');
    if (selected && navigation.scrollWidth > navigation.clientWidth) {
      navigation.scrollLeft += selected.getBoundingClientRect().left - navigation.getBoundingClientRect().left - 8;
    }
  }, [activeStageIndex, processedStages.length]);
  const currentMilestoneIndex = visibleMilestoneNodes.findIndex(
    (milestone) => milestone.id === currentMilestoneId
  );
  const visibleActiveIndex = activeStage?.placementCompleted
    ? visibleMilestoneNodes.length - 1
    : currentMilestoneIndex >= 0
      ? currentMilestoneIndex
      : visibleMilestoneNodes.findIndex((milestone) => milestone.state === 'active');

  useEffect(() => {
    if (!roadmapData || !activeStage || selectedStageIndex !== null || !activeStage.is_unlocked) return undefined;

    const storageKey = `labx-roadmap-stage-${roadmapData.domain?.id || 'current'}`;
    const previousStage = Number(sessionStorage.getItem(storageKey));
    const advanced = Number.isFinite(previousStage) && previousStage < activeStageIndex;

    sessionStorage.setItem(storageKey, String(activeStageIndex));
    if (!advanced) return undefined;

    let hideTimer;
    const revealTimer = window.setTimeout(() => {
      setShowStageUnlock(true);
      soundManager.playWarpLaunch();
      hideTimer = window.setTimeout(() => setShowStageUnlock(false), 2600);
    }, 0);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(hideTimer);
    };
  }, [activeStage, activeStageIndex, roadmapData, selectedStageIndex]);

  // Generate 100% connected S-curve highway paths for 1400px panoramic canvas
  const { fullRoadPathD, activeRoadPathD } = useMemo(() => {
    if (visibleMilestoneNodes.length === 0) return { fullRoadPathD: '', activeRoadPathD: '' };

    const points = visibleMilestoneNodes.map((_, i) => {
      const isLeft = i % 2 === 0;
      return {
        x: isLeft ? 140 : 1260,
        y: i * ROAD_ROW_HEIGHT + ROAD_FIRST_NODE_Y,
      };
    });

    // Full road from Node 0 to Last Node
    let fullD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const cp1x = p1.x;
      const cp1y = p1.y + ROAD_ROW_HEIGHT / 2;
      const cp2x = p2.x;
      const cp2y = p2.y - ROAD_ROW_HEIGHT / 2;
      fullD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    // Active illuminated segment up to the current milestone in this stage
    let activeD = '';
    if (visibleActiveIndex >= 0 && points.length > 0) {
      const limit = Math.min(visibleActiveIndex, points.length - 1);
      const entryX = Math.max(20, points[0].x - 110);
      activeD = `M ${entryX} ${points[0].y} L ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < limit; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const cp1x = p1.x;
        const cp1y = p1.y + ROAD_ROW_HEIGHT / 2;
        const cp2x = p2.x;
        const cp2y = p2.y - ROAD_ROW_HEIGHT / 2;
        activeD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      }
    }

    return { fullRoadPathD: fullD, activeRoadPathD: activeD };
  }, [visibleMilestoneNodes, visibleActiveIndex]);

  const handleMilestoneClick = (milestone) => {
    const isAccessible = milestone.state === 'active' || milestone.state === 'completed';
    if (!isAccessible) {
      soundManager.playHover();
      return;
    }
    soundManager.playWarpLaunch();
    navigate(`/roadmap/milestones/${milestone.id}`);
  };

  if (loading) {
    return (
      <div className="pubg-roadmap-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#38bdf8' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
          <span style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.08em' }}>
            SYNCHRONIZING BALANCED ROADMAP HIGHWAY...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pubg-roadmap-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', background: 'rgba(15,23,42,0.9)', padding: 32, borderRadius: 20, border: '1px solid rgba(239,68,68,0.4)' }}>
          <h3 style={{ color: '#ef4444', marginBottom: 8 }}>Unable to Load Roadmap</h3>
          <p style={{ color: '#94a3b8', marginBottom: 18 }}>{error}</p>
          <button
            type="button"
            className="btn-card-cta"
            style={{ background: '#06b6d4', color: '#fff', padding: '8px 18px', borderRadius: 9999, border: 'none', cursor: 'pointer' }}
            onClick={fetchRoadmap}
          >
            Retry Sync
          </button>
        </div>
      </div>
    );
  }

  const { domain } = roadmapData || {};
  const progressPercent = Math.round((completedCount / (totalCount || 1)) * 100);
  const totalSvgHeight = Math.max(
    ROAD_FIRST_NODE_Y + Math.max(visibleMilestoneNodes.length - 1, 0) * ROAD_ROW_HEIGHT + 170,
    700
  );

  return (
    <div className="pubg-roadmap-page">
      {showStageUnlock && activeStage && (
        <div className="stage-unlock-overlay" aria-live="polite">
          <div className="stage-unlock-burst" />
          <div className="stage-unlock-content">
            <TierRankBadge
              stageIndex={activeStageIndex}
              subRank={1}
              size={96}
              label={activeStage.tier.tierName}
              state="active"
            />
            <span className="stage-unlock-kicker">NEW STAGE UNLOCKED</span>
            <h2>{activeStage.tier.tierName}</h2>
            <p>{activeStage.name || `Stage ${activeStageIndex + 1}`}</p>
          </div>
        </div>
      )}
      {/* Background Ambient Glow & Grid */}
      <div className="pubg-roadmap-bg">
        <div className="pubg-radial-glow" />
        <div className="pubg-grid-lines" />
      </div>

      {/* SVG Global Shader Definitions */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="activeCyanHighway" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          <filter id="activeRoadBloom" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* =========================================================
          TOP DOMAIN HEADER
      ========================================================= */}
      <header className="pubg-roadmap-header">
        <div className="pubg-header-title-col">
          <span className="pubg-header-kicker">Domain Progression Highway</span>
          <h1 className="pubg-header-title">{domain?.name || 'Venture Architecture'}</h1>
        </div>

        <div className="pubg-header-stats-pill">
          <span>Tier Progress: <strong>{progressPercent}%</strong></span>
          <span>•</span>
          <span>Milestones: <strong>{completedCount} / {totalCount}</strong></span>
        </div>
      </header>

      <nav ref={stageNavigation} className="roadmap-stage-selector" aria-label="Roadmap stages">
        {processedStages.map((stage, index) => {
          const isCurrent = stage.id === roadmapData?.current_location?.current_stage_id;
          const isSelected = index === activeStageIndex;
          return (
            <button
              key={stage.id}
              type="button"
              className={`roadmap-stage-selector__item ${stage.is_unlocked ? 'is-unlocked' : 'is-locked'} ${stage.placementCompleted ? 'is-completed' : ''} ${isSelected ? 'is-selected' : ''}`}
              onClick={() => setSelectedStageIndex(index)}
              aria-pressed={isSelected}
              aria-label={`${stage.name}, Stage ${index + 1}${stage.is_unlocked ? '' : ', locked preview'}`}
            >
              <TierRankBadge stageIndex={index} subRank={1} size={34} label={stage.tier.tierName} state={stage.is_unlocked ? 'active' : 'locked'} />
              <span><small>STAGE {index + 1}</small><strong>{stage.name}</strong></span>
              {stage.placementCompleted ? <em>COMPLETE ✓</em> : isCurrent && <em>CURRENT</em>}
              {!stage.is_unlocked && <Lock size={13} />}
            </button>
          );
        })}
      </nav>

      <div className="roadmap-mobile-summary">
        <div>
          <span>YOUR JOURNEY</span>
          <strong>Stage {activeStageIndex + 1} of {processedStages.length}</strong>
        </div>
        {!isPreviewingLockedStage && currentMilestoneIndex >= 0 && (
          <button type="button" onClick={() => currentMission.current?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
            block: 'center',
          })}>Current mission <ArrowRight size={14} /></button>
        )}
      </div>

      {/* =========================================================
          BALANCED GAME BOARD (1400px Span, Even Left / Right Split)
      ========================================================= */}
      <main className="game-board-container" style={{ minHeight: `${totalSvgHeight}px` }}>
        {/* 100% UNBROKEN CONNECTED S-CURVE HIGHWAY SVG */}
        <svg
          className="master-highway-svg"
          viewBox={`0 0 1400 ${totalSvgHeight}`}
          preserveAspectRatio="none"
        >
          {/* Base Dark Highway Track */}
          <path
            d={fullRoadPathD}
            fill="none"
            stroke="#0a1020"
            strokeWidth="48"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d={fullRoadPathD}
            fill="none"
            stroke="#151e34"
            strokeWidth="38"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d={fullRoadPathD}
            fill="none"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="3"
            strokeDasharray="8 8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active / Completed Luminous Energy Highway Overlay */}
          {activeRoadPathD && (
            <>
              <path
                d={activeRoadPathD}
                fill="none"
                stroke="url(#activeCyanHighway)"
                strokeWidth="38"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#activeRoadBloom)"
              />
              <path
                d={activeRoadPathD}
                fill="none"
                stroke="#ffffff"
                strokeWidth="3"
                strokeDasharray="8 8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}
        </svg>

        {/* STAGES & BALANCED MILESTONE ROWS */}
        {activeStage && [activeStage].map((stage) => {
          const stageIndex = activeStageIndex;
          const tier = stage.tier;

          return (
            <div
              key={stage.id || stageIndex}
              className={`stage-board-section stage-enter ${showStageUnlock ? 'is-unlocking' : ''}`}
              style={{
                '--tier-color': tier.color,
                '--tier-glow': tier.glow,
              }}
            >
              {/* STAGE DIVIDER BANNER */}
              <div className="stage-section-divider">
                <div className="stage-section-pill is-active">
                  <TierRankBadge
                    stageIndex={stageIndex}
                    subRank={1}
                    size={48}
                    label={tier.tierName}
                    state="active"
                  />
                  <div className="stage-pill-text-col">
                    <span className="stage-pill-kicker">STAGE 0{stageIndex + 1}</span>
                    <h2 className="stage-pill-name">
                      {tier.tierName} — {stage.name || `Stage ${stageIndex + 1}`}
                    </h2>
                  </div>
                </div>
              </div>

              {/* EVENLY SPLIT MILESTONE ROWS (Left on Even, Right on Odd) */}
              {stage.levels.map((level) => {
                return level.milestones.map((milestone) => {
                  const visibleIdx = visibleMilestoneNodes.findIndex((node) => node.id === milestone.id);
                  const isLeft = visibleIdx % 2 === 0;
                  const state = milestone.state;
                  const isAccessible = state === 'active' || state === 'completed';

                  // Compact Holo-Shard Card
                  const HoloCardElement = (
                    <button
                      type="button"
                      disabled={!isAccessible}
                      aria-label={`${milestone.name}, ${state}${isAccessible ? '. Open milestone' : ''}`}
                      className={`board-holo-card state-${state}`}
                      onClick={() => handleMilestoneClick(milestone)}
                      onMouseEnter={isAccessible ? soundManager.playHover : undefined}
                    >
                      {/* Card Header Line */}
                      <div className="card-header-row">
                        <div className="card-tier-label-group">
                          <TierRankBadge
                            stageIndex={stageIndex}
                            subRank={milestone.subRankNumber}
                            size={28}
                            label={tier.tierName}
                            state={state}
                          />
                          <span className="card-kicker-tag">
                            {milestone.levelTierTitle} • M0{milestone.milestone_order || 1}
                          </span>
                        </div>

                        <span className={`card-status-pill ${state}`}>
                          {state === 'active' && 'ACTIVE'}
                          {state === 'completed' && 'CONQUERED ✓'}
                          {state === 'locked' && (
                            <>
                              <Lock size={10} /> LOCKED
                            </>
                          )}
                        </span>
                      </div>

                      {/* Card Mission Title */}
                      <h3 className="card-mission-title">{milestone.name}</h3>
                      <p className="card-mission-desc">
                        {milestone.description ||
                          `Milestone ${milestone.milestone_order} for ${level.name} in ${domain?.name || 'Venture Track'}`}
                      </p>

                      {/* Card Footer */}
                      <div className="card-footer-row" style={{ justifyContent: 'flex-end' }}>
                        <div className={`card-action-cta ${state}`}>
                          {state === 'active' && (
                            <>
                              <span>INITIALIZE</span>
                              <ArrowRight size={13} />
                            </>
                          )}
                          {state === 'completed' && <span>REVIEW ✓</span>}
                          {state === 'locked' && <span>LOCKED 🔒</span>}
                        </div>
                      </div>
                    </button>
                  );

                  // Node Anchor Element
                  const NodeElement = (
                    <div
                      className="board-node-anchor"
                      onClick={() => handleMilestoneClick(milestone)}
                      title={isAccessible ? `Initialize ${milestone.name}` : 'Vault Locked'}
                    >
                      {state === 'active' && (
                        <div className="node-portal-active">
                          <Play size={34} fill="#ffffff" style={{ marginLeft: 3 }} />
                        </div>
                      )}

                      {state === 'completed' && (
                        <div className="node-portal-completed">
                          <Check size={36} strokeWidth={3.5} />
                        </div>
                      )}

                      {state === 'locked' && (
                        <div className="node-portal-locked">
                          <Lock size={28} />
                        </div>
                      )}
                    </div>
                  );

                  return (
                    <div
                      key={milestone.id}
                      ref={milestone.id === currentMilestoneId ? currentMission : undefined}
                      className={`board-milestone-row state-${state} ${isLeft ? 'align-left' : 'align-right'}`}
                    >
                      {/* On Left Row: [ Node ] -> [ Laser ] -> [ Card ] */}
                      {isLeft && (
                        <>
                          {NodeElement}
                          <div className={`board-laser-link ${state}`} />
                          {HoloCardElement}
                        </>
                      )}

                      {/* On Right Row: [ Card ] -> [ Laser ] -> [ Node ] */}
                      {!isLeft && (
                        <>
                          {HoloCardElement}
                          <div className={`board-laser-link ${state}`} />
                          {NodeElement}
                        </>
                      )}
                    </div>
                  );
                });
              })}
            </div>
          );
        })}

        {isPreviewingLockedStage && (
          <div className="roadmap-stage-preview-lock" aria-label={`${activeStage.name} is locked`}>
            <div className="roadmap-stage-preview-lock__message">
              <div className="locked-badge-wrap">
                <TierRankBadge
                  stageIndex={activeStageIndex}
                  subRank={1}
                  size={84}
                  label={activeStage.tier.tierName}
                  state="locked"
                />
                <div className="locked-shield-pulse" />
              </div>
              <div className="locked-kicker">
                <Lock size={14} className="lock-icon-pulse" />
                <span>RESTRICTED SECTOR • LOCKED STAGE</span>
              </div>
              <h2>{activeStage.tier.tierName} — {activeStage.name}</h2>
              <p>
                This sector is locked. Complete all active missions in your current stage to unlock and advance along this highway.
              </p>
              <button
                type="button"
                className="btn-return-active-stage"
                onClick={() => {
                  soundManager.playHover();
                  setSelectedStageIndex(null);
                }}
              >
                <span>Return to Active Stage</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {nextStage && (
        <div className="next-stage-teaser" aria-label={`Next stage: ${nextStage.name}`}>
          <div className="next-stage-connector" />
          <div
            className="next-stage-teaser-pill"
            style={{
              '--next-tier-color': nextStage.tier.color,
              '--next-tier-glow': nextStage.tier.glow,
            }}
          >
            <TierRankBadge
              stageIndex={activeStageIndex + 1}
              subRank={1}
              size={54}
              label={nextStage.tier.tierName}
              state="locked"
            />
            <div className="next-stage-teaser-copy">
              <span>NEXT STAGE</span>
              <h2>
                {nextStage.tier.tierName} — {nextStage.name || `Stage ${activeStageIndex + 2}`}
              </h2>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
