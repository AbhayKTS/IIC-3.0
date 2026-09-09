import type {
  College, Institution, Student, Faculty, Recruiter, Gig, GigApplication,
  MarketplaceItem, WalletSBT, Community, Club, Event, Team,
  Placement, Notice, ChatMessage, Competition, ShortlistEntry, Session, IdVerificationData, ResumeExtractionData,
  JobRecommendation, AppNotification, CodingProfiles
} from './types';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { broadcastRealtimeUpdate } from './realtimeSync';

const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl;
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('web.app')) {
    return 'https://iic-3-0-ansh.vercel.app/api/v1';
  }
  return import.meta.env.PROD ? 'https://iic-3-0-ansh.vercel.app/api/v1' : 'http://localhost:4000/api/v1';
};

const API_BASE = getApiBase();

const request = async <T>(path: string, options: { method?: string; body?: any; auth?: boolean } = {}): Promise<T> => {
  const { method = 'GET', body, auth: withAuth = false } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (withAuth) {
    if (!auth.currentUser && typeof (auth as any).authStateReady === 'function') {
      try {
        await (auth as any).authStateReady();
      } catch (_) {}
    }
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      throw new Error('No active authentication session');
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`API endpoint unavailable (received ${contentType || 'HTML'} from server).`);
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message = payload?.error?.message || payload?.message || res.statusText || 'Request failed';
    throw new Error(message);
  }
  return (payload?.data !== undefined ? payload.data : payload) as T;
};

export const DEMO_ACCOUNTS: Record<string, { role: UserRole; user: any }> = {
  'rajesh@iitd.ac.in': {
    role: 'faculty',
    user: {
      id: 'f1',
      name: 'Dr. Rajesh Gupta',
      email: 'rajesh@iitd.ac.in',
      collegeId: 'c1',
      collegeName: 'IIT Delhi',
      department: 'Computer Science & Engineering',
      role: 'admin',
      college: {
        id: 'c1',
        name: 'IIT Delhi',
        location: 'New Delhi, India',
        ranking: 1,
        type: 'IIT',
        studentCount: 8500,
        facultyCount: 640,
        placementRate: 98,
        departments: ['Computer Science & Engineering', 'Electrical Engineering', 'Mechanical Engineering', 'Mathematics & Computing'],
        description: 'Premier engineering institute known for cutting-edge research, startup innovation, and global engineering leadership.',
        established: 1961,
        domain: 'iitd.ac.in',
        contactEmail: 'placements@iitd.ac.in',
        website: 'https://home.iitd.ac.in',
      },
    },
  },
  'dean@gla.ac.in': {
    role: 'faculty',
    user: {
      id: 'f_gla',
      name: 'Dr. A. K. Sharma',
      email: 'dean@gla.ac.in',
      collegeId: 'c_gla',
      collegeName: 'GLA University',
      department: 'Computer Science & Engineering',
      role: 'admin',
      college: {
        id: 'c_gla',
        name: 'GLA University',
        location: 'Mathura, Uttar Pradesh, India',
        ranking: 10,
        type: 'Private University (NAAC A+)',
        studentCount: 15200,
        facultyCount: 720,
        placementRate: 92,
        departments: ['Computer Science & Engineering', 'Electronics & Communication', 'Information Technology', 'Civil Engineering', 'Mechanical Engineering'],
        description: 'Leading university accredited with NAAC A+ grade, empowering world-class engineering graduates.',
        established: 1998,
        domain: 'gla.ac.in',
        contactEmail: 'dean.academics@gla.ac.in',
        website: 'https://www.gla.ac.in',
      },
    },
  },
  'vikram@techcorp.com': {
    role: 'recruiter',
    user: {
      id: 'r1',
      name: 'Vikram Mehta',
      email: 'vikram@techcorp.com',
      company: 'TechCorp Labs',
      position: 'Director of Engineering Talent',
      companyDescription: 'Global enterprise cloud and AI engineering lab recruiting top 1% software talent directly across Indian universities.',
      location: 'Bengaluru, India / Hybrid',
      website: 'https://techcorp.com',
      phone: '+91 98765 43210',
      openPositions: 5,
      shortlistedCount: 14,
      hiredCount: 6,
      activeGigsCount: 3,
      targetSkills: ['React', 'TypeScript', 'Node.js', 'Python', 'Go', 'Distributed Systems'],
    },
  },
  'hiring@polygon.technology': {
    role: 'recruiter',
    user: {
      id: 'r2',
      name: 'Ananya Das',
      email: 'hiring@polygon.technology',
      company: 'Polygon Labs',
      position: 'Web3 & Talent Acquisition Lead',
      companyDescription: 'Leading Ethereum scaling protocol building zkEVM infrastructure and onboarding the next billion web3 builders.',
      location: 'Remote / Global',
      website: 'https://polygon.technology',
      phone: '+91 99887 76655',
      openPositions: 8,
      shortlistedCount: 22,
      hiredCount: 9,
      activeGigsCount: 5,
      targetSkills: ['Solidity', 'Rust', 'TypeScript', 'Cryptography', 'Smart Contracts', 'React'],
    },
  },
};

