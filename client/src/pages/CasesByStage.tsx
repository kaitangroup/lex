import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout, PageHeader, PageContent } from "@/components/Layout";
import { milestoneWarn, WARN_DOT } from "@/lib/warnings";
import { fmtMoney, stageLabel } from "@/lib/format";
import { AlertTriangle } from "lucide-react";
import type { Case, Milestone, FirmSettings, Staff } from "@shared/schema";

const STAGES: Case["stage"][] = [
  "intake", "pleadings", "discovery", "motion_practice", "mediation", "trial_prep", "trial", "post_trial",
];

export default function CasesByStagePage() {
  const { data: settings } = useQuery<FirmSettings>({ queryKey: ["/api/settings"] });
  const { data: cases = [] } = useQuery<Case[]>({ queryKey: ["/api/cases"] });
  const { data: milestones = [] } = useQuery<Milestone[]>({ queryKey: ["/api/milestones"] });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });

  const staffById = useMemo(() => Object.fromEntries(staff.map((s) => [s.id, s])), [staff]);

  if (!settings) {
    return <Layout><PageContent><div className="p-8 text-muted-foreground">Loading…</div></PageContent></Layout>;
  }

  // Roll case health from milestones
  function caseWorst(caseId: string): "red" | "yellow" | "green" {
    const ms = milestones.filter((m) => m.caseId === caseId && m.status !== "complete");
    let worst: "red" | "yellow" | "green" = "green";
    for (const m of ms) {
      const w = milestoneWarn(m, settings!);
      if (w === "red") return "red";
      if (w === "yellow") worst = "yellow";
    }
    return worst;
  }

  const active = cases.filter((c) => c.stage !== "closed");
  const byStage: Record<string, Case[]> = {};
  for (const s of STAGES) byStage[s] = [];
  for (const c of active) (byStage[c.stage] ||= []).push(c);

  return (
    <Layout>
      <PageHeader title="Cases by Stage" subtitle={`${active.length} active matters across ${STAGES.length} stages`} />
      <PageContent>
        <div className="overflow-x-auto">
          <div className="flex gap-3 min-w-max pb-4" style={{ minWidth: "100%" }}>
            {STAGES.map((s) => {
              const list = byStage[s] || [];
              const reds = list.filter((c) => caseWorst(c.id) === "red").length;
              return (
                <div key={s} className="w-[280px] shrink-0 rounded-lg bg-muted/30 border flex flex-col">
                  <div className="px-3 py-2.5 border-b flex items-center justify-between bg-card rounded-t-lg">
                    <h3 className="text-[12px] font-semibold uppercase tracking-wider">
                      {stageLabel(s)}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px]">
                      {reds > 0 && (
                        <span className="inline-flex items-center gap-1 text-destructive font-semibold">
                          <span className="w-2 h-2 rounded-full bg-destructive" /> {reds}
                        </span>
                      )}
                      <span className="text-muted-foreground tabular">{list.length}</span>
                    </div>
                  </div>
                  <div className="p-2 space-y-2 min-h-[80px]">
                    {list.map((c) => {
                      const w = caseWorst(c.id);
                      const lead = staffById[c.leadAttorneyId];
                      const accent = w === "red" ? "border-l-destructive" : w === "yellow" ? "border-l-warning" : "border-l-success";
                      return (
                        <Link key={c.id} href={`/cases/${c.id}`}>
                          <div className={`rounded-md bg-card border border-l-4 ${accent} p-2.5 hover:shadow-sm cursor-pointer`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`w-2 h-2 rounded-full ${WARN_DOT[w]}`} />
                              {c.priority === "emergency" && (
                                <AlertTriangle className="w-3 h-3 text-destructive" />
                              )}
                              {c.priority === "urgent" && (
                                <span className="text-[9px] font-semibold uppercase tracking-wider text-warning">Urgent</span>
                              )}
                            </div>
                            <div className="font-semibold text-[12.5px] leading-tight truncate">{c.client}</div>
                            <div className="text-[10.5px] text-muted-foreground truncate mt-0.5">
                              {c.shortName}
                            </div>
                            <div className="flex items-center justify-between mt-2 text-[10.5px]">
                              <div className="flex items-center gap-1">
                                <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[8.5px] font-semibold">
                                  {lead?.initials}
                                </div>
                                <span className="text-muted-foreground truncate max-w-[80px]">
                                  {lead?.name?.split(" ").slice(-1)[0]}
                                </span>
                              </div>
                              <span className="tabular text-muted-foreground">{fmtMoney(c.wipBalance)}</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                    {list.length === 0 && (
                      <div className="text-center text-[11px] text-muted-foreground py-4">
                        No matters
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </PageContent>
    </Layout>
  );
}
