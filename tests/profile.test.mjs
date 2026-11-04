import test from 'node:test'
import assert from 'node:assert/strict'
import { createProfileStore, profileKey } from '../src/features/profile/services/profile_store.js'
import { PROFILE_FILE_LIMITS, validateProfileFile, validatePassportEvidence } from '../src/features/profile/services/profile_files.js'
import { profileTextFromTags, tagsFromProfileText } from '../src/features/profile/services/profile_tag_values.js'
import { PROFILE_TAG_SUGGESTIONS } from '../src/features/profile/services/profile_suggestions.js'

const user = { id: 'profile-owner', role: 'founder', full_name: 'Initial Founder', username: 'initial_founder', email: 'private@example.test' }
const fixedNow = Date.parse('2026-10-20T10:00:00Z')
function memoryStorage() {
  const values = new Map()
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) }
}
function fixture({ storage = memoryStorage(), initialUser = user } = {}) {
  let current = { ...initialUser }
  let updates = 0
  let rejectIdentity = false
  const auth = {
    getUser: () => current,
    updateProfileIdentity(details, expectedUserId) {
      updates += 1
      assert.equal(current.id, expectedUserId)
      if (rejectIdentity) throw new Error('Username already taken.')
      current = { ...current, ...details }
      return { ...current }
    },
  }
  return {
    auth, storage,
    store: createProfileStore({ storage, auth, now: () => fixedNow }),
    switchUser(next) { current = next },
    rejectIdentity() { rejectIdentity = true },
    updates: () => updates,
  }
}
const png = () => {
  const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3])
  return { name: 'avatar.png', type: 'image/png', size: bytes.length, dataUrl: `data:image/png;base64,${bytes.toString('base64')}` }
}
const pdf = (size = 30) => {
  const bytes = Buffer.alloc(size, 65)
  bytes.write('%PDF-1.4')
  return { name: 'evidence.pdf', type: 'application/pdf', size, dataUrl: `data:application/pdf;base64,${bytes.toString('base64')}` }
}
const jpeg = (name = 'evidence.jpg') => {
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0x00])
  return { name, type: 'image/jpeg', size: bytes.length, dataUrl: `data:image/jpeg;base64,${bytes.toString('base64')}` }
}
const webp = () => {
  const bytes = Buffer.from('RIFF\u0004\u0000\u0000\u0000WEBP')
  return { name: 'avatar.webp', type: 'image/webp', size: bytes.length, dataUrl: `data:image/webp;base64,${bytes.toString('base64')}` }
}

test('profile fields, real image bytes and identity persist with explicit defaults', () => {
  const app = fixture()
  const empty = app.store.read(user.id)
  assert.equal(empty.full_name, user.full_name)
  assert.equal(empty.availability, 'unspecified')
  assert.equal(empty.fundraising_status, 'undisclosed')
  assert.equal(empty.privacy.public_email, false)
  assert.equal(empty.privacy.startup, false)
  assert.equal(empty.privacy.projects, false)
  assert.equal(empty.avatar, null)
  const saved = app.store.save(user.id, {
    full_name: '  Updated Founder  ', username: 'updated_founder', bio: '  Making progress  ',
    city: 'Chennai', state: 'Tamil Nadu', country: 'India', skills: ['Research', 'Research', 'Design'], interests: ['Climate'],
    website: 'https://example.org', avatar: png(), startup: { name: 'Project Studio', team: 'Two founders' },
    privacy: { city: false, public_email: true }, public_email: ' PUBLIC@EXAMPLE.ORG ',
  })
  assert.equal(saved.full_name, 'Updated Founder')
  assert.equal(saved.username, 'updated_founder')
  assert.equal(saved.bio, 'Making progress')
  assert.equal(saved.state, 'Tamil Nadu')
  assert.deepEqual(saved.skills, ['Research', 'Design'])
  assert.equal(saved.website, 'https://example.org/')
  assert.equal(saved.public_email, 'public@example.org')
  assert.equal(saved.updatedAt, new Date(fixedNow).toISOString())
  assert.deepEqual(saved.avatar, png())
  assert.equal(app.updates(), 1)
  assert.deepEqual(createProfileStore({ storage: app.storage, auth: app.auth }).read(user.id), saved)
  saved.startup.name = 'Caller mutation'
  assert.equal(app.store.read(user.id).startup.name, 'Project Studio')
})

