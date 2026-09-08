import type {
  College, Student, Faculty, Recruiter, Gig, GigApplication,
  MarketplaceItem, WalletSBT, Community, Club, Event, Team,
  Placement, Notice, ChatMessage, Competition, ShortlistEntry, Session
} from './types';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api/v1' : 'http://localhost:4000/api/v1');

const request = async <T>(path: string, options: { method?: string; body?: any; auth?: boolean } = {}): Promise<T> => {
  const { method = 'GET', body, auth: withAuth = false } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (withAuth) {
    const token = await auth.currentUser?.getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message = payload?.error?.message || res.statusText || 'Request failed';
    throw new Error(message);
  }
  return payload?.data as T;
};

const getProfileByEmail = async (email: string, role: string) => {
  return request<Student | Faculty | Recruiter | null>(`/compat/profile?email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}`);
};

export const api = {
  // Auth
  async login(email: string, password: string): Promise<Session & { user: Student | Faculty | Recruiter }> {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const token = await credential.user.getIdToken();
    const bootstrap = await request<{ uid: string; role: string }>(
      '/auth/bootstrap',
      { method: 'POST', auth: true }
    );
    const role = bootstrap.role || 'student';
    const profile = await getProfileByEmail(email, role);
    if (!profile) {
      return { role: role as any, userId: bootstrap.uid, token, user: { id: bootstrap.uid, email } as any };
    }
    return { role: role as any, userId: profile.id, token, user: profile as any };
  },

  // Colleges
  async getColleges(): Promise<College[]> {
    return request('/compat/colleges');
  },
  async getCollegeById(id: string): Promise<College | undefined> {
    return request(`/compat/colleges/${id}`);
  },

  // Students
  async getStudents(): Promise<Student[]> {
    return request('/compat/students');
  },
  async getStudentById(id: string): Promise<Student | undefined> {
    return request(`/compat/students/${id}`);
  },
  async updateStudent(id: string, data: Partial<Student>): Promise<Student> {
    return request(`/compat/students/${id}`, { method: 'PUT', body: data });
  },
  async getVerifiedStudents(): Promise<Student[]> {
    return request('/compat/students/verified');
  },

  // Verification
  async getPendingStudents(collegeId: string): Promise<Student[]> {
    return request(`/compat/students/pending?collegeId=${encodeURIComponent(collegeId)}`);
  },
  async approveStudent(studentId: string, collegeId: string): Promise<Student> {
    return request(`/compat/students/${studentId}/approve`, { method: 'POST', body: { collegeId } });
  },
  async rejectStudent(studentId: string): Promise<Student> {
    return request(`/compat/students/${studentId}/reject`, { method: 'POST' });
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

  // Analytics
  async getCollegeAnalytics(collegeId: string) {
    return request(`/compat/analytics?collegeId=${encodeURIComponent(collegeId)}`);
  },

  // Contact
  async submitContactInquiry(data: { name: string; email: string; message: string; collegeId?: string }) {
    return request('/compat/contact', { method: 'POST', body: data });
  },

  // --- Signup ---
  async signup(data: { email: string; password: string; role: 'student' | 'faculty' | 'recruiter'; name: string; collegeId?: string; department?: string; company?: string; position?: string }) {
    // 1. Create Firebase Auth user
    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    // 2. Create backend profile + roleOverrides
    const { password, ...profileData } = data;
    await request('/compat/signup', { method: 'POST', body: profileData });
    // 3. Bootstrap session
    return request('/auth/bootstrap', { method: 'POST' });
  },

  // --- AI Resume ---
  async generateResume(studentId?: string) {
    return request('/api/v1/ai/generate-resume', { method: 'POST', body: { studentId } });
  },

  async getAiStatus() {
    return request('/api/v1/ai/status');
  },

  resetAll() {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('cv_'));
    keys.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem('cv_session');
  },
};
