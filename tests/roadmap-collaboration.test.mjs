import assert from 'node:assert/strict';
import test from 'node:test';
import { webcrypto } from 'node:crypto';
import { createCollaborationStore, COLLABORATION_KEY } from '../src/features/roadmap/services/roadmap_collaboration.js';
import { createProjectStore, projectsKey } from '../src/features/projects/services/project_store.js';
import { createMockAuthStore } from '../src/features/authentication/services/mock_auth.js';
import { createSafeStorage } from '../src/services/storage/local_storage.js';

const alice = { id: 'alice', full_name: 'Alice Founder', email: 'alice@example.com', role: 'founder' };
const bob = { id: 'bob', full_name: 'Bob Founder', email: 'bob@example.com', role: 'founder' };
const carol = { id: 'carol', full_name: 'Carol Founder', email: 'carol@example.com', role: 'founder' };
const mentor = { id: 'mentor', full_name: 'A Mentor', email: 'mentor@example.com', role: 'mentor' };
const answers = { q1: 1, q2: 2, q3: 1, q4: 1, q5: 1, q6: 1, q7: 1, q8: 1 };

function memory() {
  const values = new Map();
  return createSafeStorage({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  });
}

function fixture() {
  const storage = memory();
  let current = alice;
  let sequence = 0;
  let changes = 0;
  const auth = {
    getUser: () => current,
    findRegisteredFounderByEmail: (email) => [alice, bob, carol].find((user) => user.email === email) ?? null,
  };
  const projects = createProjectStore({ storage, auth, createId: () => `project-${++sequence}` });
  const options = { storage, auth, projects, createId: () => `invitation-${++sequence}`, notify: () => { changes += 1; } };
  const store = createCollaborationStore(options);
  const project = projects.createProject('Shared venture', alice.id);
  projects.completeProject(project.id, answers, alice.id);
  return {
    storage, auth, projects, store, project,
    signIn: (user) => { current = user; },
    reload: () => createCollaborationStore(options),
    changes: () => changes,
    invite: (recipient = bob, role = 'member') => store.inviteFounder(project.id, recipient.email, role, alice.id),
  };
}

test('invitations require an existing own project and a different registered Founder', () => {
  const app = fixture();
  for (const email of ['', 'invalid', 'missing@example.com', mentor.email]) {
    assert.throws(() => app.store.inviteFounder(app.project.id, email, 'member', alice.id), /email|Founder/);
  }
  assert.throws(() => app.invite(alice), /already own/);
  assert.throws(() => app.store.inviteFounder(app.project.id, bob.email, 'admin', alice.id), /Co-founder or Member/);
  assert.throws(() => app.store.inviteFounder('missing', bob.email, 'member', alice.id), /no longer available/);
  const invitation = app.store.inviteFounder(app.project.id, ' BOB@EXAMPLE.COM ', 'co-founder', alice.id);
  assert.equal(invitation.recipientId, bob.id);
  assert.equal(invitation.memberRole, 'co-founder');
  assert.equal(invitation.status, 'pending');
  assert.throws(() => app.invite(bob), /pending invitation or belongs/);
  app.signIn(carol);
  assert.throws(() => app.store.inviteFounder(app.project.id, bob.email, 'member', carol.id), /no longer available/);
});

test('only the intended recipient can accept, pending and declined invitations grant no access', () => {
  const app = fixture();
  const invitation = app.invite();
  assert.throws(() => app.store.respondInvitation(invitation.id, 'accepted', alice.id), /no longer available/);
  app.signIn(carol);
  assert.deepEqual(app.store.listInvitations(carol.id), []);
  assert.throws(() => app.store.respondInvitation(invitation.id, 'accepted', carol.id), /no longer available/);
  app.signIn(bob);
  assert.equal(app.store.listInvitations(bob.id).length, 1);
  assert.deepEqual(app.store.listJoinedProjects(bob.id), []);
  assert.throws(() => app.store.getAccess(app.project.id, alice.id, bob.id), /do not have access/);
  app.store.respondInvitation(invitation.id, 'declined', bob.id);
  assert.throws(() => app.store.getAccess(app.project.id, alice.id, bob.id), /do not have access/);
  assert.throws(() => app.store.respondInvitation(invitation.id, 'accepted', bob.id), /no longer available/);
  app.signIn(alice);
  const retry = app.invite();
  assert.notEqual(retry.id, invitation.id);
  app.signIn(bob);
  app.store.respondInvitation(retry.id, 'accepted', bob.id);
  assert.equal(app.store.getAccess(app.project.id, alice.id, bob.id).role, 'member');
});