test('approved verification status is presented as profile status and never inferred from email verification', () => {
  const pending = fixture()
  assert.equal(pending.store.read(user.id).verification_status, 'pending')
  assert.equal(pending.store.read(user.id).verification_status_source, null)
  const approvedUser = { ...user, verification_status: 'approved', verification_status_source: 'mock' }
  const approved = fixture({ initialUser: approvedUser })
  assert.equal(approved.store.read(user.id).verification_status, 'approved')
  assert.equal(approved.store.read(user.id).verification_status_source, 'mock')
})

test('visibility preferences persist without changing the authentication email or profile data', () => {
  const app = fixture()
  app.store.save(user.id, {
    bio: 'Public bio', city: 'Private city', country: 'India', public_email: 'chosen@example.org',
    professional_background: 'Private career', education: 'Private education', fundraising_status: 'raising',
    startup: { name: 'Private venture' }, privacy: { city: false, public_email: true },
    passport: { status: 'approved' }, email: 'attempt@example.org', role: 'investor',
  })
  const saved = app.store.read(user.id)
  assert.equal(saved.bio, 'Public bio')
  assert.equal(saved.public_email, 'chosen@example.org')
  assert.equal(saved.privacy.city, false)
  assert.equal(saved.privacy.public_email, true)
  assert.equal(saved.startup.name, 'Private venture')
  assert.equal(app.auth.getUser().email, user.email)
  app.store.save(user.id, { bio: 'Updated without editing venture or visibility settings.' })
  assert.equal(app.store.read(user.id).startup.name, 'Private venture')
  assert.equal(app.store.read(user.id).privacy.city, false)
  assert.equal(app.store.read(user.id).privacy.public_email, true)
  app.store.save(user.id, { privacy: { city: true, public_email: false } })
  assert.equal(app.store.read(user.id).privacy.city, true)
  assert.equal(app.store.read(user.id).privacy.public_email, false)
})

test('all fields validate before identity mutation and identity rejection does not replace details', () => {
  const app = fixture()
  app.store.save(user.id, { bio: 'Original' })
  const before = app.store.read(user.id)
  const count = app.updates()
  for (const invalid of [
    { bio: 'x'.repeat(1001) }, { city: 4 }, { state: 4 }, { skills: [''] }, { interests: Array(21).fill('Test') },
    { website: 'javascript:alert(1)' }, { portfolio: 'http://example.org' }, { linkedin: 'https://user:pass@example.org' },
    { public_email: 'invalid' }, { privacy: { bio: 'public' } }, { privacy: null }, { startup: null },
    { availability: 'busy' }, { fundraising_status: 'funded' }, { startup: { name: 'x'.repeat(121) } },
    { avatar: { ...png(), dataUrl: 'data:image/png;base64,SGVsbG8=' } },
  ]) {
    assert.throws(() => app.store.save(user.id, { full_name: 'Should not change', ...invalid }))
    assert.deepEqual(app.store.read(user.id), before)
  }
  assert.equal(app.updates(), count)
  app.rejectIdentity()
  assert.throws(() => app.store.save(user.id, { username: 'taken', bio: 'Should not save' }), /taken/)
  assert.deepEqual(app.store.read(user.id), before)
})

test('profile reads and writes reject stale or signed-out accounts and remain separate across all roles', () => {
  const app = fixture()
  app.store.save(user.id, { bio: 'Owner bio' })
  const other = { ...user, id: 'another-account', role: 'mentor', username: 'mentor' }
  app.switchUser(other)
  for (const action of [() => app.store.read(user.id), () => app.store.save(user.id, { bio: 'stale' })]) assert.throws(action, /account changed/)
  assert.equal(app.store.read(other.id).bio, '')
  app.store.save(other.id, { bio: 'Mentor bio' })
  app.switchUser({ ...other, role: 'investor' })
  assert.equal(app.store.read(other.id).bio, 'Mentor bio')
  app.switchUser(user)
  assert.equal(app.store.read(user.id).bio, 'Owner bio')
  app.switchUser(null)
  assert.throws(() => app.store.read(user.id), /account changed/)
})

