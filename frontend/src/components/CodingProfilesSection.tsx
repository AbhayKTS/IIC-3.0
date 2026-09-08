import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Code2,
  ExternalLink,
  RefreshCw,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Terminal,
  Layers,
  ChevronRight,
  TrendingUp,
  Award,
  Zap,
} from 'lucide-react';
import type { CodingProfiles, LeetCodeStats, CodeforcesStats } from '@/lib/types';
import { api } from '@/lib/mockApi';
import { cleanHandle } from '@/lib/utils';

interface CodingProfilesSectionProps {
  initialData?: CodingProfiles | null;
  onUpdated?: (profiles: CodingProfiles) => void;
}

/**
 * Computes a human-readable relative time string.
 */
function getRelativeTimeString(isoString?: string | null): string {
  if (!isoString) return 'Never updated';
  const timestamp = Date.parse(isoString);
  if (Number.isNaN(timestamp)) return 'Never updated';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Returns rank color accents for Codeforces ranks.
 */
function getCodeforcesRankColor(rank?: string | null): { bg: string; text: string; border: string } {
  const r = (rank || '').toLowerCase();
  if (r.includes('legendary') || r.includes('tourist')) {
    return { bg: 'bg-red-500/15', text: 'text-red-500', border: 'border-red-500/40' };
  }
  if (r.includes('grandmaster') || r.includes('master')) {
    return { bg: 'bg-amber-500/15', text: 'text-amber-500', border: 'border-amber-500/40' };
  }
  if (r.includes('candidate')) {
    return { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/40' };
  }
  if (r.includes('expert')) {
    return { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/40' };
  }
  if (r.includes('specialist')) {
    return { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/40' };
  }
  if (r.includes('pupil')) {
    return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/40' };
  }
  return { bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/40' };
}

export default function CodingProfilesSection({
  initialData,
  onUpdated,
}: CodingProfilesSectionProps) {
  const [profiles, setProfiles] = useState<CodingProfiles | null>(initialData || null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leetcodeInput, setLeetcodeInput] = useState(initialData?.leetcode?.username || '');
  const [codeforcesInput, setCodeforcesInput] = useState(initialData?.codeforces?.handle || '');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Sync state if parent passes new initialData
  React.useEffect(() => {
    if (initialData) {
      setProfiles(initialData);
      if (initialData.leetcode?.username) setLeetcodeInput(initialData.leetcode.username);
      if (initialData.codeforces?.handle) setCodeforcesInput(initialData.codeforces.handle);
    }
  }, [initialData]);

  const handleSaveHandles = async () => {
    try {
      setSaving(true);
      const cleanLc = cleanHandle(leetcodeInput);
      const cleanCf = cleanHandle(codeforcesInput);

      setLeetcodeInput(cleanLc);
      setCodeforcesInput(cleanCf);

      const res = await api.updateCodingProfiles({
        leetcodeUsername: cleanLc || undefined,
        codeforcesHandle: cleanCf || undefined,
      });

      if (res?.codingProfiles) {
        setProfiles(res.codingProfiles);
        onUpdated?.(res.codingProfiles);
      }

      toast.success('Live coding profiles connected & verified from official servers!');
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update coding profiles');
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const res = await api.refreshCodingProfiles();
      if (res?.codingProfiles) {
        setProfiles(res.codingProfiles);
        onUpdated?.(res.codingProfiles);
      }
      toast.success('Live coding statistics refreshed!');
    } catch (err: any) {
      toast.error(err.message || 'Unable to refresh statistics right now');
    } finally {
      setRefreshing(false);
    }
  };

  const leetcode = profiles?.leetcode;
  const codeforces = profiles?.codeforces;
  const hasAnyProfile = Boolean(leetcode?.username || codeforces?.handle);

  const latestFetchedAt = leetcode?.fetchedAt || codeforces?.fetchedAt;

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-5 rounded-xl border border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Coding Profiles & Problem Solving Authority
                {hasAnyProfile && (
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                    LIVE SYNC
                  </Badge>
                )}
              </h2>
              <p className="text-xs text-muted-foreground">
                Verified LeetCode & Codeforces statistics for national leaderboard and candidate skill matching.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {latestFetchedAt && (
            <span className="text-[11px] text-muted-foreground mr-2 font-mono hidden md:inline-block">
              Synced {getRelativeTimeString(latestFetchedAt)}
            </span>
          )}

          {hasAnyProfile && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || saving}
              className="text-xs gap-1.5 font-mono"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="text-xs gap-1.5 font-mono"
          >
            <span>{hasAnyProfile ? 'Edit Handles' : 'Connect Handles'}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* INITIAL EMPTY STATE */}
      {!hasAnyProfile && (
        <div className="glass-card p-10 rounded-xl border border-dashed border-border text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <Terminal className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-semibold text-foreground">No coding profiles connected</h3>
            <p className="text-xs text-muted-foreground">
              Connect your public LeetCode and Codeforces profiles to showcase verified problem-solving stats, rating benchmarks, and unlock high-signal job matches.
            </p>
          </div>
          <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-2">
            Connect LeetCode & Codeforces
          </Button>
        </div>
      )}

      {/* STATS CARDS GRID */}
      {hasAnyProfile && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. LEETCODE CARD */}
          <div className="glass-card p-6 rounded-xl border border-border flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* LeetCode Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#FFA116]/10 border border-[#FFA116]/30 flex items-center justify-center text-[#FFA116] font-black text-sm">
                    LC
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                      LeetCode
                      {leetcode?.status === 'connected' && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      {leetcode?.username ? `@${leetcode.username}` : 'Not connected'}
                    </p>
                  </div>
                </div>

                {leetcode?.profileUrl && leetcode?.status === 'connected' && (
                  <a
                    href={leetcode.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono transition-colors"
                  >
                    <span>Profile</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Status / Error Banner */}
              {leetcode?.status === 'error' && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{leetcode.error || 'LeetCode profile unavailable or username not found.'}</span>
                </div>
              )}

              {leetcode?.status === 'connected' && (
                <>
                  {/* Big Solved Counter */}
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border/80 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block">
                        Total Solved
                      </span>
                      <span className="text-3xl font-extrabold text-foreground font-mono">
                        {leetcode.totalSolved}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-center px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-[10px] text-emerald-400 block font-mono">Easy</span>
                        <span className="font-bold text-sm text-emerald-400 font-mono">{leetcode.easy}</span>
                      </div>
                      <div className="text-center px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <span className="text-[10px] text-amber-400 block font-mono">Med</span>
                        <span className="font-bold text-sm text-amber-400 font-mono">{leetcode.medium}</span>
                      </div>
                      <div className="text-center px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                        <span className="text-[10px] text-rose-400 block font-mono">Hard</span>
                        <span className="font-bold text-sm text-rose-400 font-mono">{leetcode.hard}</span>
                      </div>
                    </div>
                  </div>

                  {/* Difficulty Distribution Bar */}
                  {leetcode.totalSolved > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                        <span>Difficulty Split</span>
                        <span>
                          {Math.round((leetcode.easy / leetcode.totalSolved) * 100)}% E /{' '}
                          {Math.round((leetcode.medium / leetcode.totalSolved) * 100)}% M /{' '}
                          {Math.round((leetcode.hard / leetcode.totalSolved) * 100)}% H
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden flex bg-secondary/80">
                        <div
                          style={{ width: `${(leetcode.easy / leetcode.totalSolved) * 100}%` }}
                          className="bg-emerald-500 h-full"
                          title={`Easy: ${leetcode.easy}`}
                        />
                        <div
                          style={{ width: `${(leetcode.medium / leetcode.totalSolved) * 100}%` }}
                          className="bg-amber-500 h-full"
                          title={`Medium: ${leetcode.medium}`}
                        />
                        <div
                          style={{ width: `${(leetcode.hard / leetcode.totalSolved) * 100}%` }}
                          className="bg-rose-500 h-full"
                          title={`Hard: ${leetcode.hard}`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Top Solved Topics */}
                  {leetcode.skills && Object.keys(leetcode.skills).length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-primary" /> Top Topic Competencies
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(leetcode.skills)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 8)
                          .map(([skillName, count]) => (
                            <span
                              key={skillName}
                              className="text-[11px] px-2.5 py-1 rounded-md bg-secondary/60 border border-border text-foreground font-mono flex items-center gap-1.5"
                            >
                              <span>{skillName}</span>
                              <span className="text-primary font-bold">{count}</span>
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Languages Used */}
                  {leetcode.languages && Object.keys(leetcode.languages).length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Terminal className="h-3.5 w-3.5 text-primary" /> Languages
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(leetcode.languages)
                          .sort(([, a], [, b]) => b - a)
                          .map(([langName, count]) => (
                            <span
                              key={langName}
                              className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono"
                            >
                              {langName}: {count}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {!leetcode?.username && (
                <div className="p-6 text-center border border-dashed border-border rounded-lg space-y-2">
                  <p className="text-xs text-muted-foreground">LeetCode handle not connected</p>
                  <Button size="sm" variant="outline" onClick={() => setIsModalOpen(true)}>
                    Connect LeetCode
                  </Button>
                </div>
              )}
            </div>

            {leetcode?.fetchedAt && (
              <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground font-mono flex justify-between">
                <span>Source: Public Profile API</span>
                <span>Updated: {getRelativeTimeString(leetcode.fetchedAt)}</span>
              </div>
            )}
          </div>

          {/* 2. CODEFORCES CARD */}
          <div className="glass-card p-6 rounded-xl border border-border flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Codeforces Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#318CE7]/10 border border-[#318CE7]/30 flex items-center justify-center text-[#318CE7] font-black text-sm">
                    CF
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                      Codeforces
                      {codeforces?.status === 'connected' && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      {codeforces?.handle ? `@${codeforces.handle}` : 'Not connected'}
                    </p>
                  </div>
                </div>

                {codeforces?.profileUrl && codeforces?.status === 'connected' && (
                  <a
                    href={codeforces.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono transition-colors"
                  >
                    <span>Profile</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Status / Error Banner */}
              {codeforces?.status === 'error' && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{codeforces.error || 'Codeforces handle not found or API temporarily unavailable.'}</span>
                </div>
              )}

              {codeforces?.status === 'connected' && (
                <>
                  {/* Rating & Rank Badges */}
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border/80 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block">
                        Rating / Max
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-foreground font-mono">
                          {codeforces.rating !== null ? codeforces.rating : 'Unrated'}
                        </span>
                        {codeforces.maxRating !== null && (
                          <span className="text-xs text-muted-foreground font-mono">
                            / {codeforces.maxRating} max
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      {codeforces.rank ? (
                        (() => {
                          const badgeStyle = getCodeforcesRankColor(codeforces.rank);
                          return (
                            <Badge
                              className={`${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border} border text-xs capitalize font-mono`}
                            >
                              {codeforces.rank}
                            </Badge>
                          );
                        })()
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground font-mono">
                          Unrated
                        </Badge>
                      )}
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {codeforces.totalSolved} solved
                      </div>
                    </div>
                  </div>

                  {/* Contests & Total Solved Stats Row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-secondary/20 border border-border/60 text-center">
                      <span className="text-[10px] text-muted-foreground font-mono block">Solved</span>
                      <span className="text-lg font-bold text-foreground font-mono">{codeforces.totalSolved}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/20 border border-border/60 text-center">
                      <span className="text-[10px] text-muted-foreground font-mono block">Contests</span>
                      <span className="text-lg font-bold text-foreground font-mono">
                        {codeforces.contests?.participated || 0}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/20 border border-border/60 text-center">
                      <span className="text-[10px] text-muted-foreground font-mono block">Rated</span>
                      <span className="text-lg font-bold text-foreground font-mono">
                        {codeforces.contests?.rated || 0}
                      </span>
                    </div>
                  </div>

                  {/* Rating Buckets Distribution */}
                  {codeforces.ratingBuckets && Object.values(codeforces.ratingBuckets).some((v) => v > 0) && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-primary" /> Problem Rating Distribution
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {Object.entries(codeforces.ratingBuckets).map(([bucket, count]) => (
                          <div
                            key={bucket}
                            className={`p-1.5 rounded text-center font-mono border ${
                              count > 0 ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-secondary/10 border-border/40 text-muted-foreground'
                            }`}
                          >
                            <span className="text-[9px] block text-muted-foreground">{bucket}</span>
                            <span className="text-xs font-bold">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Problem Classification Tags */}
                  {codeforces.tags && Object.keys(codeforces.tags).length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-primary" /> Tag Classification
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(codeforces.tags)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 8)
                          .map(([tag, count]) => (
                            <span
                              key={tag}
                              className="text-[11px] px-2.5 py-1 rounded-md bg-secondary/60 border border-border text-foreground font-mono flex items-center gap-1.5"
                            >
                              <span>{tag}</span>
                              <span className="text-primary font-bold">{count}</span>
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {!codeforces?.handle && (
                <div className="p-6 text-center border border-dashed border-border rounded-lg space-y-2">
                  <p className="text-xs text-muted-foreground">Codeforces handle not connected</p>
                  <Button size="sm" variant="outline" onClick={() => setIsModalOpen(true)}>
                    Connect Codeforces
                  </Button>
                </div>
              )}
            </div>

            {codeforces?.fetchedAt && (
              <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground font-mono flex justify-between">
                <span>Source: Official Codeforces API</span>
                <span>Updated: {getRelativeTimeString(codeforces.fetchedAt)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONNECT / EDIT HANDLES MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" /> Connect Coding Profiles
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your public usernames. We securely fetch your statistics directly from official public servers without requiring any passwords.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-foreground flex items-center justify-between">
                <span>LeetCode Username</span>
                <span className="text-muted-foreground text-[10px]">e.g. lee215, neal_wu (or full profile URL)</span>
              </label>
              <Input
                placeholder="Enter LeetCode username or URL"
                value={leetcodeInput}
                onChange={(e) => setLeetcodeInput(e.target.value)}
                className="font-mono text-xs"
                disabled={saving}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-foreground flex items-center justify-between">
                <span>Codeforces Handle</span>
                <span className="text-muted-foreground text-[10px]">e.g. tourist, Benq (or full profile URL)</span>
              </label>
              <Input
                placeholder="Enter Codeforces handle or URL"
                value={codeforcesInput}
                onChange={(e) => setCodeforcesInput(e.target.value)}
                className="font-mono text-xs"
                disabled={saving}
              />
            </div>

            <div className="p-3 rounded-lg bg-secondary/30 border border-border/80 text-[11px] text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5 text-foreground font-medium">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span>Verification Guarantee</span>
              </div>
              <p>
                Server-side deduplication ensures only accepted submissions are counted. Problem tags and rating buckets will automatically link to your AI Skill Graph.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveHandles}
              disabled={saving}
              className="gap-1.5 font-mono"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Fetching & Linking...</span>
                </>
              ) : (
                <span>Save & Sync</span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
