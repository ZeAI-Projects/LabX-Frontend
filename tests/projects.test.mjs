import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import test from 'node:test';
import { createProjectStore, projectsKey } from '../src/features/projects/services/project_store.js';
import { createMockAuthStore } from '../src/features/authentication/services/mock_auth.js';
import { draftKey } from '../src/features/assessment/services/assessment_draft.js';
import { ASSESSMENT_VERSION, createEmptyAnswers } from '../src/features/assessment/services/mock_assessment.js';
import { createRoadmapStore, roadmapWorkflowKey } from '../src/features/roadmap/services/roadmap_workflow.js';
import { createSafeStorage } from '../src/services/storage/local_storage.js';

const alice = { id: 'alice', full_name: 'Alice Founder', role: 'founder' };
const bob = { id: 'bob', full_name: 'Bob Founder', role: 'founder' };
const completeAnswers = (q1 = 1) => ({ q1, q2: 2, q3: 1, q4: 1, q5: 1, q6: 1, q7: 1, q8: 1 });

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function fixture({ initialUser = alice, storage = memoryStorage() } = {}) {
  let user = initialUser;
  let sequence = 0;
  let timestamp = Date.UTC(2026, 9, 14);
  const options = {
    storage,
    auth: { getUser: () => user },
    createId: () => `project-${++sequence}`,
    now: () => timestamp++,
  };
  return {
    storage,
    store: createProjectStore(options),
    reload: () => createProjectStore(options),
    signIn: (next) => { user = next; },
  };
}

test('project creation requires a trimmed name and does not create unnamed records', () => {
  const app = fixture();
  assert.deepEqual(app.store.listProjects(), []);
  for (const name of ['', '   ', null, 123, 'a'.repeat(101)]) {
    assert.throws(() => app.store.createProject(name), /project name/);
  }
  assert.deepEqual(app.store.listProjects(), []);
  const project = app.store.createProject('  First launch  ');
  assert.equal(project.name, 'First launch');
  assert.equal(project.owner_id, alice.id);
  assert.equal(project.created_by, alice.full_name);
  assert.equal(project.assessment_completed, false);
  assert.deepEqual(project.draft, { version: ASSESSMENT_VERSION, step: 1, answers: createEmptyAnswers() });
  assert.deepEqual(app.reload().listProjects(), [project]);
});

test('one founder can keep independent assessments and drafts for multiple projects', () => {
  const app = fixture();
  const first = app.store.createProject('Health app');
  const second = app.store.createProject('Climate app');
  const answers = { ...createEmptyAnswers(), q1: 8, q2: 3 };
  app.store.saveDraft(second.id, { version: ASSESSMENT_VERSION, step: 3, answers });
  const completed = app.store.completeProject(first.id, completeAnswers(1));
  assert.equal(completed.assessment_result.domain, 'Healthcare & MedTech');
  let projects = app.reload().listProjects();
  assert.equal(projects.find((entry) => entry.id === second.id).assessment_completed, false);
  assert.deepEqual(projects.find((entry) => entry.id === second.id).draft, { version: ASSESSMENT_VERSION, step: 3, answers });
  app.store.completeProject(second.id, completeAnswers(7));
  projects = app.reload().listProjects();
  assert.equal(projects.find((entry) => entry.id === first.id).assessment_result.domain, 'Healthcare & MedTech');
  assert.equal(projects.find((entry) => entry.id === second.id).assessment_result.domain, 'Climate & Sustainability');
});

test('renaming a completed project preserves its answers and only the summary edit endpoint may change them', () => {
  const app = fixture();
  const project = app.store.createProject('Initial name');
  const completed = app.store.completeProject(project.id, completeAnswers());
  const renamed = app.store.renameProject(project.id, '  Renamed project  ');
  assert.equal(renamed.name, 'Renamed project');
  assert.equal(renamed.created_at, completed.created_at);
  assert.equal(renamed.created_by, completed.created_by);
  assert.deepEqual(renamed.assessment_result, completed.assessment_result);
  assert.deepEqual(renamed.assessment_answers, completed.assessment_answers);
  assert.throws(() => app.store.completeProject(project.id, completeAnswers(7)), /Edit answers from its summary/);
  assert.throws(() => app.store.saveDraft(project.id, { version: ASSESSMENT_VERSION, step: 2, answers: { q1: 8 } }), /Edit answers from its summary/);
  assert.deepEqual(app.reload().listProjects()[0], renamed);
});

test('incomplete assessment submissions do not replace saved project progress', () => {
  const app = fixture();
  const project = app.store.createProject('Draft project');
  const draft = app.store.saveDraft(project.id, { version: ASSESSMENT_VERSION, step: 2, answers: { q1: 2 } });
  assert.throws(() => app.store.completeProject(project.id, { q1: 2 }), /target users/);
  assert.deepEqual(app.reload().listProjects()[0], draft);
});

