import React, { useCallback, useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuthContext } from './auth-context';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('labx_token'));
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('labx_token')));

  const logout = useCallback(() => {
    localStorage.removeItem('labx_token');
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  const fetchUser = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const [meRes, profileRes] = await Promise.allSettled([
        api.getMe(),
        api.getProfile(),
      ]);

      const meData = meRes.status === 'fulfilled' ? meRes.value.data : null;
      const profileData = profileRes.status === 'fulfilled' ? profileRes.value.data : null;

      if (!meData && !profileData) {
        throw new Error('Could not load user data');
      }

      // Merge auth data and profile data for a rich, complete user object
      const mergedUser = {
        ...(meData || {}),
        ...(profileData || {}),
        full_name: profileData?.full_name || meData?.full_name || meData?.name || 'Founder',
        username: profileData?.username || meData?.username || meData?.email?.split('@')[0] || 'founder',
        email: meData?.email || profileData?.email || '',
        avatar_url: profileData?.avatar_url || meData?.avatar_url || '',
        bio: profileData?.bio || meData?.bio || '',
        total_points: profileData?.total_points || meData?.total_points || 0,
      };

      setUser(mergedUser);
    } catch (err) {
      console.error('Auth verification failed:', err);
      // Only logout if 401 Unauthorized
      if (err.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [logout, token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    const { user: userData, access_token } = res.data;
    localStorage.setItem('labx_token', access_token);
    setToken(access_token);
    setUser(userData);
    // Asynchronously enrich with profile data
    fetchUser();
    return res.data;
  };

  const register = async (email, password, fullName) => {
    const res = await api.register({ email, password, full_name: fullName });
    const { user: userData, access_token } = res.data;
    if (access_token) {
      localStorage.setItem('labx_token', access_token);
      setToken(access_token);
    }
    setUser(userData);
    fetchUser();
    return res.data;
  };

  const updateUserState = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : updatedFields));
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
        updateUserState,
        isAuthenticated: !!user,
        isFounder: user?.role === 'founder' || !user?.role || user?.role !== 'admin',
        isAdmin: user?.role === 'admin',
        assessmentCompleted: user?.assessment_completed || user?.profile?.assessment_completed,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
