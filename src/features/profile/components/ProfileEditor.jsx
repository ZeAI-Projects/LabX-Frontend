import { useEffect, useMemo, useRef, useState } from 'react'
import { Country, State, City } from 'country-state-city'
import { Camera, LockKeyhole, Save, User, Sparkles } from 'lucide-react'
import { ProfileAvatar, ProfileDialog, ProfileField, ProfileInfoButton } from './ProfileDialog.jsx'
import { ProfileTagInput } from './ProfileTagInput.jsx'
import { profileTextFromTags, tagsFromProfileText } from '../services/profile_tag_values.js'
import { profileStore } from '../services/profile_store.js'
import { readProfileFile } from '../services/profile_files.js'
import { PROFILE_TAG_SUGGESTIONS } from '../services/profile_suggestions.js'

const COUNTRIES = [...Country.getAllCountries()].sort((first, second) => first.name.localeCompare(second.name))
const SOCIAL_FIELDS = [
  ['website', 'Website', 2048], ['portfolio', 'Portfolio', 2048], ['linkedin', 'LinkedIn', 2048],
]

export function ProfileEditor({ user, profile, initialPanel = 'basics', onClose, onSaved }) {
  const [panel, setPanel] = useState(initialPanel)
  const [form, setForm] = useState(() => ({
    ...profile,
    skills: tagsFromProfileText(profile.skills ?? []),
    interests: tagsFromProfileText(profile.interests ?? []),
    goals: tagsFromProfileText(profile.goals ?? ''),
    professional_background: tagsFromProfileText(profile.professional_background ?? ''),
    education: tagsFromProfileText(profile.education ?? ''),
  }))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingFiles, setPendingFiles] = useState(0)
  const [previewUrls, setPreviewUrls] = useState({ avatar: null, banner: null })
  const mountedRef = useRef(true)
  const previewUrlsRef = useRef({ avatar: null, banner: null })
  const errorRef = useRef(null)
  const avatarInputRef = useRef(null)
  const bannerInputRef = useRef(null)
  const fileVersions = useRef({ avatar: 0, banner: 0 })
  const bannerDragDepth = useRef(0)
  const [draggingKind, setDraggingKind] = useState('')
  const selectedCountry = COUNTRIES.find((country) => country.name.toLowerCase() === (form.country ?? '').trim().toLowerCase())
  const states = useMemo(() => selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : [], [selectedCountry])
  const selectedState = states.find((state) => state.name.toLowerCase() === (form.state ?? '').trim().toLowerCase())
  const cities = useMemo(() => selectedCountry && selectedState ? City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode) : [], [selectedCountry, selectedState])
  useEffect(() => {
    const currentPreviewUrls = previewUrlsRef.current
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      Object.values(currentPreviewUrls).forEach((url) => { if (url) URL.revokeObjectURL(url) })
    }
  }, [])
  function change(key, value) { setForm((previous) => ({ ...previous, [key]: value })) }
  function changeCountry(value) { setForm((previous) => ({ ...previous, country: value, state: '', city: '' })) }
  function changeState(value) { setForm((previous) => ({ ...previous, state: value, city: '' })) }
  function fail(err) {
    setError(err.message || 'Your profile could not be saved.')
    requestAnimationFrame(() => errorRef.current?.focus())
  }
  function setPreviewUrl(kind, url) {
    const previousUrl = previewUrlsRef.current[kind]
    if (previousUrl) URL.revokeObjectURL(previousUrl)
    previewUrlsRef.current[kind] = url
    setPreviewUrls((previous) => ({ ...previous, [kind]: url }))
  }
  async function upload(file, kind) {
    if (!file) return
    const version = ++fileVersions.current[kind]
    setPendingFiles((value) => value + 1)
    setError('')
    try {
      const asset = await readProfileFile(file, kind)
      if (mountedRef.current && fileVersions.current[kind] === version) {
        setPreviewUrl(kind, URL.createObjectURL(file))
        change(kind, asset)
      }
    } catch (err) {
      if (mountedRef.current && fileVersions.current[kind] === version) fail(err)
    } finally {
      if (mountedRef.current) setPendingFiles((value) => Math.max(0, value - 1))
    }
  }
  function uploadFromInput(event, kind) {
    const file = event.target.files?.[0]
    event.target.value = ''
    void upload(file, kind)
  }
  function openFilePicker(event, inputRef) {
    event.preventDefault()
    event.stopPropagation()
    inputRef.current?.click()
  }
  function handleDragEnter(event, kind) {
    event.preventDefault()
    if (kind === 'banner') bannerDragDepth.current += 1
    setDraggingKind(kind)
  }
  function handleDragOver(event, kind) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setDraggingKind(kind)
  }
  function handleDragLeave(event, kind) {
    event.preventDefault()
    if (kind === 'banner') {
      bannerDragDepth.current = Math.max(0, bannerDragDepth.current - 1)
      if (bannerDragDepth.current > 0) return
    }
    if (!event.currentTarget.contains(event.relatedTarget)) setDraggingKind('')
  }
  function handleDrop(event, kind) {
    event.preventDefault()
    if (kind === 'banner') bannerDragDepth.current = 0
    setDraggingKind('')
    void upload(event.dataTransfer.files?.[0], kind)
  }
  function remove(kind) {
    fileVersions.current[kind] += 1
    setPreviewUrl(kind, null)
    change(kind, null)
  }
  function openBannerPicker() { bannerInputRef.current?.click() }
  function handleBannerKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openBannerPicker()
    }
  }
  async function save(event) {
    event.preventDefault()
    if (saving || pendingFiles) return
    setSaving(true)
    setError('')
    try {
      if (form.country && !selectedCountry) throw new Error('Choose a country from the country suggestions.')
      if (form.state && !selectedState) throw new Error('Choose a state or region from the state suggestions.')
      if (form.city && selectedState && !cities.some((city) => city.name.toLowerCase() === form.city.trim().toLowerCase())) throw new Error('Choose a city from the city suggestions.')
      const editable = ['full_name', 'city', 'state', 'country', 'goals', 'availability', 'website', 'portfolio', 'linkedin', 'public_email', 'professional_background', 'education', 'fundraising_status', 'avatar', 'banner']
      const payload = Object.fromEntries(editable.map((key) => [key, form[key]]))
      if (selectedCountry) payload.country = selectedCountry.name
      if (selectedState) payload.state = selectedState.name
      if (form.city && selectedState) payload.city = cities.find((city) => city.name.toLowerCase() === form.city.trim().toLowerCase()).name
      payload.skills = form.skills
      payload.interests = form.interests
      payload.goals = profileTextFromTags(form.goals)
      payload.professional_background = profileTextFromTags(form.professional_background)
      payload.education = profileTextFromTags(form.education)
      const updated = profileStore.save(user.id, payload)
      await onSaved(updated)
    } catch (err) {
      if (mountedRef.current) fail(err)
    } finally {
      if (mountedRef.current) setSaving(false)
    }
  }
  const tabs = [['basics', 'Basics', User], ...(user.role === 'founder' ? [['details', 'Details', Sparkles]] : [])]
  return <ProfileDialog title="Edit profile" onClose={onClose} wide>
    <form className="pf-editor" onSubmit={save}>
      <nav className="pf-editor-nav" aria-label="Profile editing sections">{tabs.map(([id, title, Icon]) => <button key={id} type="button" aria-pressed={panel === id} onClick={() => setPanel(id)}><Icon size={16} aria-hidden="true" />{title}</button>)}</nav>
      <div className="pf-dialog-content">
        {error && <p className="pf-message pf-message--error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
        {panel === 'basics' && <>
          <div className="pf-form-grid">
            <ProfileField label="Name" required info="Your name as it appears on your profile." hint="Up to 80 characters."><input aria-label="Name" value={form.full_name ?? ''} onChange={(event) => change('full_name', event.target.value)} maxLength={80} required autoComplete="name" /></ProfileField>
            <ProfileField label="Email" info="Your registered sign-in email cannot be changed here."><span className="pf-readonly-field"><input aria-label="Email" type="email" value={user.email ?? ''} readOnly autoComplete="email" /><LockKeyhole size={15} aria-hidden="true" /></span></ProfileField>
            <ProfileField label="Username" info="Your account username cannot be changed here."><span className="pf-readonly-field"><input aria-label="Username" value={user.username ?? ''} readOnly autoComplete="username" /><LockKeyhole size={15} aria-hidden="true" /></span></ProfileField>
          </div>
          <div className="pf-editor-media">
            <div className="pf-editor-photo">
              <button
                type="button"
                className={`pf-photo-drop${draggingKind === 'avatar' ? ' is-dragging' : ''}`}
                aria-label="Choose profile picture"
                onClick={(event) => openFilePicker(event, avatarInputRef)}
                onDragEnter={(event) => handleDragEnter(event, 'avatar')}
                onDragOver={(event) => handleDragOver(event, 'avatar')}
                onDragLeave={(event) => handleDragLeave(event, 'avatar')}
                onDrop={(event) => handleDrop(event, 'avatar')}
              ><ProfileAvatar profile={previewUrls.avatar ? { ...form, avatar: { ...form.avatar, dataUrl: previewUrls.avatar } } : form} /></button>
              <div className="pf-editor-photo__controls pf-field">
                <span className="pf-field__heading"><span>Profile Picture</span><ProfileInfoButton label="Profile Picture">Upload a profile picture to represent your account.</ProfileInfoButton></span>
                <small>PNG or JPEG · up to 512 KiB</small>
                {form.avatar?.name && <span className="pf-upload-filename">{form.avatar.name}</span>}
                <div className="pf-upload-actions">
                  <button className="pf-button" type="button" onClick={(event) => openFilePicker(event, avatarInputRef)}><Camera size={15} aria-hidden="true" />Choose File</button>
                  <button className="pf-text-button" type="button" onClick={(event) => openFilePicker(event, avatarInputRef)}>Update Profile Photo</button>
                  <button className="pf-text-button" type="button" disabled={!form.avatar} onClick={() => remove('avatar')}>Remove Profile Photo</button>
                </div>
                <input ref={avatarInputRef} className="pf-file-input" type="file" aria-label="Profile Picture" accept="image/png,image/jpeg" onChange={(event) => uploadFromInput(event, 'avatar')} />
              </div>
            </div>
            <div
              className={`pf-editor-banner${draggingKind === 'banner' ? ' is-dragging' : ''}${previewUrls.banner || form.banner?.dataUrl ? ' has-preview' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={previewUrls.banner || form.banner?.dataUrl ? 'Replace profile banner image' : 'Choose profile banner image'}
              onClick={openBannerPicker}
              onKeyDown={handleBannerKeyDown}
              onDragEnter={(event) => handleDragEnter(event, 'banner')}
              onDragOver={(event) => handleDragOver(event, 'banner')}
              onDragLeave={(event) => handleDragLeave(event, 'banner')}
              onDrop={(event) => handleDrop(event, 'banner')}
            >
              {(previewUrls.banner || form.banner?.dataUrl)
                ? <img src={previewUrls.banner || form.banner.dataUrl} alt="Your selected banner" />
                : <span aria-hidden="true">+</span>}
            </div>
            <div className="pf-upload-banner-controls">
              <span className="pf-field__heading"><span>Profile banner <small>PNG or JPEG · up to 1 MiB</small></span><ProfileInfoButton label="Profile Banner">Upload a banner image to personalize your profile.</ProfileInfoButton></span>
              <div className="pf-upload-actions">
                <button className="pf-button" type="button" onClick={openBannerPicker}>{previewUrls.banner || form.banner ? 'Update Banner' : 'Choose File'}</button>
                {form.banner?.name && <span className="pf-upload-filename">{form.banner.name}</span>}
                <button className="pf-text-button" type="button" disabled={!form.banner} onClick={() => remove('banner')}>Remove Profile Banner</button>
              </div>
              <input ref={bannerInputRef} className="pf-file-input" type="file" aria-label="Profile banner" accept="image/png,image/jpeg" onChange={(event) => uploadFromInput(event, 'banner')} />
            </div>
          </div>
          <div className="pf-form-grid">
            <ProfileField label="Country" info="Search for and select your country.">
              <input aria-label="Country" list="pf-country-options" value={form.country ?? ''} onChange={(event) => changeCountry(event.target.value)} autoComplete="off" />
              <datalist id="pf-country-options">{COUNTRIES.map((country) => <option key={country.isoCode} value={country.name} />)}</datalist>
            </ProfileField>
            <ProfileField label="State" info={!selectedCountry ? 'Select a country first.' : states.length ? 'Search for and select a state or region.' : 'No states or regions are available for this country.'}>
              <input aria-label="State" list="pf-state-options" value={form.state ?? ''} onChange={(event) => changeState(event.target.value)} disabled={!selectedCountry || states.length === 0} autoComplete="off" />
              <datalist id="pf-state-options">{states.map((state) => <option key={`${state.countryCode}-${state.isoCode}`} value={state.name} />)}</datalist>
            </ProfileField>
            <ProfileField label="City" info={!selectedState ? 'Select a state first.' : cities.length ? 'Search for and select a city.' : 'No cities are available for this state.'}>
              <input aria-label="City" list="pf-city-options" value={form.city ?? ''} onChange={(event) => change('city', event.target.value)} disabled={!selectedState || cities.length === 0} autoComplete="off" />
              <datalist id="pf-city-options">{cities.map((city) => <option key={`${city.countryCode}-${city.stateCode}-${city.name}`} value={city.name} />)}</datalist>
            </ProfileField>
          </div>
          <div className="pf-form-grid">
            <ProfileField label="Skills & expertise" info="Add skills that reflect your experience and strengths."><ProfileTagInput label="Skills & expertise" value={form.skills} suggestions={PROFILE_TAG_SUGGESTIONS.skills} onChange={(value) => change('skills', value)} /></ProfileField>
            <ProfileField label="Interests" info="Add topics and areas that interest you."><ProfileTagInput label="Interests" value={form.interests} suggestions={PROFILE_TAG_SUGGESTIONS.interests} onChange={(value) => change('interests', value)} /></ProfileField>
          </div>
          <ProfileField label="Goals & collaboration" info="Share your current goals and the kinds of collaboration you are looking for."><ProfileTagInput label="Goals & collaboration" value={form.goals} suggestions={PROFILE_TAG_SUGGESTIONS.goals} onChange={(value) => change('goals', value)} /></ProfileField>
          <ProfileField label="Professional Background" info="Summarize your relevant work experience and professional background."><ProfileTagInput label="Professional Background" value={form.professional_background} suggestions={PROFILE_TAG_SUGGESTIONS.professional_background} onChange={(value) => change('professional_background', value)} /></ProfileField>
          <ProfileField label="Education" info="Add your education or training background."><ProfileTagInput label="Education" value={form.education} suggestions={PROFILE_TAG_SUGGESTIONS.education} onChange={(value) => change('education', value)} /></ProfileField>
          <ProfileField label="Collaboration availability" info="Let others know whether you are currently open to collaboration."><select aria-label="Collaboration availability" value={form.availability ?? 'unspecified'} onChange={(event) => change('availability', event.target.value)}><option value="unspecified">Not specified</option><option value="open">Open to collaboration</option><option value="selective">Open to selected opportunities</option><option value="unavailable">Not available currently</option></select></ProfileField>
          <div className="pf-form-grid">{SOCIAL_FIELDS.map(([key, label, maxLength]) => <ProfileField label={label} key={key} info={`Add your ${label.toLowerCase()} link to your profile.`}><input aria-label={label} type="url" value={form[key] ?? ''} onChange={(event) => change(key, event.target.value)} maxLength={maxLength} placeholder="https://" /></ProfileField>)}</div>
          <ProfileField label="Public contact email" info="Optional contact address for people who may want to reach you." hint="Up to 254 characters."><input aria-label="Public contact email" type="email" value={form.public_email ?? ''} onChange={(event) => change('public_email', event.target.value)} maxLength={254} placeholder="Public contact email (optional)" /></ProfileField>
        </>}
        {panel === 'details' && <>
          <ProfileField label="Fundraising status" info="Choose whether you are currently raising or preparing to raise funds."><select aria-label="Fundraising status" value={form.fundraising_status ?? 'undisclosed'} onChange={(event) => change('fundraising_status', event.target.value)}><option value="undisclosed">Prefer not to disclose</option><option value="not_raising">Not raising</option><option value="preparing">Preparing to raise</option><option value="raising">Raising</option></select></ProfileField>
        </>}
        {pendingFiles > 0 && <p className="pf-note" role="status">Reading your upload…</p>}
      </div>
      <footer className="pf-dialog-actions"><button type="button" className="pf-button" onClick={onClose}>Cancel</button><button type="submit" className="pf-button pf-button--primary" disabled={saving || pendingFiles > 0}><Save size={16} aria-hidden="true" />{saving ? 'Saving…' : 'Save profile'}</button></footer>
    </form>
  </ProfileDialog>
}
