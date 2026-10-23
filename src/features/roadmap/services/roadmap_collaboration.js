import { createSafeStorage, localStore } from '../../../services/storage/local_storage.js';
import { mockAuth } from '../../authentication/services/mock_auth.js';
import { projectStore, projectsKey } from '../../projects/services/project_store.js';
import { createMockRoadmap } from './mock_roadmap.js';

// Keep the existing key so accepted invitations migrate without losing access.
export const COLLABORATION_KEY = 'labx:roadmap-collaboration:v1';
export const ROADMAP_CHANGE_EVENT = 'labx:roadmap-change';
export const TEAM_JOINED_LABEL = 'Member Joins Startup Team';
const roles = new Set(['co-founder', 'member']);
const statuses = new Set(['pending', 'accepted', 'declined', 'resolved']);
const catalog = createMockRoadmap().stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones));
const missionIds = new Set(catalog.map((mission) => mission.id));
const firstMissionId = catalog[0].id;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' ? value.trim() : '';
const validDate = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const clone = (value) => JSON.parse(JSON.stringify(value));
const sameProject = (item, ownerId, projectId) => item.ownerId === ownerId && item.projectId === projectId;
const identityKey = (item) => JSON.stringify([item.ownerId, item.projectId, item.memberId]);
const statusLabel = (item, type) => item.status === 'pending'
  ? type === 'request' ? 'Pending Founder Review' : 'Pending Member Response'
  : item.status === 'declined' ? type === 'request' ? 'Declined by Founder' : 'Declined by Member' : TEAM_JOINED_LABEL;

function publicProject(value, ownerId, projectId) {
  if (!isObject(value) || value.owner_id !== ownerId || value.id !== projectId
    || !text(value.id) || !text(value.name) || value.name.length > 100
    || typeof value.created_by !== 'string') return null;
  return {
    id: value.id, name: value.name.trim(), owner_id: ownerId, created_by: value.created_by,
    assessment_completed: value.assessment_completed === true,
    assessment_result: value.assessment_completed === true && text(value.assessment_result?.domain)
      ? { domain: value.assessment_result.domain.trim() } : null,
  };
}

function validRows(value, validate, map) {
  const seen = new Set();
  return (Array.isArray(value) ? value : []).filter((item) => {
    if (!isObject(item) || !text(item.id) || seen.has(item.id) || !validate(item)) return false;
    seen.add(item.id);
    return true;
  }).map(map);
}

