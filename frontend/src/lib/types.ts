export type UserRole = 'student' | 'faculty' | 'recruiter';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface College {
  id: string; name: string; location: string; ranking: number;
  type: string; studentCount: number; departments: string[];
  description: string; established: number;
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
