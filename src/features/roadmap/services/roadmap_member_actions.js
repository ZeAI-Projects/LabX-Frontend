import { localStore } from '../../../services/storage/local_storage.js';

const demoExitKey = (userId, projectId, missionId) =>
  `labx:roadmap-demo-exit:v1:${encodeURIComponent(userId)}:${encodeURIComponent(projectId)}:${encodeURIComponent(missionId)}`;

export function readDemoMissionExit(userId, projectId, missionId) {
  const request = localStore.readJSON(demoExitKey(userId, projectId, missionId), null);
  if (!request || request.status !== 'pending' || request.missionId !== missionId) return null;
  return request;
}

export function requestDemoMissionExit(userId, projectId, missionId) {
  const key = demoExitKey(userId, projectId, missionId);
  const existing = readDemoMissionExit(userId, projectId, missionId);
  if (existing) return existing;
  const request = { missionId, status: 'pending', createdAt: new Date().toISOString() };
  localStore.writeJSONStrict(key, request);
  return request;
}
