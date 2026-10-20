import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useAuth } from '../../../hooks/use_auth.js';
import { ProjectsContext } from '../hooks/projects_context.js';
import { projectStore } from '../services/project_store.js';
import { roadmapStore } from '../../roadmap/services/roadmap_store.js';

function AccountProjects({ children, store, userId }) {
  const [revision, refresh] = useReducer((value) => value + 1, 0);
  // Recompute for the new account during render without remounting children:
  // auth pages must retain their pending navigation when sign-in completes.
  const { projects } = useMemo(() => ({
    revision,
    projects: userId ? store.listProjects(userId).map((project) => {
      if (!project.assessment_completed) return project;
      try { return { ...project, roadmap_snapshot: roadmapStore.read(project.id, userId, userId) }; }
      catch { return project; }
    }) : [],
  }), [store, userId, revision]);

  useEffect(() => {
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('labx:roadmap-change', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('labx:roadmap-change', refresh);
    };
  }, [refresh]);

  const mutate = useCallback((method, ...args) => {
    try {
      return store[method](...args, userId);
    } finally {
      refresh();
    }
  }, [refresh, store, userId]);
  const createProject = useCallback((name) => mutate('createProject', name), [mutate]);
  const renameProject = useCallback((id, name) => mutate('renameProject', id, name), [mutate]);
  const deleteProject = useCallback((id) => mutate('deleteProject', id), [mutate]);
  const saveDraft = useCallback((id, draft) => mutate('saveDraft', id, draft), [mutate]);
  const completeProject = useCallback((id, answers) => mutate('completeProject', id, answers), [mutate]);
  const updateAssessmentChoice = useCallback((id, questionKey, choice, expectedChoice) => mutate('updateAssessmentChoice', id, questionKey, choice, expectedChoice), [mutate]);
  const value = useMemo(() => ({
    projects, createProject, renameProject, deleteProject, saveDraft, completeProject, updateAssessmentChoice,
  }), [projects, createProject, renameProject, deleteProject, saveDraft, completeProject, updateAssessmentChoice]);

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function ProjectsProvider({ children, store = projectStore }) {
  const { user } = useAuth();
  return (
    <AccountProjects store={store} userId={user?.id ?? null}>
      {children}
    </AccountProjects>
  );
}
