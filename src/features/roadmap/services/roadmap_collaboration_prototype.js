import { localStore } from '../../../services/storage/local_storage.js';

const keyFor = (ownerId, projectId) => {
  if (typeof ownerId !== 'string' || !ownerId.trim() || typeof projectId !== 'string' || !projectId.trim()) {
    throw new Error('A signed-in owner and roadmap are required to manage this sample team.');
  }
  return `labx:roadmap-prototype-collaboration:v1:${encodeURIComponent(ownerId)}:${encodeURIComponent(projectId)}`;
};
const text = (value) => typeof value === 'string' ? value.trim() : '';
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function validateData(value) {
  if (!isObject(value) || value.version !== 1 || !Array.isArray(value.invitations) || !Array.isArray(value.opportunities)
    || value.invitations.some((item) => !isObject(item) || typeof item.id !== 'string'
      || typeof item.username !== 'string' || !['pending', 'accepted'].includes(item.status) || typeof item.createdAt !== 'string')
    || value.opportunities.some((item) => !isObject(item) || typeof item.id !== 'string'
      || typeof item.title !== 'string' || typeof item.description !== 'string'
      || typeof item.contribution !== 'string' || typeof item.skills !== 'string'
      || typeof item.expectations !== 'string' || typeof item.createdAt !== 'string')) {
    throw new Error('Saved sample-team data is invalid. Clear this sample roadmap’s browser data and try again.');
  }
  return value;
}

export function createRoadmapCollaborationPrototypeStore(storage = localStore) {
  function read(ownerId, projectId) {
    const saved = storage.getItem(keyFor(ownerId, projectId));
    if (saved === null) return { version: 1, invitations: [], opportunities: [] };
    let parsed;
    try {
      parsed = JSON.parse(saved);
    } catch {
      throw new Error('Saved sample-team data is invalid. Clear this sample roadmap’s browser data and try again.');
    }
    return validateData(parsed);
  }

  function save(ownerId, projectId, data) {
    storage.writeJSONStrict(keyFor(ownerId, projectId), data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('labx:prototype-collaboration-change', { detail: { ownerId, projectId } }));
    }
    return data;
  }

  function inviteByUsername(ownerId, projectId, usernameInput) {
    const username = text(usernameInput).replace(/^@/, '');
    if (!/^[a-zA-Z0-9._-]{1,40}$/.test(username)) {
      throw new Error('Enter a username using letters, numbers, dots, underscores, or hyphens.');
    }
    const data = read(ownerId, projectId);
    if (data.invitations.some((invitation) => invitation.username.toLowerCase() === username.toLowerCase())) {
      throw new Error(`@${username} already has a sample invitation for this roadmap.`);
    }
    const invitation = { id: globalThis.crypto.randomUUID(), username, status: 'pending', createdAt: new Date().toISOString() };
    data.invitations.push(invitation);
    save(ownerId, projectId, data);
    return data;
  }

  function publishOpportunity(ownerId, projectId, details) {
    const fields = {
      title: ['opportunity title', 100],
      description: ['description', 1000],
      contribution: ['role or contribution', 160],
      skills: ['skills or experience', 160],
      expectations: ['expectations', 1000],
    };
    for (const [field, [label, limit]] of Object.entries(fields)) {
      const value = text(details?.[field]);
      if (field !== 'expectations' && !value) throw new Error(`Enter the ${label}.`);
      if (value.length > limit) throw new Error(`Keep the ${label} to ${limit} characters or fewer.`);
    }
    const data = read(ownerId, projectId);
    data.opportunities.unshift({
      id: globalThis.crypto.randomUUID(),
      title: text(details.title),
      description: text(details.description),
      contribution: text(details.contribution),
      skills: text(details.skills),
      expectations: text(details.expectations),
      createdAt: new Date().toISOString(),
    });
    save(ownerId, projectId, data);
    return data;
  }

  function listOpportunities(ownerId, projects) {
    if (!Array.isArray(projects)) throw new Error('Sample roadmaps are unavailable. Reload the page and try again.');
    return projects.flatMap((project) => {
      const data = read(ownerId, project.id);
      return data.opportunities.map((opportunity) => ({
        ...opportunity,
        project: { id: project.id, name: project.name, domain: project.domain },
      }));
    });
  }

  return { read, inviteByUsername, publishOpportunity, listOpportunities };
}

export const roadmapCollaborationPrototypeStore = createRoadmapCollaborationPrototypeStore();
