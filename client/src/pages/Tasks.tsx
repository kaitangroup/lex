import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout, PageContent, PageHeader } from "@/components/Layout";
import { Pill } from "@/components/StatusPill";
import { EntryDialog } from "@/components/EntryDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate, daysUntil } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Case, DelegatedTask, Staff } from "@shared/schema";
import { cn } from "@/lib/utils";

const COLS: DelegatedTask["status"][] = ["todo", "in_progress", "blocked", "review", "done"];
const COL_LABELS = { todo: "To Do", in_progress: "In Progress", blocked: "Blocked", review: "Review", done: "Done" } as const;

export default function TasksPage() {
  const { data: tasks = [] } = useQuery<DelegatedTask[]>({ queryKey: ["/api/tasks"] });
  const { data: cases = [] } = useQuery<Case[]>({ queryKey: ["/api/cases"] });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });
  const { toast } = useToast();
  const [assignee, setAssignee] = useState("all");

  const caseById = Object.fromEntries(cases.map((c) => [c.id, c]));
  const staffById = Object.fromEntries(staff.map((s) => [s.id, s]));

  const filtered = tasks.filter((t) => assignee === "all" || t.assigneeId === assignee);
  const grouped: Record<string, DelegatedTask[]> = { todo: [], in_progress: [], blocked: [], review: [], done: [] };
  filtered.forEach((t) => grouped[t.status].push(t));

  const updateStatus = useMutation({
    mutationFn: async (vars: { taskId: string; status: DelegatedTask["status"] }) => apiRequest("POST", "/api/tasks/status", vars),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }),
  });

  return (
    <Layout>
      <PageHeader
        title="Delegated Tasks"
        subtitle={`${filtered.filter((t) => t.status !== "done").length} active · ${filtered.filter((t) => t.status !== "done" && daysUntil(t.dueDate) < 0).length} overdue`}
        actions={
          <div className="flex items-center gap-2">
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assignees</SelectItem>
                {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <EntryDialog
              title="Delegate Task"
              fields={[
                { name: "title", label: "Task", type: "text", required: true },
                { name: "description", label: "Description", type: "textarea" },
                { name: "caseId", label: "Case", type: "select", options: cases.map((c) => ({ value: c.id, label: c.client })) },
                { name: "assigneeId", label: "Assignee", type: "select", required: true, options: staff.map((s) => ({ value: s.id, label: s.name })) },
                { name: "priority", label: "Priority", type: "select", options: [
                  { value: "high", label: "High" },
                  { value: "normal", label: "Normal" },
                  { value: "low", label: "Low" },
                ], defaultValue: "normal" },
                { name: "dueDate", label: "Due", type: "date", required: true },
                { name: "estimatedHours", label: "Est. Hours", type: "number" },
              ]}
              onSubmit={() => toast({ title: "Delegated", description: "Task assigned (demo)" })}
            />
          </div>
        }
      />
      <PageContent>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {COLS.map((col) => (
            <div key={col} className="bg-card border border-card-border rounded-lg overflow-hidden flex flex-col">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <span className="font-semibold text-[12.5px] uppercase tracking-wider">{COL_LABELS[col]}</span>
                <span className="text-[11px] text-muted-foreground tabular">{grouped[col].length}</span>
              </div>
              <div className="p-2 space-y-2 flex-1 max-h-[calc(100vh-260px)] overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
                {grouped[col].map((t) => {
                  const c = t.caseId ? caseById[t.caseId] : undefined;
                  const a = staffById[t.assigneeId];
                  const overdue = daysUntil(t.dueDate) < 0 && t.status !== "done";
                  return (
                    <div key={t.id} className="bg-background border border-border rounded p-2.5 space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Pill tone={t.priority === "high" ? "red" : t.priority === "low" ? "gray" : "blue"}>{t.priority}</Pill>
                        {overdue && <Pill tone="red">{Math.abs(daysUntil(t.dueDate))}d late</Pill>}
                      </div>
                      <div className="text-[12.5px] font-medium leading-snug">{t.title}</div>
                      <div className="text-[10.5px] text-muted-foreground">
                        {a?.initials} · Due {fmtDate(t.dueDate)} · {t.estimatedHours}h
                      </div>
                      {c && <Link href={`/cases/${c.id}`} className="text-[10.5px] text-primary hover:underline truncate block">{c.client}</Link>}
                      <select
                        value={t.status}
                        onChange={(e) => updateStatus.mutate({ taskId: t.id, status: e.target.value as DelegatedTask["status"] })}
                        className="text-[10.5px] bg-background border border-border rounded px-1.5 py-0.5 w-full"
                      >
                        {COLS.map((s) => <option key={s} value={s}>{COL_LABELS[s]}</option>)}
                      </select>
                    </div>
                  );
                })}
                {grouped[col].length === 0 && (
                  <div className="text-center text-muted-foreground py-6 text-[11.5px]">Empty</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </PageContent>
    </Layout>
  );
}
