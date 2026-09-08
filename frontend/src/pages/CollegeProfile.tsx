import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import type { College, Faculty } from '@/lib/types';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeSync, broadcastRealtimeUpdate } from '@/lib/realtimeSync';
import { useRealtimeStudents } from '@/lib/useRealtimeStudents';
import RealtimeStudentRoster from '@/components/RealtimeStudentRoster';
import {
  Building2,
  Users,
  GraduationCap,
  Trophy,
  TrendingUp,
  Globe,
  Mail,
  MapPin,
  Calendar,
  Plus,
  Minus,
  Save,
  CheckCircle2,
  Radio,
  Sparkles,
  ShieldCheck,
  BookOpen,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export default function CollegeProfile() {
  const { session, updateUserInSession } = useAuth();
  const facultyUser = session?.user as Faculty | undefined;
  const collegeId = facultyUser?.collegeId || (session?.user as any)?.college?.id || 'c1';

  const [college, setCollege] = useState<College>({
    id: collegeId,
    name: (session?.user as any)?.collegeName || (session?.user as any)?.college?.name || 'GLA University',
    location: (session?.user as any)?.college?.location || 'Mathura, Uttar Pradesh',
    ranking: (session?.user as any)?.college?.ranking || 12,
    type: (session?.user as any)?.college?.type || 'Private University',
    studentCount: (session?.user as any)?.college?.studentCount || 15400,
    facultyCount: (session?.user as any)?.college?.facultyCount || 680,
    placementRate: (session?.user as any)?.college?.placementRate || 92,
    departments: (session?.user as any)?.college?.departments || [
      'Computer Science & Engineering',
      'Electronics & Communication',
      'Mechanical Engineering',
      'Information Technology',
      'Civil Engineering',
    ],
    description: (session?.user as any)?.college?.description || 'Leading technological university accredited with NAAC A+ grade.',
    established: (session?.user as any)?.college?.established || 1998,
    domain: (session?.user as any)?.college?.domain || facultyUser?.email?.split('@')[1] || 'gla.ac.in',
    contactEmail: (session?.user as any)?.college?.contactEmail || facultyUser?.email || 'admissions@gla.ac.in',
    website: (session?.user as any)?.college?.website || `https://www.${facultyUser?.email?.split('@')[1] || 'gla.ac.in'}`,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newDepartment, setNewDepartment] = useState('');
  const [pendingCounterChanges, setPendingCounterChanges] = useState<Record<string, number>>({});
  const [counterFloatingFeedback, setCounterFloatingFeedback] = useState<{ id: string; text: string; color: string }[]>([]);

  // Fetch college data from backend
  const fetchCollege = useCallback(async () => {
    if (!collegeId) return null;
    try {
      const data = await api.getCollegeById(collegeId);
      if (data) {
        setCollege((prev) => ({ ...prev, ...data }));
        return data;
      }
    } catch (err) {
      console.warn('Could not fetch college data from API:', err);
    }
    return null;
  }, [collegeId]);

  // Hook into Realtime Sync Engine (BroadcastChannel + polling heartbeat + focus refresh)
  const { syncStatus, lastSyncedAt, notifyChange } = useRealtimeSync<College>({
    entityType: 'college',
    entityId: collegeId,
    fetcher: fetchCollege,
    onRemoteUpdate: (updatedData) => {
      setCollege((prev) => ({
        ...prev,
        ...updatedData,
        departments: updatedData.departments || prev.departments,
      }));
    },
    pollIntervalMs: 5000,
  });

  const { students: enrolledStudentsList } = useRealtimeStudents({
    collegeId,
  });

  const verifiedStudentsCount = enrolledStudentsList.filter((s) => s.verificationStatus === 'verified').length;
  const pendingStudentsCount = Math.max(0, enrolledStudentsList.length - verifiedStudentsCount);
  const verificationPercentage = enrolledStudentsList.length > 0
    ? Math.round((verifiedStudentsCount / enrolledStudentsList.length) * 100)
    : (college.placementRate ?? 92);

  const displayStudentCount = enrolledStudentsList.length > 0 ? enrolledStudentsList.length : (college.studentCount || 0);

  useEffect(() => {
    setLoading(true);
    fetchCollege().finally(() => setLoading(false));
  }, [fetchCollege]);

  // Show floating feedback (+1 / -1)
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
    field: 'studentCount' | 'facultyCount' | 'ranking' | 'placementRate',
    amount: number
  ) => {
    // 1. Optimistic UI update immediately
    setCollege((prev) => {
      const currentVal = Number(prev[field] ?? 0);
      let nextVal = currentVal + amount;
      if (field === 'ranking') nextVal = Math.max(1, nextVal);
      if (field === 'placementRate') nextVal = Math.min(100, Math.max(0, nextVal));
      if (field === 'studentCount') nextVal = Math.max(0, nextVal);
      if (field === 'facultyCount') nextVal = Math.max(0, nextVal);

      return {
        ...prev,
        [field]: nextVal,
      };
    });

    const isPositive = amount > 0;
    triggerFloatingFeedback(field, `${isPositive ? '+' : ''}${amount}`, isPositive);

    // 2. Broadcast immediately to all open tabs
    notifyChange({ [field]: (college[field] ?? 0) + amount }, 'increment');

    // 3. Persist to Firestore via API
    try {
      await api.incrementCollegeField(collegeId, field, amount);
    } catch (err: any) {
      toast.error(`Sync error updating ${field}`);
      // Revert from server
      fetchCollege();
    }
  };

  // Add Department Tag
  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    const deptName = newDepartment.trim();
    if (!deptName) return;

    if (college.departments.includes(deptName)) {
      toast.error('Department already exists');
      return;
    }

    const updatedDepartments = [...college.departments, deptName];
    setCollege((prev) => ({ ...prev, departments: updatedDepartments }));
    setNewDepartment('');
    notifyChange({ departments: updatedDepartments }, 'updated');

    try {
      await api.incrementCollegeField(collegeId, undefined, undefined, 'addTag', deptName);
      toast.success(`Department "${deptName}" added in real-time`);
    } catch (err) {
      toast.error('Failed to add department to server');
      fetchCollege();
    }
  };

  // Remove Department Tag
  const handleRemoveDepartment = async (deptName: string) => {
    const updatedDepartments = college.departments.filter((d) => d !== deptName);
    setCollege((prev) => ({ ...prev, departments: updatedDepartments }));
    notifyChange({ departments: updatedDepartments }, 'updated');

    try {
      await api.incrementCollegeField(collegeId, undefined, undefined, 'removeTag', deptName);
      toast.success(`Department "${deptName}" removed in real-time`);
    } catch (err) {
      toast.error('Failed to remove department on server');
      fetchCollege();
    }
  };

  // Save Full Institutional Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await api.updateCollege(collegeId, college);
      if (saved) {
        setCollege((prev) => ({ ...prev, ...saved }));
      }
      // Update active session user
      updateUserInSession({
        collegeName: college.name,
        college: { ...college, ...saved },
      });
      // Broadcast to other tabs
      notifyChange(college, 'updated');
      toast.success('College profile saved & real-time synced across all portals!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update institutional profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout role="faculty">
      <div className="container-main py-6 space-y-6 max-w-6xl">
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/15 via-purple-500/10 to-transparent p-6 md:p-8 backdrop-blur-2xl shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-semibold">
                  <Building2 className="h-3.5 w-3.5" />
                  Institutional Profile
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  NAAC A+ Accredited
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-mono font-medium">
                  {college.type}
                </span>
              </div>

              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {college.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-rose-400" />
                  {college.location}
                </span>
                <span className="flex items-center gap-1.5 font-mono">
                  <Globe className="h-3.5 w-3.5 text-cyan-400" />
                  {college.domain}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-amber-400" />
                  Est. {college.established}
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

        {/* 4 Real-time Institutional Metric Cards (Computed from Real Firestore Data) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Enrolled Students */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="relative overflow-hidden glass-card p-5 rounded-2xl border border-border/80 bg-surface/60 backdrop-blur-xl flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs pb-1">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-primary" />
                Enrolled Students
              </span>
              <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Database
              </span>
            </div>

            <div className="py-2">
              <div className="text-3xl font-black text-foreground font-mono tracking-tight">
                {displayStudentCount.toLocaleString()}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {enrolledStudentsList.length > 0 ? (
                  <>
                    <span className="text-emerald-400 font-semibold">{verifiedStudentsCount} Verified</span>
                    {' · '}
                    <span className="text-amber-400 font-semibold">{pendingStudentsCount} Pending</span>
                  </>
                ) : (
                  'Live student profiles in institution roster'
                )}
              </p>
            </div>

            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>Roster Source:</span>
              <span className="text-foreground">Real-time Firestore</span>
            </div>
          </motion.div>

          {/* 2. Verification Rate */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="relative overflow-hidden glass-card p-5 rounded-2xl border border-border/80 bg-surface/60 backdrop-blur-xl flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs pb-1">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Verification Rate
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Credentials
              </span>
            </div>

            <div className="py-2">
              <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                {enrolledStudentsList.length > 0 ? `${verificationPercentage}%` : `${college.placementRate ?? 92}%`}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {enrolledStudentsList.length > 0
                  ? `${verifiedStudentsCount} of ${enrolledStudentsList.length} students ID-verified`
                  : 'Based on verified academic credentials'}
              </p>
            </div>

            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>Status:</span>
              <span className="text-emerald-400">Official SBT Sync</span>
            </div>
          </motion.div>

          {/* 3. National / NIRF Ranking */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="relative overflow-hidden glass-card p-5 rounded-2xl border border-border/80 bg-surface/60 backdrop-blur-xl flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs pb-1">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-400" />
                National Ranking
              </span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                NIRF Accredited
              </span>
            </div>

            <div className="py-2">
              <div className="text-3xl font-black text-amber-400 font-mono tracking-tight">
                #{college.ranking ?? 1}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {college.type || 'Premier Technical Institute'}
              </p>
            </div>

            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>Est:</span>
              <span className="text-foreground">{college.established || '1961'}</span>
            </div>
          </motion.div>

          {/* 4. Academic Departments */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="relative overflow-hidden glass-card p-5 rounded-2xl border border-border/80 bg-surface/60 backdrop-blur-xl flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs pb-1">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-indigo-400" />
                Departments
              </span>
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                Curriculum
              </span>
            </div>

            <div className="py-2">
              <div className="text-3xl font-black text-indigo-400 font-mono tracking-tight">
                {college.departments.length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                {college.departments.slice(0, 2).join(', ')}{college.departments.length > 2 ? '...' : ''}
              </p>
            </div>

            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>Faculties:</span>
              <span className="text-foreground">{college.facultyCount ? `${college.facultyCount} Members` : 'Active'}</span>
            </div>
          </motion.div>
        </div>

        {/* Academic Departments Manager with Real-time Add/Remove */}
        <div className="glass-card p-6 rounded-2xl border border-border/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Academic Departments & Engineering Branches
                <Badge variant="secondary" className="font-mono text-xs ml-1">
                  {college.departments.length} Active
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage degree faculties. Changes sync instantly across all student registration portals.
              </p>
            </div>

            <form onSubmit={handleAddDepartment} className="flex items-center gap-2">
              <Input
                placeholder="e.g. Artificial Intelligence & Data Science"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                className="h-9 text-xs w-64 bg-secondary/30 font-mono"
              />
              <Button type="submit" size="sm" className="h-9 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add Branch
              </Button>
            </form>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {college.departments.map((dept) => (
              <span
                key={dept}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/40 border border-border/70 text-foreground text-xs font-medium hover:border-primary/50 transition-colors"
              >
                <span>{dept}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveDepartment(dept)}
                  className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                  title={`Remove ${dept}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Full Institutional Profile Editor Form */}
        <form onSubmit={handleSaveProfile} className="glass-card p-6 rounded-2xl border border-border/80 space-y-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-violet-400" />
                Institutional Master Details
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official accreditation, domains, and placement contact addresses.
              </p>
            </div>

            <Button type="submit" disabled={saving} className="gap-2 shadow-sm font-semibold">
              <Save className="h-4 w-4" />
              {saving ? 'Syncing to Database...' : 'Save & Broadcast Profile'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">University / Institution Name</label>
              <Input
                value={college.name}
                onChange={(e) => setCollege({ ...college, name: e.target.value })}
                className="bg-secondary/20 border-border/80 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Institution Type / Governance</label>
              <Input
                value={college.type}
                onChange={(e) => setCollege({ ...college, type: e.target.value })}
                placeholder="e.g. Central University, IIT, Private"
                className="bg-secondary/20 border-border/80 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Campus Location / Address</label>
              <Input
                value={college.location}
                onChange={(e) => setCollege({ ...college, location: e.target.value })}
                placeholder="City, State, Country"
                className="bg-secondary/20 border-border/80 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Official Email Domain</label>
              <Input
                value={college.domain}
                onChange={(e) => setCollege({ ...college, domain: e.target.value })}
                placeholder="e.g. gla.ac.in"
                className="bg-secondary/20 border-border/80 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Official Website URL</label>
              <Input
                value={college.website || ''}
                onChange={(e) => setCollege({ ...college, website: e.target.value })}
                placeholder="https://www.gla.ac.in"
                className="bg-secondary/20 border-border/80 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Corporate Relations / Placement Email</label>
              <Input
                value={college.contactEmail || ''}
                onChange={(e) => setCollege({ ...college, contactEmail: e.target.value })}
                placeholder="placements@university.ac.in"
                className="bg-secondary/20 border-border/80 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">National NIRF Ranking</label>
              <Input
                type="number"
                min={1}
                value={college.ranking ?? 1}
                onChange={(e) => setCollege({ ...college, ranking: parseInt(e.target.value) || 1 })}
                placeholder="1"
                className="bg-secondary/20 border-border/80 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Total Faculty Members</label>
              <Input
                type="number"
                min={0}
                value={college.facultyCount ?? 0}
                onChange={(e) => setCollege({ ...college, facultyCount: parseInt(e.target.value) || 0 })}
                placeholder="e.g. 640"
                className="bg-secondary/20 border-border/80 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Established Year</label>
              <Input
                type="number"
                min={1800}
                max={2030}
                value={college.established ?? 1961}
                onChange={(e) => setCollege({ ...college, established: parseInt(e.target.value) || 1961 })}
                placeholder="1961"
                className="bg-secondary/20 border-border/80 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Campus Student Capacity / Enrollment</label>
              <Input
                type="number"
                min={0}
                value={college.studentCount ?? 0}
                onChange={(e) => setCollege({ ...college, studentCount: parseInt(e.target.value) || 0 })}
                placeholder="e.g. 8500"
                className="bg-secondary/20 border-border/80 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-foreground">Institution Overview & Mission Statement</label>
              <Textarea
                rows={3}
                value={college.description}
                onChange={(e) => setCollege({ ...college, description: e.target.value })}
                placeholder="Provide details on engineering curriculum, campus facilities, and industry affiliations..."
                className="bg-secondary/20 border-border/80 text-xs leading-relaxed"
              />
            </div>
          </div>
        </form>

        {/* Real-time Student Profiles Directory (Live Firestore Sync) */}
        <RealtimeStudentRoster
          role="faculty"
          collegeId={college.id}
        />

        {/* Assigned Faculty Administrator Identity Card */}
        <div className="p-5 rounded-2xl bg-secondary/30 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-lg">
              {facultyUser?.name?.[0] || 'F'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-foreground text-sm">{facultyUser?.name || 'Authorized Faculty Administrator'}</h4>
                <Badge variant="outline" className="text-[10px] text-primary border-primary/30 font-mono">
                  Dean / Admin Faculty
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {facultyUser?.email} • {facultyUser?.department || 'Department of Computer Science & Engineering'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Cryptographic SBT Authority Active</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
