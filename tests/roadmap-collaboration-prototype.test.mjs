import assert from 'node:assert/strict';
import test from 'node:test';
import { createRoadmapCollaborationPrototypeStore } from '../src/features/roadmap/services/roadmap_collaboration_prototype.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    values,
    getItem(key) {
      return values.get(key) ?? null;
    },
    writeJSONStrict(key, value) {
      values.set(key, JSON.stringify(value));
    },
  };
}

test('sample collaboration data persists independently for each owner and roadmap', () => {
  const storage = createMemoryStorage();
  const store = createRoadmapCollaborationPrototypeStore(storage);
  store.inviteByUsername('founder-a', 'roadmap-a', '@teammate');
  store.publishOpportunity('founder-a', 'roadmap-a', {
    title: 'Research partner',
    description: 'Help interview customers.',
    contribution: 'Customer interviews',
    skills: 'Research',
    expectations: '',
  });

  assert.equal(store.read('founder-a', 'roadmap-a').invitations[0].username, 'teammate');
  assert.equal(store.read('founder-a', 'roadmap-a').opportunities[0].title, 'Research partner');
  assert.deepEqual(store.read('founder-a', 'roadmap-b'), { version: 1, invitations: [], opportunities: [] });
  assert.deepEqual(store.read('founder-b', 'roadmap-a'), { version: 1, invitations: [], opportunities: [] });
});

test('sample opportunities can be listed for Join Roadmap with their project details', () => {
  const store = createRoadmapCollaborationPrototypeStore(createMemoryStorage());
  store.publishOpportunity('founder-a', 'roadmap-a', {
    title: 'Research partner',
    description: 'Help interview customers.',
    contribution: 'Customer interviews',
    skills: 'Research',
    expectations: '',
  });

  assert.deepEqual(store.listOpportunities('founder-a', [
    { id: 'roadmap-a', name: 'Northstar AI', domain: 'AI' },
    { id: 'roadmap-b', name: 'Harbor Health', domain: 'Health' },
  ]).map(({ title, project }) => ({ title, project })), [
    { title: 'Research partner', project: { id: 'roadmap-a', name: 'Northstar AI', domain: 'AI' } },
  ]);
});

test('sample username invites reject invalid and duplicate usernames', () => {
  const store = createRoadmapCollaborationPrototypeStore(createMemoryStorage());
  store.inviteByUsername('founder-a', 'roadmap-a', 'teammate');

  assert.throws(() => store.inviteByUsername('founder-a', 'roadmap-a', 'team mate'), /Enter a username/);
  assert.throws(() => store.inviteByUsername('founder-a', 'roadmap-a', '@TEAMMATE'), /already has a sample invitation/);
});

test('corrupt sample collaboration data is reported instead of treated as empty', () => {
  const storage = createMemoryStorage();
  const store = createRoadmapCollaborationPrototypeStore(storage);
  storage.values.set('labx:roadmap-prototype-collaboration:v1:founder-a:roadmap-a', '{invalid');

  assert.throws(() => store.read('founder-a', 'roadmap-a'), /Saved sample-team data is invalid/);
});