const getProfileByEmail = async (email: string, role: string) => {
  return request<Student | Faculty | Recruiter | null>(`/compat/profile?email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}`);
};

export const api = {
  // Auth
  async login(email: string, password: string): Promise<Session & { user: Student | Faculty | Recruiter }> {
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Try real Firebase Auth credentials
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const token = await credential.user.getIdToken();
      let role = 'student';
      try {
        const bootstrap = await request<{ uid: string; role: string }>(
          '/auth/bootstrap',
          { method: 'POST', auth: true }
        );
        if (bootstrap?.role) role = bootstrap.role;
      } catch (_) {}

      let profile = await getProfileByEmail(email, role);
      
      // Fallback: fetch from Firestore if backend returns nothing
      if (!profile) {
        try {
          const docSnap = await getDoc(doc(db, 'users', credential.user.uid));
          if (docSnap.exists()) {
            profile = docSnap.data() as any;
          }
        } catch (e) {
          console.warn("Firestore fetch failed:", e);
        }
      }

      if (!profile) {
        if (DEMO_ACCOUNTS[trimmedEmail]) {
          return {
            role: DEMO_ACCOUNTS[trimmedEmail].role,
            userId: credential.user.uid,
            token,
            user: { ...DEMO_ACCOUNTS[trimmedEmail].user, id: credential.user.uid, email },
          };
        }
        return {
          role: role as any,
          userId: credential.user.uid,
          token,
          user: { id: credential.user.uid, email, name: credential.user.displayName || email.split('@')[0] } as any,
        };
      }
      return { role: role as any, userId: profile.id, token, user: profile as any };
    } catch (firebaseErr: any) {
      // 2. Demo accounts fallback if Firebase Auth user does not exist or fails
      if (DEMO_ACCOUNTS[trimmedEmail]) {
        const demo = DEMO_ACCOUNTS[trimmedEmail];
        const fakeToken = `demo_token_${Date.now()}`;
        return {
          role: demo.role,
          userId: demo.user.id,
          token: fakeToken,
          user: demo.user,
        };
      }
      throw firebaseErr;
    }
  },

  async loginDemo(demoEmail: string): Promise<Session & { user: Student | Faculty | Recruiter }> {
    const trimmed = demoEmail.trim().toLowerCase();
    const demo = DEMO_ACCOUNTS[trimmed] || DEMO_ACCOUNTS['rajesh@iitd.ac.in'];
    return {
      role: demo.role,
      userId: demo.user.id,
      token: `demo_token_${Date.now()}`,
      user: demo.user,
    };
  },

  async loginWithGoogle(role: 'student' | 'faculty' | 'recruiter' = 'student'): Promise<Session & { user: Student | Faculty | Recruiter }> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(auth, provider);
    const user = credential.user;
    const email = user.email || '';
    const domain = email.split('@')[1]?.toLowerCase() || '';

    // Enforce college domain for students
    const disallowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com'];
    if (role === 'student' && (disallowedDomains.includes(domain) || (!domain.endsWith('.ac.in') && !domain.endsWith('.edu') && !domain.endsWith('.edu.in')))) {
      await signOut(auth);
      throw new Error(`Personal Google account (@${domain}) is not allowed. Please use your official college Google account (e.g. name@iitd.ac.in).`);
    }

    const token = await user.getIdToken();
    try {
      const bootstrap = await request<{ uid: string; role: string }>(
        '/auth/bootstrap',
        { method: 'POST', auth: true }
      );
      const userRole = bootstrap.role || role;
      const profile = await getProfileByEmail(email, userRole);
      if (!profile) {
        return {
          role: userRole as any,
          userId: bootstrap.uid,
          token,
          user: { id: bootstrap.uid, email, name: user.displayName || email.split('@')[0] } as any,
        };
      }
      return { role: userRole as any, userId: profile.id, token, user: profile as any };
    } catch {
      return {
        role: role as any,
        userId: user.uid,
        token,
        user: {
          id: user.uid,
          email,
          name: user.displayName || email.split('@')[0],
          verificationStatus: 'pending_review',
        } as any,
      };
    }
  },

  // Colleges
  async getColleges(): Promise<College[]> {
    return request('/compat/colleges');
  },
  async getCollegeById(id: string): Promise<College | undefined> {
    try {
      const res = await request<College>(`/compat/colleges/${id}`);
      if (res && res.id) return res;
    } catch (_) {}

    if (db && id) {
      try {
        const snap = await getDoc(doc(db, 'colleges', id));
        if (snap.exists()) {
          return { id, ...snap.data() } as College;
        }
      } catch (e) {
        console.warn('Firestore college read notice:', e);
      }
    }

    const session = JSON.parse(localStorage.getItem('cv_session') || '{}');
    if (session?.user?.college?.id === id || session?.user?.collegeId === id) {
      return session.user.college as College;
    }
    return undefined;
  },
  async updateCollege(id: string, data: Partial<College>): Promise<College> {
    const session = JSON.parse(localStorage.getItem('cv_session') || '{}');
    if (session?.user) {
      session.user.college = { ...(session.user.college || {}), ...data };
      if (data.name) session.user.collegeName = data.name;
      localStorage.setItem('cv_session', JSON.stringify(session));
    }

    if (db && id) {
      try {
        await setDoc(doc(db, 'colleges', id), { ...data, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.warn('Direct Firestore college write notice:', e);
      }
    }

    broadcastRealtimeUpdate({
      type: 'college:updated',
      entityType: 'college',
      entityId: id,
      data,
    });

    return request(`/compat/colleges/${id}`, { method: 'PUT', body: data }).catch(() => data as College);
  },
  async incrementCollegeField(id: string, field?: string, amount?: number, action?: string, value?: string): Promise<College> {
    return request(`/compat/colleges/${id}/increment`, {
      method: 'POST',
      body: { field, amount, action, value },
    });
  },

  // Students
  async getStudents(): Promise<Student[]> {
    return request('/compat/students');
  },
  async getStudentById(id: string): Promise<Student | undefined> {
    try {
      const res = await request<Student>(`/compat/students/${id}`);
      if (res && res.id) return res;
    } catch (_) {}

    // Fallback: direct Firestore read
    if (db && id) {
      try {
        const uSnap = await getDoc(doc(db, 'users', id));
        if (uSnap.exists()) {
          return { id, ...uSnap.data() } as Student;
        }
        const sSnap = await getDoc(doc(db, 'students', id));
        if (sSnap.exists()) {
          return { id, ...sSnap.data() } as Student;
        }
      } catch (e) {
        console.warn('Direct Firestore student read error:', e);
      }
    }

    // Fallback: active session cache
    const session = JSON.parse(localStorage.getItem('cv_session') || '{}');
    if (session?.userId === id && session?.user) {
      return session.user as Student;
    }
    return undefined;
  },
  async updateStudent(id: string, data: Partial<Student>): Promise<Student> {
    const session = JSON.parse(localStorage.getItem('cv_session') || '{}');
    if (session?.userId === id && session?.user) {
      session.user = { ...session.user, ...data };
      localStorage.setItem('cv_session', JSON.stringify(session));
    }

    try {
      if (db && id) {
        await setDoc(doc(db, 'users', id), data, { merge: true }).catch(() => null);
        await setDoc(doc(db, 'students', id), data, { merge: true }).catch(() => null);
        await setDoc(doc(db, 'studentProfiles', id), data, { merge: true }).catch(() => null);
      }
    } catch (e) {
      console.warn('Direct Firestore student write warning:', e);
    }

    broadcastRealtimeUpdate({
      type: 'student:updated',
      entityType: 'student',
      entityId: id,
      data,
    });

    return request(`/compat/students/${id}`, { method: 'PUT', body: data }).catch(() => data as Student);
  },
  async getVerifiedStudents(): Promise<Student[]> {
    return request('/compat/students/verified');
  },

  async getStudentOverview(): Promise<{
    uid: string;
    role: string;
    user: any;
    college: College | null;
    profile: any;
    profileCompletion: number;
    missingFields: string[];
    verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
    idVerification: IdVerificationData | null;
    resumeExtraction: ResumeExtractionData | null;
    skills: string[];
    codingProfiles?: CodingProfiles | null;
    codingSkillEvidence?: Record<string, number> | null;
    notifications: AppNotification[];
    recommendations: JobRecommendation[];
  }> {
    return request('/student/me', { auth: true });
  },

  // Coding Profiles
  async getCodingProfiles(): Promise<{ codingProfiles: CodingProfiles }> {
    try {
      return await request('/student/coding-profiles', { auth: true });
    } catch (apiErr) {
      // Fallback: direct Firestore query
      const session = JSON.parse(localStorage.getItem('cv_session') || '{}');
      const studentId = session?.userId;
      if (studentId && db) {
        try {
          const snap = await getDoc(doc(db, 'users', studentId));
          if (snap.exists()) {
            const uData = snap.data();
            if (uData?.codingProfiles) {
              return { codingProfiles: uData.codingProfiles };
            }
            if (uData?.leetcode || uData?.codeforces || uData?.github) {
              return {
                codingProfiles: {
                  leetcode: uData.leetcode ? ({ username: uData.leetcode, status: 'connected' } as any) : null,
                  codeforces: uData.codeforces ? ({ handle: uData.codeforces, status: 'connected' } as any) : null,
                  github: uData.github ? ({ username: uData.github, status: 'connected' } as any) : null,
                },
              };
            }
          }
        } catch (_) {}
      }
      throw apiErr;
    }
  },
  async updateCodingProfiles(data: { leetcodeUsername?: string; codeforcesHandle?: string; githubUsername?: string }): Promise<{ codingProfiles: CodingProfiles }> {
    let res: { codingProfiles: CodingProfiles } | null = null;
    try {
      res = await request('/student/coding-profiles', {
        method: 'PUT',
        body: data,
        auth: true,
      });
    } catch (apiErr) {
      console.warn('Backend /student/coding-profiles call failed, persisting directly to Firestore and local state:', apiErr);
    }

    const session = JSON.parse(localStorage.getItem('cv_session') || '{}');
    const studentId = session?.userId;

    // Build fallback coding profiles structure if backend was offline
    const finalCodingProfiles: CodingProfiles = res?.codingProfiles || {
      leetcode: data.leetcodeUsername ? ({
        username: data.leetcodeUsername,
        profileUrl: `https://leetcode.com/u/${data.leetcodeUsername}/`,
        totalSolved: 0,
        easySolved: 0,
        mediumSolved: 0,
        hardSolved: 0,
        ranking: null,
        contributionPoints: 0,
        reputation: 0,
        status: 'connected',
        error: null,
      } as any) : null,
      codeforces: data.codeforcesHandle ? ({
        handle: data.codeforcesHandle,
        profileUrl: `https://codeforces.com/profile/${data.codeforcesHandle}`,
        rating: 0,
        maxRating: 0,
        rank: 'unranked',
        maxRank: 'unranked',
        totalSolved: 0,
        contestsCount: 0,
        status: 'connected',
        error: null,
      } as any) : null,
      github: data.githubUsername ? ({
        username: data.githubUsername,
        profileUrl: `https://github.com/${data.githubUsername}`,
        publicRepos: 0,
        followers: 0,
        points: 0,
        status: 'connected',
        error: null,
      } as any) : null,
    };

    if (studentId) {
      // 1. Update session storage so UI reflects changes immediately
      if (session.user) {
        if (data.leetcodeUsername !== undefined) session.user.leetcode = data.leetcodeUsername || '';
        if (data.codeforcesHandle !== undefined) session.user.codeforces = data.codeforcesHandle || '';
        if (data.githubUsername !== undefined) session.user.github = data.githubUsername || '';
        session.user.codingProfiles = finalCodingProfiles;
        localStorage.setItem('cv_session', JSON.stringify(session));
      }

      // 2. Direct Firestore writes to users, students, and studentProfiles
      try {
        if (db) {
          const profileData: any = {
            codingProfiles: finalCodingProfiles,
            updatedAt: new Date().toISOString(),
          };
          if (data.leetcodeUsername !== undefined) profileData.leetcode = data.leetcodeUsername || '';
          if (data.codeforcesHandle !== undefined) profileData.codeforces = data.codeforcesHandle || '';
          if (data.githubUsername !== undefined) profileData.github = data.githubUsername || '';

          await Promise.allSettled([
            setDoc(doc(db, 'users', studentId), profileData, { merge: true }),
            setDoc(doc(db, 'students', studentId), profileData, { merge: true }),
            setDoc(doc(db, 'studentProfiles', studentId), profileData, { merge: true }),
          ]);
        }
      } catch (e) {
        console.warn('Direct Firestore coding profile update warning:', e);
      }

      // 3. Broadcast real-time message
      broadcastRealtimeUpdate({
        type: 'student:updated',
        entityType: 'student',
        entityId: studentId,
        data: {
          leetcode: data.leetcodeUsername,
          codeforces: data.codeforcesHandle,
          github: data.githubUsername,
          codingProfiles: finalCodingProfiles,
        },
      });
    }

    return { codingProfiles: finalCodingProfiles };
  },
  async refreshCodingProfiles(): Promise<{ codingProfiles: CodingProfiles }> {
    return request('/student/coding-profiles/refresh', {
      method: 'POST',
      auth: true,
    });
  },

  // Verification
  async getPendingStudents(collegeId: string): Promise<Student[]> {
    return request(`/compat/students/pending?collegeId=${encodeURIComponent(collegeId)}`);
  },
  async getFacultyPendingStudents(): Promise<{ students: any[] }> {
    return request('/faculty/pending-students', { auth: true });
  },
  async facultyVerifyStudent(studentId: string, status: 'verified' | 'rejected') {
    return request('/faculty/verify-student', {
      method: 'POST',
      body: { studentId, status },
      auth: true,
    });
  },
  async approveStudent(studentId: string, collegeId: string): Promise<Student> {
    return request(`/compat/students/${studentId}/approve`, { method: 'POST', body: { collegeId } });
  },
  async rejectStudent(studentId: string): Promise<Student> {
    return request(`/compat/students/${studentId}/reject`, { method: 'POST' });
  },
  async uploadIdCard(file: File): Promise<{ idVerification: IdVerificationData; message?: string }> {
    const formData = new FormData();
    formData.append('idCard', file);

    const token = await auth.currentUser?.getIdToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/student/verify-id-card`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const message = payload?.error?.message || payload?.message || res.statusText || 'ID card upload failed';
      throw new Error(message);
    }
    return payload?.data;
  },

  async uploadResume(file: File): Promise<{
    resumeData: ResumeExtractionData;
    mergedSkills: string[];
    newSkillsAdded: string[];
    profileCompletion?: number;
    missingFields?: string[];
    extractedDetails?: {
      github?: string | null;
      linkedin?: string | null;
      bio?: string | null;
      branch?: string | null;
    };
    message?: string;
  }> {
    const formData = new FormData();
    formData.append('resume', file);

    const token = await auth.currentUser?.getIdToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/student/parse-resume`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const message = payload?.error?.message || payload?.message || res.statusText || 'Resume parsing failed';
      throw new Error(message);
    }
    const data = payload?.data;

    // Direct persistence in Firestore & local session to guarantee instantaneous updates
    const sessionStr = localStorage.getItem('cv_session');
    const session = sessionStr ? JSON.parse(sessionStr) : {};
    const studentId = session?.userId || auth.currentUser?.uid;

    if (studentId && data) {
      const updates: any = {
        skills: data.mergedSkills || [],
        resumeExtraction: data.resumeData,
        resumeUploaded: true,
        resumeUploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (data.extractedDetails?.github) updates.github = data.extractedDetails.github;
      if (data.extractedDetails?.linkedin) updates.linkedin = data.extractedDetails.linkedin;
      if (data.extractedDetails?.bio) updates.bio = data.extractedDetails.bio;
      if (data.extractedDetails?.branch) updates.branch = data.extractedDetails.branch;

      // Update Firestore directly on named database
      if (db) {
        try {
          await setDoc(doc(db, 'users', studentId), updates, { merge: true }).catch(() => null);
          await setDoc(doc(db, 'students', studentId), updates, { merge: true }).catch(() => null);
          await setDoc(doc(db, 'studentProfiles', studentId), updates, { merge: true }).catch(() => null);
        } catch (e) {
          console.warn('Direct Firestore resume persistence warning:', e);
        }
      }

      // Update active session cache
      if (session.user) {
        session.user = {
          ...session.user,
          ...updates,
        };
        localStorage.setItem('cv_session', JSON.stringify(session));
      }

      broadcastRealtimeUpdate({
        type: 'student:updated',
        entityType: 'student',
        entityId: studentId,
        data: updates,
      });
    }

    return data;
  },

  async updateStudentSkills(skills: string[]): Promise<Student> {
    const session = JSON.parse(localStorage.getItem('cv_session') || '{}');
    const studentId = session?.userId;
    if (studentId) {
      try {
        if (db) {
          await setDoc(doc(db, 'users', studentId), { skills }, { merge: true }).catch(() => null);
          await setDoc(doc(db, 'students', studentId), { skills }, { merge: true }).catch(() => null);
        }
      } catch (e) {
        console.warn('Direct Firestore skill update warning:', e);
      }
      broadcastRealtimeUpdate({
        type: 'student:updated',
        entityType: 'student',
        entityId: studentId,
        data: { skills },
      });
    }
    return request(`/compat/students/${studentId}`, {
      method: 'PUT',
      body: { skills },
      auth: true,
    }).catch(() => ({ skills } as any));
  },

  // Wallet
  async getWallet(studentId: string): Promise<WalletSBT[]> {
    return request(`/compat/wallet/${studentId}`);
  },
  async issueSbt(studentId: string, data: Omit<WalletSBT, 'id' | 'studentId'>) {
    return request(`/compat/wallet/${studentId}`, { method: 'POST', body: data });
  },

  // SBT Admin (Web3)
  async sbtListStudents() {
    return request('/sbt/students', { auth: true });
  },
  async sbtVerifyStudent(studentId: string) {
    return request(`/sbt/verify/${studentId}`, { method: 'POST', auth: true });
  },
  async sbtMint(studentId: string, title: string, reason: string) {
    return request(`/sbt/mint/${studentId}`, { method: 'POST', body: { title, reason }, auth: true });
  },
  async sbtGetTokens(studentId: string): Promise<WalletSBT[]> {
    return request(`/sbt/tokens/${studentId}`);
  },
  async sbtGetWallet(studentId: string) {
    return request(`/sbt/wallet/${studentId}`);
  },
  async sbtGetStats() {
    return request('/sbt/stats');
  },

  // Leaderboards
  async getCollegeLeaderboard() {
    return request('/compat/leaderboard/colleges');
  },
  async getStudentLeaderboard(category?: string, collegeId?: string) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (collegeId) params.set('collegeId', collegeId);
    const query = params.toString();
    return request(`/compat/leaderboard/students${query ? `?${query}` : ''}`);
  },

  // Gigs
  async getGigs(): Promise<Gig[]> {
    return request('/compat/gigs');
  },
  async createGig(data: Omit<Gig, 'id' | 'status'>) {
    return request('/compat/gigs', { method: 'POST', body: data });
  },
  async getGigApplications(gigId?: string, studentId?: string): Promise<GigApplication[]> {
    if (gigId) return request(`/compat/gigs/${gigId}/applications`);
    if (studentId) {
      const all = await request<GigApplication[]>('/compat/gig-applications');
      return all.filter((a) => a.studentId === studentId);
    }
    return request('/compat/gig-applications');
  },
  async applyToGig(gigId: string, studentId: string) {
    return request(`/compat/gigs/${gigId}/apply`, { method: 'POST', body: { studentId } });
  },
  async withdrawGig(appId: string) {
    return request(`/compat/gig-applications/${appId}`, { method: 'DELETE' });
  },
  async updateGigApp(appId: string, status: GigApplication['status']) {
    return request(`/compat/gig-applications/${appId}`, { method: 'PATCH', body: { status } });
  },
  async completeGig(appId: string, studentId: string, gigTitle: string) {
    return request(`/compat/gig-applications/${appId}/complete`, { method: 'POST', body: { studentId, gigTitle } });
  },

  // Marketplace
  async getMarketplaceItems(): Promise<MarketplaceItem[]> {
    return request('/compat/marketplace');
  },
  async createMarketplaceItem(data: Omit<MarketplaceItem, 'id' | 'status' | 'flagged' | 'createdAt'>) {
    return request('/compat/marketplace', { method: 'POST', body: data });
  },
  async reserveItem(itemId: string) {
    return request(`/compat/marketplace/${itemId}/reserve`, { method: 'POST' });
  },
  async flagItem(itemId: string, reason: string) {
    return request(`/compat/marketplace/${itemId}/flag`, { method: 'POST', body: { reason } });
  },
  async deleteMarketplaceItem(itemId: string) {
    return request(`/compat/marketplace/${itemId}`, { method: 'DELETE' });
  },
  async updateMarketplaceItem(itemId: string, data: Partial<MarketplaceItem>) {
    return request(`/compat/marketplace/${itemId}`, { method: 'PATCH', body: data });
  },

  // Communities
  async getCommunities(collegeId?: string): Promise<Community[]> {
    const query = collegeId ? `?collegeId=${encodeURIComponent(collegeId)}` : '';
    return request(`/compat/communities${query}`);
  },
  async joinCommunity(communityId: string, studentId: string) {
    return request(`/compat/communities/${communityId}/join`, { method: 'POST', body: { studentId } });
  },
  async leaveCommunity(communityId: string, studentId: string) {
    return request(`/compat/communities/${communityId}/leave`, { method: 'POST', body: { studentId } });
  },

  // Clubs
  async getClubs(collegeId?: string): Promise<Club[]> {
    const query = collegeId ? `?collegeId=${encodeURIComponent(collegeId)}` : '';
    return request(`/compat/clubs${query}`);
  },
  async createClubApplication(data: Omit<Club, 'id' | 'status' | 'members'>) {
    return request('/compat/clubs', { method: 'POST', body: data });
  },
  async approveClub(clubId: string) {
    return request(`/compat/clubs/${clubId}/approve`, { method: 'POST' });
  },
  async rejectClub(clubId: string) {
    return request(`/compat/clubs/${clubId}/reject`, { method: 'POST' });
  },
  async joinClub(clubId: string, studentId: string) {
    return request(`/compat/clubs/${clubId}/join`, { method: 'POST', body: { studentId } });
  },

  // Events
  async getEvents(collegeId?: string): Promise<Event[]> {
    const query = collegeId ? `?collegeId=${encodeURIComponent(collegeId)}` : '';
    return request(`/compat/events${query}`);
  },
  async createEvent(data: Omit<Event, 'id' | 'applicants'>) {
    return request('/compat/events', { method: 'POST', body: data });
  },
  async applyToEvent(eventId: string, studentId: string) {
    return request(`/compat/events/${eventId}/apply`, { method: 'POST', body: { studentId } });
  },
  async deleteEvent(eventId: string) {
    return request(`/compat/events/${eventId}`, { method: 'DELETE' });
  },

  // Teams
  async getTeams(eventId: string): Promise<Team[]> {
    return request(`/compat/events/${eventId}/teams`);
  },
  async createTeam(data: Omit<Team, 'id'>) {
    return request('/compat/teams', { method: 'POST', body: data });
  },
  async joinTeam(teamId: string, studentId: string) {
    return request(`/compat/teams/${teamId}/join`, { method: 'POST', body: { studentId } });
  },

  // Placements
  async getPlacements(collegeId?: string): Promise<Placement[]> {
    const query = collegeId ? `?collegeId=${encodeURIComponent(collegeId)}` : '';
    return request(`/compat/placements${query}`);
  },
  async applyToPlacement(placementId: string, studentId: string) {
    return request(`/compat/placements/${placementId}/apply`, { method: 'POST', body: { studentId } });
  },

  // Notices
  async getNotices(collegeId: string): Promise<Notice[]> {
    return request(`/compat/notices?collegeId=${encodeURIComponent(collegeId)}`);
  },
  async createNotice(data: Omit<Notice, 'id'>) {
    return request('/compat/notices', { method: 'POST', body: data });
  },
  async updateNotice(id: string, data: Partial<Notice>) {
    return request(`/compat/notices/${id}`, { method: 'PATCH', body: data });
  },
  async deleteNotice(id: string) {
    return request(`/compat/notices/${id}`, { method: 'DELETE' });
  },

  // Messages
  async getMessages(communityId: string): Promise<ChatMessage[]> {
    return request(`/compat/messages?communityId=${encodeURIComponent(communityId)}`);
  },
  async sendMessage(data: Omit<ChatMessage, 'id' | 'timestamp'>) {
    return request('/compat/messages', { method: 'POST', body: data });
  },
  async deleteMessage(id: string) {
    return request(`/compat/messages/${id}`, { method: 'DELETE' });
  },

  // Competitions
  async getCompetitions(): Promise<Competition[]> {
    return request('/compat/competitions');
  },
  async joinCompetition(compId: string, studentId: string) {
    return request(`/compat/competitions/${compId}/join`, { method: 'POST', body: { studentId } });
  },

  // Shortlist
  async getShortlist(recruiterId: string): Promise<ShortlistEntry[]> {
    return request(`/compat/shortlist?recruiterId=${encodeURIComponent(recruiterId)}`);
  },
  async addToShortlist(entry: ShortlistEntry) {
    return request('/compat/shortlist', { method: 'POST', body: entry });
  },
  async removeFromShortlist(recruiterId: string, studentId: string) {
    return request(`/compat/shortlist?recruiterId=${encodeURIComponent(recruiterId)}&studentId=${encodeURIComponent(studentId)}`, { method: 'DELETE' });
  },
  async updateShortlistNote(recruiterId: string, studentId: string, notes: string) {
    return request('/compat/shortlist', { method: 'PATCH', body: { recruiterId, studentId, notes } });
  },

  // Faculty
  async getFacultyById(id: string): Promise<Faculty | undefined> {
    return request(`/compat/faculty/${id}`);
  },

  // Recruiters
  async getRecruiterById(id: string): Promise<Recruiter | undefined> {
    try {
      const res = await request<Recruiter>(`/compat/recruiters/${id}`);
      if (res && res.id) return res;
    } catch (_) {}

    if (db && id) {
      try {
        const snap = await getDoc(doc(db, 'recruiters', id));
        if (snap.exists()) {
          return { id, ...snap.data() } as Recruiter;
        }
      } catch (e) {
        console.warn('Firestore recruiter read notice:', e);
      }
    }

    const session = JSON.parse(localStorage.getItem('cv_session') || '{}');
    if (session?.userId === id && session?.user) {
      return session.user as Recruiter;
    }
    return undefined;
  },
  async updateRecruiter(id: string, data: Partial<Recruiter>): Promise<Recruiter> {
    const session = JSON.parse(localStorage.getItem('cv_session') || '{}');
    if (session?.user) {
      session.user = { ...session.user, ...data };
      localStorage.setItem('cv_session', JSON.stringify(session));
    }

    if (db && id) {
      try {
        await setDoc(doc(db, 'recruiters', id), { ...data, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.warn('Direct Firestore recruiter write notice:', e);
      }
    }

    broadcastRealtimeUpdate({
      type: 'recruiter:updated',
      entityType: 'recruiter',
      entityId: id,
      data,
    });

    return request(`/compat/recruiters/${id}`, { method: 'PUT', body: data }).catch(() => data as Recruiter);
  },
  async incrementRecruiterField(id: string, field?: string, amount?: number, action?: string, value?: string): Promise<Recruiter> {
    return request(`/compat/recruiters/${id}/increment`, {
      method: 'POST',
      body: { field, amount, action, value },
    });
  },

  // Analytics
  async getCollegeAnalytics(collegeId: string) {
    return request(`/compat/analytics?collegeId=${encodeURIComponent(collegeId)}`);
  },

  // Contact
  async submitContactInquiry(data: { name: string; email: string; message: string; collegeId?: string }) {
    return request('/compat/contact', { method: 'POST', body: data });
  },

  // --- Signup ---
  async signup(data: {
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
  }) {
    // 1. Create Firebase Auth user
    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    // 2. Create backend profile + roleOverrides
    const { password, ...profileData } = data;
    const fullProfile = { id: cred.user.uid, ...profileData };
    
    await request('/compat/signup', { method: 'POST', body: profileData }).catch(() => null);
    
    // 2.5 Save directly to Firestore for real-time frontend retrieval
    try {
      await setDoc(doc(db, 'users', cred.user.uid), fullProfile);
    } catch (e) {
      console.warn("Failed to write profile to Firestore", e);
    }
    
    // 3. Bootstrap session
    const bootstrap = await request<{ uid: string; role: string }>(
      '/auth/bootstrap',
      { method: 'POST', auth: true }
    ).catch(() => ({ uid: cred.user.uid, role: data.role }));
    
    let profile = await getProfileByEmail(data.email, data.role).catch(() => null);
    if (!profile) profile = fullProfile; // Use the freshly saved profile if backend fails
    
    return {
      role: data.role,
      userId: cred.user.uid,
      token: await cred.user.getIdToken(),
      user: profile,
    };
  },

  // --- AI Resume ---
  async generateResume(studentId?: string) {
    return request('/api/v1/ai/generate-resume', { method: 'POST', body: { studentId } });
  },

  async getAiStatus() {
    return request('/api/v1/ai/status');
  },

  // --- SuperAdmin ---
  async superAdminGetInstitutions(): Promise<Institution[]> {
    return request('/superadmin/institutions', { auth: true });
  },

  async superAdminCreateInstitution(data: { name: string; domain: string; contactEmail?: string }): Promise<Institution> {
    return request('/superadmin/institutions', { method: 'POST', body: data, auth: true });
  },

  async superAdminUpdateInstitution(id: string, data: { name?: string; isActive?: boolean; contactEmail?: string }): Promise<Institution> {
    return request(`/superadmin/institutions/${id}`, { method: 'PATCH', body: data, auth: true });
  },

  async superAdminDeleteInstitution(id: string): Promise<{ id: string; isActive: boolean; deleted: boolean }> {
    return request(`/superadmin/institutions/${id}`, { method: 'DELETE', auth: true });
  },

  async superAdminPromoteAdminFaculty(data: { collegeId: string; uid?: string; email?: string }) {
    return request('/superadmin/promote-admin', { method: 'POST', body: data, auth: true });
  },

  resetAll() {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('cv_'));
    keys.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem('cv_session');
  },
};
