
import { Compass, Shield, MapPin, ShieldCheck, UserPlus, UserCheck, Edit as Edit3 } from 'lucide-react';

export default function ProfileOverview({ profile, isSelf, isFollowing, onEdit, onFollow, onOpenList }) {
  const followersCount = profile.followers.length + (!isSelf && isFollowing ? 1 : 0);

  return (
    <section className="lp-hero lp-reveal" aria-label="Profile overview">
      <div className="lp-hero__rail"><span>PERSONAL DOSSIER</span><span>BY ZE AI <i/></span></div>
      <div className="lp-hero__content">
        <div className="lp-avatar">{profile.avatar ? <img src={profile.avatar} alt={`${profile.name}'s avatar`}/> : profile.name.charAt(0)}</div>
        <div className="lp-identity">
          <div className="lp-name-row"><h3>{profile.name}</h3><span className="lp-role">{profile.role.toUpperCase()}</span>{profile.passportVerified && <span className="lp-verified"><ShieldCheck size={14}/> PASSPORT VERIFIED</span>}</div>
          <div className="lp-handle">@{profile.handle}</div>
          <p>{profile.bio || 'No introduction added yet.'}</p>
          <div className="lp-meta"><span><MapPin size={14}/>{profile.location}</span><span><Compass size={14}/>{profile.domain}</span><span><Shield size={14}/>LabX member</span></div>
        </div>
        <div className="lp-hero__actions">
          {isSelf ? <button className="lp-button lp-button--primary" onClick={onEdit}><Edit3 size={16}/> Edit profile</button> : <button className={`lp-button ${isFollowing ? 'lp-button--ghost' : 'lp-button--primary'}`} onClick={onFollow}>{isFollowing ? <UserCheck size={16}/> : <UserPlus size={16}/>} {isFollowing ? 'Following' : 'Follow'}</button>}
        </div>
      </div>
      <div className="lp-stats">
        <div><strong>{profile.posts.length}</strong><span>Posts</span></div>
        <button onClick={() => onOpenList('followers')}><strong>{followersCount}</strong><span>Followers</span></button>
        <button onClick={() => onOpenList('following')}><strong>{profile.following.length}</strong><span>Following</span></button>
        <div className="lp-stats__coins"><strong>{profile.coins.toLocaleString()}</strong><span>LabX Coins</span></div>
      </div>
    </section>
  );
}
