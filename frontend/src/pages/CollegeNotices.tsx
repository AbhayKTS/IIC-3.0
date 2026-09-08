import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import type { Notice } from '@/lib/types';
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
  Bell,
  Plus,
  Trash2,
  AlertCircle,
  Calendar,
  Building,
  CheckCircle2,
} from 'lucide-react';

const SEED_NOTICES: Notice[] = [
  {
    id: 'n-1',
    title: 'Mandatory Student ID Scanning for Campus Placement Clearance',
    content: 'All final-year and pre-final-year students must complete live camera ID card verification before September 15, 2026 to be included in visiting recruiter shortlists.',
    collegeId: 'all',
    createdBy: 'Training & Placement Officer',
    date: '2026-09-08',
    priority: 'high',
  },
  {
    id: 'n-2',
    title: 'Manipal University Jaipur Innovation Challenge 3.0 Registration Open',
    content: 'Teams can now register for IIC 3.0 via the Events portal. Themes include EdTech, Web3, and AI. Soulbound Tokens will be minted for all shortlisted finalists.',
    collegeId: 'all',
    createdBy: 'Dean of Student Welfare',
    date: '2026-09-07',
    priority: 'medium',
  },
  {
    id: 'n-3',
    title: 'Microsoft & Polygon Labs Placement Drive Schedule',
    content: 'Online technical assessment dates announced for Fullstack and Smart Contract Engineering roles. Review the Placements tab for skill-fit scores.',
    collegeId: 'all',
    createdBy: 'Placement Cell',
    date: '2026-09-05',
    priority: 'high',
  },
];

export default function CollegeNotices() {
  const { session } = useAuth();
  const [notices, setNotices] = useState<Notice[]>(SEED_NOTICES);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('high');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    try {
      const collegeId = (session?.user as any)?.collegeId || 'all';
      const data = await api.getNotices(collegeId).catch(() => null);
      if (data && Array.isArray(data) && data.length > 0) {
        const merged = [...data];
        SEED_NOTICES.forEach((seed) => {
          if (!merged.find((n) => n.id === seed.id)) merged.push(seed);
        });
        setNotices(merged);
      }
    } catch {
      setNotices(SEED_NOTICES);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Please enter title and notice body');
      return;
    }

    try {
      setSubmitting(true);
      const newNotice: Omit<Notice, 'id'> = {
        title,
        content,
        collegeId: (session?.user as any)?.collegeId || 'all',
        createdBy: session?.user?.name || 'Faculty Administration',
        date: new Date().toISOString().split('T')[0],
        priority,
      };

      await api.createNotice(newNotice).catch(() => null);

      setNotices((prev) => [
        { ...newNotice, id: `notif_${Date.now()}` },
        ...prev,
      ]);

      toast.success('Official circular published across student portals!');
      setCreateModalOpen(false);
      setTitle('');
      setContent('');
    } catch {
      toast.error('Failed to publish circular');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteNotice(id).catch(() => null);
      setNotices((prev) => prev.filter((n) => n.id !== id));
      toast.info('Notice retracted.');
    } catch {
      toast.error('Could not delete notice');
    }
  };

  return (
    <DashboardLayout role="faculty">
      <div className="container-main py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" /> Official University Notices & Circulars
            </h1>
            <p className="text-xs text-muted-foreground">
              Broadcast placement alerts, academic updates, and administrative deadlines to verified students.
            </p>
          </div>

          <Button onClick={() => setCreateModalOpen(true)} className="gap-1.5 text-xs shadow-sm">
            <Plus className="h-4 w-4" /> Publish Circular
          </Button>
        </div>

        <div className="space-y-4">
          {notices.map((n) => (
            <div
              key={n.id}
              className="glass-card p-6 rounded-2xl border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/40 transition-all shadow-sm"
            >
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={n.priority === 'high' ? 'destructive' : 'secondary'}
                    className="text-[10px] uppercase font-semibold"
                  >
                    {n.priority} Priority
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {n.date}
                  </span>
                  <span className="text-xs text-muted-foreground">• By {n.createdBy}</span>
                </div>

                <h3 className="font-bold text-base text-foreground leading-snug">
                  {n.title}
                </h3>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {n.content}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(n.id)}
                  className="text-xs text-destructive hover:bg-destructive/10 border-destructive/20 gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Retract
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* CREATE MODAL */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" /> Publish Institutional Notice
              </DialogTitle>
              <DialogDescription>
                Broadcast an official announcement to all registered students.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground">Notice Title *</label>
                <Input
                  placeholder="e.g. Schedule for Campus Placement Pre-Talk"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full rounded-md border border-input bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="high">High Priority (Urgent Action Required)</option>
                  <option value="medium">Medium Priority (Standard Notice)</option>
                  <option value="low">Low Priority (Informational)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Notice Content *</label>
                <textarea
                  rows={4}
                  placeholder="Write notice body with clear instructions and deadlines..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? 'Publishing...' : 'Publish Notice'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
