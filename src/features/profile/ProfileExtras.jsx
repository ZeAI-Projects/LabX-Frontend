import {useState} from 'react';
import {Edit, Eye, FileCheck, Save, Shield, Sparkles, Users} from 'lucide-react';
import {useProfile} from './profile-context';
import {passportSections, profileFields, startupFields, visibilityFields} from './profile-data';
import {Modal} from './Modal';

function Fields({fields, draft, setDraft}) {
  return <div className="profile-fields">{fields.map(([key, label, type = 'text']) => <div className="form-group" key={key}>
    <label className="form-label" htmlFor={`field-${key}`}>{label}</label>
    {type === 'textarea' ? <textarea id={`field-${key}`} className="form-textarea" value={draft[key] || ''} maxLength={2000} onChange={e => setDraft({...draft, [key]: e.target.value})}/> :
      <input id={`field-${key}`} className="form-input" type={type} value={draft[key] || ''} maxLength={type === 'url' ? 2048 : 200} required={['full_name', 'username'].includes(key)} pattern={key === 'username' ? '[A-Za-z0-9_]{3,30}' : undefined} title={key === 'username' ? 'Use 3–30 letters, numbers or underscores.' : undefined} onChange={e => setDraft({...draft, [key]: e.target.value})}/>}
  </div>)}</div>;
}

