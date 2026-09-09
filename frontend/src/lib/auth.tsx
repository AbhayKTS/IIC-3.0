import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session, UserRole, Student, Faculty, Recruiter } from './types';
import { api } from './mockApi';
import { auth } from './firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';

interface AuthState {
  session: (Session & { user?: Student | Faculty | Recruiter }) | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginDemo: (demoEmail: string) => Promise<void>;
  loginWithGoogle: (role?: 'student' | 'faculty' | 'recruiter') => Promise<void>;
  signup: (data: {
    email: string;
    password: string;
    role: 'student' | 'faculty' | 'recruiter';
    name: string;
    collegeId?: string;
    collegeName?: string;
    collegeLocation?: string;
    department?: string;
    company?: string;
    position?: string;
    companyDescription?: string;
    location?: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => void;
  isVerified: () => boolean;
  refreshUser: () => Promise<void>;
  updateUserInSession: (updatedUserData: Partial<any>) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthState['session']>(() => {
    try {
      const s = localStorage.getItem('cv_session');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const freshToken = await firebaseUser.getIdToken();
          setSession((prev) => {
            if (prev) {
              const updated = { ...prev, token: freshToken };
              localStorage.setItem('cv_session', JSON.stringify(updated));
              return updated;
            }
            return prev;
          });
        } catch (e) {
          console.warn('Failed to refresh Firebase token on auth state change', e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await api.login(email, password);
      const sess = { role: result.role, userId: result.userId, token: result.token, user: result.user };
      localStorage.setItem('cv_session', JSON.stringify(sess));
      setSession(sess);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginDemo = useCallback(async (demoEmail: string) => {
    setLoading(true);
    try {
      const result = await api.loginDemo(demoEmail);
      const sess = { role: result.role, userId: result.userId, token: result.token, user: result.user };
      localStorage.setItem('cv_session', JSON.stringify(sess));
      setSession(sess);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (role: 'student' | 'faculty' | 'recruiter' = 'student') => {
    setLoading(true);
    try {
      const result = await api.loginWithGoogle(role);
      const sess = { role: result.role, userId: result.userId, token: result.token, user: result.user };
      localStorage.setItem('cv_session', JSON.stringify(sess));
      setSession(sess);
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (data: {
    email: string;
    password: string;
    role: 'student' | 'faculty' | 'recruiter';
    name: string;
    collegeId?: string;
    collegeName?: string;
    collegeLocation?: string;
    department?: string;
    company?: string;
    position?: string;
    companyDescription?: string;
    location?: string;
    phone?: string;
  }) => {
    setLoading(true);
    try {
      const result = await api.signup(data) as any;
      const sess = { role: result.role, userId: result.userId, token: result.token, user: result.user };
      localStorage.setItem('cv_session', JSON.stringify(sess));
      setSession(sess);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cv_session');
    setSession(null);
    signOut(auth).catch(() => undefined);
  }, []);

  const isVerified = useCallback(() => {
    if (!session || session.role !== 'student') return false;
    return (session.user as Student)?.verificationStatus === 'verified';
  }, [session]);

  const updateUserInSession = useCallback((updatedUserData: Partial<any>) => {
    setSession((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        user: {
          ...(prev.user || {}),
          ...updatedUserData,
        },
      };
      localStorage.setItem('cv_session', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!session) return;
    try {
      if (session.role === 'student') {
        const user = await api.getStudentById(session.userId);
        if (user) {
          updateUserInSession(user);
        }
      } else if (session.role === 'faculty') {
        const user = await api.getFacultyById(session.userId);
        if (user) {
          updateUserInSession(user);
        }
      } else if (session.role === 'recruiter') {
        const user = await api.getRecruiterById(session.userId);
        if (user) {
          updateUserInSession(user);
        }
      }
    } catch (e) {
      console.warn('refreshUser error:', e);
    }
  }, [session, updateUserInSession]);

  return (
    <AuthContext.Provider value={{ session, loading, login, loginDemo, loginWithGoogle, signup, logout, isVerified, refreshUser, updateUserInSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function RequireAuth({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  // Show spinner while Firebase auth state resolves — prevents redirect flash
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    navigate('/login', { replace: true });
    return null;
  }

  if (session.role !== role) {
    navigate('/', { replace: true });
    return null;
  }

  return <>{children}</>;
}

