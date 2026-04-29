import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout, PageContent, PageHeader } from "@/components/Layout";
import { Pill } from "@/components/StatusPill";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { fmtDate, daysUntil } from "@/lib/format";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Case, Communication, Staff } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function CommsPage() {
  const { data: comms = [] } = useQuery<Communication[]>({ queryKey: ["/api/communications"] });
  const { data: cases = [] } = useQuery<Case[]>({ queryKey: ["/api/cases"] });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });

  const caseById = Object.fromEntries(cases.map((c) => [c.id, c]));
  const staffById = Object.fromEntries(staff.map((s) => [s.id, s]));

  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = comms.filter((c) => {
    if (status !== "all" && c.status !== status) return false;
    if (source !== "all" && c.source !== source) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.subject.toLowerCase().includes(q) && !c.fromName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const updateStatus = useMutation({
    mutationFn: async (vars: { commId: string; status: Communication["status"] }) => apiRequest("POST", "/api/communications/status", vars),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/communications"] }),
  });

  return (
    <Layout>
      <PageHeader
        title="Communications"
        subtitle={`${comms.filter((c) => c.status === "needs_response").length} need a reply · ${comms.filter((c) => c.status === "in_progress").length} in progress`}
      />
      <PageContent>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search subject, sender…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="needs_response">Needs response</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="responded">Responded</SelectItem>
              <SelectItem value="no_action">No action</SelectItem>
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="opposing_counsel">Opposing counsel</SelectItem>
              <SelectItem value="client">Client</SelectItem>
              <SelectItem value="court">Court</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card border border-card-border rounded-lg divide-y divide-border">
          {filtered.map((co) => {
            const c = caseById[co.caseId];
            const a = staffById[co.assigneeId];
            const overdue = co.responseDueAt && daysUntil(co.responseDueAt) < 0;
            return (
              <div key={co.id} className="px-4 py-3 hover-elevate">
                <div className="flex items-start gap-3">
                  <Pill tone={co.source === "opposing_counsel" ? "red" : co.source === "client" ? "blue" : co.source === "court" ? "orange" : "gray"}>
                    {co.source.replace("_", " ")}
                  </Pill>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[13.5px]">{co.subject}</span>
                      {co.priority === "high" && <Pill tone="red">High</Pill>}
                      {overdue && <Pill tone="red">Reply overdue</Pill>}
                    </div>
                    <div className="text-[11.5px] text-muted-foreground mb-1">
                      From {co.fromName}{co.fromOrg && ` (${co.fromOrg})`} · {co.channel} · {fmtDate(co.receivedAt)}
                      {c && (<> · <Link href={`/cases/${c.id}`} className="text-primary hover:underline">{c.client}</Link></>)}
                    </div>
                    <p className="text-[12.5px] text-muted-foreground line-clamp-1">{co.preview}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                      <span className="text-muted-foreground">Assignee: {a?.name || "—"}</span>
                      {co.responseDueAt && (
                        <span className={cn("tabular", overdue && "text-destructive font-semibold")}>
                          Reply due {fmtDate(co.responseDueAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <select
                    value={co.status}
                    onChange={(e) => updateStatus.mutate({ commId: co.id, status: e.target.value as Communication["status"] })}
                    className="text-[11.5px] bg-background border border-border rounded px-2 py-1 self-start"
                    data-testid={`select-comm-${co.id}`}
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
          {filtered.length === 0 && <div className="text-center text-muted-foreground py-12 text-sm">No communications match</div>}
        </div>
      </PageContent>
    </Layout>
  );
}
