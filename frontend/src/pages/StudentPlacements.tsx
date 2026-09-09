import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/mockApi';
import { useAuth } from '@/lib/auth';
import type { Placement } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Briefcase, MapPin, Clock, Building, DollarSign,
  CheckCircle2, Loader2, ArrowRight, AlertCircle,
} from 'lucide-react';

export default function StudentPlacements() {
  const { session } = useAuth();
  const studentId = session?.userId || '';
  const collegeId = (session?.user as any)?.collegeId || '';

  const [placements, setPlacements] = useState<Placement[]>([]);
  const [myApplications, setMyApplications] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    loadPlacements();
  }, [collegeId]);

  const loadPlacements = async () => {
    try {
      setLoading(true);
      const data = await api.getPlacements(collegeId || undefined);
      setPlacements(Array.isArray(data) ? data : []);

      // Track which ones the current student has already applied to
      if (studentId) {
        const applied = new Set(
          (Array.isArray(data) ? data : [])
            .filter((p: any) => Array.isArray(p.applicants) && p.applicants.includes(studentId))
            .map((p: any) => p.id)
        );
        setMyApplications(applied);
      }
    } catch (err: any) {
      toast.error('Could not load placements. Backend may be offline.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (placement: Placement) => {
    if (!studentId) {
      toast.error('Please log in to apply');
      return;
    }
    if (myApplications.has(placement.id)) {
      toast.info('You have already applied to this placement');
      return;
    }

    try {
      setApplying(placement.id);
      await api.applyToPlacement(placement.id, studentId);

      // Optimistic update
      setMyApplications((prev) => new Set([...prev, placement.id]));
      toast.success(`Applied to ${placement.company || 'company'} successfully!`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to apply. Try again.');
    } finally {
      setApplying(null);
    }
  };

  const formatDeadline = (date?: string) => {
    if (!date) return 'Rolling';
    try {
      return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return date;
    }
  };

  return (
    <DashboardLayout role="student">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" />
              Campus Placements
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Full-time job opportunities posted by partner companies via your college.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadPlacements} className="gap-1.5 text-xs">
            Refresh
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="glass-card p-12 rounded-2xl border border-border/80 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading placement drives...</p>
          </div>
        )}

        {/* No placements */}
        {!loading && placements.length === 0 && (
          <div className="glass-card p-12 rounded-2xl border border-dashed border-border/80 text-center space-y-3">
            <Briefcase className="h-12 w-12 text-muted-foreground/40 mx-auto" />
            <h2 className="text-lg font-medium text-foreground">No Active Placements</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              There are currently no active placement drives posted for your college.
              Check back later or contact your placement cell.
            </p>
          </div>
        )}

        {/* Placement cards */}
        {!loading && placements.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {placements.map((placement) => {
              const applied = myApplications.has(placement.id);
              return (
                <div
                  key={placement.id}
                  className="glass-card p-6 rounded-2xl border border-border/80 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all"
                >
                  <div className="space-y-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-foreground text-base leading-snug">
                          {(placement as any).role || (placement as any).title || 'Software Engineer'}
                        </h3>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                          <Building className="h-3.5 w-3.5" />
                          {(placement as any).company || 'Company'}
                        </div>
                      </div>
                      {applied && (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] shrink-0">
                          <CheckCircle2 className="h-3 w-3 mr-0.5" /> Applied
                        </Badge>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {(placement as any).location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {(placement as any).location}
                        </span>
                      )}
                      {(placement as any).ctc && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">{(placement as any).ctc}</span>
                        </span>
                      )}
                      {(placement as any).deadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-400" />
                          Deadline: {formatDeadline((placement as any).deadline)}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {(placement as any).description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 bg-secondary/30 p-2.5 rounded-lg border border-border/40">
                        {(placement as any).description}
                      </p>
                    )}

                    {/* Skills */}
                    {Array.isArray((placement as any).skills) && (placement as any).skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(placement as any).skills.slice(0, 4).map((skill: string) => (
                          <span key={skill} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <div className="pt-4 border-t border-border/40">
                    <Button
                      className="w-full justify-between group text-xs"
                      disabled={applied || applying === placement.id}
                      onClick={() => handleApply(placement)}
                    >
                      <span>
                        {applied ? 'Application Submitted' : applying === placement.id ? 'Applying...' : 'Apply Now'}
                      </span>
                      {!applied && applying !== placement.id && (
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      )}
                      {(applied || applying === placement.id) && (
                        applied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
