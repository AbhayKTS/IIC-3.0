import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border/60 bg-secondary/20">
      <div className="container-main py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 font-bold text-lg mb-3 cyber-heading">
              <GraduationCap className="h-6 w-6 text-primary" />
              <span className="gradient-text">CollegeVerse</span>
            </Link>
            <p className="text-sm text-muted-foreground">The unified college ecosystem connecting students, faculty, and recruiters.</p>
          </div>
          <div>
            <h4 className="font-semibold text-xs mb-3 text-foreground cyber-label">Explore</h4>
            <div className="space-y-2">
              {[['Colleges', '/colleges'], ['Leaderboard', '/leaderboard'], ['MicroGigs', '/microgigs'], ['Marketplace', '/marketplace']].map(([l, h]) => (
                <Link key={h} to={h} className="block text-sm text-muted-foreground hover:text-primary transition-colors">&gt; {l}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-xs mb-3 text-foreground cyber-label">Company</h4>
            <div className="space-y-2">
              {[['About', '/about'], ['Contact', '/contact'], ['Explore', '/explore']].map(([l, h]) => (
                <Link key={h} to={h} className="block text-sm text-muted-foreground hover:text-primary transition-colors">&gt; {l}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-xs mb-3 text-foreground cyber-label">For Roles</h4>
            <div className="space-y-2">
              {[['Students', '/login/student'], ['Faculty', '/login/college'], ['Recruiters', '/login/recruiter']].map(([l, h]) => (
                <Link key={h} to={h} className="block text-sm text-muted-foreground hover:text-primary transition-colors">&gt; {l}</Link>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground cyber-label">
          © 2026 CollegeVerse. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
