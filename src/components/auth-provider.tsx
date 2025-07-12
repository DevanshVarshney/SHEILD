'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

import type { User } from '@/lib/auth';
import { login, signup, logout, updateUserProfile, changeUserPassword } from '@/lib/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  login: typeof login;
  signup: typeof signup;
  logout: () => void;
  loading: boolean;
  initialLoading: boolean;
  updateProfile: (data: Partial<User> & { pictureFile?: File }) => Promise<{ success: boolean, error?: string, user?: User }>;
  changePassword: (oldPass: string, newPass: string) => Promise<{ success: boolean, error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const appUser: User = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
          profilePictureUrl: firebaseUser.photoURL || undefined,
        };
        setUser(appUser);
      } else {
        setUser(null);
      }
      setInitialLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin: typeof login = async (email, pass) => {
    setLoading(true);
    const result = await login(email, pass);
    if(result.success && result.user) {
      setUser(result.user);
    }
    setLoading(false);
    return result;
  };

  const handleSignup: typeof signup = async (name, email, pass, picture) => {
    setLoading(true);
    const result = await signup(name, email, pass, picture);
     if(result.success && result.user) {
      setUser(result.user);
    }
    setLoading(false);
    return result;
  };

  const handleLogout = async () => {
    setLoading(true);
    await logout();
    setUser(null);
    setLoading(false);
  };
  
  const handleUpdateProfile = async (data: Partial<User> & { pictureFile?: File }) => {
    if (!user) return { success: false, error: "Not logged in" };
    const result = await updateUserProfile(user.uid, data);
    if (result.success && result.user) {
        setUser(result.user);
    }
    return result;
  };

  const handleChangePassword = async (oldPass: string, newPass: string) => {
      if (!user) return { success: false, error: "Not logged in" };
      const result = await changeUserPassword(oldPass, newPass);
      if (result.success) {
        await handleLogout();
      }
      return result;
  }

  const value = useMemo(() => ({
    user,
    login: handleLogin,
    signup: handleSignup,
    logout: handleLogout,
    loading,
    initialLoading,
    updateProfile: handleUpdateProfile,
    changePassword: handleChangePassword
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, loading, initialLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
