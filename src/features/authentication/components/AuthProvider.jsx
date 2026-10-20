import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../hooks/auth_context';
import { AUTH_STORAGE_KEYS, mockAuth } from '../services/mock_auth';

export function AuthProvider({ children, store = mockAuth }) {
  const [user, setUser] = useState(() => store.getUser());

  useEffect(() => {
    const refreshSession = (event) => {
      if (event.type === 'focus' || event.key === null || Object.values(AUTH_STORAGE_KEYS).includes(event.key)) {
        setUser(store.getUser());
      }
    };
    window.addEventListener('storage', refreshSession);
    window.addEventListener('focus', refreshSession);
    return () => {
      window.removeEventListener('storage', refreshSession);
      window.removeEventListener('focus', refreshSession);
    };
  }, [store]);

  useEffect(() => {
    if (!user) return;
    const expiresAt = store.getSessionExpiresAt();
    if (expiresAt === null) return;
    const timer = window.setTimeout(() => setUser(store.getUser()), Math.max(0, expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [store, user]);

  const login = useCallback(async (email, password, options) => {
    const result = await store.login(email, password, options);
    setUser(result.user);
    return result;
  }, [store]);

  const register = useCallback(async (email, password, fullName, options) => {
    const result = await store.register(email, password, fullName, options);
    setUser(result.user);
    return result;
  }, [store]);

  const requestRegistration = useCallback((email, password, fullName, options) =>
    store.requestRegistration(email, password, fullName, options), [store]);
  const resendRegistration = useCallback((email) => store.resendRegistration(email), [store]);
  const verifyRegistration = useCallback(async (email, code) => {
    const result = await store.verifyRegistration(email, code);
    setUser(result.user);
    return result;
  }, [store]);
  const completeRoleOnboarding = useCallback((details) => {
    try {
      const updatedUser = store.completeRoleOnboarding(details, user?.id);
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      setUser(store.getUser());
      throw error;
    }
  }, [store, user]);

  const logout = useCallback(() => {
    store.logout();
    setUser(null);
  }, [store]);

  const refreshUser = useCallback(() => {
    const current = store.getUser();
    setUser(current);
    return current;
  }, [store]);

  const completeAssessment = useCallback((result, answers) => {
    try {
      const updatedUser = store.completeAssessment(result, answers, user?.id);
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      setUser(store.getUser());
      throw error;
    }
  }, [store, user]);

  const skipAssessment = useCallback(() => {
    try {
      const updatedUser = store.skipAssessment(user?.id);
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      setUser(store.getUser());
      throw error;
    }
  }, [store, user]);

  const requestPasswordReset = useCallback((email) => store.requestPasswordReset(email), [store]);
  const resetPassword = useCallback(async (email, code, password) => {
    const result = await store.resetPassword(email, code, password);
    setUser(store.getUser());
    return result;
  }, [store]);

  const value = useMemo(() => ({
    user,
    loading: false,
    isAuthenticated: Boolean(user),
    isFounder: user?.role === 'founder',
    isMentor: user?.role === 'mentor',
    isInvestor: user?.role === 'investor',
    isAdmin: false,
    assessmentCompleted: Boolean(user?.assessment_completed),
    assessmentSkipped: Boolean(user?.assessment_skipped),
    login,
    register,
    requestRegistration,
    resendRegistration,
    verifyRegistration,
    completeRoleOnboarding,
    logout,
    refreshUser,
    completeAssessment,
    skipAssessment,
    requestPasswordReset,
    resetPassword,
  }), [user, login, register, requestRegistration, resendRegistration, verifyRegistration, completeRoleOnboarding, logout, refreshUser, completeAssessment, skipAssessment, requestPasswordReset, resetPassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