export function ProfileEditor({onCancel, onSaved, startupOnly = false}) {
  const {data, setData} = useProfile();
  const [draft, setDraft] = useState({...data.profile});
  const [error, setError] = useState('');
  const fields = startupOnly ? startupFields : [['full_name', 'Full Name'], ['username', 'Username'], ['bio', 'Founder Bio / Vision', 'textarea'], ...profileFields];
  function save(e) {
    e.preventDefault();
    if (!draft.full_name.trim()) {setError('Enter a full name.'); return;}
    const invalid = fields.find(([key,,type]) => type === 'url' && draft[key]?.trim() && !/^https?:\/\//i.test(draft[key].trim()));
    if (invalid) {setError(`${invalid[1]} must start with https:// or http://.`); return;}
    const next = Object.fromEntries(fields.map(([key]) => [key, (draft[key] || '').trim()]));
    setData(d => ({...d, profile: {...d.profile, ...next, ...(!startupOnly ? {avatar_url: draft.avatar_url} : {})}}));
    onSaved();
  }
  function upload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {setError('Choose a JPG, PNG or WebP image up to 1 MB.'); e.target.value = ''; return;}
    const reader = new FileReader();
    reader.onload = () => {setDraft(d => ({...d, avatar_url: reader.result})); setError('');};
    reader.onerror = () => setError('The image could not be read. Please try another file.');
    reader.readAsDataURL(file);
  }
  return <section className="glass-card profile-section">
    <h3><Sparkles size={18} color="#22d3ee"/> {startupOnly ? 'Edit Startup' : 'Edit Founder Credentials'}</h3>
    <form onSubmit={save}>
      <Fields fields={fields} draft={draft} setDraft={setDraft}/>
      {!startupOnly && <div className="form-group"><label className="form-label" htmlFor="avatar-url">Avatar Image URL</label><input id="avatar-url" type="url" pattern="https?://.+" className="form-input" placeholder="https://..." value={draft.avatar_url?.startsWith('data:') ? '' : draft.avatar_url || ''} onChange={e => setDraft({...draft, avatar_url: e.target.value})}/><label className="form-label profile-spaced" htmlFor="avatar">Or upload a profile photo</label><input id="avatar" className="form-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={upload}/><p className="profile-muted">JPG, PNG or WebP, up to 1 MB.</p>{draft.avatar_url && <div className="profile-actions"><img className="profile-photo-preview" src={draft.avatar_url} alt="Selected profile photo"/><button type="button" className="btn btn-secondary" onClick={() => setDraft({...draft, avatar_url: ''})}>Remove photo</button></div>}</div>}
      {error && <p role="alert" className="profile-error">{error}</p>}
      <div className="profile-actions"><button className="btn btn-primary" type="submit"><Save size={16}/>Save Changes</button><button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button></div>
    </form>
  </section>;
}

function Details({fields, profile, visible = () => true}) {
  const rows = fields.filter(([key]) => visible(key));
  if (!rows.length) return <p className="profile-muted">No public details shared.</p>;
  return <dl className="profile-details">{rows.map(([key, label, type]) => <div className="profile-detail" key={key}><dt>{label}</dt><dd>{profile[key] ? type === 'url' && /^https?:\/\//i.test(profile[key]) ? <a href={profile[key]} target="_blank" rel="noreferrer">{profile[key]}</a> : profile[key] : 'Not provided'}</dd></div>)}</dl>;
}

function PublicPreview() {
  const {data} = useProfile();
  const p = data.profile;
  const visible = key => data.visibility[key] === true;
  const sectionVisible = key => data.sections[key] && visible(key);
  return <div className="profile-public-preview">
    <div className="profile-actions">{p.avatar_url && <img className="profile-photo-preview" src={p.avatar_url} alt={p.full_name}/>}<div><h2>{p.full_name}</h2><p className="profile-muted">@{p.username} · Founder</p></div></div>
    {visible('bio') && <p className="profile-spaced">{p.bio}</p>}
    <h3>Personal and professional details</h3><Details fields={profileFields} profile={p} visible={visible}/>
    <h3>Startup information</h3><Details fields={startupFields} profile={p} visible={visible}/>
    {sectionVisible('Progression') && <><h3>Venture Progression</h3><p>{p.domains.name} · {p.progress.stages.name} · {p.progress.levels.name}</p></>}
    {sectionVisible('Milestones and quests') && <><h3>Milestones and quests</h3>{p.history.map(h => <p key={h.id}>{h.type}: {h.title} · {h.status}</p>)}</>}
    {sectionVisible('Achievements') && <><h3>Earned Medals</h3>{p.badges.map(b => <p key={b.id}>{b.icon} {b.name}</p>)}</>}
    {sectionVisible('Community contributions') && <><h3>Community contributions</h3>{data.posts.map(post => <p key={post.id}>{post.content}</p>)}</>}
    <h3>Verified facts</h3><p className="profile-muted">{p.verifiedFacts.length ? p.verifiedFacts.join(' · ') : 'No verified facts yet.'}</p>
  </div>;
}

function PrivacyEditor({onClose, onSaved}) {
  const {data, setData} = useProfile();
  const [visibility, setVisibility] = useState({...data.visibility});
  const [sections, setSections] = useState({...data.sections});
  return <form onSubmit={e => {e.preventDefault(); setData(d => ({...d, visibility, sections})); onSaved();}}>
    <p className="profile-muted">Your name, username, avatar and Founder role identify your public profile. Choose which other details appear in its preview.</p>
    <div className="profile-privacy-list">{visibilityFields.map(([key, label]) => <label key={key}><span>{label}</span><select className="form-select" aria-label={`${label} visibility`} value={visibility[key] ? 'public' : 'private'} onChange={e => setVisibility({...visibility, [key]: e.target.value === 'public'})}><option value="public">Public</option><option value="private">Private</option></select></label>)}</div>
    <h3>Passport sections</h3><p className="profile-muted">Choose the sections included in your Founder Passport.</p>
    {passportSections.map(key => <label className="profile-checkbox" key={key}><input type="checkbox" checked={sections[key]} onChange={e => setSections({...sections, [key]: e.target.checked})}/>{key}</label>)}
    <div className="profile-actions profile-spaced"><button className="btn btn-primary" type="submit">Save privacy settings</button><button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button></div>
  </form>;
}

function PassportApplication({onClose, onSaved}) {
  const {data, setData} = useProfile();
  const [note, setNote] = useState(data.application?.note || '');
  const [confirmed, setConfirmed] = useState(false);
  if (data.application?.status === 'Submitted locally') return <div>
    <p className="profile-muted">These details were saved on this device. No application was sent for admin validation.</p>
    <Details fields={ [['full_name', 'Full Name'], ['username', 'Username'], ['startup_name', 'Startup name'], ['contact', 'Contact email']]} profile={data.application.details}/>
    <div className="profile-detail"><strong>Additional details</strong><p>{data.application.note || 'None provided.'}</p></div>
    <p className="profile-muted profile-spaced">Admin validation, interview, feedback and issuance are pending. No passport has been issued.</p>
    <button className="btn btn-secondary profile-spaced" onClick={onClose}>Close</button>
  </div>;
  const save = status => {
    setData(d => ({...d, application: {status, note: note.trim(), submittedAt: status === 'Submitted locally' ? new Date().toISOString() : null, details: {full_name: d.profile.full_name, username: d.profile.username, startup_name: d.profile.startup_name, contact: d.profile.contact}}}));
    onSaved(status === 'Draft' ? 'Passport application draft saved on this device.' : 'Application saved locally. No details were sent for review.');
  };
  return <form onSubmit={e => {e.preventDefault(); save('Submitted locally');}}>
    <p className="profile-muted">Review your existing profile details for this application preview. Final application fields and verification criteria are awaiting definition.</p>
    <Details fields={ [['full_name', 'Full Name'], ['username', 'Username'], ['startup_name', 'Startup name'], ['contact', 'Contact email']]} profile={data.profile}/>
    <label className="form-label" htmlFor="application-note">Additional details (optional draft)</label><textarea id="application-note" className="form-textarea" maxLength={2000} value={note} onChange={e => setNote(e.target.value)}/>
    <label className="profile-checkbox"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} required/>I have reviewed these details.</label>
    <p className="profile-muted">This saves a local submission preview. Admin validation, interview, feedback and issuance require the later connected workflow.</p>
    <div className="profile-actions profile-spaced"><button type="submit" className="btn btn-primary" disabled={!confirmed}>Submit Details</button><button type="button" className="btn btn-secondary" onClick={() => save('Draft')}>Save draft</button><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button></div>
  </form>;
}

export function ProfileExtras() {
  const {data} = useProfile();
  const [modal, setModal] = useState(null);
  const [startupEditing, setStartupEditing] = useState(false);
  const [notice, setNotice] = useState('');
  const p = data.profile;
  const close = () => setModal(null);
  const saveNotice = message => {close(); setNotice(message);};
  return <div className="profile-extras">
    {notice && <p role="status" className="profile-success">{notice}</p>}
    <section className="glass-card profile-section"><h3><Users size={18} color="#22d3ee"/>Personal and professional details</h3><Details fields={profileFields} profile={p}/></section>
    {startupEditing ? <ProfileEditor startupOnly onCancel={() => setStartupEditing(false)} onSaved={() => {setStartupEditing(false); setNotice('Startup changes saved on this device.');}}/> : <section className="glass-card profile-section"><header className="profile-section-heading"><h3><Sparkles size={18} color="#22d3ee"/>Startup information</h3><button className="btn btn-secondary" onClick={() => setStartupEditing(true)}><Edit size={15}/>Edit startup</button></header><Details fields={startupFields} profile={p}/></section>}
    <section className="glass-card profile-section"><header className="profile-section-heading"><h3><FileCheck size={18} color="#22d3ee"/>Founder Passport</h3><span className="badge badge-cyan">{data.application?.status || 'Not applied'}</span></header>
      <p className="profile-muted">A Founder Passport is issued to verified founders and includes a physical card and access to connect with LabX collaborators.</p>
      {data.sections.Progression && <div className="profile-detail"><strong>Current startup stage</strong><p>{p.progress.stages.name} · {p.progress.levels.name}</p></div>}
      {data.sections['Milestones and quests'] && <div className="profile-detail"><strong>Milestones and quest history</strong>{p.history.map(h => <p key={h.id}>{h.type}: {h.title} · <span className="profile-muted">{h.status}</span></p>)}</div>}
      {data.sections.Achievements && <div className="profile-detail"><strong>Skills, goals and achievements</strong><p>{p.skills || 'No skills added.'}</p><p>{p.goals || 'No goals added.'}</p>{p.badges.map(b => <p key={b.id}>{b.icon} {b.name}</p>)}</div>}
      {data.sections['Community contributions'] && <div className="profile-detail"><strong>Community contributions</strong><p>{data.posts.length} transmissions · {data.posts.reduce((total, post) => total + post.comments.length, 0)} comments</p></div>}
      <ol className="profile-workflow">{['Application', 'Admin validation', 'Interview', 'Feedback', 'Passport issuance'].map((step, i) => <li key={step}><span>{step}</span><small>{i === 0 ? data.application?.status || 'Not started' : 'Pending'}</small></li>)}</ol>
      {data.application?.submittedAt && <p className="profile-muted">Saved locally on {new Date(data.application.submittedAt).toLocaleDateString()}.</p>}
      <div className="profile-detail"><strong>Feedback</strong><p className="profile-muted">No interview feedback yet.</p></div>
      <button className="btn btn-primary" onClick={() => setModal('application')}>{data.application ? 'Review application' : 'Apply for Founder Passport'}</button>
    </section>
    <section className="glass-card profile-section"><h3><Shield size={18} color="#22d3ee"/>Privacy and verification</h3><div className="profile-detail"><strong><Shield size={14}/> Verified facts</strong><p className="profile-muted">No verified facts yet. Earned medals recognize achievements and do not verify your identity.</p></div><p className="profile-muted">Manage public contact information and field visibility. Preview shows saved privacy settings.</p><div className="profile-actions profile-spaced"><button className="btn btn-secondary" onClick={() => setModal('privacy')}><Shield size={16}/>Manage Visibility</button><button className="btn btn-secondary" onClick={() => setModal('preview')}><Eye size={16}/>Preview public profile</button></div></section>
    {modal === 'privacy' && <Modal title="Privacy and passport visibility" onClose={close}><PrivacyEditor onClose={close} onSaved={() => saveNotice('Privacy settings saved on this device.')}/></Modal>}
    {modal === 'preview' && <Modal title="Public profile preview" onClose={close}><PublicPreview/></Modal>}
    {modal === 'application' && <Modal title="Founder Passport application" onClose={close}><PassportApplication onClose={close} onSaved={saveNotice}/></Modal>}
  </div>;
}
