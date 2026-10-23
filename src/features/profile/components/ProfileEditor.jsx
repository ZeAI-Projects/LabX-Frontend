import { useEffect, useRef, useState } from 'react'
import { Camera, Eye, ImagePlus, Save, Shield, User, Briefcase, Sparkles } from 'lucide-react'
import { ProfileAvatar, ProfileDialog, ProfileField } from './ProfileDialog.jsx'
import { profileStore } from '../services/profile_store.js'
import { readProfileFile } from '../services/profile_files.js'

const VISIBILITY_FIELDS = [
  ['bio', 'Bio'], ['city', 'City'], ['country', 'Country'], ['skills', 'Skills'], ['interests', 'Interests'],
  ['goals', 'Goals'], ['availability', 'Collaboration availability'], ['website', 'Website'], ['portfolio', 'Portfolio'],
  ['linkedin', 'LinkedIn'], ['public_email', 'Public contact email'], ['professional_background', 'Professional background'],
  ['education', 'Education'], ['fundraising_status', 'Fundraising status'], ['startup', 'Venture details'],
  ['projects', 'Projects'], ['achievements', 'Achievements'], ['activity', 'Activity'],
]
const BASIC_FIELDS = [
  ['full_name', 'Display name', 80, true], ['username', 'Username', 30, true],
  ['city', 'City', 100], ['country', 'Country', 100],
]
const DETAIL_FIELDS = [
  ['goals', 'Goals', 1000, true], ['professional_background', 'Professional background', 2000, true], ['education', 'Education', 1000, true],
  ['website', 'Website', 2048], ['portfolio', 'Portfolio', 2048], ['linkedin', 'LinkedIn', 2048], ['public_email', 'Public contact email', 254],
]
const VENTURE_FIELDS = [
  ['name', 'Venture name', 120], ['description', 'Venture description', 2000], ['problem', 'Problem', 2000],
  ['solution', 'Solution', 2000], ['product', 'Product / service', 2000], ['team', 'Team', 1000], ['milestones', 'Venture milestones', 2000], ['website', 'Venture website', 2048],
]

