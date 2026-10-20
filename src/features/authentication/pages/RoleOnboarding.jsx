import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ArrowRight, Check, CircleDollarSign, GraduationCap } from 'lucide-react'
import { useAuth } from '../../../hooks/use_auth.js'
import { localStore } from '../../../services/storage/local_storage.js'
import { useAuthEffects } from '../components/gamified/useAuthEffects.js'
import '../components/RoleOnboarding.css'

const profiles = {
  investor: {
    label: 'Investor',
    Icon: CircleDollarSign,
    description: 'Tell us which ideas and stages interest you.',
    heading: 'Your investment preferences',
    note: 'You can update these details whenever your interests change.',
    fields: [
      { name: 'investmentFocus', label: 'Investment focus', placeholder: 'e.g. Climate tech, healthcare, AI', maxLength: 120 },
      { name: 'preferredStage', label: 'Preferred stage', options: ['Pre-seed', 'Seed', 'Series A', 'Growth', 'Open to all stages'], maxLength: 80 },
      { name: 'organization', label: 'Organization', placeholder: 'Your firm or organization', optional: true, autoComplete: 'organization', maxLength: 120 },
    ],
  },
  mentor: {
    label: 'Mentor',
    Icon: GraduationCap,
    description: 'Share your experience and how much time you can offer.',
    heading: 'Your mentoring preferences',
    note: 'You can update these details as your experience and availability change.',
    fields: [
      { name: 'expertise', label: 'Area of expertise', placeholder: 'e.g. Product strategy, sales, engineering', maxLength: 120 },
      { name: 'experience', label: 'Years of experience', options: ['Less than 2 years', '2–5 years', '6–10 years', 'More than 10 years'], maxLength: 80 },
      { name: 'availability', label: 'Monthly availability', options: ['1–2 hours per month', '3–5 hours per month', '6–10 hours per month', 'More than 10 hours per month'], maxLength: 80 },
    ],
  },
}

const draftKey = (userId) => `labx.onboarding.draft.${userId}`

function initialValues(user, fields) {
  const draft = localStore.readJSON(draftKey(user.id))
  const saved = draft?.version === 1 && draft.role === user.role
    ? draft.values
    : user.onboarding_profile
  return Object.fromEntries(fields.map((field) => [
    field.name,
    typeof saved?.[field.name] === 'string' ? saved[field.name].slice(0, field.maxLength) : '',
  ]))
}

export function RoleOnboarding() {
  const { user, completeRoleOnboarding } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!profiles[user.role]) return <Navigate to="/dashboard" replace />
  return <RoleProfileForm key={user.id} user={user} onComplete={completeRoleOnboarding} />
}