test('joined access persists and returns a deliberately limited project without answers or draft', () => {
  const app = fixture();
  const invitation = app.invite(bob, 'co-founder');
  app.signIn(bob);
  app.store.respondInvitation(invitation.id, 'accepted', bob.id);
  const access = app.reload().getAccess(app.project.id, alice.id, bob.id);
  assert.equal(access.role, 'member');
  assert.equal(access.memberRole, 'co-founder');
  assert.deepEqual(Object.keys(access.project).sort(), ['assessment_completed', 'assessment_result', 'created_by', 'id', 'name', 'owner_id']);
  assert.deepEqual(Object.keys(access.project.assessment_result), ['domain']);
  assert.equal(access.project.assessment_answers, undefined);
  assert.equal(access.project.draft, undefined);
  assert.deepEqual(app.projects.listProjects(bob.id), [], 'Joining does not copy a project into the owned collection');
  assert.equal(app.store.listJoinedProjects(bob.id)[0].owner_id, alice.id);
  access.project.name = 'Modified copy';
  assert.equal(app.store.getAccess(app.project.id, alice.id, bob.id).project.name, 'Shared venture');
  assert.throws(() => app.store.getTeam(app.project.id, bob.id), /no longer available/);
  assert.throws(() => app.projects.renameProject(app.project.id, 'Renamed', bob.id), /no longer available/);
  assert.throws(() => app.projects.saveDraft(app.project.id, {}, bob.id), /no longer available/);
  assert.throws(() => app.projects.deleteProject(app.project.id, bob.id), /no longer available/);
});

test('owners assign canonical future missions to accepted members and assignments stay recipient scoped', () => {
  const app = fixture();
  const invitationBob = app.invite(bob);
  const invitationCarol = app.invite(carol);
  assert.throws(() => app.store.assignMission(app.project.id, bob.id, 'grow-l5-m3', alice.id), /accepted member/);
  app.signIn(bob);
  app.store.respondInvitation(invitationBob.id, 'accepted', bob.id);
  app.signIn(carol);
  app.store.respondInvitation(invitationCarol.id, 'accepted', carol.id);
  app.signIn(alice);
  assert.throws(() => app.store.assignMission(app.project.id, bob.id, 'not-a-mission', alice.id), /Choose a mission/);
  assert.throws(() => app.store.assignMission(app.project.id, bob.id, 'discover-l1-m1', alice.id), /first mission/);
  app.store.assignMission(app.project.id, bob.id, 'grow-l5-m3', alice.id);
  app.store.assignMission(app.project.id, carol.id, 'discover-l1-m2', alice.id);
  assert.equal(app.store.getTeam(app.project.id, alice.id).members.length, 2);
  app.signIn(bob);
  assert.deepEqual(app.store.getAccess(app.project.id, alice.id, bob.id).assignedMissionIds, ['grow-l5-m3']);
  assert.throws(() => app.store.assignMission(app.project.id, bob.id, 'build-l1-m1', bob.id), /no longer available/);
  app.signIn(carol);
  assert.deepEqual(app.store.getAccess(app.project.id, alice.id, carol.id).assignedMissionIds, ['discover-l1-m2']);
  app.signIn(alice);
  app.store.assignMission(app.project.id, carol.id, 'grow-l5-m3', alice.id);
  app.signIn(bob);
  assert.deepEqual(app.store.getAccess(app.project.id, alice.id, bob.id).assignedMissionIds, []);
  app.signIn(alice);
  app.store.removeAssignment(app.project.id, carol.id, 'grow-l5-m3', alice.id);
  app.signIn(carol);
  assert.deepEqual(app.store.getAccess(app.project.id, alice.id, carol.id).assignedMissionIds, ['discover-l1-m2']);
});

