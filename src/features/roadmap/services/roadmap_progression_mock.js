import { localStore } from '../../../services/storage/local_storage.js';
import { createMockRoadmap, ROADMAP_MOCK_MISSION_IDS, ROADMAP_STAGE_NAMES } from './mock_roadmap.js';

const keyFor = (userId, projectId) => `labx:roadmap-prototype:v1:${encodeURIComponent(userId)}:${encodeURIComponent(projectId)}`;

function initialCompletedIds(project) {
  if (project.status === 'completed') {
    return Array.from({ length: 75 }, (_, index) => {
      const stage = Math.floor(index / 15);
      const level = Math.floor((index % 15) / 3) + 1;
      const mission = index % 3 + 1;
      return `${ROADMAP_STAGE_NAMES[stage].toLowerCase()}-l${level}-m${mission}`;
    });
  }
  const stageIndex = ROADMAP_STAGE_NAMES.findIndex((stage) => stage.toLowerCase() === String(project.stage || '').toLowerCase());
  const level = Number.isInteger(project.level) && project.level >= 1 && project.level <= 5 ? project.level : 1;
  const completedCount = Math.max(0, stageIndex) * 15 + (level - 1) * 3;
  return Array.from({ length: completedCount }, (_, index) => {
    const stage = Math.floor(index / 15);
    const levelNumber = Math.floor((index % 15) / 3) + 1;
    const mission = index % 3 + 1;
    return `${ROADMAP_STAGE_NAMES[stage].toLowerCase()}-l${levelNumber}-m${mission}`;
  });
}

function readProgress(storage, key, project) {
  const value = storage.readJSON(key, null);
  if (value === null) return { completedMissionIds: initialCompletedIds(project), submissionsByMissionId: {} };
  const validIds = new Set(ROADMAP_MOCK_MISSION_IDS);
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !Array.isArray(value.completedMissionIds)
    || value.completedMissionIds.some((id) => typeof id !== 'string' || !validIds.has(id))
    || !value.submissionsByMissionId || typeof value.submissionsByMissionId !== 'object' || Array.isArray(value.submissionsByMissionId)) {
    throw new Error('Saved prototype progress is invalid. Clear this roadmap prototype’s browser data and try again.');
  }
  return { ...value, completedMissionIds: [...new Set(value.completedMissionIds)] };
}

export function createRoadmapProgressionMockStore(storage = localStore) {
  function read(project, userId) {
    const progress = readProgress(storage, keyFor(userId, project.id), project);
    return {
      ...createMockRoadmap({
        domain: project.domain,
        prototype: true,
        requireEveryMission: true,
        completedMissionIds: progress.completedMissionIds,
      }),
      submissionsByMissionId: progress.submissionsByMissionId,
    };
  }

  function completeMission(project, userId, missionId, submission) {
    const key = keyFor(userId, project.id);
    const progress = readProgress(storage, key, project);
    const roadmap = createMockRoadmap({ domain: project.domain, prototype: true, requireEveryMission: true, completedMissionIds: progress.completedMissionIds });
    const mission = roadmap.stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones))
      .find((entry) => entry.id === missionId);
    if (!mission || mission.state !== 'active') {
      throw new Error('Only the next unlocked mission can be completed.');
    }
    const notes = typeof submission?.notes === 'string' ? submission.notes.trim() : '';
    const url = typeof submission?.url === 'string' ? submission.url.trim() : '';
    if (notes.length < 80 || notes.length > 10000 || url.length > 2048) {
      throw new Error('Add 80–10,000 characters of notes and a valid evidence link before completing this mission.');
    }
    let parsed;
    try { parsed = new URL(url); }
    catch { throw new Error('Add a valid http or https evidence link before completing this mission.'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
      throw new Error('Add a valid http or https evidence link before completing this mission.');
    }
    const completedMissionIds = [...progress.completedMissionIds, missionId];
    const submissionsByMissionId = {
      ...progress.submissionsByMissionId,
      [missionId]: { notes, url, savedAt: new Date().toISOString() },
    };
    storage.writeJSONStrict(key, { completedMissionIds, submissionsByMissionId });
    return {
      ...createMockRoadmap({ domain: project.domain, prototype: true, requireEveryMission: true, completedMissionIds }),
      submissionsByMissionId,
    };
  }

  return { read, completeMission };
}

export const roadmapProgressionMockStore = createRoadmapProgressionMockStore();
