export type UserRole = 'student' | 'faculty' | 'recruiter';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface College {
  id: string; name: string; location: string; ranking: number;
  type: string; studentCount: number; departments: string[];
  description: string; established: number;
}

export interface Institution {
  id: string;
  collegeId?: string;
  name: string;
  domain: string;
  contactEmail?: string;
  isActive: boolean;
  studentCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IdVerificationData {
  status: 'pending_review' | 'verified' | 'rejected';
  extractedData?: {
    studentName?: string | null;
    rollNumber?: string | null;
    collegeName?: string | null;
    validUntil?: string | null;
    rawFields?: Record<string, any>;
  };
  confidence?: number;
  collegeMatch?: {
    matched: boolean;
    extractedCollegeName?: string | null;
    expectedCollegeName?: string | null;
    mismatchFlagged?: boolean;
  };
  source?: string;
  submittedAt?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

export interface ExtractedSkill {
  name: string;
  category?: 'technical' | 'soft';
}

export interface ResumeExtractionData {
  skills: ExtractedSkill[];
  education?: Array<{ degree?: string; institution?: string; year?: string }>;
  experience?: Array<{ title?: string; org?: string; duration?: string; description?: string }>;
  certifications?: string[];
  links?: { github?: string | null; linkedin?: string | null; portfolio?: string | null };
  method: 'azure-openai' | 'rule-based';
  extractedAt?: string;
}

export interface Student {
  id: string; name: string; email: string; password: string;
  collegeId: string; verificationStatus: VerificationStatus;
  avatar: string; skills: string[];
  points: { cultural: number; sports: number; education: number; coding: number };
  github?: string; linkedin?: string; leetcode?: string;
  codeforces?: string; codechef?: string;
  achievements: { title: string; date: string; points: number }[];
  certificates: { title: string; issuer: string; date: string }[];
  bio?: string;
  idVerification?: IdVerificationData;
  resumeExtraction?: ResumeExtractionData;
}

export interface Faculty {
  id: string; name: string; email: string; password: string;
  collegeId: string; role: 'admin' | 'normal'; department: string;
}

export interface Recruiter {
  id: string; name: string; email: string; password: string;
  company: string; position: string;
}

export interface Gig {
  id: string; title: string; description: string; skills: string[];
  reward: number; deadline: string; mode: 'remote' | 'on-campus';
  category: string; duration: string; paid: boolean;
  recruiterId: string; status: 'open' | 'closed';
}

export interface GigApplication {
  id: string; gigId: string; studentId: string;
  status: 'applied' | 'accepted' | 'rejected' | 'completed' | 'withdrawn';
}

export interface MarketplaceItem {
  id: string; title: string; category: string; price: number;
  condition: string; description: string; location: string;
  sellerId: string; collegeId: string;
  status: 'available' | 'reserved' | 'sold';
  flagged: boolean; flagReason?: string; createdAt: string;
}

export interface WalletSBT {
  id: string; studentId: string; title: string; reason: string;
  issuedBy: string; date: string; txHash: string;
  tokenId?: number; contractAddress?: string; network?: string;
  walletAddress?: string;
}

export interface Community {
  id: string; name: string; collegeId: string;
  type: 'mandatory' | 'optional'; members: string[];
  description: string;
}

export interface Club {
  id: string; name: string; collegeId: string; category: string;
  purpose: string; sponsor: string;
  status: 'pending' | 'approved' | 'rejected';
  members: string[]; createdBy: string;
}

export interface Event {
  id: string; title: string; collegeId: string; type: string;
  date: string; description: string; tags: string[];
  applicants: string[];
}

export interface Team {
  id: string; eventId: string; name: string;
  members: string[]; openSlots: number; createdBy: string;
}

export interface Placement {
  id: string; title: string; company: string; collegeId: string;
  deadline: string; description: string; requirements: string[];
  applicants: string[]; package: string;
}

export interface Notice {
  id: string; title: string; content: string; collegeId: string;
  createdBy: string; date: string; priority: 'low' | 'medium' | 'high';
}

export interface ChatMessage {
  id: string; communityId: string; senderId: string; senderName: string;
  text: string; timestamp: string;
}

export interface Competition {
  id: string; title: string; type: 'area' | 'all-college';
  date: string; description: string; participants: string[];
  status: 'upcoming' | 'ongoing' | 'completed'; category: string;
}

export interface ShortlistEntry {
  studentId: string; recruiterId: string; notes: string; addedAt: string;
}

export interface Session {
  role: UserRole; userId: string; token: string;
}

export interface JobRecommendation {
  studentId: string;
  jobId: string;
  title: string;
  company: string;
  location?: string;
  jobType?: string;
  matchScore: number;
  matchingSkills: string[];
  reason: string;
  updatedAt?: string;
}

export interface AppNotification {
  id?: string;
  notificationId?: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  referenceId?: string;
  matchScore?: number;
  isRead: boolean;
  createdAt: string;
}
