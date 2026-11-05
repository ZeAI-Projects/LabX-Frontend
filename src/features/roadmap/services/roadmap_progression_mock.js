import { localStore } from '../../../services/storage/local_storage.js';
import { createMockRoadmap, ROADMAP_MOCK_MISSION_IDS, ROADMAP_STAGE_NAMES } from './mock_roadmap.js';
import { MAX_MISSION_UPLOAD_BYTES, MAX_MISSION_UPLOADS } from './roadmap_upload_store.js';

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
  if (project.visualCollection === 'joined' && project.assignmentWorkStatus === 'completed') {
    const roadmap = createMockRoadmap({
      domain: project.domain,
      stage: project.stage,
      level: project.level,
      prototype: true,
      requireEveryMission: true,
    });
    const missions = roadmap.stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones));
    const targetIndex = Math.max(0, missions.findIndex((mission) => mission.name === project.currentMission));
    return missions.slice(0, targetIndex + 1).map((mission) => mission.id);
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

function escapeXml(value) {
  return String(value || '').replace(/[<>&"']/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;',
  })[character]);
}

function initialSubmissions(project, completedMissionIds) {
  if (!project.visualDemo || !completedMissionIds.length) return {};
  const roadmap = createMockRoadmap({
    domain: project.domain,
    prototype: true,
    requireEveryMission: true,
    completedMissionIds,
  });
  const missions = roadmap.stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones));
  const submissions = Object.fromEntries(completedMissionIds.map((id) => {
    const mission = missions.find((entry) => entry.id === id);
    const title = mission?.name || 'Mission';
    const safeTitle = escapeXml(title);
    const fileTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mission';
    const documentContent = `Mock ${title} deliverable for ${project.name}.\n\nThis sample records the evidence reviewed, the decision made, and the next step for ${project.domain}.`;
    const imageContent = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" rx="24" fill="#12263a"/><path d="M56 270 184 142l92 92 66-66 144 102" fill="none" stroke="#52cde5" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><text x="56" y="72" fill="#d9f6fc" font-family="Arial,sans-serif" font-size="27">${safeTitle}</text><text x="56" y="112" fill="#8ca7bb" font-family="Arial,sans-serif" font-size="16">${escapeXml(project.name)}</text></svg>`;
    return [id, {
      notes: `Completed ${title} for ${project.name}. Reviewed the supporting evidence, recorded the key finding, and identified the next practical step for ${project.domain}.`,
      attachments: [
        { id: `mock:${project.id}:${id}:notes`, name: `${fileTitle}-notes.txt`, type: 'text/plain', size: documentContent.length, mockContent: documentContent },
        { id: `mock:${project.id}:${id}:visual`, name: `${fileTitle}-evidence.svg`, type: 'image/svg+xml', size: imageContent.length, mockContent: imageContent },
      ],
      status: 'completed',
      labxPointsAwarded: 100,
      savedAt: project.updated_at || project.created_at || '',
    }];
  }));
  if (project.id === 'demo-roadmap-circuit-school') {
    const roadmap = createMockRoadmap({
      domain: project.domain,
      prototype: true,
      requireEveryMission: true,
      completedMissionIds,
    });
    const mission = roadmap.stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones))
      .find((entry) => entry.state === 'active');
    if (mission) {
      const notes = `The student interviews and classroom observations for ${project.name} are complete. The evidence shows that learners need shorter guided practice, clearer feedback, and a reliable way to retry each electronics exercise.`;
      const documentContent = `Sample founder review submission for ${mission.name} in ${project.name}.`;
      submissions[mission.id] = {
        notes,
        attachments: [{
          id: `mock:${project.id}:${mission.id}:review`,
          name: 'classroom-research-summary.txt',
          type: 'text/plain',
          size: documentContent.length,
          mockContent: documentContent,
        }],
        status: 'submitted',
        submittedBy: 'Amara Wilson',
        submittedAt: '2026-11-04T15:30:00.000Z',
        savedAt: '2026-11-04T15:30:00.000Z',
      };
    }
  }
  return submissions;
}

function readProgress(storage, key, project) {
  const value = storage.readJSON(key, null);
  if (value === null) {
    const completedMissionIds = initialCompletedIds(project);
    return { completedMissionIds, submissionsByMissionId: initialSubmissions(project, completedMissionIds) };
  }
  const validIds = new Set(ROADMAP_MOCK_MISSION_IDS);
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !Array.isArray(value.completedMissionIds)
    || value.completedMissionIds.some((id) => typeof id !== 'string' || !validIds.has(id))
    || !value.submissionsByMissionId || typeof value.submissionsByMissionId !== 'object' || Array.isArray(value.submissionsByMissionId)) {
    throw new Error('Saved prototype progress is invalid. Clear this roadmap prototype’s browser data and try again.');
  }
  const completedMissionIds = [...new Set(value.completedMissionIds)];
  const sampleSubmissions = initialSubmissions(project, completedMissionIds);
  const submissionsByMissionId = { ...sampleSubmissions, ...value.submissionsByMissionId };
  for (const id of completedMissionIds) {
    const saved = value.submissionsByMissionId[id];
    if (!saved) continue;
    const sample = sampleSubmissions[id] || {};
    submissionsByMissionId[id] = {
      ...sample,
      ...saved,
      attachments: Array.isArray(saved.attachments) && saved.attachments.length ? saved.attachments : sample.attachments || [],
      labxPointsAwarded: saved.labxPointsAwarded || sample.labxPointsAwarded || 100,
    };
  }
  return { ...value, completedMissionIds, submissionsByMissionId };
}

