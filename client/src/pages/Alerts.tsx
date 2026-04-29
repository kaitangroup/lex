import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout, PageHeader, PageContent } from "@/components/Layout";
import { RYGPie, RYGLegend } from "@/components/RYGPie";
import { milestoneWarn, deadlineWarn, invoiceWarn, ryGCounts, daysUntil } from "@/lib/warnings";
import { fmtMoney, filingCategoryLabel } from "@/lib/format";
import type {
  Milestone,
  Deadline,
  Invoice,
  Case,
  FirmSettings,
  CourtFiling,
  LawyerLoad,
  TimeEntry,
  Potential,
  MarketingProject,
  OutreachStatus,
  StaffHoursSummary,
  FirmPerformance,
  AccountabilitySummary,
  StrategicProjectSummary,
  StrategicCategory,
} from "@shared/schema";
import {
  AlertTriangle,
  Calendar,
  Gavel,
  Handshake,
  Scale,
  Wallet,
  Users,
  Briefcase,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Megaphone,
  CheckCircle2,
  Clock,
  Target,
  Rocket,
  Building2,
  ShieldCheck,
  GraduationCap,
  ClipboardList,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, Cell, AreaChart, Area, PieChart, Pie, Legend, RadialBarChart, RadialBar } from "recharts";

export default function Alerts() {
  const { data: settings } = useQuery<FirmSettings>({ queryKey: ["/api/settings"] });
  const { data: milestones = [] } = useQuery<Milestone[]>({ queryKey: ["/api/milestones"] });
  const { data: deadlines = [] } = useQuery<Deadline[]>({ queryKey: ["/api/deadlines"] });
  const { data: invoices = [] } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });
  const { data: cases = [] } = useQuery<Case[]>({ queryKey: ["/api/cases"] });
  const { data: filings = [] } = useQuery<CourtFiling[]>({ queryKey: ["/api/court-watch"] });
  const { data: capacity = [] } = useQuery<LawyerLoad[]>({ queryKey: ["/api/capacity"] });
  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({ queryKey: ["/api/time"] });
  const { data: potentials = [] } = useQuery<Potential[]>({ queryKey: ["/api/potentials"] });
  const { data: marketingProjects = [] } = useQuery<MarketingProject[]>({ queryKey: ["/api/marketing/projects"] });
  const { data: hoursSummary = [] } = useQuery<StaffHoursSummary[]>({ queryKey: ["/api/hours-summary"] });
  const { data: firmPerf } = useQuery<FirmPerformance>({ queryKey: ["/api/firm-performance"] });
  const { data: accountability } = useQuery<AccountabilitySummary>({ queryKey: ["/api/accountability-summary"] });
  const { data: strategic } = useQuery<StrategicProjectSummary>({ queryKey: ["/api/strategic-projects-summary"] });

  if (!settings) {
    return (
      <Layout>
        <PageContent><div className="text-muted-foreground p-8">Loading…</div></PageContent>
      </Layout>
    );
  }

  // ===== Milestone health =====
  const activeMilestones = milestones.filter((m) => m.status !== "complete");
  const msCounts = ryGCounts(activeMilestones, (m) => milestoneWarn(m, settings));

  // ===== Deadline health (court deadlines, hearings, mediations) =====
  const activeDeadlines = deadlines.filter((d) => d.status !== "completed");
  const dlCounts = ryGCounts(activeDeadlines, (d) => deadlineWarn(d, settings));

  // ===== Hearings & Mediations =====
  const hearings = milestones.filter(
    (m) => (m.kind === "hearing" || m.kind === "mediation") && m.status !== "complete"
  );
  const hearingsNext30 = hearings.filter((h) => {
    const d = daysUntil(h.dueDate);
    return d >= 0 && d <= 30;
  });
  const hearingsCounts = ryGCounts(hearingsNext30, (m) => milestoneWarn(m, settings));

  // ===== A/R Aging =====
  const openInvoices = invoices.filter((i) => i.status !== "paid" && i.status !== "draft");
  const arCounts = ryGCounts(openInvoices, (i) => invoiceWarn(i, settings));
  const arOutstandingTotal = openInvoices.reduce((s, i) => s + (i.amount - i.amountPaid), 0);

  // ===== Capacity =====
  const lawyers = capacity.filter((l) => l.role !== "paralegal");
  const capCounts = {
    red: lawyers.filter((l) => l.status === "overloaded").length,
    yellow: lawyers.filter((l) => l.status === "stretched").length,
    green: lawyers.filter((l) => l.status === "healthy" || l.status === "available").length,
  };
  const emergencyCount = cases.filter((c) => c.priority === "emergency" && c.stage !== "closed").length;

  // ===== New business by category =====
  const filingsByCategory: Record<string, number> = {
    mass_filing: 0, bankruptcy: 0, commercial: 0, real_estate: 0,
  };
  for (const f of filings) {
    if (f.status === "new" || f.status === "reviewing") filingsByCategory[f.category]++;
  }
  const totalNewFilings = Object.values(filingsByCategory).reduce((a, b) => a + b, 0);

  // ===== Billable hours sparkline (last 14 days) =====
  const todayMs = Date.now();
  const dailyHours: Array<{ day: string; hours: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const start = new Date(todayMs - i * 86400000);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 86400000);
    const sum = timeEntries
      .filter((t) => t.billable && new Date(t.date) >= start && new Date(t.date) < end)
      .reduce((s, t) => s + t.hours, 0);
    dailyHours.push({ day: start.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }), hours: Math.round(sum * 10) / 10 });
  }
  const billableThisWeek = dailyHours.slice(-7).reduce((s, d) => s + d.hours, 0);
  const billableLastWeek = dailyHours.slice(0, 7).reduce((s, d) => s + d.hours, 0);
  const billableDelta = billableLastWeek > 0 ? Math.round(((billableThisWeek - billableLastWeek) / billableLastWeek) * 100) : 0;

  // ===== Case health (every active case rolled up to red/yellow/green) =====
  // A case is red if it has any red milestone, yellow if any yellow but no red, else green
  const caseHealth = { red: 0, yellow: 0, green: 0 };
  const activeCases = cases.filter((c) => c.stage !== "closed");
  for (const c of activeCases) {
    const ms = milestones.filter((m) => m.caseId === c.id && m.status !== "complete");
    let worst: "green" | "yellow" | "red" = "green";
    for (const m of ms) {
      const w = milestoneWarn(m, settings);
      if (w === "red") { worst = "red"; break; }
      if (w === "yellow") worst = "yellow";
    }
    caseHealth[worst]++;
  }

  // ===== Cases by lawyer (donut) =====
  const casesByLawyer: Array<{ name: string; value: number; initials: string; fill: string }> = [];
  const palette = [
    "hsl(var(--primary))",
    "hsl(var(--success))",
    "hsl(var(--warning))",
    "hsl(var(--destructive))",
    "hsl(220 70% 55%)",
    "hsl(280 60% 55%)",
    "hsl(180 55% 45%)",
    "hsl(20 80% 55%)",
  ];
  const lawyerMap = new Map<string, { name: string; initials: string; count: number }>();
  for (const c of activeCases) {
    const lawyer = capacity.find((l) => l.staffId === c.leadAttorneyId);
    if (!lawyer) continue;
    const cur = lawyerMap.get(c.leadAttorneyId) || { name: lawyer.name, initials: lawyer.initials, count: 0 };
    cur.count++;
    lawyerMap.set(c.leadAttorneyId, cur);
  }
  let i = 0;
  for (const [id, v] of lawyerMap) {
    casesByLawyer.push({ name: v.name, initials: v.initials, value: v.count, fill: palette[i % palette.length] });
    i++;
  }

  return (
    <Layout>
      <PageHeader
        title="Today"
        subtitle="Sunday, April 26, 2026"
      />
      <PageContent className="space-y-8">
        {/* ===================================================================== */}
        {/* ZONE 1: Are we on top of our cases?                                    */}
        {/* ===================================================================== */}
        <ZoneHeader number={1} question="Are we on top of our cases?" caption="Operational R/Y/G across milestones, deadlines, hearings, capacity & A/R" />
        <section className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <SummaryPie
              href="/milestones"
              title="Milestones"
              subtitle="Internal deliverables"
              red={msCounts.red}
              yellow={msCounts.yellow}
              green={msCounts.green}
              icon={<Scale className="w-4 h-4" />}
              footnote={`${activeMilestones.length} active across ${cases.filter((c) => c.stage !== "closed").length} cases`}
            />
            <SummaryPie
              href="/deadlines"
              title="Court Deadlines"
              subtitle="Filings, motions, discovery"
              red={dlCounts.red}
              yellow={dlCounts.yellow}
              green={dlCounts.green}
              icon={<Gavel className="w-4 h-4" />}
              footnote={`${activeDeadlines.length} pending`}
            />
            <SummaryPie
              href="/hearings"
              title="Hearings & Mediations"
              subtitle="Next 30 days"
              red={hearingsCounts.red}
              yellow={hearingsCounts.yellow}
              green={hearingsCounts.green}
              icon={<Handshake className="w-4 h-4" />}
              footnote={`${hearings.length} scheduled total`}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <CaseHealthTile counts={caseHealth} total={activeCases.length} />
            <AlertsTrendTile />
            <CasesByLawyerTile data={casesByLawyer} total={activeCases.length} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <CapacityTile lawyers={lawyers} emergencyCount={emergencyCount} />
            <ARAgingTile counts={arCounts} total={arOutstandingTotal} count={openInvoices.length} />
          </div>
        </section>

        <ZoneHeader number={2} question="Is the team doing what they're supposed to do?" caption="Tasks, accountability, process compliance" />
        {accountability && (
          <section className="space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <MyAssignedTasksTile data={accountability} />
              <RecentAssignedListTile data={accountability} />
              <FirmAccountabilityRollupTile data={accountability} />
            </div>
            <PerStaffAccountabilityTile data={accountability} />
          </section>
        )}

        <ZoneHeader number={3} question="Are we growing and meeting our growth goals?" caption="New cases · net income · billable hours vs 40h goal" />
        {firmPerf && (
          <section className="space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <NewCasesSpeedometerTile data={firmPerf} />
              <NetIncomeQTile data={firmPerf} />
              <NetIncomeYTDTile data={firmPerf} />
            </div>
            <NewCasesTrendTile data={firmPerf} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <HoursVsGoalTile staff={hoursSummary} role="lawyer" />
              <HoursVsGoalTile staff={hoursSummary} role="paralegal" />
            </div>
            <PerPersonHoursBarTile staff={hoursSummary} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <PotentialsTile potentials={potentials} />
              <NewBusinessTile counts={filingsByCategory} total={totalNewFilings} />
            </div>
          </section>
        )}

        <ZoneHeader number={4} question="Am I moving the needle?" caption="My strategic projects to grow & improve the firm" />
        {strategic && (
          <section className="space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <StrategicOverallTile data={strategic} />
              <StrategicByCategoryTile data={strategic} />
              <StrategicByGoalTile data={strategic} />
            </div>
            <StrategicAtRiskListTile data={strategic} />
          </section>
        )}

        {/* drill-down quick links */}
        <section>
          <h2 className="text-[13px] font-semibold tracking-tight uppercase text-muted-foreground mb-3">Drill into</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <QuickLink href="/milestones" label="Milestones" icon={<Scale className="w-4 h-4" />} />
            <QuickLink href="/cases-by-stage" label="By stage" icon={<Briefcase className="w-4 h-4" />} />
            <QuickLink href="/capacity" label="Capacity" icon={<Users className="w-4 h-4" />} />
            <QuickLink href="/hours" label="Hours" icon={<Clock className="w-4 h-4" />} />
            <QuickLink href="/strategic" label="Strategic" icon={<Target className="w-4 h-4" />} />
            <QuickLink href="/financials" label="Financials" icon={<Wallet className="w-4 h-4" />} />
          </div>
        </section>
      </PageContent>
    </Layout>
  );
}

