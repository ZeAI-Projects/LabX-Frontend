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
    findRegisteredMemberById: (memberId) => {
      const user = [alice, bob, carol].find((item) => item.id === memberId);
      return user ? { id: user.id, full_name: user.full_name, role: user.role } : null;
    },
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

test('accepted members see owner, teammates, roles and assignments without gaining team management', () => {
  const app = fixture();
  const invitationBob = app.invite(bob, 'co-founder');
  const invitationCarol = app.invite(carol);
  app.signIn(bob);
  app.store.respondInvitation(invitationBob.id, 'accepted', bob.id);
  app.signIn(carol);
  app.store.respondInvitation(invitationCarol.id, 'accepted', carol.id);
  app.signIn(alice);
  app.store.assignMission(app.project.id, bob.id, 'discover-l1-m2', alice.id);
  app.store.assignMission(app.project.id, carol.id, 'grow-l5-m3', alice.id);
  const ownerTeam = app.store.getTeamOverview(app.project.id, alice.id, alice.id);
  assert.equal(ownerTeam.role, 'owner');
  assert.equal(ownerTeam.memberRole, 'owner');
  assert.equal(ownerTeam.members[1].email, carol.email);
  app.signIn(bob);
  const team = app.reload().getTeamOverview(app.project.id, alice.id, bob.id);
  assert.equal(team.role, 'member');
  assert.equal(team.memberRole, 'co-founder');
  assert.deepEqual(team.owner, { id: alice.id, full_name: alice.full_name });
  assert.deepEqual(team.members, [
    { id: bob.id, full_name: bob.full_name, memberRole: 'co-founder', email: bob.email, assignedMissionIds: ['discover-l1-m2'] },
    { id: carol.id, full_name: carol.full_name, memberRole: 'member', assignedMissionIds: ['grow-l5-m3'] },
  ]);
  assert.equal(team.invitations, undefined, 'Pending invitation details remain owner-only');
  assert.throws(() => app.store.getTeam(app.project.id, bob.id), /no longer available/);
  assert.throws(() => app.store.inviteFounder(app.project.id, carol.email, 'member', bob.id), /no longer available/);
  assert.throws(() => app.store.assignMission(app.project.id, bob.id, 'grow-l1-m1', bob.id), /no longer available/);
  assert.throws(() => app.store.removeAssignment(app.project.id, carol.id, 'grow-l5-m3', bob.id), /no longer available/);
  team.members[0].assignedMissionIds.push('grow-l1-m1');
  assert.deepEqual(app.store.getTeamOverview(app.project.id, alice.id, bob.id).members[0].assignedMissionIds, ['discover-l1-m2']);
});

test('team overview rejects pending, declined, unrelated, revoked and stale sessions', () => {
  const app = fixture();
  const invitation = app.invite();
  app.signIn(carol);
  assert.throws(() => app.store.getTeamOverview(app.project.id, alice.id, carol.id), /do not have access/);
  app.signIn(bob);
  assert.throws(() => app.store.getTeamOverview(app.project.id, alice.id, bob.id), /do not have access/);
  assert.throws(() => app.store.getTeamOverview(app.project.id, alice.id, alice.id), /account changed/);
  app.store.respondInvitation(invitation.id, 'declined', bob.id);
  assert.throws(() => app.store.getTeamOverview(app.project.id, alice.id, bob.id), /do not have access/);
  app.signIn(alice);
  const retry = app.invite();
  app.signIn(bob);
  app.store.respondInvitation(retry.id, 'accepted', bob.id);
  assert.equal(app.store.getTeamOverview(app.project.id, alice.id, bob.id).memberRole, 'member');
  const saved = app.storage.readJSON(COLLABORATION_KEY);
  saved.memberships.find((item) => item.memberId === bob.id).status = 'removed';
  app.storage.writeJSON(COLLABORATION_KEY, saved);
  assert.throws(() => app.store.getTeamOverview(app.project.id, alice.id, bob.id), /do not have access/);
});

