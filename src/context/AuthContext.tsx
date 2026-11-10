import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/index.ts';
import * as api from '../services/api.ts';
import { logoutDisconnectOutlook } from '../services/outlookApi.ts';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  isTeacher: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'educore_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Re-sync with persistent database when loaded
  useEffect(() => {
    const init = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setUser(JSON.parse(stored));
        }
        // Always re-sync with database on initial app load
        await api.resyncDatabase().catch((e) => console.warn('Initial DB re-sync note:', e));
      } catch (e) {
        console.warn('Failed to restore auth session');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Always re-sync with persistent database when a user signs in
  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await api.login(username, password);
      setUser(result.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user));

      // Always re-sync with database when user signed in
      try {
        const syncRes = await api.resyncDatabase();
        window.dispatchEvent(new CustomEvent('database-resynced', { detail: syncRes }));
      } catch (syncErr) {
        console.warn('Post-login database re-sync warning:', syncErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const refreshUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
  };

  const role = user?.role || null;
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isTeacher,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
