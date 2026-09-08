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
import CollegeVerification from "./pages/CollegeVerification";
import StudentProfile from "./pages/StudentProfile";
import StudentDashboard from "./pages/StudentDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/login/student" element={<LoginStudent />} />
            <Route path="/login/college" element={<LoginCollege />} />
            <Route path="/login/recruiter" element={<LoginRecruiter />} />
            <Route path="/signup/student" element={<SignupStudent />} />
            <Route path="/signup/college" element={<SignupCollege />} />
            <Route path="/signup/recruiter" element={<SignupRecruiter />} />
            <Route path="/admin/institutions" element={<AdminInstitutions />} />
            <Route
              path="/college/verification"
              element={
                <RequireAuth role="faculty">
                  <CollegeVerification />
                </RequireAuth>
              }
            />
            <Route
              path="/college/dashboard"
              element={
                <RequireAuth role="faculty">
                  <CollegeVerification />
                </RequireAuth>
              }
            />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
