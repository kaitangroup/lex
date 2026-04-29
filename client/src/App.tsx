import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Alerts from "@/pages/Alerts";
import Home from "@/pages/Home";
import { CurrentUserProvider } from "@/lib/currentUser";
import { useQuery } from "@tanstack/react-query";
import type { Staff } from "@shared/schema";
import Cases from "@/pages/Cases";
import CaseDetail from "@/pages/CaseDetail";
import Calendar from "@/pages/Calendar";
import Team from "@/pages/Team";
import Communications from "@/pages/Communications";
import Tickets from "@/pages/Tickets";
import Tasks from "@/pages/Tasks";
import Billing from "@/pages/Billing";
import Checklists from "@/pages/Checklists";
import Milestones from "@/pages/Milestones";
import Capacity from "@/pages/Capacity";
import Hearings from "@/pages/Hearings";
import Deadlines from "@/pages/Deadlines";
import CourtWatch from "@/pages/CourtWatch";
import ArAging from "@/pages/ArAging";
import Financials from "@/pages/Financials";
import CasesByStage from "@/pages/CasesByStage";
import Settings from "@/pages/Settings";
import Potentials from "@/pages/Potentials";
import Marketing from "@/pages/Marketing";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/cases" component={Cases} />
      <Route path="/cases-by-stage" component={CasesByStage} />
      <Route path="/cases/:id" component={CaseDetail} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/team" component={Team} />
      <Route path="/comms" component={Communications} />
      <Route path="/tickets" component={Tickets} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/billing" component={Billing} />
      <Route path="/checklists" component={Checklists} />
      <Route path="/milestones" component={Milestones} />
      <Route path="/capacity" component={Capacity} />
      <Route path="/hearings" component={Hearings} />
      <Route path="/deadlines" component={Deadlines} />
      <Route path="/court-watch" component={CourtWatch} />
      <Route path="/ar-aging" component={ArAging} />
      <Route path="/financials" component={Financials} />
      <Route path="/settings" component={Settings} />
      <Route path="/potentials" component={Potentials} />
      <Route path="/marketing" component={Marketing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function StaffLoader({ children }: { children: React.ReactNode }) {
  // Loads the staff list once, then provides CurrentUserProvider downstream.
  const { data: staff = [], isLoading } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });
  if (isLoading || staff.length === 0) {
    return <div className="h-screen w-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  return <CurrentUserProvider staff={staff}>{children}</CurrentUserProvider>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <StaffLoader>
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        </StaffLoader>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
