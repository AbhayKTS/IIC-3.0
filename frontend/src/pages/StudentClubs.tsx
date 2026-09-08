import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import type { Club } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Shield,
  Plus,
  Users,
  Search,
  CheckCircle2,
  Sparkles,
  Building,
} from 'lucide-react';

const SEED_CLUBS: Club[] = [
  {
    id: 'club-acm',
    name: 'ACM Student Chapter',
    collegeId: 'all',
    category: 'Technical & Research',
    purpose: 'Host computing contests, technical lecture series, and research paper presentations.',
    sponsor: 'Dept. of Computer Science & Engineering',
    status: 'approved',
    members: ['s1', 's2', 's3', 's4'],
    createdBy: 'student',
  },
  {
    id: 'club-ieee',
    name: 'IEEE Robotics & Automation Society',
    collegeId: 'all',
    category: 'Hardware & IoT',
    purpose: 'Building autonomous rovers, drone control firmware, and participating in international robotics challenges.',
    sponsor: 'Dept. of Electronics & Communication',
    status: 'approved',
    members: ['s2', 's4', 's5'],
    createdBy: 'student',
  },
  {
    id: 'club-gdg',
    name: 'Google Developer Group on Campus (GDG)',
    collegeId: 'all',
    category: 'Software & Open Source',
    purpose: 'Google Cloud study jams, Android development bootcamps, and annual devfest organizing.',
    sponsor: 'Dean Student Welfare',
    status: 'approved',
    members: ['s1', 's3', 's5'],
    createdBy: 'student',
  },
];

export default function StudentClubs() {
  const { session } = useAuth();
  const studentId = session?.userId || 'student';

  const [clubs, setClubs] = useState<Club[]>(SEED_CLUBS);
  const [search, setSearch] = useState('');
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set(['club-acm']));

  // Proposal modal
  const [proposeOpen, setProposeOpen] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubCategory, setNewClubCategory] = useState('Technical');
  const [newClubPurpose, setNewClubPurpose] = useState('');
  const [newClubSponsor, setNewClubSponsor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async () => {
    try {
      const data = await api.getClubs().catch(() => null);
      if (data && Array.isArray(data) && data.length > 0) {
        setClubs(data);
      }
    } catch {
      setClubs(SEED_CLUBS);
    }
  };

  const handleJoin = async (clubId: string) => {
    try {
      await api.joinClub(clubId, studentId).catch(() => null);
      setJoinedIds((prev) => new Set([...prev, clubId]));
      toast.success('Joined club! Application recorded.');
    } catch {
      toast.error('Could not join club');
    }
  };

  const handleProposeClub = async () => {
    if (!newClubName.trim() || !newClubPurpose.trim()) {
      toast.error('Please enter club name and purpose');
      return;
    }

    try {
      setSubmitting(true);
      const newClub: Omit<Club, 'id' | 'status' | 'members'> = {
        name: newClubName,
        collegeId: (session?.user as any)?.collegeId || 'all',
        category: newClubCategory,
        purpose: newClubPurpose,
        sponsor: newClubSponsor || 'Faculty Advisor TBD',
        createdBy: studentId,
      };

      await api.createClubApplication(newClub).catch(() => null);

      toast.success('Club charter proposed! It will appear in the College Review queue.');
      setProposeOpen(false);
      setNewClubName('');
      setNewClubPurpose('');
      setNewClubSponsor('');
    } catch {
      toast.error('Failed to propose club');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = clubs.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase()) ||
      c.purpose.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout role="student">
      <div className="container-main py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" /> University Student Clubs
            </h1>
            <p className="text-xs text-muted-foreground">
              Official student-led bodies, technical societies, and cultural organizations.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clubs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Button onClick={() => setProposeOpen(true)} className="gap-1.5 text-xs shadow-sm">
              <Plus className="h-4 w-4" /> Propose Club
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((club) => {
            const isJoined = joinedIds.has(club.id);
            return (
              <div
                key={club.id}
                className="glass-card p-6 rounded-2xl border border-border/80 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all hover:shadow-lg group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                      {club.category}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {club.status}
                    </Badge>
                  </div>

                  <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                    {club.name}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {club.purpose}
                  </p>

                  <div className="text-[11px] text-muted-foreground pt-1">
                    <span className="font-medium text-foreground">Sponsor: </span>
                    {club.sponsor}
                  </div>
                </div>

                <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {club.members.length} Members
                  </span>

                  {isJoined ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3" /> Member
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleJoin(club.id)}
                      className="text-xs gap-1.5 shadow-sm"
                    >
                      Join Club
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* PROPOSE CLUB MODAL */}
        <Dialog open={proposeOpen} onOpenChange={setProposeOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" /> Propose New Student Club
              </DialogTitle>
              <DialogDescription>
                Submit a new charter to the Dean of Student Welfare for institutional recognition.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground">Club Name *</label>
                <Input
                  placeholder="e.g. AlmaDox Web3 Research Group"
                  value={newClubName}
                  onChange={(e) => setNewClubName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Category</label>
                <Input
                  placeholder="Technical / Cultural / Research / Social"
                  value={newClubCategory}
                  onChange={(e) => setNewClubCategory(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Faculty Sponsor / Dept.</label>
                <Input
                  placeholder="e.g. Dept of Computer Science"
                  value={newClubSponsor}
                  onChange={(e) => setNewClubSponsor(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Charter & Purpose *</label>
                <textarea
                  rows={3}
                  placeholder="State the objective, planned events, and student benefit..."
                  value={newClubPurpose}
                  onChange={(e) => setNewClubPurpose(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setProposeOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleProposeClub} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Charter'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
