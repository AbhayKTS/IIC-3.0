import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/mockApi';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Search, Users, Briefcase, Star, Code2, ShieldCheck,
  ExternalLink, UserCheck, ArrowRight, Filter
} from 'lucide-react';

interface StudentResult {
  userId: string;
  fullName: string | null;
  collegeId: string | null;
  totalScore: number;
  skills: string[];
  codingProfiles: Record<string, any>;
  leaderboardRank: number | null;
}

export default function RecruiterSearch() {
  const { session } = useAuth();
  const recruiterId = session?.userId || 'recruiter';

  const [skills, setSkills] = useState('');
  const [minScore, setMinScore] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [shortlisting, setShortlisting] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skills.trim() && !minScore && !collegeId.trim()) {
      toast.error('Please enter at least one filter (skills, college, or score)');
      return;
    }

    try {
      setLoading(true);
      setSearched(true);

      // Call the real backend /recruiter/search endpoint (role-gated)
      const params = new URLSearchParams();
      if (skills.trim()) params.set('skills', skills.trim());
      if (minScore) params.set('minScore', minScore);
      if (collegeId.trim()) params.set('collegeId', collegeId.trim());

      const res = await api.searchStudents(params).catch(() => null);
      if (res && Array.isArray((res as any).results)) {
        setResults((res as any).results);
      } else {
        // Fallback: fetch from compat students endpoint filtered by skills
        const students = await api.getVerifiedStudents().catch(() => []);
        const skillFilter = skills.trim().toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
        const filtered = students.filter((s: any) => {
          if (skillFilter.length === 0) return true;
          const sSkills = (s.skills || []).map((sk: string) => sk.toLowerCase());
          return skillFilter.every(skill => sSkills.some((sk: string) => sk.includes(skill)));
        });
        setResults(filtered.map((s: any) => ({
          userId: s.id,
          fullName: s.name || s.fullName || null,
          collegeId: s.collegeId || null,
          totalScore: (s.points?.coding || 0) + (s.points?.education || 0),
          skills: s.skills || [],
          codingProfiles: s.codingProfiles || {},
          leaderboardRank: null,
        })));
      }
    } catch (err: any) {
      toast.error(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleShortlist = async (student: StudentResult) => {
    try {
      setShortlisting(student.userId);
      await api.addToShortlist({
        recruiterId,
        studentId: student.userId,
        studentName: student.fullName || 'Unknown',
        notes: `Skills: ${student.skills.slice(0, 3).join(', ')}`,
        addedAt: new Date().toISOString(),
      });
      toast.success(`${student.fullName || 'Student'} added to your shortlist!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to shortlist candidate');
    } finally {
      setShortlisting(null);
    }
  };

  return (
    <DashboardLayout role="recruiter">
      <div className="container-main py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Search className="h-6 w-6 text-primary" /> AI Candidate Search
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Filter verified students by skill stack, college, and score. All results are SBT-verified.
            </p>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Verified Talent Only
          </Badge>
        </div>

        {/* Search Filters */}
        <form onSubmit={handleSearch} className="glass-card p-5 rounded-2xl border border-border/80 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Search Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Skills (comma-separated)</label>
              <Input
                placeholder="e.g. React, Solidity, Python"
                value={skills}
                onChange={e => setSkills(e.target.value)}
                className="h-9 text-xs bg-secondary/20 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Min. Total Score</label>
              <Input
                type="number"
                placeholder="e.g. 500"
                value={minScore}
                onChange={e => setMinScore(e.target.value)}
                className="h-9 text-xs bg-secondary/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">College ID (optional)</label>
              <Input
                placeholder="e.g. c_gla"
                value={collegeId}
                onChange={e => setCollegeId(e.target.value)}
                className="h-9 text-xs bg-secondary/20 font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading} className="gap-2 text-xs">
              <Search className="h-3.5 w-3.5" />
              {loading ? 'Searching...' : 'Search Candidates'}
            </Button>
          </div>
        </form>

        {/* Results */}
        {searched && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {results.length > 0 ? `${results.length} Verified Candidates Found` : 'No Candidates Found'}
              </h2>
            </div>

            {results.length === 0 ? (
              <div className="glass-card p-12 rounded-2xl border border-dashed border-border/80 text-center">
                <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="font-semibold text-foreground">No results match your filters</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Try broadening your skill search or removing the minimum score filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {results.map((student) => (
                  <div
                    key={student.userId}
                    className="glass-card p-5 rounded-2xl border border-border/80 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-foreground text-sm">
                            {student.fullName || 'Anonymous Student'}
                          </h3>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {student.collegeId || 'College not specified'}
                          </p>
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                          <ShieldCheck className="h-3 w-3 mr-0.5" /> Verified
                        </Badge>
                      </div>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1">
                        {(student.skills || []).slice(0, 4).map(skill => (
                          <span
                            key={skill}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono"
                          >
                            {skill}
                          </span>
                        ))}
                        {(student.skills || []).length > 4 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                            +{student.skills.length - 4} more
                          </span>
                        )}
                      </div>

                      {/* Coding profiles */}
                      {student.codingProfiles?.leetcode?.username && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Code2 className="h-3 w-3 text-amber-500" />
                          LeetCode: <span className="text-foreground font-mono">{student.codingProfiles.leetcode.username}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Star className="h-3 w-3 text-violet-400" />
                        Score: <span className="text-foreground font-bold font-mono">{student.totalScore || 0}</span>
                        {student.leaderboardRank && (
                          <span className="text-emerald-400 font-mono">· Rank #{student.leaderboardRank}</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/40 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleShortlist(student)}
                        disabled={shortlisting === student.userId}
                        className="flex-1 text-xs gap-1.5"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        {shortlisting === student.userId ? 'Adding...' : 'Shortlist'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