test('deleted owner projects disappear from invitations and joined access without stale copies', () => {
  const app = fixture();
  const invitation = app.invite();
  app.signIn(bob);
  app.store.respondInvitation(invitation.id, 'accepted', bob.id);
  app.signIn(alice);
  app.projects.deleteProject(app.project.id, alice.id);
  assert.throws(() => app.store.getAccess(app.project.id, alice.id, alice.id), /no longer available/);
  app.signIn(bob);
  assert.deepEqual(app.store.listJoinedProjects(bob.id), []);
  assert.deepEqual(app.store.listInvitations(bob.id), []);
  assert.throws(() => app.store.getAccess(app.project.id, alice.id, bob.id), /unavailable/);
});

test('pending invitation cannot be accepted after project deletion', () => {
  const app = fixture();
  const invitation = app.invite();
  app.projects.deleteProject(app.project.id, alice.id);
  app.signIn(bob);
  assert.throws(() => app.store.respondInvitation(invitation.id, 'accepted', bob.id), /no longer available/);
});

test('account changes and non-Founder sessions cannot reuse a previous screen', () => {
  const app = fixture();
  const invitation = app.invite();
  app.signIn(bob);
  for (const action of [
    () => app.store.getAccess(app.project.id, alice.id, alice.id),
    () => app.store.listJoinedProjects(alice.id),
    () => app.store.listInvitations(alice.id),
    () => app.store.inviteFounder(app.project.id, carol.email, 'member', alice.id),
    () => app.store.respondInvitation(invitation.id, 'accepted', alice.id),
    () => app.store.assignMission(app.project.id, bob.id, 'discover-l1-m2', alice.id),
  ]) assert.throws(action, /account changed/);
  app.signIn(mentor);
  assert.throws(() => app.store.listJoinedProjects(mentor.id), /Founder/);
  app.signIn(null);
  assert.throws(() => app.store.listInvitations(bob.id), /Founder/);
});

test('access rechecks membership and malformed records do not grant access', () => {
  const app = fixture();
  const invitation = app.invite();
  app.signIn(bob);
  app.store.respondInvitation(invitation.id, 'accepted', bob.id);
  const saved = app.storage.readJSON(COLLABORATION_KEY);
  saved.invitations[0].status = 'declined';
  app.storage.writeJSON(COLLABORATION_KEY, saved);
  assert.throws(() => app.store.getAccess(app.project.id, alice.id, bob.id), /do not have access/);
  for (const value of [null, [], { version: 2, invitations: saved.invitations }, { version: 1, invitations: [null, {}, { ...saved.invitations[0], recipientId: alice.id }] }]) {
    app.storage.writeJSON(COLLABORATION_KEY, value);
    assert.deepEqual(app.store.listJoinedProjects(bob.id), []);
  }
});

test('foreign raw storage must match owner identity and returns only the sanitized source', () => {
  const app = fixture();
  const invitation = app.invite();
  app.signIn(bob);
  app.store.respondInvitation(invitation.id, 'accepted', bob.id);
  const saved = app.storage.readJSON(projectsKey(alice.id));
  saved.projects[0].owner_id = carol.id;
  app.storage.writeJSON(projectsKey(alice.id), saved);
  assert.throws(() => app.store.getAccess(app.project.id, alice.id, bob.id), /unavailable/);
});

test('public founder lookup excludes pending and non-Founder accounts and never returns credential fields', async () => {
  const auth = createMockAuthStore({ localStorage: memory(), sessionStorage: memory(), crypto: webcrypto });
  const owner = (await auth.register(alice.email, 'Owner1234!', alice.full_name, { role: 'founder' })).user;
  const recipient = (await auth.register(bob.email, 'Member1234!', bob.full_name, { role: 'founder' })).user;
  await auth.register(mentor.email, 'Mentor1234!', mentor.full_name, { role: 'mentor' });
  await auth.login(alice.email, 'Owner1234!');
  await auth.requestRegistration(carol.email, 'Member1234!', carol.full_name, { role: 'founder' });
  const found = auth.findRegisteredFounderByEmail(' BOB@EXAMPLE.COM ', owner.id);
  assert.deepEqual(found, { id: recipient.id, email: bob.email, full_name: bob.full_name, role: 'founder' });
  assert.equal(auth.findRegisteredFounderByEmail(carol.email, owner.id), null);
  assert.equal(auth.findRegisteredFounderByEmail(mentor.email, owner.id), null);
  assert.throws(() => auth.findRegisteredFounderByEmail(bob.email, recipient.id), /account changed/);
});
