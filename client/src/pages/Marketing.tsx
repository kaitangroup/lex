import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout, PageHeader, PageContent } from "@/components/Layout";
import { RYGPie, RYGLegend } from "@/components/RYGPie";
import { Pill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { fmtDateShort } from "@/lib/format";
import { WARN_DOT } from "@/lib/warnings";
import { Megaphone, FileText, Mic, Globe, Mail, Calendar as CalIcon, BookOpen, Briefcase } from "lucide-react";
import type { MarketingProject, MarketingProjectKind, MarketingProjectStatus, Staff } from "@shared/schema";

type RYG = "red" | "yellow" | "green";

function projectWarn(p: MarketingProject): RYG {
  if (p.status === "launched" || p.status === "cancelled") return "green";
  const now = Date.now();
  const dueMs = new Date(p.dueDate).getTime();
  if (dueMs < now) return "red";
  // Any blocked/overdue milestone makes it red
  for (const m of p.milestones) {
    if (!m.completed && new Date(m.dueDate).getTime() < now) return "red";
  }
  if (p.status === "on_hold") return "red";
  const total = p.milestones.length || 1;
  const done = p.milestones.filter((m) => m.completed).length;
  const progressPct = done / total;
  const startMs = new Date(p.startDate).getTime();
  const elapsedPct = Math.max(0, Math.min(1, (now - startMs) / Math.max(1, dueMs - startMs)));
  if (progressPct < elapsedPct - 0.2) return "yellow";
  return "green";
}

const KIND_ICON: Record<MarketingProjectKind, JSX.Element> = {
  webinar: <Mic className="w-4 h-4" />,
  newsletter: <Mail className="w-4 h-4" />,
  blog: <FileText className="w-4 h-4" />,
  speaking: <Megaphone className="w-4 h-4" />,
  cle: <BookOpen className="w-4 h-4" />,
  event: <CalIcon className="w-4 h-4" />,
  campaign: <Briefcase className="w-4 h-4" />,
  website: <Globe className="w-4 h-4" />,
  other: <Briefcase className="w-4 h-4" />,
};

const KIND_LABEL: Record<MarketingProjectKind, string> = {
  webinar: "Webinar",
  newsletter: "Newsletter",
  blog: "Blog",
  speaking: "Speaking",
  cle: "CLE",
  event: "Event",
  campaign: "Campaign",
  website: "Website",
  other: "Other",
};

const STATUS_LABEL: Record<MarketingProjectStatus, string> = {
  planning: "Planning",
  in_progress: "In progress",
  on_hold: "On hold",
  launched: "Launched",
  cancelled: "Cancelled",
};

export default function MarketingPage() {
  const { data: projects = [] } = useQuery<MarketingProject[]>({ queryKey: ["/api/marketing/projects"] });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });
  const [warnFilter, setWarnFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");

  const staffById = useMemo(() => Object.fromEntries(staff.map((s) => [s.id, s])), [staff]);

  // Active = not launched and not cancelled
  const active = projects.filter((p) => p.status !== "launched" && p.status !== "cancelled");
  const counts = {
    red: active.filter((p) => projectWarn(p) === "red").length,
    yellow: active.filter((p) => projectWarn(p) === "yellow").length,
    green: active.filter((p) => projectWarn(p) === "green").length,
  };

  const filtered = projects
    .filter((p) => warnFilter === "all" || projectWarn(p) === warnFilter)
    .filter((p) => kindFilter === "all" || p.kind === kindFilter)
    .sort((a, b) => {
      const order: Record<RYG, number> = { red: 0, yellow: 1, green: 2 };
      const aw = projectWarn(a);
      const bw = projectWarn(b);
      if (order[aw] !== order[bw]) return order[aw] - order[bw];
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  return (
    <Layout>
      <PageHeader title="Marketing Projects" subtitle={`${active.length} active · ${counts.red} off track`} />
      <PageContent className="space-y-5">
        {/* Summary row */}
        <div className="rounded-lg border bg-card p-4 flex flex-wrap items-center gap-6">
          <RYGPie red={counts.red} yellow={counts.yellow} green={counts.green} size={130} centerSubLabel="active" />
          <div className="flex-1 min-w-[240px]">
            <h2 className="text-sm font-semibold tracking-tight mb-2 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              Project schedule health
            </h2>
            <RYGLegend red={counts.red} yellow={counts.yellow} green={counts.green} />
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              Red = past due or blocked milestone · Yellow = behind schedule · Green = on track.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-[12px]">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Launched YTD</div>
              <div className="text-xl font-semibold tabular text-success">
                {projects.filter((p) => p.status === "launched").length}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">In planning</div>
              <div className="text-xl font-semibold tabular">
                {projects.filter((p) => p.status === "planning").length}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
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
              <SelectItem value="webinar">Webinar</SelectItem>
              <SelectItem value="newsletter">Newsletter</SelectItem>
              <SelectItem value="blog">Blog</SelectItem>
              <SelectItem value="speaking">Speaking</SelectItem>
              <SelectItem value="cle">CLE</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="campaign">Campaign</SelectItem>
              <SelectItem value="website">Website</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-[12px] text-muted-foreground ml-auto">{filtered.length} shown</div>
        </div>

        {/* Project cards */}
        <div className="space-y-3">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              owner={staffById[p.ownerId]}
            />
          ))}
          {filtered.length === 0 && (
            <div className="rounded-lg border bg-card py-12 text-center text-muted-foreground text-sm">
              No projects match the filter.
            </div>
          )}
        </div>
      </PageContent>
    </Layout>
  );
}

