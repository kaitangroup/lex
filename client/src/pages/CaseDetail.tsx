import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  CheckSquare,
  ClipboardList,
  DollarSign,
  FileText,
  Mail,
  MessageSquare,
  Target,
  Gavel,
  CheckCircle2,
} from "lucide-react";
import { Layout, PageContent, PageHeader } from "@/components/Layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StageStepper } from "@/components/StageStepper";
import { Pill, DaysBadge } from "@/components/StatusPill";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EntryDialog } from "@/components/EntryDialog";
import { fmtDate, fmtMoney, caseTypeLabel, daysUntil } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  Case,
  CaseComment,
  CaseDocument,
  ChecklistItem,
  Communication,
  Deadline,
  DelegatedTask,
  Invoice,
  ScheduleBlock,
  Staff,
} from "@shared/schema";
import { cn } from "@/lib/utils";

export default function CaseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const { data: c } = useQuery<Case>({ queryKey: ["/api/cases", id] });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });
  const { data: deadlines = [] } = useQuery<Deadline[]>({ queryKey: ["/api/deadlines", { caseId: id }], queryFn: async () => (await apiRequest("GET", `/api/deadlines?caseId=${id}`)).json() });
  const { data: checklist = [] } = useQuery<ChecklistItem[]>({ queryKey: ["/api/checklists/items", { caseId: id }], queryFn: async () => (await apiRequest("GET", `/api/checklists/items?caseId=${id}`)).json() });
  const { data: comments = [] } = useQuery<CaseComment[]>({ queryKey: ["/api/comments", { caseId: id }], queryFn: async () => (await apiRequest("GET", `/api/comments?caseId=${id}`)).json() });
  const { data: comms = [] } = useQuery<Communication[]>({ queryKey: ["/api/communications", { caseId: id }], queryFn: async () => (await apiRequest("GET", `/api/communications?caseId=${id}`)).json() });
  const { data: tasks = [] } = useQuery<DelegatedTask[]>({ queryKey: ["/api/tasks", { caseId: id }], queryFn: async () => (await apiRequest("GET", `/api/tasks?caseId=${id}`)).json() });
  const { data: docs = [] } = useQuery<CaseDocument[]>({ queryKey: ["/api/documents", { caseId: id }], queryFn: async () => (await apiRequest("GET", `/api/documents?caseId=${id}`)).json() });
  const { data: invoices = [] } = useQuery<Invoice[]>({ queryKey: ["/api/invoices", { caseId: id }], queryFn: async () => (await apiRequest("GET", `/api/invoices?caseId=${id}`)).json() });
  const { data: schedule = [] } = useQuery<ScheduleBlock[]>({ queryKey: ["/api/schedule", { caseId: id }], queryFn: async () => (await apiRequest("GET", `/api/schedule?caseId=${id}`)).json() });

  const staffById = Object.fromEntries(staff.map((s) => [s.id, s]));

  const toggleChecklist = useMutation({
    mutationFn: async (vars: { itemId: string; completed: boolean }) => {
      return apiRequest("POST", "/api/checklists/toggle", vars);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/checklists/items", { caseId: id }] }),
  });
  const toggleDeadline = useMutation({
    mutationFn: async (vars: { deadlineId: string; completed: boolean }) => {
      return apiRequest("POST", "/api/deadlines/complete", vars);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deadlines", { caseId: id }] });
      queryClient.invalidateQueries({ queryKey: ["/api/deadlines"] });
    },
  });
  const addComment = useMutation({
    mutationFn: async (vars: { caseId: string; authorId: string; text: string }) => apiRequest("POST", "/api/comments", vars),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/comments", { caseId: id }] }),
  });

  const [newComment, setNewComment] = useState("");

  if (!c) {
    return (
      <Layout>
        <PageContent>
          <div className="text-muted-foreground">Loading…</div>
        </PageContent>
      </Layout>
    );
  }

  const lead = staffById[c.leadAttorneyId];
  const team = c.teamIds.map((tid) => staffById[tid]).filter(Boolean);
  const courtDls = deadlines.filter((d) => d.kind === "court").sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
  const internalDls = deadlines.filter((d) => d.kind === "internal").sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
  const ourDocs = docs.filter((d) => d.source === "client" || d.source === "our_production" || d.source === "court_filing" || d.source === "work_product" || d.source === "expert");
  const oppDocs = docs.filter((d) => d.source === "opposing_production");
  const arOutstanding = invoices.reduce((s, i) => s + (i.amount - i.amountPaid), 0);
  const totalBilled = invoices.reduce((s, i) => s + i.amount, 0);
  const completedChecklist = checklist.filter((i) => i.completed).length;

  // Group checklist by template
  const checklistByTemplate = new Map<string, { name: string; items: ChecklistItem[] }>();
  for (const it of checklist) {
    const e = checklistByTemplate.get(it.templateId) || { name: it.templateName, items: [] };
    e.items.push(it);
    checklistByTemplate.set(it.templateId, e);
  }

  const staffOptions = staff.map((s) => ({ value: s.id, label: s.name }));

  return (
    <Layout>
      <PageHeader
        title={c.client}
        subtitle={`${c.caption} · ${c.caseNumber} · ${c.court}`}
        actions={
          <Link href="/cases">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> All Cases
            </Button>
          </Link>
        }
      />
      <PageContent>
        {/* Stage stepper + summary card */}
        <div className="bg-card border border-card-border rounded-lg p-5 mb-5">
          <div className="mb-5">
            <StageStepper current={c.stage} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-4 border-t border-border">
            <div className="lg:col-span-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Crux of the Matter</div>
              <p className="text-[14px] leading-relaxed">{c.cruxSummary}</p>
              <div className="mt-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Our Position</div>
                <p className="text-[13px] text-muted-foreground">{c.ourPosition}</p>
              </div>
            </div>
            <div className="space-y-3">
              <Field label="Type" value={caseTypeLabel(c.type)} />
              <Field label="Lead Attorney" value={lead?.name} />
              <Field label="Team" value={team.map((t) => t.initials).join(" · ")} />
              <Field label="Filed" value={fmtDate(c.filedDate)} />
              {c.trialDate && (
                <Field
                  label="Trial Date"
                  value={`${fmtDate(c.trialDate)} (${daysUntil(c.trialDate)}d)`}
                  emphasize={daysUntil(c.trialDate) < 60}
                />
              )}
              <Field label="Exposure Range" value={c.exposureRange} />
              <Field
                label="Fee Arrangement"
                value={`${c.feeArrangement[0].toUpperCase()}${c.feeArrangement.slice(1)}${c.billingRate ? ` · $${c.billingRate}/hr` : ""}`}
              />
            </div>
          </div>
        </div>

        {/* Quick stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
          <Stat label="Court Deadlines" value={courtDls.length} />
          <Stat label="Internal Milestones" value={internalDls.length} />
          <Stat
            label="Checklist Done"
            value={`${completedChecklist}/${checklist.length}`}
          />
          <Stat label="Open Tasks" value={tasks.filter((t) => t.status !== "done").length} />
          <Stat label="WIP Unbilled" value={fmtMoney(c.wipBalance)} />
          <Stat label="A/R Outstanding" value={fmtMoney(arOutstanding)} />
        </div>

        <Tabs defaultValue="deadlines" className="w-full">
          <TabsList className="bg-card border border-card-border">
            <TabsTrigger value="deadlines" data-testid="tab-deadlines"><Gavel className="w-3.5 h-3.5 mr-1.5" /> Deadlines & Milestones</TabsTrigger>
            <TabsTrigger value="checklists" data-testid="tab-checklists"><ClipboardList className="w-3.5 h-3.5 mr-1.5" /> Checklists</TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents"><FileText className="w-3.5 h-3.5 mr-1.5" /> Documents</TabsTrigger>
            <TabsTrigger value="comms" data-testid="tab-comms"><Mail className="w-3.5 h-3.5 mr-1.5" /> Communications</TabsTrigger>
            <TabsTrigger value="tasks" data-testid="tab-tasks"><CheckSquare className="w-3.5 h-3.5 mr-1.5" /> Tasks</TabsTrigger>
            <TabsTrigger value="comments" data-testid="tab-comments"><MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Comments</TabsTrigger>
            <TabsTrigger value="billing" data-testid="tab-billing"><DollarSign className="w-3.5 h-3.5 mr-1.5" /> Billing</TabsTrigger>
          </TabsList>

          {/* DEADLINES */}
          <TabsContent value="deadlines" className="mt-4 space-y-5">
            <DeadlineSection
              title="Court Deadlines & Hearings"
              deadlines={courtDls}
              staffById={staffById}
              onToggle={(id, c) => toggleDeadline.mutate({ deadlineId: id, completed: c })}
              caseId={c.id}
              staffOptions={staffOptions}
              kind="court"
            />
            <DeadlineSection
              title="Internal Milestones"
              deadlines={internalDls}
              staffById={staffById}
              onToggle={(id, c) => toggleDeadline.mutate({ deadlineId: id, completed: c })}
              caseId={c.id}
              staffOptions={staffOptions}
              kind="internal"
            />
          </TabsContent>

          {/* CHECKLISTS */}
          <TabsContent value="checklists" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <EntryDialog
                title="Apply Checklist Template"
                fields={[
                  { name: "templateId", label: "Template", type: "select", required: true, options: [
                    { value: "tpl1", label: "New Case Intake" },
                    { value: "tpl2", label: "Avoidance Action Defense" },
                    { value: "tpl3", label: "Deposition Preparation" },
                    { value: "tpl4", label: "MSJ Filing" },
                    { value: "tpl5", label: "Trial Prep — 30 Day Countdown" },
                  ] },
                  { name: "ownerId", label: "Default Owner", type: "select", options: staffOptions },
                ]}
                onSubmit={() => toast({ title: "Template applied", description: "Items added to this matter (demo)" })}
                submitLabel="Apply"
              />
            </div>
            {Array.from(checklistByTemplate.entries()).map(([tplId, { name, items }]) => {
              const done = items.filter((i) => i.completed).length;
              return (
                <div key={tplId} className="bg-card border border-card-border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <span className="font-semibold text-[13.5px]">{name}</span>
                    <span className="text-[11.5px] text-muted-foreground tabular">{done}/{items.length} complete</span>
                  </div>
                  <div className="divide-y divide-border">
                    {items.map((it) => (
                      <label
                        key={it.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40 cursor-pointer"
                      >
                        <Checkbox
                          checked={it.completed}
                          onCheckedChange={(v) => toggleChecklist.mutate({ itemId: it.id, completed: !!v })}
                          data-testid={`checkbox-${it.id}`}
                        />
                        <span className={cn("flex-1 text-[13px]", it.completed && "line-through text-muted-foreground")}>
                          {it.text}
                        </span>
                        {it.assigneeId && staffById[it.assigneeId] && (
                          <span className="text-[11px] text-muted-foreground">{staffById[it.assigneeId].initials}</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {/* DOCUMENTS */}
          <TabsContent value="documents" className="mt-4">
            <DocumentsTab docs={docs} staffById={staffById} caseId={c.id} />
          </TabsContent>

          {/* COMMUNICATIONS */}
          <TabsContent value="comms" className="mt-4">
            <CommsTab comms={comms} staffById={staffById} caseId={c.id} staffOptions={staffOptions} />
          </TabsContent>

          {/* TASKS */}
          <TabsContent value="tasks" className="mt-4">
            <TasksTab tasks={tasks} staffById={staffById} caseId={c.id} staffOptions={staffOptions} />
          </TabsContent>

          {/* COMMENTS */}
          <TabsContent value="comments" className="mt-4">
            <div className="bg-card border border-card-border rounded-lg p-4 space-y-3 max-w-3xl">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Add a progress note</div>
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="What's the latest on this matter?"
                rows={3}
                data-testid="textarea-comment"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => {
                    if (!newComment.trim()) return;
                    addComment.mutate({ caseId: c.id, authorId: "s1", text: newComment });
                    setNewComment("");
                  }}
                  data-testid="button-add-comment"
                >
                  Post Note
                </Button>
              </div>
            </div>
            <div className="mt-5 space-y-3 max-w-3xl">
              {comments.map((cm) => {
                const a = staffById[cm.authorId];
                return (
                  <div key={cm.id} className="bg-card border border-card-border rounded-lg p-4">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10.5px] font-semibold">
                        {a?.initials || "?"}
                      </div>
                      <div className="flex-1">
                        <div className="text-[13px] font-medium">{cm.authorName}</div>
                        <div className="text-[11px] text-muted-foreground tabular">{fmtDate(cm.createdAt)}</div>
                      </div>
                    </div>
                    <p className="text-[13.5px] leading-relaxed">{cm.text}</p>
                  </div>
                );
              })}
              {comments.length === 0 && (
                <div className="text-center text-muted-foreground py-8 text-sm">No comments yet</div>
              )}
            </div>
          </TabsContent>

          {/* BILLING */}
          <TabsContent value="billing" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Total Billed" value={fmtMoney(totalBilled)} />
              <Stat label="A/R Outstanding" value={fmtMoney(arOutstanding)} tone={arOutstanding > 25000 ? "red" : "green"} />
              <Stat label="WIP Unbilled" value={fmtMoney(c.wipBalance)} />
              <Stat label="Retainer Balance" value={fmtMoney(c.retainerBalance)} />
            </div>
            {c.budgetCap && (
              <div className="bg-card border border-card-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12.5px] font-medium">Budget vs. Actual</span>
                  <span className="text-[11.5px] text-muted-foreground tabular">
                    {fmtMoney(totalBilled + c.wipBalance)} of {fmtMoney(c.budgetCap)}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full",
                      (totalBilled + c.wipBalance) / c.budgetCap > 1
                        ? "bg-destructive"
                        : (totalBilled + c.wipBalance) / c.budgetCap > 0.85
                        ? "bg-warning"
                        : "bg-success"
                    )}
                    style={{ width: `${Math.min(100, ((totalBilled + c.wipBalance) / c.budgetCap) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            <div className="bg-card border border-card-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border font-semibold text-[13.5px]">Invoices</div>
              <table className="w-full text-[13px]">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Invoice</th>
                    <th className="text-left px-3 py-2 font-medium">Issued</th>
                    <th className="text-left px-3 py-2 font-medium">Due</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-right px-3 py-2 font-medium">Amount</th>
                    <th className="text-right px-4 py-2 font-medium">Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i) => (
                    <tr key={i.id} className="border-t border-border">
                      <td className="px-4 py-2.5 tabular text-[12.5px]">{i.number}</td>
                      <td className="px-3 py-2.5 tabular text-[12px] text-muted-foreground">{fmtDate(i.issueDate)}</td>
                      <td className="px-3 py-2.5 tabular text-[12px] text-muted-foreground">{fmtDate(i.dueDate)}</td>
                      <td className="px-3 py-2.5">
                        <Pill tone={i.status === "paid" ? "green" : i.status === "overdue" ? "red" : i.status === "partial" ? "orange" : "blue"}>
                          {i.status}
                        </Pill>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular">{fmtMoney(i.amount)}</td>
                      <td className="px-4 py-2.5 text-right tabular text-success">{fmtMoney(i.amountPaid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </PageContent>
    </Layout>
  );
}

function Field({ label, value, emphasize }: { label: string; value?: string; emphasize?: boolean }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 text-[12.5px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", emphasize && "text-warning")}>{value || "—"}</span>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "red" | "green" }) {
  return (
    <div className="bg-card border border-card-border rounded-lg p-3.5">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-lg font-semibold mt-1 tabular",
          tone === "red" && "text-destructive",
          tone === "green" && "text-success"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function DeadlineSection({
  title,
  deadlines,
  staffById,
  onToggle,
  caseId,
  staffOptions,
  kind,
}: {
  title: string;
  deadlines: Deadline[];
  staffById: Record<string, Staff>;
  onToggle: (id: string, completed: boolean) => void;
  caseId: string;
  staffOptions: { value: string; label: string }[];
  kind: "court" | "internal";
}) {
  const { toast } = useToast();
  return (
    <div className="bg-card border border-card-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="font-semibold text-[13.5px]">{title}</span>
        <EntryDialog
          title={kind === "court" ? "New Court Deadline" : "New Internal Milestone"}
          fields={[
            { name: "title", label: "Title", type: "text", required: true, placeholder: "e.g. Reply Brief — MSJ" },
            { name: "dueDate", label: "Due Date", type: "date", required: true },
            { name: "assigneeId", label: "Assignee", type: "select", required: true, options: staffOptions },
            { name: "notes", label: "Notes", type: "textarea", placeholder: "Context, rule citation, etc." },
          ]}
          onSubmit={() => toast({ title: "Saved", description: `${kind === "court" ? "Deadline" : "Milestone"} added (demo)` })}
        />
      </div>
      <div className="divide-y divide-border">
        {deadlines.length === 0 && (
          <div className="text-center text-muted-foreground py-6 text-[12.5px]">None recorded</div>
        )}
        {deadlines.map((d) => {
          const a = staffById[d.assigneeId];
          return (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30">
              <Checkbox
                checked={d.status === "completed"}
                onCheckedChange={(v) => onToggle(d.id, !!v)}
                data-testid={`checkbox-deadline-${d.id}`}
              />
              <DaysBadge dueIso={d.dueDate} completed={d.status === "completed"} />
              <div className="flex-1 min-w-0">
                <div className={cn("text-[13.5px] font-medium", d.status === "completed" && "line-through text-muted-foreground")}>
                  {d.title.replace(/^Internal:\s*/, "")}
                </div>
                <div className="text-[11.5px] text-muted-foreground tabular">
                  {fmtDate(d.dueDate)}
                  {a && ` · ${a.name}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocumentsTab({ docs, staffById, caseId }: { docs: CaseDocument[]; staffById: Record<string, Staff>; caseId: string }) {
  const [tab, setTab] = useState("client");
  const { toast } = useToast();
  const groups = {
    client: docs.filter((d) => d.source === "client"),
    our_production: docs.filter((d) => d.source === "our_production"),
    opposing_production: docs.filter((d) => d.source === "opposing_production"),
    court_filing: docs.filter((d) => d.source === "court_filing"),
    work_product: docs.filter((d) => d.source === "work_product"),
    expert: docs.filter((d) => d.source === "expert"),
  };
  const labels: Record<string, string> = {
    client: "Client Documents",
    our_production: "Our Production",
    opposing_production: "Opposing Production",
    court_filing: "Court Filings",
    work_product: "Work Product",
    expert: "Expert Materials",
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-card border border-card-border">
            {Object.entries(groups).map(([key, list]) => (
              <TabsTrigger key={key} value={key} data-testid={`tab-doc-${key}`}>
                {labels[key]} <span className="ml-1.5 text-muted-foreground tabular text-[10.5px]">{list.length}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <EntryDialog
          title="Upload Documents"
          fields={[
            { name: "source", label: "Source", type: "select", required: true, options: Object.entries(labels).map(([k, l]) => ({ value: k, label: l })) },
            { name: "tags", label: "Tags", type: "multiselect", options: ["key", "discovery", "financials", "communications", "pleadings", "expert", "trial", "settlement", "privileged"].map((t) => ({ value: t, label: t })) },
            { name: "bates", label: "Bates Range", type: "text", placeholder: "e.g. PROD-000001 to PROD-000250" },
            { name: "description", label: "Description", type: "textarea" },
            { name: "files", label: "Files", type: "file" },
          ]}
          onSubmit={(v) => toast({ title: "Uploaded", description: `${(v._files as File[])?.length || 0} file(s) added (demo)` })}
          submitLabel="Upload"
        />
      </div>
      {Object.entries(groups).map(([key, list]) => (
        <div key={key} className={cn(tab !== key && "hidden")}>
          <div className="bg-card border border-card-border rounded-lg overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-3 py-2 font-medium">Bates</th>
                  <th className="text-left px-3 py-2 font-medium">Tags</th>
                  <th className="text-left px-3 py-2 font-medium">Uploaded</th>
                  <th className="text-right px-4 py-2 font-medium">Size</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => {
                  const u = staffById[d.uploadedById];
                  return (
                    <tr key={d.id} className="border-t border-border hover:bg-accent/30 cursor-pointer">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div>
                            <div className="font-medium truncate max-w-[420px]">{d.name}</div>
                            {d.description && (
                              <div className="text-[11px] text-muted-foreground truncate max-w-[420px]">{d.description}</div>
                            )}
                          </div>
                          {d.privileged && <Pill tone="red">Privileged</Pill>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 tabular text-[12px] text-muted-foreground">{d.bates || "—"}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 flex-wrap">
                          {d.tags.slice(0, 3).map((t) => (<Pill key={t}>{t}</Pill>))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 tabular text-[12px] text-muted-foreground">
                        {fmtDate(d.uploadedAt)}{u && ` · ${u.initials}`}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular text-[12px] text-muted-foreground">
                        {d.sizeKb >= 1024 ? `${(d.sizeKb / 1024).toFixed(1)} MB` : `${d.sizeKb} KB`}
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted-foreground py-6 text-[12.5px]">No documents</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function CommsTab({ comms, staffById, caseId, staffOptions }: { comms: Communication[]; staffById: Record<string, Staff>; caseId: string; staffOptions: { value: string; label: string }[] }) {
  const { toast } = useToast();
  const updateStatus = useMutation({
    mutationFn: async (vars: { commId: string; status: Communication["status"] }) => apiRequest("POST", "/api/communications/status", vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications", { caseId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
    },
  });
  return (
    <div>
      <div className="flex justify-end mb-3">
        <EntryDialog
          title="Log Communication"
          fields={[
            { name: "source", label: "From", type: "select", required: true, options: [
              { value: "opposing_counsel", label: "Opposing Counsel" },
              { value: "client", label: "Client" },
              { value: "court", label: "Court" },
              { value: "expert", label: "Expert" },
            ] },
            { name: "channel", label: "Channel", type: "select", required: true, options: [
              { value: "email", label: "Email" },
              { value: "letter", label: "Letter" },
              { value: "phone", label: "Phone" },
              { value: "filing", label: "Filing" },
            ] },
            { name: "fromName", label: "From (Name)", type: "text", required: true },
            { name: "subject", label: "Subject", type: "text", required: true },
            { name: "preview", label: "Summary", type: "textarea" },
            { name: "priority", label: "Priority", type: "select", options: [
              { value: "high", label: "High" },
              { value: "normal", label: "Normal" },
              { value: "low", label: "Low" },
            ], defaultValue: "normal" },
            { name: "assigneeId", label: "Assigned To", type: "select", options: staffOptions },
            { name: "responseDueAt", label: "Response Due", type: "date" },
          ]}
          onSubmit={() => toast({ title: "Logged", description: "Communication recorded (demo)" })}
        />
      </div>
      <div className="bg-card border border-card-border rounded-lg divide-y divide-border">
        {comms.map((co) => {
          const a = staffById[co.assigneeId];
          return (
            <div key={co.id} className="px-4 py-3 hover:bg-accent/30">
              <div className="flex items-start gap-3">
                <Pill tone={co.source === "opposing_counsel" ? "red" : co.source === "client" ? "blue" : co.source === "court" ? "orange" : "gray"}>
                  {co.source.replace("_", " ")}
                </Pill>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[13.5px]">{co.subject}</span>
                    {co.priority === "high" && <Pill tone="red">High</Pill>}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground mb-1.5">
                    From {co.fromName}{co.fromOrg && ` (${co.fromOrg})`} · {co.channel} · {fmtDate(co.receivedAt)}
                  </div>
                  <p className="text-[12.5px] text-muted-foreground line-clamp-2">{co.preview}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11.5px]">
                    <span>Assignee: {a?.name || "Unassigned"}</span>
                    {co.responseDueAt && (
                      <span className={cn(daysUntil(co.responseDueAt) < 0 && "text-destructive font-semibold")}>
                        Reply due {fmtDate(co.responseDueAt)} ({daysUntil(co.responseDueAt)}d)
                      </span>
                    )}
                  </div>
                </div>
                <select
                  value={co.status}
                  onChange={(e) => updateStatus.mutate({ commId: co.id, status: e.target.value as Communication["status"] })}
                  className="text-[11.5px] bg-background border border-border rounded px-2 py-1"
                  data-testid={`select-status-${co.id}`}
                >
                  <option value="needs_response">Needs Response</option>
                  <option value="in_progress">In Progress</option>
                  <option value="responded">Responded</option>
                  <option value="no_action">No Action</option>
                </select>
              </div>
            </div>
          );
        })}
        {comms.length === 0 && <div className="text-center text-muted-foreground py-8 text-sm">No communications logged</div>}
      </div>
    </div>
  );
}

function TasksTab({ tasks, staffById, caseId, staffOptions }: { tasks: DelegatedTask[]; staffById: Record<string, Staff>; caseId: string; staffOptions: { value: string; label: string }[] }) {
  const { toast } = useToast();
  const updateStatus = useMutation({
    mutationFn: async (vars: { taskId: string; status: DelegatedTask["status"] }) => apiRequest("POST", "/api/tasks/status", vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { caseId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });
  return (
    <div>
      <div className="flex justify-end mb-3">
        <EntryDialog
          title="Delegate Task"
          fields={[
            { name: "title", label: "Task", type: "text", required: true },
            { name: "description", label: "Description", type: "textarea" },
            { name: "assigneeId", label: "Assignee", type: "select", required: true, options: staffOptions },
            { name: "priority", label: "Priority", type: "select", options: [
              { value: "high", label: "High" },
              { value: "normal", label: "Normal" },
              { value: "low", label: "Low" },
            ], defaultValue: "normal" },
            { name: "dueDate", label: "Due Date", type: "date", required: true },
            { name: "estimatedHours", label: "Estimated Hours", type: "number", placeholder: "e.g. 4" },
          ]}
          onSubmit={() => toast({ title: "Delegated", description: "Task assigned (demo)" })}
        />
      </div>
      <div className="bg-card border border-card-border rounded-lg divide-y divide-border">
        {tasks.map((t) => {
          const a = staffById[t.assigneeId];
          const overdue = daysUntil(t.dueDate) < 0 && t.status !== "done";
          return (
            <div key={t.id} className="px-4 py-3 flex items-center gap-3">
              <Pill tone={t.priority === "high" ? "red" : t.priority === "low" ? "gray" : "blue"}>{t.priority}</Pill>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium truncate">{t.title}</div>
                <div className="text-[11.5px] text-muted-foreground tabular">
                  {a?.name || "Unassigned"} · Due {fmtDate(t.dueDate)} · {t.estimatedHours}h est.
                  {overdue && <span className="text-destructive font-semibold ml-1">· OVERDUE</span>}
                </div>
              </div>
              <select
                value={t.status}
                onChange={(e) => updateStatus.mutate({ taskId: t.id, status: e.target.value as DelegatedTask["status"] })}
                className="text-[11.5px] bg-background border border-border rounded px-2 py-1"
                data-testid={`select-task-status-${t.id}`}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
          );
        })}
        {tasks.length === 0 && <div className="text-center text-muted-foreground py-8 text-sm">No tasks delegated</div>}
      </div>
    </div>
  );
}
