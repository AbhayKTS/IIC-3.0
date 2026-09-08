import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/mockApi';
import type { Institution } from '@/lib/types';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  UserCheck,
  Power,
  Trash2,
  CheckCircle2,
  XCircle,
  Users,
  Shield,
  ArrowUpRight,
} from 'lucide-react';

export default function AdminInstitutions() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Institution Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    contactEmail: '',
  });

  // Promote Admin Modal State
  const [promoteCollege, setPromoteCollege] = useState<Institution | null>(null);
  const [promoteUserIdentifier, setPromoteUserIdentifier] = useState('');
  const [submittingPromote, setSubmittingPromote] = useState(false);

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      const data = await api.superAdminGetInstitutions();
      setInstitutions(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch institutions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.domain.trim()) {
      toast.error('Institution name and domain are required');
      return;
    }

    try {
      setSubmittingAdd(true);
      const created = await api.superAdminCreateInstitution({
        name: formData.name.trim(),
        domain: formData.domain.trim(),
        contactEmail: formData.contactEmail.trim() || undefined,
      });
      toast.success(`Institution "${created.name}" created successfully`);
      setIsAddOpen(false);
      setFormData({ name: '', domain: '', contactEmail: '' });
      fetchInstitutions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create institution');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleToggleStatus = async (institution: Institution) => {
    const targetStatus = !institution.isActive;
    try {
      await api.superAdminUpdateInstitution(institution.id || (institution as any).collegeId, {
        isActive: targetStatus,
      });
      toast.success(
        `"${institution.name}" is now ${targetStatus ? 'Active' : 'Inactive'}`
      );
      setInstitutions((prev) =>
        prev.map((inst) =>
          inst.id === institution.id ? { ...inst, isActive: targetStatus } : inst
        )
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleSoftDelete = async (institution: Institution) => {
    if (!confirm(`Are you sure you want to deactivate institution "${institution.name}"?`)) {
      return;
    }

    try {
      await api.superAdminDeleteInstitution(institution.id || (institution as any).collegeId);
      toast.success(`Institution "${institution.name}" deactivated`);
      setInstitutions((prev) =>
        prev.map((inst) =>
          inst.id === institution.id ? { ...inst, isActive: false } : inst
        )
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to deactivate institution');
    }
  };

  const handlePromoteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteCollege) return;
    if (!promoteUserIdentifier.trim()) {
      toast.error('Please enter a user Email or UID');
      return;
    }

    const isEmail = promoteUserIdentifier.includes('@');
    try {
      setSubmittingPromote(true);
      await api.superAdminPromoteAdminFaculty({
        collegeId: promoteCollege.id || (promoteCollege as any).collegeId,
        email: isEmail ? promoteUserIdentifier.trim() : undefined,
        uid: !isEmail ? promoteUserIdentifier.trim() : undefined,
      });
      toast.success(
        `User promoted to Admin Faculty for ${promoteCollege.name}`
      );
      setPromoteCollege(null);
      setPromoteUserIdentifier('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to promote admin');
    } finally {
      setSubmittingPromote(false);
    }
  };

  const filtered = institutions.filter((inst) => {
    const term = searchQuery.toLowerCase();
    return (
      inst.name?.toLowerCase().includes(term) ||
      inst.domain?.toLowerCase().includes(term) ||
      inst.contactEmail?.toLowerCase().includes(term)
    );
  });

  const totalColleges = institutions.length;
  const activeColleges = institutions.filter((c) => c.isActive).length;
  const totalStudents = institutions.reduce(
    (sum, c) => sum + (c.studentCount || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-[#F2F3F5] flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-7xl mx-auto w-full">
        {/* Header Breadcrumb & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#8A8F98] uppercase font-mono tracking-wider mb-2">
              <Shield className="h-3.5 w-3.5 text-[#3DDC84]" />
              <span>Platform SuperAdmin</span>
              <span>/</span>
              <span className="text-[#F2F3F5]">Institutions</span>
            </div>
            <h1
              className="text-2xl md:text-3xl font-bold tracking-tight text-[#F2F3F5]"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              Institutions Management
            </h1>
            <p className="text-sm text-[#8A8F98] mt-1">
              Onboard, configure, and manage university domains and verified faculty administrators.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInstitutions}
              disabled={loading}
              className="border-[#2A2D33] bg-[#14161A] text-[#F2F3F5] hover:bg-[#2A2D33] font-mono text-xs"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>

            {/* Add Institution Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#3DDC84] text-black hover:bg-[#34c775] font-mono text-xs font-semibold px-4">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Institution
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#14161A] border-[#2A2D33] text-[#F2F3F5] max-w-md">
                <DialogHeader>
                  <DialogTitle
                    className="text-lg font-bold"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    Onboard New Institution
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#8A8F98]">
                    Register a university domain for student verification and platform onboarding.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateInstitution} className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="inst-name" className="text-xs text-[#8A8F98]">
                      Institution Name *
                    </Label>
                    <Input
                      id="inst-name"
                      placeholder="e.g. Indian Institute of Technology Delhi"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      className="bg-[#0A0B0D] border-[#2A2D33] text-[#F2F3F5] focus:border-[#3DDC84]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inst-domain" className="text-xs text-[#8A8F98]">
                      University Domain * (lowercased)
                    </Label>
                    <Input
                      id="inst-domain"
                      placeholder="e.g. iitd.ac.in"
                      value={formData.domain}
                      onChange={(e) =>
                        setFormData({ ...formData, domain: e.target.value })
                      }
                      required
                      className="bg-[#0A0B0D] border-[#2A2D33] text-[#F2F3F5] font-mono focus:border-[#3DDC84]"
                    />
                    <p className="text-[11px] text-[#8A8F98]">
                      Students matching @domain will be automatically mapped to this college.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inst-email" className="text-xs text-[#8A8F98]">
                      Contact / Dean Email (Optional)
                    </Label>
                    <Input
                      id="inst-email"
                      type="email"
                      placeholder="e.g. admin@iitd.ac.in"
                      value={formData.contactEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, contactEmail: e.target.value })
                      }
                      className="bg-[#0A0B0D] border-[#2A2D33] text-[#F2F3F5] focus:border-[#3DDC84]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-[#2A2D33]">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsAddOpen(false)}
                      className="text-[#8A8F98] hover:text-[#F2F3F5] font-mono text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submittingAdd}
                      className="bg-[#3DDC84] text-black hover:bg-[#34c775] font-mono text-xs font-semibold"
                    >
                      {submittingAdd ? 'Registering...' : 'Create Institution'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#14161A] border border-[#2A2D33] rounded-md p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8A8F98] uppercase font-mono">
                Total Colleges
              </span>
              <Building2 className="h-4 w-4 text-[#8A8F98]" />
            </div>
            <div
              className="text-2xl font-bold mt-2 text-[#F2F3F5]"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              {totalColleges}
            </div>
          </div>

          <div className="bg-[#14161A] border border-[#2A2D33] rounded-md p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8A8F98] uppercase font-mono">
                Active Domains
              </span>
              <CheckCircle2 className="h-4 w-4 text-[#3DDC84]" />
            </div>
            <div
              className="text-2xl font-bold mt-2 text-[#3DDC84]"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              {activeColleges}
            </div>
          </div>

          <div className="bg-[#14161A] border border-[#2A2D33] rounded-md p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8A8F98] uppercase font-mono">
                Enrolled Students
              </span>
              <Users className="h-4 w-4 text-[#B98CFF]" />
            </div>
            <div
              className="text-2xl font-bold mt-2 text-[#F2F3F5]"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              {totalStudents}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8F98]" />
          <Input
            placeholder="Search by college name, domain, or contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#14161A] border-[#2A2D33] text-[#F2F3F5] text-xs h-10 w-full sm:w-80 focus:border-[#3DDC84]"
          />
        </div>

        {/* Institutions Table */}
        <div className="bg-[#14161A] border border-[#2A2D33] rounded-md overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-[#0A0B0D]/50 border-b border-[#2A2D33]">
              <TableRow className="hover:bg-transparent border-[#2A2D33]">
                <TableHead className="font-mono text-xs text-[#8A8F98]">Institution Name</TableHead>
                <TableHead className="font-mono text-xs text-[#8A8F98]">Domain</TableHead>
                <TableHead className="font-mono text-xs text-[#8A8F98]">Status</TableHead>
                <TableHead className="font-mono text-xs text-[#8A8F98] text-right">Students</TableHead>
                <TableHead className="font-mono text-xs text-[#8A8F98] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-sm text-[#8A8F98]">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#3DDC84]" />
                    Loading institutions...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-sm text-[#8A8F98]">
                    No institutions found. Click "Add Institution" to register one.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((inst) => (
                  <TableRow key={inst.id || (inst as any).collegeId} className="border-b border-[#2A2D33]/60 hover:bg-[#1f2229]/50">
                    <TableCell className="font-medium text-[#F2F3F5]">
                      <div className="flex flex-col">
                        <span>{inst.name}</span>
                        {inst.contactEmail && (
                          <span className="text-xs text-[#8A8F98]">{inst.contactEmail}</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#0A0B0D] border border-[#2A2D33] text-[#3DDC84]">
                        @{inst.domain}
                      </span>
                    </TableCell>

                    <TableCell>
                      {inst.isActive ? (
                        <Badge className="bg-[#3DDC84]/15 text-[#3DDC84] border-[#3DDC84]/30 hover:bg-[#3DDC84]/20 font-mono text-[11px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/20 font-mono text-[11px]">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs text-[#F2F3F5]">
                      {inst.studentCount ?? 0}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPromoteCollege(inst)}
                          title="Promote Admin Faculty"
                          className="h-8 px-2 text-xs font-mono text-[#B98CFF] hover:text-[#B98CFF] hover:bg-[#B98CFF]/10 border border-[#2A2D33]"
                        >
                          <UserCheck className="h-3.5 w-3.5 mr-1" />
                          Promote Admin
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(inst)}
                          title={inst.isActive ? 'Deactivate' : 'Activate'}
                          className={`h-8 px-2 text-xs font-mono border border-[#2A2D33] ${
                            inst.isActive
                              ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10'
                              : 'text-[#3DDC84] hover:text-[#3DDC84] hover:bg-[#3DDC84]/10'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5 mr-1" />
                          {inst.isActive ? 'Deactivate' : 'Activate'}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSoftDelete(inst)}
                          title="Soft Delete"
                          className="h-8 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-[#2A2D33]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Promote College Admin Modal */}
        <Dialog open={Boolean(promoteCollege)} onOpenChange={(open) => !open && setPromoteCollege(null)}>
          <DialogContent className="bg-[#14161A] border-[#2A2D33] text-[#F2F3F5] max-w-md">
            <DialogHeader>
              <DialogTitle
                className="text-lg font-bold flex items-center gap-2"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                <UserCheck className="h-5 w-5 text-[#B98CFF]" />
                Promote Admin Faculty
              </DialogTitle>
              <DialogDescription className="text-xs text-[#8A8F98]">
                Grant <span className="text-[#F2F3F5] font-semibold">{promoteCollege?.name}</span> administrative faculty privileges.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handlePromoteAdmin} className="space-y-4 mt-2">
              <div className="p-3 bg-[#0A0B0D] border border-[#2A2D33] rounded text-xs space-y-1">
                <div className="text-[#8A8F98]">Target Institution:</div>
                <div className="text-[#F2F3F5] font-medium">{promoteCollege?.name}</div>
                <div className="text-[#3DDC84] font-mono">@{promoteCollege?.domain}</div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="promote-user" className="text-xs text-[#8A8F98]">
                  Faculty User Email or UID *
                </Label>
                <Input
                  id="promote-user"
                  placeholder="e.g. dean@iitd.ac.in or user_uid"
                  value={promoteUserIdentifier}
                  onChange={(e) => setPromoteUserIdentifier(e.target.value)}
                  required
                  className="bg-[#0A0B0D] border-[#2A2D33] text-[#F2F3F5] focus:border-[#B98CFF]"
                />
                <p className="text-[11px] text-[#8A8F98]">
                  This user will be assigned role <span className="font-mono text-[#F2F3F5]">faculty</span> and subRole <span className="font-mono text-[#F2F3F5]">adminFaculty</span>.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2A2D33]">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPromoteCollege(null)}
                  className="text-[#8A8F98] hover:text-[#F2F3F5] font-mono text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingPromote}
                  className="bg-[#B98CFF] text-black hover:bg-[#a774f7] font-mono text-xs font-semibold"
                >
                  {submittingPromote ? 'Promoting...' : 'Confirm Promotion'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </div>
  );
}
