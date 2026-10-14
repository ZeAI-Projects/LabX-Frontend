import { FloatingXp } from '../components/common/FloatingXp';
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../contexts/useAuth";
import {
  Compass, Shield, Award, Users, CheckCircle2, ArrowRight,
  Sparkles, ChevronRight, Zap, Calendar, Bell, ChevronDown,
  Lock, Trophy, Clock
} from "lucide-react";

import "./DashboardPage.css";

const HeroCrystal = () => (
  <svg width="88" height="110" viewBox="0 0 100 120" fill="none"
    style={{ filter: "drop-shadow(0 0 20px rgba(168,85,247,0.8))", flexShrink: 0, animation: "crystalPulse 3s ease-in-out infinite" }}>
    <defs>
      <linearGradient id="hct" x1="50" y1="10" x2="50" y2="45" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f3e8ff" /><stop offset="1" stopColor="#c084fc" />
      </linearGradient>
      <linearGradient id="hcm" x1="25" y1="20" x2="75" y2="80" gradientUnits="userSpaceOnUse">
        <stop stopColor="#c084fc" /><stop offset="0.6" stopColor="#9333ea" /><stop offset="1" stopColor="#581c87" />
      </linearGradient>
      <linearGradient id="hcl" x1="20" y1="30" x2="50" y2="80" gradientUnits="userSpaceOnUse">
        <stop stopColor="#a855f7" /><stop offset="1" stopColor="#6b21a8" />
      </linearGradient>
      <linearGradient id="hcr" x1="80" y1="30" x2="50" y2="80" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7e22ce" /><stop offset="1" stopColor="#3b0764" />
      </linearGradient>
      <radialGradient id="hrg" cx="50" cy="100" r="45" gradientUnits="userSpaceOnUse">
        <stop stopColor="#c084fc" stopOpacity="0.9" />
        <stop offset="0.5" stopColor="#9333ea" stopOpacity="0.4" />
        <stop offset="1" stopColor="#3b0764" stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx="50" cy="104" rx="44" ry="13" fill="url(#hrg)" />
    <ellipse cx="50" cy="104" rx="36" ry="9" fill="rgba(15,23,42,0.9)" stroke="#c084fc" strokeWidth="1.5" />
    <ellipse cx="50" cy="101" rx="26" ry="6" fill="rgba(30,27,75,0.9)" stroke="#a855f7" strokeWidth="1" strokeDasharray="3 3" />
    <ellipse cx="50" cy="98" rx="16" ry="4" fill="#581c87" stroke="#e9d5ff" strokeWidth="1.5" />
    <polygon points="50,12 66,35 50,44 34,35" fill="url(#hct)" />
    <polygon points="50,12 34,35 24,50 50,88" fill="url(#hcl)" />
    <polygon points="50,12 66,35 76,50 50,88" fill="url(#hcr)" />
    <polygon points="34,35 50,44 66,35 76,50 50,88 24,50" fill="url(#hcm)" opacity="0.95" />
    <polygon points="50,44 58,56 50,76 42,56" fill="#ffffff" opacity="0.4" />
    <circle cx="28" cy="30" r="2" fill="#f3e8ff" opacity="0.9" />
    <circle cx="72" cy="26" r="2" fill="#f3e8ff" opacity="0.9" />
    <circle cx="20" cy="65" r="1.5" fill="#c084fc" />
    <circle cx="80" cy="62" r="1.5" fill="#c084fc" />
  </svg>
);

const GoldCoins = () => (
  <svg width="40" height="40" viewBox="0 0 48 48" fill="none" style={{ filter: "drop-shadow(0 0 8px rgba(251,191,36,0.6))" }}>
    <defs>
      <linearGradient id="gc1" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fef08a" /><stop offset="0.5" stopColor="#eab308" /><stop offset="1" stopColor="#a16207" />
      </linearGradient>
      <linearGradient id="gc2" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fde047" /><stop offset="1" stopColor="#ca8a04" />
      </linearGradient>
    </defs>
    <ellipse cx="24" cy="38" rx="16" ry="5" fill="#713f12" />
    <path d="M8 32 C8 38 40 38 40 32 L40 26 C40 32 8 32 8 26 Z" fill="url(#gc1)" />
    <ellipse cx="24" cy="26" rx="16" ry="5" fill="url(#gc2)" stroke="#fef08a" strokeWidth="0.8" />
    <path d="M8 24 C8 30 40 30 40 24 L40 18 C40 24 8 24 8 18 Z" fill="url(#gc1)" />
    <ellipse cx="24" cy="18" rx="16" ry="5" fill="url(#gc2)" stroke="#fef08a" strokeWidth="0.8" />
    <path d="M8 16 C8 22 40 22 40 16 L40 10 C40 16 8 16 8 10 Z" fill="url(#gc1)" />
    <ellipse cx="24" cy="10" rx="16" ry="5" fill="url(#gc2)" stroke="#ffffff" strokeWidth="1" />
    <circle cx="24" cy="10" r="2.5" fill="#ffffff" opacity="0.9" />
  </svg>
);

