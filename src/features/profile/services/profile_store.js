import { createSafeStorage, localStore } from '../../../services/storage/local_storage.js'
import { mockAuth } from '../../authentication/services/mock_auth.js'
import { validateProfileFile } from './profile_files.js'

export const PROFILE_CHANGE_EVENT = 'labx:profile-change'
export const profileKey = (userId) => `labx:profile:v1:${encodeURIComponent(userId)}`
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const clone = (value) => JSON.parse(JSON.stringify(value))
const textLimits = { bio: 1000, city: 100, country: 100, goals: 1000, professional_background: 2000, education: 1000 }
const startupLimits = { name: 120, description: 2000, problem: 2000, solution: 2000, product: 2000, team: 1000, milestones: 2000 }
const urls = ['website', 'portfolio', 'linkedin']
export const PROFILE_PRIVACY_DEFAULTS = Object.freeze({
  bio: true, city: true, country: true, skills: true, interests: true, goals: true, availability: true,
  website: true, portfolio: true, linkedin: true, public_email: false, professional_background: false,
  education: false, fundraising_status: false, startup: false, projects: false, achievements: true, activity: false,
})

export function profileText(value, label, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error(`${label} ${required ? 'is required and must be' : 'must be'} ${max} characters or fewer.`)
  return value.trim()
}

export function profileUrl(value, label = 'Link') {
  const input = profileText(value, label, 2048)
  if (!input) return ''
  try {
    const url = new URL(input)
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href
  } catch { /* Report the same useful validation message for every unsafe URL. */ }
  throw new Error(`${label} must be a full HTTPS link without sign-in details.`)
}

export function profileEmail(value, label = 'Email', required = false) {
  const input = profileText(value, label, 254, required)
  if (!input && !required) return ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) throw new Error(`Enter a valid ${label.toLowerCase()}.`)
  return input.toLowerCase()
}

function emptyDetails() {
  return {
    ...Object.fromEntries(Object.keys(textLimits).map((key) => [key, ''])),
    skills: [], interests: [], availability: 'unspecified', website: '', portfolio: '', linkedin: '', public_email: '',
    fundraising_status: 'undisclosed',
    startup: { ...Object.fromEntries(Object.keys(startupLimits).map((key) => [key, ''])), website: '' },
    avatar: null, banner: null, privacy: { ...PROFILE_PRIVACY_DEFAULTS }, updatedAt: null,
  }
}

function detailsFor(value, strict = true) {
  const defaults = emptyDetails()
  const source = isRecord(value) ? value : {}
  const result = { ...defaults }
  const readField = (key, validate) => {
    if (!Object.hasOwn(source, key)) return
    try { result[key] = validate(source[key]) }
    catch (error) { if (strict) throw error }
  }
  for (const [key, max] of Object.entries(textLimits)) readField(key, (item) => profileText(item, key.replaceAll('_', ' '), max))
  for (const key of urls) readField(key, (item) => profileUrl(item, key))
  readField('public_email', (item) => profileEmail(item, 'Public email'))
  for (const key of ['skills', 'interests']) readField(key, (items) => {
    if (!Array.isArray(items) || items.length > 20) throw new Error(`Add up to 20 ${key}.`)
    return [...new Set(items.map((item) => profileText(item, key, 50, true)))]
  })
  for (const [key, choices] of [['availability', ['unspecified', 'open', 'selective', 'unavailable']], ['fundraising_status', ['undisclosed', 'not_raising', 'preparing', 'raising']]]) {
    readField(key, (item) => { if (!choices.includes(item)) throw new Error(`Select a valid ${key.replaceAll('_', ' ')}.`); return item })
  }
  readField('startup', (item) => {
    if (!isRecord(item)) throw new Error('Enter valid startup details.')
    return {
      ...Object.fromEntries(Object.entries(startupLimits).map(([key, max]) => [key, profileText(item[key] ?? '', `Startup ${key}`, max)])),
      website: profileUrl(item.website ?? '', 'Startup website'),
    }
  })
  for (const key of ['avatar', 'banner']) readField(key, (item) => validateProfileFile(item, key))
  readField('privacy', (item) => {
    const privacy = strict ? { ...PROFILE_PRIVACY_DEFAULTS } : Object.fromEntries(Object.keys(PROFILE_PRIVACY_DEFAULTS).map((key) => [key, false]))
    if (!isRecord(item)) {
      if (strict) throw new Error('Choose valid visibility settings.')
      return privacy
    }
    for (const key of Object.keys(privacy)) {
      if (!Object.hasOwn(item, key)) continue
      if (typeof item[key] !== 'boolean') {
        if (strict) throw new Error('Choose public or private for each field.')
        continue
      }
      privacy[key] = item[key]
    }
    return privacy
  })
  if (!strict && Object.keys(source).length > 0 && !Object.hasOwn(source, 'privacy')) {
    result.privacy = Object.fromEntries(Object.keys(PROFILE_PRIVACY_DEFAULTS).map((key) => [key, false]))
  }
  if (typeof source.updatedAt === 'string' && Number.isFinite(Date.parse(source.updatedAt))) result.updatedAt = source.updatedAt
  return result
}

