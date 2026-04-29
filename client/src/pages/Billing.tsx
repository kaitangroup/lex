import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ExternalLink } from "lucide-react";
import { Layout, PageContent, PageHeader } from "@/components/Layout";
import { Pill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtMoney } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import type { Case, Invoice, Staff, TimeEntry } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/Sparkline";

export default function BillingPage() {
  const { data: invoices = [] } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });
  const { data: cases = [] } = useQuery<Case[]>({ queryKey: ["/api/cases"] });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });
  const { data: time = [] } = useQuery<TimeEntry[]>({ queryKey: ["/api/time"] });
  const { toast } = useToast();

  const caseById = Object.fromEntries(cases.map((c) => [c.id, c]));
  const staffById = Object.fromEntries(staff.map((s) => [s.id, s]));

  const totalAR = invoices.reduce((s, i) => s + (i.amount - i.amountPaid), 0);
  const overdueAR = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + (i.amount - i.amountPaid), 0);
  const totalBilled = invoices.reduce((s, i) => s + i.amount, 0);
  const totalCollected = invoices.reduce((s, i) => s + i.amountPaid, 0);
  const totalWIP = cases.reduce((s, c) => s + c.wipBalance, 0);

  // Per-attorney billable utilization (last 30d)
  const utilByAttorney = staff
    .filter((s) => s.role !== "paralegal")
    .map((s) => {
      const entries = time.filter((t) => t.staffId === s.id);
      const billable = entries.filter((t) => t.billable).reduce((sum, t) => sum + t.hours, 0);
      const nonbillable = entries.reduce((sum, t) => sum + t.hours, 0) - billable;
      const billableValue = entries.filter((t) => t.billable).reduce((sum, t) => sum + t.hours * t.rate, 0);
      return { staff: s, billable, nonbillable, billableValue };
    })
    .sort((a, b) => b.billableValue - a.billableValue);

  // Daily revenue last 14 days for sparkline
  const days: string[] = [];
  const today = new Date("2026-04-25T00:00:00");
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const dailyRev = days.map((d) =>
    time.filter((t) => t.date === d && t.billable).reduce((s, t) => s + t.hours * t.rate, 0)
  );

  // Per-client roll-up
  type ClientRoll = { client: string; matters: number; billed: number; collected: number; outstanding: number; wip: number };
  const clientMap = new Map<string, ClientRoll>();
  for (const c of cases) {
    const r = clientMap.get(c.client) || { client: c.client, matters: 0, billed: 0, collected: 0, outstanding: 0, wip: 0 };
    r.matters++;
    r.wip += c.wipBalance;
    clientMap.set(c.client, r);
  }
  for (const i of invoices) {
    const r = clientMap.get(i.clientName);
    if (!r) continue;
    r.billed += i.amount;
    r.collected += i.amountPaid;
    if (i.status !== "paid" && i.status !== "draft") r.outstanding += i.amount - i.amountPaid;
  }
  const clients = Array.from(clientMap.values()).sort((a, b) => b.outstanding - a.outstanding);

  return (
    <Layout>
      <PageHeader
        title="Billing & Payments"
        subtitle="Firm-wide revenue, A/R, WIP, and attorney utilization"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast({ title: "Connect QuickBooks Online", description: "Link to QuickBooks to sync real invoices, payments, and customers." })}
            data-testid="button-quickbooks"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Connect QuickBooks Online
          </Button>
        }
      />
      <PageContent>
        {/* Top KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <KpiCard label="Billed YTD" value={fmtMoney(totalBilled)} />
          <KpiCard label="Collected YTD" value={fmtMoney(totalCollected)} tone="green" />
          <KpiCard label="A/R Outstanding" value={fmtMoney(totalAR)} tone={totalAR > 200_000 ? "red" : "blue"} />
          <KpiCard label="A/R Overdue" value={fmtMoney(overdueAR)} tone={overdueAR > 0 ? "red" : "green"} />
          <KpiCard label="Unbilled WIP" value={fmtMoney(totalWIP)} tone={totalWIP > 500_000 ? "orange" : "blue"} />
        </div>

        {/* Sparkline */}
        <div className="bg-card border border-card-border rounded-lg p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12.5px] font-semibold">Daily Billable Revenue (last 14 days)</span>
            <span className="text-[11.5px] text-muted-foreground tabular">
              {fmtMoney(dailyRev.reduce((s, v) => s + v, 0))} total · avg {fmtMoney(Math.round(dailyRev.reduce((s, v) => s + v, 0) / 14))}/day
            </span>
          </div>
          <Sparkline values={dailyRev} width={1100} height={48} color="hsl(var(--primary))" />
        </div>

        {/* Two-column: Attorney utilization & Client roll-up */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div className="bg-card border border-card-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border font-semibold text-[13.5px]">Attorney Utilization (30d)</div>
            <table className="w-full text-[13px]">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Attorney</th>
                  <th className="text-right px-3 py-2 font-medium">Billable</th>
                  <th className="text-right px-3 py-2 font-medium">Non-Bill</th>
                  <th className="text-right px-4 py-2 font-medium">Bill Value</th>
                </tr>
              </thead>
              <tbody>
                {utilByAttorney.map(({ staff: s, billable, nonbillable, billableValue }) => {
                  const total = billable + nonbillable;
                  const pct = total > 0 ? Math.round((billable / total) * 100) : 0;
                  return (
                    <tr key={s.id} className="border-t border-border">
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{s.name}</div>
                        <div className="text-[11px] text-muted-foreground">{s.title}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular">
                        <div>{billable.toFixed(0)}h</div>
                        <div className="text-[10.5px] text-muted-foreground">{pct}% util</div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-muted-foreground">{nonbillable.toFixed(0)}h</td>
                      <td className="px-4 py-2.5 text-right tabular font-medium">{fmtMoney(billableValue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-card border border-card-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border font-semibold text-[13.5px]">Client Roll-Up</div>
            <table className="w-full text-[13px]">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Client</th>
                  <th className="text-right px-3 py-2 font-medium">Billed</th>
                  <th className="text-right px-3 py-2 font-medium">A/R</th>
                  <th className="text-right px-4 py-2 font-medium">WIP</th>
                </tr>
              </thead>
              <tbody>
                {clients.slice(0, 14).map((c) => (
                  <tr key={c.client} className="border-t border-border">
                    <td className="px-4 py-2.5">
                      <div className="font-medium truncate max-w-[260px]">{c.client}</div>
                      <div className="text-[10.5px] text-muted-foreground">{c.matters} matters</div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular text-[12px]">{fmtMoney(c.billed)}</td>
                    <td className={cn("px-3 py-2.5 text-right tabular text-[12px]", c.outstanding > 25000 && "text-destructive font-semibold")}>
                      {fmtMoney(c.outstanding)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular text-[12px]">{fmtMoney(c.wip)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent invoices */}
        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border font-semibold text-[13.5px]">Recent Invoices</div>
          <table className="w-full text-[13px]">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Invoice</th>
                <th className="text-left px-3 py-2 font-medium">Client</th>
                <th className="text-left px-3 py-2 font-medium">Matter</th>
                <th className="text-left px-3 py-2 font-medium">Issued</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="text-right px-3 py-2 font-medium">Amount</th>
                <th className="text-right px-4 py-2 font-medium">Open</th>
              </tr>
            </thead>
            <tbody>
              {invoices.slice(0, 25).map((i) => {
                const c = caseById[i.caseId];
                return (
                  <tr key={i.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-2.5 tabular text-[12.5px]">{i.number}</td>
                    <td className="px-3 py-2.5 truncate max-w-[200px]">{i.clientName}</td>
                    <td className="px-3 py-2.5">
                      {c && <Link href={`/cases/${c.id}`} className="text-primary hover:underline text-[12px]">{c.shortName}</Link>}
                    </td>
                    <td className="px-3 py-2.5 tabular text-[11.5px] text-muted-foreground">{fmtDate(i.issueDate)}</td>
                    <td className="px-3 py-2.5">
                      <Pill tone={i.status === "paid" ? "green" : i.status === "overdue" ? "red" : i.status === "partial" ? "orange" : "blue"}>{i.status}</Pill>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular">{fmtMoney(i.amount)}</td>
                    <td className="px-4 py-2.5 text-right tabular">{fmtMoney(i.amount - i.amountPaid)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PageContent>
    </Layout>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: string; tone?: "red" | "orange" | "green" | "blue" }) {
  const accent = {
    red: "border-l-destructive text-destructive",
    orange: "border-l-warning text-warning",
    green: "border-l-success text-success",
    blue: "border-l-primary text-primary",
  } as const;
  return (
    <div className={cn("bg-card border border-card-border rounded-lg p-3.5 border-l-4", tone ? accent[tone].split(" ")[0] : "border-l-border")}>
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-2xl font-semibold mt-1.5 tabular tracking-tight", tone && accent[tone].split(" ")[1])}>{value}</div>
    </div>
  );
}