test('account is rechecked after identity validation and corrupt records fail closed', () => {
  const storage = memoryStorage()
  let current = user
  const auth = {
    getUser: () => current,
    updateProfileIdentity() { current = { ...user, id: 'changed-account' }; return current },
  }
  const store = createProfileStore({ storage, auth })
  assert.throws(() => store.save(user.id, { bio: 'Never save' }), /account changed/)
  assert.equal(storage.getItem(profileKey(user.id)), null)
  current = user
  storage.setItem(profileKey(user.id), JSON.stringify({
    version: 1, userId: user.id, details: { bio: 'Hidden if privacy corrupt', privacy: { bio: 'yes' }, avatar: { dataUrl: 'javascript:alert(1)' } },
  }))
  assert.equal(store.read(user.id).avatar, null)
  storage.setItem(profileKey(user.id), JSON.stringify({
    version: 1, userId: user.id, details: { bio: 'Private before visibility data was lost', city: 'Private city' },
  }))
  assert.equal(store.read(user.id).bio, 'Private before visibility data was lost')
  assert.ok(Object.values(store.read(user.id).privacy).every((visible) => visible === false))
  storage.setItem(profileKey(user.id), JSON.stringify({ version: 1, userId: 'foreign', details: { bio: 'Foreign bio' } }))
  assert.equal(store.read(user.id).bio, '')
})

test('uploaded files validate actual bytes, signatures, safe names and individual/aggregate limits', () => {
  assert.deepEqual(validateProfileFile(png(), 'avatar'), png())
  assert.throws(() => validateProfileFile(webp(), 'avatar'), /PNG or JPG/)
  assert.throws(() => validateProfileFile(webp(), 'evidence'), /PDF, PNG, JPG or JPEG/)
  assert.deepEqual(validateProfileFile(pdf(), 'evidence'), pdf())
  assert.deepEqual(validatePassportEvidence([pdf()]), [pdf()])
  const pngEvidence = { ...png(), name: 'evidence.png' }
  assert.deepEqual(validatePassportEvidence([pngEvidence]), [pngEvidence])
  assert.deepEqual(validatePassportEvidence([jpeg()]), [jpeg()])
  assert.deepEqual(validatePassportEvidence([jpeg('evidence.jpeg')]), [jpeg('evidence.jpeg')])
  assert.throws(() => validatePassportEvidence([webp()]), /PDF, PNG, JPG or JPEG/)
  assert.throws(() => validateProfileFile({ ...pdf(), name: 'evidence.webp' }, 'evidence'), /extension and file type/)
  assert.throws(() => validateProfileFile({ ...pdf(), name: 'evidence.jpg' }, 'evidence'), /extension and file type/)
  const renamedWebp = { ...webp(), name: 'renamed-webp.jpg', type: 'image/jpeg', dataUrl: webp().dataUrl.replace('image/webp', 'image/jpeg') }
  assert.throws(() => validateProfileFile(renamedWebp, 'evidence'), /contents do not match/)
  for (const invalid of [
    { ...png(), name: '../avatar.png' }, { ...png(), name: 'bad\u0000.png' },
    { ...png(), type: 'image/svg+xml' }, { ...png(), size: 0 }, { ...png(), size: png().size + 1 },
    { ...png(), size: PROFILE_FILE_LIMITS.avatar + 1 }, { ...png(), dataUrl: 'https://example.org/picture.png' },
    { ...png(), dataUrl: 'data:image/png;base64,@@@=' },
  ]) assert.throws(() => validateProfileFile(invalid, 'avatar'))
  assert.throws(() => validateProfileFile(pdf(), 'avatar'))
  assert.throws(() => validateProfileFile(png(), 'unknown'))
  assert.throws(() => validatePassportEvidence([null]))
  assert.throws(() => validatePassportEvidence(Array(4).fill(pdf())), /3 evidence/)
  assert.throws(() => validatePassportEvidence(Array(3).fill(pdf(800 * 1024))), /2 MB/)
  const maximum = pdf(1024 * 1024)
  assert.equal(validateProfileFile(maximum, 'evidence').size, 1024 * 1024)
})

test('profile tags preserve string-backed fields and keep suggestions field-specific', () => {
  const tags = tagsFromProfileText('Software Engineering\nProduct Design\nsoftware engineering')
  assert.deepEqual(tags, ['Software Engineering', 'Product Design'])
  assert.equal(profileTextFromTags(tags), 'Software Engineering\nProduct Design')
  assert.ok(PROFILE_TAG_SUGGESTIONS.skills.includes('Python for Data Science'))
  assert.ok(PROFILE_TAG_SUGGESTIONS.interests.includes('Artificial Intelligence'))
  assert.ok(!PROFILE_TAG_SUGGESTIONS.interests.includes('Python'))
  assert.ok(PROFILE_TAG_SUGGESTIONS.goals.includes('Looking for Mentors'))
})
