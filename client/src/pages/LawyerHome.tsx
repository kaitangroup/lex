import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout, PageHeader, PageContent } from "@/components/Layout";
import { RYGPie, RYGLegend } from "@/components/RYGPie";
import { milestoneWarn, deadlineWarn, ryGCounts, daysUntil, WARN_BG, WARN_DOT, Warn } from "@/lib/warnings";
import { fmtMoney } from "@/lib/format";
import { useCurrentUser } from "@/lib/currentUser";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type {
  Milestone,
  Deadline,
  Case,
  FirmSettings,
  Staff,
  TimeEntry,
  Potential,
  MilestoneStatus,
} from "@shared/schema";
import {
  Scale,
  Gavel,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  ArrowRight,
  Pencil,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function statusIcon(s: MilestoneStatus) {
  if (s === "complete") return <CheckCircle2 className="w-4 h-4 text-success" />;
  if (s === "blocked") return <AlertCircle className="w-4 h-4 text-destructive" />;
  if (s === "in_progress") return <Clock className="w-4 h-4 text-warning" />;
  return <PauseCircle className="w-4 h-4 text-muted-foreground" />;
}

function statusLabel(s: MilestoneStatus) {
  return s === "in_progress" ? "In progress" : s === "not_started" ? "Not started" : s.charAt(0).toUpperCase() + s.slice(1);
}

function MilestoneEditDialog({
  milestone,
  open,
  onOpenChange,
}: {
  milestone: Milestone | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const [estimatedHours, setEstimatedHours] = useState<string>(
    milestone?.estimatedHours?.toString() ?? "",
  );
  const [hoursLogged, setHoursLogged] = useState<string>(
    milestone?.hoursLogged?.toString() ?? "",
  );
  const [status, setStatus] = useState<MilestoneStatus>(milestone?.status ?? "not_started");
  const [notes, setNotes] = useState<string>(milestone?.notes ?? "");
  const [confidence, setConfidence] = useState<string>(milestone?.estimateConfidence ?? "medium");

  // re-seed when milestone changes
  useMemo(() => {
    if (milestone) {
      setEstimatedHours(milestone.estimatedHours.toString());
      setHoursLogged(milestone.hoursLogged.toString());
      setStatus(milestone.status);
      setNotes(milestone.notes ?? "");
      setConfidence(milestone.estimateConfidence ?? "medium");
    }
  }, [milestone?.id]);

  const save = useMutation({
    mutationFn: async () => {
      if (!milestone) return;
      return apiRequest("PATCH", `/api/milestones/${milestone.id}`, {
        estimatedHours: Number(estimatedHours) || 0,
        hoursLogged: Number(hoursLogged) || 0,
        status,
        notes: notes || undefined,
        estimateConfidence: confidence as "low" | "medium" | "high",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milestones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capacity"] });
      toast({ title: "Milestone updated" });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: "Failed to update", description: e.message, variant: "destructive" });
    },
  });

  if (!milestone) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{milestone.title}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Due {new Date(milestone.dueDate).toLocaleDateString()}
          </p>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="est-hours" className="text-xs">Estimated hours</Label>
              <Input
                id="est-hours"
                type="number"
                step="0.5"
                min="0"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                data-testid="input-estimated-hours"
              />
            </div>
            <div>
              <Label htmlFor="logged-hours" className="text-xs">Hours logged</Label>
              <Input
                id="logged-hours"
                type="number"
                step="0.25"
                min="0"
                value={hoursLogged}
                onChange={(e) => setHoursLogged(e.target.value)}
                data-testid="input-hours-logged"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as MilestoneStatus)}>
                <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not started</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Confidence in estimate</Label>
              <Select value={confidence} onValueChange={setConfidence}>
                <SelectTrigger data-testid="select-confidence"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="notes" className="text-xs">Notes (optional)</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Blockers, dependencies, anything Margaret should know…"
              data-testid="textarea-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending} data-testid="button-save">
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LawyerHome() {
  const { staffId } = useCurrentUser();
  const { data: settings } = useQuery<FirmSettings>({ queryKey: ["/api/settings"] });
  const { data: milestones = [] } = useQuery<Milestone[]>({ queryKey: ["/api/milestones"] });
  const { data: deadlines = [] } = useQuery<Deadline[]>({ queryKey: ["/api/deadlines"] });
  const { data: cases = [] } = useQuery<Case[]>({ queryKey: ["/api/cases"] });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });
  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({ queryKey: ["/api/time"] });
  const { data: potentials = [] } = useQuery<Potential[]>({ queryKey: ["/api/potentials"] });

  const [editing, setEditing] = useState<Milestone | null>(null);

  const me = staff.find((s) => s.id === staffId);

  if (!settings || !me) {
    return (
      <Layout>
        <PageContent><div className="text-muted-foreground p-8">Loading…</div></PageContent>
      </Layout>
    );
  }

  // ===== Slice data to ME =====
  const myMilestones = milestones.filter((m) => m.assigneeId === staffId);
  const myActive = myMilestones.filter((m) => m.status !== "complete");
  const myCases = cases.filter(
    (c) => c.leadAttorneyId === staffId || c.teamIds?.includes(staffId),
  );
  const myCaseIds = new Set(myCases.map((c) => c.id));
  const myDeadlines = deadlines.filter(
    (d) => d.status !== "completed" && (d.assigneeId === staffId || myCaseIds.has(d.caseId)),
  );
  const myHearings = myActive.filter(
    (m) => m.kind === "hearing" || m.kind === "mediation",
  );
  const myHearingsNext30 = myHearings.filter((h) => {
    const d = daysUntil(h.dueDate);
    return d >= -1 && d <= 30;
  });
  const myPotentials = potentials.filter((p) => p.ownerId === staffId);

  // ===== R/Y/G milestone counts =====
  const msCounts = ryGCounts(myActive, (m) => milestoneWarn(m, settings));

  // ===== Stale estimates =====
  const stale = myActive.filter((m) => {
    if (!m.estimateUpdatedAt) return true;
    const days = (Date.now() - new Date(m.estimateUpdatedAt).getTime()) / 86400000;
    return days > settings.estimateStaleDays;
  });

  // ===== Time this week =====
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday
  weekStart.setHours(0, 0, 0, 0);
  const myTimeThisWeek = timeEntries.filter(
    (e) => e.staffId === staffId && new Date(e.date) >= weekStart,
  );
  const billableHours = myTimeThisWeek.reduce((s, e) => s + (e.billable ? e.hours : 0), 0);
  const nonBillableHours = myTimeThisWeek.reduce((s, e) => s + (e.billable ? 0 : e.hours), 0);
  const totalHours = billableHours + nonBillableHours;
  const capacityWeek = me.capacityHours;

  // ===== Estimate vs Actual on active milestones =====
  const totalEst = myActive.reduce((s, m) => s + m.estimatedHours, 0);
  const totalLogged = myActive.reduce((s, m) => s + m.hoursLogged, 0);

  // ===== Top 6 milestones needing attention =====
  const sortedActive = [...myActive].sort((a, b) => {
    const wa = milestoneWarn(a, settings);
    const wb = milestoneWarn(b, settings);
    const order: Record<Warn, number> = { red: 0, yellow: 1, green: 2 } as any;
    if (order[wa as Warn] !== order[wb as Warn]) return order[wa as Warn] - order[wb as Warn];
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
  const attentionList = sortedActive.slice(0, 6);

  // ===== Hours-by-status bar chart =====
  const hoursByStatus = [
    { name: "Not started", est: 0, logged: 0 },
    { name: "In progress", est: 0, logged: 0 },
    { name: "Blocked", est: 0, logged: 0 },
  ];
  for (const m of myActive) {
    const slot = m.status === "not_started" ? 0 : m.status === "in_progress" ? 1 : m.status === "blocked" ? 2 : -1;
    if (slot >= 0) {
      hoursByStatus[slot].est += m.estimatedHours;
      hoursByStatus[slot].logged += m.hoursLogged;
    }
  }

  const caseById = (id: string) => cases.find((c) => c.id === id);

  return (
    <Layout>
      <PageHeader
        title={`Good ${now.getHours() < 12 ? "morning" : now.getHours() < 18 ? "afternoon" : "evening"}, ${me.name.split(" ")[0]}`}
        subtitle={`${me.title} · ${myActive.length} active milestones · ${myCases.length} cases`}
      />
      <PageContent>
        {/* ===== Top tiles: 4 across ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {/* My milestones R/Y/G */}
          <Link href="/milestones" className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-1">
              <Scale className="w-3.5 h-3.5" /> My milestones
            </div>
            <div className="flex items-center gap-3">
              <div className="w-[64px] h-[64px]">
                <RYGPie red={msCounts.red} yellow={msCounts.yellow} green={msCounts.green} size={64} />
              </div>
              <div className="text-[11px]">
                <div className="text-destructive font-semibold">{msCounts.red} red</div>
                <div className="text-warning font-semibold">{msCounts.yellow} yellow</div>
                <div className="text-success font-semibold">{msCounts.green} green</div>
              </div>
            </div>
          </Link>

          {/* Stale estimates */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-2">
              <Pencil className="w-3.5 h-3.5" /> Estimates to refresh
            </div>
            <div className="text-2xl font-semibold tabular-nums">{stale.length}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {stale.length === 0 ? "All up to date" : `Older than ${settings.estimateStaleDays} days`}
            </div>
          </div>

          {/* My time this week */}
          <Link href="/billing" className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-2">
              <Clock className="w-3.5 h-3.5" /> Time this week
            </div>
            <div className="text-2xl font-semibold tabular-nums">
              {totalHours.toFixed(1)}<span className="text-sm text-muted-foreground"> / {capacityWeek}h</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden flex">
              <div className="bg-success" style={{ width: `${Math.min(100, (billableHours / capacityWeek) * 100)}%` }} />
              <div className="bg-warning" style={{ width: `${Math.min(100, (nonBillableHours / capacityWeek) * 100)}%` }} />
            </div>
            <div className="text-[11px] text-muted-foreground mt-1.5">
              <span className="text-success font-medium">{billableHours.toFixed(1)}h billable</span>
              {" · "}
              <span>{nonBillableHours.toFixed(1)}h non-bill</span>
            </div>
          </Link>

          {/* Hearings next 30 */}
          <Link href="/hearings" className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-2">
              <Gavel className="w-3.5 h-3.5" /> Hearings · 30 days
            </div>
            <div className="text-2xl font-semibold tabular-nums">{myHearingsNext30.length}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {myHearingsNext30[0]
                ? `Next: ${new Date(myHearingsNext30[0].dueDate).toLocaleDateString()}`
                : "No hearings scheduled"}
            </div>
          </Link>
        </div>

        {/* ===== Milestones needing my attention ===== */}
        <div className="rounded-lg border bg-card mb-5">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">My milestones needing attention</h2>
            </div>
            <Link href="/milestones" className="text-[12px] text-primary hover:underline flex items-center gap-1">
              All milestones <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {attentionList.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">No active milestones — nice and clear.</div>
          ) : (
            <ul className="divide-y">
              {attentionList.map((m) => {
                const w = milestoneWarn(m, settings);
                const c = caseById(m.caseId);
                const days = daysUntil(m.dueDate);
                const stale = !m.estimateUpdatedAt ||
                  (Date.now() - new Date(m.estimateUpdatedAt).getTime()) / 86400000 > settings.estimateStaleDays;
                return (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer"
                    onClick={() => setEditing(m)}
                    data-testid={`milestone-row-${m.id}`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${WARN_DOT[w]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{m.title}</div>
                      <div className="text-[12px] text-muted-foreground truncate">
                        {c?.caption ?? "Case"} · {c?.caseNumber ?? ""}
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 text-[11px]">
                      {statusIcon(m.status)}
                      <span className="text-muted-foreground">{statusLabel(m.status)}</span>
                    </div>
                    <div className="text-right text-[11px] tabular-nums w-24 shrink-0">
                      <div className={w === "red" ? "text-destructive font-semibold" : w === "yellow" ? "text-warning font-semibold" : "text-muted-foreground"}>
                        {days < 0 ? `${Math.ceil(-days)}d overdue` : days < 1 ? "today" : `in ${Math.floor(days)}d`}
                      </div>
                      <div className="text-muted-foreground">
                        {m.hoursLogged.toFixed(1)} / {m.estimatedHours}h
                      </div>
                    </div>
                    {stale && (
                      <span className="hidden md:inline text-[10px] uppercase tracking-wide bg-warning/15 text-warning px-1.5 py-0.5 rounded font-semibold shrink-0">
                        Stale
                      </span>
                    )}
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ===== Two-column: Hours chart + Hearings/Deadlines ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          {/* Hours by status bar chart */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Estimated vs logged
              </h3>
              <div className="text-[11px] text-muted-foreground tabular-nums">
                {totalLogged.toFixed(1)}h logged / {totalEst.toFixed(0)}h est
              </div>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursByStatus} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="est" name="Estimated" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="logged" name="Logged" fill="hsl(var(--success))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Upcoming hearings list */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Gavel className="w-4 h-4 text-primary" /> My next hearings
              </h3>
              <Link href="/hearings" className="text-[12px] text-primary hover:underline flex items-center gap-1">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {myHearingsNext30.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">No hearings in the next 30 days.</div>
            ) : (
              <ul className="divide-y">
                {myHearingsNext30.slice(0, 5).map((h) => {
                  const w = milestoneWarn(h, settings);
                  const c = caseById(h.caseId);
                  const days = daysUntil(h.dueDate);
                  return (
                    <li key={h.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${WARN_DOT[w]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{h.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {c?.caption ?? "—"}
                        </div>
                      </div>
                      <div className="text-right text-[11px] tabular-nums">
                        <div className={w === "red" ? "text-destructive font-semibold" : w === "yellow" ? "text-warning font-semibold" : ""}>
                          {new Date(h.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </div>
                        <div className="text-muted-foreground">in {Math.max(0, Math.floor(days))}d</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ===== Deadlines I touch + Potentials ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" /> Deadlines on my cases
              </h3>
              <Link href="/deadlines" className="text-[12px] text-primary hover:underline flex items-center gap-1">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {myDeadlines.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">No open deadlines on your cases.</div>
            ) : (
              <ul className="divide-y">
                {myDeadlines
                  .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                  .slice(0, 5)
                  .map((d) => {
                    const w = deadlineWarn(d, settings);
                    const c = caseById(d.caseId);
                    const days = daysUntil(d.dueDate);
                    return (
                      <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${WARN_DOT[w]}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{d.title}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{c?.caption ?? "—"}</div>
                        </div>
                        <div className={`text-right text-[11px] tabular-nums ${w === "red" ? "text-destructive font-semibold" : w === "yellow" ? "text-warning font-semibold" : "text-muted-foreground"}`}>
                          {days < 0 ? `${Math.ceil(-days)}d over` : `in ${Math.floor(days)}d`}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
            <div className="px-4 py-2 text-[10px] text-muted-foreground border-t bg-muted/30">
              Owned by paralegal — they maintain dates. You see them so nothing surprises you.
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> My potentials
              </h3>
              <Link href="/potentials" className="text-[12px] text-primary hover:underline flex items-center gap-1">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {myPotentials.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">No potentials assigned to you.</div>
            ) : (
              <ul className="divide-y">
                {myPotentials.slice(0, 5).map((p) => {
                  const tone =
                    p.outreachStatus === "responsive" ? "bg-success" :
                    p.outreachStatus === "needs_followup" ? "bg-warning" :
                    p.outreachStatus === "non_responsive" ? "bg-destructive" : "bg-muted-foreground";
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${tone}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{p.defendant ?? p.caption}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{p.summary}</div>
                      </div>
                      <div className="text-right text-[11px] tabular-nums text-muted-foreground">
                        {p.estimatedValue ? fmtMoney(p.estimatedValue) : "—"}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="px-4 py-2 text-[10px] text-muted-foreground border-t bg-muted/30">
              You log outreach. Margaret sees the warnings.
            </div>
          </div>
        </div>

        {/* Owned-by reference */}
        <div className="rounded-lg border bg-muted/30 p-3 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">You own:</span>
          {" "}your milestone time estimates · R/Y/G status · hours logged · potentials outreach · billable time entries.
          {" "}
          <span className="font-medium text-foreground">Paralegals own:</span>
          {" "}case milestones, deadlines, hearings, court watch.
          {" "}
          <span className="font-medium text-foreground">Bookkeeper owns:</span>
          {" "}invoicing, A/R, financials.
        </div>
      </PageContent>

      <MilestoneEditDialog
        milestone={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </Layout>
  );
}
