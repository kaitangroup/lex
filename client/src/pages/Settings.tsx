import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader, PageContent } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { FirmSettings } from "@shared/schema";
import { Save } from "lucide-react";

const FIELDS: Array<{
  key: keyof FirmSettings;
  label: string;
  hint: string;
  group: string;
}> = [
  { key: "deadlineRedDays", label: "Court deadline · Red", hint: "Within N days = red", group: "Court Deadlines" },
  { key: "deadlineYellowDays", label: "Court deadline · Yellow", hint: "Within N days = yellow", group: "Court Deadlines" },
  { key: "milestoneRedDays", label: "Milestone · Red", hint: "Within N days = red", group: "Milestones" },
  { key: "milestoneYellowDays", label: "Milestone · Yellow", hint: "Within N days = yellow", group: "Milestones" },
  { key: "estimateStaleDays", label: "Estimate stale", hint: "Lawyer estimate older than N days", group: "Milestones" },
  { key: "hearingPrepDays", label: "Hearing prep buffer", hint: "Prep should be done N days before hearing", group: "Hearings" },
  { key: "taskRedDays", label: "Task · Red", hint: "Within N days = red", group: "Tasks" },
  { key: "taskYellowDays", label: "Task · Yellow", hint: "Within N days = yellow", group: "Tasks" },
  { key: "invoiceYellowDays", label: "Invoice · Yellow", hint: "Past due more than N days = yellow", group: "Invoices (A/R)" },
  { key: "invoiceRedDays", label: "Invoice · Red", hint: "Past due more than N days = red", group: "Invoices (A/R)" },
  { key: "cruxDueDays", label: "Crux due", hint: "Crux must be analyzed within N days of intake", group: "Intake" },
  { key: "positionDueDays", label: "Position drafted", hint: "Position drafted within N days of intake", group: "Intake" },
];

export default function SettingsPage() {
  const { data: settings } = useQuery<FirmSettings>({ queryKey: ["/api/settings"] });
  const [draft, setDraft] = useState<FirmSettings | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (settings && !draft) setDraft(settings);
  }, [settings, draft]);

  const save = useMutation({
    mutationFn: async (patch: Partial<FirmSettings>) => {
      const res = await apiRequest("PATCH", "/api/settings", patch);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved" });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  if (!draft) {
    return <Layout><PageContent><div className="p-8 text-muted-foreground">Loading…</div></PageContent></Layout>;
  }

  // Group fields
  const groups = new Map<string, typeof FIELDS>();
  for (const f of FIELDS) {
    if (!groups.has(f.group)) groups.set(f.group, []);
    groups.get(f.group)!.push(f);
  }

  const setField = (key: keyof FirmSettings, val: number) => {
    setDraft((d) => d ? { ...d, [key]: val } : d);
  };

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  return (
    <Layout>
      <PageHeader
        title="Settings"
        subtitle="Firm-wide warning thresholds — when items turn red or yellow"
        actions={
          <Button
            onClick={() => save.mutate(draft)}
            disabled={!dirty || save.isPending}
            data-testid="button-save-settings"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        }
      />
      <PageContent className="space-y-5">
        <div className="rounded-lg bg-card border p-4 text-[12px] text-muted-foreground">
          These thresholds drive every red/yellow/green status across the dashboard. Tighter numbers raise alarms earlier.
        </div>
        {[...groups.entries()].map(([group, fields]) => (
          <div key={group} className="rounded-lg bg-card border p-4">
            <h2 className="text-sm font-semibold tracking-tight mb-3">{group}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((f) => (
                <div key={f.key as string}>
                  <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">
                    {f.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={draft[f.key]}
                      onChange={(e) => setField(f.key, Number(e.target.value))}
                      className="w-24 tabular"
                      data-testid={`input-${f.key as string}`}
                    />
                    <span className="text-[12px] text-muted-foreground">days</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">{f.hint}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </PageContent>
    </Layout>
  );
}