export function createRoadmapProgressionMockStore(storage = localStore) {
  function read(project, userId) {
    const progress = readProgress(storage, keyFor(userId, project.id), project);
    const submittedMissionIds = new Set(Object.entries(progress.submissionsByMissionId)
      .filter(([, submission]) => submission.status === 'submitted')
      .map(([missionId]) => missionId));
    const roadmap = createMockRoadmap({
      domain: project.domain,
      prototype: true,
      requireEveryMission: true,
      completedMissionIds: progress.completedMissionIds,
    });
    return {
      ...roadmap,
      stages: roadmap.stages.map((stage) => ({
        ...stage,
        levels: stage.levels.map((level) => ({
          ...level,
          milestones: level.milestones.map((mission) => submittedMissionIds.has(mission.id) && mission.state !== 'completed'
            ? { ...mission, state: 'submitted' }
            : mission),
        })),
      })),
      submissionsByMissionId: progress.submissionsByMissionId,
    };
  }

  function saveSubmission(project, userId, missionId, submission, status) {
    const key = keyFor(userId, project.id);
    const progress = readProgress(storage, key, project);
    const roadmap = createMockRoadmap({ domain: project.domain, prototype: true, requireEveryMission: true, completedMissionIds: progress.completedMissionIds });
    const mission = roadmap.stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones))
      .find((entry) => entry.id === missionId);
    const isAssignedMission = project.visualCollection === 'joined'
      && project.assignedMissionId === missionId
      && !progress.completedMissionIds.includes(missionId);
    if (!mission || progress.completedMissionIds.includes(missionId)) {
      throw new Error('This mission is already completed and can only be viewed.');
    }
    if (status === 'submitted') {
      if (!isAssignedMission || project.assignmentWorkStatus === 'completed') {
        throw new Error('Only your active assigned mission can be submitted to its founder.');
      }
      if (progress.submissionsByMissionId[missionId]?.status === 'submitted') {
        throw new Error('This mission is already submitted and is waiting for founder review.');
      }
    } else if (project.visualCollection === 'joined') {
      throw new Error('Members submit missions for founder review; only the founder can complete them.');
    } else if (mission.state !== 'active') {
      throw new Error('Only the next unlocked mission can be completed.');
    }
    const notes = typeof submission?.notes === 'string' ? submission.notes.trim() : '';
    const attachments = Array.isArray(submission?.attachments) ? submission.attachments : [];
    if (notes.length < 80 || notes.length > 10000) {
      throw new Error('Add 80–10,000 characters about your work before submitting this mission.');
    }
    if (!attachments.length || attachments.length > MAX_MISSION_UPLOADS) {
      throw new Error(`Upload between 1 and ${MAX_MISSION_UPLOADS} supporting files before submitting this mission.`);
    }
    for (const attachment of attachments) {
      if (!attachment || typeof attachment.id !== 'string' || !attachment.id
        || typeof attachment.name !== 'string' || !attachment.name
        || !Number.isInteger(attachment.size) || attachment.size <= 0 || attachment.size > MAX_MISSION_UPLOAD_BYTES) {
        throw new Error('One or more uploaded mission files are invalid or exceed 10 MB.');
      }
    }
    const completedMissionIds = status === 'completed'
      ? [...progress.completedMissionIds, missionId]
      : progress.completedMissionIds;
    const submissionsByMissionId = {
      ...progress.submissionsByMissionId,
      [missionId]: {
        notes,
        attachments,
        status,
        ...(status === 'completed' ? { labxPointsAwarded: 100 } : {}),
        savedAt: new Date().toISOString(),
      },
    };
    storage.writeJSONStrict(key, { completedMissionIds, submissionsByMissionId });
    return read(project, userId);
  }

  return {
    read,
    submitMission: (project, userId, missionId, submission) => saveSubmission(project, userId, missionId, submission, 'submitted'),
    completeMission: (project, userId, missionId, submission) => saveSubmission(project, userId, missionId, submission, 'completed'),
  };
}

export const roadmapProgressionMockStore = createRoadmapProgressionMockStore();