function RoleProfileForm({ user, onComplete }) {
  const profile = profiles[user.role]
  const { Icon } = profile
  const [values, setValues] = useState(() => initialValues(user, profile.fields))
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const inputs = useRef({})
  const pending = useRef(false)
  const navigate = useNavigate()
  const { isMounted } = useAuthEffects()
  const completed = user.onboarding_completed === true

  function updateField(name, value) {
    const nextValues = { ...values, [name]: value }
    setValues(nextValues)
    setErrors((current) => ({ ...current, [name]: '' }))
    setError('')
    localStore.writeJSON(draftKey(user.id), { version: 1, role: user.role, values: nextValues })
  }

  async function submit(event) {
    event.preventDefault()
    if (pending.current) return
    const details = Object.fromEntries(profile.fields.map((field) => [field.name, values[field.name].trim()]))
    const nextErrors = {}
    for (const field of profile.fields) {
      if (!field.optional && !details[field.name]) {
        nextErrors[field.name] = field.options ? `Choose ${field.label.toLowerCase()}.` : `Enter your ${field.label.toLowerCase()}.`
      } else if (field.options && details[field.name] && !field.options.includes(details[field.name])) {
        nextErrors[field.name] = `Choose one of the available options.`
      }
    }
    setErrors(nextErrors)
    setError('')
    const firstInvalid = Object.keys(nextErrors)[0]
    if (firstInvalid) {
      inputs.current[firstInvalid]?.focus()
      return
    }
    pending.current = true
    setSaving(true)
    try {
      await onComplete(details)
      const savedDraft = localStore.readJSON(draftKey(user.id))
      if (savedDraft?.role === user.role && JSON.stringify(savedDraft.values) === JSON.stringify(values)) {
        localStore.removeItem(draftKey(user.id))
      }
      if (isMounted()) navigate('/dashboard', { replace: true })
    } catch (saveError) {
      if (isMounted()) setError(saveError.message || 'Unable to save your profile. Please try again.')
    } finally {
      pending.current = false
      if (isMounted()) setSaving(false)
    }
  }

  return (
    <section className="role-onboarding" aria-labelledby="role-profile-title">
      <div className="role-onboarding__top">
        <Link to="/dashboard" className="role-onboarding__back"><ArrowLeft size={16} aria-hidden="true" />Back to Dashboard</Link>
        <span className="role-onboarding__account">{user.email}</span>
      </div>
      <div className="role-onboarding__card">
        <header className="role-onboarding__intro">
          <span className="role-onboarding__icon"><Icon size={30} aria-hidden="true" /></span>
          <span className="role-onboarding__eyebrow">YOUR LABX JOURNEY</span>
          <h1 id="role-profile-title">{profile.label} profile</h1>
          <p>{profile.description}</p>
          <ol className="role-onboarding__steps" aria-label="Account setup progress">
            <li><span><Check size={14} aria-hidden="true" /></span>Account created</li>
            <li aria-current="step"><span>{completed ? <Check size={14} aria-hidden="true" /> : '2'}</span>{completed ? 'Update your profile' : 'Complete your profile'}</li>
          </ol>
          <p className="role-onboarding__intro-note">{profile.note}</p>
        </header>

        <div className="role-onboarding__form-panel">
          <div className="role-onboarding__form-heading">
            {completed && <span className="role-onboarding__saved"><Check size={13} aria-hidden="true" />Profile saved</span>}
            <h2>{profile.heading}</h2>
            <p>Fields marked * are required.</p>
          </div>
          {error && <p className="role-onboarding__error" role="alert"><AlertCircle size={17} aria-hidden="true" />{error}</p>}
          <form onSubmit={submit} noValidate aria-busy={saving}>
            {profile.fields.map((field) => {
              const id = `onboarding-${field.name}`
              const fieldProps = {
                id,
                name: field.name,
                value: values[field.name],
                required: !field.optional,
                disabled: saving,
                'aria-invalid': Boolean(errors[field.name]),
                'aria-describedby': errors[field.name] ? `${id}-error` : undefined,
                onChange: (event) => updateField(field.name, event.target.value),
                ref: (element) => { inputs.current[field.name] = element },
              }
              return (
                <div className="role-onboarding__field" key={field.name}>
                  <label htmlFor={id}><span className="role-onboarding__label-text">{field.label}{!field.optional && <span className="required-mark" aria-hidden="true" />}</span>{field.optional && <span aria-hidden="true">Optional</span>}</label>
                  {field.options ? (
                    <select {...fieldProps}>
                      <option value="" disabled>Select an option</option>
                      {field.options.map((option) => <option value={option} key={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input {...fieldProps} type="text" maxLength={field.maxLength} autoComplete={field.autoComplete || 'off'} placeholder={field.placeholder} />
                  )}
                  {errors[field.name] && <p className="role-onboarding__field-error" id={`${id}-error`} role="alert">{errors[field.name]}</p>}
                </div>
              )
            })}
            <button className="role-onboarding__submit" type="submit" disabled={saving}>
              {saving ? 'Saving profile...' : completed ? 'Save changes' : 'Save and continue'}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
            <p className="role-onboarding__save-note">Your progress is saved on this browser.</p>
          </form>
        </div>
      </div>
    </section>
  )
}