function ProjectCard({ project, owner }: { project: MarketingProject; owner: Staff | undefined }) {
  const w = projectWarn(project);
  const total = project.milestones.length || 1;
  const done = project.milestones.filter((m) => m.completed).length;
  const progressPct = Math.round((done / total) * 100);
  const now = Date.now();
  const startMs = new Date(project.startDate).getTime();
  const dueMs = new Date(project.dueDate).getTime();
  const elapsedPct = Math.round(Math.max(0, Math.min(1, (now - startMs) / Math.max(1, dueMs - startMs))) * 100);
  const daysUntilDue = Math.round((dueMs - now) / 86400000);

  return (
    <div
      className={`rounded-lg border bg-card border-l-4 ${
        w === "red" ? "border-l-destructive" : w === "yellow" ? "border-l-warning" : "border-l-success"
      } p-4`}
      data-testid={`card-marketing-${project.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${WARN_DOT[w]}`} />
            <span className="text-muted-foreground">{KIND_ICON[project.kind]}</span>
            <h3 className="font-semibold text-[14px] tracking-tight">{project.title}</h3>
          </div>
          <p className="text-[12.5px] text-muted-foreground leading-relaxed mb-2">{project.description}</p>
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <Pill tone="gray">{KIND_LABEL[project.kind]}</Pill>
            <Pill tone={project.status === "launched" ? "green" : project.status === "on_hold" ? "red" : project.status === "in_progress" ? "blue" : "gray"}>
              {STATUS_LABEL[project.status]}
            </Pill>
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <CalIcon className="w-3 h-3" />
              Due {fmtDateShort(project.dueDate)}
            </span>
            {project.status !== "launched" && project.status !== "cancelled" && (
              <span className={`tabular ${daysUntilDue < 0 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d overdue` : `${daysUntilDue}d left`}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold">
              {owner?.initials || "?"}
            </div>
            <span>{owner?.name?.split(" ").slice(-1)[0] || "—"}</span>
          </div>
        </div>
      </div>

      {/* Progress bars: completion vs time elapsed */}
      <div className="space-y-2 mb-3">
        <ProgressBar
          label="Milestones complete"
          pct={progressPct}
          color={w === "red" ? "bg-destructive" : w === "yellow" ? "bg-warning" : "bg-success"}
          right={`${done}/${total}`}
        />
        <ProgressBar
          label="Time elapsed"
          pct={elapsedPct}
          color="bg-muted-foreground/40"
          right={`${elapsedPct}%`}
        />
      </div>

      {/* Milestone list */}
      <div className="border-t border-border pt-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Milestones</div>
        <div className="space-y-1">
          {project.milestones.map((m) => (
            <MilestoneRow key={m.id} milestone={m} />
          ))}
          {project.milestones.length === 0 && (
            <div className="text-[12px] text-muted-foreground italic">No milestones defined</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({
  label,
  pct,
  color,
  right,
}: {
  label: string;
  pct: number;
  color: string;
  right: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular font-semibold">{right}</span>
      </div>
      <div className="h-2 rounded bg-muted overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

function MilestoneRow({ milestone }: { milestone: MarketingProject["milestones"][number] }) {
  const { toast } = useToast();
  const overdue = !milestone.completed && new Date(milestone.dueDate).getTime() < Date.now();
  const mut = useMutation({
    mutationFn: async (completed: boolean) => {
      return apiRequest("POST", `/api/marketing/milestones/toggle`, {
        milestoneId: milestone.id,
        completed,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/projects"] });
    },
    onError: () => toast({ title: "Could not update milestone", variant: "destructive" }),
  });
  return (
    <div className="flex items-center gap-2.5 py-1 group">
      <Checkbox
        checked={milestone.completed}
        onCheckedChange={(c) => mut.mutate(!!c)}
        data-testid={`checkbox-mm-${milestone.id}`}
      />
      <span
        className={`text-[12.5px] flex-1 ${
          milestone.completed ? "line-through text-muted-foreground" : ""
        }`}
      >
        {milestone.title}
      </span>
      <span
        className={`text-[11px] tabular ${
          overdue
            ? "text-destructive font-semibold"
            : milestone.completed
            ? "text-success"
            : "text-muted-foreground"
        }`}
      >
        {milestone.completed && milestone.completedAt
          ? `done ${fmtDateShort(milestone.completedAt)}`
          : fmtDateShort(milestone.dueDate)}
      </span>
    </div>
  );
}
