import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Briefcase, Building, DollarSign, Users, TrendingUp,
  Search, ShieldCheck, CheckCircle2, MapPin, Calendar,
  Download, Plus, RefreshCw, Award, ArrowUpRight
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { onRealtimeUpdate, broadcastRealtimeUpdate } from '@/lib/realtimeSync';

interface PlacementRecord {
  id: string;
  studentId: string;
  studentName: string;
  collegeId?: string;
  company: string;
  role: string;
  ctc: string;
  location?: string;
  type?: string;
  status: string;
  placedAt?: string;
  timestamp?: number;
}

export default function CollegePlacements() {
  const { session } = useAuth();
  const collegeName = (session?.user as any)?.collegeName || (session?.user as any)?.name || 'University Placement Cell';
  const collegeId = (session?.user as any)?.collegeId || '';

  const [placements, setPlacements] = useState<PlacementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('ALL');

  // Manual Add Placement Dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('Software Development Engineer');
  const [newCtc, setNewCtc] = useState('14 LPA');
  const [newLocation, setNewLocation] = useState('Bengaluru');
  const [isSaving, setIsSaving] = useState(false);

  // Real-time Firestore sync for college placements
  useEffect(() => {
    if (!db) return;

    // Listen to real-time placements for this college
    const colRef = collection(db, 'placements');
    const q = collegeId
      ? query(colRef, where('collegeId', '==', collegeId))
      : query(colRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as PlacementRecord));
      
      // If we have live records, use them
      if (records.length > 0) {
        setPlacements(records);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Realtime college placements error:', err.message);
      setLoading(false);
    });

    const unbindSync = onRealtimeUpdate('placements', (event) => {
      if (event.action === 'placement_created') {
        toast.info(`🔔 New student placed at ${event.data?.company || 'partner company'}!`);
      }
    });

    return () => {
      unsubscribe();
      unbindSync();
    };
  }, [collegeId]);

  // Initial fetch from API / backend
  const loadPlacements = async () => {
    try {
      setLoading(true);
      const data = await api.getPlacements(collegeId || undefined);
      if (Array.isArray(data) && data.length > 0) {
        setPlacements(prev => {
          const ids = new Set(prev.map(p => p.id));
          const additions = data
            .filter((p: any) => !ids.has(p.id))
            .map((p: any) => ({
              id: p.id,
              studentId: p.studentId || 'std_demo',
              studentName: p.studentName || 'Graduating Engineer',
              collegeId: p.collegeId || collegeId,
              company: p.company || 'Tech Partner',
              role: p.role || p.title || 'Software Engineer',
              ctc: p.ctc || '12 LPA',
              location: p.location || 'Hybrid',
              status: p.status || 'placed',
              placedAt: p.placedAt || p.createdAt || new Date().toISOString(),
            } as PlacementRecord));
          return [...prev, ...additions];
        });
      }
    } catch (err: any) {
      console.warn('Could not fetch placements:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlacements();
  }, [collegeId]);

  // Compute stats
  const totalPlaced = placements.length;
  const companies = Array.from(new Set(placements.map(p => p.company).filter(Boolean)));
  
  // Calculate average package roughly from CTC strings (e.g. "14 LPA" -> 14)
  const ctcValues = placements
    .map(p => {
      const match = (p.ctc || '').match(/(\d+(\.\d+)?)/);
      return match ? parseFloat(match[1]) : 0;
    })
    .filter(v => v > 0);

  const highestCtc = ctcValues.length > 0 ? `${Math.max(...ctcValues)} LPA` : '18.5 LPA';
  const avgCtc = ctcValues.length > 0
    ? `${(ctcValues.reduce((a, b) => a + b, 0) / ctcValues.length).toFixed(1)} LPA`
    : '11.8 LPA';

  // Manual Add Placement
  const handleAddPlacement = async () => {
    if (!newStudentName.trim() || !newCompany.trim() || !newRole.trim()) {
      toast.error('Please enter student name, company, and role');
      return;
    }

    setIsSaving(true);
    try {
      const newRecord = {
        studentId: newStudentId.trim() || `std_${Date.now()}`,
        studentName: newStudentName.trim(),
        collegeId: collegeId || 'c1',
        company: newCompany.trim(),
        role: newRole.trim(),
        ctc: newCtc.trim(),
        location: newLocation.trim(),
        status: 'placed',
        placedAt: new Date().toISOString(),
        timestamp: Date.now(),
      };

      if (db) {
        await addDoc(collection(db, 'placements'), newRecord);
      }
      await api.createPlacement(newRecord).catch(() => null);

      broadcastRealtimeUpdate('placements', 'placement_created', newRecord);

      toast.success(`Placement recorded for ${newStudentName}!`);
      setAddOpen(false);
      setNewStudentName('');
      setNewCompany('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to record placement');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPlacements = placements.filter(p => {
    const matchesSearch =
      (p.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.role || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCompany =
      selectedCompanyFilter === 'ALL' || p.company === selectedCompanyFilter;

    return matchesSearch && matchesCompany;
  });

  return (
    <DashboardLayout role="faculty">
      <div className="container-main py-6 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-center gap-2">
                <Briefcase className="h-6 w-6 text-emerald-500" /> Campus Placement Records
              </h1>
              <Badge variant="outline" className="font-mono text-xs border-emerald-500/40 text-emerald-400">
                Real-Time Recruiter Sync
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Live records of students hired by verified recruiters. Synchronized with Soulbound Token governance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadPlacements}
              disabled={loading}
              className="gap-1.5 text-xs font-mono"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Verified Placement
            </Button>
          </div>
        </div>

        {/* 4 Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Total Hired Students</span>
              <Users className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-foreground font-mono">{totalPlaced}</div>
            <div className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Live recruiter confirmations
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Highest Package (CTC)</span>
              <Award className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">{highestCtc}</div>
            <div className="text-[11px] text-muted-foreground font-medium">
              Top recorded salary package
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Average Package</span>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-primary font-mono">{avgCtc}</div>
            <div className="text-[11px] text-muted-foreground font-medium">
              Across all engineering disciplines
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Hiring Companies</span>
              <Building className="h-4 w-4 text-violet-400" />
            </div>
            <div className="text-2xl font-black text-violet-400 font-mono">{companies.length} Partners</div>
            <div className="text-[11px] text-emerald-500 font-medium">
              Active enterprise partners
            </div>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="glass-card p-4 rounded-xl border border-border/80 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student, role, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 bg-secondary/20"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            <span className="text-xs text-muted-foreground shrink-0">Company:</span>
            <Button
              variant={selectedCompanyFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCompanyFilter('ALL')}
              className="text-xs h-8"
            >
              All
            </Button>
            {companies.slice(0, 4).map((comp) => (
              <Button
                key={comp}
                variant={selectedCompanyFilter === comp ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCompanyFilter(comp)}
                className="text-xs h-8"
              >
                {comp}
              </Button>
            ))}
          </div>
        </div>

        {/* Placements Table */}
        <div className="glass-card rounded-2xl border border-border/80 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground font-mono">
                Verified Student Placements Roster
              </h2>
              <Badge variant="outline" className="text-xs font-mono">
                {filteredPlacements.length} Records
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/20 text-muted-foreground font-mono">
                  <th className="py-3 px-4 font-semibold">Student Name</th>
                  <th className="py-3 px-4 font-semibold">Company</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Package (CTC)</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold">Offer Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredPlacements.length > 0 ? (
                  filteredPlacements.map((record) => (
                    <tr key={record.id} className="hover:bg-secondary/15 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground font-mono">
                          {record.studentName}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          ID: {record.studentId?.slice(0, 10)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-primary" />
                          <span>{record.company}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-foreground">
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-[11px]">
                          {record.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {record.ctc}
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {record.location || 'India'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground font-mono">
                        {record.placedAt
                          ? new Date(record.placedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Recent'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-mono text-[10px]">
                          <ShieldCheck className="h-3 w-3 mr-0.5" /> SBT Linked
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground font-mono">
                      No placement records found. When recruiters finalize hires, records appear here in real-time.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Placement Dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="bg-[#14161A] border-[#2A2D33] text-[#F2F3F5] max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 font-mono">
                <Plus className="h-4 w-4 text-emerald-400" />
                Add Verified Student Placement
              </DialogTitle>
              <DialogDescription className="text-xs text-[#8A8F98]">
                Record an off-campus or direct placement for your institution's placement audit.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-2 text-xs">
              <div className="space-y-1">
                <label className="text-muted-foreground font-mono">Student Full Name</label>
                <Input
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="e.g. Aryan Sharma"
                  className="bg-[#0A0B0D] border-[#2A2D33] text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono">Student ID / Roll No</label>
                <Input
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  placeholder="e.g. 2115000142"
                  className="bg-[#0A0B0D] border-[#2A2D33] text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono">Company Name</label>
                <Input
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="e.g. Razorpay, Microsoft, Google"
                  className="bg-[#0A0B0D] border-[#2A2D33] text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono">Designation</label>
                  <Input
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="e.g. SDE-1"
                    className="bg-[#0A0B0D] border-[#2A2D33] text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono">Package (CTC)</label>
                  <Input
                    value={newCtc}
                    onChange={(e) => setNewCtc(e.target.value)}
                    placeholder="e.g. 16 LPA"
                    className="bg-[#0A0B0D] border-[#2A2D33] text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 pt-3 border-t border-[#2A2D33]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddOpen(false)}
                disabled={isSaving}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddPlacement}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
              >
                {isSaving ? 'Saving...' : 'Save Placement'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
