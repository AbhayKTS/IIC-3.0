import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from 'sonner';
import { AuthProvider, useAuth } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

// Public Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import LoginStudent from './pages/LoginStudent';
import LoginCollege from './pages/LoginCollege';
import LoginRecruiter from './pages/LoginRecruiter';
import SignupStudent from './pages/SignupStudent';
import SignupCollege from './pages/SignupCollege';
import SignupRecruiter from './pages/SignupRecruiter';
import NotFound from './pages/NotFound';
import AdminInstitutions from './pages/AdminInstitutions';

// Student Pages
import StudentDashboard from './pages/StudentDashboard';
import StudentProfile from './pages/StudentProfile';
import StudentMicroGigs from './pages/StudentMicroGigs';
import StudentWallet from './pages/StudentWallet';
import StudentLeaderboard from './pages/StudentLeaderboard';
import StudentTransactions from './pages/StudentTransactions';
import StudentPlacements from './pages/StudentPlacements';

// College Pages
import CollegeDashboard from './pages/CollegeDashboard';
import CollegeProfile from './pages/CollegeProfile';
import CollegeVerification from './pages/CollegeVerification';
import CollegeRecruiters from './pages/CollegeRecruiters';

// Recruiter Pages
import RecruiterDashboard from './pages/RecruiterDashboard';
import RecruiterProfile from './pages/RecruiterProfile';
import RecruiterMicroGigs from './pages/RecruiterMicroGigs';
import RecruiterSearch from './pages/RecruiterSearch';
import CollegeAnalytics from './pages/CollegeAnalytics';

const queryClient = new QueryClient();

function RequireAuth({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!session) return <Navigate to="/login" replace />;
  if (session.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/login/student" element={<LoginStudent />} />
            <Route path="/login/college" element={<LoginCollege />} />
            <Route path="/login/recruiter" element={<LoginRecruiter />} />
            <Route path="/signup/student" element={<SignupStudent />} />
            <Route path="/signup/college" element={<SignupCollege />} />
            <Route path="/signup/recruiter" element={<SignupRecruiter />} />
            <Route path="/admin/institutions" element={<AdminInstitutions />} />

            {/* Student Routes */}
            <Route path="/student/dashboard" element={<RequireAuth role="student"><StudentDashboard /></RequireAuth>} />
            <Route path="/student/profile" element={<RequireAuth role="student"><StudentProfile /></RequireAuth>} />
            <Route path="/student/microgigs" element={<RequireAuth role="student"><StudentMicroGigs /></RequireAuth>} />
            <Route path="/student/wallet" element={<RequireAuth role="student"><StudentWallet /></RequireAuth>} />
            <Route path="/student/transactions" element={<RequireAuth role="student"><StudentTransactions /></RequireAuth>} />
            <Route path="/student/placements" element={<RequireAuth role="student"><StudentPlacements /></RequireAuth>} />
            <Route path="/student/leaderboard" element={<RequireAuth role="student"><StudentLeaderboard /></RequireAuth>} />

            {/* College Routes */}
            <Route path="/college/dashboard" element={<RequireAuth role="faculty"><CollegeDashboard /></RequireAuth>} />
            <Route path="/college/profile" element={<RequireAuth role="faculty"><CollegeProfile /></RequireAuth>} />
            <Route path="/college/verification" element={<RequireAuth role="faculty"><CollegeVerification /></RequireAuth>} />
            <Route path="/college/recruiters" element={<RequireAuth role="faculty"><CollegeRecruiters /></RequireAuth>} />
            <Route path="/college/analytics" element={<RequireAuth role="faculty"><CollegeAnalytics /></RequireAuth>} />

            {/* Recruiter Routes */}
            <Route path="/recruiter/dashboard" element={<RequireAuth role="recruiter"><RecruiterDashboard /></RequireAuth>} />
            <Route path="/recruiter/profile" element={<RequireAuth role="recruiter"><RecruiterProfile /></RequireAuth>} />
            <Route path="/recruiter/microgigs" element={<RequireAuth role="recruiter"><RecruiterMicroGigs /></RequireAuth>} />
            <Route path="/recruiter/search" element={<RequireAuth role="recruiter"><RecruiterSearch /></RequireAuth>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
