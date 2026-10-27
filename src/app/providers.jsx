import { AuthProvider } from '../features/authentication/components/AuthProvider';
import { ProjectsProvider } from '../features/projects/components/ProjectsProvider.jsx';
import { AchievementObserver } from '../features/achievements/components/AchievementObserver.jsx';

export default function AppProviders({ children }) {
  return <AuthProvider><ProjectsProvider><AchievementObserver />{children}</ProjectsProvider></AuthProvider>;
}
