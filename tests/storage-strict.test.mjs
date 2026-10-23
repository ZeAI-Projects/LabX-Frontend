import assert from 'node:assert/strict';
import test from 'node:test';
import { createSafeStorage } from '../src/services/storage/local_storage.js';

test('strict workflow writes preserve the previous record on failure and recover on retry', () => {
  const values = new Map();
  let full = false;
  const storage = createSafeStorage({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { if (full) throw new Error('QuotaExceededError'); values.set(key, value); },
  });
  storage.writeJSONStrict('workflow', { status: 'pending' });
  full = true;
  assert.throws(() => storage.writeJSONStrict('workflow', { status: 'accepted' }), /not been saved/);
  assert.deepEqual(storage.readJSON('workflow'), { status: 'pending' });
  assert.equal(JSON.parse(values.get('workflow')).status, 'pending');
  full = false;
  storage.writeJSONStrict('workflow', { status: 'accepted' });
  assert.deepEqual(storage.readJSON('workflow'), { status: 'accepted' });
});

test('strict writes never claim persistence with an absent storage backend', () => {
  const storage = createSafeStorage(null);
  assert.throws(() => storage.writeJSONStrict('workflow', { status: 'accepted' }), /unavailable/);
  assert.equal(storage.readJSON('workflow'), null);
  storage.writeJSON('draft', { notes: 'Existing memory-only fallback still works.' });
  assert.ok(storage.readJSON('draft').notes);
});
