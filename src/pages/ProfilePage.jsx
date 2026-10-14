import { useState } from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {Navbar} from '../components/common/Navbar';
import {Compass, Shield, Award, Users, Edit, UserPlus, UserCheck, Heart, MessageCircle, Send, FileText, Trophy} from 'lucide-react';
import {useProfile} from '../features/profile/profile-context';
import {ProfileEditor, ProfileExtras} from '../features/profile/ProfileExtras';
import {Modal} from '../features/profile/Modal';

export const ProfilePage = () => {
  const {userId} = useParams();
  const navigate = useNavigate();
  const {data, setData, user} = useProfile();
  const isSelf = !userId || userId === user.id;
  const person = data.people.find(p => p.id === userId);
  const profile = isSelf ? {...user, stats: {posts: data.posts.length, followers: data.people.filter(p => p.follows_you).length, following: data.people.filter(p => p.is_following).length}} : {...person, total_points: 0, badges: [], stats: {followers: person?.is_following ? 1 : 0, following: person?.follows_you ? 1 : 0}};
  const userPosts = isSelf ? data.posts.map(p => ({...p, comments_count: p.comments.length})) : [];
  const postsLoading = false;
  const followLoading = false;
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [activeModal, setActiveModal] = useState(null);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [commentText, setCommentText] = useState('');
  const comments = data.posts.find(p => p.id === activeCommentPost?.id)?.comments || [];
  const modalUsers = isSelf ? data.people.filter(p => activeModal === 'followers' ? p.follows_you : p.is_following) : (activeModal === 'followers' ? person?.is_following : person?.follows_you) ? [user] : [];
  const handleModalUserFollowToggle = id => setData(d => ({...d, people: d.people.map(p => p.id === id ? {...p, is_following: !p.is_following} : p)}));
  const handleFollowToggle = () => handleModalUserFollowToggle(userId);
  const openFollowersModal = () => setActiveModal('followers');
  const openFollowingModal = () => setActiveModal('following');
  const handleLikeToggle = id => setData(d => ({...d, posts: d.posts.map(p => p.id === id ? {...p, is_liked: !p.is_liked, likes_count: p.likes_count + (p.is_liked ? -1 : 1)} : p)}));
  const handleOpenComments = post => {setCommentText(''); setActiveCommentPost(post);};
  const handleAddComment = e => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const comment = {id: crypto.randomUUID(), content: commentText.trim(), profiles: {full_name: user.full_name}};
    setData(d => ({...d, posts: d.posts.map(p => p.id === activeCommentPost.id ? {...p, comments: [...p.comments, comment]} : p)}));
    setCommentText('');
  };
  if (!isSelf && !person) return <div className="glass-card profile-section"><h2>Profile not found</h2><button className="btn btn-primary" onClick={() => navigate('/profile')}>Return to my profile</button></div>;
  const currentFullName = profile?.full_name || (isSelf ? user?.full_name : 'Founder');
  const currentHandle =
    profile?.username ||
    (isSelf && user?.username) ||
    (profile?.email ? profile.email.split('@')[0] : '') ||
    (isSelf && user?.email ? user.email.split('@')[0] : '') ||
    (currentFullName ? currentFullName.toLowerCase().replace(/\s+/g, '_') : 'founder');

  const avatarInitials = (currentFullName.charAt(0) || 'F').toUpperCase();

  return (
    <div className="profile-page" style={{ position: 'relative', minHeight: '100vh', paddingBottom: '100px' }}>
      <Navbar title={isSelf ? 'Founder Dossier' : `${currentFullName}'s Dossier`} />

      {message && (
        <div role="status" style={{ padding: '14px 20px', backgroundColor: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', borderRadius: '12px', marginBottom: '20px', fontWeight: 700 }}>
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
              {profile?.location && <div className="profile-location">{profile.location}</div>}
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
            role="button" tabIndex={0} onKeyDown={e => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); openFollowersModal();}}}
            onClick={openFollowersModal}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#c084fc' }}>{profile?.stats?.followers || 0}</div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '800', marginTop: '4px', textTransform: 'uppercase' }}>Followers</div>
          </div>

          <div
            className="glass-card"
            style={{ padding: '14px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}
            role="button" tabIndex={0} onKeyDown={e => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); openFollowingModal();}}}
            onClick={openFollowingModal}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#f59e0b' }}>{profile?.stats?.following || 0}</div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '800', marginTop: '4px', textTransform: 'uppercase' }}>Following</div>
          </div>

          <div className="glass-card" style={{ padding: '14px', textAlign: 'center', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#f59e0b' }}>{(profile?.total_points ?? 0).toLocaleString()}</div>
            <div style={{ fontSize: '0.74rem', color: '#f59e0b', fontWeight: '850', marginTop: '4px', textTransform: 'uppercase' }}>LabX Coins</div>
          </div>
        </div>
      </div>

      {isSelf && editing && <ProfileEditor onCancel={() => setEditing(false)} onSaved={() => {setEditing(false); setMessage('Dossier changes saved on this device.');}} />}

      {/* Progression & Transmissions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Progression System Tile */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '18px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '850', color: '#fff', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="#22d3ee" /> Venture Progression
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <SystemAttrTile icon={<Compass color="#06b6d4" size={16} />} label="Domain Realm" value={profile?.domains?.name || 'Not provided'} />
              <SystemAttrTile icon={<Shield color="#a855f7" size={16} />} label="Current Stage" value={profile?.progress?.stages?.name || 'Not provided'} />
              <SystemAttrTile icon={<Award color="#f59e0b" size={16} />} label="Tier Rank" value={profile?.progress?.levels?.name || 'Not provided'} />
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
                  onClick={() => setActiveModal('medals')}
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
                      aria-label={post.is_liked ? 'Unlike transmission' : 'Like transmission'}
                      aria-pressed={post.is_liked}
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
                      aria-label="Comments"
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

      {isSelf && <ProfileExtras />}
      {activeModal === 'medals' && <Modal title="Earned Medals" onClose={() => setActiveModal(null)}>{profile.badges.map(b => <div key={b.id} className="profile-detail"><strong>{b.icon} {b.name}</strong><p>{b.description}</p></div>)}</Modal>}

      {/* MODALS */}
      {['followers', 'following'].includes(activeModal) && (
        <Modal title={activeModal === 'followers' ? 'Founder Followers' : 'Following Founders'} onClose={() => setActiveModal(null)}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {modalUsers.length === 0 && <p className="profile-muted">No founders to show yet.</p>}
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
                    <button type="button"
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', textAlign: 'left' }}
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
                    </button>

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
        </Modal>
      )}

      {/* COMMENTS MODAL */}
      {activeCommentPost && (
        <Modal title="Comments" onClose={() => setActiveCommentPost(null)}>
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
                aria-label="Write a comment" maxLength={2000}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
              />
              <button type="submit" className="btn btn-primary" aria-label="Post comment" disabled={!commentText.trim()}>
                <Send size={15} />
              </button>
            </form>
        </Modal>
      )}
    </div>
  );
};

const SystemAttrTile = ({ icon, label, value }) => (
  <div className="profile-attribute" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {icon}
      <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>{label}</span>
    </div>
    <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#fff' }}>{value}</span>
  </div>
);
