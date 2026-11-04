import assert from 'node:assert/strict'
import test from 'node:test'
import { readMockPublicProfile } from '../src/features/social/services/mock_public_profiles.js'

test('public demo profiles expose only directory identity and non-sensitive profile fields', () => {
  const profile = readMockPublicProfile('ava-chen')

  assert.deepEqual(
    { id: profile.id, full_name: profile.full_name, username: profile.username, role: profile.role },
    { id: 'ava-chen', full_name: 'Ava Chen', username: 'ava.builds', role: 'founder' },
  )
  for (const privateField of ['email', 'public_email', 'verification_status', 'startup', 'fundraising_status', 'privacy']) {
    assert.equal(Object.hasOwn(profile, privateField), false)
  }
})

test('unknown profile IDs never fall back to another user', () => {
  assert.equal(readMockPublicProfile('not-a-directory-member'), null)
  assert.equal(readMockPublicProfile(''), null)
})
