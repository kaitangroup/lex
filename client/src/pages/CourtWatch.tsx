import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout, PageHeader, PageContent } from "@/components/Layout";
import { Pill } from "@/components/StatusPill";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDateShort, fmtMoney, filingCategoryLabel } from "@/lib/format";
import { TrendingUp, Building2 } from "lucide-react";
import type { CourtFiling } from "@shared/schema";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from "recharts";

const CAT_COLORS: Record<string, string> = {
  mass_filing: "hsl(var(--destructive))",
  bankruptcy: "hsl(var(--primary))",
  commercial: "hsl(var(--warning))",
  real_estate: "hsl(var(--success))",
};

export default function CourtWatchPage() {
  const { data: filings = [] } = useQuery<CourtFiling[]>({ queryKey: ["/api/court-watch"] });
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [catFilter, setCatFilter] = useState<string>("all");

  const isActive = (s: string) => s === "new" || s === "reviewing" || s === "pursuing";
  const visible = filings.filter((f) => {
    if (statusFilter === "active" && !isActive(f.status)) return false;
    if (statusFilter !== "all" && statusFilter !== "active" && f.status !== statusFilter) return false;
    if (catFilter !== "all" && f.category !== catFilter) return false;
    return true;
  });

  // Counts by category (active only)
  const activeFilings = filings.filter((f) => isActive(f.status));
  const byCat: Record<string, number> = { mass_filing: 0, bankruptcy: 0, commercial: 0, real_estate: 0 };
  for (const f of activeFilings) byCat[f.category]++;
  const barData = (Object.keys(byCat) as Array<keyof typeof byCat>).map((k) => ({
    name: filingCategoryLabel(k),
    value: byCat[k],
    fill: CAT_COLORS[k],
    cat: k,
  }));

  // Pursuing pipeline value
  const pursuing = filings.filter((f) => f.status === "pursuing");
  const pipelineValue = pursuing.reduce((s, f) => s + (f.estimatedValue || 0), 0);

  return (
    <Layout>
      <PageHeader title="Court Watch" subtitle={`${activeFilings.length} active filings · marketing pipeline`} />
      <PageContent className="space-y-5">
        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold tracking-tight mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              New filings by category
            </h2>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                    formatter={(v: number) => [`${v} filing${v === 1 ? "" : "s"}`, ""]}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold tracking-tight mb-2">Marketing pipeline</h2>
            <div className="text-[11px] text-muted-foreground mb-3">Value of filings we are pursuing</div>
            <div className="text-3xl font-semibold tabular text-success mb-2">{fmtMoney(pipelineValue)}</div>
            <div className="space-y-1.5 text-[12px]">
              <Stat label="New" value={filings.filter((f) => f.status === "new").length} />
              <Stat label="Reviewing" value={filings.filter((f) => f.status === "reviewing").length} />
              <Stat label="Pursuing" value={pursuing.length} tone="green" />
              <Stat label="Won" value={filings.filter((f) => f.status === "won").length} tone="green" />
              <Stat label="Passed" value={filings.filter((f) => f.status === "passed").length} tone="muted" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active (new/reviewing/pursuing)</SelectItem>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="reviewing">Reviewing</SelectItem>
              <SelectItem value="pursuing">Pursuing</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="mass_filing">Mass filings</SelectItem>
              <SelectItem value="bankruptcy">Bankruptcy</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
              <SelectItem value="real_estate">Real estate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filings list */}
        <div className="space-y-2">
          {visible
            .sort((a, b) => +new Date(b.flaggedAt) - +new Date(a.flaggedAt))
            .map((f) => (
              <div key={f.id} className="rounded-lg border bg-card p-4 hover:shadow-sm transition">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CAT_COLORS[f.category] }} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {filingCategoryLabel(f.category)}
                      </span>
                      {f.groupSize > 1 && <Pill tone="orange">{f.groupSize} related filings</Pill>}
                      <Pill tone={statusTone(f.status)}>{f.status}</Pill>
                    </div>
                    <h3 className="font-semibold text-[14px] truncate">{f.caption}</h3>
                    <div className="text-[12px] text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{f.court}</span>
                      <span>Filed {fmtDateShort(f.filedDate)}</span>
                      {f.plaintiffFirm && <span>P firm: {f.plaintiffFirm}</span>}
                      {f.defendant && <span>Def: {f.defendant}</span>}
                    </div>
                  </div>
                  {f.estimatedValue !== undefined && (
                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Est. value</div>
                      <div className="text-base font-semibold tabular">{fmtMoney(f.estimatedValue)}</div>
                    </div>
                  )}
                </div>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">{f.summary}</p>
              </div>
            ))}
          {visible.length === 0 && (
            <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground text-sm">
              No filings match.
            </div>
          )}
        </div>
      </PageContent>
    </Layout>
  );
}

function statusTone(status: string): "blue" | "orange" | "green" | "gray" | "red" {
  if (status === "new") return "orange";
  if (status === "reviewing") return "blue";
  if (status === "pursuing") return "green";
  if (status === "won") return "green";
  return "gray";
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "green" | "muted" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular font-semibold ${tone === "green" ? "text-success" : tone === "muted" ? "text-muted-foreground" : ""}`}>
        {value}
      </span>
    </div>
  );
}
