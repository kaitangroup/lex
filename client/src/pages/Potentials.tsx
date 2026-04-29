import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout, PageHeader, PageContent } from "@/components/Layout";
import { RYGPie, RYGLegend } from "@/components/RYGPie";
import { Pill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { fmtMoney, fmtDateShort, filingCategoryLabel } from "@/lib/format";
import { WARN_DOT } from "@/lib/warnings";
import {
  Mail,
  FileText,
  Phone,
  Users as UsersIcon,
  Plus,
  AlertTriangle,
  Sparkles,
  Calendar,
} from "lucide-react";
import type {
  Potential,
  Staff,
  OutreachStatus,
  OutreachChannel,
  PotentialTrigger,
} from "@shared/schema";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";

type RYG = "red" | "yellow" | "green" | "gray";

function statusToWarn(s: OutreachStatus): RYG {
  if (s === "none") return "red";
  if (s === "sent") return "yellow";
  if (s === "engaged" || s === "retained") return "green";
  return "gray"; // declined
}

const TRIGGER_LABELS: Record<PotentialTrigger, string> = {
  high_value: "≥$500K",
  fraudulent_conveyance: "Fraud. Conveyance",
  preference: "Preference",
  section_549: "§549",
  section_548: "§548",
  commercial_fraud: "Comm. Fraud",
  breach_fiduciary: "Breach Fid.",
};

const STATUS_LABELS: Record<OutreachStatus, string> = {
  none: "No outreach",
  sent: "Sent · awaiting reply",
  engaged: "Engaged",
  declined: "Declined",
  retained: "Retained",
};

function ChannelIcon({ channel }: { channel: OutreachChannel }) {
  if (channel === "email") return <Mail className="w-3.5 h-3.5" />;
  if (channel === "letter") return <FileText className="w-3.5 h-3.5" />;
  if (channel === "phone") return <Phone className="w-3.5 h-3.5" />;
  return <UsersIcon className="w-3.5 h-3.5" />;
}

export default function PotentialsPage() {
  const { data: potentials = [] } = useQuery<Potential[]>({ queryKey: ["/api/potentials"] });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });
  const [warnFilter, setWarnFilter] = useState<string>("all");
  const [triggerFilter, setTriggerFilter] = useState<string>("all");
  const [outreachFor, setOutreachFor] = useState<Potential | null>(null);

  const staffById = useMemo(() => Object.fromEntries(staff.map((s) => [s.id, s])), [staff]);

  // R/Y/G counts (active = not declined)
  const active = potentials.filter((p) => p.outreachStatus !== "declined");
  const counts = {
    red: active.filter((p) => statusToWarn(p.outreachStatus) === "red").length,
    yellow: active.filter((p) => statusToWarn(p.outreachStatus) === "yellow").length,
    green: active.filter((p) => statusToWarn(p.outreachStatus) === "green").length,
    declined: potentials.filter((p) => p.outreachStatus === "declined").length,
  };

  // Trigger frequency for bar chart
  const triggerCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const p of potentials) for (const t of p.triggers) acc[t] = (acc[t] || 0) + 1;
    return Object.entries(acc)
      .map(([trigger, count]) => ({ trigger, label: TRIGGER_LABELS[trigger as PotentialTrigger] || trigger, count }))
      .sort((a, b) => b.count - a.count);
  }, [potentials]);

  // Pipeline value summary (active + engaged + retained)
  const pipelineValue = active.reduce((sum, p) => sum + (p.estimatedValue || 0), 0);
  const retainedValue = potentials
    .filter((p) => p.outreachStatus === "retained")
    .reduce((sum, p) => sum + (p.estimatedValue || 0), 0);

  const filtered = potentials
    .filter((p) => {
      if (warnFilter === "all") return true;
      if (warnFilter === "declined") return p.outreachStatus === "declined";
      return statusToWarn(p.outreachStatus) === warnFilter;
    })
    .filter((p) => triggerFilter === "all" || p.triggers.includes(triggerFilter as PotentialTrigger))
    .sort((a, b) => {
      // Red first, then yellow, then green, then declined; secondary by value desc
      const order: Record<RYG, number> = { red: 0, yellow: 1, green: 2, gray: 3 };
      const aw = statusToWarn(a.outreachStatus);
      const bw = statusToWarn(b.outreachStatus);
      if (order[aw] !== order[bw]) return order[aw] - order[bw];
      return (b.estimatedValue || 0) - (a.estimatedValue || 0);
    });

  return (
    <Layout>
      <PageHeader title="Potentials" subtitle={`${active.length} open · ${counts.red} need first outreach`} />
      <PageContent className="space-y-5">
        {/* Summary row: pie + KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="rounded-lg border bg-card p-4 flex items-center gap-4">
            <RYGPie red={counts.red} yellow={counts.yellow} green={counts.green} size={130} centerSubLabel="open" />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold tracking-tight mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Outreach health
              </h2>
              <RYGLegend red={counts.red} yellow={counts.yellow} green={counts.green} />
              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                Red = no outreach · Yellow = sent, no reply · Green = engaged or retained.
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Pipeline value</div>
            <div className="text-2xl font-semibold tabular">{fmtMoney(pipelineValue)}</div>
            <div className="text-[12px] text-muted-foreground mt-1">{active.length} open potentials</div>
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Retained to date</div>
              <div className="text-lg font-semibold tabular text-success">{fmtMoney(retainedValue)}</div>
              <div className="text-[11px] text-muted-foreground">
                {potentials.filter((p) => p.outreachStatus === "retained").length} matters won ·{" "}
                {counts.declined} declined
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold tracking-tight mb-2">Why flagged</h3>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={triggerCounts} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    width={110}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                    cursor={{ fill: "hsl(var(--accent))" }}
                  />
                  <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                    {triggerCounts.map((_, i) => (
                      <Cell key={i} fill="hsl(var(--primary))" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={warnFilter} onValueChange={setWarnFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="red">Red · no outreach</SelectItem>
              <SelectItem value="yellow">Yellow · awaiting</SelectItem>
              <SelectItem value="green">Green · engaged</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
          <Select value={triggerFilter} onValueChange={setTriggerFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All triggers</SelectItem>
              <SelectItem value="high_value">≥$500K</SelectItem>
              <SelectItem value="fraudulent_conveyance">Fraudulent conveyance</SelectItem>
              <SelectItem value="preference">Preference</SelectItem>
              <SelectItem value="section_549">§549</SelectItem>
              <SelectItem value="section_548">§548</SelectItem>
              <SelectItem value="commercial_fraud">Commercial fraud</SelectItem>
              <SelectItem value="breach_fiduciary">Breach fiduciary</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-[12px] text-muted-foreground ml-auto">
            {filtered.length} shown
          </div>
        </div>

        {/* Potentials cards */}
        <div className="space-y-3">
          {filtered.map((p) => {
            const w = statusToWarn(p.outreachStatus);
            const owner = staffById[p.ownerId];
            const lastAttempt = p.outreachAttempts[p.outreachAttempts.length - 1];
            return (
              <div
                key={p.id}
                className={`rounded-lg border bg-card border-l-4 ${
                  w === "red"
                    ? "border-l-destructive"
                    : w === "yellow"
                    ? "border-l-warning"
                    : w === "green"
                    ? "border-l-success"
                    : "border-l-muted"
                } p-4`}
                data-testid={`card-potential-${p.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${
                          w === "gray" ? "bg-muted-foreground" : WARN_DOT[w as "red" | "yellow" | "green"]
                        }`}
                      />
                      <h3 className="font-semibold text-[14px] tracking-tight">{p.caption}</h3>
                      {p.estimatedValue && p.estimatedValue >= 500000 && (
                        <Pill tone="red" className="!normal-case">
                          <AlertTriangle className="w-3 h-3" />
                          {fmtMoney(p.estimatedValue)}
                        </Pill>
                      )}
                    </div>
                    <p className="text-[12.5px] text-muted-foreground leading-relaxed mb-2">{p.summary}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.triggers.map((t) => (
                        <Pill key={t} tone="blue">{TRIGGER_LABELS[t]}</Pill>
                      ))}
                      <Pill tone="gray">{filingCategoryLabel(p.category)}</Pill>
                      <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Filed {fmtDateShort(p.filedDate)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{p.court}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Pill
                      tone={
                        w === "red" ? "red" : w === "yellow" ? "orange" : w === "green" ? "green" : "gray"
                      }
                    >
                      {STATUS_LABELS[p.outreachStatus]}
                    </Pill>
                    <div className="text-[11px] text-muted-foreground">
                      Owner: {owner?.name?.split(" ").slice(-1)[0] || "—"}
                    </div>
                  </div>
                </div>

                {/* Outreach history strip */}
                {p.outreachAttempts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1">
                      Outreach
                    </span>
                    {p.outreachAttempts.map((a) => {
                      const by = staffById[a.byStaffId];
                      return (
                        <span
                          key={a.id}
                          className="inline-flex items-center gap-1.5 text-[11px] bg-muted px-2 py-1 rounded"
                          title={a.notes}
                        >
                          <ChannelIcon channel={a.channel} />
                          <span className="capitalize">{a.channel}</span>
                          <span className="text-muted-foreground">·</span>
                          <span>{fmtDateShort(a.sentAt)}</span>
                          {by && <span className="text-muted-foreground">· {by.initials}</span>}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={p.outreachStatus === "none" ? "default" : "outline"}
                    onClick={() => setOutreachFor(p)}
                    data-testid={`button-log-outreach-${p.id}`}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Log outreach
                  </Button>
                  <StatusUpdater potential={p} />
                  {lastAttempt && (
                    <span className="text-[11px] text-muted-foreground ml-auto">
                      Last touch: {fmtDateShort(lastAttempt.sentAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="rounded-lg border bg-card py-12 text-center text-muted-foreground text-sm">
              No potentials match the filter.
            </div>
          )}
        </div>
      </PageContent>

      {outreachFor && (
        <OutreachDialog
          potential={outreachFor}
          staff={staff}
          onClose={() => setOutreachFor(null)}
        />
      )}
    </Layout>
  );
}

function StatusUpdater({ potential }: { potential: Potential }) {
  const { toast } = useToast();
  const mut = useMutation({
    mutationFn: async (status: OutreachStatus) => {
      return apiRequest("POST", `/api/potentials/${potential.id}/status`, {
        outreachStatus: status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/potentials"] });
      toast({ title: "Status updated" });
    },
  });
  return (
    <Select
      value={potential.outreachStatus}
      onValueChange={(v) => mut.mutate(v as OutreachStatus)}
    >
      <SelectTrigger className="w-[180px] h-8 text-[12px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No outreach</SelectItem>
        <SelectItem value="sent">Sent · awaiting</SelectItem>
        <SelectItem value="engaged">Engaged</SelectItem>
        <SelectItem value="retained">Retained ✓</SelectItem>
        <SelectItem value="declined">Declined</SelectItem>
      </SelectContent>
    </Select>
  );
}

function OutreachDialog({
  potential,
  staff,
  onClose,
}: {
  potential: Potential;
  staff: Staff[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [channel, setChannel] = useState<OutreachChannel>("email");
  const [notes, setNotes] = useState("");
  const [byStaffId, setByStaffId] = useState(potential.ownerId);
  const mut = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/potentials/${potential.id}/outreach`, {
        channel,
        notes: notes || undefined,
        byStaffId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/potentials"] });
      toast({ title: "Outreach logged" });
      onClose();
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log outreach</DialogTitle>
          <p className="text-[12px] text-muted-foreground">{potential.caption}</p>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-[12px]">Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as OutreachChannel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="letter">Letter</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[12px]">Sent by</Label>
            <Select value={byStaffId} onValueChange={setByStaffId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {staff
                  .filter((s) => s.role !== "paralegal")
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[12px]">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="What did you cover? Next step?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending} data-testid="button-confirm-outreach">
            Log outreach
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
