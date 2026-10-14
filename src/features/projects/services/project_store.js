import { createSafeStorage, localStore } from '../../../services/storage/local_storage.js';
import { mockAuth } from '../../authentication/services/mock_auth.js';
import { draftKey, readAssessmentDraft } from '../../assessment/services/assessment_draft.js';
import { createEmptyAnswers, evaluateAssessment, normalizeDraftAnswers, validateAssessmentStep } from '../../assessment/services/mock_assessment.js';

export const projectsKey = (userId) => `labx:projects:v1:${encodeURIComponent(userId)}`;

const clone = (value) => JSON.parse(JSON.stringify(value));
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const emptyDraft = () => ({ step: 1, answers: createEmptyAnswers() });

function projectName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) throw new Error('Enter a project name.');
  if (name.length > 100) throw new Error('Keep the project name to 100 characters or fewer.');
  return name;
}

function normalizeDraft(value) {
  const answers = normalizeDraftAnswers(value?.answers);
  let step = Number.isInteger(value?.step) ? Math.max(1, Math.min(7, value.step)) : 1;
  for (let previous = 1; previous < step; previous += 1) {
    if (validateAssessmentStep(answers, previous)) {
      step = previous;
      break;
    }
  }
  return { step, answers };
}

function normalizeProject(value, ownerId) {
  if (!isObject(value) || value.owner_id !== ownerId || typeof value.id !== 'string' || !value.id
    || typeof value.name !== 'string' || !value.name.trim() || value.name.trim().length > 100
    || typeof value.created_by !== 'string' || typeof value.created_at !== 'string'
    || !Number.isFinite(Date.parse(value.created_at)) || typeof value.updated_at !== 'string'
    || !Number.isFinite(Date.parse(value.updated_at))) return null;
  const completed = value.assessment_completed === true
    && isObject(value.assessment_result) && isObject(value.assessment_answers);
  return {
    id: value.id,
    name: value.name.trim(),
    owner_id: ownerId,
    created_by: value.created_by,
    created_at: value.created_at,
    updated_at: value.updated_at,
    assessment_completed: completed,
    assessment_result: completed ? clone(value.assessment_result) : null,
    assessment_answers: completed ? clone(value.assessment_answers) : null,
    draft: normalizeDraft(value.draft),
  };
}

export function createProjectStore({
  storage = localStore,
  auth = mockAuth,
  now = Date.now,
  createId = () => globalThis.crypto.randomUUID(),
} = {}) {
  const local = storage?.readJSON ? storage : createSafeStorage(storage);
  let activeUserId = auth.getUser()?.id ?? null;

  function currentFounder(expectedUserId) {
    const user = auth.getUser();
    if (!user) throw new Error('Please log in before updating your projects.');
    if (user.id !== expectedUserId) {
      throw new Error('Your signed-in account changed in another tab. Reopen your projects before saving.');
    }
    if (user.role !== 'founder') throw new Error('Projects are available to Founders.');
    return user;
  }

  function makeProject(user, name, draft = emptyDraft()) {
    const timestamp = new Date(now()).toISOString();
    return {
      id: createId(),
      name,
      owner_id: user.id,
      created_by: user.full_name || user.username || user.email || 'Founder',
      created_at: timestamp,
      updated_at: timestamp,
      assessment_completed: false,
      assessment_result: null,
      assessment_answers: null,
      draft,
    };
  }

  function write(user, data) {
    local.writeJSON(projectsKey(user.id), data);
  }

  function read(user) {
    const saved = local.readJSON(projectsKey(user.id));
    const valid = isObject(saved) && saved.version === 1;
    const ids = new Set();
    const projects = valid && Array.isArray(saved.projects)
      ? saved.projects.map((entry) => normalizeProject(entry, user.id)).filter((entry) => {
        if (!entry || ids.has(entry.id)) return false;
        ids.add(entry.id);
        return true;
      }) : [];
    const data = {
      version: 1,
      legacy_completed_migrated: valid && saved.legacy_completed_migrated === true,
      legacy_draft_migrated: valid && saved.legacy_draft_migrated === true,
      projects,
    };
    // Keep migration markers after deletion so a removed legacy roadmap stays removed.
    if (!data.legacy_completed_migrated) {
      if (user.assessment_completed === true
        && isObject(user.assessment_result) && isObject(user.assessment_answers)) {
        const project = makeProject(user, 'My first project');
        if (typeof user.assessment_completed_at === 'string' && Number.isFinite(Date.parse(user.assessment_completed_at))) {
          project.created_at = user.assessment_completed_at;
          project.updated_at = user.assessment_completed_at;
        }
        project.assessment_completed = true;
        project.assessment_result = clone(user.assessment_result);
        project.assessment_answers = clone(user.assessment_answers);
        data.projects.push(project);
        data.legacy_draft_migrated = true;
      }
      data.legacy_completed_migrated = true;
      write(user, data);
    }
    return data;
  }

  function findProject(data, id) {
    const project = data.projects.find((entry) => entry.id === id);
    if (!project) throw new Error('This project is no longer available. Return to your projects.');
    return project;
  }

  function updateProject(id, expectedUserId, change) {
    const user = currentFounder(expectedUserId);
    const data = read(user);
    const project = findProject(data, id);
    change(project);
    project.updated_at = new Date(now()).toISOString();
    write(user, data);
    return clone(project);
  }

  function requireIncomplete(project) {
    if (project.assessment_completed) throw new Error('This assessment is complete. Completed answers cannot be changed.');
  }

  return {
    listProjects(expectedUserId) {
      const user = auth.getUser();
      activeUserId = user?.id ?? null;
      if (!user || user.role !== 'founder' || (expectedUserId !== undefined && expectedUserId !== user.id)) return [];
      return clone(read(user).projects);
    },

    createProject(nameInput, expectedUserId = activeUserId) {
      const user = currentFounder(expectedUserId);
      const name = projectName(nameInput);
      const data = read(user);
      const draft = data.legacy_draft_migrated ? emptyDraft() : readAssessmentDraft(local, user.id);
      const project = makeProject(user, name, draft);
      data.projects.unshift(project);
      data.legacy_draft_migrated = true;
      write(user, data);
      local.removeItem(draftKey(user.id));
      return clone(project);
    },

    renameProject(id, name, expectedUserId = activeUserId) {
      return updateProject(id, expectedUserId, (project) => { project.name = projectName(name); });
    },

    deleteProject(id, expectedUserId = activeUserId) {
      const user = currentFounder(expectedUserId);
      const data = read(user);
      findProject(data, id);
      data.projects = data.projects.filter((project) => project.id !== id);
      write(user, data);
      return true;
    },

    saveDraft(id, draft, expectedUserId = activeUserId) {
      return updateProject(id, expectedUserId, (project) => {
        requireIncomplete(project);
        project.draft = normalizeDraft(draft);
      });
    },

    completeProject(id, answers, expectedUserId = activeUserId) {
      return updateProject(id, expectedUserId, (project) => {
        requireIncomplete(project);
        const result = evaluateAssessment(answers);
        project.assessment_completed = true;
        project.assessment_result = result;
        project.assessment_answers = clone(normalizeDraftAnswers(answers));
        project.draft = emptyDraft();
      });
    },
  };
}

export const projectStore = createProjectStore();