const RingProgress = ({ pct = 1, size = 46, sw = 5 }) => {
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, pct)) / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs><linearGradient id="pgr" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#818cf8" />
        </linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke="rgba(255,255,255,0.07)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke="url(#pgr)" strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 5px #38bdf8)", transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <span style={{ position: "absolute", fontSize: "0.85rem", fontWeight: "900", color: "#fff" }}>{pct}%</span>
    </div>
  );
};

const MiniBars = () => (
  <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
    {[{ x: 1, h: 6 }, { x: 7, h: 10 }, { x: 13, h: 16 }, { x: 19, h: 12 }, { x: 25, h: 20 }, { x: 31, h: 14 }, { x: 37, h: 18 }].map((b, i) => (
      <rect key={i} x={b.x} y={24 - b.h} width="4" height={b.h} rx="1.5"
        fill="#38bdf8" opacity={0.4 + i * 0.08} style={i === 4 ? { filter: "drop-shadow(0 0 3px #38bdf8)" } : {}} />
    ))}
  </svg>
);

const GuildShield = () => (
  <svg width="30" height="36" viewBox="0 0 30 36" fill="none" style={{ filter: "drop-shadow(0 0 8px rgba(168,85,247,0.5))" }}>
    <path d="M2 2 L28 2 L28 22 L15 34 L2 22 Z" fill="rgba(15,23,42,0.9)" stroke="#a855f7" strokeWidth="1.5" />
    <circle cx="15" cy="15" r="7" fill="rgba(56,189,248,0.1)" stroke="#38bdf8" strokeWidth="1" />
    <path d="M15 10 L17 14 L21 15 L18 18 L19 22 L15 20 L11 22 L12 18 L9 15 L13 14 Z" fill="#38bdf8" />
  </svg>
);

const MapIcon3D = () => (
  <svg width="36" height="36" viewBox="0 0 40 40" fill="none" style={{ filter: "drop-shadow(0 0 8px rgba(168,85,247,0.5))" }}>
    <path d="M6 10 L16 6 L24 10 L34 6 L34 30 L24 34 L16 30 L6 34 Z" fill="rgba(13,21,38,0.85)" stroke="#a855f7" strokeWidth="1.5" />
    <line x1="16" y1="6" x2="16" y2="30" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="2 2" />
    <line x1="24" y1="10" x2="24" y2="34" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="2 2" />
    <path d="M9 20 C16 15 24 25 31 18" stroke="#ec4899" strokeWidth="1.5" fill="none" />
    <circle cx="20" cy="20" r="3" fill="#38bdf8" stroke="#fff" strokeWidth="1" />
  </svg>
);

const StageCrystal = ({ color, fill, glow, active }) => (
  <div style={{
    width: 40, height: 40, borderRadius: "50%",
    background: "rgba(8,12,26,0.95)", border: `2px solid ${color}`,
    boxShadow: active ? `0 0 18px ${glow}, 0 0 6px ${color}` : "none",
    display: "flex", alignItems: "center", justifyContent: "center",
    animation: active ? "nodePulse 2s ease-in-out infinite" : "none",
  }}>
    <div style={{
      width: 16, height: 20,
      background: `linear-gradient(135deg, ${color}, ${fill})`,
      clipPath: "polygon(50% 0%, 100% 35%, 75% 100%, 25% 100%, 0% 35%)",
      filter: `drop-shadow(0 0 4px ${color})`,
    }} />
  </div>
);

