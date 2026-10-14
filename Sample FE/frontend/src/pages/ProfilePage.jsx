import React, { useCallback, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/useAuth';
import { Navbar } from '../components/common/Navbar';
import {
  Compass,
  Shield,
  Award,
  Users,
  Edit,
  Save,
  UserPlus,
  UserCheck,
  Heart,
  MessageCircle,
  Send,
  X,
  FileText,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { soundManager } from '../components/auth/gamified/soundEffects';

export const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser, updateUserState } = useAuth();

  const targetUserId = userId || user?.id;
  const isSelf = !userId || userId === user?.id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);

  // Edit State
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [followLoading, setFollowLoading] = useState(false);

  // Modals & Lists
  const [activeModal, setActiveModal] = useState(null); // 'followers' | 'following' | null
  const [modalUsers, setModalUsers] = useState([]);
  const [actionLoadingMap, setActionLoadingMap] = useState({});

  // Comments Modal
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

  useEscapeKey(Boolean(activeModal) || Boolean(activeCommentPost), () => {
    setActiveModal(null);
    setActiveCommentPost(null);
  });

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setPostsLoading(true);
    try {
      const res = isSelf ? await api.getProfile() : await api.getUserProfile(targetUserId);
      const p = res.data;
      setProfile(p);
      setFullName(p.full_name || '');
      setBio(p.bio || '');
      setAvatarUrl(p.avatar_url || '');

      const postsRes = await api.getUserPosts(targetUserId);
      setUserPosts(postsRes.data || []);
    } catch (err) {
      console.error('Error fetching profile data:', err);
    } finally {
      setLoading(false);
      setPostsLoading(false);
    }
  }, [isSelf, targetUserId]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleFollowToggle = async () => {
    if (!profile || isSelf || followLoading) return;
    setFollowLoading(true);
    try {
      if (profile.is_following) {
        await api.unfollowUser(targetUserId);
      } else {
        await api.followUser(targetUserId);
      }
      const res = await api.getUserProfile(targetUserId);
      setProfile(res.data);
    } catch (err) {
      alert(err.message || 'Follow action failed');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    // Instant Realtime Optimistic UI Update
    setProfile((prev) => ({
      ...prev,
      full_name: fullName,
      bio: bio,
      avatar_url: avatarUrl,
    }));

    if (updateUserState) {
      updateUserState({
        full_name: fullName,
        bio: bio,
        avatar_url: avatarUrl,
      });
    }

    try {
      soundManager.playWarpLaunch();
      await api.updateProfile({
        full_name: fullName,
        bio: bio,
        avatar_url: avatarUrl,
      });

      setMessage('Founder dossier updated in real-time!');
      setEditing(false);
      if (refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      alert(err.message || 'Failed to update dossier');
    } finally {
      setSaving(false);
    }
  };

  const openFollowersModal = async () => {
    setActiveModal('followers');
    try {
      const res = await api.getUserFollowers(targetUserId);
      setModalUsers(res.data || []);
    } catch (err) {
      console.error('Error fetching followers:', err);
    }
  };

  const openFollowingModal = async () => {
    setActiveModal('following');
    try {
      const res = await api.getUserFollowing(targetUserId);
      setModalUsers(res.data || []);
    } catch (err) {
      console.error('Error fetching following users:', err);
    }
  };

  const handleModalUserFollowToggle = async (modalUserTargetId, currentlyFollowing) => {
    if (actionLoadingMap[modalUserTargetId]) return;

    setActionLoadingMap((prev) => ({ ...prev, [modalUserTargetId]: true }));
    try {
      if (currentlyFollowing) {
        await api.unfollowUser(modalUserTargetId);
      } else {
        await api.followUser(modalUserTargetId);
      }

      setModalUsers((prev) =>
        prev.map((u) => (u.id === modalUserTargetId ? { ...u, is_following: !currentlyFollowing } : u))
      );
      const res = isSelf ? await api.getProfile() : await api.getUserProfile(targetUserId);
      setProfile(res.data);
    } catch (err) {
      alert(err.message || 'Follow action failed');
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [modalUserTargetId]: false }));
    }
  };

  const handleLikeToggle = async (postId) => {
    try {
      const res = await api.toggleLike(postId);
      setUserPosts((prev) =>
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#38bdf8' }}>
        <div className="spinner" style={{ width: 34, height: 34 }} />
      </div>
    );
  }

  const currentFullName = profile?.full_name || (isSelf ? user?.full_name : 'Founder');
  const currentHandle =
    profile?.username ||
    (isSelf && user?.username) ||
    (profile?.email ? profile.email.split('@')[0] : '') ||
    (isSelf && user?.email ? user.email.split('@')[0] : '') ||
    (currentFullName ? currentFullName.toLowerCase().replace(/\s+/g, '_') : 'founder');

  const avatarInitials = (currentFullName.charAt(0) || 'F').toUpperCase();

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: '100px' }}>
      <Navbar title={isSelf ? 'Founder Dossier' : `${currentFullName}'s Dossier`} />

      {message && (
        <div style={{ padding: '14px 20px', backgroundColor: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', borderRadius: '12px', marginBottom: '20px', fontWeight: 700 }}>
          {message}
        </div>
      )}

      {/* Main Profile Dossier Banner */}
      <div
        className="glass-card"
        style={{
          padding: '32px 36px',
          marginBottom: '28px',
          background: 'linear-gradient(135deg, rgba(14, 23, 46, 0.92) 0%, rgba(10, 16, 32, 0.96) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          boxShadow: '0 16px 45px rgba(0, 0, 0, 0.7), 0 0 35px rgba(6, 182, 212, 0.1)',
          borderRadius: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
            <div
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                border: '3px solid #22d3ee',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '2.2rem',
                flexShrink: 0,
                boxShadow: '0 0 25px rgba(6, 182, 212, 0.5)',
                overflow: 'hidden',
              }}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={currentFullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                avatarInitials
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.02em' }}>{currentFullName}</h2>
                <span className="badge badge-cyan" style={{ fontSize: '0.72rem', fontWeight: 850 }}>FOUNDER</span>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#22d3ee', fontWeight: 700, marginBottom: '8px' }}>
                @{currentHandle}
              </div>
              <p style={{ fontSize: '0.92rem', color: '#cbd5e1', maxWidth: '600px', lineHeight: '1.5' }}>
                {profile?.bio || 'Building the future with LabX.'}
              </p>
            </div>
          </div>

          <div>
            {!isSelf ? (
              <button
                type="button"
                className={`btn ${profile?.is_following ? 'btn-secondary' : 'btn-primary'}`}
                onClick={handleFollowToggle}
                disabled={followLoading}
                style={{ padding: '10px 22px', fontSize: '0.88rem', fontWeight: 800 }}
              >
                {profile?.is_following ? <UserCheck size={16} /> : <UserPlus size={16} />}
                <span>{followLoading ? (profile?.is_following ? 'Unfollowing...' : 'Following...') : profile?.is_following ? 'Following' : 'Follow Founder'}</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontWeight: 750 }}
                onClick={() => setEditing(!editing)}
              >
                <Edit size={15} /> {editing ? 'Cancel Edit' : 'Edit Dossier'}
              </button>
            )}
          </div>
        </div>

        {/* Stats Row Tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: '16px', marginTop: '28px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
          <div className="glass-card" style={{ padding: '14px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#22d3ee' }}>{profile?.stats?.posts || userPosts.length || 0}</div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '800', marginTop: '4px', textTransform: 'uppercase' }}>Transmissions</div>
          </div>

          <div
            className="glass-card"
            style={{ padding: '14px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}
            onClick={openFollowersModal}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#c084fc' }}>{profile?.stats?.followers || 0}</div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '800', marginTop: '4px', textTransform: 'uppercase' }}>Followers</div>
          </div>

          <div
            className="glass-card"
            style={{ padding: '14px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}
            onClick={openFollowingModal}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#f59e0b' }}>{profile?.stats?.following || 0}</div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '800', marginTop: '4px', textTransform: 'uppercase' }}>Following</div>
          </div>

          <div className="glass-card" style={{ padding: '14px', textAlign: 'center', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#f59e0b' }}>{(profile?.total_points || user?.total_points || 0).toLocaleString()}</div>
            <div style={{ fontSize: '0.74rem', color: '#f59e0b', fontWeight: '850', marginTop: '4px', textTransform: 'uppercase' }}>LabX Coins</div>
          </div>
        </div>
      </div>

      {/* Real-time Edit Form */}
      {isSelf && editing && (
        <div className="glass-card" style={{ padding: '28px', marginBottom: '24px', borderRadius: '18px', border: '1.5px solid rgba(6,182,212,0.4)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '850', color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#22d3ee" /> Edit Founder Credentials (Updates in Realtime)
          </h3>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Founder Bio / Vision</label>
              <textarea
                className="form-textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your venture focus, background, and tech stack..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Avatar Image URL</label>
              <input
                type="url"
                className="form-input"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={saving}>
              <Save size={16} /> {saving ? 'Updating Credentials...' : 'Save Dossier Changes (Real-Time)'}
            </button>
          </form>
        </div>
      )}

      {/* Progression & Transmissions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Progression System Tile */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '18px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '850', color: '#fff', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="#22d3ee" /> Venture Progression
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <SystemAttrTile icon={<Compass color="#06b6d4" size={16} />} label="Domain Realm" value={profile?.domains?.name || user?.domains?.name || 'Media, Entertainment & Creator Technology'} />
              <SystemAttrTile icon={<Shield color="#a855f7" size={16} />} label="Current Stage" value={profile?.progress?.stages?.name || 'Build'} />
              <SystemAttrTile icon={<Award color="#f59e0b" size={16} />} label="Tier Rank" value={profile?.progress?.levels?.name || 'Level 4'} />
              <SystemAttrTile icon={<Users color="#10b981" size={16} />} label="Assigned Guild" value={profile?.guilds?.name || `${profile?.domains?.name || 'Domain'} Guild`} />
            </div>
          </div>

          {/* Badges Showcase */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '850', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy color="#f59e0b" size={18} /> Earned Medals ({profile?.badges?.length || 0})
              </h3>
              {isSelf && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 12px', fontSize: '0.75rem', fontWeight: 800 }}
                  onClick={() => navigate('/achievements')}
                >
                  Gallery →
                </button>
              )}
            </div>

            {profile?.badges && profile.badges.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(120px, 100%), 1fr))', gap: '12px' }}>
                {profile.badges.map((badge) => (
                  <div
                    key={badge.id}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '12px',
                      background: 'rgba(245,158,11,0.08)',
                      border: '1px solid rgba(245,158,11,0.25)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '1.8rem', marginBottom: '4px' }}>{badge.icon || '🏆'}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {badge.name}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                No medals earned yet. Complete roadmap milestones to earn badges!
              </div>
            )}
          </div>
        </div>

        {/* User Authored Posts */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <FileText size={18} color="#22d3ee" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: '850', color: '#fff' }}>
              {isSelf ? 'My Transmissions' : `Transmissions by ${currentFullName}`}
            </h3>
          </div>

          {postsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#38bdf8' }}>
              <div className="spinner" style={{ width: 28, height: 28 }} />
            </div>
          ) : userPosts.length === 0 ? (
            <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', borderRadius: '18px' }}>
              No transmissions broadcasted yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {userPosts.map((post) => (
                <div key={post.id} className="glass-card" style={{ padding: '20px', borderRadius: '16px' }}>
                  <p style={{ fontSize: '0.92rem', color: '#cbd5e1', marginBottom: '14px', lineHeight: '1.5' }}>
                    {post.content}
                  </p>

                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Post content"
                      style={{ width: '100%', borderRadius: '12px', marginBottom: '14px', maxHeight: '340px', objectFit: 'cover' }}
                    />
                  )}

                  <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => handleLikeToggle(post.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: post.is_liked ? '#ef4444' : '#94a3b8',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <Heart size={15} fill={post.is_liked ? '#ef4444' : 'none'} />
                      <span>{post.likes_count || 0}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenComments(post)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#94a3b8',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <MessageCircle size={15} />
                      <span>{post.comments_count || 0}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {activeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(3,7,18,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '24px', position: 'relative', borderRadius: '20px' }}>
            <button type="button" onClick={() => setActiveModal(null)} style={{ position: 'absolute', top: '16px', right: '16px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '850', marginBottom: '18px', color: '#fff', textTransform: 'capitalize' }}>
              {activeModal === 'followers' ? 'Founder Followers' : 'Following Founders'}
            </h3>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {modalUsers.map((mUser) => {
                const isModalUserSelf = mUser.id === user?.id;

                return (
                  <div
                    key={mUser.id}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                      onClick={() => {
                        setActiveModal(null);
                        navigate(`/profile/${mUser.id}`);
                      }}
                    >
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(6,182,212,0.2)',
                          color: '#22d3ee',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          flexShrink: 0,
                        }}
                      >
                        {mUser.avatar_url ? (
                          <img src={mUser.avatar_url} alt={mUser.full_name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          mUser.full_name?.charAt(0) || 'F'
                        )}
                      </div>

                      <div>
                        <div style={{ fontWeight: '800', color: '#fff', fontSize: '0.9rem' }}>{mUser.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>@{mUser.username || 'founder'}</div>
                      </div>
                    </div>

                    {!isModalUserSelf && (
                      <button
                        type="button"
                        className={`btn ${mUser.is_following ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        onClick={() => handleModalUserFollowToggle(mUser.id, mUser.is_following)}
                      >
                        {mUser.is_following ? <UserCheck size={13} /> : <UserPlus size={13} />}
                        <span>{mUser.is_following ? 'Following' : 'Follow'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* COMMENTS MODAL */}
      {activeCommentPost && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(3,7,18,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '540px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '24px', position: 'relative', borderRadius: '20px' }}>
            <button type="button" onClick={() => setActiveCommentPost(null)} style={{ position: 'absolute', top: '16px', right: '16px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '850', marginBottom: '16px', color: '#fff' }}>Comments</h3>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {comments.length === 0 ? (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>No comments yet.</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px' }}>
                    <div style={{ fontWeight: '800', fontSize: '0.82rem', color: '#22d3ee', marginBottom: '2px' }}>
                      {c.profiles?.full_name || 'Founder'}
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#fff' }}>{c.content}</div>
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
                placeholder="Write a comment..."
              />
              <button type="submit" className="btn btn-primary">
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const SystemAttrTile = ({ icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {icon}
      <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>{label}</span>
    </div>
    <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#fff' }}>{value}</span>
  </div>
);
