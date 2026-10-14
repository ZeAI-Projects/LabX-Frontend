import { useContext } from 'react';
import { ProjectsContext } from './projects_context.js';

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (!context) throw new Error('useProjects must be used within a ProjectsProvider.');
  return context;
}
