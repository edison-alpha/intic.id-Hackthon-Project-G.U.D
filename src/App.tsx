import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { PushChainWalletProvider } from "./contexts/PushChainWalletContext";
import { EOProvider } from "./contexts/EOContext";
import BrowseEvents from "./pages/BrowseEvents";
import Dashboard from "./pages/Dashboard";
import MyTickets from "./pages/MyTickets";
import Staking from "./pages/Staking";
import Governance from "./pages/Governance";
import CreateEventNFT from "./pages/CreateEventNFT";
import EventDetail from "./pages/EventDetail";
import TicketDetail from "./pages/TicketDetail";
import Profile from "./pages/Profile";
import CreateTicket from "./pages/CreateTicket";
import Settings from "./pages/Settings";
import AttendeeCheckIn from "./pages/AttendeeCheckIn";
import EventCheckInPoint from "./pages/EventCheckInPoint";
import { AuthCallback } from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import { TestPinata } from "./pages/TestPinata";
import EOPortfolio from "./pages/EOPortfolio";
import EOProfile from "./pages/EOProfile";
import MyEventsPage from "./pages/MyEventsPage";
import CreateProfileEO from "./pages/CreateProfileEO";
import ModeTransition from "./components/ModeTransition";


const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <PushChainWalletProvider>
        <EOProvider>
          <ModeTransition />
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/app" replace />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/app" element={<BrowseEvents />} />
                <Route path="/app/portofolio" element={<Dashboard />} />
                <Route path="/app/eo-portfolio" element={<EOPortfolio />} />
                <Route path="/app/eo-profile/:id" element={<EOProfile />} />
                <Route path="/app/my-events" element={<MyEventsPage />} />
                <Route path="/app/my-tickets" element={<MyTickets />} />
                <Route path="/app/create-profile-eo" element={<CreateProfileEO />} />
                <Route path="/app/staking" element={<Staking />} />
                <Route path="/app/governance" element={<Governance />} />
                <Route path="/app/create-event" element={<CreateEventNFT />} />
                <Route path="/app/event/:id" element={<EventDetail />} />
                <Route path="/app/ticket/:id" element={<TicketDetail />} />
                <Route path="/app/profile" element={<Profile />} />
                <Route path="/app/settings" element={<Settings />} />
                <Route path="/app/check-in" element={<AttendeeCheckIn />} />
                <Route path="/app/event/:contractId/:eventId/checkin-point" element={<EventCheckInPoint />} />
                <Route path="/create-ticket" element={<CreateTicket />} />
                <Route path="/test-pinata" element={<TestPinata />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </EOProvider>
      </PushChainWalletProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
