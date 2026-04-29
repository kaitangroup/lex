import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CheckSquare,
  ClipboardList,
  DollarSign,
  LifeBuoy,
  Mail,
  Megaphone,
  Menu,
  Scale,
  Settings as SettingsIcon,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { Communication, Deadline, Ticket, Staff } from "@shared/schema";
import { useCurrentUser, viewRoleFor, viewRoleLabel } from "@/lib/currentUser";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ViewRole } from "@/lib/currentUser";

type NavItem = {
  href: string;
  label: string;
  icon: any;
  roles?: ViewRole[]; // omit = visible to all roles
};

const NAV: NavItem[] = [
  { href: "/", label: "Today", icon: AlertTriangle },
  { href: "/milestones", label: "Milestones", icon: Scale, roles: ["managing_partner", "lawyer", "paralegal"] },
  { href: "/cases", label: "Cases", icon: Briefcase, roles: ["managing_partner", "lawyer", "paralegal"] },
  { href: "/capacity", label: "Capacity", icon: Users, roles: ["managing_partner", "lawyer"] },
  { href: "/calendar", label: "Calendar", icon: Calendar, roles: ["managing_partner", "lawyer", "paralegal"] },
  { href: "/comms", label: "Communications", icon: Mail, roles: ["managing_partner", "lawyer", "paralegal"] },
  { href: "/tickets", label: "Tickets", icon: LifeBuoy, roles: ["managing_partner", "lawyer", "paralegal"] },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, roles: ["managing_partner", "lawyer", "paralegal"] },
  { href: "/court-watch", label: "Court watch", icon: TrendingUp, roles: ["managing_partner", "paralegal"] },
  { href: "/potentials", label: "Potentials", icon: Sparkles, roles: ["managing_partner", "lawyer"] },
  { href: "/marketing", label: "Marketing", icon: Megaphone, roles: ["managing_partner"] },
  { href: "/billing", label: "Billing", icon: DollarSign, roles: ["managing_partner", "bookkeeper"] },
  { href: "/ar-aging", label: "A/R aging", icon: DollarSign, roles: ["managing_partner", "bookkeeper"] },
  { href: "/financials", label: "Financials", icon: DollarSign, roles: ["managing_partner", "bookkeeper"] },
  { href: "/team", label: "Team", icon: Users, roles: ["managing_partner"] },
  { href: "/checklists", label: "Templates", icon: ClipboardList, roles: ["managing_partner", "paralegal"] },
  { href: "/settings", label: "Settings", icon: SettingsIcon, roles: ["managing_partner"] },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { role } = useCurrentUser();
  const visibleNav = NAV.filter((item) => !item.roles || item.roles.includes(role));

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Sidebar badge counts
  const { data: deadlines = [] } = useQuery<Deadline[]>({ queryKey: ["/api/deadlines"] });
  const { data: comms = [] } = useQuery<Communication[]>({ queryKey: ["/api/communications"] });
  const { data: tickets = [] } = useQuery<Ticket[]>({ queryKey: ["/api/tickets"] });

  const overdueCount = deadlines.filter((d) => d.status === "overdue").length;
  const dueSoonCount = deadlines.filter((d) => d.status === "due_soon").length;
  const alertsCount = overdueCount + dueSoonCount;
  const commsNeedResponse = comms.filter((c) => c.status === "needs_response").length;
  const ticketsOpen = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;

  const counts: Record<string, number> = {
    "/": alertsCount,
    "/comms": commsNeedResponse,
    "/tickets": ticketsOpen,
  };

  const SidebarInner = (
    <>
      <div className="px-4 py-4 flex items-center gap-2.5 border-b border-sidebar-border">
        <span className="text-sidebar-primary"><Logo size={24} /></span>
        <div>
          <div className="font-semibold tracking-tight text-[14px] leading-tight">Lex</div>
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Practice OS</div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto md:hidden p-1 rounded hover:bg-sidebar-accent/50 text-sidebar-foreground/70"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {visibleNav.map((item) => {
          const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
          const Icon = item.icon;
          const c = counts[item.href];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-2 rounded-md text-[13.5px] transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
              data-testid={`nav-${item.href.slice(1) || "home"}`}
            >
              <span className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </span>
              {c ? (
                <span
                  className={cn(
                    "tabular text-[10px] font-semibold px-1.5 py-0.5 rounded",
                    item.href === "/" && overdueCount > 0
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-sidebar-primary/30 text-sidebar-foreground"
                  )}
                >
                  {c}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <RoleSwitcher />
    </>
  );

  return (
    <div className="h-screen w-screen overflow-hidden text-foreground bg-background flex">
      {/* Desktop sidebar — fixed 208px */}
      <aside
        className="hidden md:flex bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-col h-full overflow-y-auto shrink-0"
        style={{ width: "208px", overscrollBehavior: "contain" }}
      >
        {SidebarInner}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside
            className="md:hidden fixed top-0 left-0 h-full w-[260px] bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col z-50 overflow-y-auto"
            style={{ overscrollBehavior: "contain" }}
          >
            {SidebarInner}
          </aside>
        </>
      )}

      {/* Main area */}
      <main
        className="flex-1 overflow-y-auto bg-background min-w-0"
        style={{ overscrollBehavior: "contain" }}
        data-testid="main-content"
      >
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 h-12 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 -ml-1.5 rounded hover:bg-muted"
            aria-label="Open menu"
            data-testid="button-open-menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sidebar-primary"><Logo size={20} /></span>
          <span className="font-semibold tracking-tight text-[14px]">Lex</span>
          {alertsCount > 0 && (
            <span className="ml-auto tabular text-[11px] font-semibold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
              {alertsCount} alerts
            </span>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="sticky top-12 md:top-0 z-20 bg-background border-b border-border px-4 md:px-8 py-3 md:py-4 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-lg md:text-xl font-semibold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-[12px] md:text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function PageContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-4 md:px-8 py-4 md:py-6 max-w-[1600px]", className)}>{children}</div>;
}

