import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useLiveStudentVerification } from '@/lib/useLiveStudentVerification';

interface StudentVerificationBadgeProps {
  uid?: string;
  className?: string;
}

export const StudentVerificationBadge: React.FC<StudentVerificationBadgeProps> = ({
  uid,
  className = '',
}) => {
  const { isLoaded, status } = useLiveStudentVerification(uid);

  // Neutral skeleton / spinner loading state while the FIRST snapshot hasn't arrived
  if (!isLoaded) {
    return (
      <Badge
        variant="outline"
        className={`bg-secondary/40 text-muted-foreground/70 border-border/60 gap-1.5 py-1 px-2.5 font-mono text-[11px] animate-pulse ${className}`}
      >
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/70" />
        <span>Verifying Status...</span>
      </Badge>
    );
  }

  if (status === 'verified') {
    return (
      <Badge
        className={`bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1.5 py-1 px-2.5 font-mono text-[11px] shadow-sm ${className}`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" /> Verified Student
      </Badge>
    );
  }

  if (status === 'pending') {
    return (
      <Badge
        className={`bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1.5 py-1 px-2.5 font-mono text-[11px] shadow-sm ${className}`}
      >
        <Clock className="h-3.5 w-3.5" /> Verification Pending
      </Badge>
    );
  }

  if (status === 'rejected') {
    return (
      <Badge
        className={`bg-destructive/15 text-destructive border border-destructive/30 gap-1.5 py-1 px-2.5 font-mono text-[11px] shadow-sm ${className}`}
      >
        <XCircle className="h-3.5 w-3.5" /> Verification Rejected
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`text-muted-foreground border-border/80 gap-1.5 py-1 px-2.5 font-mono text-[11px] ${className}`}
    >
      <AlertCircle className="h-3.5 w-3.5" /> ID Not Verified
    </Badge>
  );
};
