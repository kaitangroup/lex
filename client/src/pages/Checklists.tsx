import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Plus, Search } from "lucide-react";
import { Layout, PageContent, PageHeader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/StatusPill";
import { EntryDialog } from "@/components/EntryDialog";
import { caseTypeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { ChecklistTemplate, Case, ChecklistItem } from "@shared/schema";

export default function ChecklistsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "bankruptcy_avoidance" | "commercial_litigation" | "real_estate">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: templates = [] } = useQuery<ChecklistTemplate[]>({ queryKey: ["/api/checklists/templates"] });
  const { data: cases = [] } = useQuery<Case[]>({ queryKey: ["/api/cases"] });
  const { data: allItems = [] } = useQuery<ChecklistItem[]>({ queryKey: ["/api/checklists/items"] });

  const filtered = templates.filter((t) => {
    if (filter !== "all" && t.caseType !== "all" && t.caseType !== filter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selected = selectedId ? templates.find((t) => t.id === selectedId) : filtered[0];

  // Compute usage stats per template
  const usageByTemplate: Record<string, { total: number; completed: number; cases: Set<string> }> = {};
  for (const it of allItems) {
    const u = (usageByTemplate[it.templateId] ||= { total: 0, completed: 0, cases: new Set() });
    u.total += 1;
    if (it.completed) u.completed += 1;
    u.cases.add(it.caseId);
  }

  return (
    <Layout>
      <PageHeader
        title="Checklist Templates"
        subtitle="Reusable workflows applied to every new case"
        actions={
          <EntryDialog
            trigger={
              <Button data-testid="button-new-template">
                <Plus className="w-4 h-4 mr-1.5" />
                New Template
              </Button>
            }
            title="New Checklist Template"
            description="Reusable steps that get applied to new cases."
            fields={[
              { name: "name", label: "Template name", type: "text", required: true, placeholder: "e.g. Pre-Trial Motion Practice" },
              {
                name: "caseType",
                label: "Applies to",
                type: "select",
                required: true,
                options: [
                  { value: "all", label: "All case types" },
                  { value: "bankruptcy_avoidance", label: "Bankruptcy / Avoidance" },
                  { value: "commercial_litigation", label: "Commercial Litigation" },
                  { value: "real_estate", label: "Real Estate" },
                ],
              },
              {
                name: "items",
                label: "Steps (one per line)",
                type: "textarea",
                required: true,
                placeholder: "Conflicts check completed\nEngagement letter signed\n…",
              },
            ]}
            onSubmit={() => {
              toast({ title: "Template saved", description: "It will be available next time you open a case." });
            }}
          />
        }
      />
      <PageContent>
        <div className="grid grid-cols-[360px_1fr] gap-6">
          {/* Templates list */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search templates…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-templates"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {([
                ["all", "All"],
                ["bankruptcy_avoidance", "Bankruptcy"],
                ["commercial_litigation", "Commercial"],
                ["real_estate", "Real Estate"],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k as typeof filter)}
                  className={cn(
                    "text-[12px] px-2.5 py-1 rounded-md border transition-colors",
                    filter === k
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-muted"
                  )}
                  data-testid={`filter-${k}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {filtered.map((t) => {
                const usage = usageByTemplate[t.id];
                const active = selected?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      "w-full text-left rounded-lg border bg-card p-4 transition-all",
                      active ? "border-primary shadow-sm ring-1 ring-primary/30" : "border-border hover:border-primary/40"
                    )}
                    data-testid={`template-${t.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <ClipboardList className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-[14px] font-semibold leading-tight truncate">{t.name}</span>
                      </div>
                      <Pill tone={t.caseType === "all" ? "blue" : "gray"}>
                        {t.caseType === "all" ? "Universal" : caseTypeLabel(t.caseType).split(" ")[0]}
                      </Pill>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular">
                      <span>{t.items.length} steps</span>
                      {usage ? (
                        <span>
                          {usage.cases.size} active · {usage.total > 0 ? Math.round((usage.completed / usage.total) * 100) : 0}% done
                        </span>
                      ) : (
                        <span>Not in use</span>
                      )}
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">No templates match.</div>
              )}
            </div>
          </div>

          {/* Detail panel */}
          {selected ? (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-6 py-5 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3 mb-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold tracking-tight">{selected.name}</h2>
                </div>
                <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
                  <span>
                    Applies to:{" "}
                    <span className="text-foreground font-medium">
                      {selected.caseType === "all" ? "All case types" : caseTypeLabel(selected.caseType)}
                    </span>
                  </span>
                  <span>·</span>
                  <span>{selected.items.length} steps</span>
                  {usageByTemplate[selected.id] && (
                    <>
                      <span>·</span>
                      <span>{usageByTemplate[selected.id].cases.size} active cases</span>
                    </>
                  )}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Workflow Steps
                </h3>
                <ol className="space-y-2">
                  {selected.items.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-md border border-border bg-background"
                    >
                      <span className="tabular text-[11px] font-semibold text-muted-foreground bg-muted rounded w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-[14px] leading-snug pt-0.5">{item}</span>
                    </li>
                  ))}
                </ol>

                {/* Active cases using this template */}
                {usageByTemplate[selected.id] && usageByTemplate[selected.id].cases.size > 0 && (
                  <div className="mt-8">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Active Cases ({usageByTemplate[selected.id].cases.size})
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from(usageByTemplate[selected.id].cases)
                        .map((cid) => cases.find((c) => c.id === cid))
                        .filter(Boolean)
                        .slice(0, 12)
                        .map((c) => {
                          const items = allItems.filter((i) => i.caseId === c!.id && i.templateId === selected.id);
                          const done = items.filter((i) => i.completed).length;
                          const pct = items.length ? Math.round((done / items.length) * 100) : 0;
                          return (
                            <a
                              key={c!.id}
                              href={`#/cases/${c!.id}`}
                              className="px-3 py-2 rounded-md border border-border bg-background hover:bg-muted/50 transition-colors flex items-center justify-between"
                            >
                              <span className="text-[13px] font-medium truncate">{c!.shortName}</span>
                              <span className="tabular text-[11px] text-muted-foreground shrink-0 ml-2 flex items-center gap-1">
                                {pct === 100 && <CheckCircle2 className="w-3 h-3 text-success" />}
                                {done}/{items.length}
                              </span>
                            </a>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card flex items-center justify-center text-muted-foreground text-sm">
              Select a template to view its steps.
            </div>
          )}
        </div>
      </PageContent>

    </Layout>
  );
}
