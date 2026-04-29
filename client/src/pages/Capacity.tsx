import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader, PageContent } from "@/components/Layout";
import { Pill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { caseTypeLabel } from "@/lib/format";
import { AlertTriangle, Sparkles, TrendingUp, ArrowRight, CheckCircle2 } from "lucide-react";
import type { LawyerLoad, RoutingRecommendation, Case, Staff } from "@shared/schema";
import { Link } from "wouter";

export default function CapacityPage() {
  const [windowDays, setWindowDays] = useState<string>("14");
  const { data: capacity = [] } = useQuery<LawyerLoad[]>({
    queryKey: ["/api/capacity", windowDays],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/capacity?windowDays=${windowDays}`);
      return res.json();
    },
  });
  const { data: cases = [] } = useQuery<Case[]>({ queryKey: ["/api/cases"] });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });

  const lawyers = capacity.filter((l) => l.role !== "paralegal");
  const emergencyCases = cases.filter((c) => c.priority === "emergency" && c.stage !== "closed");
  const urgentCases = cases.filter((c) => c.priority === "urgent" && c.stage !== "closed");

  return (
    <Layout>
      <PageHeader
        title="Capacity & Routing"
        subtitle={`Forward load · next ${windowDays} days`}
        actions={
          <Select value={windowDays} onValueChange={setWindowDays}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Next 7 days</SelectItem>
              <SelectItem value="14">Next 14 days</SelectItem>
              <SelectItem value="30">Next 30 days</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <PageContent className="space-y-5">
        {/* Emergency triage banner */}
        {emergencyCases.length > 0 && (
          <div className="rounded-lg border-l-4 border-l-destructive bg-destructive/5 border p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <h2 className="text-sm font-semibold tracking-tight text-destructive">
                Emergency triage · {emergencyCases.length} case{emergencyCases.length === 1 ? "" : "s"}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {emergencyCases.map((c) => {
                const lead = staff.find((s) => s.id === c.leadAttorneyId);
                const load = capacity.find((l) => l.staffId === c.leadAttorneyId);
                return (
                  <Link key={c.id} href={`/cases/${c.id}`}>
                    <div className="rounded-md bg-card border px-3 py-2 hover:border-destructive cursor-pointer flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium truncate">{c.client}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {c.shortName} · {lead?.name}
                          {load && <> · <span className={load.status === "overloaded" ? "text-destructive font-semibold" : ""}>{load.utilizationPct.toFixed(0)}% loaded</span></>}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Per-lawyer load bars */}
        <div>
          <h2 className="text-[13px] font-semibold tracking-tight uppercase text-muted-foreground mb-3">Lawyer load</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lawyers.map((l) => <LawyerLoadCard key={l.staffId} l={l} />)}
          </div>
        </div>

        {/* Routing recommender */}
        <RoutingRecommender />

        {/* Active priorities mini summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="Emergency cases" value={emergencyCases.length} tone="red" />
          <StatTile label="Urgent cases" value={urgentCases.length} tone="yellow" />
          <StatTile label="Overloaded lawyers" value={lawyers.filter((l) => l.status === "overloaded").length} tone="red" />
          <StatTile label="Available lawyers" value={lawyers.filter((l) => l.status === "available").length} tone="green" />
        </div>
      </PageContent>
    </Layout>
  );
}

function LawyerLoadCard({ l }: { l: LawyerLoad }) {
  const pct = Math.min(150, l.utilizationPct);
  const color =
    l.status === "overloaded" ? "bg-destructive" :
    l.status === "stretched" ? "bg-warning" :
    l.status === "available" ? "bg-success/60" : "bg-success";
  const statusLabel = {
    available: "Available",
    healthy: "Healthy",
    stretched: "Stretched",
    overloaded: "Overloaded",
  }[l.status];
  const tone = (l.status === "overloaded" ? "red" : l.status === "stretched" ? "orange" : l.status === "available" ? "green" : "blue") as "red" | "orange" | "green" | "blue";
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold shrink-0">
            {l.initials}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[13.5px] truncate">{l.name}</div>
            <div className="text-[10.5px] text-muted-foreground uppercase tracking-wider">
              {l.specialties.map((s) => caseTypeLabel(s).split(" ")[0]).join(" · ")} · {l.yearsExperience}y
            </div>
          </div>
        </div>
        <Pill tone={tone}>{statusLabel}</Pill>
      </div>
      {/* Capacity bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden relative mb-1.5">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
        {pct > 100 && (
          <div className="absolute right-0 top-0 h-full bg-destructive" style={{ width: `${pct - 100}%`, maxWidth: "33%" }} />
        )}
      </div>
      <div className="flex items-baseline justify-between text-[11px] text-muted-foreground tabular">
        <span>
          <span className="font-semibold text-foreground">{l.utilizationPct.toFixed(0)}%</span> loaded
        </span>
        <span className={l.headroomHours < 0 ? "text-destructive font-semibold" : "text-success"}>
          {l.headroomHours >= 0 ? "+" : ""}{l.headroomHours.toFixed(0)}h headroom
        </span>
      </div>
      {/* Detail */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-[11px]">
        <Stat label="Estimate" value={`${l.rawEstHours.toFixed(0)}h`} />
        <Stat label="Adjusted" value={`${l.adjustedEstHours.toFixed(0)}h`} hint={`×${l.estimateRatio.toFixed(2)}`} />
        <Stat label="Capacity" value={`${l.forwardCapacity.toFixed(0)}h`} />
      </div>
      <div className="flex items-center gap-3 mt-2 text-[11px]">
        {l.redCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            <span className="tabular font-semibold">{l.redCount}</span>
            <span className="text-muted-foreground">red</span>
          </span>
        )}
        {l.yellowCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span className="tabular font-semibold">{l.yellowCount}</span>
            <span className="text-muted-foreground">yellow</span>
          </span>
        )}
        {l.emergencyCases > 0 && (
          <span className="flex items-center gap-1 text-destructive">
            <AlertTriangle className="w-3 h-3" />
            <span className="tabular font-semibold">{l.emergencyCases}</span> emergency
          </span>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-[12.5px] font-semibold tabular">
        {value}
        {hint && <span className="text-[10px] text-muted-foreground font-normal ml-1">{hint}</span>}
      </div>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "red" | "yellow" | "green" }) {
  const colors = {
    red: "text-destructive",
    yellow: "text-warning",
    green: "text-success",
  };
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className={`text-3xl font-semibold tabular ${colors[tone]}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function RoutingRecommender() {
  const [caseType, setCaseType] = useState<string>("commercial_litigation");
  const [priority, setPriority] = useState<string>("normal");
  const [estHours, setEstHours] = useState<string>("40");
  const [results, setResults] = useState<RoutingRecommendation[] | null>(null);

  const recommendMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/routing/recommend", {
        caseType,
        priority,
        estimatedTotalHours: Number(estHours) || 40,
      });
      return (await res.json()) as RoutingRecommendation[];
    },
    onSuccess: (data) => setResults(data),
  });

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-tight">New matter intake · routing recommender</h2>
      </div>
      <p className="text-[12px] text-muted-foreground mb-3">
        Pick the case type, priority, and rough effort. We'll rank lawyers by available headroom, specialty match, and current urgency load.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4">
        <div>
          <label className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1 block">Case type</label>
          <Select value={caseType} onValueChange={setCaseType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bankruptcy_avoidance">Bankruptcy / Avoidance</SelectItem>
              <SelectItem value="commercial_litigation">Commercial Litigation</SelectItem>
              <SelectItem value="real_estate">Real Estate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1 block">Priority</label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1 block">Est. total hours</label>
          <input
            type="number"
            value={estHours}
            onChange={(e) => setEstHours(e.target.value)}
            className="w-full h-10 rounded-md border bg-transparent px-3 text-[13px]"
            data-testid="input-est-hours"
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={() => recommendMut.mutate()}
            disabled={recommendMut.isPending}
            className="w-full"
            data-testid="button-recommend"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            {recommendMut.isPending ? "Calculating…" : "Recommend lawyers"}
          </Button>
        </div>
      </div>

      {results && (
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Ranked recommendations</div>
          {results.map((r, idx) => (
            <div
              key={r.staffId}
              className={`rounded-md border p-3 flex items-center gap-3 ${idx === 0 ? "border-success/40 bg-success/5" : ""}`}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold shrink-0">
                {r.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[13px]">{r.name}</span>
                  {idx === 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-success font-semibold uppercase tracking-wider">
                      <CheckCircle2 className="w-3 h-3" /> Best match
                    </span>
                  )}
                  {r.specialtyMatch && <Pill tone="blue">Specialty</Pill>}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{r.reasoning}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</div>
                <div className="text-base font-semibold tabular">{r.score.toFixed(0)}</div>
              </div>
              <div className="text-right shrink-0 hidden sm:block">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Headroom</div>
                <div className={`text-sm font-semibold tabular ${r.headroomHours < 0 ? "text-destructive" : "text-success"}`}>
                  {r.headroomHours >= 0 ? "+" : ""}{r.headroomHours.toFixed(0)}h
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
