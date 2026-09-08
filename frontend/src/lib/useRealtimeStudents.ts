import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { api } from './mockApi';
import type { Student } from './types';
import { broadcastRealtimeUpdate } from './realtimeSync';

interface UseRealtimeStudentsOptions {
  collegeId?: string | null;
  verifiedOnly?: boolean;
}

export function useRealtimeStudents(options: UseRealtimeStudentsOptions = {}) {
  const { collegeId, verifiedOnly = false } = options;
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());

  const studentsMapRef = useRef<Map<string, Student>>(new Map());

  // Function to re-calculate merged list from internal map
  const updateListFromMap = useCallback(() => {
    let list = Array.from(studentsMapRef.current.values());

    if (collegeId) {
      list = list.filter((s) => s.collegeId === collegeId);
    }
    if (verifiedOnly) {
      list = list.filter((s) => s.verificationStatus === 'verified');
    }

    // Sort: verified first, then by name or points
    list.sort((a, b) => {
      if (a.verificationStatus === 'verified' && b.verificationStatus !== 'verified') return -1;
      if (a.verificationStatus !== 'verified' && b.verificationStatus === 'verified') return 1;
      const pointsA = (a.points?.coding || 0) + (a.points?.education || 0);
      const pointsB = (b.points?.coding || 0) + (b.points?.education || 0);
      return pointsB - pointsA;
    });

    setStudents(list);
    setLastSyncedAt(new Date());
  }, [collegeId, verifiedOnly]);

  // Initial fetch from backend API
  const fetchFromApi = useCallback(async () => {
    try {
      const data = await api.getStudents();
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((st) => {
          const key = st.id || (st as any).uid || st.email;
          if (key) {
            const existing = studentsMapRef.current.get(key) || {};
            studentsMapRef.current.set(key, { ...existing, ...st });
          }
        });
        updateListFromMap();
      }
    } catch (err) {
      console.warn('[useRealtimeStudents] API fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [updateListFromMap]);

  useEffect(() => {
    fetchFromApi();

    // 1. Subscribe to Firebase Firestore `users` collection for real-time changes
    let unsubscribeUsers: (() => void) | null = null;
    let unsubscribeStudents: (() => void) | null = null;

    try {
      const usersQuery = query(collection(db, 'users'), where('role', '==', 'student'));
      unsubscribeUsers = onSnapshot(
        usersQuery,
        (snapshot) => {
          setIsLive(true);
          snapshot.docChanges().forEach((change) => {
            const docData = change.doc.data();
            const studentItem: Student = {
              id: change.doc.id,
              name: docData.name || docData.displayName || docData.email?.split('@')[0] || 'Student',
              email: docData.email || '',
              password: '',
              collegeId: docData.collegeId || 'c1',
              verificationStatus: docData.verificationStatus || 'pending',
              avatar: docData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(docData.name || change.doc.id)}`,
              skills: Array.isArray(docData.skills) ? docData.skills : [],
              points: docData.points || { cultural: 0, sports: 0, education: 0, coding: 0 },
              github: docData.github || docData.codingProfiles?.github || '',
              linkedin: docData.linkedin || '',
              leetcode: docData.leetcode || docData.codingProfiles?.leetcode?.username || '',
              codeforces: docData.codeforces || docData.codingProfiles?.codeforces?.handle || '',
              achievements: docData.achievements || [],
              certificates: docData.certificates || [],
              bio: docData.bio || '',
              idVerification: docData.idVerification || null,
              resumeExtraction: docData.resumeExtraction || null,
              codingProfiles: docData.codingProfiles || null,
              codingSkillEvidence: docData.codingSkillEvidence || null,
            };

            const key = change.doc.id;
            if (change.type === 'removed') {
              studentsMapRef.current.delete(key);
            } else {
              const existing = studentsMapRef.current.get(key) || {};
              studentsMapRef.current.set(key, { ...existing, ...studentItem });
            }
          });
          updateListFromMap();
          setLoading(false);
        },
        (err) => {
          console.warn('[useRealtimeStudents] Firestore users listener notice:', err.message);
          setIsLive(false);
        }
      );
    } catch (e) {
      console.warn('[useRealtimeStudents] Could not bind users onSnapshot:', e);
    }

    try {
      const studentsQuery = collection(db, 'students');
      unsubscribeStudents = onSnapshot(
        studentsQuery,
        (snapshot) => {
          setIsLive(true);
          snapshot.docChanges().forEach((change) => {
            const docData = change.doc.data();
            const key = change.doc.id;
            if (change.type === 'removed') {
              studentsMapRef.current.delete(key);
            } else {
              const existing = studentsMapRef.current.get(key) || {};
              studentsMapRef.current.set(key, { ...existing, id: key, ...docData } as Student);
            }
          });
          updateListFromMap();
        },
        (err) => {
          console.warn('[useRealtimeStudents] Firestore students listener notice:', err.message);
        }
      );
    } catch (e) {
      console.warn('[useRealtimeStudents] Could not bind students onSnapshot:', e);
    }

    // 2. Cross-tab BroadcastChannel listener for zero-latency in-memory synchronization
    const handleCustomEvent = (event: any) => {
      const detail = event.detail;
      if (detail && detail.entityType === 'student' && detail.entityId) {
        const key = detail.entityId;
        const existing = studentsMapRef.current.get(key) || ({} as Student);
        studentsMapRef.current.set(key, {
          ...existing,
          id: key,
          ...(detail.data || {}),
        } as Student);
        updateListFromMap();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('cv:realtime_sync', handleCustomEvent);
    }

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeStudents) unsubscribeStudents();
      if (typeof window !== 'undefined') {
        window.removeEventListener('cv:realtime_sync', handleCustomEvent);
      }
    };
  }, [fetchFromApi, updateListFromMap]);

  return {
    students,
    totalCount: students.length,
    loading,
    isLive,
    lastSyncedAt,
    refetch: fetchFromApi,
  };
}