// =============================================================================
// Zone header
// =============================================================================

function ZoneHeader({ number, question, caption }: { number: number; question: string; caption: string }) {
  return (
    <div className="flex items-baseline gap-3 pt-2 border-t-2 border-foreground/10 -mt-2">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold tabular shrink-0">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold tracking-tight">{question}</h2>
        <p className="text-[11px] text-muted-foreground">{caption}</p>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function SummaryPie({
  href, title, subtitle, red, yellow, green, icon, footnote,
}: {
  href: string;
  title: string;
  subtitle: string;
  red: number;
  yellow: number;
  green: number;
  icon: React.ReactNode;
  footnote: string;
}) {
  const total = red + yellow + green;
  const status = red > 0 ? "red" : yellow > 0 ? "yellow" : "green";
  const accent = status === "red" ? "border-l-destructive" : status === "yellow" ? "border-l-warning" : "border-l-success";
  return (
    <Link href={href}>
      <div className={`group cursor-pointer rounded-lg border bg-card border-l-4 ${accent} p-4 hover:shadow-md hover:-translate-y-px transition-all`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{icon}</span>
            <h3 className="font-semibold text-sm tracking-tight">{title}</h3>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition" />
        </div>
        <div className="flex items-center gap-4">
          <RYGPie red={red} yellow={yellow} green={green} size={108} centerSubLabel={total === 0 ? "none" : "items"} />
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-[12px] text-muted-foreground leading-snug">{subtitle}</p>
            <RYGLegend red={red} yellow={yellow} green={green} />
            <p className="text-[11px] text-muted-foreground">{footnote}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CapacityTile({ lawyers, emergencyCount }: { lawyers: LawyerLoad[]; emergencyCount: number }) {
  return (
    <Link href="/capacity">
      <div className="group cursor-pointer rounded-lg border bg-card p-4 hover:shadow-md hover:-translate-y-px transition-all h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm tracking-tight">Lawyer capacity</h3>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition" />
        </div>
        <div className="space-y-1.5">
          {lawyers.map((l) => {
            const pct = Math.min(150, l.utilizationPct);
            const color =
              l.status === "overloaded" ? "bg-destructive" :
              l.status === "stretched" ? "bg-warning" :
              l.status === "available" ? "bg-success/60" : "bg-success";
            return (
              <div key={l.staffId} className="flex items-center gap-2 text-[12px]">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold shrink-0">
                  {l.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="truncate">{l.name}</span>
                    <span className="tabular text-[11px] text-muted-foreground shrink-0 ml-2">
                      {l.headroomHours >= 0 ? "+" : ""}{l.headroomHours.toFixed(0)}h
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden relative">
                    <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
                    {pct > 100 && (
                      <div className="absolute right-0 top-0 h-full bg-destructive" style={{ width: `${pct - 100}%`, maxWidth: "33%" }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {emergencyCount > 0 && (
          <div className="mt-3 pt-3 border-t flex items-center gap-2 text-[12px]">
            <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
            <span className="text-destructive font-medium">{emergencyCount} active emergency case{emergencyCount === 1 ? "" : "s"}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function ARAgingTile({ counts, total, count }: { counts: { red: number; yellow: number; green: number }; total: number; count: number }) {
  return (
    <Link href="/ar-aging">
      <div className="group cursor-pointer rounded-lg border bg-card p-4 hover:shadow-md hover:-translate-y-px transition-all h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm tracking-tight">A/R aging</h3>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition" />
        </div>
        <div className="flex items-center gap-4">
          <RYGPie
            red={counts.red}
            yellow={counts.yellow}
            green={counts.green}
            size={120}
            centerLabel={fmtMoney(total)}
            centerSubLabel="outstanding"
          />
          <div className="flex-1 space-y-2 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
                <span className="text-muted-foreground">60+ days</span>
              </span>
              <span className="tabular font-semibold">{counts.red}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                <span className="text-muted-foreground">30–59 days</span>
              </span>
              <span className="tabular font-semibold">{counts.yellow}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-success" />
                <span className="text-muted-foreground">{`< 30 days`}</span>
              </span>
              <span className="tabular font-semibold">{counts.green}</span>
            </div>
            <div className="pt-1.5 border-t text-[11px] text-muted-foreground">{count} open invoices</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function BillableHoursTile({ data, thisWeek, delta }: { data: Array<{ day: string; hours: number }>; thisWeek: number; delta: number }) {
  const deltaColor = delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground";
  return (
    <Link href="/billing">
      <div className="group cursor-pointer rounded-lg border bg-card p-4 hover:shadow-md hover:-translate-y-px transition-all h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm tracking-tight">Billable hours · last 14 days</h3>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition" />
        </div>
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-2xl font-semibold tabular">{Math.round(thisWeek)}h</span>
          <span className="text-[12px] text-muted-foreground">this week</span>
          <span className={`text-[12px] tabular font-medium ${deltaColor}`}>
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} {Math.abs(delta)}%
          </span>
        </div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 9 }} interval={1} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, "auto"]} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                labelFormatter={(l) => l}
                formatter={(v: number) => [`${v}h`, "billable"]}
              />
              <Line
                type="monotone"
                dataKey="hours"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Link>
  );
}

function NewBusinessTile({ counts, total }: { counts: Record<string, number>; total: number }) {
  const data = [
    { name: "Mass filings", value: counts.mass_filing, fill: "hsl(var(--destructive))" },
    { name: "Bankruptcy", value: counts.bankruptcy, fill: "hsl(var(--primary))" },
    { name: "Commercial", value: counts.commercial, fill: "hsl(var(--warning))" },
    { name: "Real estate", value: counts.real_estate, fill: "hsl(var(--success))" },
  ];
  return (
    <Link href="/court-watch">
      <div className="group cursor-pointer rounded-lg border bg-card p-4 hover:shadow-md hover:-translate-y-px transition-all h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm tracking-tight">New business · court watch</h3>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition" />
        </div>
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-2xl font-semibold tabular">{total}</span>
          <span className="text-[12px] text-muted-foreground">new filings to review</span>
        </div>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                formatter={(v: number) => [`${v} filing${v === 1 ? "" : "s"}`, ""]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Link>
  );
}

function CaseHealthTile({ counts, total }: { counts: { red: number; yellow: number; green: number }; total: number }) {
  const redPct = total > 0 ? Math.round((counts.red / total) * 100) : 0;
  const yellowPct = total > 0 ? Math.round((counts.yellow / total) * 100) : 0;
  return (
    <Link href="/cases">
      <div className="group cursor-pointer rounded-lg border bg-card p-4 hover:shadow-md hover:-translate-y-px transition-all h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm tracking-tight">All cases health</h3>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition" />
        </div>
        <div className="flex items-center gap-4">
          <RYGPie
            red={counts.red}
            yellow={counts.yellow}
            green={counts.green}
            size={130}
            centerLabel={`${total}`}
            centerSubLabel="active cases"
          />
          <div className="flex-1 space-y-2 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
                <span>Has red milestone</span>
              </span>
              <span className="tabular font-semibold">{counts.red} <span className="text-muted-foreground font-normal">· {redPct}%</span></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                <span>Has yellow milestone</span>
              </span>
              <span className="tabular font-semibold">{counts.yellow} <span className="text-muted-foreground font-normal">· {yellowPct}%</span></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-success" />
                <span>All green</span>
              </span>
              <span className="tabular font-semibold">{counts.green}</span>
            </div>
            <div className="pt-1.5 border-t text-[11px] text-muted-foreground">
              {redPct + yellowPct}% of cases need attention
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function AlertsTrendTile() {
  const { data: history = [] } = useQuery<Array<{ date: string; red: number; yellow: number; total: number }>>({
    queryKey: ["/api/alerts-history"],
  });
  const data = history.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
    red: d.red,
    yellow: d.yellow,
  }));
  const peak = Math.max(...history.map((d) => d.total), 1);
  const today = history.length > 0 ? history[history.length - 1] : { red: 0, yellow: 0 };
  return (
    <div className="rounded-lg border bg-card p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm tracking-tight">Alerts · last 30 days</h3>
        </div>
      </div>
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-2xl font-semibold tabular text-destructive">{today.red}</span>
        <span className="text-[12px] text-muted-foreground">red today</span>
        <span className="text-2xl font-semibold tabular text-warning ml-2">{today.yellow}</span>
        <span className="text-[12px] text-muted-foreground">yellow</span>
      </div>
      <div className="text-[10px] text-muted-foreground mb-2">Peak this month: {peak}</div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="yellowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={20} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
            />
            <Area
              type="monotone"
              dataKey="yellow"
              stackId="1"
              stroke="hsl(var(--warning))"
              fill="url(#yellowGrad)"
              strokeWidth={1.5}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="red"
              stackId="1"
              stroke="hsl(var(--destructive))"
              fill="url(#redGrad)"
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CasesByLawyerTile({ data, total }: { data: Array<{ name: string; value: number; initials: string; fill: string }>; total: number }) {
  return (
    <Link href="/team">
      <div className="group cursor-pointer rounded-lg border bg-card p-4 hover:shadow-md hover:-translate-y-px transition-all h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm tracking-tight">Cases by lawyer</h3>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition" />
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" style={{ width: 130, height: 130 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={42}
                  outerRadius={62}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                  formatter={(v: number, _n: any, p: any) => [`${v} case${v === 1 ? "" : "s"}`, p.payload.name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-xl font-semibold tabular leading-none">{total}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">cases</div>
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            {data
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((d) => (
                <div key={d.initials} className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
                  <span className="truncate flex-1">{d.name}</span>
                  <span className="tabular font-semibold">{d.value}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href}>
      <div className="cursor-pointer rounded-md border bg-card hover:bg-accent hover:border-foreground/20 px-3 py-2.5 flex items-center gap-2 text-[13px] transition">
        {icon}
        <span className="truncate">{label}</span>
      </div>
    </Link>
  );
}

function PotentialsTile({ potentials }: { potentials: Potential[] }) {
  // Active potentials = not declined
  const active = potentials.filter((p) => p.outreachStatus !== "declined");
  const statusToWarn = (s: OutreachStatus): "red" | "yellow" | "green" => {
    if (s === "none") return "red";
    if (s === "sent") return "yellow";
    return "green";
  };
  const counts = {
    red: active.filter((p) => statusToWarn(p.outreachStatus) === "red").length,
    yellow: active.filter((p) => statusToWarn(p.outreachStatus) === "yellow").length,
    green: active.filter((p) => statusToWarn(p.outreachStatus) === "green").length,
  };
  const totalValue = active.reduce((s, p) => s + (p.estimatedValue || 0), 0);
  const accent = counts.red > 0 ? "border-l-destructive" : counts.yellow > 0 ? "border-l-warning" : "border-l-success";
  return (
    <Link href="/potentials">
      <div className={`group cursor-pointer rounded-lg border bg-card border-l-4 ${accent} p-4 hover:shadow-md hover:-translate-y-px transition-all h-full`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm tracking-tight">Potentials</h3>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition" />
        </div>
        <div className="flex items-center gap-4">
          <RYGPie red={counts.red} yellow={counts.yellow} green={counts.green} size={108} centerSubLabel="open" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-[12px] text-muted-foreground leading-snug">
              High-value & specific-type filings
            </p>
            <RYGLegend red={counts.red} yellow={counts.yellow} green={counts.green} />
            <div className="text-[11px] text-muted-foreground pt-1">
              <span className="font-semibold tabular text-foreground">{fmtMoney(totalValue)}</span>{" "}pipeline
            </div>
            {counts.red > 0 && (
              <div className="text-[11px] text-destructive font-semibold">
                {counts.red} need first outreach
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function MarketingTile({ projects }: { projects: MarketingProject[] }) {
  const projectWarn = (p: MarketingProject): "red" | "yellow" | "green" => {
    if (p.status === "launched" || p.status === "cancelled") return "green";
    const now = Date.now();
    if (new Date(p.dueDate).getTime() < now) return "red";
    for (const m of p.milestones) {
      if (!m.completed && new Date(m.dueDate).getTime() < now) return "red";
    }
    if (p.status === "on_hold") return "red";
    const total = p.milestones.length || 1;
    const done = p.milestones.filter((m) => m.completed).length;
    const progressPct = done / total;
    const startMs = new Date(p.startDate).getTime();
    const dueMs = new Date(p.dueDate).getTime();
    const elapsedPct = Math.max(0, Math.min(1, (now - startMs) / Math.max(1, dueMs - startMs)));
    if (progressPct < elapsedPct - 0.2) return "yellow";
    return "green";
  };
  const active = projects.filter((p) => p.status !== "launched" && p.status !== "cancelled");
  const counts = {
    red: active.filter((p) => projectWarn(p) === "red").length,
    yellow: active.filter((p) => projectWarn(p) === "yellow").length,
    green: active.filter((p) => projectWarn(p) === "green").length,
  };
  const launched = projects.filter((p) => p.status === "launched").length;
  const accent = counts.red > 0 ? "border-l-destructive" : counts.yellow > 0 ? "border-l-warning" : "border-l-success";
  return (
    <Link href="/marketing">
      <div className={`group cursor-pointer rounded-lg border bg-card border-l-4 ${accent} p-4 hover:shadow-md hover:-translate-y-px transition-all h-full`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm tracking-tight">Marketing projects</h3>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition" />
        </div>
        <div className="flex items-center gap-4">
          <RYGPie red={counts.red} yellow={counts.yellow} green={counts.green} size={108} centerSubLabel="active" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-[12px] text-muted-foreground leading-snug">
              Webinars, blogs, CLE, campaigns
            </p>
            <RYGLegend red={counts.red} yellow={counts.yellow} green={counts.green} />
            <div className="text-[11px] text-muted-foreground pt-1">
              <span className="font-semibold tabular text-success">{launched}</span>{" "}launched
            </div>
            {counts.red > 0 && (
              <div className="text-[11px] text-destructive font-semibold">
                {counts.red} off-track
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}


// =============================================================================
// ZONE 2 TILES — Accountability
// =============================================================================

function MyAssignedTasksTile({ data }: { data: AccountabilitySummary }) {
  const { myAssignedRed: red, myAssignedYellow: yellow, myAssignedGreen: green } = data;
  const accent = red > 0 ? "border-l-destructive" : yellow > 0 ? "border-l-warning" : "border-l-success";
  return (
    <div className={`rounded-lg border bg-card border-l-4 ${accent} p-4 h-full`}>
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm tracking-tight">Tasks I assigned</h3>
      </div>
      <div className="flex items-center gap-4">
        <RYGPie red={red} yellow={yellow} green={green} size={120} centerSubLabel="open" />
        <div className="flex-1 min-w-0 space-y-2 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Overdue</span>
            </span>
            <span className="tabular font-semibold">{red}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-warning" />
              <span className="text-muted-foreground">Due soon</span>
            </span>
            <span className="tabular font-semibold">{yellow}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-success" />
              <span className="text-muted-foreground">On track</span>
            </span>
            <span className="tabular font-semibold">{green}</span>
          </div>
          <div className="pt-1.5 border-t text-[11px] text-muted-foreground">
            {data.myAssignedTotal} total · {data.myAssignedOpen} open
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentAssignedListTile({ data }: { data: AccountabilitySummary }) {
  const items = data.myAssignedRecent.slice(0, 6);
  return (
    <div className="rounded-lg border bg-card p-4 h-full">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm tracking-tight">Recent tasks I delegated</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">No tasks assigned recently.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => {
            const overdue = t.daysUntilDue < 0;
            const dueSoon = t.daysUntilDue >= 0 && t.daysUntilDue <= 3;
            const dot = overdue ? "bg-destructive" : dueSoon ? "bg-warning" : "bg-success";
            const label = overdue
              ? `${Math.abs(t.daysUntilDue)}d late`
              : t.daysUntilDue === 0
              ? "today"
              : `${t.daysUntilDue}d`;
            return (
              <li key={t.id} className="flex items-start gap-2 text-[12px]">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{t.title}</div>
                  <div className="text-[10.5px] text-muted-foreground truncate">
                    {t.assigneeName} · {label}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FirmAccountabilityRollupTile({ data }: { data: AccountabilitySummary }) {
  const { reliable, watch, behind } = data;
  return (
    <div className="rounded-lg border bg-card p-4 h-full">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm tracking-tight">Firm-wide accountability</h3>
      </div>
      <div className="flex items-center gap-4">
        <RYGPie red={behind} yellow={watch} green={reliable} size={120} centerLabel={String(reliable + watch + behind)} centerSubLabel="staff" />
        <div className="flex-1 min-w-0 space-y-2 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success" /><span>Reliable</span></span>
            <span className="tabular font-semibold">{reliable}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warning" /><span>Watch</span></span>
            <span className="tabular font-semibold">{watch}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-destructive" /><span>Behind</span></span>
            <span className="tabular font-semibold">{behind}</span>
          </div>
          <div className="pt-1.5 border-t text-[11px] text-muted-foreground">
            {data.totalOverdueTasks} overdue tasks · {data.totalOpenTasks} open
          </div>
        </div>
      </div>
    </div>
  );
}

function PerStaffAccountabilityTile({ data }: { data: AccountabilitySummary }) {
  // sorted: behind first, then watch, then reliable
  const order = { behind: 0, watch: 1, reliable: 2 };
  const sorted = [...data.byStaff].sort((a, b) => order[a.status] - order[b.status]);
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm tracking-tight">Per-staff accountability</h3>
        </div>
        <div className="text-[10.5px] text-muted-foreground">Bar = task completion rate (last 30d)</div>
      </div>
      <div className="space-y-2">
        {sorted.map((s) => {
          const color =
            s.status === "behind" ? "bg-destructive" :
            s.status === "watch" ? "bg-warning" :
            "bg-success";
          const dot =
            s.status === "behind" ? "bg-destructive" :
            s.status === "watch" ? "bg-warning" :
            "bg-success";
          return (
            <div key={s.staffId} className="flex items-center gap-3 text-[12px]">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold shrink-0">
                {s.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="truncate flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                    <span className="truncate">{s.name}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">· {s.role}</span>
                  </div>
                  <div className="tabular text-[11px] text-muted-foreground shrink-0 ml-2">
                    {s.openTasks} open · {s.overdueTasks} overdue
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, s.taskCompletionRate30d)}%` }} />
                </div>
                {s.flags.length > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-1 truncate">
                    {s.flags.join(" · ")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// ZONE 3 TILES — Growth
// =============================================================================

function NewCasesSpeedometerTile({ data }: { data: FirmPerformance }) {
  // Half-donut speedometer using <Pie> with startAngle 180 → 0
  const goal = data.newCasesGoalPerMonth;
  const actual = data.newCasesThisMonth;
  const pctRaw = goal > 0 ? (actual / goal) * 100 : 0;
  const pct = Math.max(0, Math.min(150, pctRaw));
  const pctRounded = Math.round(pct);
  const color = pct >= 100 ? "hsl(var(--success))" : pct >= 70 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  // Map 0..150 -> 180..0 degrees (half circle, 150% sweep covers full half)
  // Use two-segment pie: filled portion + remainder
  const filled = pct;
  const remainder = Math.max(0, 150 - pct);
  const pieData = [
    { name: "filled", value: filled || 0.0001, fill: color },
    { name: "rest", value: remainder || 0.0001, fill: "hsl(var(--muted))" },
  ];
  return (
    <Link href="/court-watch">
      <div className="group cursor-pointer rounded-lg border bg-card p-4 hover:shadow-md hover:-translate-y-px transition-all h-full">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm tracking-tight">New cases this month</h3>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition" />
        </div>
        <div className="relative h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="95%"
                startAngle={180}
                endAngle={0}
                innerRadius={60}
                outerRadius={88}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
                isAnimationActive={false}
              >
                {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-x-0 bottom-2 flex flex-col items-center pointer-events-none">
            <div className="text-3xl font-semibold tabular leading-none" style={{ color }}>
              {actual}<span className="text-base text-muted-foreground"> / {goal}</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{pctRounded}% of goal</div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded bg-muted/40 px-2 py-1">
            <div className="text-muted-foreground text-[10px]">Last month</div>
            <div className="tabular font-semibold">{data.newCasesLastMonth}</div>
          </div>
          <div className="rounded bg-muted/40 px-2 py-1">
            <div className="text-muted-foreground text-[10px]">QTD vs LQ</div>
            <div className="tabular font-semibold">
              {data.newCasesQTD} <span className="text-muted-foreground font-normal">vs {data.newCasesLastQTD}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function NetIncomeQTile({ data }: { data: FirmPerformance }) {
  const cur = data.netIncomeQTD;
  const prev = data.netIncomeLastQ;
  const goal = data.netIncomeQuarterGoal;
  const pctOfGoal = goal > 0 ? Math.round((cur / goal) * 100) : 0;
  const delta = prev !== 0 ? Math.round(((cur - prev) / Math.abs(prev)) * 100) : 0;
  const deltaColor = delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground";
  const goalColor = pctOfGoal >= 100 ? "hsl(var(--success))" : pctOfGoal >= 70 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  return (
    <Link href="/financials">
      <div className="group cursor-pointer rounded-lg border bg-card p-4 hover:shadow-md hover:-translate-y-px transition-all h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm tracking-tight">Net income · this quarter</h3>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition" />
        </div>
        <div className="text-3xl font-semibold tabular mb-1" style={{ color: goalColor }}>{fmtMoney(cur)}</div>
        <div className="text-[12px] text-muted-foreground mb-3">
          <span className={`tabular font-semibold ${deltaColor}`}>
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} {Math.abs(delta)}%
          </span>{" "}
          vs last Q ({fmtMoney(prev)})
        </div>
        <div className="text-[11px] text-muted-foreground mb-1 flex items-center justify-between">
          <span>Quarter goal: {fmtMoney(goal)}</span>
          <span className="tabular font-semibold" style={{ color: goalColor }}>{pctOfGoal}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full transition-all" style={{ width: `${Math.min(100, pctOfGoal)}%`, background: goalColor }} />
        </div>
      </div>
    </Link>
  );
}

function NetIncomeYTDTile({ data }: { data: FirmPerformance }) {
  const cur = data.netIncomeYTD;
  const prev = data.netIncomeLastYTD;
  const goal = data.netIncomeYearGoal;
  const pctOfGoal = goal > 0 ? Math.round((cur / goal) * 100) : 0;
  const delta = prev !== 0 ? Math.round(((cur - prev) / Math.abs(prev)) * 100) : 0;
  const deltaColor = delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground";
  const goalColor = pctOfGoal >= 100 ? "hsl(var(--success))" : pctOfGoal >= 70 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  return (
    <Link href="/financials">
      <div className="group cursor-pointer rounded-lg border bg-card p-4 hover:shadow-md hover:-translate-y-px transition-all h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm tracking-tight">Net income · YTD</h3>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition" />
        </div>
        <div className="text-3xl font-semibold tabular mb-1" style={{ color: goalColor }}>{fmtMoney(cur)}</div>
        <div className="text-[12px] text-muted-foreground mb-3">
          <span className={`tabular font-semibold ${deltaColor}`}>
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} {Math.abs(delta)}%
          </span>{" "}
          vs same point last year ({fmtMoney(prev)})
        </div>
        <div className="text-[11px] text-muted-foreground mb-1 flex items-center justify-between">
          <span>Year goal: {fmtMoney(goal)}</span>
          <span className="tabular font-semibold" style={{ color: goalColor }}>{pctOfGoal}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full transition-all" style={{ width: `${Math.min(100, pctOfGoal)}%`, background: goalColor }} />
        </div>
      </div>
    </Link>
  );
}

function NewCasesTrendTile({ data }: { data: FirmPerformance }) {
  const goal = data.newCasesGoalPerMonth;
  const chartData = data.newCasesByMonth.map((m) => {
    const [y, mm] = m.month.split("-");
    const date = new Date(parseInt(y), parseInt(mm) - 1, 1);
    const fill = m.count >= goal ? "hsl(var(--success))" : m.count >= goal * 0.7 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
    return {
      label: date.toLocaleDateString("en-US", { month: "short" }),
      count: m.count,
      fill,
    };
  });
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm tracking-tight">New cases · last 12 months</h3>
        </div>
        <div className="text-[10.5px] text-muted-foreground">Goal: {goal}/month</div>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
              formatter={(v: number) => [`${v} new case${v === 1 ? "" : "s"}`, ""]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function HoursVsGoalTile({ staff, role }: { staff: StaffHoursSummary[]; role: "lawyer" | "paralegal" }) {
  // Filter: lawyers = partner+associate, paralegals = paralegal
  const filtered = staff.filter((s) =>
    role === "lawyer" ? (s.role === "partner" || s.role === "associate") : s.role === "paralegal"
  );
  const counts = { red: 0, yellow: 0, green: 0 };
  for (const s of filtered) {
    if (s.status === "under") counts.red++;
    else if (s.status === "over") counts.yellow++;
    else counts.green++;
  }
  const label = role === "lawyer" ? "Lawyers" : "Paralegals";
  const accent = counts.red > 0 ? "border-l-destructive" : counts.yellow > 0 ? "border-l-warning" : "border-l-success";
  return (
    <Link href="/hours">
      <div className={`group cursor-pointer rounded-lg border bg-card border-l-4 ${accent} p-4 hover:shadow-md hover:-translate-y-px transition-all h-full`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm tracking-tight">{label} · hours vs 40h goal</h3>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition" />
        </div>
        <div className="flex items-center gap-4">
          <RYGPie red={counts.red} yellow={counts.yellow} green={counts.green} size={120} centerLabel={String(filtered.length)} centerSubLabel={role === "lawyer" ? "lawyers" : "paralegals"} />
          <div className="flex-1 min-w-0 space-y-2 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-destructive" /><span>Under (&lt;90%)</span></span>
              <span className="tabular font-semibold">{counts.red}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warning" /><span>Over (&gt;110%)</span></span>
              <span className="tabular font-semibold">{counts.yellow}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success" /><span>On track</span></span>
              <span className="tabular font-semibold">{counts.green}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function PerPersonHoursBarTile({ staff }: { staff: StaffHoursSummary[] }) {
  const data = staff
    .filter((s) => s.role !== "bookkeeper")
    .map((s) => {
      const goalPct = s.goalPctProjected;
      const fill =
        s.status === "under" ? "hsl(var(--destructive))" :
        s.status === "over" ? "hsl(var(--warning))" :
        "hsl(var(--success))";
      return {
        name: s.initials,
        fullName: s.name,
        role: s.role,
        hours: s.weekProjected,
        pct: goalPct,
        fill,
      };
    })
    .sort((a, b) => a.pct - b.pct);
  return (
    <Link href="/hours">
      <div className="group cursor-pointer rounded-lg border bg-card p-4 hover:shadow-md hover:-translate-y-px transition-all">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm tracking-tight">Projected weekly hours · per person</h3>
          </div>
          <div className="text-[10.5px] text-muted-foreground">Bar = % of 40h goal · click for drill-down</div>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 0, bottom: 0 }}>
              <XAxis type="number" domain={[0, 150]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                formatter={(_: any, __: any, p: any) => [`${p.payload.hours.toFixed(1)}h projected · ${p.payload.pct}% of goal`, p.payload.fullName]}
              />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Link>
  );
}

// =============================================================================
// ZONE 4 TILES — Strategic Projects
// =============================================================================

const STRATEGIC_CATEGORY_LABEL: Record<StrategicCategory, string> = {
  marketing: "Marketing",
  business_dev: "Business dev",
  hiring: "Hiring",
  operations: "Operations",
  compliance: "Compliance",
  practice_area: "Practice area",
};

const STRATEGIC_CATEGORY_ICON: Record<StrategicCategory, React.ReactNode> = {
  marketing: <Megaphone className="w-3.5 h-3.5" />,
  business_dev: <Handshake className="w-3.5 h-3.5" />,
  hiring: <Users className="w-3.5 h-3.5" />,
  operations: <Building2 className="w-3.5 h-3.5" />,
  compliance: <ShieldCheck className="w-3.5 h-3.5" />,
  practice_area: <GraduationCap className="w-3.5 h-3.5" />,
};

function StrategicOverallTile({ data }: { data: StrategicProjectSummary }) {
  const accent = data.red > 0 ? "border-l-destructive" : data.yellow > 0 ? "border-l-warning" : "border-l-success";
  return (
    <Link href="/strategic">
      <div className={`group cursor-pointer rounded-lg border bg-card border-l-4 ${accent} p-4 hover:shadow-md hover:-translate-y-px transition-all h-full`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm tracking-tight">My strategic projects</h3>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition" />
        </div>
        <div className="flex items-center gap-4">
          <RYGPie red={data.red} yellow={data.yellow} green={data.green} size={120} centerLabel={String(data.totalActive)} centerSubLabel="active" />
          <div className="flex-1 min-w-0 space-y-2 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-destructive" /><span>At risk</span></span>
              <span className="tabular font-semibold">{data.red}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warning" /><span>Watch</span></span>
              <span className="tabular font-semibold">{data.yellow}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success" /><span>On track</span></span>
              <span className="tabular font-semibold">{data.green}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function StrategicByCategoryTile({ data }: { data: StrategicProjectSummary }) {
  return (
    <div className="rounded-lg border bg-card p-4 h-full">
      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm tracking-tight">By category</h3>
      </div>
      <div className="space-y-2">
        {data.byCategory.map((c) => {
          const total = c.total || 1;
          return (
            <div key={c.category}>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  {STRATEGIC_CATEGORY_ICON[c.category]}
                  <span className="text-foreground">{STRATEGIC_CATEGORY_LABEL[c.category]}</span>
                </div>
                <span className="tabular font-semibold">{c.total}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                {c.red > 0 && <div className="h-full bg-destructive" style={{ width: `${(c.red / total) * 100}%` }} />}
                {c.yellow > 0 && <div className="h-full bg-warning" style={{ width: `${(c.yellow / total) * 100}%` }} />}
                {c.green > 0 && <div className="h-full bg-success" style={{ width: `${(c.green / total) * 100}%` }} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StrategicByGoalTile({ data }: { data: StrategicProjectSummary }) {
  const goalLabel: Record<string, string> = {
    growth: "Growth",
    capacity: "Capacity",
    profitability: "Profitability",
    brand: "Brand",
    risk: "Risk",
  };
  return (
    <div className="rounded-lg border bg-card p-4 h-full">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm tracking-tight">By strategic goal</h3>
      </div>
      <div className="space-y-2">
        {data.byGoal.map((g) => {
          const total = g.total || 1;
          return (
            <div key={g.goal}>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="text-foreground">{goalLabel[g.goal] || g.goal}</span>
                <span className="tabular font-semibold">{g.total}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                {g.red > 0 && <div className="h-full bg-destructive" style={{ width: `${(g.red / total) * 100}%` }} />}
                {g.yellow > 0 && <div className="h-full bg-warning" style={{ width: `${(g.yellow / total) * 100}%` }} />}
                {g.green > 0 && <div className="h-full bg-success" style={{ width: `${(g.green / total) * 100}%` }} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StrategicAtRiskListTile({ data }: { data: StrategicProjectSummary }) {
  // Show worst 6: red first, then yellow
  const sortKey = (p: typeof data.atRisk[number]) => (p.redMs > 0 ? 0 : p.yellowMs > 0 ? 1 : 2) * 10000 - p.daysUntilDue;
  const sorted = [...data.atRisk].sort((a, b) => sortKey(a) - sortKey(b)).slice(0, 6);
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm tracking-tight">Strategic projects at risk</h3>
        </div>
        <Link href="/strategic">
          <span className="text-[11px] text-primary hover:underline cursor-pointer">View all →</span>
        </Link>
      </div>
      {sorted.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">All strategic projects are on track.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((p) => {
            const dot = p.redMs > 0 ? "bg-destructive" : p.yellowMs > 0 ? "bg-warning" : "bg-success";
            const dueLabel = p.daysUntilDue < 0
              ? `${Math.abs(p.daysUntilDue)}d overdue`
              : p.daysUntilDue === 0
              ? "due today"
              : `${p.daysUntilDue}d left`;
            return (
              <div key={p.id} className="flex items-start gap-2 p-2 rounded-md border bg-card">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-[13px] truncate">{p.title}</div>
                    <div className="text-[10.5px] text-muted-foreground tabular shrink-0">{p.pctComplete}% · {dueLabel}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    {STRATEGIC_CATEGORY_ICON[p.category]}
                    <span>{STRATEGIC_CATEGORY_LABEL[p.category]}</span>
                    <span>·</span>
                    <span className="truncate">{p.ownerName}</span>
                  </div>
                  {p.expectedImpact && (
                    <div className="text-[11px] mt-1 italic text-muted-foreground truncate">
                      Impact: {p.expectedImpact}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
