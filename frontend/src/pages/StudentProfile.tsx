import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import type { Student, ResumeExtractionData, ExtractedSkill } from '@/lib/types';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  User,
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  X,
  Briefcase,
  GraduationCap,
  Award,
  Link as LinkIcon,
  RefreshCw,
  Check,
} from 'lucide-react';

export default function StudentProfile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  // Resume Upload State
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeExtractionData | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<Record<string, boolean>>({});
  const [savingSkills, setSavingSkills] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual skill add
  const [newSkillInput, setNewSkillInput] = useState('');

  const loadProfile = async () => {
    try {
      setLoading(true);
      const studentId = session?.userId;
      if (studentId) {
        const data = await api.getStudentById(studentId);
        if (data) setProfile(data);
      }
    } catch {
      // Fallback: session student
      if (session?.user) {
        setProfile(session.user as Student);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [session]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Resume file size must be less than 5MB');
        return;
      }
      setResumeFile(file);
      setResumeData(null);
    }
  };

  const handleParseResume = async () => {
    if (!resumeFile) {
      toast.error('Please select a resume file (PDF, DOCX, or Image)');
      return;
    }

    try {
      setParsing(true);
      const res = await api.uploadResume(resumeFile);
      if (res?.resumeData) {
        setResumeData(res.resumeData);
        // Default: pre-select all extracted skills that aren't already in profile
        const initialSelected: Record<string, boolean> = {};
        (res.resumeData.skills || []).forEach((s) => {
          initialSelected[s.name] = true;
        });
        setSelectedSkills(initialSelected);
        toast.success(`Resume parsed using ${res.resumeData.method}! Review extracted skills below.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse resume');
    } finally {
      setParsing(false);
    }
  };

  const toggleSkillSelection = (skillName: string) => {
    setSelectedSkills((prev) => ({
      ...prev,
      [skillName]: !prev[skillName],
    }));
  };

  const handleSelectAllSkills = (select: boolean) => {
    if (!resumeData?.skills) return;
    const updated: Record<string, boolean> = {};
    resumeData.skills.forEach((s) => {
      updated[s.name] = select;
    });
    setSelectedSkills(updated);
  };

  const handleMergeSkills = async () => {
    if (!resumeData?.skills) return;
    const skillsToAdd = Object.entries(selectedSkills)
      .filter(([_, isSelected]) => isSelected)
      .map(([name]) => name);

    if (skillsToAdd.length === 0) {
      toast.error('Please select at least one skill to merge');
      return;
    }

    try {
      setSavingSkills(true);
      const currentSkills = profile?.skills || [];
      const currentLower = new Set(currentSkills.map((s) => s.toLowerCase()));
      const merged = [...currentSkills];

      skillsToAdd.forEach((skill) => {
        if (!currentLower.has(skill.toLowerCase())) {
          currentLower.add(skill.toLowerCase());
          merged.push(skill);
        }
      });

      await api.updateStudentSkills(merged).catch(() => null);

      setProfile((prev) => (prev ? { ...prev, skills: merged } : null));
      toast.success(`Merged ${skillsToAdd.length} skills into your profile!`);
      setIsResumeOpen(false);
      setResumeFile(null);
      setResumeData(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save skills');
    } finally {
      setSavingSkills(false);
    }
  };

  const handleRemoveSkill = async (skillToRemove: string) => {
    if (!profile) return;
    const updated = profile.skills.filter((s) => s !== skillToRemove);
    setProfile({ ...profile, skills: updated });
    await api.updateStudentSkills(updated).catch(() => null);
    toast.success(`Removed "${skillToRemove}"`);
  };

  const handleAddManualSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillInput.trim() || !profile) return;
    const skill = newSkillInput.trim();
    if (profile.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      toast.error('Skill already exists in profile');
      return;
    }
    const updated = [...profile.skills, skill];
    setProfile({ ...profile, skills: updated });
    setNewSkillInput('');
    await api.updateStudentSkills(updated).catch(() => null);
    toast.success(`Added "${skill}"`);
  };

  return (
    <DashboardLayout role="student">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <div className="bg-surface border border-line rounded-xl p-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-2xl font-mono">
                {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'ST'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground font-mono">
                    {profile?.name || (session?.user as any)?.name || 'Student Profile'}
                  </h1>
                  <Badge className="bg-[#3DDC84]/15 text-[#3DDC84] border-[#3DDC84]/30 font-mono text-[11px]">
                    Verified Student
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {profile?.email || (session?.user as any)?.email}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                  <span>College: <strong className="text-foreground font-mono">{profile?.collegeId?.toUpperCase() || 'IITD'}</strong></span>
                </div>
              </div>
            </div>

            {/* Resume Upload CTA */}
            <Dialog open={isResumeOpen} onOpenChange={setIsResumeOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#3DDC84] text-black hover:bg-[#34c775] font-mono text-xs font-semibold px-4 gap-2">
                  <Sparkles className="h-4 w-4" />
                  Upload Resume (AI Parse)
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#14161A] border-[#2A2D33] text-[#F2F3F5] max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2 font-mono">
                    <FileText className="h-5 w-5 text-[#3DDC84]" />
                    AI Resume Parser & Skills Extraction
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#8A8F98]">
                    Upload your resume (PDF, DOCX, or Image). Azure AI Document Intelligence will extract raw text and structure your skills into interactive suggestion chips.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  {/* Dropzone */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.doc,image/jpeg,image/png,image/webp"
                    className="hidden"
                  />

                  {!resumeData ? (
                    <div className="space-y-4">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-[#2A2D33] hover:border-[#3DDC84]/50 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-[#0A0B0D]/50 hover:bg-[#0A0B0D] transition-colors"
                      >
                        <UploadCloud className="h-10 w-10 text-[#3DDC84] mb-2" />
                        <p className="text-sm font-medium text-foreground">
                          {resumeFile ? resumeFile.name : 'Click to select Resume file'}
                        </p>
                        <p className="text-xs text-[#8A8F98] mt-1">
                          PDF, DOCX, DOC, PNG, JPG (Max 5MB)
                        </p>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => setIsResumeOpen(false)}
                          className="font-mono text-xs text-[#8A8F98]"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleParseResume}
                          disabled={!resumeFile || parsing}
                          className="bg-[#3DDC84] text-black hover:bg-[#34c775] font-mono text-xs font-semibold"
                        >
                          {parsing ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                              Parsing with Azure AI...
                            </>
                          ) : (
                            'Analyze & Extract Skills'
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Extraction Results & Suggestion Chips */
                    <div className="space-y-5">
                      {/* Method Banner & Disclaimer */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-[#0A0B0D] border border-[#2A2D33]">
                        <div className="flex items-center gap-2">
                          {resumeData.method === 'azure-openai' ? (
                            <Badge className="bg-[#B98CFF]/20 text-[#B98CFF] border-[#B98CFF]/40 font-mono text-[11px]">
                              Extracted via Azure OpenAI
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/40 font-mono text-[11px]">
                              Extracted via Rule-Based Parser
                            </Badge>
                          )}
                          <span className="text-xs text-[#8A8F98]">
                            Found {(resumeData.skills || []).length} skills
                          </span>
                        </div>

                        {/* Note when rule-based */}
                        {resumeData.method === 'rule-based' && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-400">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Auto-extracted, please review for accuracy</span>
                          </div>
                        )}
                      </div>

                      {/* Interactive Suggestion Chips */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-semibold uppercase text-muted-foreground">
                            Extracted Skills (Click to Accept / Reject)
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSelectAllSkills(true)}
                              className="text-[11px] font-mono text-[#3DDC84] hover:underline"
                            >
                              Accept All
                            </button>
                            <span className="text-xs text-muted-foreground">·</span>
                            <button
                              type="button"
                              onClick={() => handleSelectAllSkills(false)}
                              className="text-[11px] font-mono text-muted-foreground hover:underline"
                            >
                              Reject All
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 p-3 bg-[#0A0B0D] border border-[#2A2D33] rounded-xl max-h-48 overflow-y-auto">
                          {resumeData.skills && resumeData.skills.length > 0 ? (
                            resumeData.skills.map((skill) => {
                              const isSelected = selectedSkills[skill.name] ?? false;
                              return (
                                <button
                                  key={skill.name}
                                  type="button"
                                  onClick={() => toggleSkillSelection(skill.name)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all border ${
                                    isSelected
                                      ? 'bg-[#3DDC84]/15 text-[#3DDC84] border-[#3DDC84]/50 shadow-sm'
                                      : 'bg-secondary/40 text-muted-foreground border-[#2A2D33] opacity-60 line-through'
                                  }`}
                                >
                                  {isSelected ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <X className="h-3 w-3" />
                                  )}
                                  <span>{skill.name}</span>
                                  {skill.category && (
                                    <span className="text-[10px] opacity-70">
                                      ({skill.category})
                                    </span>
                                  )}
                                </button>
                              );
                            })
                          ) : (
                            <p className="text-xs text-muted-foreground">No skills identified in resume text.</p>
                          )}
                        </div>
                      </div>

                      {/* Additional Extracted Info: Education & Experience preview */}
                      {(resumeData.education?.length || resumeData.experience?.length) ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {resumeData.education && resumeData.education.length > 0 && (
                            <div className="p-3 bg-[#0A0B0D] border border-[#2A2D33] rounded-lg space-y-1">
                              <span className="font-mono text-[11px] text-[#8A8F98] uppercase flex items-center gap-1">
                                <GraduationCap className="h-3 w-3 text-[#3DDC84]" /> Education
                              </span>
                              {resumeData.education.slice(0, 2).map((edu, i) => (
                                <div key={i} className="text-foreground truncate">
                                  {edu.degree || edu.institution || 'Degree listed'}
                                </div>
                              ))}
                            </div>
                          )}

                          {resumeData.experience && resumeData.experience.length > 0 && (
                            <div className="p-3 bg-[#0A0B0D] border border-[#2A2D33] rounded-lg space-y-1">
                              <span className="font-mono text-[11px] text-[#8A8F98] uppercase flex items-center gap-1">
                                <Briefcase className="h-3 w-3 text-[#B98CFF]" /> Experience
                              </span>
                              {resumeData.experience.slice(0, 2).map((exp, i) => (
                                <div key={i} className="text-foreground truncate">
                                  {exp.title || exp.org || 'Role listed'}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}

                      {/* Action buttons */}
                      <div className="flex justify-between items-center pt-3 border-t border-[#2A2D33]">
                        <button
                          type="button"
                          onClick={() => {
                            setResumeData(null);
                            setResumeFile(null);
                          }}
                          className="text-xs font-mono text-[#8A8F98] hover:underline"
                        >
                          Upload another resume
                        </button>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => setIsResumeOpen(false)}
                            className="font-mono text-xs text-[#8A8F98]"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleMergeSkills}
                            disabled={savingSkills}
                            className="bg-[#3DDC84] text-black hover:bg-[#34c775] font-mono text-xs font-semibold"
                          >
                            {savingSkills ? 'Merging...' : 'Merge Selected Skills to Profile'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Skills Management Section */}
        <div className="bg-surface border border-line rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line/50 pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground font-mono flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#3DDC84]" />
                Technical & Soft Skills ({profile?.skills?.length || 0})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                These skills are indexed for recruiter search, skill leaderboards, and AI candidate matching.
              </p>
            </div>

            {/* Quick manual skill add form */}
            <form onSubmit={handleAddManualSkill} className="flex items-center gap-2">
              <Input
                placeholder="Add skill (e.g. Docker)..."
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                className="h-8 text-xs bg-[#0A0B0D] border-line w-48"
              />
              <Button type="submit" size="sm" variant="outline" className="h-8 font-mono text-xs border-line">
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </form>
          </div>

          {/* Active Skills Chips */}
          <div className="flex flex-wrap gap-2 pt-2">
            {profile?.skills && profile.skills.length > 0 ? (
              profile.skills.map((skill) => (
                <div
                  key={skill}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A0B0D] border border-[#2A2D33] text-foreground text-xs font-mono group hover:border-[#3DDC84]/40 transition-colors"
                >
                  <span className="text-[#3DDC84]">#</span>
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                    title={`Remove ${skill}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No skills listed yet. Click "Upload Resume" above to automatically extract your skills.
              </p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
