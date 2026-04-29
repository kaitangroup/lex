import { useQuery } from "@tanstack/react-query";
import { Layout, PageContent, PageHeader } from "@/components/Layout";
import { Pill } from "@/components/StatusPill";
import { fmtDateShort, daysUntil } from "@/lib/format";
import type { Case, Deadline, DelegatedTask, ScheduleBlock, Staff } from "@shared/schema";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 10 }, (_, i) => i + 9); // 9-18
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const KIND_COLORS: Record<string, string> = {
  deposition: "bg-purple-500/20 border-l-purple-500 text-purple-900 dark:text-purple-200",
  court: "bg-destructive/15 border-l-destructive text-destructive",
  drafting: "bg-primary/15 border-l-primary text-primary",
  client: "bg-success/15 border-l-success text-success",
  internal: "bg-muted border-l-foreground/40 text-foreground",
  research: "bg-warning/15 border-l-warning text-warning",
};

export default function TeamPage() {
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });
  const { data: schedule = [] } = useQuery<ScheduleBlock[]>({ queryKey: ["/api/schedule"] });
  const { data: tasks = [] } = useQuery<DelegatedTask[]>({ queryKey: ["/api/tasks"] });
  const { data: deadlines = [] } = useQuery<Deadline[]>({ queryKey: ["/api/deadlines"] });
  const { data: cases = [] } = useQuery<Case[]>({ queryKey: ["/api/cases"] });

  const caseById = Object.fromEntries(cases.map((c) => [c.id, c]));

  // Build current week dates (Mon-Fri)
  const today = new Date("2026-04-25T00:00:00");
  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weekDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  return (
    <Layout>
      <PageHeader title="Team & Workload" subtitle="Schedules, deadlines, and load by attorney" />
      <PageContent>
        <div className="space-y-4">
          {staff.map((s) => {
            const sched = schedule.filter((b) => b.staffId === s.id && weekDates.includes(b.date));
            const myTasks = tasks.filter((t) => t.assigneeId === s.id && t.status !== "done");
            const myDeadlines = deadlines
              .filter((d) => d.assigneeId === s.id && d.status !== "completed")
              .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))
              .slice(0, 4);
            const overload = s.hoursThisWeek > s.capacityHours;
            const utilPct = Math.min(150, Math.round((s.hoursThisWeek / s.capacityHours) * 100));
            return (
              <div key={s.id} className="bg-card border border-card-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-[12px] font-semibold">{s.initials}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-[14px]">{s.name}</div>
                    <div className="text-[11.5px] text-muted-foreground">{s.title} · {s.caseIds.length} matters</div>
                  </div>
                  <div className="text-right">
                    <div className={cn("text-[13px] font-semibold tabular", overload && "text-destructive")}>
                      {s.hoursThisWeek}h / {s.capacityHours}h
                    </div>
                    <div className="w-32 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                      <div
                        className={cn("h-full", overload ? "bg-destructive" : utilPct > 85 ? "bg-warning" : "bg-success")}
                        style={{ width: `${Math.min(100, utilPct)}%` }}
                      />
                    </div>
                  </div>
                  {overload && <Pill tone="red">Overloaded</Pill>}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0">
                  {/* Schedule grid */}
                  <div className="p-3 overflow-x-auto">
                    <div className="min-w-[640px]">
                      <div className="grid grid-cols-[44px_repeat(5,1fr)] gap-1 text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">
                        <div></div>
                        {DAYS.map((d, i) => (
                          <div key={d} className="text-center">
                            {d} <span className="tabular text-foreground/70">{fmtDateShort(weekDates[i])}</span>
                          </div>
                        ))}
                      </div>
                      <div className="relative grid grid-cols-[44px_repeat(5,1fr)] gap-1" style={{ height: HOURS.length * 32 }}>
                        {/* hour labels */}
                        {HOURS.map((h, i) => (
                          <div key={h} className="text-[10.5px] text-muted-foreground tabular text-right pr-1" style={{ gridColumn: 1, gridRow: i + 1, height: 32 }}>
                            {h}:00
                          </div>
                        ))}
                        {/* day columns */}
                        {weekDates.map((date, di) => (
                          <div key={date} className="relative bg-muted/20 border border-border rounded" style={{ gridColumn: di + 2, gridRow: `1 / span ${HOURS.length}` }}>
                            {sched
                              .filter((b) => b.date === date)
                              .map((b) => {
                                const top = ((b.startHour - 9) / HOURS.length) * 100;
                                const height = (b.durationHours / HOURS.length) * 100;
                                const c = b.caseId ? caseById[b.caseId] : undefined;
                                return (
                                  <div
                                    key={b.id}
                                    className={cn("absolute left-0.5 right-0.5 rounded border-l-2 px-1.5 py-0.5 text-[10.5px] overflow-hidden", KIND_COLORS[b.kind])}
                                    style={{ top: `${top}%`, height: `${height}%` }}
                                    title={`${b.title}${c ? ` — ${c.client}` : ""}`}
                                  >
                                    <div className="font-semibold leading-tight truncate">{b.title}</div>
                                    {c && <div className="opacity-75 leading-tight truncate">{c.client}</div>}
                                  </div>
                                );
                              })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Side info */}
                  <div className="border-l border-border p-3 space-y-3 bg-muted/10">
                    <div>
                      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5">Next Deadlines</div>
                      <div className="space-y-1.5">
                        {myDeadlines.map((d) => (
                          <div key={d.id} className="flex items-center gap-2 text-[12px]">
                            <span className={cn("tabular text-[10.5px] px-1.5 py-0.5 rounded font-semibold",
                              daysUntil(d.dueDate) < 0 && "bg-destructive text-destructive-foreground",
                              daysUntil(d.dueDate) >= 0 && daysUntil(d.dueDate) <= 7 && "bg-warning text-warning-foreground",
                              daysUntil(d.dueDate) > 7 && "bg-muted text-foreground"
                            )}>
                              {daysUntil(d.dueDate) < 0 ? `${Math.abs(daysUntil(d.dueDate))}d late` : `${daysUntil(d.dueDate)}d`}
                            </span>
                            <span className="truncate flex-1">{d.title.replace(/^Internal:\s*/, "")}</span>
                          </div>
                        ))}
                        {myDeadlines.length === 0 && <div className="text-[11.5px] text-muted-foreground">None</div>}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5">Open Tasks ({myTasks.length})</div>
                      <div className="space-y-1.5">
                        {myTasks.slice(0, 4).map((t) => (
                          <div key={t.id} className="text-[11.5px] truncate">
                            <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1.5",
                              t.priority === "high" && "bg-destructive",
                              t.priority === "normal" && "bg-primary",
                              t.priority === "low" && "bg-muted-foreground"
                            )} />
                            {t.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PageContent>
    </Layout>
  );
}
