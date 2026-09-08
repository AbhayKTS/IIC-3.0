import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import type { Event } from '@/lib/types';
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
  Calendar,
  Plus,
  Users,
  Trash2,
  Trophy,
  Sparkles,
} from 'lucide-react';

const SEED_COLLEGE_EVENTS: Event[] = [
  {
    id: 'evt-iic3',
    title: 'International Innovation Challenge 3.0 (IIC 3.0)',
    collegeId: 'all',
    type: 'Flagship Hackathon',
    date: '2026-09-15 to 2026-09-17',
    description: 'Manipal University Jaipur flagship national challenge on EdTech, Web3, and AI. Problem statement: Portal for Academia-industry collaboration for skill mapping, internships and placement.',
    tags: ['EdTech', 'Web3', 'AI', 'Polygon', 'MUJ'],
    applicants: ['s1', 's2', 's3', 's4'],
  },
  {
    id: 'evt-ai-summit',
    title: 'National AI & Blockchain Innovation Summit',
    collegeId: 'all',
    type: 'Research Symposium',
    date: '2026-10-12',
    description: 'Keynote presentations by visiting researchers and student poster showcases on Soulbound Token credential verification.',
    tags: ['Research', 'SBTs', 'Keynotes'],
    applicants: ['s1', 's5'],
  },
];

export default function CollegeEvents() {
  const { session } = useAuth();
  const [events, setEvents] = useState<Event[]>(SEED_COLLEGE_EVENTS);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Hackathon');
  const [date, setDate] = useState('');
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState('Hackathon, AI, Web3');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await api.getEvents().catch(() => null);
      if (data && Array.isArray(data) && data.length > 0) {
        const merged = [...data];
        SEED_COLLEGE_EVENTS.forEach((seed) => {
          if (!merged.find((e) => e.id === seed.id)) merged.push(seed);
        });
        setEvents(merged);
      }
    } catch {
      setEvents(SEED_COLLEGE_EVENTS);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !desc.trim()) {
      toast.error('Please enter event title and description');
      return;
    }

    try {
      setSubmitting(true);
      const newEvt: Omit<Event, 'id' | 'applicants'> = {
        title,
        type,
        collegeId: (session?.user as any)?.collegeId || 'all',
        date: date || 'October 2026',
        description: desc,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      };

      await api.createEvent(newEvt).catch(() => null);

      setEvents((prev) => [
        {
          ...newEvt,
          id: `evt_${Date.now()}`,
          applicants: [],
        },
        ...prev,
      ]);

      toast.success('Campus event created & published!');
      setCreateOpen(false);
      setTitle('');
      setDesc('');
    } catch {
      toast.error('Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteEvent(id).catch(() => null);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      toast.info('Event archived.');
    } catch {
      toast.error('Could not delete event');
    }
  };

  return (
    <DashboardLayout role="faculty">
      <div className="container-main py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" /> Institutional Hackathons & Events Management
            </h1>
            <p className="text-xs text-muted-foreground">
              Create, curate, and supervise campus hackathons, technical conferences, and student project competitions.
            </p>
          </div>

          <Button onClick={() => setCreateOpen(true)} className="gap-1.5 text-xs shadow-sm">
            <Plus className="h-4 w-4" /> Host New Event
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="glass-card p-6 rounded-2xl border border-border/80 flex flex-col justify-between space-y-4 shadow-sm group hover:border-primary/40 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    {evt.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{evt.date}</span>
                </div>

                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                  {evt.title}
                </h3>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {evt.description}
                </p>

                <div className="flex flex-wrap gap-1 pt-1">
                  {evt.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-secondary/60 text-muted-foreground text-[10px]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-primary" /> {evt.applicants.length} Registered Teams
                </span>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(evt.id)}
                  className="text-xs text-destructive hover:bg-destructive/10 border-destructive/20 gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Archive
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* CREATE MODAL */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" /> Host New Campus Event
              </DialogTitle>
              <DialogDescription>
                Publish a university competition, hackathon, or symposium.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground">Event Title *</label>
                <Input
                  placeholder="e.g. Annual Campus Web3 Hackathon"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Event Type</label>
                  <Input
                    placeholder="Hackathon / Workshop"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Date / Duration</label>
                  <Input
                    placeholder="e.g. Oct 14–16, 2026"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Tags (comma-separated)</label>
                <Input
                  placeholder="AI, Web3, Hackathon"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Description *</label>
                <textarea
                  rows={3}
                  placeholder="Problem statements, eligibility, and prize pool..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? 'Creating...' : 'Publish Event'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
