import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import type { UserRole } from '@/lib/types';
import {
  LayoutDashboard, User, Trophy, Calendar, Briefcase, Users, MessageSquare,
  Wallet, ShoppingBag, Zap, Swords, Shield, Bell, BarChart3, UserCheck,
  Search, ListChecks, FileText, LogOut, GraduationCap, ChevronLeft, Menu, X, Settings
} from 'lucide-react';
import { useState } from 'react';

interface NavItem { label: string; href: string; icon: React.ReactNode }

const studentNav: NavItem[] = [
  { label: 'Dashboard', href: '/student/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Profile', href: '/student/profile', icon: <User className="h-4 w-4" /> },
  { label: 'Leaderboard', href: '/student/leaderboard', icon: <Trophy className="h-4 w-4" /> },
  { label: 'Events', href: '/student/events', icon: <Calendar className="h-4 w-4" /> },
  { label: 'Placements', href: '/student/placements', icon: <Briefcase className="h-4 w-4" /> },
  { label: 'Communities', href: '/student/communities', icon: <Users className="h-4 w-4" /> },
  { label: 'Clubs', href: '/student/clubs', icon: <Users className="h-4 w-4" /> },
  { label: 'Chat', href: '/student/chat', icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Wallet', href: '/student/wallet', icon: <Wallet className="h-4 w-4" /> },
  { label: 'MicroGigs', href: '/student/microgigs', icon: <Zap className="h-4 w-4" /> },
  { label: 'Marketplace', href: '/student/marketplace', icon: <ShoppingBag className="h-4 w-4" /> },
  { label: 'Competitions', href: '/student/competitions', icon: <Swords className="h-4 w-4" /> },
];

const collegeNav: NavItem[] = [
  { label: 'Dashboard', href: '/college/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Verification', href: '/college/verification', icon: <UserCheck className="h-4 w-4" /> },
  { label: 'Notices', href: '/college/notices', icon: <Bell className="h-4 w-4" /> },
  { label: 'Communities', href: '/college/communities', icon: <Users className="h-4 w-4" /> },
  { label: 'Events', href: '/college/events', icon: <Calendar className="h-4 w-4" /> },
  { label: 'Analytics', href: '/college/analytics', icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Recruiters', href: '/college/recruiters', icon: <Briefcase className="h-4 w-4" /> },
  { label: 'Club Approvals', href: '/college/clubs-approvals', icon: <Shield className="h-4 w-4" /> },
  { label: 'Marketplace Mod', href: '/college/marketplace-moderation', icon: <ShoppingBag className="h-4 w-4" /> },
];

const recruiterNav: NavItem[] = [
  { label: 'Dashboard', href: '/recruiter/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Search', href: '/recruiter/search', icon: <Search className="h-4 w-4" /> },
  { label: 'Shortlist', href: '/recruiter/shortlist', icon: <ListChecks className="h-4 w-4" /> },
  { label: 'Tests', href: '/recruiter/tests', icon: <FileText className="h-4 w-4" /> },
  { label: 'MicroGigs', href: '/recruiter/microgigs', icon: <Zap className="h-4 w-4" /> },
];

export default function DashboardLayout({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { session, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = role === 'student' ? studentNav : role === 'faculty' ? collegeNav : recruiterNav;
  const roleName = role === 'student' ? 'Student' : role === 'faculty' ? 'Faculty' : 'Recruiter';

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          {!collapsed && <span className="gradient-text font-bold">CollegeVerse</span>}
        </Link>
        <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:block text-muted-foreground hover:text-foreground">
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {nav.map(item => {
          const active = location.pathname === item.href;
          return (
            <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>

      <div className="p-3 border-t border-border/50 space-y-1">
        {!collapsed && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Logged in as <span className="text-foreground font-medium">{roleName}</span>
          </div>
        )}
        <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col border-r border-border/50 bg-secondary/20 transition-all ${collapsed ? 'w-16' : 'w-60'}`}>
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-background border-r border-border/50">{sidebarContent}</div>
          <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border/50 flex items-center justify-between px-4 lg:px-6 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-muted-foreground" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-sm font-semibold text-foreground">{roleName} Portal</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{(session?.user as any)?.name || (session?.user as any)?.email}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
