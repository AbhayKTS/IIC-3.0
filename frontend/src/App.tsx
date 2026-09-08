import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, RequireAuth } from "@/lib/auth";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import LoginStudent from "./pages/LoginStudent";
import LoginCollege from "./pages/LoginCollege";
import LoginRecruiter from "./pages/LoginRecruiter";
import SignupStudent from "./pages/SignupStudent";
import SignupCollege from "./pages/SignupCollege";
import SignupRecruiter from "./pages/SignupRecruiter";
import AdminInstitutions from "./pages/AdminInstitutions";
import NotFound from "./pages/NotFound";

// Student Pages
import StudentDashboard from "./pages/StudentDashboard";
import StudentProfile from "./pages/StudentProfile";
import StudentMicroGigs from "./pages/StudentMicroGigs";
import StudentWallet from "./pages/StudentWallet";
import StudentLeaderboard from "./pages/StudentLeaderboard";
import StudentEvents from "./pages/StudentEvents";
import StudentPlacements from "./pages/StudentPlacements";
import StudentCommunities from "./pages/StudentCommunities";
import StudentClubs from "./pages/StudentClubs";
import StudentChat from "./pages/StudentChat";
import StudentMarketplace from "./pages/StudentMarketplace";
import StudentCompetitions from "./pages/StudentCompetitions";

// College Pages
import CollegeDashboard from "./pages/CollegeDashboard";
import CollegeVerification from "./pages/CollegeVerification";
import CollegeAnalytics from "./pages/CollegeAnalytics";
import CollegeNotices from "./pages/CollegeNotices";
import CollegeCommunities from "./pages/CollegeCommunities";
import CollegeEvents from "./pages/CollegeEvents";
import CollegeRecruiters from "./pages/CollegeRecruiters";
import CollegeClubsApprovals from "./pages/CollegeClubsApprovals";
import CollegeMarketplaceMod from "./pages/CollegeMarketplaceMod";

// Recruiter Pages
import RecruiterDashboard from "./pages/RecruiterDashboard";
import RecruiterSearch from "./pages/RecruiterSearch";
import RecruiterShortlist from "./pages/RecruiterShortlist";
import RecruiterTests from "./pages/RecruiterTests";
import RecruiterMicroGigs from "./pages/RecruiterMicroGigs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes (DO NOT TOUCH HOME PAGE) */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/login/student" element={<LoginStudent />} />
            <Route path="/login/college" element={<LoginCollege />} />
            <Route path="/login/recruiter" element={<LoginRecruiter />} />
            <Route path="/signup/student" element={<SignupStudent />} />
            <Route path="/signup/college" element={<SignupCollege />} />
            <Route path="/signup/recruiter" element={<SignupRecruiter />} />
            <Route path="/admin/institutions" element={<AdminInstitutions />} />

            {/* Student Role Routes */}
            <Route
              path="/student/dashboard"
              element={
                <RequireAuth role="student">
                  <StudentDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/student/profile"
              element={
                <RequireAuth role="student">
                  <StudentProfile />
                </RequireAuth>
              }
            />
            <Route
              path="/student/microgigs"
              element={
                <RequireAuth role="student">
                  <StudentMicroGigs />
                </RequireAuth>
              }
            />
            <Route
              path="/student/wallet"
              element={
                <RequireAuth role="student">
                  <StudentWallet />
                </RequireAuth>
              }
            />
            <Route
              path="/student/leaderboard"
              element={
                <RequireAuth role="student">
                  <StudentLeaderboard />
                </RequireAuth>
              }
            />
            <Route
              path="/student/events"
              element={
                <RequireAuth role="student">
                  <StudentEvents />
                </RequireAuth>
              }
            />
            <Route
              path="/student/placements"
              element={
                <RequireAuth role="student">
                  <StudentPlacements />
                </RequireAuth>
              }
            />
            <Route
              path="/student/communities"
              element={
                <RequireAuth role="student">
                  <StudentCommunities />
                </RequireAuth>
              }
            />
            <Route
              path="/student/clubs"
              element={
                <RequireAuth role="student">
                  <StudentClubs />
                </RequireAuth>
              }
            />
            <Route
              path="/student/chat"
              element={
                <RequireAuth role="student">
                  <StudentChat />
                </RequireAuth>
              }
            />
            <Route
              path="/student/marketplace"
              element={
                <RequireAuth role="student">
                  <StudentMarketplace />
                </RequireAuth>
              }
            />
            <Route
              path="/student/competitions"
              element={
                <RequireAuth role="student">
                  <StudentCompetitions />
                </RequireAuth>
              }
            />

            {/* College / Faculty Role Routes */}
            <Route
              path="/college/dashboard"
              element={
                <RequireAuth role="faculty">
                  <CollegeDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/college/verification"
              element={
                <RequireAuth role="faculty">
                  <CollegeVerification />
                </RequireAuth>
              }
            />
            <Route
              path="/college/analytics"
              element={
                <RequireAuth role="faculty">
                  <CollegeAnalytics />
                </RequireAuth>
              }
            />
            <Route
              path="/college/notices"
              element={
                <RequireAuth role="faculty">
                  <CollegeNotices />
                </RequireAuth>
              }
            />
            <Route
              path="/college/communities"
              element={
                <RequireAuth role="faculty">
                  <CollegeCommunities />
                </RequireAuth>
              }
            />
            <Route
              path="/college/events"
              element={
                <RequireAuth role="faculty">
                  <CollegeEvents />
                </RequireAuth>
              }
            />
            <Route
              path="/college/recruiters"
              element={
                <RequireAuth role="faculty">
                  <CollegeRecruiters />
                </RequireAuth>
              }
            />
            <Route
              path="/college/clubs-approvals"
              element={
                <RequireAuth role="faculty">
                  <CollegeClubsApprovals />
                </RequireAuth>
              }
            />
            <Route
              path="/college/marketplace-moderation"
              element={
                <RequireAuth role="faculty">
                  <CollegeMarketplaceMod />
                </RequireAuth>
              }
            />

            {/* Recruiter Role Routes */}
            <Route
              path="/recruiter/dashboard"
              element={
                <RequireAuth role="recruiter">
                  <RecruiterDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/recruiter/search"
              element={
                <RequireAuth role="recruiter">
                  <RecruiterSearch />
                </RequireAuth>
              }
            />
            <Route
              path="/recruiter/shortlist"
              element={
                <RequireAuth role="recruiter">
                  <RecruiterShortlist />
                </RequireAuth>
              }
            />
            <Route
              path="/recruiter/tests"
              element={
                <RequireAuth role="recruiter">
                  <RecruiterTests />
                </RequireAuth>
              }
            />
            <Route
              path="/recruiter/microgigs"
              element={
                <RequireAuth role="recruiter">
                  <RecruiterMicroGigs />
                </RequireAuth>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
