import { mockAuth } from '../../authentication/services/mock_auth.js';
import { collaborationStore } from './roadmap_collaboration.js';
import { createRoadmapStore } from './roadmap_workflow.js';
import { achievementStore } from '../../achievements/services/mock_achievements.js';

export const roadmapStore = createRoadmapStore({
  auth: mockAuth,
  getAccess: (...args) => collaborationStore.getAccess(...args),
  onApproved: (user, project, snapshot) => achievementStore.recordRoadmap(user, project, snapshot),
});
