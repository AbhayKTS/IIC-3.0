import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/mockApi';
import type { Community } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  Shield,
  Plus,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function CollegeCommunities() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      const data = await api.getCommunities().catch(() => null);
      if (data && Array.isArray(data) && data.length > 0) {
        setCommunities(data);
      } else {
        setCommunities([
          {
            id: 'comm-web3',
            name: 'Polygon & Web3 Builders Guild',
            collegeId: 'all',
            type: 'optional',
            members: ['s1', 's2', 's3', 's4'],
            description: 'EVM smart contracts and Soulbound Token development projects.',
          },
          {
            id: 'comm-ai',
            name: 'Autonomous AI & LLM Systems Circle',
            collegeId: 'all',
            type: 'optional',
            members: ['s1', 's2', 's5'],
            description: 'Student research group for multi-agent LLM systems and embeddings.',
          },
          {
            id: 'comm-general',
            name: 'Campus Tech & Innovation Forum',
            collegeId: 'all',
            type: 'mandatory',
            members: ['s1', 's2', 's3', 's4', 's5'],
            description: 'Official university cross-department technical announcements.',
          },
        ]);
      }
    } catch {
      //
    }
  };

  const filtered = communities.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout role="faculty">
      <div className="container-main py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> Campus Community Oversight
            </h1>
            <p className="text-xs text-muted-foreground">
              Monitor active student technical guilds, discussion engagement, and departmental groups.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter communities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((comm) => (
            <div
              key={comm.id}
              className="glass-card p-6 rounded-2xl border border-border/80 flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={comm.type === 'mandatory' ? 'default' : 'secondary'} className="text-xs capitalize">
                    {comm.type} Circle
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {comm.members.length} Enrolled
                  </span>
                </div>

                <h3 className="font-bold text-lg text-foreground">{comm.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{comm.description}</p>
              </div>

              <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                <Badge className="bg-emerald-500/10 text-emerald-500 text-[10px] gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Moderated & Active
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.success(`Viewing channel logs for ${comm.name}`)}
                  className="text-xs"
                >
                  Inspect Logs
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