// Role switcher — lets you preview the app from any staff member's perspective.
// In v1 this is unrestricted (no auth). PIN auth comes next.
function RoleSwitcher() {
  const { staffId, setStaffId } = useCurrentUser();
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });
  const me = staff.find((s) => s.id === staffId);

  // Group staff by role for the dropdown
  const grouped = {
    partners: staff.filter((s) => s.role === "partner"),
    associates: staff.filter((s) => s.role === "associate"),
    paralegals: staff.filter((s) => s.role === "paralegal"),
    bookkeepers: staff.filter((s) => s.role === "bookkeeper"),
  };

  return (
    <div className="px-3 py-3 border-t border-sidebar-border">
      <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 px-1 mb-1.5">
        Viewing as
      </div>
      <Select value={staffId} onValueChange={setStaffId}>
        <SelectTrigger
          className="h-9 bg-sidebar-accent/40 border-sidebar-border text-sidebar-foreground text-[12px]"
          data-testid="select-role"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {grouped.partners.length > 0 && (
            <SelectGroup>
              <SelectLabel>Partners</SelectLabel>
              {grouped.partners.map((s) => (
                <SelectItem key={s.id} value={s.id} data-testid={`role-option-${s.id}`}>
                  {s.name} · {s.id === "s1" ? "Managing Partner" : "Partner"}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {grouped.associates.length > 0 && (
            <SelectGroup>
              <SelectLabel>Associates</SelectLabel>
              {grouped.associates.map((s) => (
                <SelectItem key={s.id} value={s.id} data-testid={`role-option-${s.id}`}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {grouped.paralegals.length > 0 && (
            <SelectGroup>
              <SelectLabel>Paralegals</SelectLabel>
              {grouped.paralegals.map((s) => (
                <SelectItem key={s.id} value={s.id} data-testid={`role-option-${s.id}`}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {grouped.bookkeepers.length > 0 && (
            <SelectGroup>
              <SelectLabel>Bookkeeper</SelectLabel>
              {grouped.bookkeepers.map((s) => (
                <SelectItem key={s.id} value={s.id} data-testid={`role-option-${s.id}`}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      {me && (
        <div className="text-[10px] text-sidebar-foreground/50 mt-1.5 px-1 truncate">
          {viewRoleLabel(viewRoleFor(me))} · {me.title}
        </div>
      )}
    </div>
  );
}
