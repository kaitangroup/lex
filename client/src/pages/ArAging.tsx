import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout, PageHeader, PageContent } from "@/components/Layout";
import { Pill } from "@/components/StatusPill";
import { RYGPie } from "@/components/RYGPie";
import { invoiceWarn, ryGCounts, daysUntil, WARN_DOT } from "@/lib/warnings";
import { fmtMoney, fmtMoneyExact, fmtDateShort } from "@/lib/format";
import { Wallet } from "lucide-react";
import type { Invoice, FirmSettings, Case } from "@shared/schema";

export default function ArAgingPage() {
  const { data: settings } = useQuery<FirmSettings>({ queryKey: ["/api/settings"] });
  const { data: invoices = [] } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });
  const { data: cases = [] } = useQuery<Case[]>({ queryKey: ["/api/cases"] });

  const caseById = useMemo(() => Object.fromEntries(cases.map((c) => [c.id, c])), [cases]);

  if (!settings) {
    return <Layout><PageContent><div className="p-8 text-muted-foreground">Loading…</div></PageContent></Layout>;
  }

  const open = invoices.filter((i) => i.status !== "paid" && i.status !== "draft");
  const counts = ryGCounts(open, (i) => invoiceWarn(i, settings));
  const total = open.reduce((s, i) => s + (i.amount - i.amountPaid), 0);

  // Aging buckets
  const buckets = {
    "0-29": 0,
    "30-59": 0,
    "60-89": 0,
    "90+": 0,
  };
  const bucketAmounts = { ...buckets };
  for (const inv of open) {
    const overdue = -daysUntil(inv.dueDate);
    const amt = inv.amount - inv.amountPaid;
    if (overdue < 30) { buckets["0-29"]++; bucketAmounts["0-29"] += amt; }
    else if (overdue < 60) { buckets["30-59"]++; bucketAmounts["30-59"] += amt; }
    else if (overdue < 90) { buckets["60-89"]++; bucketAmounts["60-89"] += amt; }
    else { buckets["90+"]++; bucketAmounts["90+"] += amt; }
  }

  const sorted = [...open].sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));

  return (
    <Layout>
      <PageHeader title="A/R Aging" subtitle={`${open.length} open invoices · ${fmtMoney(total)} outstanding`} />
      <PageContent className="space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border bg-card p-4 flex items-center gap-4">
            <RYGPie red={counts.red} yellow={counts.yellow} green={counts.green} size={130}
              centerLabel={fmtMoney(total)} centerSubLabel="outstanding" />
            <div className="flex-1 text-[12px] space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-destructive" /> 60+ days</span>
                <span className="tabular font-semibold">{counts.red}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warning" /> 30–59 days</span>
                <span className="tabular font-semibold">{counts.yellow}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success" />{`< 30 days`}</span>
                <span className="tabular font-semibold">{counts.green}</span>
              </div>
            </div>
          </div>
          <BucketTile label="0–29 days" count={buckets["0-29"]} amount={bucketAmounts["0-29"]} tone="green" />
          <BucketTile label="30–59 days" count={buckets["30-59"]} amount={bucketAmounts["30-59"]} tone="yellow" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <BucketTile label="60–89 days" count={buckets["60-89"]} amount={bucketAmounts["60-89"]} tone="red" />
          <BucketTile label="90+ days · serious" count={buckets["90+"]} amount={bucketAmounts["90+"]} tone="red" critical />
        </div>

        {/* Invoice list */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium">Status</th>
                <th className="text-left px-3 py-2.5 font-medium">Invoice</th>
                <th className="text-left px-3 py-2.5 font-medium">Client</th>
                <th className="text-right px-3 py-2.5 font-medium">Amount</th>
                <th className="text-right px-3 py-2.5 font-medium">Paid</th>
                <th className="text-right px-3 py-2.5 font-medium">Outstanding</th>
                <th className="text-right px-4 py-2.5 font-medium">Age</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((inv) => {
                const w = invoiceWarn(inv, settings);
                const c = caseById[inv.caseId];
                const overdue = -daysUntil(inv.dueDate);
                return (
                  <tr key={inv.id} className="border-t border-border hover:bg-accent/40">
                    <td className="px-3 py-3">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${WARN_DOT[w]}`} />
                    </td>
                    <td className="px-3 py-3 font-medium tabular">{inv.number}</td>
                    <td className="px-3 py-3">
                      <Link href={`/cases/${inv.caseId}`} className="hover:text-primary">
                        <span className="block">{inv.clientName}</span>
                        <span className="text-[11px] text-muted-foreground">{c?.shortName}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right tabular">{fmtMoneyExact(inv.amount)}</td>
                    <td className="px-3 py-3 text-right tabular text-muted-foreground">{fmtMoneyExact(inv.amountPaid)}</td>
                    <td className="px-3 py-3 text-right tabular font-semibold">{fmtMoneyExact(inv.amount - inv.amountPaid)}</td>
                    <td className="px-4 py-3 text-right">
                      <Pill tone={w === "red" ? "red" : w === "yellow" ? "orange" : "green"}>
                        {overdue > 0 ? `${Math.round(overdue)}d late` : "current"}
                      </Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">No open invoices.</div>
          )}
        </div>
      </PageContent>
    </Layout>
  );
}

function BucketTile({ label, count, amount, tone, critical }: {
  label: string;
  count: number;
  amount: number;
  tone: "red" | "yellow" | "green";
  critical?: boolean;
}) {
  const colors = {
    red: "border-l-destructive text-destructive",
    yellow: "border-l-warning text-warning",
    green: "border-l-success text-success",
  };
  return (
    <div className={`rounded-lg border bg-card border-l-4 ${colors[tone].split(" ")[0]} p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <Wallet className="w-4 h-4 text-muted-foreground" />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        {critical && count > 0 && <Pill tone="red">Action</Pill>}
      </div>
      <div className={`text-2xl font-semibold tabular ${count > 0 ? colors[tone].split(" ")[1] : ""}`}>
        {fmtMoney(amount)}
      </div>
      <div className="text-[11px] text-muted-foreground tabular mt-0.5">
        {count} invoice{count === 1 ? "" : "s"}
      </div>
    </div>
  );
}
