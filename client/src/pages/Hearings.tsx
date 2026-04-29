import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout, PageHeader, PageContent } from "@/components/Layout";
import { Pill } from "@/components/StatusPill";
import { milestoneWarn, daysUntil, WARN_DOT } from "@/lib/warnings";
import { fmtDate, fmtDateShort, milestoneKindLabel } from "@/lib/format";
import { Gavel, Handshake, MapPin, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Milestone, FirmSettings, Case, Staff } from "@shared/schema";

export default function HearingsPage() {
  const { data: settings } = useQuery<FirmSettings>({ queryKey: ["/api/settings"] });
  const { data: milestones = [] } = useQuery<Milestone[]>({ queryKey: ["/api/milestones"] });
  const { data: cases = [] } = useQuery<Case[]>({ queryKey: ["/api/cases"] });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });

  const caseById = useMemo(() => Object.fromEntries(cases.map((c) => [c.id, c])), [cases]);
  const staffById = useMemo(() => Object.fromEntries(staff.map((s) => [s.id, s])), [staff]);

  if (!settings) {
    return <Layout><PageContent><div className="p-8 text-muted-foreground">Loading…</div></PageContent></Layout>;
  }

  const events = milestones
    .filter((m) => (m.kind === "hearing" || m.kind === "mediation") && m.status !== "complete")
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));

  // Group by month
  const groupedByMonth = new Map<string, Milestone[]>();
  for (const e of events) {
    const d = new Date(e.dueDate);
    const key = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groupedByMonth.has(key)) groupedByMonth.set(key, []);
    groupedByMonth.get(key)!.push(e);
  }

  // Compute prep readiness for each event:
  // ready = the case's analysis_memo + discovery (if exists) milestones are complete
  function prepStatus(ev: Milestone) {
    const others = milestones.filter((m) => m.caseId === ev.caseId);
    const memo = others.find((m) => m.kind === "analysis_memo");
    const discovery = others.find((m) => m.kind === "discovery");
    const memoComplete = !memo || memo.status === "complete";
    const discoveryComplete = !discovery || discovery.status === "complete";
    const days = daysUntil(ev.dueDate);
    const allReady = memoComplete && discoveryComplete;
    if (allReady) return { ready: true, label: "Prep complete" };
    if (days <= settings.hearingPrepDays) return { ready: false, label: "Behind on prep", critical: true };
    return { ready: false, label: "Prep pending", critical: false };
  }

  const next30 = events.filter((e) => {
    const d = daysUntil(e.dueDate);
    return d >= 0 && d <= 30;
  });
  const ready = next30.filter((e) => prepStatus(e).ready).length;
  const behind = next30.filter((e) => prepStatus(e).critical).length;

  return (
    <Layout>
      <PageHeader title="Hearings & Mediations" subtitle={`${events.length} scheduled · ${next30.length} in next 30 days`} />
      <PageContent className="space-y-5">
        {/* Summary tiles */}
        <div className="grid grid-cols-3 gap-3">
          <SummaryTile icon={<Gavel className="w-4 h-4" />} label="Hearings" value={events.filter((e) => e.kind === "hearing").length} />
          <SummaryTile icon={<Handshake className="w-4 h-4" />} label="Mediations" value={events.filter((e) => e.kind === "mediation").length} />
          <SummaryTile icon={<AlertTriangle className="w-4 h-4 text-destructive" />} label="Behind on prep" value={behind} tone={behind > 0 ? "red" : undefined} />
        </div>

        {/* Chronological by month */}
        <div className="space-y-5">
          {[...groupedByMonth.entries()].map(([month, list]) => (
            <div key={month}>
              <h2 className="text-[12px] font-semibold tracking-tight uppercase text-muted-foreground mb-2">{month}</h2>
              <div className="rounded-lg border bg-card overflow-hidden divide-y">
                {list.map((e) => {
                  const c = caseById[e.caseId];
                  const lawyer = staffById[e.assigneeId];
                  const prep = prepStatus(e);
                  const w = milestoneWarn(e, settings);
                  const days = Math.round(daysUntil(e.dueDate));
                  return (
                    <Link key={e.id} href={`/cases/${e.caseId}`}>
                      <div className="px-4 py-3 hover:bg-accent/40 cursor-pointer">
                        <div className="flex items-start gap-3">
                          {/* Date block */}
                          <div className="text-center shrink-0 w-12">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {new Date(e.dueDate).toLocaleDateString("en-US", { month: "short" })}
                            </div>
                            <div className="text-xl font-semibold tabular leading-tight">
                              {new Date(e.dueDate).getDate()}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(e.dueDate).toLocaleDateString("en-US", { weekday: "short" })}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`w-2 h-2 rounded-full ${WARN_DOT[w]}`} />
                              {e.kind === "hearing" ? <Gavel className="w-3.5 h-3.5 text-muted-foreground" /> : <Handshake className="w-3.5 h-3.5 text-muted-foreground" />}
                              <span className="text-[13px] font-semibold">{e.title}</span>
                              <Pill tone={e.kind === "hearing" ? "blue" : "gray"}>{milestoneKindLabel(e.kind)}</Pill>
                            </div>
                            <div className="text-[12px] text-muted-foreground truncate">
                              {c?.client} · {c?.shortName}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                              {e.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {e.location}
                                </span>
                              )}
                              {e.judge && <span>Judge {e.judge}</span>}
                              <span className="flex items-center gap-1">
                                <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[8.5px] font-semibold">
                                  {lawyer?.initials}
                                </div>
                                {lawyer?.name?.split(" ").slice(-1)[0]}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 space-y-1">
                            <div className={`text-[12px] font-semibold tabular ${days < 7 ? "text-destructive" : days < 30 ? "text-warning" : ""}`}>
                              {days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? "Today" : `In ${days}d`}
                            </div>
                            {prep.ready ? (
                              <div className="inline-flex items-center gap-1 text-[10px] text-success font-semibold uppercase tracking-wider">
                                <CheckCircle2 className="w-3 h-3" /> Ready
                              </div>
                            ) : (
                              <div className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${prep.critical ? "text-destructive" : "text-warning"}`}>
                                <AlertTriangle className="w-3 h-3" /> {prep.label}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-1" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground text-sm">
              No upcoming hearings or mediations.
            </div>
          )}
        </div>
      </PageContent>
    </Layout>
  );
}

function SummaryTile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "red" }) {
  return (
    <div className={`rounded-lg border bg-card p-4 ${tone === "red" ? "border-l-4 border-l-destructive" : ""}`}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-semibold tabular ${tone === "red" && value > 0 ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}
