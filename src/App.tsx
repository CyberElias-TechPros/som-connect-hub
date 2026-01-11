import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Splash from "./pages/Splash";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Library from "./pages/Library";
import ContentDetail from "./pages/ContentDetail";
import Player from "./pages/Player";
import Tools from "./pages/Tools";
import RORPlan from "./pages/RORPlan";
import Publications from "./pages/Publications";
import Community from "./pages/Community";
import QASessions from "./pages/QASessions";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Subscription from "./pages/Subscription";
import Payment from "./pages/Payment";
import Settings from "./pages/Settings";
import NotificationsSettings from "./pages/NotificationsSettings";
import Help from "./pages/Help";
import Search from "./pages/Search";
import Upload from "./pages/Upload";
import SubmissionStatus from "./pages/SubmissionStatus";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Moderation from "./pages/admin/Moderation";
import UserManagement from "./pages/admin/UserManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes without layout */}
              <Route path="/splash" element={<Splash />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/player/:id" element={<Player />} />

              {/* Routes with app layout */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/library" element={<Library />} />
                <Route path="/library/:id" element={<ContentDetail />} />
                <Route path="/tools" element={<Tools />} />
                <Route path="/tools/ror-plan" element={<RORPlan />} />
                <Route path="/publications" element={<Publications />} />
                <Route path="/community" element={<Community />} />
                <Route path="/qa" element={<QASessions />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/edit" element={<EditProfile />} />
                <Route path="/subscription" element={<Subscription />} />
                <Route path="/payment" element={<Payment />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/notifications-settings" element={<NotificationsSettings />} />
                <Route path="/help" element={<Help />} />
                <Route path="/search" element={<Search />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/submissions" element={<SubmissionStatus />} />
                
                {/* Admin routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/moderation" element={<Moderation />} />
                <Route path="/admin/users" element={<UserManagement />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
