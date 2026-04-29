import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout, PageHeader, PageContent } from "@/components/Layout";
import { Pill } from "@/components/StatusPill";
import { RYGPie, RYGLegend } from "@/components/RYGPie";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { milestoneWarn, ryGCounts, daysUntil, WARN_DOT } from "@/lib/warnings";
import { milestoneKindLabel, fmtDateShort } from "@/lib/format";
import { AlertTriangle, ChevronRight, Search, Link2 } from "lucide-react";
import type { Milestone, FirmSettings, Case, Staff } from "@shared/schema";

export default function MilestonesPage() {
  const { data: settings } = useQuery<FirmSettings>({ queryKey: ["/api/settings"] });
  const { data: milestones = [] } = useQuery<Milestone[]>({ queryKey: ["/api/milestones"] });
  const { data: cases = [] } = useQuery<Case[]>({ queryKey: ["/api/cases"] });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });

  const [search, setSearch] = useState("");
  const [warnFilter, setWarnFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const caseById = useMemo(() => Object.fromEntries(cases.map((c) => [c.id, c])), [cases]);
  const staffById = useMemo(() => Object.fromEntries(staff.map((s) => [s.id, s])), [staff]);

  if (!settings) {
    return <Layout><PageContent><div className="p-8 text-muted-foreground">Loading…</div></PageContent></Layout>;
  }

  // Active milestones only
  const active = milestones.filter((m) => m.status !== "complete");
  const counts = ryGCounts(active, (m) => milestoneWarn(m, settings));

  // Detect dependency violations: a milestone is in_progress/complete but a dependency is incomplete
  const msById = new Map(milestones.map((m) => [m.id, m]));
  const dependencyViolations = new Set<string>();
  for (const m of milestones) {
    if (m.status === "not_started") continue;
    for (const depId of m.dependsOnIds) {
      const dep = msById.get(depId);
      if (dep && dep.status !== "complete") {
        dependencyViolations.add(m.id);
        break;
      }
    }
  }

  // Apply filters
  const filtered = active.filter((m) => {
    const w = milestoneWarn(m, settings);
    if (warnFilter !== "all" && w !== warnFilter) return false;
    if (kindFilter !== "all" && m.kind !== kindFilter) return false;
    if (assigneeFilter !== "all" && m.assigneeId !== assigneeFilter) return false;
    if (search) {
      const c = caseById[m.caseId];
      const q = search.toLowerCase();
      if (!m.title.toLowerCase().includes(q) && !c?.client.toLowerCase().includes(q) && !c?.shortName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Group by case
  const groupedByCase = new Map<string, Milestone[]>();
  for (const m of filtered) {
    if (!groupedByCase.has(m.caseId)) groupedByCase.set(m.caseId, []);
    groupedByCase.get(m.caseId)!.push(m);
  }
  // Sort cases by worst milestone first
  const orderedCases = [...groupedByCase.entries()]
    .map(([cid, ms]) => {
      const worst = ms.reduce((acc, m) => {
        const w = milestoneWarn(m, settings);
        if (w === "red") return "red" as const;
        if (w === "yellow" && acc !== "red") return "yellow" as const;
        return acc;
      }, "green" as "red" | "yellow" | "green");
      return { caseId: cid, ms: ms.sort((a, b) => a.sequence - b.sequence), worst };
    })
    .sort((a, b) => {
      const order = { red: 0, yellow: 1, green: 2 };
      return order[a.worst] - order[b.worst];
    });

  const lawyers = staff.filter((s) => s.role !== "paralegal");

  return (
    <Layout>
      <PageHeader title="Milestones" subtitle={`${active.length} active across ${groupedByCase.size} cases`} />
      <PageContent className="space-y-5">
        {/* Summary header — pie + counts */}
        <div className="rounded-lg border bg-card p-4 flex flex-wrap items-center gap-6">
          <RYGPie red={counts.red} yellow={counts.yellow} green={counts.green} size={120} centerSubLabel="active" />
          <div className="flex-1 min-w-[200px]">
            <h2 className="text-sm font-semibold tracking-tight mb-2">Firm-wide milestone health</h2>
            <RYGLegend red={counts.red} yellow={counts.yellow} green={counts.green} />
            <p className="text-[12px] text-muted-foreground mt-2">
              Spine sequence: <span className="text-foreground">info gathering → analysis memo → position statement → discovery → hearings/mediations</span>
            </p>
          </div>
          {dependencyViolations.size > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 text-[12px] text-destructive flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5" />
              <span className="font-semibold">{dependencyViolations.size}</span> dependency violations
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search milestone, client, case…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-milestone-search"
            />
          </div>
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
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All kinds</SelectItem>
              <SelectItem value="info_gathering">Info gathering</SelectItem>
              <SelectItem value="analysis_memo">Analysis memo</SelectItem>
              <SelectItem value="position_statement">Position statement</SelectItem>
              <SelectItem value="discovery">Discovery</SelectItem>
              <SelectItem value="hearing">Hearings</SelectItem>
              <SelectItem value="mediation">Mediations</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lawyers</SelectItem>
              {lawyers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Cases grouped */}
        <div className="space-y-4">
          {orderedCases.map(({ caseId, ms, worst }) => {
            const c = caseById[caseId];
            if (!c) return null;
            const accent = worst === "red" ? "border-l-destructive" : worst === "yellow" ? "border-l-warning" : "border-l-success";
            return (
              <div key={caseId} className={`rounded-lg border bg-card border-l-4 ${accent} overflow-hidden`}>
                <Link href={`/cases/${caseId}`}>
                  <div className="px-4 py-3 flex items-start justify-between border-b hover:bg-accent/40 cursor-pointer">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{c.client}</div>
                      <div className="text-[11.5px] text-muted-foreground truncate">{c.shortName} · {c.caseNumber}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                </Link>
                <div className="divide-y">
                  {ms.map((m) => {
                    const w = milestoneWarn(m, settings);
                    const lawyer = staffById[m.assigneeId];
                    const adjusted = m.estimatedHours * (lawyer?.estimateRatio || 1);
                    const violation = dependencyViolations.has(m.id);
                    const days = Math.round(daysUntil(m.dueDate));
                    return (
                      <div key={m.id} className="px-4 py-3 flex flex-wrap items-center gap-3 hover:bg-accent/30">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${WARN_DOT[w]}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-medium">{m.title}</span>
                            <Pill tone="gray">{milestoneKindLabel(m.kind)}</Pill>
                            {m.status === "blocked" && <Pill tone="red">Blocked</Pill>}
                            {m.status === "in_progress" && <Pill tone="blue">In progress</Pill>}
                            {violation && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-destructive font-semibold uppercase tracking-wider">
                                <Link2 className="w-3 h-3" /> Dep violation
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Due {fmtDateShort(m.dueDate)} · {days < 0 ? `${Math.abs(days)}d late` : days === 0 ? "today" : `in ${days}d`}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[11.5px] tabular">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold">
                              {lawyer?.initials || "—"}
                            </div>
                            <span className="text-muted-foreground hidden sm:inline">{lawyer?.name?.split(" ").slice(-1)[0]}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Estimate</div>
                            <div className="font-semibold">{m.estimatedHours.toFixed(0)}h</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Adjusted</div>
                            <div className={`font-semibold ${adjusted > m.estimatedHours * 1.2 ? "text-warning" : ""}`}>
                              {adjusted.toFixed(0)}h
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Logged</div>
                            <div className="font-semibold">{m.hoursLogged.toFixed(0)}h</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {orderedCases.length === 0 && (
            <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground text-sm">
              No milestones match these filters.
            </div>
          )}
        </div>
      </PageContent>
    </Layout>
  );
}
