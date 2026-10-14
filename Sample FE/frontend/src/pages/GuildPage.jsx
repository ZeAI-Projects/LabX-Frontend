import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  Send,
  Sparkles,
  Crown,
  Layers3,
  Target,
  Flag,
  Radio,
  Smile,
  Zap,
  Flame,
  Lightbulb,
  Rocket,
  ThumbsUp,
  MessageSquare,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Navbar } from '../components/common/Navbar';
import { useAuth } from '../contexts/useAuth';
import { api } from '../services/api';
import { soundManager } from '../components/auth/gamified/soundEffects';
import './GuildHub.css';

const LEVEL_TITLES = ['Pathfinder', 'Learner', 'Builder', 'Collaborator', 'Vanguard'];

const QUICK_EMOJIS = ['🚀', '🔥', '💡', '⚡', '👏', '🤝', '🎯', '💯'];

export const GuildPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assessment, setAssessment] = useState(null);
  const [guildInfo, setGuildInfo] = useState(null);
  const [members, setMembers] = useState([]);
  const [progress, setProgress] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const followMessagesRef = useRef(true);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    loadGuildData();

    // Periodic polling to receive live community messages from peers
    const interval = setInterval(() => {
      fetchMessagesSilently();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container && followMessagesRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, loading]);

  const loadGuildData = async () => {
    setLoading(true);
    try {
      const [assessmentRes, guildRes, membersRes, progressRes, messagesRes] = await Promise.allSettled([
        api.getAssessmentStatus(),
        api.getMyGuild(),
        api.getGuildMembers({ per_page: 15 }),
        api.getProgress(),
        api.getGuildMessages({ limit: 50 }),
      ]);

      if (assessmentRes.status === 'fulfilled') setAssessment(assessmentRes.value.data?.assessment);
      if (guildRes.status === 'fulfilled') setGuildInfo(guildRes.value.data);
      if (membersRes.status === 'fulfilled') setMembers(membersRes.value.data || []);
      if (progressRes.status === 'fulfilled') setProgress(progressRes.value.data);
      if (messagesRes.status === 'fulfilled') setMessages(messagesRes.value.data || []);
    } catch (err) {
      console.error('Error loading guild data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessagesSilently = async () => {
    try {
      const res = await api.getGuildMessages({ limit: 50 });
      if (res.data) {
        setMessages(previous => JSON.stringify(previous) === JSON.stringify(res.data) ? previous : res.data);
      }
    } catch (err) {
      // silent catch for background polling
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || sending) return;

    const content = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      soundManager.playWarpLaunch();
      const res = await api.sendGuildMessage({ content });

      if (res.data) {
        followMessagesRef.current = true;
        setMessages((prev) => [...prev, res.data]);
      } else {
        fetchMessagesSilently();
      }
    } catch (err) {
      console.error('Failed to send guild message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleEmojiClick = (emoji) => {
    soundManager.playHover();
    setMessageText((prev) => prev + emoji);
  };

  if (loading) {
    return (
      <div className="guild-hub guild-hub--loading">
        <div className="spinner" />
      </div>
    );
  }

  const level = assessment?.calculated_level || progress?.current_level?.level_number || 1;
  const guild = guildInfo?.guild;
  const domain = guild?.domains?.name || assessment?.calculated_domain || user?.domains?.name || 'Technology';
  const stage = assessment?.calculated_stage || progress?.current_stage?.name || 'Stage 1 Explorer';
  const levelTitle = LEVEL_TITLES[Math.min(Math.max(level, 1), 5) - 1];
  const milestone = progress?.current_milestone?.name || 'Founder Milestone';
  const milestoneProgress = progress?.milestone_progress_percentage || 0;
  const domainSlug = domain.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <div className="guild-hub">
      <Navbar title={`${domain} Guild`} />

      {/* =========================================================
          HERO BANNER (Personalized for user's domain)
      ========================================================= */}
      <section className="guild-hero">
        <div className="guild-hero__orb">
          <Shield size={36} />
          <span className="live-status-dot" title="Live Frequency" />
        </div>

        <div className="guild-hero__copy">
          <div className="guild-hero__eyebrow">
            <Radio size={14} className="live-radar-icon" />
            <span>EXCLUSIVE DOMAIN GUILD COMMUNITY</span>
          </div>

          <h1>{guild?.name || `${domain} Guild Community`}</h1>
          <p>
            Private community lounge for <strong>{domain}</strong> founders. Connect with peers who share your market focus, exchange insights, and collaborate.
          </p>

          <div className="guild-hero__tags">
            <span className="guild-tag tag-level">
              <Crown size={14} /> Level {level} · {levelTitle}
            </span>
            <span className="guild-tag tag-stage">
              <Layers3 size={14} /> {stage}
            </span>
            <span className="guild-tag tag-members">
              <Users size={14} /> {guildInfo?.member_count || members.length || 1} Domain Founders
            </span>
          </div>
        </div>

        <div className="guild-hero__level">
          <small>DOMAIN FREQUENCY</small>
          <strong>#{domainSlug}</strong>
          <span>ONLINE COMMUNITY</span>
        </div>
      </section>

      {/* =========================================================
          COMMUNITY GRID: LEFT (ROSTER & STATS) + RIGHT (CHAT)
      ========================================================= */}
      <div className="guild-dashboard-grid">
        {/* ================= LEFT SIDEBAR ================= */}
        <aside className="guild-side-panel">
          {/* Active Domain Founders Roster */}
          <article className="guild-widget guild-widget--members">
            <div className="guild-widget__title">
              <Users size={16} />
              <span>Domain Founders</span>
              <em>{guildInfo?.member_count || members.length} Active</em>
            </div>

            <p className="guild-widget-sub">
              Founders aligned in the <strong>{domain}</strong> sector.
            </p>

            <div className="guild-party">
              {members.length ? (
                members.map((member, index) => {
                  const memberProfile = member.profiles || member || {};
                  const isCurrentUser = memberProfile.id === user?.id;
                  const name = memberProfile.full_name || memberProfile.username || 'Founder';
                  const initials = name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      className={`guild-member ${isCurrentUser ? 'is-self' : ''}`}
                      key={memberProfile.id || index}
                      onClick={() => {
                        if (memberProfile.id) {
                          soundManager.playHover();
                          navigate(`/profile/${memberProfile.id}`);
                        }
                      }}
                      title="View founder profile"
                    >
                      <div className="guild-member__avatar">
                        {memberProfile.avatar_url ? (
                          <img src={memberProfile.avatar_url} alt={name} />
                        ) : (
                          initials
                        )}
                        <span className="member-online-dot" />
                      </div>

                      <div className="guild-member__info">
                        <div className="guild-member__name-row">
                          <strong>{name}</strong>
                          {isCurrentUser && <span className="you-chip">YOU</span>}
                        </div>
                        <span>@{memberProfile.username || 'founder'}</span>
                      </div>

                      <ChevronRight size={14} className="member-arrow" />
                    </div>
                  );
                })
              ) : (
                <div className="guild-party__empty">
                  <Users size={24} />
                  <p>You are the first pioneer in this domain guild!</p>
                </div>
              )}
            </div>
          </article>

          {/* Current Milestone Objective */}
          <article className="guild-widget guild-widget--mission">
            <div className="guild-widget__title">
              <Target size={16} />
              <span>Current Objective</span>
            </div>
            <h3>{milestone}</h3>
            <p>Your team's active roadmap milestone from LabX.</p>
            <div className="guild-progress">
              <div style={{ width: `${milestoneProgress}%` }} />
            </div>
            <div className="guild-progress__label">
              <span>Milestone Progress</span>
              <strong>{milestoneProgress}%</strong>
            </div>
          </article>

          {/* Domain Identity */}
          <article className="guild-widget guild-widget--identity">
            <div className="guild-widget__title">
              <Flag size={16} />
              <span>Domain Identity</span>
            </div>
            <dl>
              <div>
                <dt>Domain Realm</dt>
                <dd className="accent-cyan">{domain}</dd>
              </div>
              <div>
                <dt>Current Stage</dt>
                <dd className="accent-purple">{stage}</dd>
              </div>
              <div>
                <dt>Founder Class</dt>
                <dd className="accent-amber">{levelTitle}</dd>
              </div>
            </dl>
          </article>
        </aside>

        {/* ================= RIGHT COMMUNITY CHAT ROOM ================= */}
        <main className="guild-chat-container">
          {/* Chat Room Header */}
          <div className="guild-chat-header">
            <div className="chat-header-left">
              <div className="chat-channel-badge">
                <Radio size={14} className="chat-radio-pulse" />
                <span>#{domainSlug}-founders</span>
              </div>
              <span className="chat-channel-desc">
                Live frequency channel for {domain} founders
              </span>
            </div>

            <div className="chat-header-right">
              <span className="chat-live-pulse">
                <span className="pulse-dot" />
                COMMUNITY ONLINE
              </span>
            </div>
          </div>

          {/* Messages Stream Feed */}
          <div className="guild-messages-feed" ref={chatContainerRef} onScroll={(event) => {
            const container = event.currentTarget;
            followMessagesRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 48;
          }}>
            {messages.length === 0 ? (
              <div className="chat-welcome-state">
                <div className="welcome-icon-wrap">
                  <MessageSquare size={36} />
                </div>
                <h3>Welcome to the #{domainSlug} Lounge!</h3>
                <p>
                  This is the dedicated community channel for founders in the{' '}
                  <strong>{domain}</strong> domain.
                </p>
                <span className="welcome-prompt">
                  Say hello to your fellow {domain} founders and start the conversation below! 👇
                </span>
              </div>
            ) : (
              messages.map((msg, index) => {
                const author = msg.profiles || {};
                const isSelf = author.id === user?.id || msg.user_id === user?.id;
                const authorName = author.full_name || (isSelf ? user?.full_name : 'Founder');
                const initials = authorName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                const timeStr = msg.created_at
                  ? new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';

                return (
                  <div
                    key={msg.id || index}
                    className={`guild-chat-message ${isSelf ? 'message--self' : 'message--peer'}`}
                  >
                    {!isSelf && (
                      <div
                        className="message-avatar"
                        onClick={() => author.id && navigate(`/profile/${author.id}`)}
                        title={`View ${authorName}'s profile`}
                      >
                        {author.avatar_url ? (
                          <img src={author.avatar_url} alt={authorName} />
                        ) : (
                          initials
                        )}
                      </div>
                    )}

                    <div className="message-content-wrap">
                      <div className="message-header-line">
                        <strong
                          className="author-name"
                          onClick={() => !isSelf && author.id && navigate(`/profile/${author.id}`)}
                        >
                          {authorName}
                        </strong>

                        {isSelf ? (
                          <span className="message-you-badge">YOU</span>
                        ) : (
                          <span className="message-domain-badge">{domain}</span>
                        )}

                        <span className="message-time">
                          <Clock size={11} /> {timeStr}
                        </span>
                      </div>

                      <div className="message-bubble">
                        <p>{msg.content}</p>
                      </div>
                    </div>

                    {isSelf && (
                      <div className="message-avatar message-avatar--self">
                        {user?.avatar_url ? (
                          <img src={user.avatar_url} alt={authorName} />
                        ) : (
                          initials
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Reaction Emojis Row */}
          <div className="guild-chat-reactions-bar">
            <span className="reactions-label">Quick Transmit:</span>
            <div className="reactions-list">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  className="reaction-emoji-btn"
                  onClick={() => handleEmojiClick(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Message Input Form */}
          <form className="guild-chat-input-bar" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="chat-text-input"
              placeholder={`Message #${domainSlug}-founders...`}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              disabled={sending}
            />

            <button
              type="submit"
              className="btn-chat-send"
              disabled={!messageText.trim() || sending}
              onMouseEnter={soundManager.playHover}
            >
              <span>{sending ? 'Sending...' : 'Send'}</span>
              <Send size={16} />
            </button>
          </form>
        </main>
      </div>
    </div>
  );
};
