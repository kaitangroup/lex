import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout, PageHeader, PageContent } from "@/components/Layout";
import { RYGPie } from "@/components/RYGPie";
import { milestoneWarn, deadlineWarn, ryGCounts, daysUntil, WARN_DOT, Warn } from "@/lib/warnings";
import { useCurrentUser } from "@/lib/currentUser";
import type {
  Milestone,
  Deadline,
  Communication,
  Ticket,
  Case,
  CourtFiling,
  FirmSettings,
  Staff,
} from "@shared/schema";
import {
  Mail,
  LifeBuoy,
  Briefcase,
  Calendar as CalendarIcon,
  Gavel,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  Scale,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export default function ParalegalHome() {
  const { staffId } = useCurrentUser();
  const { data: settings } = useQuery<FirmSettings>({ queryKey: ["/api/settings"] });
  const { data: milestones = [] } = useQuery<Milestone[]>({ queryKey: ["/api/milestones"] });
  const { data: deadlines = [] } = useQuery<Deadline[]>({ queryKey: ["/api/deadlines"] });
  const { data: cases = [] } = useQuery<Case[]>({ queryKey: ["/api/cases"] });
  const { data: comms = [] } = useQuery<Communication[]>({ queryKey: ["/api/communications"] });
  const { data: tickets = [] } = useQuery<Ticket[]>({ queryKey: ["/api/tickets"] });
  const { data: filings = [] } = useQuery<CourtFiling[]>({ queryKey: ["/api/court-watch"] });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });

  const me = staff.find((s) => s.id === staffId);

  if (!settings || !me) {
    return (
      <Layout>
        <PageContent><div className="text-muted-foreground p-8">Loading…</div></PageContent>
      </Layout>
    );
  }

  // Cases I'm assigned to (paralegal supports a case if listed in teamIds)
  const myCases = cases.filter((c) => c.teamIds?.includes(staffId));
  const myCaseIds = new Set(myCases.map((c) => c.id));

  // Deadlines I maintain — assigned to me OR on a case I support
  const myDeadlines = deadlines.filter(
    (d) => d.status !== "completed" && (d.assigneeId === staffId || myCaseIds.has(d.caseId)),
  );
  const dlCounts = ryGCounts(myDeadlines, (d) => deadlineWarn(d, settings));

  // Milestones on my cases I should monitor
  const myCaseMilestones = milestones.filter(
    (m) => m.status !== "complete" && myCaseIds.has(m.caseId),
  );
  const msCounts = ryGCounts(myCaseMilestones, (m) => milestoneWarn(m, settings));

  // Hearings on my cases in next 30 days
  const myHearings = milestones.filter(
    (m) => myCaseIds.has(m.caseId) &&
      (m.kind === "hearing" || m.kind === "mediation") &&
      m.status !== "complete",
  );
  const hearingsNext30 = myHearings.filter((h) => {
    const d = daysUntil(h.dueDate);
    return d >= -1 && d <= 30;
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Comms triage queue — needs response, on my cases
  const triageQueue = comms.filter(
    (c) => c.status === "needs_response" && myCaseIds.has(c.caseId),
  );
  // Sort by oldest first / response due
  const triageSorted = [...triageQueue].sort((a, b) => {
    const ad = a.responseDueAt ? new Date(a.responseDueAt).getTime() : Infinity;
    const bd = b.responseDueAt ? new Date(b.responseDueAt).getTime() : Infinity;
    return ad - bd;
  });

  // Tickets on my cases that are open
  const myTickets = tickets.filter(
    (t) => myCaseIds.has(t.caseId) && (t.status === "open" || t.status === "in_progress"),
  );

  // Court watch new filings (unread/new)
  const newFilings = filings.filter((f) => f.status === "new");

  // Comms breakdown by channel for chart
  const channelCounts: Record<string, number> = {};
  for (const c of triageQueue) {
    channelCounts[c.channel] = (channelCounts[c.channel] ?? 0) + 1;
  }
  const channelData = Object.entries(channelCounts).map(([k, v]) => ({
    name: k,
    value: v,
  }));
  const CHANNEL_COLORS = ["hsl(var(--destructive))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--primary))"];

  const caseById = (id: string) => cases.find((c) => c.id === id);

  // Today greeting
  const now = new Date();
  const greet = now.getHours() < 12 ? "morning" : now.getHours() < 18 ? "afternoon" : "evening";

  return (
    <Layout>
      <PageHeader
        title={`Good ${greet}, ${me.name.split(" ")[0]}`}
        subtitle={`${me.title} · ${myCases.length} cases · ${myDeadlines.length} open deadlines`}
      />
      <PageContent>
        {/* ===== Top tiles ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <Link href="/deadlines" className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-1">
              <CalendarIcon className="w-3.5 h-3.5" /> Deadlines I maintain
            </div>
            <div className="flex items-center gap-3">
              <div className="w-[64px] h-[64px]">
                <RYGPie red={dlCounts.red} yellow={dlCounts.yellow} green={dlCounts.green} size={64} />
              </div>
              <div className="text-[11px]">
                <div className="text-destructive font-semibold">{dlCounts.red} red</div>
                <div className="text-warning font-semibold">{dlCounts.yellow} yellow</div>
                <div className="text-success font-semibold">{dlCounts.green} green</div>
              </div>
            </div>
          </Link>

          <Link href="/comms" className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-2">
              <Mail className="w-3.5 h-3.5" /> Comms triage
            </div>
            <div className="text-2xl font-semibold tabular-nums">{triageQueue.length}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Awaiting your routing</div>
          </Link>

          <Link href="/tickets" className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-2">
              <LifeBuoy className="w-3.5 h-3.5" /> Open tickets
            </div>
            <div className="text-2xl font-semibold tabular-nums">{myTickets.length}</div>
            <div className="text-[11px] text-muted-foreground mt-1">On your cases</div>
          </Link>

          <Link href="/court-watch" className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-2">
              <TrendingUp className="w-3.5 h-3.5" /> New filings
            </div>
            <div className="text-2xl font-semibold tabular-nums">{newFilings.length}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Awaiting review</div>
          </Link>
        </div>

        {/* ===== Two column: comms queue + deadlines ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          {/* Communications queue */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" /> Communications to triage
              </h3>
              <Link href="/comms" className="text-[12px] text-primary hover:underline flex items-center gap-1">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {triageSorted.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">Inbox is clear.</div>
            ) : (
              <ul className="divide-y">
                {triageSorted.slice(0, 6).map((c) => {
                  const cs = caseById(c.caseId);
                  const overdue = c.responseDueAt && new Date(c.responseDueAt) < new Date();
                  return (
                    <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        c.priority === "urgent" ? "bg-destructive" :
                        c.priority === "high" ? "bg-warning" : "bg-muted-foreground"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{c.subject}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {c.fromName}{c.fromOrg ? ` · ${c.fromOrg}` : ""} · {cs?.shortName ?? cs?.caption ?? "—"}
                        </div>
                      </div>
                      <div className="text-right text-[11px]">
                        <div className="text-muted-foreground capitalize">{c.channel}</div>
                        {c.responseDueAt && (
                          <div className={overdue ? "text-destructive font-semibold" : "text-muted-foreground"}>
                            {overdue ? "overdue" : `due ${new Date(c.responseDueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="px-4 py-2 text-[10px] text-muted-foreground border-t bg-muted/30">
              You triage; assign to lawyer for substantive response.
            </div>
          </div>

          {/* My deadlines */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" /> Deadlines on my cases
              </h3>
              <Link href="/deadlines" className="text-[12px] text-primary hover:underline flex items-center gap-1">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {myDeadlines.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">All clear.</div>
            ) : (
              <ul className="divide-y">
                {myDeadlines
                  .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                  .slice(0, 6)
                  .map((d) => {
                    const w = deadlineWarn(d, settings);
                    const cs = caseById(d.caseId);
                    const days = daysUntil(d.dueDate);
                    return (
                      <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${WARN_DOT[w]}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{d.title}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{cs?.shortName ?? cs?.caption ?? "—"}</div>
                        </div>
                        <div className={`text-right text-[11px] tabular-nums ${w === "red" ? "text-destructive font-semibold" : w === "yellow" ? "text-warning font-semibold" : "text-muted-foreground"}`}>
                          {days < 0 ? `${Math.ceil(-days)}d over` : days < 1 ? "today" : `in ${Math.floor(days)}d`}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
            <div className="px-4 py-2 text-[10px] text-muted-foreground border-t bg-muted/30">
              You input dates · Lawyer does the work.
            </div>
          </div>
        </div>

        {/* ===== Hearings + Cases ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Gavel className="w-4 h-4 text-primary" /> Upcoming hearings on my cases
              </h3>
              <Link href="/hearings" className="text-[12px] text-primary hover:underline flex items-center gap-1">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {hearingsNext30.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">None in next 30 days.</div>
            ) : (
              <ul className="divide-y">
                {hearingsNext30.slice(0, 5).map((h) => {
                  const cs = caseById(h.caseId);
                  const w = milestoneWarn(h, settings);
                  const lawyer = staff.find((s) => s.id === h.assigneeId);
                  return (
                    <li key={h.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${WARN_DOT[w]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{h.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {cs?.shortName ?? cs?.caption ?? "—"}{lawyer ? ` · ${lawyer.name.split(" ")[0]} ${lawyer.name.split(" ")[1]?.[0] ?? ""}.` : ""}
                        </div>
                      </div>
                      <div className="text-right text-[11px] tabular-nums">
                        <div className={w === "red" ? "text-destructive font-semibold" : ""}>
                          {new Date(h.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* My cases */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" /> My cases
              </h3>
              <Link href="/cases" className="text-[12px] text-primary hover:underline flex items-center gap-1">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {myCases.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">No cases assigned.</div>
            ) : (
              <ul className="divide-y">
                {myCases.slice(0, 6).map((c) => {
                  const lawyer = staff.find((s) => s.id === c.leadAttorneyId);
                  const caseMs = milestones.filter((m) => m.caseId === c.id && m.status !== "complete");
                  const counts = ryGCounts(caseMs, (m) => milestoneWarn(m, settings));
                  const worstWarn: Warn = counts.red ? "red" : counts.yellow ? "yellow" : "green";
                  return (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${WARN_DOT[worstWarn]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{c.shortName ?? c.caption}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {c.client} · Lead: {lawyer?.name.split(" ")[0]}
                        </div>
                      </div>
                      <div className="text-right text-[11px] tabular-nums">
                        <span className="text-destructive">{counts.red}</span>
                        <span className="text-muted-foreground mx-0.5">/</span>
                        <span className="text-warning">{counts.yellow}</span>
                        <span className="text-muted-foreground mx-0.5">/</span>
                        <span className="text-success">{counts.green}</span>
                      </div>
                    </Link>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ===== Court watch + tickets ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Court watch — new filings
              </h3>
              <Link href="/court-watch" className="text-[12px] text-primary hover:underline flex items-center gap-1">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {newFilings.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">No new filings.</div>
            ) : (
              <ul className="divide-y">
                {newFilings.slice(0, 5).map((f) => (
                  <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-2 h-2 rounded-full shrink-0 bg-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{f.caption}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {f.court} · {new Date(f.filedDate).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-primary font-semibold">{f.category.replace("_", " ")}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="px-4 py-2 text-[10px] text-muted-foreground border-t bg-muted/30">
              You log new filings daily. Margaret routes the keepers.
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-primary" /> Open client tickets
              </h3>
              <Link href="/tickets" className="text-[12px] text-primary hover:underline flex items-center gap-1">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {myTickets.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">No open tickets.</div>
            ) : (
              <ul className="divide-y">
                {myTickets.slice(0, 5).map((t) => {
                  const tone = t.severity === "critical" ? "bg-destructive" :
                    t.severity === "high" ? "bg-warning" : "bg-muted-foreground";
                  const overdue = new Date(t.slaDueAt) < new Date();
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${tone}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{t.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{t.clientName}</div>
                      </div>
                      <div className={`text-right text-[11px] tabular-nums ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                        {overdue ? "SLA over" : `due ${new Date(t.slaDueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Owned-by reference */}
        <div className="rounded-lg border bg-muted/30 p-3 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">You own:</span>
          {" "}case milestones, court deadlines, hearing dates, comms triage, court watch logging, ticket intake.
          {" "}
          <span className="font-medium text-foreground">Lawyers own:</span>
          {" "}their time estimates, R/Y/G status, hours logged.
          {" "}
          <span className="font-medium text-foreground">Bookkeeper owns:</span>
          {" "}invoicing, A/R, financials.
        </div>
      </PageContent>
    </Layout>
  );
}
