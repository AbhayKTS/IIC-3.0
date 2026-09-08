import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import type { Event, Team } from '@/lib/types';
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
  Users,
  MapPin,
  Clock,
  Sparkles,
  Trophy,
  Plus,
  ArrowRight,
  CheckCircle2,
  Share2,
  Tag,
  Search,
} from 'lucide-react';

const SEED_EVENTS: Event[] = [
  {
    id: 'evt-iic3',
    title: 'International Innovation Challenge 3.0 (IIC 3.0)',
    collegeId: 'c_muj',
    type: 'Hackathon & Innovation Summit',
    date: '2026-09-15 to 2026-09-17',
    description: 'Manipal University Jaipur flagship national challenge on EdTech, Web3, and AI. Solve the academia-industry skill mapping and verification problem with AlmaDox.',
    tags: ['EdTech', 'Web3', 'AI', 'Polygon', 'Manipal University Jaipur'],
    applicants: ['s1', 's2', 's3'],
  },
  {
    id: 'evt-smart-india',
    title: 'Smart India Hackathon (Internal Institutional Round)',
    collegeId: 'c_gla',
    type: 'National Hackathon',
    date: '2026-09-28',
    description: 'Internal hackathon round to shortlist top 15 teams representing the university in national hardware & software problem statements.',
    tags: ['Govt of India', 'Software', 'Hardware', 'National'],
    applicants: ['s1', 's4'],
  },
  {
    id: 'evt-eth-india',
    title: 'ETHIndia Campus Builder Fellowship',
    collegeId: 'all',
    type: 'Web3 Builder Camp',
    date: '2026-10-05',
    description: 'Hands-on Web3 workshop on ERC-4337 Account Abstraction and ERC-5192 Soulbound Tokens on Polygon. Grants up to $5,000 available.',
    tags: ['Ethereum', 'Polygon', 'ERC-4337', 'DeFi'],
    applicants: ['s2', 's5'],
  },
];

export default function StudentEvents() {
  const { session } = useAuth();
  const studentId = session?.userId || 'student';

  const [events, setEvents] = useState<Event[]>(SEED_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [search, setSearch] = useState('');
  const [registeredEvents, setRegisteredEvents] = useState<Set<string>>(new Set(['evt-iic3']));

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await api.getEvents().catch(() => null);
      if (data && Array.isArray(data) && data.length > 0) {
        const merged = [...data];
        SEED_EVENTS.forEach((seed) => {
          if (!merged.find((e) => e.id === seed.id)) merged.push(seed);
        });
        setEvents(merged);
      }
    } catch {
      setEvents(SEED_EVENTS);
    }
  };

  const handleRegister = async () => {
    if (!selectedEvent) return;
    try {
      await api.applyToEvent(selectedEvent.id, studentId).catch(() => null);
      setRegisteredEvents((prev) => new Set([...prev, selectedEvent.id]));
      toast.success(`Successfully registered for ${selectedEvent.title}!`);
      setRegisterModalOpen(false);
    } catch {
      toast.error('Registration failed. Please try again.');
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !selectedEvent) {
      toast.error('Please enter a team name');
      return;
    }

    try {
      await api.createTeam({
        eventId: selectedEvent.id,
        name: teamName,
        members: [studentId],
        openSlots: 3,
        createdBy: studentId,
      }).catch(() => null);

      toast.success(`Team "${teamName}" created! Share invite link with teammates.`);
      setTeamModalOpen(false);
      setTeamName('');
    } catch {
      toast.error('Could not create team.');
    }
  };

  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    e.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout role="student">
      <div className="container-main py-6 space-y-6">
        {/* Flagship Event Banner (Manipal University Jaipur IIC 3.0) */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-purple-900/40 via-background to-card p-6 md:p-10 backdrop-blur-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/20 text-primary border-primary/40 text-xs py-1 px-3 gap-1.5">
                  <Trophy className="h-3.5 w-3.5" /> FLAGSHIP INNOVATION CHALLENGE
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Theme: EdTech
                </Badge>
              </div>

              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                International Innovation Challenge 3.0
              </h1>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Manipal University Jaipur (MUJ) presents IIC 3.0: "Portal for Academia-industry collaboration for skill mapping, internships and placement" — Team Deathly Hallows.
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <Calendar className="h-4 w-4 text-primary" /> September 15–17, 2026
                </span>
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <MapPin className="h-4 w-4 text-primary" /> Manipal University Jaipur / Hybrid
                </span>
                <span className="flex items-center gap-1.5 font-medium text-emerald-500">
                  <Sparkles className="h-4 w-4" /> SBT Minting & Crypto Bounties
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 flex-shrink-0">
              {registeredEvents.has('evt-iic3') ? (
                <Button variant="secondary" className="gap-2 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Registered Participant
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setSelectedEvent(SEED_EVENTS[0]);
                    setRegisterModalOpen(true);
                  }}
                  className="gap-2 shadow-lg"
                >
                  Register for IIC 3.0 <ArrowRight className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  setSelectedEvent(SEED_EVENTS[0]);
                  setTeamModalOpen(true);
                }}
                className="gap-2"
              >
                <Users className="h-4 w-4" /> Form Hackathon Team
              </Button>
            </div>
          </div>
        </div>

        {/* Search & Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Campus & National Events</h2>
            <p className="text-xs text-muted-foreground">Competitions, hackathons, and technical symposia open for registration.</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search hackathons or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((evt) => {
            const isRegistered = registeredEvents.has(evt.id);
            return (
              <div
                key={evt.id}
                className="glass-card p-6 rounded-2xl border border-border/80 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all hover:shadow-lg group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                      {evt.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {evt.date}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors leading-snug">
                    {evt.title}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {evt.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {evt.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-secondary/60 text-muted-foreground text-[10px] font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-primary" /> {evt.applicants.length} Registered
                  </span>

                  {isRegistered ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3" /> Registered
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedEvent(evt);
                        setRegisterModalOpen(true);
                      }}
                      className="gap-1.5 shadow-sm text-xs"
                    >
                      Register Now
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* REGISTER MODAL */}
        <Dialog open={registerModalOpen} onOpenChange={setRegisterModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" /> Confirm Event Registration
              </DialogTitle>
              <DialogDescription>{selectedEvent?.title}</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs text-muted-foreground">
              <p>
                By registering, your verified student profile and institutional credentials will be submitted to the organizing committee.
              </p>
              <div className="p-3 rounded-lg bg-secondary/50 space-y-1">
                <span className="font-semibold text-foreground">Verified Soulbound Token Eligibility:</span>
                <p>Participants completing final deliverables will be minted the official IIC 3.0 Polygon SBT certificate.</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRegisterModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRegister}>Confirm Registration</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CREATE TEAM MODAL */}
        <Dialog open={teamModalOpen} onOpenChange={setTeamModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Create Hackathon Team
              </DialogTitle>
              <DialogDescription>
                Form a collaborative squad for {selectedEvent?.title || 'IIC 3.0'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Team Name *</label>
                <Input
                  placeholder="e.g. Deathly Hallows / CyberBuilders"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>

              <div className="p-3 rounded-lg bg-secondary/40 text-xs text-muted-foreground space-y-1">
                <span className="font-semibold text-foreground">Team Composition:</span>
                <p>Teams can have up to 4 members with automated role assignment (Frontend, Backend, AI, Smart Contracts).</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setTeamModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTeam}>Create Team</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