test('member team overview disappears when the owner deletes the source project', () => {
  const app = fixture();
  const invitation = app.invite();
  app.signIn(bob);
  app.store.respondInvitation(invitation.id, 'accepted', bob.id);
  app.signIn(alice);
  app.projects.deleteProject(app.project.id, alice.id);
  app.signIn(bob);
  assert.throws(() => app.store.getTeamOverview(app.project.id, alice.id, bob.id), /unavailable/);
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
  saved.memberships[0].status = 'removed';
  app.storage.writeJSON(COLLABORATION_KEY, saved);
  assert.throws(() => app.store.getAccess(app.project.id, alice.id, bob.id), /do not have access/);
  for (const value of [null, [], { version: 3, invitations: saved.invitations }, { version: 1, invitations: [null, {}, { ...saved.invitations[0], recipientId: alice.id }] }]) {
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

const postDetails = {
  title: 'Help understand our users', description: 'Collaborate on customer research for this venture.',
  contribution: 'User research', skills: 'Interviewing and synthesis', expectations: 'Share weekly research notes.',
  clientToken: 'publish-attempt-1',
};
const publish = (app, details = postDetails) => app.store.publishOpportunity(app.project.id, details, alice.id);

test('published posts validate required fields, persist once, and expose only public project context', () => {
  const app = fixture();
  assert.throws(() => publish(app, {}), (error) => {
    assert.deepEqual(Object.keys(error.fields), ['title', 'description', 'contribution', 'skills']);
    return true;
  });
  assert.deepEqual(app.store.listOpportunities(alice.id), []);
  const post = publish(app);
  assert.equal(publish(app).id, post.id, 'Repeat publish token returns the original record');
  assert.equal(app.store.listOpportunities(alice.id).length, 1);
  assert.equal(app.store.listOpportunities(alice.id)[0].relationship, 'owner');
  assert.throws(() => app.store.requestToJoin(post.id, { message: 'My own project' }, alice.id), /own startup/);
  app.signIn(bob);
  const visible = app.reload().listOpportunities(bob.id)[0];
  assert.equal(visible.title, postDetails.title);
  assert.equal(visible.relationship, 'available');
  assert.equal(visible.ownRequest, null);
  assert.deepEqual(visible.founder, { id: alice.id, full_name: alice.full_name });
  assert.equal(visible.project.assessment_answers, undefined);
  assert.equal(visible.project.draft, undefined);
});

test('requests stay pending without membership, deduplicate, and protect other applicants', () => {
  const app = fixture();
  const post = publish(app);
  app.signIn(bob);
  assert.throws(() => app.store.requestToJoin(post.id, { message: ' ' }, bob.id), (error) => Boolean(error.fields.message));
  const request = app.store.requestToJoin(post.id, { message: 'I can conduct interviews.' }, bob.id);
  assert.equal(request.statusLabel, 'Pending Founder Review');
  assert.equal(app.store.listOpportunities(bob.id)[0].relationship, 'pending');
  assert.deepEqual(app.store.listJoinedProjects(bob.id), []);
  assert.throws(() => app.store.getAccess(app.project.id, alice.id, bob.id), /do not have access/);
  assert.throws(() => app.store.requestToJoin(post.id, { message: 'duplicate' }, bob.id), /already pending/);
  assert.throws(() => app.store.listJoinRequests(app.project.id, bob.id), /no longer available/);
  app.signIn(carol);
  const visible = app.store.listOpportunities(carol.id)[0];
  assert.equal(visible.ownRequest, null);
  assert.equal(JSON.stringify(visible).includes('I can conduct interviews'), false);
  assert.deepEqual(app.store.listMyJoinRequests(carol.id), []);
  assert.throws(() => app.store.respondJoinRequest(request.id, 'accepted', carol.id), /no longer available/);
  app.signIn(alice);
  assert.equal(app.store.listJoinRequests(app.project.id, alice.id)[0].applicantId, bob.id);
  assert.equal(app.store.getTeam(app.project.id, alice.id).members.length, 0);
});

test('public acceptance creates one persistent membership and shares the invitation assignment flow', () => {
  const app = fixture();
  const post = publish(app);
  app.signIn(bob);
  const request = app.store.requestToJoin(post.id, { message: 'I can help with research.' }, bob.id);
  app.signIn(alice);
  const result = app.store.respondJoinRequest(request.id, 'accepted', alice.id);
  assert.equal(result.statusLabel, 'Member Joins Startup Team');
  const notificationCount = app.changes();
  assert.equal(app.store.respondJoinRequest(request.id, 'accepted', alice.id).status, 'accepted');
  assert.equal(app.changes(), notificationCount, 'Repeat acceptance does not write or notify again');
  assert.equal(app.store.getTeam(app.project.id, alice.id).members.length, 1);
  const assigned = app.store.assignMission(app.project.id, bob.id, 'discover-l1-m2', alice.id, { instructions: 'Summarize interviews.' });
  assert.equal(assigned.status, 'assigned');
  assert.equal(app.store.assignMission(app.project.id, bob.id, 'discover-l1-m2', alice.id, { instructions: 'Summarize interviews.' }).id, assigned.id);
  assert.equal(app.store.listAssignments(app.project.id, alice.id, alice.id).length, 1);
  app.signIn(bob);
  assert.equal(app.reload().getAccess(app.project.id, alice.id, bob.id).missionAssignments[0].instructions, 'Summarize interviews.');
  assert.equal(app.store.listOpportunities(bob.id)[0].relationship, 'member');
  assert.throws(() => app.store.requestToJoin(post.id, { message: 'again' }, bob.id), /already a team member/);
  const saved = app.storage.readJSON(COLLABORATION_KEY);
  assert.equal(saved.memberships.length, 1);
  assert.equal(saved.memberships[0].source, 'request');
});

test('founder decline is a final request outcome without membership or assignment access', () => {
  const app = fixture();
  const post = publish(app);
  app.signIn(bob);
  const request = app.store.requestToJoin(post.id, { message: 'Please consider me.' }, bob.id);
  app.signIn(alice);
  assert.equal(app.store.respondJoinRequest(request.id, 'declined', alice.id).statusLabel, 'Declined by Founder');
  assert.throws(() => app.store.respondJoinRequest(request.id, 'accepted', alice.id), /final decision/);
  assert.throws(() => app.store.assignMission(app.project.id, bob.id, 'discover-l1-m2', alice.id), /accepted member/);
  app.signIn(bob);
  assert.equal(app.store.listMyJoinRequests(bob.id)[0].status, 'declined');
  assert.equal(app.store.listOpportunities(bob.id)[0].relationship, 'declined');
  assert.deepEqual(app.store.listJoinedProjects(bob.id), []);
});

test('direct member search matches a trimmed exact ID and invitations preserve messages and final decisions', () => {
  const app = fixture();
  assert.deepEqual(app.store.searchMember(app.project.id, ' bob ', alice.id), { id: bob.id, full_name: bob.full_name, role: 'founder' });
  for (const unknown of ['BOB', 'bo', bob.full_name, bob.email, 'unknown']) assert.equal(app.store.searchMember(app.project.id, unknown, alice.id), null);
  assert.throws(() => app.store.searchMember(app.project.id, ' ', alice.id), /Member ID/);
  assert.throws(() => app.store.inviteMember(app.project.id, alice.id, {}, alice.id), /cannot invite yourself/);
  assert.throws(() => app.store.inviteMember(app.project.id, 'unknown', {}, alice.id), /exact Member ID/);
  const invitation = app.store.inviteMember(app.project.id, ' bob ', { message: 'Join our research team.' }, alice.id);
  assert.equal(invitation.statusLabel, 'Pending Member Response');
  assert.equal(invitation.message, 'Join our research team.');
  assert.throws(() => app.store.inviteMember(app.project.id, bob.id, {}, alice.id), /pending invitation/);
  assert.equal(app.store.getTeam(app.project.id, alice.id).members.length, 0);
  app.signIn(bob);
  assert.deepEqual(app.store.listInvitations(bob.id)[0].inviter, { id: alice.id, full_name: alice.full_name });
  assert.equal(app.store.respondInvitation(invitation.id, 'declined', bob.id).statusLabel, 'Declined by Member');
  assert.deepEqual(app.store.listJoinedProjects(bob.id), []);
  assert.throws(() => app.store.respondInvitation(invitation.id, 'accepted', bob.id), /no longer available/);
});

test('both pending joining methods converge once and resolve all other pending paths', () => {
  for (const acceptedPath of ['request', 'invitation']) {
    const app = fixture();
    const first = publish(app);
    const second = publish(app, { ...postDetails, clientToken: 'second-post', title: 'Second opportunity' });
    const invitation = app.store.inviteMember(app.project.id, bob.id, {}, alice.id);
    app.signIn(bob);
    const request = app.store.requestToJoin(first.id, { message: 'Research contribution' }, bob.id);
    app.store.requestToJoin(second.id, { message: 'Other contribution' }, bob.id);
    if (acceptedPath === 'request') {
      app.signIn(alice);
      app.store.respondJoinRequest(request.id, 'accepted', alice.id);
      app.signIn(bob);
      assert.equal(app.store.listInvitations(bob.id)[0].status, 'resolved');
    } else {
      app.store.respondInvitation(invitation.id, 'accepted', bob.id);
      assert.equal(app.store.listMyJoinRequests(bob.id)[0].status, 'resolved');
    }
    assert.equal(app.store.respondInvitation(invitation.id, 'accepted', bob.id).statusLabel, 'Member Joins Startup Team');
    assert.equal(app.store.listJoinedProjects(bob.id).length, 1);
    assert.equal(app.store.listMyJoinRequests(bob.id)[1].status, 'resolved');
    app.signIn(alice);
    assert.equal(app.store.respondJoinRequest(request.id, 'accepted', alice.id).statusLabel, 'Member Joins Startup Team');
    assert.equal(app.store.getTeam(app.project.id, alice.id).members.length, 1);
    assert.equal(app.storage.readJSON(COLLABORATION_KEY).memberships.length, 1);
    assert.throws(() => app.store.inviteMember(app.project.id, bob.id, {}, alice.id), /belongs to this roadmap/);
  }
});

test('private incoming requests and assignments remain scoped to the owner, project and current account', () => {
  const app = fixture();
  const secondProject = app.projects.createProject('Separate venture', alice.id);
  const post = publish(app);
  app.signIn(bob);
  const request = app.store.requestToJoin(post.id, { message: 'Project-specific application' }, bob.id);
  assert.throws(() => app.store.listMyJoinRequests(alice.id), /account changed/);
  app.signIn(alice);
  assert.deepEqual(app.store.listJoinRequests(secondProject.id, alice.id), []);
  app.store.respondJoinRequest(request.id, 'accepted', alice.id);
  assert.throws(() => app.store.assignMission(secondProject.id, bob.id, 'discover-l1-m2', alice.id), /accepted member/);
  app.store.assignMission(app.project.id, bob.id, 'discover-l1-m2', alice.id);
  assert.deepEqual(app.store.listAssignments(secondProject.id, alice.id, alice.id), []);
  app.signIn(carol);
  assert.throws(() => app.store.listAssignments(app.project.id, alice.id, carol.id), /do not have access/);
  assert.throws(() => app.store.publishOpportunity(app.project.id, postDetails, carol.id), /no longer available/);
  app.signIn(bob);
  assert.throws(() => app.store.getAccess(secondProject.id, alice.id, bob.id), /do not have access/);
});

test('failed saves leave publication, pending requests and membership unchanged and allow retries', () => {
  const app = fixture();
  const originalWrite = app.storage.writeJSONStrict.bind(app.storage);
  const fail = () => { throw new Error('Storage quota exceeded'); };
  app.storage.writeJSONStrict = fail;
  assert.throws(() => publish(app), /could not be saved/);
  assert.deepEqual(app.store.listOpportunities(alice.id), []);
  app.storage.writeJSONStrict = originalWrite;
  const post = publish(app);
  app.signIn(bob);
  app.storage.writeJSONStrict = fail;
  assert.throws(() => app.store.requestToJoin(post.id, { message: 'Preserve my application' }, bob.id), /could not be saved/);
  assert.deepEqual(app.store.listMyJoinRequests(bob.id), []);
  app.storage.writeJSONStrict = originalWrite;
  const request = app.store.requestToJoin(post.id, { message: 'Preserve my application' }, bob.id);
  app.signIn(alice);
  app.storage.writeJSONStrict = fail;
  assert.throws(() => app.store.respondJoinRequest(request.id, 'accepted', alice.id), /could not be saved/);
  assert.equal(app.store.getTeam(app.project.id, alice.id).members.length, 0);
  assert.equal(app.store.listJoinRequests(app.project.id, alice.id)[0].status, 'pending');
  app.storage.writeJSONStrict = originalWrite;
  app.store.respondJoinRequest(request.id, 'accepted', alice.id);
  assert.equal(app.store.getTeam(app.project.id, alice.id).members.length, 1);
});

test('legacy accepted invitations migrate to distinct memberships while pending invitations do not', () => {
  const app = fixture();
  const accepted = app.invite(bob);
  const pending = app.invite(carol);
  app.storage.writeJSON(COLLABORATION_KEY, {
    version: 1, invitations: [{ ...accepted, status: 'accepted' }, pending],
    assignments: [{ ownerId: alice.id, projectId: app.project.id, memberId: bob.id, missionId: 'discover-l1-m2', assignedAt: accepted.createdAt }],
  });
  app.signIn(bob);
  assert.deepEqual(app.reload().getAccess(app.project.id, alice.id, bob.id).assignedMissionIds, ['discover-l1-m2']);
  app.signIn(carol);
  assert.deepEqual(app.store.listJoinedProjects(carol.id), []);
  app.signIn(alice);
  publish(app);
  const saved = app.storage.readJSON(COLLABORATION_KEY);
  assert.equal(saved.version, 2);
  assert.equal(saved.memberships.length, 1);
  assert.equal(saved.memberships[0].memberId, bob.id);
  assert.equal(saved.assignments.length, 1);
});

test('unpublished, closed and deleted opportunities never accept applications', () => {
  const app = fixture();
  const post = publish(app);
  const saved = app.storage.readJSON(COLLABORATION_KEY);
  saved.opportunities.push({ ...post, id: 'draft', status: 'draft' });
  saved.opportunities[0].status = 'closed';
  app.storage.writeJSON(COLLABORATION_KEY, saved);
  app.signIn(bob);
  assert.equal(app.store.listOpportunities(bob.id).length, 1);
  assert.equal(app.store.listOpportunities(bob.id)[0].relationship, 'unavailable');
  for (const id of [post.id, 'draft', 'unknown']) assert.throws(() => app.store.requestToJoin(id, { message: 'Try join' }, bob.id), /no longer accepting/);
  app.signIn(alice);
  app.projects.deleteProject(app.project.id, alice.id);
  app.signIn(bob);
  assert.deepEqual(app.store.listOpportunities(bob.id), []);
});

test('member ID auth lookup is exact, credential-free and excludes unregistered or non-Founder accounts', async () => {
  const auth = createMockAuthStore({ localStorage: memory(), sessionStorage: memory(), crypto: webcrypto });
  const owner = (await auth.register(alice.email, 'Owner1234!', alice.full_name, { role: 'founder' })).user;
  const recipient = (await auth.register(bob.email, 'Member1234!', bob.full_name, { role: 'founder' })).user;
  const nonFounder = (await auth.register(mentor.email, 'Mentor1234!', mentor.full_name, { role: 'mentor' })).user;
  await auth.login(alice.email, 'Owner1234!');
  await auth.requestRegistration(carol.email, 'Member1234!', carol.full_name, { role: 'founder' });
  const found = auth.findRegisteredMemberById(` ${recipient.id} `, owner.id);
  assert.equal(found.id, recipient.id);
  assert.equal(found.full_name, bob.full_name);
  assert.deepEqual(Object.keys(found).sort(), ['full_name', 'id', 'role', 'username']);
  assert.equal(found.email, undefined);
  assert.equal(auth.findRegisteredMemberById(recipient.id.slice(0, -1), owner.id), null);
  assert.equal(auth.findRegisteredMemberById(bob.email, owner.id), null);
  assert.equal(auth.findRegisteredMemberById(nonFounder.id, owner.id), null);
  assert.throws(() => auth.findRegisteredMemberById(recipient.id, recipient.id), /account changed/);
});

test('retired points offers are ignored while posts, requests and accepted memberships stay intact', () => {
  const app = fixture();
  const post = publish(app);
  const invitation = app.invite();
  app.signIn(bob);
  const request = app.store.requestToJoin(post.id, { message: 'I can help with the research.' }, bob.id);
  app.store.respondInvitation(invitation.id, 'accepted', bob.id);
  const saved = app.storage.readJSON(COLLABORATION_KEY);
  saved.opportunities[0].offeredPoints = 325;
  saved.invitations[0].offeredPoints = 450;
  app.storage.writeJSON(COLLABORATION_KEY, saved);

  assert.equal(app.reload().getAccess(app.project.id, alice.id, bob.id).role, 'member');
  const visiblePost = app.reload().listOpportunities(bob.id)[0];
  const visibleInvitation = app.reload().listInvitations(bob.id)[0];
  const visibleRequest = app.reload().listMyJoinRequests(bob.id)[0];
  assert.equal(visiblePost.id, post.id);
  assert.equal(visibleInvitation.id, invitation.id);
  assert.equal(visibleInvitation.status, 'accepted');
  assert.equal(visibleRequest.id, request.id);
  for (const record of [visiblePost, visibleInvitation, visibleRequest.opportunity]) assert.equal(Object.hasOwn(record, 'offeredPoints'), false);

  app.signIn(alice);
  app.store.assignMission(app.project.id, bob.id, 'discover-l1-m2', alice.id);
  const persisted = app.storage.readJSON(COLLABORATION_KEY);
  assert.equal(persisted.memberships.length, 1);
  assert.equal(persisted.requests.length, 1);
  assert.equal(persisted.assignments[0].memberId, bob.id);
  assert.equal(Object.hasOwn(persisted.opportunities[0], 'offeredPoints'), false);
  assert.equal(Object.hasOwn(persisted.invitations[0], 'offeredPoints'), false);
});
