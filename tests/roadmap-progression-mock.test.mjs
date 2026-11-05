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
const submission = {
  notes: 'We interviewed local customers about the problem, compared their existing workarounds, and documented the evidence for our next product decision.',
  attachments: [{ id: 'evidence-1', name: 'interview-notes.pdf', type: 'application/pdf', size: 1024 }],
};

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
  assert.ok(missions.every(({ labxPoints, objective, deploymentInstructions, expectedDeliverable }) => labxPoints === 100 && objective && deploymentInstructions && expectedDeliverable));
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

test('completed visual roadmaps include saved mock deliverables and a 100-point award', () => {
  const store = createRoadmapProgressionMockStore(memoryStorage());
  const sample = { ...project, id: 'sample-complete', visualDemo: true, status: 'completed' };
  const roadmap = store.read(sample, 'founder-1');
  const completedMission = roadmap.stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones))
    .find((mission) => mission.state === 'completed');
  const submission = roadmap.submissionsByMissionId[completedMission.id];
  assert.equal(roadmap.completedCount, 75);
  assert.equal(submission.labxPointsAwarded, 100);
  assert.equal(submission.attachments.length, 2);
  assert.ok(submission.attachments.some(({ mockContent, type }) => mockContent && type.startsWith('image/')));
});

test('joined prototype members submit mock work for founder review without completing the mission', () => {
  const store = createRoadmapProgressionMockStore(memoryStorage());
  const joined = {
    ...project,
    id: 'joined-sample',
    visualDemo: true,
    visualCollection: 'joined',
    assignmentWorkStatus: 'in_progress',
    stage: 'Validate',
    level: 2,
    currentMission: 'Interview guide',
    assignedMissionId: 'validate-l2-m1',
  };
  const roadmap = store.read(joined, 'founder-1');
  const mission = roadmap.stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones))
    .find(({ name }) => name === joined.currentMission);
  const submittedRoadmap = store.submitMission(joined, 'founder-1', mission.id, submission);
  const submittedMission = submittedRoadmap.stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones))
    .find(({ id }) => id === mission.id);
  assert.equal(submittedMission.state, 'submitted');
  assert.equal(submittedRoadmap.completedCount, roadmap.completedCount);
  assert.equal(submittedRoadmap.submissionsByMissionId[mission.id].status, 'submitted');
  assert.equal(submittedRoadmap.submissionsByMissionId[mission.id].labxPointsAwarded, undefined);
  assert.throws(() => store.completeMission(joined, 'founder-1', mission.id, submission), /only the founder can complete/i);
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