test('projects are account scoped and foreign project identifiers cannot be changed', () => {
  const app = fixture();
  const first = app.store.createProject('Alice project');
  app.signIn(bob);
  assert.deepEqual(app.store.listProjects(bob.id), []);
  const second = app.store.createProject('Bob project', bob.id);
  assert.throws(() => app.store.renameProject(first.id, 'Foreign change', bob.id), /no longer available/);
  assert.throws(() => app.store.deleteProject(first.id, bob.id), /no longer available/);
  assert.deepEqual(app.reload().listProjects(), [second]);
  app.signIn(alice);
  assert.deepEqual(app.reload().listProjects(), [first]);
});

test('stale actions cannot write after an account switch or logout', () => {
  const app = fixture();
  const project = app.store.createProject('Alice project');
  app.signIn(bob);
  const mutations = [
    () => app.store.createProject('Unexpected project', alice.id),
    () => app.store.renameProject(project.id, 'Wrong account', alice.id),
    () => app.store.deleteProject(project.id, alice.id),
    () => app.store.saveDraft(project.id, { version: ASSESSMENT_VERSION, step: 2, answers: { q1: 8 } }, alice.id),
    () => app.store.completeProject(project.id, completeAnswers(), alice.id),
  ];
  mutations.forEach((mutate) => assert.throws(mutate, /account changed/));
  assert.throws(() => app.store.createProject('Cached identity'), /account changed/);
  assert.deepEqual(app.store.listProjects(alice.id), []);
  assert.deepEqual(app.reload().listProjects(bob.id), []);
  app.signIn(null);
  mutations.forEach((mutate) => assert.throws(mutate, /log in/));
  app.signIn(alice);
  assert.deepEqual(app.reload().listProjects(), [project]);
});

test('mentor sessions cannot create or mutate projects', () => {
  const app = fixture({ initialUser: { ...alice, role: 'mentor' } });
  assert.deepEqual(app.store.listProjects(), []);
  assert.throws(() => app.store.createProject('Mentor project'), /Founders/);
  assert.throws(() => app.store.deleteProject('missing'), /Founders/);
  assert.throws(() => app.store.saveDraft('missing', {}), /Founders/);
});

test('deleted projects stay deleted when a stale tab tries to save or complete them', () => {
  const app = fixture();
  const first = app.store.createProject('Delete me');
  const second = app.store.createProject('Keep me');
  const staleTab = app.reload();
  app.store.deleteProject(first.id);
  assert.throws(() => staleTab.saveDraft(first.id, { version: ASSESSMENT_VERSION, step: 2, answers: { q1: 8 } }), /no longer available/);
  assert.throws(() => staleTab.completeProject(first.id, completeAnswers()), /no longer available/);
  assert.throws(() => staleTab.renameProject(first.id, 'Resurrect'), /no longer available/);
  assert.deepEqual(staleTab.listProjects(), [second]);
});

test('legacy completed roadmaps migrate once and are not restored after deletion', () => {
  const answers = { q1: 1, q2: 2, q3: ['prototype'], q4: 1, q5: 1, q6: 1, q7: 1 };
  const legacy = {
    ...alice,
    assessment_completed: true,
    assessment_answers: answers,
    assessment_result: { domain: 'Artificial Intelligence & Machine Learning', stage: 'Launch', level: 5, guild: 'Artificial Intelligence & Machine Learning Guild', version: 3, isMock: true },
    assessment_completed_at: '2026-09-01T00:00:00.000Z',
  };
  const app = fixture({ initialUser: legacy });
  const [project] = app.store.listProjects();
  assert.equal(project.name, 'My first project');
  assert.equal(project.created_at, legacy.assessment_completed_at);
  assert.deepEqual(project.assessment_answers, answers);
  assert.deepEqual(project.assessment_result, legacy.assessment_result);
  assert.deepEqual(app.reload().listProjects(), [project]);
  app.store.deleteProject(project.id);
  assert.deepEqual(app.reload().listProjects(), []);
  const next = app.store.createProject('Next project');
  assert.equal(next.assessment_completed, false);
  assert.deepEqual(app.reload().listProjects(), [next]);
});