export function ProfileEditor({ user, profile, initialPanel = 'basics', onClose, onSaved }) {
  const [panel, setPanel] = useState(initialPanel)
  const [form, setForm] = useState(() => ({ ...profile, skills: (profile.skills ?? []).join(', '), interests: (profile.interests ?? []).join(', '), privacy: { ...profile.privacy }, startup: { ...profile.startup } }))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingFiles, setPendingFiles] = useState(0)
  const mountedRef = useRef(true)
  const errorRef = useRef(null)
  const fileVersions = useRef({ avatar: 0, banner: 0 })
  const founder = user.role === 'founder'
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])
  function change(key, value) { setForm((previous) => ({ ...previous, [key]: value })) }
  function fail(err) {
    setError(err.message || 'Your profile could not be saved.')
    requestAnimationFrame(() => errorRef.current?.focus())
  }
  async function upload(event, kind) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const version = ++fileVersions.current[kind]
    setPendingFiles((value) => value + 1)
    setError('')
    try {
      const asset = await readProfileFile(file, kind)
      if (mountedRef.current && fileVersions.current[kind] === version) change(kind, asset)
    } catch (err) {
      if (mountedRef.current && fileVersions.current[kind] === version) fail(err)
    } finally {
      if (mountedRef.current) setPendingFiles((value) => Math.max(0, value - 1))
    }
  }
  function remove(kind) {
    fileVersions.current[kind] += 1
    change(kind, null)
  }
  async function save(event) {
    event.preventDefault()
    if (saving || pendingFiles) return
    setSaving(true)
    setError('')
    try {
      const editable = ['full_name', 'username', 'bio', 'city', 'country', 'goals', 'availability', 'website', 'portfolio', 'linkedin', 'public_email', 'professional_background', 'education', 'fundraising_status', 'startup', 'privacy', 'avatar', 'banner']
      const payload = Object.fromEntries(editable.map((key) => [key, form[key]]))
      payload.skills = form.skills.split(',').map((item) => item.trim()).filter(Boolean)
      payload.interests = form.interests.split(',').map((item) => item.trim()).filter(Boolean)
      const updated = profileStore.save(user.id, payload)
      await onSaved(updated)
    } catch (err) {
      if (mountedRef.current) fail(err)
    } finally {
      if (mountedRef.current) setSaving(false)
    }
  }
  const tabs = [['basics', 'Basics', User], ['details', 'Details', Sparkles], ...(founder ? [['venture', 'Venture', Briefcase]] : []), ['visibility', 'Visibility', Eye]]
  return <ProfileDialog title="Edit profile" onClose={onClose} wide>
    <form className="pf-editor" onSubmit={save}>
      <nav className="pf-editor-nav" aria-label="Profile editing sections">{tabs.map(([id, title, Icon]) => <button key={id} type="button" aria-pressed={panel === id} onClick={() => setPanel(id)}><Icon size={16} aria-hidden="true" />{title}</button>)}</nav>
      <div className="pf-dialog-content">
        {error && <p className="pf-message pf-message--error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
        {panel === 'basics' && <>
          <div className="pf-editor-media">
            <div className="pf-editor-photo"><ProfileAvatar profile={form} /><div><ProfileField label="Profile photo" hint="PNG, JPEG, or WEBP · up to 512 KiB"><input type="file" aria-label="Profile photo" accept="image/png,image/jpeg,image/webp" onChange={(event) => upload(event, 'avatar')} /></ProfileField>{form.avatar && <button className="pf-text-button" type="button" onClick={() => remove('avatar')}>Remove profile photo</button>}</div><Camera size={22} aria-hidden="true" /></div>
            <div className="pf-editor-banner">{form.banner?.dataUrl ? <img src={form.banner.dataUrl} alt="Your selected banner" /> : <span><ImagePlus size={25} aria-hidden="true" />Make your dossier yours</span>}</div>
            <ProfileField label="Profile banner" hint="PNG, JPEG, or WEBP · up to 1 MiB"><input type="file" aria-label="Profile banner" accept="image/png,image/jpeg,image/webp" onChange={(event) => upload(event, 'banner')} /></ProfileField>
            {form.banner && <button className="pf-text-button" type="button" onClick={() => remove('banner')}>Remove profile banner</button>}
          </div>
          <div className="pf-form-grid">{BASIC_FIELDS.map(([key, label, maxLength, required]) => <ProfileField key={key} label={label} required={required} hint={key === 'username' ? '3–30 letters, numbers or underscores.' : undefined}><input aria-label={label} value={form[key] ?? ''} onChange={(event) => change(key, event.target.value)} maxLength={maxLength} required={required} autoComplete={key === 'full_name' ? 'name' : key === 'username' ? 'username' : 'off'} /></ProfileField>)}</div>
          <ProfileField label="Bio" hint="A short introduction to who you are and what you are building."><textarea aria-label="Bio" value={form.bio ?? ''} onChange={(event) => change('bio', event.target.value)} maxLength={1000} rows={4} /></ProfileField>
          <p className="pf-note">Your account email and role are managed separately. Updating your public contact does not change your sign-in email.</p>
        </>}
        {panel === 'details' && <>
          <div className="pf-form-grid">
            <ProfileField label="Skills (comma separated)"><input aria-label="Skills (comma separated)" value={form.skills} onChange={(event) => change('skills', event.target.value)} maxLength={1000} placeholder="Product design, Research, Strategy" /></ProfileField>
            <ProfileField label="Interests (comma separated)"><input aria-label="Interests (comma separated)" value={form.interests} onChange={(event) => change('interests', event.target.value)} maxLength={1000} placeholder="Climate, Education, Technology" /></ProfileField>
            <ProfileField label="Collaboration availability"><select aria-label="Collaboration availability" value={form.availability ?? 'unspecified'} onChange={(event) => change('availability', event.target.value)}><option value="unspecified">Not specified</option><option value="open">Open to collaboration</option><option value="selective">Open to selected opportunities</option><option value="unavailable">Not available currently</option></select></ProfileField>
            {founder && <ProfileField label="Fundraising status"><select aria-label="Fundraising status" value={form.fundraising_status ?? 'undisclosed'} onChange={(event) => change('fundraising_status', event.target.value)}><option value="undisclosed">Prefer not to disclose</option><option value="not_raising">Not raising</option><option value="preparing">Preparing to raise</option><option value="raising">Raising</option></select></ProfileField>}
          </div>
          {DETAIL_FIELDS.map(([key, label, maxLength, multiline]) => <ProfileField label={label} key={key}>{multiline ? <textarea aria-label={label} rows={3} value={form[key] ?? ''} onChange={(event) => change(key, event.target.value)} maxLength={maxLength} /> : <input aria-label={label} type={key === 'public_email' ? 'email' : 'url'} value={form[key] ?? ''} onChange={(event) => change(key, event.target.value)} maxLength={maxLength} placeholder={key === 'public_email' ? 'Public contact email (optional)' : 'https://'} />}</ProfileField>)}
        </>}
        {panel === 'venture' && founder && <>
          <p className="pf-note">Describe your venture in your own words. These details do not alter your projects, assessment results, or roadmap progress.</p>
          {VENTURE_FIELDS.map(([key, label, maxLength]) => <ProfileField key={key} label={label}>{key === 'name' || key === 'website' ? <input aria-label={label} type={key === 'website' ? 'url' : 'text'} value={form.startup[key] ?? ''} onChange={(event) => change('startup', { ...form.startup, [key]: event.target.value })} maxLength={maxLength} /> : <textarea aria-label={label} value={form.startup[key] ?? ''} onChange={(event) => change('startup', { ...form.startup, [key]: event.target.value })} maxLength={maxLength} rows={3} />}</ProfileField>)}
        </>}
        {panel === 'visibility' && <>
          <div className="pf-privacy-intro"><Shield size={24} aria-hidden="true" /><div><h3>Choose what others can see</h3><p>Your name, handle, role, photo, and banner identify your public profile. Your sign-in email and passport application are always private.</p></div></div>
          <div className="pf-visibility-grid">{VISIBILITY_FIELDS.filter(([key]) => founder || !['startup', 'fundraising_status', 'projects', 'achievements'].includes(key)).map(([key, label]) => <label key={key} className="pf-check"><input type="checkbox" aria-label={`Show ${label.toLowerCase()} on public profile`} checked={Boolean(form.privacy[key])} onChange={(event) => change('privacy', { ...form.privacy, [key]: event.target.checked })} /><span>{label}<small>{form.privacy[key] ? 'Visible on public profile' : 'Only you'}</small></span><Eye size={15} aria-hidden="true" /></label>)}</div>
          <p className="pf-note">Save your changes, then open Public preview to check exactly what you are sharing.</p>
        </>}
        {pendingFiles > 0 && <p className="pf-note" role="status">Reading your upload…</p>}
      </div>
      <footer className="pf-dialog-actions"><button type="button" className="pf-button" onClick={onClose}>Cancel</button><button type="submit" className="pf-button pf-button--primary" disabled={saving || pendingFiles > 0}><Save size={16} aria-hidden="true" />{saving ? 'Saving…' : 'Save profile'}</button></footer>
    </form>
  </ProfileDialog>
}
