import React, { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/useAuth';
import { Navbar } from '../components/common/Navbar';
import { Heart, MessageCircle, Plus, UserPlus, UserCheck, Send, Search, AlertCircle, RefreshCw, Compass, Shield, Radio, Sparkles } from 'lucide-react';
import { soundManager } from '../components/auth/gamified/soundEffects';
import './SocialPage.css';
import { useEscapeKey } from '../hooks/useEscapeKey';

export const SocialPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'explore' | 'people'
  
  // Feed & Explore State
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [posting, setPosting] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

  // People Tab State
  const [people, setPeople] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingMap, setActionLoadingMap] = useState({});

  useEscapeKey(showCreateModal || Boolean(activeCommentPost), () => {
    setShowCreateModal(false);
    setActiveCommentPost(null);
  });

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = activeTab === 'feed' ? await api.getFeed() : await api.getExplore();
      setPosts(res.data || []);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const fetchPeople = useCallback(async () => {
    setPeopleLoading(true);
    setPeopleError(null);
    try {
      const res = await api.getPeople({ search: searchQuery });
      setPeople(res.data || []);
    } catch (err) {
      console.error('Error fetching people:', err);
      setPeopleError(err.message || 'Unable to load founders');
    } finally {
      setPeopleLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (activeTab !== 'people') fetchPosts();
  }, [activeTab, fetchPosts]);

  useEffect(() => {
    if (activeTab !== 'people') return undefined;
    const timer = setTimeout(fetchPeople, 300);
    return () => clearTimeout(timer);
  }, [activeTab, fetchPeople]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newContent.trim() || posting) return;

    setPosting(true);
    try {
      await api.createPost({ content: newContent, image_url: newImageUrl });
      soundManager.playWarpLaunch();
      setNewContent('');
      setNewImageUrl('');
      setShowCreateModal(false);
      fetchPosts();
    } catch (err) {
      alert(err.message || 'Failed to broadcast post');
    } finally {
      setPosting(false);
    }
  };

  const handleLikeToggle = async (postId) => {
    try {
      const res = await api.toggleLike(postId);
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              is_liked: res.data.is_liked,
              likes_count: res.data.likes_count,
            };
          }
          return p;
        })
      );
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleOpenComments = async (post) => {
    setActiveCommentPost(post);
    try {
      const res = await api.getComments(post.id);
      setComments(res.data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !activeCommentPost) return;

    try {
      const res = await api.addComment(activeCommentPost.id, { content: commentText });
      setComments((prev) => [...prev, res.data]);
      setCommentText('');
      setUserPosts((prev) =>
        prev.map((p) => (p.id === activeCommentPost.id ? { ...p, comments_count: p.comments_count + 1 } : p))
      );
    } catch (err) {
      alert(err.message || 'Failed to post comment');
    }
  };

  const handlePostFollowToggle = async (authorId, currentlyFollowing) => {
    try {
      if (currentlyFollowing) {
        await api.unfollowUser(authorId);
      } else {
        await api.followUser(authorId);
      }
      fetchPosts();
    } catch (err) {
      alert(err.message || 'Follow action failed');
    }
  };

  const handlePersonFollowToggle = async (targetId, currentlyFollowing) => {
    if (actionLoadingMap[targetId]) return;

    setActionLoadingMap((prev) => ({ ...prev, [targetId]: true }));
    try {
      if (currentlyFollowing) {
        await api.unfollowUser(targetId);
      } else {
        await api.followUser(targetId);
      }

      setPeople((prev) =>
        prev.map((p) => (p.id === targetId ? { ...p, is_following: !currentlyFollowing } : p))
      );
    } catch (err) {
      alert(err.message || 'Follow action failed');
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [targetId]: false }));
    }
  };

  return (
    <div
      className="social-page founder-world founder-world--social"
      style={{ position: 'relative', minHeight: '100vh', paddingBottom: '100px' }}
    >
      <div className="founder-world__backdrop" aria-hidden="true" />
      <Navbar title="Founder Holo-Net" />

      {/* Header Actions & Futuristic Tab Bar */}
      <div className="social-command-bar">
        <div className="social-tabs">
          <button
            type="button"
            className={`btn ${activeTab === 'feed' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 850 }}
            onClick={() => {
              soundManager.playHover();
              setActiveTab('feed');
            }}
          >
            <Radio size={15} /> Network Feed
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'explore' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 850 }}
            onClick={() => {
              soundManager.playHover();
              setActiveTab('explore');
            }}
          >
            <Sparkles size={15} /> Explore Global
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'people' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 850 }}
            onClick={() => {
              soundManager.playHover();
              setActiveTab('people');
            }}
          >
            <Compass size={15} /> Founders Directory
          </button>
        </div>

        {activeTab !== 'people' && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontWeight: 850, padding: '10px 20px' }}
            onClick={() => {
              soundManager.playHover();
              setShowCreateModal(true);
            }}
          >
            <Plus size={18} /> Broadcast Transmission
          </button>
        )}
      </div>

      {/* PEOPLE TAB VIEW */}
      {activeTab === 'people' && (
        <div className="social-tab-panel">
          <section className="social-discovery-hero">
            <div><span>FOUNDER DISCOVERY GRID</span><h2>Find your next collaborator</h2><p>Explore real founders across domains, visit their profiles, and grow your network.</p></div>
            <div className="social-discovery-count"><strong>{people.length}</strong><span>FOUNDERS FOUND</span></div>
          </section>
          {/* Search Box */}
          <div className="social-founder-search" style={{ marginBottom: '24px', maxWidth: '520px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search founders by callsign, domain, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '44px', borderRadius: 12 }}
              />
            </div>
          </div>

          {/* People Grid */}
          {peopleLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '35vh', gap: '12px', color: '#38bdf8' }}>
              <div className="spinner" style={{ width: 34, height: 34 }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 750 }}>Scanning founder directory...</span>
            </div>
          ) : peopleError ? (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
              <AlertCircle size={32} style={{ marginBottom: '12px', margin: '0 auto' }} />
              <div style={{ fontWeight: '800', marginBottom: '12px', color: '#fff' }}>Unable to load founders.</div>
              <button type="button" className="btn btn-secondary" onClick={fetchPeople} style={{ margin: '0 auto' }}>
                <RefreshCw size={16} /> Retry
              </button>
            </div>
          ) : people.length === 0 ? (
            <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
              {searchQuery ? `No founders found for "${searchQuery}".` : 'No founders found in sector.'}
            </div>
          ) : (
            <div className="social-founder-grid">
              {people.map((person, index) => {
                const isActionLoading = actionLoadingMap[person.id];

                return (
                  <div
                    key={person.id}
                    className="glass-card social-founder-card"
                    onMouseEnter={soundManager.playHover}
                    style={{
                      padding: '24px',
                      borderRadius: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(10, 16, 32, 0.95) 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
                      '--entry-index': index,
                    }}
                  >
                    <div>
                      {/* Avatar & Identifiers */}
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', cursor: 'pointer' }}
                        onClick={() => {
                          soundManager.playWarpLaunch();
                          navigate(`/profile/${person.id}`);
                        }}
                      >
                        <div
                          className="social-founder-avatar"
                          style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                            border: '2px solid #22d3ee',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '900',
                            fontSize: '1.2rem',
                            flexShrink: 0,
                            overflow: 'hidden',
                          }}
                        >
                          {person.avatar_url ? (
                            <img src={person.avatar_url} alt={person.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            person.full_name?.charAt(0) || 'F'
                          )}
                        </div>

                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: '850', color: '#fff', fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {person.full_name || 'Founder'}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#22d3ee', fontWeight: 700 }}>
                            @{person.username || 'founder'}
                          </div>
                        </div>
                      </div>

                      {/* Domain & Stage Attributes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '12px 14px', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#22d3ee', fontWeight: '700' }}>
                          <Compass size={14} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {person.domains?.name || 'Tech Venture'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#c084fc', fontWeight: '700' }}>
                          <Shield size={14} />
                          <span>
                            {person.stage_name || 'Stage 1'} • {person.level_name || 'Initiator'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Follow Action Button */}
                    <button
                      type="button"
                      className={`btn social-follow-button ${person.is_following ? 'btn-secondary is-following' : 'btn-primary'}`}
                      style={{ width: '100%', justifyContent: 'center', fontWeight: 800 }}
                      onClick={() => handlePersonFollowToggle(person.id, person.is_following)}
                      disabled={isActionLoading}
                    >
                      {person.is_following ? <UserCheck size={16} /> : <UserPlus size={16} />}
                      <span>
                        {isActionLoading
                          ? person.is_following
                            ? 'Unfollowing...'
                            : 'Following...'
                          : person.is_following
                          ? 'Following'
                          : 'Connect / Follow'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* FEED & EXPLORE TAB VIEWS */}
      {activeTab !== 'people' && (
        <div className="social-tab-panel">
          {activeTab === 'explore' && (
            <section className="social-explore-hero">
              <div className="social-explore-orbit"><Sparkles size={25} /><i /><i /><i /></div>
              <div><span>GLOBAL SIGNAL STREAM</span><h2>Discover what founders are building</h2><p>React, discuss, follow, and turn interesting transmissions into meaningful connections.</p></div>
              <div className="social-live-pill"><b /> {posts.length} TRANSMISSIONS</div>
            </section>
          )}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', minHeight: '40vh', color: '#38bdf8' }}>
              <div className="spinner" style={{ width: 34, height: 34 }} />
            </div>
          ) : posts.length === 0 ? (
            <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8', borderRadius: '18px' }}>
              {activeTab === 'feed'
                ? 'Your transmission feed is quiet. Explore global posts or follow founders from the directory!'
                : 'No global transmissions broadcasted yet.'}
            </div>
          ) : (
            <div className="social-post-stream">
              {posts.map((post, index) => {
                const author = post.profiles || {};
                const isSelf = author.id === user?.id;

                return (
                  <div
                    key={post.id}
                    className="glass-card social-post-card"
                    style={{
                      padding: '24px 28px',
                      borderRadius: '20px',
                      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(10, 16, 32, 0.95) 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
                      '--entry-index': index,
                    }}
                  >
                    {/* Author Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
                        onClick={() => {
                          soundManager.playWarpLaunch();
                          navigate(`/profile/${author.id}`);
                        }}
                      >
                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                            border: '2px solid #22d3ee',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '850',
                            overflow: 'hidden',
                          }}
                        >
                          {author.avatar_url ? (
                            <img src={author.avatar_url} alt={author.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            author.full_name?.charAt(0) || 'F'
                          )}
                        </div>

                        <div>
                          <div style={{ fontWeight: '850', color: '#fff', fontSize: '1.05rem' }}>{author.full_name || 'Founder'}</div>
                          <div style={{ fontSize: '0.78rem', color: '#22d3ee', fontWeight: 700 }}>
                            {author.domains?.name || 'Venture Realm'}
                          </div>
                        </div>
                      </div>

                      {!isSelf && activeTab === 'explore' && (
                        <button
                          type="button"
                          className={`btn ${post.is_following ? 'btn-secondary' : 'btn-primary'}`}
                          style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 800 }}
                          onClick={() => handlePostFollowToggle(author.id, post.is_following)}
                        >
                          {post.is_following ? <UserCheck size={13} /> : <UserPlus size={13} />}
                          {post.is_following ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </div>

                    {/* Post Content */}
                    <p style={{ fontSize: '0.96rem', color: '#e2e8f0', marginBottom: '16px', lineHeight: '1.55' }}>
                      {post.content}
                    </p>

                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt="Post media"
                        className="social-post-media"
                        style={{ width: '100%', borderRadius: '14px', marginBottom: '16px', maxHeight: '420px', objectFit: 'cover' }}
                      />
                    )}

                    {/* Actions Footer */}
                    <div style={{ display: 'flex', gap: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
                      <button
                        type="button"
                        className={`social-reaction ${post.is_liked ? 'is-liked' : ''}`}
                        onClick={() => handleLikeToggle(post.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          color: post.is_liked ? '#ef4444' : '#94a3b8',
                          fontSize: '0.88rem',
                          fontWeight: '750',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <Heart size={18} fill={post.is_liked ? '#ef4444' : 'none'} />
                        <span>{post.likes_count || 0} Likes</span>
                      </button>

                      <button
                        type="button"
                        className="social-reaction"
                        onClick={() => handleOpenComments(post)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          color: '#94a3b8',
                          fontSize: '0.88rem',
                          fontWeight: '750',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <MessageCircle size={18} />
                        <span>{post.comments_count || 0} Transmissions</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE TRANSMISSION MODAL */}
      {showCreateModal && (
        <div role="dialog" aria-modal="true" aria-label="Create transmission" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(3,7,18,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setShowCreateModal(false)}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '560px', padding: '32px', position: 'relative', borderRadius: '22px', border: '1.5px solid rgba(6,182,212,0.4)', boxShadow: '0 24px 60px rgba(0,0,0,0.9), 0 0 35px rgba(6,182,212,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label="Close create transmission" onClick={() => setShowCreateModal(false)} style={{ position: 'absolute', top: '18px', right: '18px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem' }}>✕</button>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '900', marginBottom: '20px', color: '#fff' }}>
              Broadcast Network Transmission
            </h3>

            <form onSubmit={handleCreatePost}>
              <div className="form-group">
                <textarea
                  className="form-textarea"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Broadcast milestone updates, venture questions, or launch breakthroughs to the network..."
                  style={{ minHeight: '130px', borderRadius: 12 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Attachment Image URL (Optional)</label>
                <input
                  type="url"
                  className="form-input"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://..."
                  style={{ borderRadius: 10 }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: '12px', fontWeight: 850 }} disabled={posting}>
                {posting ? 'Transmitting Broadcast...' : 'Broadcast Transmission ▶'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* COMMENTS MODAL */}
      {activeCommentPost && (
        <div role="dialog" aria-modal="true" aria-label="Post comments" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(3,7,18,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setActiveCommentPost(null)}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '580px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '28px', position: 'relative', borderRadius: '22px' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label="Close comments" onClick={() => setActiveCommentPost(null)} style={{ position: 'absolute', top: '18px', right: '18px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '900', marginBottom: '18px', color: '#fff' }}>
              Transmissions & Debriefs
            </h3>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px' }}>
              {comments.length === 0 ? (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '24px' }}>No transmissions yet. Be the first to reply!</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px' }}>
                    <div style={{ fontWeight: '800', fontSize: '0.86rem', color: '#22d3ee', marginBottom: '4px' }}>
                      {c.profiles?.full_name || 'Founder'}
                    </div>
                    <div style={{ fontSize: '0.92rem', color: '#e2e8f0' }}>{c.content}</div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                className="form-input"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Broadcast a response..."
                style={{ borderRadius: 9999 }}
              />
              <button type="submit" className="btn btn-primary" style={{ borderRadius: 9999, padding: '10px 18px' }}>
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
