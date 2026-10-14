import {usePreviewDialog} from '../usePreviewDialog';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { mockProfiles } from '../data/mockProfile';
import ProfileOverview from '../components/ProfileOverview';
import EditProfilePanel from '../components/EditProfilePanel';
import ProfileCards from '../components/ProfileCards';
import CommunityPosts from '../components/CommunityPosts';
import FounderPassportModal from '../components/FounderPassportModal';
import './ProfilePage.css';

export default function ProfilePage({onProfileChange}) {
  // Mock state — no API, auth provider, router, browser storage, or backend integration.
  const [profiles, setProfiles] = useState(() => structuredClone(mockProfiles));
  const [editing, setEditing] = useState(false);
  const [listOpen, setListOpen] = useState(null);
  const [passportOpen, setPassportOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const listRef = usePreviewDialog(Boolean(listOpen), () => setListOpen(null));
  const profile = profiles.self;
  const isSelf = true;

  // Modal dismissal is local to the prototype.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { setListOpen(null); setPassportOpen(false); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  function saveProfile(data, selectedImage) {
    setProfiles((old) => ({ ...old, self: { ...data } }));
    if (selectedImage) {
      const reader = new FileReader();
      reader.onload = () => { const next = {...data, avatar: String(reader.result || '')}; setProfiles(old => ({...old, self: next})); onProfileChange?.(next); };
      reader.readAsDataURL(selectedImage);
    }
    onProfileChange?.(data);
    setEditing(false);
    setNotice('Profile updated in this preview. Refresh to restore sample data.');
  }

  function toggleLike(id) {
    setProfiles((old) => ({ ...old, self: { ...old.self, posts: old.self.posts.map((p) => p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p) } }));
  }

  function addComment(id, content) {
    setProfiles((old) => ({ ...old, self: { ...old.self, posts: old.self.posts.map((p) => p.id === id ? { ...p, comments: [...p.comments, { id: `mock-${Date.now()}`, author: 'You', text: content }] } : p) } }));
  }

  return (
    <div className="lp-page">
      <div className="lp-intro"><div><span className="lp-eyebrow"><i/> LABX / PERSONAL IDENTITY</span><h2>Your professional identity</h2><p>Your story, progress and connections — all in one place.</p></div></div>
      {notice && <div className="lp-toast" role="status"><span>{notice}</span><button type="button" onClick={()=>setNotice('')} aria-label="Dismiss notification"><X size={16}/></button></div>}
      <ProfileOverview profile={profile} isSelf={isSelf} onEdit={()=>setEditing((old)=>!old)} onOpenList={setListOpen}/>
      {isSelf && editing && <EditProfilePanel key={profile.id} profile={profile} onSave={saveProfile} onCancel={()=>setEditing(false)}/>}
      <ProfileCards profile={profile} isSelf={isSelf} onPassport={()=>setPassportOpen(true)}/>
      <CommunityPosts key={`posts-${profile.id}`} profile={profile} posts={profile.posts} onLike={toggleLike} onComment={addComment} isSelf={isSelf}/>
      <footer className="lp-page__footer">LabX • Founder Profile • React design prototype</footer>
      {listOpen && <div className="lp-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)setListOpen(null);}}><section ref={listRef} className="lp-modal lp-modal--small" role="dialog" aria-modal="true" aria-labelledby="list-title"><div className="lp-modal__heading"><div><span className="lp-kicker">COMMUNITY</span><h3 id="list-title">{listOpen === 'followers' ? 'Followers' : 'Following'}</h3></div><button className="lp-icon-button" type="button" onClick={()=>setListOpen(null)} aria-label="Close list"><X size={19}/></button></div><div className="lp-modal__content lp-members">{profile[listOpen].map((person)=><div key={person.id}><span className="lp-member-avatar">{person.initials}</span><span><strong>{person.name}</strong><small>@{person.handle}</small></span></div>)}</div></section></div>}
      {passportOpen && isSelf && <FounderPassportModal profile={profile} onClose={()=>setPassportOpen(false)} onDraftSaved={()=>{}}/>}
    </div>
  );
}