const STAGE_VISUALS = [
  { key: "discover", name: "Discover", color: "#c084fc", fill: "#9333ea", glow: "#a855f7" },
  { key: "validate", name: "Validate", color: "#38bdf8", fill: "#0369a1", glow: "#0284c7" },
  { key: "build", name: "Build", color: "#2dd4bf", fill: "#115e59", glow: "#0f766e" },
  { key: "launch", name: "Launch", color: "#fbbf24", fill: "#854d0e", glow: "#b45309" },
  { key: "scale", name: "Scale", color: "#f472b6", fill: "#9d174d", glow: "#be185d" },
];

const BadgeIcon = ({ icon, color }) => (
  <div style={{
    width: 36, height: 36, borderRadius: "50%",
    background: `radial-gradient(circle at 35% 35%, ${color}55 0%, ${color}22 100%)`,
    border: `1.5px solid ${color}88`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "1rem", boxShadow: `0 0 12px ${color}55`,
  }}>{icon}</div>
);

const ACHIEVEMENT_ICONS = {
  "First Quest Completed": { icon: "🏆", color: "#fbbf24" },
  "First Milestone Completed": { icon: "⚡", color: "#c084fc" },
  "First Level Completed": { icon: "🚀", color: "#38bdf8" },
  "First Stage Completed": { icon: "🌟", color: "#10b981" },
};
const DEFAULT_ACH_ICONS = ["🎯", "🛡️", "⚔️", "🧭", "💎", "🔮"];
const DEFAULT_ACH_COLORS = ["#f472b6", "#38bdf8", "#fbbf24", "#10b981", "#c084fc", "#2dd4bf"];

