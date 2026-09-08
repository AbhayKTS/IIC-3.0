import DashboardLayout from '@/components/layout/DashboardLayout';
import { Briefcase } from 'lucide-react';

export default function StudentPlacements() {
  return (
    <DashboardLayout role="student">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-mono flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" />
              Campus Placements
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse and apply for full-time job opportunities and campus placements.
            </p>
          </div>
        </div>

        <div className="bg-surface border border-border/50 rounded-xl p-12 text-center">
          <Briefcase className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-foreground mb-2">No Active Placements</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            There are currently no active placement drives available for your profile. Check back later!
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
