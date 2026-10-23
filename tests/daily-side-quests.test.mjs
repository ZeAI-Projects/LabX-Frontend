import test from 'node:test'
import assert from 'node:assert/strict'
import { createSafeStorage } from '../src/services/storage/local_storage.js'
import { createDailySideQuestStore, DAILY_SIDE_QUESTS } from '../src/features/dashboard/services/daily_side_quests.js'

const alice = { id: 'side-quest-alice', role: 'founder' }
const bob = { id: 'side-quest-bob', role: 'founder' }
const work = 'I learned to ask about a past experience. I will use this in my next customer interview.'

function fixture() {
  let time = Date.parse('2026-10-23T06:30:00Z')
  let failWrites = false
  const backing = new Map()
  const events = []
  const storage = createSafeStorage({
    getItem: (key) => backing.get(key) ?? null,
    setItem: (key, value) => { if (failWrites) throw new Error('QuotaExceededError'); backing.set(key, value) },
    removeItem: (key) => backing.delete(key),
  })
  const store = createDailySideQuestStore({ storage, now: () => time, emit: (id) => events.push(id) })
  return { store, backing, events, storage, setTime: (value) => { time = Date.parse(value) }, fail: (value) => { failWrites = value } }
}

test('side quests start independently with three sample missions and no coins', () => {
  const { store, backing } = fixture()
  const before = store.read(alice)
  assert.equal(before.completedCount, 0)
  assert.equal(before.totalCount, 3)
  assert.equal(before.earnedCoins, 0)
  assert.equal(before.availableCoins, DAILY_SIDE_QUESTS.reduce((total, quest) => total + quest.reward, 0))
  assert.equal(backing.size, 0, 'Reading or visiting the dashboard does not award or write anything')
})

test('completing a sample side quest saves its work and coins together, once', () => {
  const { store, backing, events } = fixture()
  const day = store.read(alice).day
  const first = store.complete(alice, 'learning-note', ` ${work} `, day)
  assert.equal(first.claimed, true)
  assert.equal(first.earnedCoins, 5)
  assert.equal(first.todayCoins, 5)
  assert.equal(first.completedCount, 1)
  assert.equal(first.availableCoins, 15)
  assert.equal(first.quests[0].work, work)
  const duplicate = store.complete(alice, 'learning-note', 'Different response', day)
  assert.equal(duplicate.claimed, false)
  assert.equal(duplicate.earnedCoins, 5)
  assert.equal(duplicate.quests[0].work, work, 'A duplicate claim does not rewrite submitted work')
  assert.deepEqual(events, [alice.id])
  assert.equal(backing.size, 1)
  assert.ok([...backing.keys()][0].startsWith('labx.side-quests.'), 'Only the dedicated side quest ledger is modified')
})

test('daily quest completion and rewards are isolated per account and survive another store instance', () => {
  const { store, storage } = fixture()
  store.complete(alice, 'customer-question', work, store.read(alice).day)
  assert.equal(store.read(bob).earnedCoins, 0)
  assert.equal(store.read(bob).completedCount, 0)
  const secondTab = createDailySideQuestStore({ storage, now: () => Date.parse('2026-10-23T07:00:00Z'), emit: () => {} })
  assert.equal(secondTab.read(alice).earnedCoins, 5)
  assert.equal(secondTab.complete(alice, 'customer-question', work, secondTab.read(alice).day).claimed, false)
  assert.equal(store.read(alice).earnedCoins, 5)
})

test('midnight IST resets missions while retaining earned coins and historical work', () => {
  const { store, setTime, backing } = fixture()
  setTime('2026-10-23T18:29:59Z')
  const previousDay = store.read(alice).day
  DAILY_SIDE_QUESTS.forEach((quest) => store.complete(alice, quest.id, work, previousDay))
  assert.equal(store.read(alice).earnedCoins, 20)
  setTime('2026-10-23T18:30:00Z')
  const nextDay = store.read(alice)
  assert.notEqual(nextDay.day, previousDay)
  assert.equal(nextDay.completedCount, 0)
  assert.equal(nextDay.todayCoins, 0)
  assert.equal(nextDay.availableCoins, 20)
  assert.equal(nextDay.earnedCoins, 20)
  assert.throws(() => store.complete(alice, 'learning-note', work, previousDay), /new day/)
  assert.equal(store.complete(alice, 'learning-note', work, nextDay.day).earnedCoins, 25)
  const saved = JSON.parse([...backing.values()][0])
  assert.equal(saved.ledger.length, 4)
  assert.equal(saved.ledger[0].work, work)
})

test('a failed write neither grants coins nor completes a quest and a retry can claim once', () => {
  const { store, fail, events, backing } = fixture()
  const day = store.read(alice).day
  store.complete(alice, 'learning-note', work, day)
  const original = [...backing.values()][0]
  fail(true)
  assert.throws(() => store.complete(alice, 'small-next-step', work, day), /Unable to save/)
  assert.equal(store.read(alice).earnedCoins, 5)
  assert.equal(store.read(alice).completedCount, 1)
  assert.equal([...backing.values()][0], original)
  assert.deepEqual(events, [alice.id])
  fail(false)
  const retry = store.complete(alice, 'small-next-step', work, day)
  assert.equal(retry.earnedCoins, 15)
  assert.equal(retry.quests.find((quest) => quest.id === 'small-next-step').work, work)
  assert.equal(store.complete(alice, 'small-next-step', work, day).earnedCoins, 15)
})

test('missing work, signed-out actions, stale days, and unknown missions cannot claim rewards', () => {
  const { store, backing, events } = fixture()
  const day = store.read(alice).day
  assert.throws(() => store.complete(null, 'learning-note', work, day), /Sign in/)
  assert.throws(() => store.complete(alice, 'unknown', work, day), /unavailable/)
  assert.throws(() => store.complete(alice, 'learning-note', work, '2026-10-22'), /new day/)
  assert.throws(() => store.complete(alice, 'learning-note', '   ', day), (error) => error.field === 'work')
  assert.equal(backing.size, 0)
  assert.equal(events.length, 0)
  assert.equal(store.read(null).earnedCoins, 0)
})

test('unrelated roadmap and achievement records cannot complete a daily side quest', () => {
  const { store, backing } = fixture()
  backing.set('labx.roadmap.example', JSON.stringify({ userId: alice.id, status: 'approved' }))
  backing.set('labx.achievements.example', JSON.stringify({ userId: alice.id, coins: 900, quests: 10 }))
  assert.equal(store.read(alice).completedCount, 0)
  assert.equal(store.read(alice).earnedCoins, 0)
})
