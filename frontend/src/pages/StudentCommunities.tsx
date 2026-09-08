import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import type { Community } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Users,
  Search,
  CheckCircle2,
  Plus,
  MessageSquare,
  Sparkles,
  Shield,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SEED_COMMUNITIES: Community[] = [
  {
    id: 'comm-web3',
    name: 'Polygon & Web3 Builders Guild',
    collegeId: 'all',
    type: 'optional',
    members: ['s1', 's2', 's3', 's4'],
    description: 'Peer group dedicated to developing on EVM chains, Account Abstraction (ERC-4337), Soulbound Tokens, and DeFi smart contracts.',
  },
  {
    id: 'comm-ai',
    name: 'Autonomous AI & LLM Systems Circle',
    collegeId: 'all',
    type: 'optional',
    members: ['s1', 's2', 's5'],
    description: 'Collaborative projects building multi-agent systems, fine-tuning open-weights models, vector search, and AI hackathon squads.',
  },
  {
    id: 'comm-cp',
    name: 'Competitive Programming & Algorithms League',
    collegeId: 'all',
    type: 'optional',
    members: ['s1', 's3', 's4', 's5'],
    description: 'Weekly contest discussion for Codeforces Div 2/1, LeetCode weekly contests, and ICPC regional preparation.',
  },
  {
    id: 'comm-general',
    name: 'Campus Tech & Innovation Forum',
    collegeId: 'all',
    type: 'mandatory',
    members: ['s1', 's2', 's3', 's4', 's5'],
    description: 'Official university cross-department discussions on research projects, hackathons, and placement updates.',
  },
];

export default function StudentCommunities() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const studentId = session?.userId || 'student';

  const [communities, setCommunities] = useState<Community[]>(SEED_COMMUNITIES);
  const [search, setSearch] = useState('');
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set(['comm-web3', 'comm-general']));

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      const data = await api.getCommunities().catch(() => null);
      if (data && Array.isArray(data) && data.length > 0) {
        setCommunities(data);
      }
    } catch {
      setCommunities(SEED_COMMUNITIES);
    }
  };

  const toggleJoin = async (comm: Community) => {
    const isJoined = joinedIds.has(comm.id);
    try {
      if (isJoined) {
        await api.leaveCommunity(comm.id, studentId).catch(() => null);
        setJoinedIds((prev) => {
          const next = new Set(prev);
          next.delete(comm.id);
          return next;
        });
        toast.info(`Left ${comm.name}`);
      } else {
        await api.joinCommunity(comm.id, studentId).catch(() => null);
        setJoinedIds((prev) => new Set([...prev, comm.id]));
        toast.success(`Joined ${comm.name}! Welcome to the guild.`);
      }
    } catch {
      toast.error('Could not update membership');
    }
  };

  const filtered = communities.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout role="student">
      <div className="container-main py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> Campus & Tech Communities
            </h1>
            <p className="text-xs text-muted-foreground">
              Connect with specialized engineering circles, hackathon squads, and discussion channels.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search communities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((comm) => {
            const isJoined = joinedIds.has(comm.id);
            return (
              <div
                key={comm.id}
                className="glass-card p-6 rounded-2xl border border-border/80 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all hover:shadow-lg group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={comm.type === 'mandatory' ? 'default' : 'secondary'}
                      className="text-xs capitalize"
                    >
                      {comm.type} Community
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {comm.members.length + (isJoined ? 1 : 0)} members
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                    {comm.name}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {comm.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/student/chat')}
                    className="gap-1.5 text-xs"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-primary" /> Open Chat Channel
                  </Button>

                  <Button
                    size="sm"
                    variant={isJoined ? 'secondary' : 'default'}
                    onClick={() => toggleJoin(comm)}
                    className="text-xs gap-1.5"
                  >
                    {isJoined ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Member
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" /> Join Circle
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
