import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout, PageHeader, PageContent } from "@/components/Layout";
import { fmtMoney } from "@/lib/format";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Invoice } from "@shared/schema";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell,
} from "recharts";

interface FinancialsTrendPoint {
  month: string;
  billableHours: number;
  revenue: number;
  collected: number;
}

export default function FinancialsPage() {
  const { data: trend = [] } = useQuery<FinancialsTrendPoint[]>({ queryKey: ["/api/financials-trend"] });
  const { data: invoices = [] } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });

  // Format months for display
  const data = useMemo(() => trend.map((p) => {
    const [y, m] = p.month.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return {
      ...p,
      label: d.toLocaleDateString("en-US", { month: "short" }),
      fullLabel: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      uncollected: p.revenue - p.collected,
    };
  }), [trend]);

  // Quarterly aggregation
  const quarters = useMemo(() => {
    const q: Record<string, { label: string; revenue: number; collected: number; hours: number }> = {};
    for (const p of trend) {
      const [y, m] = p.month.split("-").map(Number);
      const qNum = Math.floor((m - 1) / 3) + 1;
      const key = `${y}-Q${qNum}`;
      if (!q[key]) q[key] = { label: key, revenue: 0, collected: 0, hours: 0 };
      q[key].revenue += p.revenue;
      q[key].collected += p.collected;
      q[key].hours += p.billableHours;
    }
    return Object.values(q);
  }, [trend]);

  // Last 12 months totals
  const last12 = data.slice(-12);
  const prev12 = data.slice(-24, -12);
  const sum = (arr: FinancialsTrendPoint[], k: keyof FinancialsTrendPoint) =>
    arr.reduce((s, x) => s + (x[k] as number), 0);
  const revLast = sum(last12, "revenue");
  const revPrev = sum(prev12, "revenue");
  const revDelta = revPrev > 0 ? Math.round(((revLast - revPrev) / revPrev) * 100) : 0;
  const colLast = sum(last12, "collected");
  const colPrev = sum(prev12, "collected");
  const colDelta = colPrev > 0 ? Math.round(((colLast - colPrev) / colPrev) * 100) : 0;
  const hrsLast = sum(last12, "billableHours");
  const hrsPrev = sum(prev12, "billableHours");
  const hrsDelta = hrsPrev > 0 ? Math.round(((hrsLast - hrsPrev) / hrsPrev) * 100) : 0;

  // Realization: collected / revenue
  const realization = revLast > 0 ? Math.round((colLast / revLast) * 100) : 0;

  return (
    <Layout>
      <PageHeader title="Financials" subtitle="Revenue, collections, and billable hours" />
      <PageContent className="space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile label="Revenue · last 12mo" value={fmtMoney(revLast)} delta={revDelta} />
          <KpiTile label="Collected · last 12mo" value={fmtMoney(colLast)} delta={colDelta} />
          <KpiTile label="Billable hrs · last 12mo" value={`${Math.round(hrsLast)}h`} delta={hrsDelta} />
          <KpiTile label="Realization" value={`${realization}%`} />
        </div>

        {/* Revenue + Collected line over 18 months */}
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold tracking-tight mb-1">Revenue vs collected · 18 months</h2>
          <p className="text-[11px] text-muted-foreground mb-3">
            Money invoiced vs money collected, monthly
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                  tickFormatter={(v) => fmtMoney(v)}
                />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                  formatter={(v: number, n: string) => [fmtMoney(v), n === "revenue" ? "Invoiced" : "Collected"]}
                  labelFormatter={(l, p) => p?.[0]?.payload?.fullLabel || l}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="revenue" name="Invoiced"
                  stroke="hsl(var(--primary))" fill="url(#revGrad)" strokeWidth={2} isAnimationActive={false} />
                <Area type="monotone" dataKey="collected" name="Collected"
                  stroke="hsl(var(--success))" fill="url(#colGrad)" strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Billable hours bar + Quarter comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold tracking-tight mb-1">Billable hours · monthly</h2>
            <p className="text-[11px] text-muted-foreground mb-3">Total billable hours per month</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                    formatter={(v: number) => [`${v}h`, "Billable"]}
                    labelFormatter={(l, p) => p?.[0]?.payload?.fullLabel || l}
                  />
                  <Bar dataKey="billableHours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold tracking-tight mb-1">Revenue by quarter</h2>
            <p className="text-[11px] text-muted-foreground mb-3">Quarter-over-quarter trend</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quarters} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={50}
                    tickFormatter={(v) => fmtMoney(v)} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                    formatter={(v: number, n: string) => [fmtMoney(v), n === "revenue" ? "Invoiced" : "Collected"]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" name="Invoiced" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </PageContent>
    </Layout>
  );
}

function KpiTile({ label, value, delta }: { label: string; value: string; delta?: number }) {
  const Icon = delta == null ? null : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const color = delta == null ? "" : delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-semibold tabular">{value}</div>
      {delta != null && Icon && (
        <div className={`flex items-center gap-1 text-[11px] tabular ${color} mt-1`}>
          <Icon className="w-3 h-3" />
          <span>{delta > 0 ? "+" : ""}{delta}% vs previous 12mo</span>
        </div>
      )}
    </div>
  );
}
