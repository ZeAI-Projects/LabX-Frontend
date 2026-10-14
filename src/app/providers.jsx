import { AuthProvider } from '../features/authentication/components/AuthProvider';
import { ProjectsProvider } from '../features/projects/components/ProjectsProvider.jsx';

export default function AppProviders({ children }) {
  return <AuthProvider><ProjectsProvider>{children}</ProjectsProvider></AuthProvider>;
}