export function createProfileStore({ storage = localStore, auth = mockAuth, now = Date.now } = {}) {
  const local = storage?.readJSON ? storage : createSafeStorage(storage)
  function actor(userId) {
    const user = auth.getUser()
    if (!user || !userId || user.id !== userId || !['founder', 'mentor', 'investor'].includes(user.role)) throw new Error('Your signed-in account changed. Reopen your profile before continuing.')
    return user
  }
  function savedFor(user) {
    const saved = local.readJSON(profileKey(user.id))
    return detailsFor(saved?.version === 1 && saved.userId === user.id ? saved.details : {}, false)
  }
  function present(user, details) {
    return clone({ ...details, full_name: user.full_name || '', username: user.username || '', role: user.role })
  }
  function read(userId) {
    const user = actor(userId)
    const details = savedFor(user)
    actor(userId)
    return present(user, details)
  }
  function save(userId, payload) {
    const user = actor(userId)
    if (!isRecord(payload)) throw new Error('Enter your profile details.')
    for (const key of ['startup', 'privacy']) {
      if (Object.hasOwn(payload, key) && !isRecord(payload[key])) throw new Error(`Enter valid ${key} details.`)
    }
    const previous = savedFor(user)
    const details = detailsFor({
      ...previous, ...payload,
      startup: Object.hasOwn(payload, 'startup') ? { ...previous.startup, ...payload.startup } : previous.startup,
      privacy: Object.hasOwn(payload, 'privacy') ? { ...previous.privacy, ...payload.privacy } : previous.privacy,
    })
    const full_name = profileText(payload.full_name ?? user.full_name ?? '', 'Full name', 80, true)
    const username = profileText(payload.username ?? user.username ?? '', 'Username', 30, true)
    actor(userId)
    const updatedUser = auth.updateProfileIdentity({ full_name, username }, userId)
    actor(userId)
    details.updatedAt = new Date(now()).toISOString()
    local.writeJSON(profileKey(userId), { version: 1, userId, details })
    globalThis.window?.dispatchEvent(new Event(PROFILE_CHANGE_EVENT))
    return present(updatedUser, details)
  }
  function publicPreview(userId) {
    const profile = read(userId)
    const preview = Object.fromEntries(['full_name', 'username', 'role', 'avatar', 'banner'].map((key) => [key, profile[key]]))
    for (const key of Object.keys(PROFILE_PRIVACY_DEFAULTS)) {
      if (profile.privacy[key] && Object.hasOwn(profile, key)) preview[key] = clone(profile[key])
    }
    return preview
  }
  return { read, save, publicPreview }
}

export const profileStore = createProfileStore()
