import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/mockApi';
import type { Club } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Building,
} from 'lucide-react';

const SEED_PENDING_CLUBS: Club[] = [
  {
    id: 'club-pending-1',
    name: 'AlmaDox Web3 Research & Zero-Knowledge Lab',
    collegeId: 'all',
    category: 'Advanced Research',
    purpose: 'Student working group focused on researching zero-knowledge proofs on Polygon and decentralized credential verification.',
    sponsor: 'Dept. of Computer Science & Engineering',
    status: 'pending',
    members: ['s1', 's2'],
    createdBy: 'student',
  },
  {
    id: 'club-pending-2',
    name: 'Autonomous Drone & Avionics Society',
    collegeId: 'all',
    category: 'Hardware & Aerospace',
    purpose: 'Hands-on construction of delivery quadcopters and automated computer vision tracking algorithms.',
    sponsor: 'Dept. of Mechanical Engineering',
    status: 'pending',
    members: ['s3', 's4'],
    createdBy: 'student',
  },
];

export default function CollegeClubsApprovals() {
  const [clubs, setClubs] = useState<Club[]>(SEED_PENDING_CLUBS);

  useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async () => {
    try {
      const data = await api.getClubs().catch(() => null);
      if (data && Array.isArray(data)) {
        const pending = data.filter((c) => c.status === 'pending');
        if (pending.length > 0) setClubs(pending);
      }
    } catch {
      // Keep seed
    }
  };

  const handleAction = async (clubId: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await api.approveClub(clubId).catch(() => null);
        toast.success('Club charter approved! Student body notified.');
      } else {
        await api.rejectClub(clubId).catch(() => null);
        toast.info('Club application rejected.');
      }
      setClubs((prev) => prev.filter((c) => c.id !== clubId));
    } catch {
      toast.error('Action failed');
    }
  };

  return (
    <DashboardLayout role="faculty">
      <div className="container-main py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" /> Student Club Charter Approvals
            </h1>
            <p className="text-xs text-muted-foreground">
              Review, approve, or reject student-proposed society charters and faculty advisor sponsorships.
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {clubs.length} Charters Pending Review
          </Badge>
        </div>

        {clubs.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-2xl border border-dashed border-border/80 space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto opacity-70" />
            <h3 className="font-semibold text-foreground">No pending club charters</h3>
            <p className="text-xs text-muted-foreground">All student club proposals have been processed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {clubs.map((club) => (
              <div
                key={club.id}
                className="glass-card p-6 rounded-2xl border border-border/80 flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                      {club.category}
                    </Badge>
                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px]">
                      <Clock className="h-3 w-3 mr-1" /> Pending Charter
                    </Badge>
                  </div>

                  <h3 className="font-bold text-lg text-foreground">{club.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{club.purpose}</p>

                  <div className="text-xs text-muted-foreground pt-1">
                    <span className="font-semibold text-foreground">Proposed Sponsor: </span>
                    {club.sponsor}
                  </div>
                </div>

                <div className="pt-4 border-t border-border/40 flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(club.id, 'reject')}
                    className="text-xs text-destructive hover:bg-destructive/10 border-destructive/20 gap-1"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAction(club.id, 'approve')}
                    className="text-xs gap-1 shadow-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve Charter
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
