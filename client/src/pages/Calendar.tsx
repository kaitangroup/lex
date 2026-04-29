import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Gavel, Target } from "lucide-react";
import { Layout, PageContent, PageHeader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Pill, urgencyTone } from "@/components/StatusPill";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import type { Case, Deadline, ScheduleBlock, Staff } from "@shared/schema";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const today = new Date("2026-04-25");
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [filter, setFilter] = useState<"all" | "court" | "internal">("all");

  const { data: deadlines = [] } = useQuery<Deadline[]>({ queryKey: ["/api/deadlines"] });
  const { data: cases = [] } = useQuery<Case[]>({ queryKey: ["/api/cases"] });
  const { data: schedule = [] } = useQuery<ScheduleBlock[]>({ queryKey: ["/api/schedule"] });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });

  const casesById = Object.fromEntries(cases.map((c) => [c.id, c]));
  const staffById = Object.fromEntries(staff.map((s) => [s.id, s]));

  // Build a 6-week grid that includes the entire current month
  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const last = endOfMonth(cursor);
    const startWeekday = first.getDay(); // 0 = Sun
    const start = new Date(first);
    start.setDate(first.getDate() - startWeekday);
    const days: Date[] = [];
    const totalDays = 42; // 6 weeks
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return { first, last, days };
  }, [cursor]);

  const filteredDeadlines = deadlines.filter((d) => filter === "all" || d.kind === filter);

  const byDate = useMemo(() => {
    const m: Record<string, { deadlines: Deadline[]; events: ScheduleBlock[] }> = {};
    for (const d of filteredDeadlines) {
      const k = d.dueDate.slice(0, 10);
      (m[k] ||= { deadlines: [], events: [] }).deadlines.push(d);
    }
    for (const e of schedule) {
      // Only show court / deposition events on the firm calendar
      if (e.kind === "court" || e.kind === "deposition") {
        const k = e.date.slice(0, 10);
        (m[k] ||= { deadlines: [], events: [] }).events.push(e);
      }
    }
    return m;
  }, [filteredDeadlines, schedule]);

  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Upcoming list — next 30 days from today
  const upcoming = useMemo(() => {
    const now = today.getTime();
    const horizon = now + 30 * 86400000;
    return filteredDeadlines
      .filter((d) => {
        const t = new Date(d.dueDate).getTime();
        return t >= now - 5 * 86400000 && t <= horizon && d.status !== "completed";
      })
      .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))
      .slice(0, 12);
  }, [filteredDeadlines]);

  return (
    <Layout>
      <PageHeader
        title="Calendar"
        subtitle="Firm-wide deadlines, hearings, and depositions"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex bg-muted rounded-md p-0.5 text-[12px]">
              {(["all", "court", "internal"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1 rounded capitalize",
                    filter === f ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
                  )}
                  data-testid={`filter-${f}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
              data-testid="button-today"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              data-testid="button-prev-month"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-sm font-medium px-2 min-w-[140px] text-center tabular">{monthLabel}</div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              data-testid="button-next-month"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        }
      />
      <PageContent>
        <div className="grid grid-cols-[1fr_320px] gap-6">
          {/* Calendar grid */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-7 bg-muted/40 border-b border-border">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 grid-rows-6">
              {grid.days.map((d, i) => {
                const inMonth = d.getMonth() === cursor.getMonth();
                const isToday = ymd(d) === ymd(today);
                const k = ymd(d);
                const items = byDate[k] || { deadlines: [], events: [] };
                const hasOverdue = items.deadlines.some((dl) => urgencyTone(dl.dueDate, dl.status === "completed") === "red");
                return (
                  <div
                    key={i}
                    className={cn(
                      "min-h-[100px] border-r border-b border-border p-1.5 flex flex-col gap-1 overflow-hidden",
                      !inMonth && "bg-muted/20",
                      (i + 1) % 7 === 0 && "border-r-0"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-[11px] tabular font-medium",
                          !inMonth && "text-muted-foreground/50",
                          isToday && "bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center"
                        )}
                      >
                        {d.getDate()}
                      </span>
                      {hasOverdue && <span className="w-1.5 h-1.5 rounded-full bg-destructive" />}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {items.events.slice(0, 2).map((e) => {
                        const c = e.caseId ? casesById[e.caseId] : undefined;
                        return (
                          <Link
                            key={e.id}
                            href={c ? `/cases/${c.id}` : "/calendar"}
                            className="text-[10px] px-1 py-0.5 rounded bg-primary/10 text-primary truncate hover:bg-primary/20"
                            title={e.title}
                          >
                            <Gavel className="w-2.5 h-2.5 inline mr-0.5" />
                            {e.title}
                          </Link>
                        );
                      })}
                      {items.deadlines.slice(0, 3).map((dl) => {
                        const tone = urgencyTone(dl.dueDate, dl.status === "completed");
                        const c = casesById[dl.caseId];
                        return (
                          <Link
                            key={dl.id}
                            href={`/cases/${dl.caseId}`}
                            className={cn(
                              "text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-1",
                              dl.status === "completed" && "line-through opacity-60",
                              tone === "red" && "bg-destructive/10 text-destructive",
                              tone === "orange" && "bg-warning/10 text-warning",
                              tone === "yellow" && "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
                              tone === "green" && "bg-success/10 text-success",
                              tone === "gray" && "bg-muted text-muted-foreground"
                            )}
                            title={`${c?.shortName || ""} — ${dl.title}`}
                          >
                            {dl.kind === "court" ? <Gavel className="w-2.5 h-2.5 shrink-0" /> : <Target className="w-2.5 h-2.5 shrink-0" />}
                            <span className="truncate">{dl.title}</span>
                          </Link>
                        );
                      })}
                      {items.deadlines.length + items.events.length > 5 && (
                        <span className="text-[10px] text-muted-foreground px-1">
                          +{items.deadlines.length + items.events.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming list */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold tracking-tight mb-3">Next 30 Days</h3>
              <div className="space-y-2">
                {upcoming.length === 0 && (
                  <div className="text-xs text-muted-foreground">Nothing on the radar.</div>
                )}
                {upcoming.map((d) => {
                  const c = casesById[d.caseId];
                  const tone = urgencyTone(d.dueDate, d.status === "completed");
                  const assignee = staffById[d.assigneeId];
                  return (
                    <Link
                      key={d.id}
                      href={`/cases/${d.caseId}`}
                      className="block px-3 py-2 rounded-md border border-border hover:bg-muted/50 transition-colors"
                      data-testid={`upcoming-${d.id}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          {fmtDate(d.dueDate)}
                        </span>
                        <Pill tone={tone}>{d.kind === "court" ? "Court" : "Internal"}</Pill>
                      </div>
                      <div className="text-[13px] font-medium leading-tight">{d.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {c?.shortName} · {assignee?.initials}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-destructive" /> Overdue
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning" /> Due in ≤ 3 days
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500" /> Due in ≤ 7 days
              </div>
              <div className="flex items-center gap-2">
                <Gavel className="w-3 h-3" /> Court deadline / hearing
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-3 h-3" /> Internal milestone
              </div>
            </div>
          </div>
        </div>
      </PageContent>
    </Layout>
  );
}
