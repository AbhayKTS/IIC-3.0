import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-line bg-secondary/20">
      <div className="container-main py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 text-xl font-bold mb-3" style={{ fontFamily: '"Fraunces", serif', letterSpacing: '-0.02em' }}>
              <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary">
                A
              </div>
              <span className="text-foreground">Almadox</span>
            </Link>
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed max-w-xs">The unified campus ecosystem connecting students, faculty, and recruiters through verified identity.</p>
          </div>
          <div>
            <h4 className="font-semibold text-xs mb-4 uppercase tracking-widest text-foreground">Platform</h4>
            <div className="space-y-3">
              {[['Colleges', '/colleges'], ['Leaderboard', '/leaderboard'], ['MicroGigs', '/microgigs'], ['Marketplace', '/marketplace']].map(([l, h]) => (
                <Link key={h} to={h} className="block text-sm text-muted-foreground hover:text-primary transition-colors">{l}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-xs mb-4 uppercase tracking-widest text-foreground">Company</h4>
            <div className="space-y-3">
              {[['About us', '/about'], ['Contact', '/contact'], ['Terms of Service', '/terms']].map(([l, h]) => (
                <Link key={h} to={h} className="block text-sm text-muted-foreground hover:text-primary transition-colors">{l}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-xs mb-4 uppercase tracking-widest text-foreground">For Roles</h4>
            <div className="space-y-3">
              {[['Students', '/login/student'], ['Faculty', '/login/college'], ['Recruiters', '/login/recruiter']].map(([l, h]) => (
                <Link key={h} to={h} className="block text-sm text-muted-foreground hover:text-primary transition-colors">{l}</Link>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-line text-center text-xs text-muted-foreground">
          © 2026 Almadox. All rights reserved. Built by students.
        </div>
      </div>
    </footer>
  );
}