export function createCollaborationStore({
  storage = localStore, auth = mockAuth, projects = projectStore, now = Date.now,
  createId = () => globalThis.crypto.randomUUID(),
  notify = () => globalThis.window?.dispatchEvent(new Event(ROADMAP_CHANGE_EVENT)),
} = {}) {
  const local = storage?.readJSON ? storage : createSafeStorage(storage);
  const timestamp = () => new Date(now()).toISOString();

  function actor(expectedUserId) {
    const user = auth.getUser();
    if (!user || user.role !== 'founder') throw new Error('Sign in as a Founder to access roadmap collaboration.');
    if (user.id !== expectedUserId) throw new Error('Your signed-in account changed. Reopen this roadmap before continuing.');
    return user;
  }

  function read() {
    const saved = local.readJSON(COLLABORATION_KEY);
    const entries = isObject(saved) && [1, 2].includes(saved.version) ? saved : {};
    const invitations = validRows(entries.invitations,
      (item) => text(item.ownerId) && text(item.projectId) && text(item.recipientId)
        && item.ownerId !== item.recipientId && typeof item.recipientName === 'string'
        && roles.has(item.memberRole) && statuses.has(item.status) && validDate(item.createdAt),
      (item) => ({
        id: item.id, ownerId: item.ownerId, projectId: item.projectId, recipientId: item.recipientId,
        recipientEmail: text(item.recipientEmail), recipientName: item.recipientName,
        memberRole: item.memberRole, message: text(item.message), status: item.status, createdAt: item.createdAt,
        respondedAt: validDate(item.respondedAt) ? item.respondedAt : null,
      }));
    const opportunities = validRows(entries.opportunities,
      (item) => text(item.ownerId) && text(item.projectId) && text(item.title) && text(item.description)
        && text(item.contribution) && text(item.skills) && ['published', 'closed'].includes(item.status) && validDate(item.createdAt),
      (item) => ({
        id: item.id, ownerId: item.ownerId, projectId: item.projectId, title: text(item.title),
        description: text(item.description), contribution: text(item.contribution), skills: text(item.skills),
        expectations: text(item.expectations), clientToken: text(item.clientToken), status: item.status, createdAt: item.createdAt,
      }));
    const requests = validRows(entries.requests,
      (item) => text(item.ownerId) && text(item.projectId) && text(item.applicantId) && item.ownerId !== item.applicantId
        && opportunities.some((opportunity) => opportunity.id === item.opportunityId && sameProject(opportunity, item.ownerId, item.projectId))
        && text(item.applicantName) && text(item.message) && statuses.has(item.status) && validDate(item.createdAt),
      (item) => ({
        id: item.id, ownerId: item.ownerId, projectId: item.projectId, opportunityId: item.opportunityId,
        applicantId: item.applicantId, applicantName: item.applicantName, message: text(item.message),
        status: item.status, createdAt: item.createdAt, respondedAt: validDate(item.respondedAt) ? item.respondedAt : null,
      }));
    const memberships = validRows(entries.memberships,
      (item) => text(item.ownerId) && text(item.projectId) && text(item.memberId) && item.memberId !== item.ownerId
        && typeof item.memberName === 'string' && roles.has(item.memberRole) && ['active', 'removed'].includes(item.status) && validDate(item.joinedAt),
      (item) => ({
        id: item.id, ownerId: item.ownerId, projectId: item.projectId, memberId: item.memberId,
        memberName: item.memberName, memberEmail: text(item.memberEmail), memberRole: item.memberRole,
        status: item.status, joinedAt: item.joinedAt, source: item.source === 'request' ? 'request' : 'invitation', sourceId: text(item.sourceId),
      }));
    if (entries.version === 1) {
      for (const item of invitations.filter((invitation) => invitation.status === 'accepted')) {
        if (!memberships.some((member) => sameProject(member, item.ownerId, item.projectId) && member.memberId === item.recipientId)) {
          memberships.push({
            id: `membership:${item.id}`, ownerId: item.ownerId, projectId: item.projectId, memberId: item.recipientId,
            memberName: item.recipientName, memberEmail: item.recipientEmail, memberRole: item.memberRole,
            status: 'active', joinedAt: item.respondedAt || item.createdAt, source: 'invitation', sourceId: item.id,
          });
        }
      }
    }
    const uniqueMemberships = [...new Map(memberships.map((item) => [identityKey(item), item])).values()];
    const assignments = (Array.isArray(entries.assignments) ? entries.assignments : [])
      .filter((item) => isObject(item) && text(item.ownerId) && text(item.projectId) && text(item.memberId)
        && missionIds.has(item.missionId) && item.missionId !== firstMissionId && validDate(item.assignedAt)
        && uniqueMemberships.some((member) => member.status === 'active' && sameProject(member, item.ownerId, item.projectId) && member.memberId === item.memberId))
      .map((item) => ({
        id: text(item.id) || `assignment:${item.ownerId}:${item.projectId}:${item.missionId}`,
        ownerId: item.ownerId, projectId: item.projectId, memberId: item.memberId,
        missionId: item.missionId, instructions: text(item.instructions), status: 'assigned', assignedAt: item.assignedAt,
      }));
    // Preserve the existing single-assignee model: the last valid assignment wins.
    const uniqueAssignments = [...new Map(assignments.map((item) => [JSON.stringify([item.ownerId, item.projectId, item.missionId]), item])).values()];
    return { version: 2, invitations, opportunities, requests, memberships: uniqueMemberships, assignments: uniqueAssignments };
  }

  function write(data) {
    try {
      if (local.writeJSONStrict) local.writeJSONStrict(COLLABORATION_KEY, data);
      else local.writeJSON(COLLABORATION_KEY, data);
    } catch {
      throw new Error('This change could not be saved in this browser. Your previous state is unchanged. Try again.');
    }
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

  const memberFor = (data, ownerId, projectId, memberId) => data.memberships.find((item) =>
    sameProject(item, ownerId, projectId) && item.memberId === memberId && item.status === 'active');
  const assignmentsFor = (data, ownerId, projectId, memberId) => data.assignments
    .filter((item) => sameProject(item, ownerId, projectId) && (!memberId || item.memberId === memberId))
    .map((item) => ({ ...item, memberName: memberFor(data, ownerId, projectId, item.memberId)?.memberName || 'Team member' }));
  const assignedFor = (data, ownerId, projectId, memberId) => assignmentsFor(data, ownerId, projectId, memberId).map((item) => item.missionId);
  const decorateInvitation = (item) => {
    const project = foreignProject(item.ownerId, item.projectId);
    return project ? { ...item, statusLabel: statusLabel(item, 'invitation'), project, inviter: { id: item.ownerId, full_name: project.created_by } } : null;
  };
  const decorateRequest = (data, item) => {
    const project = foreignProject(item.ownerId, item.projectId);
    const opportunity = data.opportunities.find((record) => record.id === item.opportunityId);
    return project && opportunity ? { ...item, statusLabel: statusLabel(item, 'request'), project, opportunity: { ...opportunity } } : null;
  };

  function joinTeam(data, record, type) {
    const memberId = type === 'request' ? record.applicantId : record.recipientId;
    let membership = memberFor(data, record.ownerId, record.projectId, memberId);
    if (!membership) {
      membership = {
        id: createId(), ownerId: record.ownerId, projectId: record.projectId, memberId,
        memberName: type === 'request' ? record.applicantName : record.recipientName,
        memberEmail: type === 'request' ? '' : record.recipientEmail,
        memberRole: type === 'request' ? 'member' : record.memberRole,
        status: 'active', joinedAt: timestamp(), source: type, sourceId: record.id,
      };
      data.memberships = data.memberships.filter((item) => identityKey(item) !== identityKey(membership));
      data.memberships.push(membership);
    }
    record.status = 'accepted'; record.respondedAt = timestamp();
    // Resolve only pending alternatives; earlier final decisions stay in history.
    for (const item of data.invitations) {
      if (sameProject(item, record.ownerId, record.projectId) && item.recipientId === memberId && item.status === 'pending') {
        item.status = 'resolved'; item.respondedAt = record.respondedAt;
      }
    }
    for (const item of data.requests) {
      if (sameProject(item, record.ownerId, record.projectId) && item.applicantId === memberId && item.status === 'pending') {
        item.status = 'resolved'; item.respondedAt = record.respondedAt;
      }
    }
    return membership;
  }

  function saveInvitation(projectId, recipient, details, expectedUserId) {
    const user = actor(expectedUserId);
    ownProject(user, projectId);
    const memberRole = details?.memberRole || 'member';
    if (!roles.has(memberRole)) throw new Error('Choose Co-founder or Member.');
    if (recipient.id === user.id) throw new Error('You already own this roadmap. You cannot invite yourself.');
    const data = read();
    if (memberFor(data, user.id, projectId, recipient.id) || data.invitations.some((item) => sameProject(item, user.id, projectId)
      && item.recipientId === recipient.id && item.status === 'pending')) {
      throw new Error('This member already has a pending invitation or belongs to this roadmap.');
    }
    const invitation = {
      id: createId(), ownerId: user.id, projectId, recipientId: recipient.id,
      recipientEmail: text(recipient.email), recipientName: recipient.full_name,
      memberRole, message: text(details?.message), status: 'pending', createdAt: timestamp(), respondedAt: null,
    };
    data.invitations.push(invitation);
    actor(expectedUserId); ownProject(user, projectId);
    write(data);
    return clone(decorateInvitation(invitation));
  }

  const api = {
    getAccess(projectId, ownerId, expectedUserId) {
      const user = actor(expectedUserId);
      const data = read();
      if (ownerId === user.id) return {
        project: clone(ownProject(user, projectId)), user: clone(user), role: 'owner', assignedMissionIds: [],
        missionAssignments: assignmentsFor(data, ownerId, projectId),
      };
      const member = memberFor(data, ownerId, projectId, user.id);
      const project = member ? foreignProject(ownerId, projectId) : null;
      if (!project) throw new Error('This joined roadmap is unavailable or you do not have access.');
      return {
        project, user: clone(user), role: 'member', memberRole: member.memberRole,
        assignedMissionIds: assignedFor(data, ownerId, projectId, user.id), missionAssignments: assignmentsFor(data, ownerId, projectId, user.id),
      };
    },

    listJoinedProjects(expectedUserId) {
      const user = actor(expectedUserId);
      const data = read();
      return data.memberships.filter((item) => item.memberId === user.id && item.status === 'active').flatMap((item) => {
        const project = foreignProject(item.ownerId, item.projectId);
        return project ? [{ ...project, memberRole: item.memberRole, assignedMissionIds: assignedFor(data, item.ownerId, item.projectId, user.id) }] : [];
      });
    },

    listInvitations(expectedUserId) {
      const user = actor(expectedUserId);
      return read().invitations.filter((item) => item.recipientId === user.id).map(decorateInvitation).filter(Boolean)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    },

    getTeam(projectId, expectedUserId) {
      const user = actor(expectedUserId);
      ownProject(user, projectId);
      const data = read();
      return {
        members: data.memberships.filter((item) => sameProject(item, user.id, projectId) && item.status === 'active').map((item) => ({
          id: item.memberId, full_name: item.memberName, email: item.memberEmail,
          memberRole: item.memberRole, assignedMissionIds: assignedFor(data, user.id, projectId, item.memberId),
        })),
        invitations: data.invitations.filter((item) => sameProject(item, user.id, projectId)).map(decorateInvitation).filter(Boolean),
        joinRequests: data.requests.filter((item) => sameProject(item, user.id, projectId)).map((item) => decorateRequest(data, item)).filter(Boolean),
        opportunities: data.opportunities.filter((item) => sameProject(item, user.id, projectId)),
      };
    },

    getTeamOverview(projectId, ownerId, expectedUserId) {
      const user = actor(expectedUserId);
      const data = read();
      const isOwner = ownerId === user.id;
      const membership = isOwner ? null : memberFor(data, ownerId, projectId, user.id);
      const project = isOwner ? ownProject(user, projectId) : membership ? foreignProject(ownerId, projectId) : null;
      if (!project) throw new Error('This joined roadmap is unavailable or you do not have access.');
      return {
        role: isOwner ? 'owner' : 'member', memberRole: isOwner ? 'owner' : membership.memberRole,
        owner: { id: ownerId, full_name: project.created_by },
        members: data.memberships.filter((item) => sameProject(item, ownerId, projectId) && item.status === 'active').map((item) => ({
          id: item.memberId, full_name: item.memberName, memberRole: item.memberRole,
          ...(isOwner || item.memberId === user.id ? { email: item.memberEmail } : {}),
          assignedMissionIds: assignedFor(data, ownerId, projectId, item.memberId),
        })),
      };
    },

    searchMember(projectId, memberIdInput, expectedUserId) {
      const user = actor(expectedUserId);
      ownProject(user, projectId);
      const memberId = text(memberIdInput);
      if (!memberId) throw new Error('Enter a Member ID.');
      const recipient = auth.findRegisteredMemberById(memberId, user.id);
      actor(expectedUserId); ownProject(user, projectId);
      return recipient ? clone(recipient) : null;
    },

    inviteMember(projectId, memberIdInput, details, expectedUserId) {
      const recipient = api.searchMember(projectId, memberIdInput, expectedUserId);
      if (!recipient) throw new Error('No registered member with this exact Member ID was found in this browser.');
      return saveInvitation(projectId, recipient, details, expectedUserId);
    },

    inviteFounder(projectId, emailInput, memberRole, expectedUserId) {
      const user = actor(expectedUserId);
      ownProject(user, projectId);
      const email = text(emailInput).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid founder email address.');
      if (!roles.has(memberRole)) throw new Error('Choose Co-founder or Member.');
      const recipient = auth.findRegisteredFounderByEmail(email, user.id);
      if (!recipient) throw new Error('No registered Founder with this email was found on this browser.');
      return saveInvitation(projectId, recipient, { memberRole }, expectedUserId);
    },

    respondInvitation(id, response, expectedUserId) {
      const user = actor(expectedUserId);
      if (!['accepted', 'declined'].includes(response)) throw new Error('Choose Accept or Decline.');
      const data = read();
      const invitation = data.invitations.find((item) => item.id === id && item.recipientId === user.id);
      if (!invitation || !foreignProject(invitation.ownerId, invitation.projectId)) throw new Error('This invitation is no longer available.');
      if (invitation.status !== 'pending') {
        if (response === 'accepted' && ['accepted', 'resolved'].includes(invitation.status)
          && memberFor(data, invitation.ownerId, invitation.projectId, user.id)) return clone(decorateInvitation(invitation));
        throw new Error('This invitation is no longer available for a decision.');
      }
      if (response === 'accepted') joinTeam(data, invitation, 'invitation');
      else { invitation.status = 'declined'; invitation.respondedAt = timestamp(); }
      actor(expectedUserId);
      write(data);
      return clone(decorateInvitation(invitation));
    },

    publishOpportunity(projectId, details, expectedUserId) {
      const user = actor(expectedUserId);
      ownProject(user, projectId);
      const fields = {};
      for (const [key, label] of Object.entries({ title: 'opportunity title', description: 'description', contribution: 'role or contribution', skills: 'relevant skills or experience' })) {
        if (!text(details?.[key])) fields[key] = `Enter the ${label}.`;
      }
      if (Object.keys(fields).length) {
        const error = new Error('Complete the required collaboration post fields.'); error.fields = fields; throw error;
      }
      const data = read();
      const clientToken = text(details.clientToken);
      const previous = clientToken && data.opportunities.find((item) => sameProject(item, user.id, projectId) && item.clientToken === clientToken);
      if (previous) return clone(previous);
      const opportunity = {
        id: createId(), ownerId: user.id, projectId, title: text(details.title), description: text(details.description),
        contribution: text(details.contribution), skills: text(details.skills), expectations: text(details.expectations),
        clientToken, status: 'published', createdAt: timestamp(),
      };
      data.opportunities.push(opportunity);
      actor(expectedUserId); ownProject(user, projectId);
      write(data);
      return clone(opportunity);
    },

    listOpportunities(expectedUserId) {
      const user = actor(expectedUserId);
      const data = read();
      return data.opportunities.map((opportunity) => {
        const project = foreignProject(opportunity.ownerId, opportunity.projectId);
        if (!project) return null;
        const requests = data.requests.filter((item) => item.opportunityId === opportunity.id && item.applicantId === user.id);
        const ownRequest = requests.find((item) => item.status === 'pending') || requests.at(-1) || null;
        const relationship = opportunity.ownerId === user.id ? 'owner'
          : memberFor(data, opportunity.ownerId, opportunity.projectId, user.id) ? 'member'
            : opportunity.status !== 'published' ? 'unavailable'
              : ownRequest?.status === 'pending' ? 'pending' : ownRequest?.status === 'declined' ? 'declined' : 'available';
        return { ...opportunity, project, founder: { id: opportunity.ownerId, full_name: project.created_by }, relationship,
          ownRequest: ownRequest ? { ...ownRequest, statusLabel: statusLabel(ownRequest, 'request') } : null };
      }).filter(Boolean).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    },

    requestToJoin(opportunityId, details, expectedUserId) {
      const user = actor(expectedUserId);
      const data = read();
      const opportunity = data.opportunities.find((item) => item.id === opportunityId);
      if (!opportunity || opportunity.status !== 'published' || !foreignProject(opportunity.ownerId, opportunity.projectId)) throw new Error('This collaboration opportunity is no longer accepting requests.');
      if (opportunity.ownerId === user.id) throw new Error('You cannot request to join your own startup.');
      if (memberFor(data, opportunity.ownerId, opportunity.projectId, user.id)) throw new Error('You are already a team member.');
      if (data.requests.some((item) => item.opportunityId === opportunity.id && item.applicantId === user.id && item.status === 'pending')) throw new Error('Your request is already pending founder review.');
      const message = text(details?.message);
      if (!message) { const error = new Error('Explain your interest or intended contribution.'); error.fields = { message: error.message }; throw error; }
      const request = {
        id: createId(), ownerId: opportunity.ownerId, projectId: opportunity.projectId, opportunityId,
        applicantId: user.id, applicantName: user.full_name, message, status: 'pending', createdAt: timestamp(), respondedAt: null,
      };
      data.requests.push(request);
      actor(expectedUserId);
      write(data);
      return clone(decorateRequest(data, request));
    },

    listJoinRequests(projectId, expectedUserId) {
      const user = actor(expectedUserId);
      ownProject(user, projectId);
      const data = read();
      return data.requests.filter((item) => sameProject(item, user.id, projectId)).map((item) => decorateRequest(data, item)).filter(Boolean);
    },

    listMyJoinRequests(expectedUserId) {
      const user = actor(expectedUserId);
      const data = read();
      return data.requests.filter((item) => item.applicantId === user.id).map((item) => decorateRequest(data, item)).filter(Boolean);
    },

    respondJoinRequest(id, response, expectedUserId) {
      const user = actor(expectedUserId);
      if (!['accepted', 'declined'].includes(response)) throw new Error('Choose Accept or Decline.');
      const data = read();
      const request = data.requests.find((item) => item.id === id && item.ownerId === user.id);
      if (!request) throw new Error('This join request is no longer available.');
      ownProject(user, request.projectId);
      if (request.status !== 'pending') {
        if (response === 'accepted' && ['accepted', 'resolved'].includes(request.status)
          && memberFor(data, request.ownerId, request.projectId, request.applicantId)) return clone(decorateRequest(data, request));
        throw new Error('This join request already has a final decision.');
      }
      if (response === 'accepted') joinTeam(data, request, 'request');
      else { request.status = 'declined'; request.respondedAt = timestamp(); }
      actor(expectedUserId); ownProject(user, request.projectId);
      write(data);
      return clone(decorateRequest(data, request));
    },

    listAssignments(projectId, ownerId, expectedUserId) {
      return api.getAccess(projectId, ownerId, expectedUserId).missionAssignments;
    },

    assignMission(projectId, memberId, missionId, expectedUserId, details = {}) {
      const user = actor(expectedUserId);
      ownProject(user, projectId);
      if (!missionIds.has(missionId)) throw new Error('Choose a mission from this roadmap.');
      if (missionId === firstMissionId) throw new Error('The first mission must be completed by the owner.');
      const data = read();
      if (!memberFor(data, user.id, projectId, memberId)) throw new Error('Only an accepted member can receive a mission.');
      const existing = data.assignments.find((item) => sameProject(item, user.id, projectId) && item.missionId === missionId);
      const instructions = text(details.instructions);
      if (existing?.memberId === memberId && existing.instructions === instructions) return clone(existing);
      const assignment = { id: createId(), ownerId: user.id, projectId, memberId, missionId, instructions, status: 'assigned', assignedAt: timestamp() };
      data.assignments = data.assignments.filter((item) => !(sameProject(item, user.id, projectId) && item.missionId === missionId));
      data.assignments.push(assignment);
      actor(expectedUserId); ownProject(user, projectId);
      write(data);
      return clone(assignment);
    },

    removeAssignment(projectId, memberId, missionId, expectedUserId) {
      const user = actor(expectedUserId);
      ownProject(user, projectId);
      const data = read();
      data.assignments = data.assignments.filter((item) => !(sameProject(item, user.id, projectId) && item.memberId === memberId && item.missionId === missionId));
      write(data);
    },
  };
  return api;
}

export const collaborationStore = createCollaborationStore();
