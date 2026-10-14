import { useContext } from 'react';
import { AuthContext } from '../features/authentication/hooks/auth_context';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider.');
  return context;
}

export default useAuth;
