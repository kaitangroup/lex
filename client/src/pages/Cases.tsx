import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Search } from "lucide-react";
import { Layout, PageContent, PageHeader } from "@/components/Layout";
import { Pill } from "@/components/StatusPill";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { fmtMoney, stageLabel, caseTypeLabel, daysUntil } from "@/lib/format";
import type { Case, Deadline, Staff } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function CasesPage() {
  const { data: cases = [] } = useQuery<Case[]>({ queryKey: ["/api/cases"] });
  const { data: deadlines = [] } = useQuery<Deadline[]>({ queryKey: ["/api/deadlines"] });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });

  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [lead, setLead] = useState<string>("all");

  const staffById = Object.fromEntries(staff.map((s) => [s.id, s]));
  const deadlinesByCase = useMemo(() => {
    const m = new Map<string, Deadline[]>();
    for (const d of deadlines) {
      if (!m.has(d.caseId)) m.set(d.caseId, []);
      m.get(d.caseId)!.push(d);
    }
    return m;
  }, [deadlines]);

  const filtered = cases.filter((c) => {
    if (stage !== "all" && c.stage !== stage) return false;
    if (type !== "all" && c.type !== type) return false;
    if (lead !== "all" && c.leadAttorneyId !== lead) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !c.caption.toLowerCase().includes(q) &&
        !c.client.toLowerCase().includes(q) &&
        !c.caseNumber.toLowerCase().includes(q) &&
        !c.shortName.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  return (
    <Layout>
      <PageHeader
        title="Cases"
        subtitle={`${filtered.length} of ${cases.length} matters`}
        actions={
          <Button size="sm" data-testid="button-new-case">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Case
          </Button>
        }
      />
      <PageContent>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search caption, client, case number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="w-[160px]" data-testid="select-stage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {["intake", "pleadings", "discovery", "motion_practice", "mediation", "trial_prep", "trial", "post_trial"].map((s) => (
                <SelectItem key={s} value={s}>{stageLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[200px]" data-testid="select-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="bankruptcy_avoidance">Bankruptcy / Avoidance</SelectItem>
              <SelectItem value="commercial_litigation">Commercial Litigation</SelectItem>
              <SelectItem value="real_estate">Real Estate</SelectItem>
            </SelectContent>
          </Select>
          <Select value={lead} onValueChange={setLead}>
            <SelectTrigger className="w-[180px]" data-testid="select-lead">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All attorneys</SelectItem>
              {staff.filter((s) => s.role !== "paralegal").map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Matter</th>
                <th className="text-left px-3 py-2.5 font-medium">Type</th>
                <th className="text-left px-3 py-2.5 font-medium">Stage</th>
                <th className="text-left px-3 py-2.5 font-medium">Lead</th>
                <th className="text-right px-3 py-2.5 font-medium">Next Deadline</th>
                <th className="text-right px-3 py-2.5 font-medium">Open Items</th>
                <th className="text-right px-4 py-2.5 font-medium">WIP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const ds = deadlinesByCase.get(c.id) || [];
                const next = ds
                  .filter((d) => d.status !== "completed")
                  .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))[0];
                const open = ds.filter((d) => d.status !== "completed").length;
                const overdue = ds.filter((d) => d.status === "overdue").length;
                const lead = staffById[c.leadAttorneyId];
                return (
                  <tr key={c.id} className="border-t border-border hover:bg-accent/40">
                    <td className="px-4 py-3">
                      <Link href={`/cases/${c.id}`} className="block group">
                        <div className="font-medium text-foreground group-hover:text-primary truncate max-w-[420px]">
                          {c.client}
                        </div>
                        <div className="text-[11.5px] text-muted-foreground truncate max-w-[420px]">
                          {c.shortName} · {c.caseNumber}
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[12px] text-muted-foreground">{caseTypeLabel(c.type)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Pill tone="blue">{stageLabel(c.stage)}</Pill>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold">
                          {lead?.initials}
                        </div>
                        <span className="text-[12px] truncate max-w-[120px]">{lead?.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular">
                      {next ? (
                        <span
                          className={cn(
                            "text-[12px]",
                            next.status === "overdue" && "text-destructive font-semibold",
                            next.status === "due_soon" && "text-warning font-semibold"
                          )}
                        >
                          {next.title} · {daysUntil(next.dueDate)}d
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular">
                      <span className="text-[12px]">
                        {open}
                        {overdue > 0 && <span className="text-destructive font-semibold ml-1">({overdue} late)</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular text-[12.5px] font-medium">{fmtMoney(c.wipBalance)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">No matters match your filters</div>
          )}
        </div>
      </PageContent>
    </Layout>
  );
}