test('legacy drafts restart with the new questions once and never reappear after deletion', () => {
  const app = fixture();
  const answers = { ...createEmptyAnswers(), q1: 8, q2: 2 };
  app.storage.setItem(draftKey(alice.id), JSON.stringify({ version: 1, step: 3, answers }));
  assert.deepEqual(app.store.listProjects(), []);
  assert.ok(app.storage.getItem(draftKey(alice.id)));
  const first = app.store.createProject('Named existing draft');
  assert.deepEqual(first.draft, { version: ASSESSMENT_VERSION, step: 1, answers: createEmptyAnswers(), questionsUpdated: true });
  assert.equal(app.storage.getItem(draftKey(alice.id)), null);
  const second = app.store.createProject('Fresh project');
  assert.deepEqual(second.draft, { version: ASSESSMENT_VERSION, step: 1, answers: createEmptyAnswers() });
  app.store.deleteProject(first.id);
  // An old tab may still write a legacy draft, but it must never attach to another project.
  app.storage.setItem(draftKey(alice.id), JSON.stringify({ version: 1, step: 3, answers }));
  assert.deepEqual(app.reload().createProject('Third project').draft, { version: ASSESSMENT_VERSION, step: 1, answers: createEmptyAnswers() });
});

test('draft persistence normalizes malformed answers and returns to the earliest missing step', () => {
  const app = fixture();
  const project = app.store.createProject('Draft validation');
  const saved = app.store.saveDraft(project.id, { version: ASSESSMENT_VERSION, step: 99, answers: { q1: 99, q2: 2, q3: ['none_yet', 'prototype', 'prototype', 'invalid'] } });
  assert.equal(saved.draft.step, 1);
  assert.equal(saved.draft.answers.q1, null);
  assert.equal(saved.draft.answers.q2, 2);
  assert.equal(saved.draft.answers.q3, null);
});

test('malformed storage and foreign or duplicate records are ignored without leaking another account', () => {
  const app = fixture();
  for (const invalid of ['{broken', 'null', '[]', '{"version":2,"projects":[]}']) {
    app.storage.setItem(projectsKey(alice.id), invalid);
    assert.deepEqual(app.reload().listProjects(), []);
  }
  const good = app.store.createProject('Valid project');
  const data = JSON.parse(app.storage.getItem(projectsKey(alice.id)));
  data.projects.push(null, {}, { ...good, owner_id: bob.id }, { ...good, id: 'broken-date', created_at: 'not-a-date' }, good);
  app.storage.setItem(projectsKey(alice.id), JSON.stringify(data));
  assert.deepEqual(app.reload().listProjects(), [good]);
});

test('project reads and writes are cloned so callers cannot change saved answers by reference', () => {
  const app = fixture();
  const created = app.store.createProject('Original');
  created.name = 'Unsaved edit';
  const answers = completeAnswers();
  const completed = app.store.completeProject(created.id, answers);
  answers.q3 = 3;
  completed.assessment_answers.q1 = 8;
  const projects = app.store.listProjects();
  projects[0].assessment_result.domain = 'Unsaved domain';
  const [restored] = app.reload().listProjects();
  assert.equal(restored.name, 'Original');
  assert.equal(restored.assessment_answers.q1, 1);
  assert.equal(restored.assessment_answers.q3, 1);
  assert.equal(restored.assessment_result.domain, 'Healthcare & MedTech');
});