export const DashboardPage = () => {
  const [progress, setProgress] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [events, setEvents] = useState([]);
  const [guild, setGuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [retry, setRetry] = useState(0);
  const loadPrimary = useCallback(() => setRetry(value => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setProgress(null);
    setRoadmap(null);
    setAchievements([]);
    setEvents([]);
    setGuild(null);
    api.getProgress().then(res => {
      if (active) setProgress(res.data);
    }).catch(err => {
      if (active) setError(err.message || "Failed to load dashboard");
    }).finally(() => {
      if (active) setLoading(false);
    });
    const secondary = [
      [api.getRoadmap(), value => setRoadmap(value)],
      [api.getAchievements(), value => setAchievements(Array.isArray(value) ? value.filter(ach => ach.is_earned) : [])],
      [api.getAnnouncements({ type: 'event' }), value => setEvents(Array.isArray(value) ? value
        .filter(event => event.event_date && new Date(event.event_date) >= new Date())
        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date)) : [])],
      [api.getMyGuild(), value => setGuild(value)],
    ];
    secondary.forEach(([request, update]) => {
      request.then(res => { if (active) update(res.data); }).catch(() => {});
    });
    return () => { active = false; };
  }, [user?.id, retry]);

  const {
    profile, current_stage, current_level, current_milestone,
    milestone_progress_percentage: milestonePct = 0,
    core_quests_completed: cqCompleted = 0,
    core_quests_total: cqTotal = 0,
    overall_progress_percentage: overallPct = 0,
    total_points: pts = 0,
    next_quest,
  } = progress || {};

  const domainName = profile?.domains?.name || roadmap?.domain?.name || "—";
  const stageName = current_stage?.name || "—";
  const levelOrder = current_level?.level_order || 1;
  const milestoneName = current_milestone?.name || "—";
  const questTitle = next_quest?.title || "No active quest";
  const questDesc = next_quest?.description || "";

  const stageList = (roadmap?.stages?.length ? roadmap.stages : STAGE_VISUALS).map((s, i) => {
    const vis = STAGE_VISUALS.find(v =>
      v.key === (s.slug || s.key) || v.name.toLowerCase() === (s.name || "").toLowerCase()
    ) || STAGE_VISUALS[i] || STAGE_VISUALS[0];
    return {
      ...vis, dbName: s.name || vis.name,
      isCurrent: (current_stage?.name || "").toLowerCase() === (s.name || "").toLowerCase(),
      isCompleted: s.is_completed
    };
  });

  const guildName = guild?.guild?.name || guild?.name || profile?.guilds?.name || "Domain Guild";
  const guildMembers = guild?.member_count || guild?.guild_members || 0;
  const guildOnline = guild?.online_count ?? "?";

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 14 }}>
      <div className="spinner" />
      <span style={{ fontSize: "0.97rem", color: "#94a3b8", fontWeight: 700 }}>Initializing HUD…</span>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div className="glass-card" style={{ padding: "28px", textAlign: "center", color: "#ef4444", maxWidth: 400 }}>
        <p style={{ marginBottom: 14 }}>{error}</p>
        <button className="btn btn-primary" onClick={loadPrimary}>Retry</button>
      </div>
    </div>
  );

  const fc = (border, shadow) => ({
    padding: "10px 14px", borderRadius: 14,
    background: "rgba(10,15,30,0.85)",
    border: `1px solid ${border}`,
    boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 14px ${shadow}`,
    display: "flex", flexDirection: "column", justifyContent: "space-between",
  });

  return (
    <>
      <style>{`
        @keyframes crystalPulse {
          0%,100%{filter:drop-shadow(0 0 20px rgba(168,85,247,.8))}
          50%{filter:drop-shadow(0 0 32px rgba(168,85,247,1)) drop-shadow(0 0 12px rgba(192,132,252,.6))}
        }
        @keyframes nodePulse {
          0%,100%{box-shadow:0 0 18px rgba(168,85,247,.6),0 0 6px rgba(192,132,252,.5)}
          50%{box-shadow:0 0 28px rgba(168,85,247,.9),0 0 14px rgba(192,132,252,.7)}
        }
        .dashboard-hud .hud-btn:hover{opacity:.85;transform:translateY(-1px);}
        .dashboard-hud .stat-card:hover{transform:translateY(-2px);}
      `}</style>
      <div className="dashboard-hud" style={{
        display: "flex", flexDirection: "column", gap: 14,
        padding: "14px 16px", color: "#f8fafc", boxSizing: "border-box",
      }}>

        {/* ROW 1 — HUD BAR */}
        <header className="dashboard-hud__bar" style={{
          minHeight: 48, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 18px", background: "rgba(8,12,26,0.92)", borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div onClick={() => navigate("/roadmap")} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 8,
              background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.35)", cursor: "pointer"
            }}>
              <Compass size={14} color="#c084fc" />
              <span style={{ fontSize: "0.89rem", fontWeight: 800, color: "#fff", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {domainName.toUpperCase()}
              </span>
              <ChevronDown size={13} color="#94a3b8" />
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 9999,
              background: "rgba(168,85,247,0.13)", border: "1px solid rgba(168,85,247,0.35)"
            }}>
              <Shield size={12} color="#c084fc" />
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#e9d5ff", textTransform: "uppercase" }}>{stageName} Stage</span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 9999,
              background: "rgba(251,191,36,0.11)", border: "1px solid rgba(251,191,36,0.35)"
            }}>
              <Award size={12} color="#fbbf24" />
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#fef08a", textTransform: "uppercase" }}>Level {levelOrder}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <FloatingXp points={pts} />
            <button aria-label="Notifications" onClick={() => navigate("/notifications")} style={{ background: "none", border: "none", color: "var(--accent-cyan)", cursor: "pointer", display: "flex", padding: 4 }}>
              <Bell size={16} />
            </button>
          </div>
        </header>

        {/* ROW 2 — HERO */}
        <section className="dashboard-hud__hero" style={{
          flexShrink: 0, minHeight: 190, borderRadius: 16, padding: "12px 18px",
          background: "rgba(10,15,30,0.88)", border: "1.5px solid rgba(124,58,237,0.38)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.6), 0 0 22px rgba(124,58,237,0.18)",
          display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)", gap: 16, alignItems: "center", overflow: "hidden",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <HeroCrystal />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Current Milestone</div>
              <h2 style={{
                fontSize: "1.36rem", fontWeight: 900, color: "#fff", margin: "0 0 4px 0",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
              }}>{milestoneName}</h2>
              <p style={{
                fontSize: "0.83rem", color: "#94a3b8", margin: "0 0 8px 0", lineHeight: 1.3,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"
              }}>
                Milestone for level {levelOrder} of {stageName} stage in {domainName}
              </p>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ color: "#cbd5e1" }}>Progress ({cqCompleted}/{cqTotal} Core Quests)</span>
                  <span style={{ color: "#38bdf8", fontWeight: 800 }}>{milestonePct}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 9999, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.min(100, Math.max(0, milestonePct))}%`, height: "100%",
                    background: "linear-gradient(90deg,#38bdf8,#818cf8)",
                    boxShadow: "0 0 10px rgba(56,189,248,0.7)", borderRadius: 9999, transition: "width 0.8s ease"
                  }} />
                </div>
              </div>
            </div>
          </div>
          <div style={{
            height: "100%", borderRadius: 12, border: "1px solid rgba(56,189,248,0.3)",
            backgroundImage: 'linear-gradient(to right,rgba(8,14,30,0.97) 0%,rgba(8,14,30,0.65) 50%,rgba(8,14,30,0.35) 100%), url("/dashboard-bg.png")',
            backgroundSize: "cover", backgroundPosition: "center right",
            padding: "10px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>CURRENT QUEST</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 4,
                  background: "rgba(168,85,247,0.25)", border: "1px solid #c084fc",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <Sparkles size={11} color="#c084fc" />
                </div>
                <span style={{
                  fontSize: "1.01rem", fontWeight: 800, color: "#fff",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200
                }}>{questTitle}</span>
              </div>
              {questDesc && (
                <p style={{
                  fontSize: "0.78rem", color: "#cbd5e1", margin: "0 0 4px 0", lineHeight: 1.25,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"
                }}>{questDesc}</p>
              )}
            </div>
            <button onClick={() => current_milestone?.id ? navigate(`/roadmap/milestones/${current_milestone.id}`) : navigate("/roadmap")}
              style={{
                alignSelf: "flex-start", padding: "6px 14px", borderRadius: 8,
                background: "linear-gradient(135deg,#0284c7,#38bdf8)",
                border: "1px solid rgba(56,189,248,0.6)", color: "#fff",
                fontSize: "0.9rem", fontWeight: 800,
                boxShadow: "0 0 16px rgba(56,189,248,0.55)",
                display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", transition: "all 0.2s",
              }}>
              Continue Current Quest <ArrowRight size={13} />
            </button>
          </div>
        </section>

        {/* ROW 3 — STATS */}
        <section className="dashboard-hud__stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, flexShrink: 0, minHeight: 100 }}>
          <div className="stat-card" onClick={() => navigate("/leaderboard")} style={{
            padding: "6px 14px", borderRadius: 12, cursor: "pointer",
            background: "rgba(10,16,32,0.85)", border: "1px solid rgba(251,191,36,0.32)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4), 0 0 14px rgba(251,191,36,0.14)",
            display: "flex", alignItems: "center", justifyContent: "space-between", transition: "transform 0.2s",
          }}>
            <GoldCoins />
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3, fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>
                LABX COINS <ChevronRight size={11} />
              </div>
              <div style={{ fontSize: "1.42rem", fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>{pts.toLocaleString()}</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Founder Coins</div>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate("/roadmap")} style={{
            padding: "6px 14px", borderRadius: 12, cursor: "pointer",
            background: "rgba(10,16,32,0.85)", border: "1px solid rgba(56,189,248,0.32)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4), 0 0 14px rgba(56,189,248,0.14)",
            display: "flex", alignItems: "center", justifyContent: "space-between", transition: "transform 0.2s",
          }}>
            <RingProgress pct={overallPct} size={40} sw={4} />
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>OVERALL PROGRESS</div>
              <div style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 700 }}>Roadmap Stages</div>
            </div>
            <MiniBars />
          </div>
          <div className="stat-card" onClick={() => navigate("/guild")} style={{
            padding: "6px 14px", borderRadius: 12, cursor: "pointer",
            background: "rgba(10,16,32,0.85)", border: "1px solid rgba(168,85,247,0.32)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4), 0 0 14px rgba(168,85,247,0.14)",
            display: "flex", alignItems: "center", gap: 10, transition: "transform 0.2s",
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: "rgba(56,189,248,0.14)", border: "1px solid rgba(56,189,248,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
            }}>
              <Users size={15} color="#38bdf8" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>DOMAIN GUILD</div>
              <div style={{
                fontSize: "0.94rem", fontWeight: 800, color: "#fff",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
              }}>{guildName}</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Founder Community</div>
            </div>
            <GuildShield />
          </div>
          <div className="stat-card" onClick={() => navigate("/roadmap")} style={{
            padding: "6px 14px", borderRadius: 12, cursor: "pointer",
            background: "rgba(10,16,32,0.85)", border: "1px solid rgba(168,85,247,0.32)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4), 0 0 14px rgba(168,85,247,0.14)",
            display: "flex", alignItems: "center", justifyContent: "space-between", transition: "transform 0.2s",
          }}>
            <MapIcon3D />
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3, fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>
                INTERACTIVE ROADMAP <ChevronRight size={11} />
              </div>
              <div style={{ fontSize: "1.42rem", fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>
                {roadmap?.stages?.length ?? "?"} Stages
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                {roadmap?.stages?.reduce((a, s) => a + (s.levels?.length || 0), 0) ?? "?"} Levels
              </div>
            </div>
          </div>
        </section>

        {/* ROW 4 — JOURNEY + ACTIONS + GUILD */}
        <section className="dashboard-hud__middle" style={{ minHeight: 240, display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr)", gap: 10 }}>
          <div style={fc("rgba(56,189,248,0.22)", "rgba(56,189,248,0.08)")}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Compass size={13} color="#38bdf8" />
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.06em" }}>ROADMAP JOURNEY</span>
              </div>
              <ChevronRight size={13} color="#64748b" style={{ cursor: "pointer" }} onClick={() => navigate("/roadmap")} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px", position: "relative" }}>
              <div style={{
                position: "absolute", top: 20, left: 24, right: 24, height: 2,
                background: "linear-gradient(90deg,#c084fc,#38bdf8,#2dd4bf,#fbbf24,#f472b6)",
                opacity: 0.55, zIndex: 1
              }} />
              {stageList.map((st) => (
                <div key={st.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2, cursor: "pointer" }}
                  onClick={() => navigate("/roadmap")}>
                  <StageCrystal color={st.color} fill={st.fill} glow={st.glow} active={st.isCurrent} />
                  <span style={{ fontSize: "0.76rem", fontWeight: 800, color: st.isCurrent ? "#fff" : "#94a3b8", marginTop: 4 }}>{st.dbName}</span>
                  <span style={{ fontSize: "0.75rem", color: st.isCurrent ? st.color : "#64748b", fontWeight: 700 }}>
                    {st.isCompleted ? "Done" : st.isCurrent ? "→ Active" : "Locked"}
                  </span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate("/roadmap")} className="hud-btn" style={{
              width: "100%", padding: "6px", borderRadius: 8,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#cbd5e1", fontSize: "0.8rem", fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              cursor: "pointer", transition: "all 0.2s",
            }}>View Full Roadmap <ArrowRight size={11} /></button>
          </div>

          <div style={fc("rgba(251,191,36,0.22)", "rgba(251,191,36,0.08)")}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Zap size={13} color="#fbbf24" />
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.06em" }}>NEXT ACTION ITEMS</span>
              </div>
              <ChevronRight size={13} color="#64748b" style={{ cursor: "pointer" }} onClick={() => navigate("/roadmap")} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {[
                { title: questTitle, status: "current", color: "#38bdf8" },
              ].map((q, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "5px 8px", borderRadius: 7,
                  background: q.status === "current" ? "rgba(56,189,248,0.1)" : "rgba(255,255,255,0.02)",
                  border: q.status === "current" ? "1px solid rgba(56,189,248,0.3)" : "1px solid transparent",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 4,
                      background: `${q.color}22`, border: `1px solid ${q.color}66`,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <Sparkles size={9} color={q.color} />
                    </div>
                    <span style={{
                      fontSize: "0.83rem", fontWeight: 700, color: q.status === "locked" ? "#94a3b8" : "#fff",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120
                    }}>{q.title}</span>
                  </div>
                  {q.status === "done" ? <CheckCircle2 size={13} color="#10b981" />
                    : q.status === "current" ? <ArrowRight size={13} color="#38bdf8" />
                      : <Lock size={12} color="#64748b" />}
                </div>
              ))}
            </div>
            <button onClick={() => current_milestone?.id ? navigate(`/roadmap/milestones/${current_milestone.id}`) : navigate("/roadmap")}
              className="hud-btn" style={{
                width: "100%", padding: "6px", borderRadius: 8,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#cbd5e1", fontSize: "0.8rem", fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                cursor: "pointer", transition: "all 0.2s",
              }}>View All Quests <ArrowRight size={11} /></button>
          </div>

          <div style={fc("rgba(168,85,247,0.22)", "rgba(168,85,247,0.08)")}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={13} color="#c084fc" />
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.06em" }}>GUILD COMMUNITY</span>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ display: "flex" }}>
                  {["#38bdf8", "#c084fc", "#fbbf24", "#10b981"].map((c, i) => (
                    <div key={i} style={{
                      width: 20, height: 20, borderRadius: "50%", background: c,
                      border: "1.5px solid #0a0f1e", marginLeft: i === 0 ? 0 : -6,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.75rem", fontWeight: 900, color: "#fff", zIndex: 4 - i
                    }}>
                      <Users size={11} />
                    </div>
                  ))}
                </div>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", lineHeight: 1.2 }}>Connect with fellow founders</span>
              </div>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4,
                textAlign: "center", padding: "4px 0",
                borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)"
              }}>
                {[{ v: guildMembers, l: "Members", c: "#fff" }, { v: guildOnline, l: "Online", c: "#34d399" }, { v: guild?.posts_today ?? "?", l: "Posts Today", c: "#38bdf8" }].map((s, i) => (
                  <div key={i}>
                    <div style={{ fontSize: "0.97rem", fontWeight: 900, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", background: "#6366f1",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.75rem", fontWeight: 800, color: "#fff", flexShrink: 0
                }}>A</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#fff" }}>
                    Aarav Sharma <span style={{ color: "#64748b", fontWeight: 500 }}>· 2h ago</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Completed the Research Problem quest! 🚀
                  </div>
                </div>
              </div>
            </div>
            <button onClick={() => navigate("/guild")} className="hud-btn" style={{
              width: "100%", padding: "6px", borderRadius: 8,
              background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.35)",
              color: "#e9d5ff", fontSize: "0.8rem", fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              cursor: "pointer", transition: "all 0.2s",
            }}>Enter Guild Chat <ArrowRight size={11} /></button>
          </div>
        </section>

        {/* ROW 5 — ACHIEVEMENTS + EVENTS */}
        <section className="dashboard-hud__bottom" style={{ flexShrink: 0, minHeight: 165, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
          <div style={fc("rgba(251,191,36,0.22)", "rgba(251,191,36,0.08)")}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Trophy size={13} color="#fbbf24" />
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.06em" }}>RECENT ACHIEVEMENTS</span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, cursor: "pointer" }}
                onClick={() => navigate("/achievements")}>View All →</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
              {achievements.length === 0 && <p className="dashboard-hud__empty">Complete quests to earn your first achievement.</p>}
              {achievements.slice(0, 4).map((ach, i) => {
                const vis = ACHIEVEMENT_ICONS[ach.name] || { icon: DEFAULT_ACH_ICONS[i % 6], color: DEFAULT_ACH_COLORS[i % 6] };
                return (
                  <div key={i} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "6px 4px", borderRadius: 8,
                    background: "rgba(255,255,255,0.03)", border: `1px solid ${vis.color}33`, textAlign: "center",
                  }}>
                    <BadgeIcon icon={vis.icon} color={vis.color} />
                    <div style={{
                      fontSize: "0.75rem", fontWeight: 800, color: "#fff",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%"
                    }}>{ach.name}</div>
                    <div style={{
                      fontSize: "0.75rem", color: "#64748b", lineHeight: 1.1,
                      display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden", width: "100%"
                    }}>{ach.description}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dashboard-events" style={fc("rgba(56,189,248,0.22)", "rgba(56,189,248,0.08)")}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={13} color="#38bdf8" />
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.06em" }}>UPCOMING EVENTS</span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, cursor: "pointer" }}
                onClick={() => navigate("/events")}>View All →</span>
            </div>
            <div className="dashboard-events__list">
              {events.length === 0 && <p className="dashboard-hud__empty">No upcoming events scheduled.</p>}
              {events.slice(0, 2).map((ev) => {
                const d = ev.event_date ? new Date(ev.event_date) : null;
                const dayStr = d ? String(d.getDate()).padStart(2, "0") : "?";
                const monStr = d ? d.toLocaleString("en", { month: "short" }).toUpperCase() : "?";
                return (
                  <button type="button" className="dashboard-events__item" key={ev.id} onClick={() => navigate("/events")} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(56,189,248,0.2)",
                  }}>
                    <div style={{
                      padding: "4px 8px", borderRadius: 7, flexShrink: 0,
                      background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.4)", textAlign: "center"
                    }}>
                      <div style={{ fontSize: "0.94rem", fontWeight: 900, color: "#38bdf8", lineHeight: 1 }}>{dayStr}</div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8" }}>{monStr}</div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: "0.83rem", fontWeight: 800, color: "#fff",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                      }}>{ev.title}</div>
                      <div style={{
                        fontSize: "0.75rem", color: "#94a3b8",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 2
                      }}>{ev.description}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "#38bdf8" }}>
                        <Clock size={10} /> {ev.event_time || "—"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

      </div>
    </>
  );
};

export default DashboardPage;
