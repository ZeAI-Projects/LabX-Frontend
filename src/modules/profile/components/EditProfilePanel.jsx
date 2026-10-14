import { useEffect, useState } from 'react';
import { Edit as Edit3, Image as ImagePlus, Plus, Save, Trash2, X } from 'lucide-react';

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

function TagEditor({ label, items, onChange, placeholder }) {
  const [value, setValue] = useState('');

  function add() {
    const entry = value.trim();
    if (entry && !items.some((item) => item.toLowerCase() === entry.toLowerCase()) && items.length < 12) {
      onChange([...items, entry]);
    }
    setValue('');
  }

  return (
    <div className="lp-field lp-field--wide">
      <span className="lp-label">{label}</span>
      <div className="lp-tag-box">
        <div className="lp-tags">{items.map((item) => <span key={item}>{item}<button type="button" aria-label={`Remove ${item}`} onClick={() => onChange(items.filter((tag) => tag !== item))}><X size={13}/></button></span>)}</div>
        <div className="lp-tag-entry"><input aria-label={`Add ${label}`} value={value} placeholder={placeholder} maxLength={60} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}/><button className="lp-button lp-button--small lp-button--ghost" type="button" onClick={add}><Plus size={15}/> Add</button></div>
      </div>
    </div>
  );
}

function LinksEditor({ links, onChange }) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  function addLink() {
    try {
      const parsed = new URL(url.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid scheme');
      if (!label.trim()) { setError('Enter a link label.'); return; }
      onChange([...links, { id: `local-${Date.now()}`, label: label.trim(), url: parsed.href }]);
      setLabel(''); setUrl(''); setError('');
    } catch {
      setError('Enter a valid http:// or https:// link.');
    }
  }

  return <div className="lp-field lp-field--wide"><span className="lp-label">Portfolio & links</span><div className="lp-link-editor">
    {links.map((link) => <div className="lp-edit-link" key={link.id}><div><strong>{link.label}</strong><small>{link.url}</small></div><button className="lp-icon-button" title={`Remove ${link.label}`} aria-label={`Remove ${link.label}`} type="button" onClick={() => onChange(links.filter((entry) => entry.id !== link.id))}><Trash2 size={16}/></button></div>)}
    <div className="lp-link-inputs"><input aria-label="Link label" value={label} onChange={(e)=>setLabel(e.target.value)} placeholder="Label, e.g. GitHub" maxLength={45}/><input aria-label="Link URL" value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="https://..." type="url"/></div>
    <button className="lp-button lp-button--ghost lp-button--small" type="button" onClick={addLink}><Plus size={15}/> Add link</button>
    {error && <span className="lp-error" role="alert">{error}</span>}
  </div></div>;
}

export default function EditProfilePanel({ profile, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => structuredClone(profile));
  const [avatarError, setAvatarError] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  // Image preview is local to this editing session; browser URLs are cleaned up.
  useEffect(() => () => {if (photoPreview) URL.revokeObjectURL(photoPreview);}, [photoPreview]);

  function choosePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!allowedTypes.includes(file.type)) { setAvatarError('Use JPG, PNG or WebP images.'); return; }
    if (file.size > 5 * 1024 * 1024) { setAvatarError('Please select a photo smaller than 5 MB.'); return; }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setAvatarError('');
  }

  function save(event) {
    event.preventDefault();
    const clean = { ...draft, name: draft.name.trim(), bio: draft.bio.trim(), location: draft.location.trim() };
    if (!clean.name) return;
    onSave(clean, photo);
  }

  return (
    <section className="lp-card lp-editor lp-reveal" aria-label="Edit profile">
      <div className="lp-editor__title"><div><span className="lp-kicker">PROFILE SETTINGS</span><h3><Edit3 size={20}/> Edit your profile</h3><p>Update your professional identity and choose what to share.</p></div><button type="button" className="lp-icon-button" aria-label="Close profile editor" onClick={onCancel}><X size={20}/></button></div>
      <form onSubmit={save} className="lp-edit-grid">
        <label className="lp-field"><span className="lp-label">Full name</span><input value={draft.name} maxLength={120} required onChange={(e)=>setDraft((v)=>({...v,name:e.target.value}))}/></label>
        <div className="lp-field"><span className="lp-label">Profile photo</span><div className="lp-photo-field"><div className="lp-photo-preview">{photoPreview || draft.avatar ? <img src={photoPreview || draft.avatar} alt="Selected profile"/> : draft.name.charAt(0) || 'L'}</div><div className="lp-photo-actions"><label className="lp-upload"><ImagePlus size={18}/>{photo ? 'Change photo' : 'Choose photo'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto}/></label><small>JPG, PNG or WebP · Max 5 MB</small>{photo && <button type="button" onClick={() => {setPhoto(null);setPhotoPreview('');}} className="lp-text-button">Remove selection</button>}</div></div>{avatarError && <span className="lp-error" role="alert">{avatarError}</span>}</div>
        <label className="lp-field"><span className="lp-label">Location</span><input value={draft.location} maxLength={90} onChange={(e)=>setDraft((v)=>({...v,location:e.target.value}))} placeholder="City, Country"/></label>
        <label className="lp-field lp-field--wide"><span className="lp-label">Professional overview</span><textarea value={draft.bio} maxLength={600} rows={3} onChange={(e)=>setDraft((v)=>({...v,bio:e.target.value}))} placeholder="Tell people about your background and what you're building."/></label>
        <TagEditor label="Skills & expertise" items={draft.skills} onChange={(skills)=>setDraft((v)=>({...v,skills}))} placeholder="React, Python..."/>
        <TagEditor label="Personal interests" items={draft.interests} onChange={(interests)=>setDraft((v)=>({...v,interests}))} placeholder="AI, design..."/>
        <TagEditor label="Professional goals" items={draft.goals} onChange={(goals)=>setDraft((v)=>({...v,goals}))} placeholder="A goal you are working towards"/>
        <LinksEditor links={draft.links} onChange={(links)=>setDraft((v)=>({...v,links}))}/>
        <p className="lp-edit-note">Your domain, roadmap stage, coins and earned badges are sample system data and are not editable here.</p>
        <div className="lp-form-actions"><button type="button" className="lp-button lp-button--ghost" onClick={onCancel}>Cancel</button><button type="submit" className="lp-button lp-button--primary"><Save size={16}/> Save profile</button></div>
      </form>
    </section>
  );
}
