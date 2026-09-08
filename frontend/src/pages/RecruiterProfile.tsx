import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import type { Recruiter } from '@/lib/types';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeSync } from '@/lib/realtimeSync';
import RealtimeStudentRoster from '@/components/RealtimeStudentRoster';
import {
  Briefcase,
  Users,
  Target,
  Zap,
  CheckCircle2,
  Trophy,
  Globe,
  Mail,
  MapPin,
  Phone,
  Plus,
  Minus,
  Save,
  ShieldCheck,
  Building,
  X,
  Code2,
  ExternalLink,
} from 'lucide-react';

export default function RecruiterProfile() {
  const { session, updateUserInSession } = useAuth();
  const recruiterUser = session?.user as Recruiter | undefined;
  const recruiterId = session?.userId || recruiterUser?.id || 'r1';

  const [recruiter, setRecruiter] = useState<Recruiter>({
    id: recruiterId,
    name: recruiterUser?.name || session?.user?.email?.split('@')[0] || 'Vikram Mehta',
    email: session?.user?.email || 'vikram@techcorp.com',
    company: (session?.user as any)?.company || 'Polygon Labs / TechCorp',
    position: (session?.user as any)?.position || 'Head of Engineering Talent',
    companyDescription:
      (session?.user as any)?.companyDescription ||
      'Leading decentralized engineering guild and web3 development platform hiring elite engineering talent directly on-chain.',
    location: (session?.user as any)?.location || 'Bengaluru, India / Remote',
    website: (session?.user as any)?.website || 'https://polygon.technology',
    phone: (session?.user as any)?.phone || '+91 98765 43210',
    openPositions: (session?.user as any)?.openPositions ?? 4,
    shortlistedCount: (session?.user as any)?.shortlistedCount ?? 14,
    hiredCount: (session?.user as any)?.hiredCount ?? 6,
    activeGigsCount: (session?.user as any)?.activeGigsCount ?? 3,
    targetSkills: (session?.user as any)?.targetSkills || [
      'React',
      'TypeScript',
      'Node.js',
      'Python',
      'Solidity',
      'GraphQL',
    ],
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [counterFloatingFeedback, setCounterFloatingFeedback] = useState<{ id: string; text: string; color: string }[]>([]);

  // Fetch recruiter data from backend
  const fetchRecruiter = useCallback(async () => {
    if (!recruiterId) return null;
    try {
      const data = await api.getRecruiterById(recruiterId);
      if (data) {
        setRecruiter((prev) => ({ ...prev, ...data }));
        return data;
      }
    } catch (err) {
      console.warn('Could not fetch recruiter data from API:', err);
    }
    return null;
  }, [recruiterId]);

  // Hook into Realtime Sync Engine (BroadcastChannel + polling heartbeat + focus refresh)
  const { syncStatus, lastSyncedAt, notifyChange } = useRealtimeSync<Recruiter>({
    entityType: 'recruiter',
    entityId: recruiterId,
    fetcher: fetchRecruiter,
    onRemoteUpdate: (updatedData) => {
      setRecruiter((prev) => ({
        ...prev,
        ...updatedData,
        targetSkills: updatedData.targetSkills || prev.targetSkills,
      }));
    },
    pollIntervalMs: 5000,
  });

  useEffect(() => {
    setLoading(true);
    fetchRecruiter().finally(() => setLoading(false));
  }, [fetchRecruiter]);

  // Floating feedback (+1 / -1)
  const triggerFloatingFeedback = (field: string, text: string, isPositive: boolean) => {
    const id = `${field}_${Date.now()}_${Math.random()}`;
    const item = { id, text, color: isPositive ? 'text-emerald-400' : 'text-rose-400' };
    setCounterFloatingFeedback((prev) => [...prev, item]);
    setTimeout(() => {
      setCounterFloatingFeedback((prev) => prev.filter((x) => x.id !== id));
    }, 1500);
  };

  // Atomic Increment / Decrement Handler
  const handleCounterChange = async (
    field: 'openPositions' | 'shortlistedCount' | 'hiredCount' | 'activeGigsCount',
    amount: number
  ) => {
    // 1. Optimistic UI update immediately
    setRecruiter((prev) => {
      const currentVal = Number(prev[field] ?? 0);
      const nextVal = Math.max(0, currentVal + amount);
      return {
        ...prev,
        [field]: nextVal,
      };
    });

    const isPositive = amount > 0;
    triggerFloatingFeedback(field, `${isPositive ? '+' : ''}${amount}`, isPositive);

    // 2. Broadcast immediately to all open tabs
    notifyChange({ [field]: Math.max(0, (recruiter[field] ?? 0) + amount) }, 'increment');

    // 3. Persist to Firestore via API
    try {
      await api.incrementRecruiterField(recruiterId, field, amount);
    } catch (err: any) {
      toast.error(`Sync error updating ${field}`);
      fetchRecruiter();
    }
  };

  // Add Target Skill Tag
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    const skillName = newSkill.trim();
    if (!skillName) return;

    if (recruiter.targetSkills?.includes(skillName)) {
      toast.error('Skill already exists in target stack');
      return;
    }

    const updatedSkills = [...(recruiter.targetSkills || []), skillName];
    setRecruiter((prev) => ({ ...prev, targetSkills: updatedSkills }));
    setNewSkill('');
    notifyChange({ targetSkills: updatedSkills }, 'updated');

    try {
      await api.incrementRecruiterField(recruiterId, undefined, undefined, 'addTag', skillName);
      toast.success(`Skill "${skillName}" added to target hiring stack`);
    } catch (err) {
      toast.error('Failed to add skill tag on server');
      fetchRecruiter();
    }
  };

  // Remove Target Skill Tag
  const handleRemoveSkill = async (skillName: string) => {
    const updatedSkills = (recruiter.targetSkills || []).filter((s) => s !== skillName);
    setRecruiter((prev) => ({ ...prev, targetSkills: updatedSkills }));
    notifyChange({ targetSkills: updatedSkills }, 'updated');

    try {
      await api.incrementRecruiterField(recruiterId, undefined, undefined, 'removeTag', skillName);
      toast.success(`Skill "${skillName}" removed`);
    } catch (err) {
      toast.error('Failed to remove skill on server');
      fetchRecruiter();
    }
  };

  // Save Full Recruiter Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await api.updateRecruiter(recruiterId, recruiter);
      if (saved) {
        setRecruiter((prev) => ({ ...prev, ...saved }));
      }
      // Sync in active session user so header & dashboards match everywhere
      updateUserInSession({
        name: recruiter.name,
        company: recruiter.company,
        position: recruiter.position,
        ...saved,
      });
      // Broadcast to other open tabs
      notifyChange(recruiter, 'updated');
      toast.success('Recruiter & corporate profile saved & synced across all portals!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update recruiter profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout role="recruiter">
      <div className="container-main py-6 space-y-6 max-w-6xl">
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-cyan/20 bg-gradient-to-r from-cyan/15 via-indigo-500/10 to-transparent p-6 md:p-8 backdrop-blur-2xl shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan/20 text-cyan border border-cyan/30 text-xs font-semibold">
                  <Briefcase className="h-3.5 w-3.5" />
                  Corporate Talent Portal
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified Hiring Partner
                </span>
              </div>

              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {recruiter.company}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  {recruiter.name} ({recruiter.position})
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-rose-400" />
                  {recruiter.location}
                </span>
                <span className="flex items-center gap-1.5 font-mono">
                  <Mail className="h-3.5 w-3.5 text-cyan-400" />
                  {recruiter.email}
                </span>
              </div>
            </div>

            {/* Live Real-time Status Badge */}
            <div className="flex flex-col items-start md:items-end gap-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>REAL-TIME SYNC ACTIVE</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                Last broadcast: {lastSyncedAt.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* 4 Interactive Real-time Counter Cards with Increment & Decrement */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Open Job Positions */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="relative overflow-hidden glass-card p-5 rounded-2xl border border-border/80 bg-surface/60 backdrop-blur-xl flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs pb-1">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-cyan" />
                Open Roles
              </span>
              <span className="text-[10px] font-mono text-cyan bg-cyan/10 px-1.5 py-0.5 rounded">
                Active Hiring
              </span>
            </div>

            <div className="py-2 flex items-baseline justify-between">
              <div className="text-3xl font-black text-foreground font-mono tracking-tight">
                {recruiter.openPositions ?? 0}
              </div>
              <AnimatePresence>
                {counterFloatingFeedback
                  .filter((f) => f.id.startsWith('openPositions'))
                  .map((f) => (
                    <motion.span
                      key={f.id}
                      initial={{ opacity: 0, y: 0, scale: 0.8 }}
                      animate={{ opacity: 1, y: -18, scale: 1.2 }}
                      exit={{ opacity: 0 }}
                      className={`text-sm font-bold font-mono ${f.color}`}
                    >
                      {f.text}
                    </motion.span>
                  ))}
              </AnimatePresence>
            </div>

            <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-1.5">
              <span className="text-[11px] text-muted-foreground">Adjust:</span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCounterChange('openPositions', -1)}
                  className="h-7 w-8 p-0 text-xs font-mono hover:border-rose-500 hover:text-rose-400"
                  title="Decrement 1 role"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCounterChange('openPositions', 1)}
                  className="h-7 w-8 p-0 text-xs font-mono hover:border-emerald-500 hover:text-emerald-400"
                  title="Increment 1 role"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCounterChange('openPositions', 5)}
                  className="h-7 px-2 text-xs font-mono hover:border-emerald-500 hover:text-emerald-400"
                  title="Increment 5 roles"
                >
                  +5
                </Button>
              </div>
            </div>
          </motion.div>

          {/* 2. Shortlisted Candidates */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="relative overflow-hidden glass-card p-5 rounded-2xl border border-border/80 bg-surface/60 backdrop-blur-xl flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs pb-1">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <Target className="h-4 w-4 text-primary" />
                Shortlist Target
              </span>
              <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                Pipeline
              </span>
            </div>

            <div className="py-2 flex items-baseline justify-between">
              <div className="text-3xl font-black text-foreground font-mono tracking-tight">
                {recruiter.shortlistedCount ?? 0}
              </div>
              <AnimatePresence>
                {counterFloatingFeedback
                  .filter((f) => f.id.startsWith('shortlistedCount'))
                  .map((f) => (
                    <motion.span
                      key={f.id}
                      initial={{ opacity: 0, y: 0, scale: 0.8 }}
                      animate={{ opacity: 1, y: -18, scale: 1.2 }}
                      exit={{ opacity: 0 }}
                      className={`text-sm font-bold font-mono ${f.color}`}
                    >
                      {f.text}
                    </motion.span>
                  ))}
              </AnimatePresence>
            </div>

            <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-1.5">
              <span className="text-[11px] text-muted-foreground">Adjust:</span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCounterChange('shortlistedCount', -1)}
                  className="h-7 w-8 p-0 text-xs font-mono hover:border-rose-500 hover:text-rose-400"
                  title="Decrement 1"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCounterChange('shortlistedCount', 1)}
                  className="h-7 w-8 p-0 text-xs font-mono hover:border-emerald-500 hover:text-emerald-400"
                  title="Increment 1"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCounterChange('shortlistedCount', 5)}
                  className="h-7 px-2 text-xs font-mono hover:border-emerald-500 hover:text-emerald-400"
                  title="Increment 5"
                >
                  +5
                </Button>
              </div>
            </div>
          </motion.div>

          {/* 3. Successful Hires */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="relative overflow-hidden glass-card p-5 rounded-2xl border border-border/80 bg-surface/60 backdrop-blur-xl flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs pb-1">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Hires Completed
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Verified Offers
              </span>
            </div>

            <div className="py-2 flex items-baseline justify-between">
              <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                {recruiter.hiredCount ?? 0}
              </div>
              <AnimatePresence>
                {counterFloatingFeedback
                  .filter((f) => f.id.startsWith('hiredCount'))
                  .map((f) => (
                    <motion.span
                      key={f.id}
                      initial={{ opacity: 0, y: 0, scale: 0.8 }}
                      animate={{ opacity: 1, y: -18, scale: 1.2 }}
                      exit={{ opacity: 0 }}
                      className={`text-sm font-bold font-mono ${f.color}`}
                    >
                      {f.text}
                    </motion.span>
                  ))}
              </AnimatePresence>
            </div>

            <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-1.5">
              <span className="text-[11px] text-muted-foreground">Adjust:</span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCounterChange('hiredCount', -1)}
                  className="h-7 w-8 p-0 text-xs font-mono hover:border-rose-500 hover:text-rose-400"
                  title="Decrement 1"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCounterChange('hiredCount', 1)}
                  className="h-7 w-8 p-0 text-xs font-mono hover:border-emerald-500 hover:text-emerald-400"
                  title="Increment 1"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCounterChange('hiredCount', 5)}
                  className="h-7 px-2 text-xs font-mono hover:border-emerald-500 hover:text-emerald-400"
                  title="Increment 5"
                >
                  +5
                </Button>
              </div>
            </div>
          </motion.div>

          {/* 4. Active Micro-Gigs Running */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="relative overflow-hidden glass-card p-5 rounded-2xl border border-border/80 bg-surface/60 backdrop-blur-xl flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs pb-1">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-400" />
                Active Micro-Gigs
              </span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                Bounties
              </span>
            </div>

            <div className="py-2 flex items-baseline justify-between">
              <div className="text-3xl font-black text-amber-400 font-mono tracking-tight">
                {recruiter.activeGigsCount ?? 0}
              </div>
              <AnimatePresence>
                {counterFloatingFeedback
                  .filter((f) => f.id.startsWith('activeGigsCount'))
                  .map((f) => (
                    <motion.span
                      key={f.id}
                      initial={{ opacity: 0, y: 0, scale: 0.8 }}
                      animate={{ opacity: 1, y: -18, scale: 1.2 }}
                      exit={{ opacity: 0 }}
                      className={`text-sm font-bold font-mono ${f.color}`}
                    >
                      {f.text}
                    </motion.span>
                  ))}
              </AnimatePresence>
            </div>

            <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-1.5">
              <span className="text-[11px] text-muted-foreground">Adjust:</span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCounterChange('activeGigsCount', -1)}
                  className="h-7 w-8 p-0 text-xs font-mono hover:border-rose-500 hover:text-rose-400"
                  title="Decrement 1 gig"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCounterChange('activeGigsCount', 1)}
                  className="h-7 w-8 p-0 text-xs font-mono hover:border-emerald-500 hover:text-emerald-400"
                  title="Increment 1 gig"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Target Tech Stack & Skills Manager */}
        <div className="glass-card p-6 rounded-2xl border border-border/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Code2 className="h-4 w-4 text-cyan" />
                Target Hiring Tech Stack & Skills
                <Badge variant="secondary" className="font-mono text-xs ml-1">
                  {recruiter.targetSkills?.length || 0} Target Skills
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Define the skills you look for. Powers automated candidate matching against Polygon Soulbound Tokens (SBTs).
              </p>
            </div>

            <form onSubmit={handleAddSkill} className="flex items-center gap-2">
              <Input
                placeholder="e.g. Next.js, Rust, Solidity"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                className="h-9 text-xs w-64 bg-secondary/30 font-mono"
              />
              <Button type="submit" size="sm" className="h-9 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add Skill Tag
              </Button>
            </form>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {recruiter.targetSkills?.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/40 border border-border/70 text-foreground text-xs font-medium hover:border-cyan/50 transition-colors"
              >
                <span className="text-cyan font-mono font-bold">#</span>
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                  title={`Remove ${skill}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Recruiter & Corporate Details Form */}
        <form onSubmit={handleSaveProfile} className="glass-card p-6 rounded-2xl border border-border/80 space-y-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building className="h-4 w-4 text-cyan" />
                Corporate & Recruiter Profile Details
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official hiring organization profile shown to candidate applicants and university placement cells.
              </p>
            </div>

            <Button type="submit" disabled={saving} className="gap-2 shadow-sm font-semibold">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save & Sync Recruiter Profile'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Recruiter Full Name</label>
              <Input
                value={recruiter.name}
                onChange={(e) => setRecruiter({ ...recruiter, name: e.target.value })}
                className="bg-secondary/20 border-border/80 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Title / Designation</label>
              <Input
                value={recruiter.position}
                onChange={(e) => setRecruiter({ ...recruiter, position: e.target.value })}
                placeholder="e.g. Talent Acquisition Lead"
                className="bg-secondary/20 border-border/80 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Hiring Company Name</label>
              <Input
                value={recruiter.company}
                onChange={(e) => setRecruiter({ ...recruiter, company: e.target.value })}
                placeholder="e.g. Polygon Labs"
                className="bg-secondary/20 border-border/80 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">HQ / Office Location</label>
              <Input
                value={recruiter.location || ''}
                onChange={(e) => setRecruiter({ ...recruiter, location: e.target.value })}
                placeholder="e.g. Bengaluru, India / Remote"
                className="bg-secondary/20 border-border/80 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Company Website URL</label>
              <Input
                value={recruiter.website || ''}
                onChange={(e) => setRecruiter({ ...recruiter, website: e.target.value })}
                placeholder="https://company.com"
                className="bg-secondary/20 border-border/80 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Contact Phone / WhatsApp</label>
              <Input
                value={recruiter.phone || ''}
                onChange={(e) => setRecruiter({ ...recruiter, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="bg-secondary/20 border-border/80 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-foreground">Company Overview & Engineering Culture</label>
              <Textarea
                rows={3}
                value={recruiter.companyDescription || ''}
                onChange={(e) => setRecruiter({ ...recruiter, companyDescription: e.target.value })}
                placeholder="Describe your engineering team, tech stacks, perks, and remote work culture..."
                className="bg-secondary/20 border-border/80 text-xs leading-relaxed"
              />
            </div>
          </div>
        </form>

        {/* Real-time Student Candidates Roster (Live Firestore Sync) */}
        <RealtimeStudentRoster
          role="recruiter"
          targetSkills={recruiter.targetSkills}
          onShortlistCandidate={() => {
            handleCounterChange('shortlistedCount', 1);
          }}
        />

        {/* Proof-of-Work Guarantee */}
        <div className="p-5 rounded-2xl bg-secondary/30 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-cyan/10 border border-cyan/30 flex items-center justify-center text-cyan font-bold text-lg">
              {recruiter.company?.[0] || 'R'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-foreground text-sm">{recruiter.company} Verified Employer Node</h4>
                <Badge variant="outline" className="text-[10px] text-cyan border-cyan/30 font-mono">
                  Polygon SBT Verified
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                All candidates sourced through AlmaDox are cryptographically anchored to institution OCR verification.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>0% Fake Credential Rate</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
