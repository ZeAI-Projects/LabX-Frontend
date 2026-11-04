import assert from 'node:assert/strict'
import test from 'node:test'
import { mostRecent } from '../src/features/profile/services/profile_overview.js'

test('mostRecent returns at most three items sorted by their actual date, newest first', () => {
  const items = [
    { id: 'older', earnedAt: '2026-01-02T00:00:00Z' },
    { id: 'newest', earnedAt: '2026-04-02T00:00:00Z' },
    { id: 'middle', earnedAt: '2026-03-02T00:00:00Z' },
    { id: 'second', earnedAt: '2026-04-01T00:00:00Z' },
  ]

  assert.deepEqual(mostRecent(items, 'earnedAt').map(({ id }) => id), ['newest', 'second', 'middle'])
  assert.deepEqual(items.map(({ id }) => id), ['older', 'newest', 'middle', 'second'])
})

test('mostRecent handles fewer entries and places missing dates after dated entries', () => {
  assert.deepEqual(mostRecent([{ id: 'only', createdAt: '2026-03-01T00:00:00Z' }], 'createdAt'), [
    { id: 'only', createdAt: '2026-03-01T00:00:00Z' },
  ])
  assert.deepEqual(mostRecent([
    { id: 'missing', createdAt: null },
    { id: 'dated', createdAt: '2026-03-01T00:00:00Z' },
  ], 'createdAt').map(({ id }) => id), ['dated', 'missing'])
})
