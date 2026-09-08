import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session, UserRole, Student, Faculty, Recruiter } from './types';
import { api } from './mockApi';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

interface AuthState {
  session: (Session & { user?: Student | Faculty | Recruiter }) | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { email: string; password: string; role: 'student' | 'faculty' | 'recruiter'; name: string; collegeId?: string; department?: string; company?: string; position?: string }) => Promise<void>;
  logout: () => void;
  isVerified: () => boolean;
  refreshUser: () => Promise<void>;
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

  const signup = useCallback(async (data: { email: string; password: string; role: 'student' | 'faculty' | 'recruiter'; name: string; collegeId?: string; department?: string; company?: string; position?: string }) => {
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

  const refreshUser = useCallback(async () => {
    if (!session) return;
    if (session.role === 'student') {
      const user = await api.getStudentById(session.userId);
      if (user) {
        const updated = { ...session, user };
        localStorage.setItem('cv_session', JSON.stringify(updated));
        setSession(updated);
      }
    }
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, loading, login, signup, logout, isVerified, refreshUser }}>
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
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session) navigate('/login', { replace: true });
    else if (session.role !== role) navigate('/', { replace: true });
  }, [session, role, navigate]);

  if (!session || session.role !== role) return null;
  return <>{children}</>;
}
