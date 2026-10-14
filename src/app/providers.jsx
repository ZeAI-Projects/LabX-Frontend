import { AuthProvider } from '../features/authentication/components/AuthProvider';

export default function AppProviders({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