test('disabled storage uses the shared safe-storage fallback for the session', () => {
  const blocked = { getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Blocked'); }, removeItem() { throw new Error('Blocked'); } };
  const app = fixture({ storage: createSafeStorage(blocked) });
  const project = app.store.createProject('In-memory project');
  app.store.completeProject(project.id, completeAnswers());
  assert.equal(app.reload().listProjects()[0].assessment_completed, true);
  app.store.deleteProject(project.id);
  assert.deepEqual(app.reload().listProjects(), []);
});

test('real remembered-session changes are checked before a stale tab can save a project draft', async () => {
  const storage = memoryStorage();
  const authA = createMockAuthStore({ localStorage: storage, sessionStorage: memoryStorage(), crypto: webcrypto });
  const authB = createMockAuthStore({ localStorage: storage, sessionStorage: memoryStorage(), crypto: webcrypto });
  const { user } = await authA.register('alice@example.com', 'Password123!', 'Alice', { role: 'founder' });
  const projectsA = createProjectStore({ storage, auth: authA });
  const project = projectsA.createProject('Alice project', user.id);
  await authB.register('bob@example.com', 'Password123!', 'Bob', { role: 'founder' });
  assert.throws(() => projectsA.saveDraft(project.id, { version: ASSESSMENT_VERSION, step: 2, answers: { q1: 8 } }, user.id), /account changed/);
  assert.deepEqual(createProjectStore({ storage, auth: authB }).listProjects(), []);
  await authA.login('alice@example.com', 'Password123!');
  assert.deepEqual(projectsA.listProjects(user.id), [project]);
});


test('summary edits update only the chosen answer and keep domain metadata in sync', () => {
  const app = fixture();
  const project = app.store.createProject('Editable answers');
  const completed = app.store.completeProject(project.id, completeAnswers());
  const updated = app.store.updateAssessmentChoice(project.id, 'q8', 7, 1, alice.id);
  assert.deepEqual(updated.assessment_answers, { ...completeAnswers(), q8: 7 });
  assert.deepEqual(updated.assessment_result, completed.assessment_result);
  assert.equal(updated.created_at, completed.created_at);
  assert.equal(updated.assessment_completed, true);
  const changedDomain = app.store.updateAssessmentChoice(project.id, 'q1', 2, 1, alice.id);
  assert.equal(changedDomain.assessment_result.domain, 'Education');
  assert.equal(changedDomain.assessment_result.guild, 'Education Guild');
  assert.equal(changedDomain.assessment_result.stage, completed.assessment_result.stage);
  assert.equal(changedDomain.assessment_result.level, completed.assessment_result.level);
  assert.deepEqual(app.reload().listProjects()[0], changedDomain);
  changedDomain.assessment_answers.q8 = 1;
  assert.equal(app.reload().listProjects()[0].assessment_answers.q8, 7);
});

test('summary edits reject invalid values, incomplete assessments, and older question sets', () => {
  const app = fixture();
  const project = app.store.createProject('Validation');
  assert.throws(() => app.store.updateAssessmentChoice(project.id, 'q1', 2, null, alice.id), /Only completed assessments/);
  app.store.completeProject(project.id, completeAnswers());
  const before = app.storage.getItem(projectsKey(alice.id));
  for (const value of [null, 0, 99, '2', [2], 1.5]) {
    assert.throws(() => app.store.updateAssessmentChoice(project.id, 'q1', value, 1, alice.id));
    assert.equal(app.storage.getItem(projectsKey(alice.id)), before);
  }
  assert.throws(() => app.store.updateAssessmentChoice(project.id, 'unknown', 2, 1, alice.id), /valid assessment question/);
  const data = JSON.parse(before);
  delete data.projects[0].assessment_result.assessment_version;
  app.storage.setItem(projectsKey(alice.id), JSON.stringify(data));
  assert.throws(() => app.store.updateAssessmentChoice(project.id, 'q1', 2, 1, alice.id), /current questions/);
});

test('summary edits merge independent changes, reject stale answers, and enforce account ownership', () => {
  const app = fixture();
  const project = app.store.createProject('Concurrent edits');
  app.store.completeProject(project.id, completeAnswers());
  app.store.updateAssessmentChoice(project.id, 'q8', 7, 1, alice.id);
  const staleTab = app.reload();
  assert.throws(() => staleTab.updateAssessmentChoice(project.id, 'q8', 8, 1, alice.id), /changed in another tab/);
  const merged = staleTab.updateAssessmentChoice(project.id, 'q2', 3, 2, alice.id);
  assert.equal(merged.assessment_answers.q8, 7);
  assert.equal(merged.assessment_answers.q2, 3);
  app.signIn(bob);
  assert.throws(() => app.store.updateAssessmentChoice(project.id, 'q1', 2, 1, alice.id), /account changed/);
  assert.throws(() => app.store.updateAssessmentChoice(project.id, 'q1', 2, 1, bob.id), /no longer available/);
  app.signIn({ ...alice, role: 'mentor' });
  assert.throws(() => app.store.updateAssessmentChoice(project.id, 'q1', 2, 1, alice.id), /Founders/);
  app.signIn(null);
  assert.throws(() => app.store.updateAssessmentChoice(project.id, 'q1', 2, 1, alice.id), /log in/);
});

test('changing an assessment choice preserves approved roadmap missions and evidence', () => {
  const app = fixture();
  const project = app.store.createProject('Progress stays saved');
  app.store.completeProject(project.id, completeAnswers());
  const workflow = createRoadmapStore({
    storage: app.storage,
    auth: { getUser: () => alice },
    getAccess: () => ({ project: app.store.listProjects(alice.id).find(item => item.id === project.id), user: alice, role: 'owner', assignedMissionIds: [] }),
  });
  const progressed = workflow.submitMission(project.id, alice.id, 'discover-l1-m1', {
    notes: 'We interviewed prospective users and documented repeated needs and current workarounds to guide the next product experiment.',
    url: 'https://example.com/research-evidence', file: null,
  }, alice.id);
  assert.equal(progressed.completedCount, 1);
  const key = roadmapWorkflowKey(alice.id, project.id);
  const savedProgress = app.storage.getItem(key);
  app.store.updateAssessmentChoice(project.id, 'q1', 2, 1, alice.id);
  assert.equal(app.storage.getItem(key), savedProgress);
  const after = workflow.read(project.id, alice.id, alice.id);
  assert.equal(after.domain, 'Education');
  assert.equal(after.completedCount, progressed.completedCount);
  assert.equal(after.currentMilestoneId, progressed.currentMilestoneId);
  assert.deepEqual(after.submissionsByMilestone, progressed.submissionsByMilestone);
});
