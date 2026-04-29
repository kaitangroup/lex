import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout, PageHeader, PageContent } from "@/components/Layout";
import { Pill, DaysBadge } from "@/components/StatusPill";
import { RYGPie, RYGLegend } from "@/components/RYGPie";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deadlineWarn, ryGCounts, WARN_DOT } from "@/lib/warnings";
import { fmtDateShort } from "@/lib/format";
import { Gavel, ChevronRight } from "lucide-react";
import type { Deadline, FirmSettings, Case, Staff } from "@shared/schema";

export default function DeadlinesPage() {
  const { data: settings } = useQuery<FirmSettings>({ queryKey: ["/api/settings"] });
  const { data: deadlines = [] } = useQuery<Deadline[]>({ queryKey: ["/api/deadlines"] });
  const { data: cases = [] } = useQuery<Case[]>({ queryKey: ["/api/cases"] });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });

  const [warnFilter, setWarnFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");

  const caseById = useMemo(() => Object.fromEntries(cases.map((c) => [c.id, c])), [cases]);
  const staffById = useMemo(() => Object.fromEntries(staff.map((s) => [s.id, s])), [staff]);

  if (!settings) {
    return <Layout><PageContent><div className="p-8 text-muted-foreground">Loading…</div></PageContent></Layout>;
  }

  const active = deadlines.filter((d) => d.status !== "completed");
  const counts = ryGCounts(active, (d) => deadlineWarn(d, settings));

  const filtered = active
    .filter((d) => warnFilter === "all" || deadlineWarn(d, settings) === warnFilter)
    .filter((d) => kindFilter === "all" || d.kind === kindFilter)
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));

  return (
    <Layout>
      <PageHeader title="Court Deadlines" subtitle={`${active.length} active`} />
      <PageContent className="space-y-5">
        <div className="rounded-lg border bg-card p-4 flex flex-wrap items-center gap-6">
          <RYGPie red={counts.red} yellow={counts.yellow} green={counts.green} size={120} centerSubLabel="active" />
          <div className="flex-1 min-w-[200px]">
            <h2 className="text-sm font-semibold tracking-tight mb-2">Court deadline health</h2>
            <RYGLegend red={counts.red} yellow={counts.yellow} green={counts.green} />
            <p className="text-[12px] text-muted-foreground mt-2">
              Filings, motions, discovery responses, and other court-imposed deadlines.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={warnFilter} onValueChange={setWarnFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="red">Red only</SelectItem>
              <SelectItem value="yellow">Yellow only</SelectItem>
              <SelectItem value="green">Green only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="court">Court</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="hearing">Hearings</SelectItem>
              <SelectItem value="mediation">Mediations</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium">Status</th>
                <th className="text-left px-3 py-2.5 font-medium">Deadline</th>
                <th className="text-left px-3 py-2.5 font-medium">Matter</th>
                <th className="text-left px-3 py-2.5 font-medium">Type</th>
                <th className="text-left px-3 py-2.5 font-medium">Owner</th>
                <th className="text-right px-3 py-2.5 font-medium">Due</th>
                <th className="text-right px-4 py-2.5 font-medium">Days</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const w = deadlineWarn(d, settings);
                const c = caseById[d.caseId];
                const owner = staffById[d.assigneeId];
                return (
                  <tr key={d.id} className="border-t border-border hover:bg-accent/40">
                    <td className="px-3 py-3">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${WARN_DOT[w]}`} />
                    </td>
                    <td className="px-3 py-3 font-medium">{d.title}</td>
                    <td className="px-3 py-3">
                      <Link href={`/cases/${d.caseId}`} className="text-foreground hover:text-primary">
                        <span className="truncate inline-block max-w-[260px]">{c?.client}</span>
                        <span className="text-[11px] text-muted-foreground ml-2">{c?.shortName}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-3"><Pill tone="gray">{d.kind}</Pill></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 text-[12px]">
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-semibold">
                          {owner?.initials}
                        </div>
                        {owner?.name?.split(" ").slice(-1)[0]}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular text-[12px]">{fmtDateShort(d.dueDate)}</td>
                    <td className="px-4 py-3 text-right">
                      <DaysBadge dueIso={d.dueDate} completed={d.status === "completed"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">No deadlines match.</div>
          )}
        </div>
      </PageContent>
    </Layout>
  );
}
