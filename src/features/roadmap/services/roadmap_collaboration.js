import { createSafeStorage, localStore } from '../../../services/storage/local_storage.js';
import { mockAuth } from '../../authentication/services/mock_auth.js';
import { projectStore, projectsKey } from '../../projects/services/project_store.js';
import { createMockRoadmap } from './mock_roadmap.js';

export const COLLABORATION_KEY = 'labx:roadmap-collaboration:v1';
export const ROADMAP_CHANGE_EVENT = 'labx:roadmap-change';
const roles = new Set(['co-founder', 'member']);
const statuses = new Set(['pending', 'accepted', 'declined']);
const catalog = createMockRoadmap().stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones));
const missionIds = new Set(catalog.map((mission) => mission.id));
const firstMissionId = catalog[0].id;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' ? value.trim() : '';
const validDate = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const clone = (value) => JSON.parse(JSON.stringify(value));

function publicProject(value, ownerId, projectId) {
  if (!isObject(value) || value.owner_id !== ownerId || value.id !== projectId
    || !text(value.id) || !text(value.name) || value.name.length > 100
    || typeof value.created_by !== 'string') return null;
  return {
    id: value.id,
    name: value.name.trim(),
    owner_id: ownerId,
    created_by: value.created_by,
    assessment_completed: value.assessment_completed === true,
    assessment_result: value.assessment_completed === true && text(value.assessment_result?.domain)
      ? { domain: value.assessment_result.domain.trim() } : null,
  };
}

