import assert from 'node:assert/strict';
import test from 'node:test';
import { createRoadmapProgressionMockStore } from '../src/features/roadmap/services/roadmap_progression_mock.js';
import { ROADMAP_MOCK_MISSION_IDS, ROADMAP_OPTIONAL_MISSION_IDS } from '../src/features/roadmap/services/mock_roadmap.js';

function memoryStorage() {
  const values = new Map();
  return {
    readJSON(key, fallback = null) {
      return values.has(key) ? JSON.parse(values.get(key)) : fallback;
    },
    writeJSONStrict(key, value) {
      values.set(key, JSON.stringify(value));
    },
  };
}

const project = { id: 'happora', domain: 'Retail & Commerce', status: 'ready', stage: 'Discover', level: 1 };
const submission = { notes: 'We interviewed local customers about the problem, compared their existing workarounds, and documented the evidence for our next product decision.', url: 'https://example.com/evidence' };

test('prototype begins at Happora Discover Level 1 Mission 1 and exposes 25 levels', () => {
  const store = createRoadmapProgressionMockStore(memoryStorage());
  const roadmap = store.read(project, 'founder-1');
  const levels = roadmap.stages.flatMap((stage) => stage.levels);
  const missions = levels.flatMap((level) => level.milestones);

  assert.equal(levels.length, 25);
  assert.equal(missions.length, 75);
  assert.equal(roadmap.currentMilestoneId, 'discover-l1-m1');
  assert.equal(ROADMAP_OPTIONAL_MISSION_IDS.length, 25);
  assert.deepEqual(levels[0].milestones.map(({ name }) => name), ['Problem Identification', 'Problem Research', 'Problem Validation']);
  assert.deepEqual(levels[0].milestones.map(({ state }) => state), ['active', 'locked', 'locked']);
  assert.equal(levels[0].milestones.every(({ isOptional }) => !isOptional), true);
});

test('prototype progress is sequential, persists, and unlocks levels and stages', () => {
  const storage = memoryStorage();
  const store = createRoadmapProgressionMockStore(storage);
  let roadmap = store.read(project, 'founder-1');

  for (const id of ROADMAP_MOCK_MISSION_IDS.slice(0, 15)) {
    roadmap = store.completeMission(project, 'founder-1', id, submission);
  }
  assert.equal(roadmap.currentMilestoneId, 'validate-l1-m1');
  assert.equal(roadmap.currentStageIndex, 1);
  assert.equal(roadmap.currentLevel, 1);
  assert.equal(roadmap.completedCount, 15);
  assert.equal(store.read(project, 'founder-1').progressPercent, 20);
  assert.equal(store.read(project, 'founder-2').completedCount, 0);
});

test('prototype unlocks all three missions in order before advancing to the next level', () => {
  const store = createRoadmapProgressionMockStore(memoryStorage());
  store.completeMission(project, 'founder-1', 'discover-l1-m1', submission);
  let roadmap = store.read(project, 'founder-1');
  assert.deepEqual(roadmap.stages[0].levels[0].milestones.map(({ state }) => state), ['completed', 'active', 'locked']);
  assert.equal(roadmap.currentMilestoneId, 'discover-l1-m2');

  store.completeMission(project, 'founder-1', 'discover-l1-m2', submission);
  roadmap = store.read(project, 'founder-1');
  assert.deepEqual(roadmap.stages[0].levels[0].milestones.map(({ state }) => state), ['completed', 'completed', 'active']);
  assert.equal(roadmap.currentMilestoneId, 'discover-l1-m3');
  assert.equal(roadmap.stages[0].levels[1].milestones[0].state, 'locked');

  roadmap = store.completeMission(project, 'founder-1', 'discover-l1-m3', submission);
  assert.equal(roadmap.stages[0].levels[0].milestones.every(({ state }) => state === 'completed'), true);
  assert.equal(roadmap.stages[0].levels[1].milestones[0].state, 'active');
  assert.equal(roadmap.currentMilestoneId, 'discover-l2-m1');
});

test('prototype rejects locked missions and reports invalid saved records', () => {
  const storage = memoryStorage();
  const store = createRoadmapProgressionMockStore(storage);
  assert.throws(() => store.completeMission(project, 'founder-1', 'discover-l1-m2', submission), /next unlocked mission/);
  const key = 'labx:roadmap-prototype:v1:founder-2:happora';
  storage.writeJSONStrict(key, { completedMissionIds: ['not-a-roadmap-mission'], submissionsByMissionId: {} });
  assert.throws(() => store.read(project, 'founder-2'), /Saved prototype progress is invalid/);
});

test('prototype completion reaches 100 percent without changing the real roadmap store', () => {
  const store = createRoadmapProgressionMockStore(memoryStorage());
  let roadmap = store.read(project, 'founder-1');
  for (const id of ROADMAP_MOCK_MISSION_IDS) roadmap = store.completeMission(project, 'founder-1', id, submission);

  assert.equal(roadmap.isComplete, true);
  assert.equal(roadmap.currentMilestoneId, null);
  assert.equal(roadmap.completedCount, 75);
  assert.equal(roadmap.progressPercent, 100);
});
