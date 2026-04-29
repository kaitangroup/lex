import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout, PageContent, PageHeader } from "@/components/Layout";
import { Pill } from "@/components/StatusPill";
import { EntryDialog } from "@/components/EntryDialog";
import { fmtDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Case, Staff, Ticket } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function TicketsPage() {
  const { data: tickets = [] } = useQuery<Ticket[]>({ queryKey: ["/api/tickets"] });
  const { data: cases = [] } = useQuery<Case[]>({ queryKey: ["/api/cases"] });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });
  const { toast } = useToast();

  const caseById = Object.fromEntries(cases.map((c) => [c.id, c]));
  const staffById = Object.fromEntries(staff.map((s) => [s.id, s]));

  const groups: Record<Ticket["status"], Ticket[]> = {
    open: [],
    in_progress: [],
    waiting_client: [],
    resolved: [],
  };
  tickets.forEach((t) => groups[t.status].push(t));

  const updateStatus = useMutation({
    mutationFn: async (vars: { ticketId: string; status: Ticket["status"] }) => apiRequest("POST", "/api/tickets/status", vars),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tickets"] }),
  });

  return (
    <Layout>
      <PageHeader
        title="Client Trouble Tickets"
        subtitle={`${tickets.filter((t) => t.status !== "resolved").length} active · ${tickets.filter((t) => t.severity === "critical" && t.status !== "resolved").length} critical`}
        actions={
          <EntryDialog
            title="Open Trouble Ticket"
            fields={[
              { name: "caseId", label: "Case", type: "select", required: true, options: cases.map((c) => ({ value: c.id, label: c.client })) },
              { name: "title", label: "Title", type: "text", required: true },
              { name: "category", label: "Category", type: "select", required: true, options: [
                { value: "billing_dispute", label: "Billing Dispute" },
                { value: "case_strategy", label: "Case Strategy" },
                { value: "missed_communication", label: "Missed Communication" },
                { value: "service_complaint", label: "Service Complaint" },
                { value: "scope_change", label: "Scope Change" },
                { value: "other", label: "Other" },
              ] },
              { name: "severity", label: "Severity", type: "select", required: true, options: [
                { value: "critical", label: "Critical (4h SLA)" },
                { value: "high", label: "High (24h SLA)" },
                { value: "normal", label: "Normal (72h SLA)" },
                { value: "low", label: "Low (1 wk SLA)" },
              ], defaultValue: "normal" },
              { name: "ownerId", label: "Owner", type: "select", required: true, options: staff.filter((s) => s.role !== "paralegal").map((s) => ({ value: s.id, label: s.name })) },
              { name: "description", label: "Description", type: "textarea", required: true },
            ]}
            onSubmit={() => toast({ title: "Ticket opened", description: "Client ticket created (demo)" })}
            submitLabel="Open Ticket"
          />
        }
      />
      <PageContent>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {(["open", "in_progress", "waiting_client", "resolved"] as Ticket["status"][]).map((col) => (
            <div key={col} className="bg-card border border-card-border rounded-lg overflow-hidden flex flex-col">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <span className="font-semibold text-[12.5px] uppercase tracking-wider">{col.replace("_", " ")}</span>
                <span className="text-[11px] text-muted-foreground tabular">{groups[col].length}</span>
              </div>
              <div className="p-2 space-y-2 flex-1">
                {groups[col].map((t) => {
                  const c = caseById[t.caseId];
                  const owner = staffById[t.ownerId];
                  const breachHrs = Math.round((Date.now() - +new Date(t.slaDueAt)) / 3_600_000);
                  const breached = breachHrs > 0 && t.status !== "resolved";
                  return (
                    <div key={t.id} className="bg-background border border-border rounded p-2.5 space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Pill tone={t.severity === "critical" ? "red" : t.severity === "high" ? "orange" : t.severity === "normal" ? "blue" : "gray"}>
                          {t.severity}
                        </Pill>
                        {breached && <Pill tone="red">SLA −{breachHrs}h</Pill>}
                      </div>
                      <div className="text-[12.5px] font-medium leading-snug">{t.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {t.clientName}
                        {c && <> · <Link href={`/cases/${c.id}`} className="text-primary hover:underline">case</Link></>}
                      </div>
                      <div className="text-[10.5px] text-muted-foreground">{t.category.replace("_", " ")} · {owner?.initials}</div>
                      <select
                        value={t.status}
                        onChange={(e) => updateStatus.mutate({ ticketId: t.id, status: e.target.value as Ticket["status"] })}
                        className="text-[10.5px] bg-background border border-border rounded px-1.5 py-0.5 w-full"
                        data-testid={`select-ticket-${t.id}`}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="waiting_client">Waiting on Client</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  );
                })}
                {groups[col].length === 0 && (
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