export function createCollaborationStore({
  storage = localStore,
  auth = mockAuth,
  projects = projectStore,
  now = Date.now,
  createId = () => globalThis.crypto.randomUUID(),
  notify = () => globalThis.window?.dispatchEvent(new Event(ROADMAP_CHANGE_EVENT)),
} = {}) {
  const local = storage?.readJSON ? storage : createSafeStorage(storage);

  function actor(expectedUserId) {
    const user = auth.getUser();
    if (!user || user.role !== 'founder') throw new Error('Sign in as a Founder to access roadmap collaboration.');
    if (user.id !== expectedUserId) throw new Error('Your signed-in account changed. Reopen this roadmap before continuing.');
    return user;
  }

  function read() {
    const saved = local.readJSON(COLLABORATION_KEY);
    const entries = isObject(saved) && saved.version === 1 ? saved : {};
    const seen = new Set();
    const invitations = (Array.isArray(entries.invitations) ? entries.invitations : []).filter((item) => {
      if (!isObject(item) || !text(item.id) || seen.has(item.id)
        || !text(item.ownerId) || !text(item.projectId) || !text(item.recipientId)
        || item.ownerId === item.recipientId || !text(item.recipientEmail) || typeof item.recipientName !== 'string'
        || !roles.has(item.memberRole) || !statuses.has(item.status) || !validDate(item.createdAt)) return false;
      seen.add(item.id);
      return true;
    }).map((item) => ({
      id: item.id, ownerId: item.ownerId, projectId: item.projectId,
      recipientId: item.recipientId, recipientEmail: item.recipientEmail, recipientName: item.recipientName,
      memberRole: item.memberRole, status: item.status, createdAt: item.createdAt,
      respondedAt: validDate(item.respondedAt) ? item.respondedAt : null,
    }));
    const assignments = (Array.isArray(entries.assignments) ? entries.assignments : [])
      .filter((item) => isObject(item) && text(item.ownerId) && text(item.projectId) && text(item.memberId)
        && missionIds.has(item.missionId) && item.missionId !== firstMissionId && validDate(item.assignedAt))
      .map((item) => ({
        ownerId: item.ownerId, projectId: item.projectId, memberId: item.memberId,
        missionId: item.missionId, assignedAt: item.assignedAt,
      }));
    return { version: 1, invitations, assignments };
  }

  function write(data) {
    local.writeJSON(COLLABORATION_KEY, data);
    notify();
  }

  function foreignProject(ownerId, projectId) {
    const data = local.readJSON(projectsKey(ownerId));
    if (!isObject(data) || data.version !== 1 || !Array.isArray(data.projects)) return null;
    return publicProject(data.projects.find((item) => item?.id === projectId), ownerId, projectId);
  }

  function ownProject(user, projectId) {
    const project = projects.listProjects(user.id).find((item) => item.id === projectId && item.owner_id === user.id);
    if (!project) throw new Error('This project is no longer available to your account.');
    return project;
  }

  const memberFor = (data, ownerId, projectId, memberId) => data.invitations.find((item) =>
    item.ownerId === ownerId && item.projectId === projectId && item.recipientId === memberId && item.status === 'accepted');
  const assignedFor = (data, ownerId, projectId, memberId) => [...new Set(data.assignments
    .filter((item) => item.ownerId === ownerId && item.projectId === projectId && item.memberId === memberId)
    .map((item) => item.missionId))];

  return {
    getAccess(projectId, ownerId, expectedUserId) {
      const user = actor(expectedUserId);
      if (ownerId === user.id) return { project: clone(ownProject(user, projectId)), user: clone(user), role: 'owner', assignedMissionIds: [] };
      const data = read();
      const member = memberFor(data, ownerId, projectId, user.id);
      const project = member ? foreignProject(ownerId, projectId) : null;
      if (!project) throw new Error('This joined roadmap is unavailable or you do not have access.');
      return { project, user: clone(user), role: 'member', memberRole: member.memberRole, assignedMissionIds: assignedFor(data, ownerId, projectId, user.id) };
    },

    listJoinedProjects(expectedUserId) {
      const user = actor(expectedUserId);
      const data = read();
      const seen = new Set();
      return data.invitations.filter((item) => item.recipientId === user.id && item.status === 'accepted')
        .flatMap((invitation) => {
          const key = JSON.stringify([invitation.ownerId, invitation.projectId]);
          const project = foreignProject(invitation.ownerId, invitation.projectId);
          if (!project || seen.has(key)) return [];
          seen.add(key);
          return [{ ...project, memberRole: invitation.memberRole, assignedMissionIds: assignedFor(data, invitation.ownerId, invitation.projectId, user.id) }];
        });
    },

    listInvitations(expectedUserId) {
      const user = actor(expectedUserId);
      return read().invitations.filter((item) => item.recipientId === user.id)
        .flatMap((item) => {
          const project = foreignProject(item.ownerId, item.projectId);
          return project ? [{ ...item, project }] : [];
        }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    },

    getTeam(projectId, expectedUserId) {
      const user = actor(expectedUserId);
      ownProject(user, projectId);
      const data = read();
      const invitations = data.invitations.filter((item) => item.ownerId === user.id && item.projectId === projectId);
      return {
        members: invitations.filter((item) => item.status === 'accepted').map((item) => ({
          id: item.recipientId, full_name: item.recipientName, email: item.recipientEmail,
          memberRole: item.memberRole, assignedMissionIds: assignedFor(data, user.id, projectId, item.recipientId),
        })),
        invitations: invitations.filter((item) => item.status !== 'accepted'),
      };
    },

    inviteFounder(projectId, emailInput, memberRole, expectedUserId) {
      const user = actor(expectedUserId);
      ownProject(user, projectId);
      const email = text(emailInput).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid founder email address.');
      if (!roles.has(memberRole)) throw new Error('Choose Co-founder or Member.');
      const recipient = auth.findRegisteredFounderByEmail(email, user.id);
      if (!recipient) throw new Error('No registered Founder with this email was found on this browser.');
      if (recipient.id === user.id) throw new Error('You already own this roadmap.');
      const data = read();
      if (data.invitations.some((item) => item.ownerId === user.id && item.projectId === projectId
        && item.recipientId === recipient.id && item.status !== 'declined')) {
        throw new Error('This Founder already has a pending invitation or belongs to this roadmap.');
      }
      actor(expectedUserId);
      ownProject(user, projectId);
      const invitation = {
        id: createId(), ownerId: user.id, projectId, recipientId: recipient.id,
        recipientEmail: recipient.email, recipientName: recipient.full_name,
        memberRole, status: 'pending', createdAt: new Date(now()).toISOString(), respondedAt: null,
      };
      data.invitations.push(invitation);
      write(data);
      return clone(invitation);
    },

    respondInvitation(id, response, expectedUserId) {
      const user = actor(expectedUserId);
      if (!['accepted', 'declined'].includes(response)) throw new Error('Choose Accept or Decline.');
      const data = read();
      const invitation = data.invitations.find((item) => item.id === id && item.recipientId === user.id);
      if (!invitation || invitation.status !== 'pending' || !foreignProject(invitation.ownerId, invitation.projectId)) {
        throw new Error('This invitation is no longer available.');
      }
      actor(expectedUserId);
      invitation.status = response;
      invitation.respondedAt = new Date(now()).toISOString();
      write(data);
      return clone(invitation);
    },

    assignMission(projectId, memberId, missionId, expectedUserId) {
      const user = actor(expectedUserId);
      ownProject(user, projectId);
      if (!missionIds.has(missionId)) throw new Error('Choose a mission from this roadmap.');
      if (missionId === firstMissionId) throw new Error('The first mission must be completed by the owner.');
      const data = read();
      if (!memberFor(data, user.id, projectId, memberId)) throw new Error('Only an accepted member can receive a mission.');
      data.assignments = data.assignments.filter((item) => !(item.ownerId === user.id && item.projectId === projectId && item.missionId === missionId));
      const assignment = { ownerId: user.id, projectId, memberId, missionId, assignedAt: new Date(now()).toISOString() };
      data.assignments.push(assignment);
      actor(expectedUserId);
      ownProject(user, projectId);
      write(data);
      return clone(assignment);
    },

    removeAssignment(projectId, memberId, missionId, expectedUserId) {
      const user = actor(expectedUserId);
      ownProject(user, projectId);
      const data = read();
      data.assignments = data.assignments.filter((item) => !(item.ownerId === user.id && item.projectId === projectId
        && item.memberId === memberId && item.missionId === missionId));
      write(data);
    },
  };
}

export const collaborationStore = createCollaborationStore();
