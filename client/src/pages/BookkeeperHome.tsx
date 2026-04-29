import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout, PageHeader, PageContent } from "@/components/Layout";
import { RYGPie } from "@/components/RYGPie";
import { invoiceWarn, ryGCounts, daysUntil, WARN_DOT, Warn } from "@/lib/warnings";
import { fmtMoney, fmtMoneyExact } from "@/lib/format";
import { useCurrentUser } from "@/lib/currentUser";
import type {
  Invoice,
  TimeEntry,
  Case,
  FirmSettings,
  Staff,
} from "@shared/schema";
import {
  DollarSign,
  Wallet,
  Receipt,
  ArrowRight,
  Clock,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";

interface FinancialsMonth {
  month: string;
  billableHours: number;
  revenue: number;
  collected: number;
}

export default function BookkeeperHome() {
  const { staffId } = useCurrentUser();
  const { data: settings } = useQuery<FirmSettings>({ queryKey: ["/api/settings"] });
  const { data: invoices = [] } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });
  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({ queryKey: ["/api/time"] });
  const { data: cases = [] } = useQuery<Case[]>({ queryKey: ["/api/cases"] });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });
  const { data: trend = [] } = useQuery<FinancialsMonth[]>({ queryKey: ["/api/financials-trend"] });

  const me = staff.find((s) => s.id === staffId);

  if (!settings || !me) {
    return (
      <Layout>
        <PageContent><div className="text-muted-foreground p-8">Loading…</div></PageContent>
      </Layout>
    );
  }

  // ===== Invoices to send (drafts) =====
  const drafts = invoices.filter((i) => i.status === "draft");

  // ===== A/R aging =====
  const openInvoices = invoices.filter((i) => i.status !== "paid" && i.status !== "draft");
  const arCounts = ryGCounts(openInvoices, (i) => invoiceWarn(i, settings));
  const arOutstanding = openInvoices.reduce((s, i) => s + (i.amount - i.amountPaid), 0);

  // Top overdue clients
  const arByClient: Record<string, number> = {};
  for (const i of openInvoices) {
    if (invoiceWarn(i, settings) === "red") {
      arByClient[i.clientName] = (arByClient[i.clientName] ?? 0) + (i.amount - i.amountPaid);
    }
  }
  const topOverdue = Object.entries(arByClient)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // ===== Time entries this week to review =====
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const recentEntries = timeEntries.filter((e) => new Date(e.date) >= weekStart);
  const billableThisWeek = recentEntries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0);
  const nonBillableThisWeek = recentEntries.filter((e) => !e.billable).reduce((s, e) => s + e.hours, 0);
  const valueBillableThisWeek = recentEntries.filter((e) => e.billable).reduce((s, e) => s + e.hours * e.rate, 0);

  // Hours by lawyer this week
  const lawyerHours: Record<string, { billable: number; nonBillable: number }> = {};
  for (const e of recentEntries) {
    if (!lawyerHours[e.staffId]) lawyerHours[e.staffId] = { billable: 0, nonBillable: 0 };
    if (e.billable) lawyerHours[e.staffId].billable += e.hours;
    else lawyerHours[e.staffId].nonBillable += e.hours;
  }
  const lawyerHoursData = Object.entries(lawyerHours)
    .map(([id, h]) => {
      const s = staff.find((x) => x.id === id);
      return {
        name: s?.name.split(" ").map((p) => p[0]).join("") ?? id,
        full: s?.name ?? id,
        billable: Math.round(h.billable * 10) / 10,
        nonBillable: Math.round(h.nonBillable * 10) / 10,
      };
    })
    .sort((a, b) => b.billable - a.billable)
    .slice(0, 10);

  // ===== Trend chart formatting =====
  const trendData = trend.map((t) => {
    const [y, m] = t.month.split("-");
    const monthLabel = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: "short" });
    return {
      ...t,
      label: monthLabel,
      uncollected: Math.max(0, t.revenue - t.collected),
    };
  });
  const last3 = trendData.slice(-3);
  const totalRevenueLast3 = last3.reduce((s, t) => s + t.revenue, 0);
  const totalCollectedLast3 = last3.reduce((s, t) => s + t.collected, 0);
  const collectionRate = totalRevenueLast3 > 0 ? (totalCollectedLast3 / totalRevenueLast3) * 100 : 100;

  // ===== Recent time entries to review =====
  const lastEntries = [...timeEntries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const caseById = (id: string) => cases.find((c) => c.id === id);
  const staffById = (id: string) => staff.find((s) => s.id === id);

  const greet = now.getHours() < 12 ? "morning" : now.getHours() < 18 ? "afternoon" : "evening";

  // A/R pie data
  const arPieData = [
    { name: "Current", value: arCounts.green, color: "hsl(var(--success))" },
    { name: "Aging", value: arCounts.yellow, color: "hsl(var(--warning))" },
    { name: "Overdue", value: arCounts.red, color: "hsl(var(--destructive))" },
  ].filter((d) => d.value > 0);

  return (
    <Layout>
      <PageHeader
        title={`Good ${greet}, ${me.name.split(" ")[0]}`}
        subtitle={`Bookkeeper · ${openInvoices.length} open invoices · ${fmtMoney(arOutstanding)} outstanding`}
      />
      <PageContent>
        {/* ===== Top tiles ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <Link href="/billing" className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-2">
              <Receipt className="w-3.5 h-3.5" /> Drafts to send
            </div>
            <div className="text-2xl font-semibold tabular-nums">{drafts.length}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {fmtMoney(drafts.reduce((s, i) => s + i.amount, 0))} ready
            </div>
          </Link>

          <Link href="/ar-aging" className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-1">
              <Wallet className="w-3.5 h-3.5" /> A/R aging
            </div>
            <div className="flex items-center gap-3">
              <div className="w-[60px] h-[60px]">
                <RYGPie red={arCounts.red} yellow={arCounts.yellow} green={arCounts.green} size={60} />
              </div>
              <div className="text-[11px]">
                <div className="text-destructive font-semibold">{arCounts.red} overdue</div>
                <div className="text-warning font-semibold">{arCounts.yellow} aging</div>
                <div className="text-success font-semibold">{arCounts.green} current</div>
              </div>
            </div>
          </Link>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-2">
              <DollarSign className="w-3.5 h-3.5" /> Outstanding
            </div>
            <div className="text-2xl font-semibold tabular-nums">{fmtMoney(arOutstanding)}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Across {openInvoices.length} invoices
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-2">
              <TrendingUp className="w-3.5 h-3.5" /> 3-mo collection rate
            </div>
            <div className={`text-2xl font-semibold tabular-nums ${collectionRate >= 90 ? "text-success" : collectionRate >= 75 ? "text-warning" : "text-destructive"}`}>
              {collectionRate.toFixed(0)}%
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {fmtMoney(totalCollectedLast3)} of {fmtMoney(totalRevenueLast3)}
            </div>
          </div>
        </div>

        {/* ===== Revenue trend chart ===== */}
        <div className="rounded-lg border bg-card p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Revenue · billed vs collected
            </h3>
            <Link href="/financials" className="text-[12px] text-primary hover:underline flex items-center gap-1">
              All financials <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtMoneyExact(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line dataKey="revenue" name="Billed" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line dataKey="collected" name="Collected" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                <Line dataKey="uncollected" name="Uncollected" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="3 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ===== Two columns: hours by lawyer + top overdue ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Hours this week by lawyer
              </h3>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {billableThisWeek.toFixed(1)}h billable · {fmtMoney(valueBillableThisWeek)}
              </span>
            </div>
            <div className="h-[260px]">
              {lawyerHoursData.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">No time entries this week.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lawyerHoursData} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      labelFormatter={(label, items) => items[0]?.payload?.full ?? label}
                      formatter={(v: number, name: string) => [`${v}h`, name === "billable" ? "Billable" : "Non-billable"]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="billable" name="Billable" stackId="a" fill="hsl(var(--success))" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="nonBillable" name="Non-billable" stackId="a" fill="hsl(var(--warning))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground border-t pt-2 mt-2">
              You review and approve. Lawyers enter daily.
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" /> Top overdue clients
              </h3>
              <Link href="/ar-aging" className="text-[12px] text-primary hover:underline flex items-center gap-1">
                A/R aging <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {topOverdue.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">No overdue clients. Good week.</div>
            ) : (
              <ul className="divide-y">
                {topOverdue.map(([client, amt]) => (
                  <li key={client} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-2 h-2 rounded-full shrink-0 bg-destructive" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{client}</div>
                    </div>
                    <div className="text-right text-[12px] tabular-nums text-destructive font-semibold">
                      {fmtMoney(amt)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ===== Recent time entries to review ===== */}
        <div className="rounded-lg border bg-card mb-5">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Recent time entries
            </h3>
            <Link href="/billing" className="text-[12px] text-primary hover:underline flex items-center gap-1">
              All entries <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {lastEntries.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">No time entries yet.</div>
          ) : (
            <ul className="divide-y">
              {lastEntries.map((e) => {
                const c = caseById(e.caseId);
                const s = staffById(e.staffId);
                return (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${e.billable ? "bg-success" : "bg-warning"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{e.description}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {s?.name ?? "—"} · {c?.shortName ?? c?.caption ?? "—"} · {new Date(e.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right text-[11px] tabular-nums">
                      <div className="font-semibold">{e.hours}h</div>
                      <div className="text-muted-foreground">{e.billable ? fmtMoney(e.hours * e.rate) : "non-bill"}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="px-4 py-2 text-[10px] text-muted-foreground border-t bg-muted/30">
            Lawyers enter time. You review for accuracy and assemble invoices.
          </div>
        </div>

        {/* Owned-by reference */}
        <div className="rounded-lg border bg-muted/30 p-3 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">You own:</span>
          {" "}invoicing, A/R chasing, time-entry review and approval, financial reporting.
          {" "}
          <span className="font-medium text-foreground">Lawyers own:</span>
          {" "}entering time, milestone estimates, hours logged.
          {" "}
          <span className="font-medium text-foreground">Paralegals own:</span>
          {" "}case data, deadlines, comms.
        </div>
      </PageContent>
    </Layout>
  );
}
