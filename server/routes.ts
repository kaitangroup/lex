import type { Express, NextFunction, Request, Response } from "express";
import type { Server } from "node:http";
import { storage, persistNow } from "./storage";
import {
  insertCommentSchema,
  toggleChecklistSchema,
  completeDeadlineSchema,
  updateTaskStatusSchema,
  updateCommStatusSchema,
  updateTicketStatusSchema,
  updateFirmSettingsSchema,
  updateMilestoneSchema,
  reassignMilestoneSchema,
  flagEmergencySchema,
  routingRequestSchema,
  recordOutreachSchema,
  updatePotentialStatusSchema,
  updateMarketingProjectSchema,
  toggleMarketingMilestoneSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // After any mutating API request that succeeds, schedule a SQLite snapshot.
  // Debounced inside db.ts so bursts collapse into one write.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith("/api/")) return next();
    if (req.method === "GET" || req.method === "HEAD") return next();
    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try { persistNow(); } catch (e) { console.error("[persist] failed:", e); }
      }
    });
    next();
  });

  // Staff
  app.get("/api/staff", (_req, res) => res.json(storage.listStaff()));

  // Cases
  app.get("/api/cases", (_req, res) => res.json(storage.listCases()));
  app.get("/api/cases/:id", (req, res) => {
    const c = storage.getCase(req.params.id);
    if (!c) return res.status(404).json({ error: "Not found" });
    res.json(c);
  });

  // Deadlines
  app.get("/api/deadlines", (req, res) => {
    res.json(storage.listDeadlines({
      caseId: req.query.caseId as string | undefined,
      assigneeId: req.query.assigneeId as string | undefined,
    }));
  });
  app.post("/api/deadlines/complete", (req, res) => {
    const parsed = completeDeadlineSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const d = storage.setDeadlineCompleted(parsed.data.deadlineId, parsed.data.completed);
    if (!d) return res.status(404).json({ error: "Not found" });
    res.json(d);
  });

  // Checklists
  app.get("/api/checklists/templates", (_req, res) => res.json(storage.listChecklistTemplates()));
  app.get("/api/checklists/items", (req, res) => {
    res.json(storage.listChecklistItems(req.query.caseId as string | undefined));
  });
  app.post("/api/checklists/toggle", (req, res) => {
    const parsed = toggleChecklistSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const item = storage.toggleChecklistItem(parsed.data.itemId, parsed.data.completed);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });

  // Comments
  app.get("/api/comments", (req, res) => {
    res.json(storage.listComments(req.query.caseId as string));
  });
  app.post("/api/comments", (req, res) => {
    const parsed = insertCommentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    res.json(storage.addComment(parsed.data));
  });

  // Schedule
  app.get("/api/schedule", (req, res) => {
    res.json(storage.listSchedule({
      staffId: req.query.staffId as string | undefined,
      caseId: req.query.caseId as string | undefined,
    }));
  });

  // Communications
  app.get("/api/communications", (req, res) => {
    res.json(storage.listCommunications({
      caseId: req.query.caseId as string | undefined,
      assigneeId: req.query.assigneeId as string | undefined,
      status: req.query.status as string | undefined,
    }));
  });
  app.post("/api/communications/status", (req, res) => {
    const parsed = updateCommStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const c = storage.setCommStatus(parsed.data.commId, parsed.data.status);
    if (!c) return res.status(404).json({ error: "Not found" });
    res.json(c);
  });

  // Tickets
  app.get("/api/tickets", (req, res) => {
    res.json(storage.listTickets({ caseId: req.query.caseId as string | undefined }));
  });
  app.post("/api/tickets/status", (req, res) => {
    const parsed = updateTicketStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const t = storage.setTicketStatus(parsed.data.ticketId, parsed.data.status);
    if (!t) return res.status(404).json({ error: "Not found" });
    res.json(t);
  });

  // Tasks
  app.get("/api/tasks", (req, res) => {
    res.json(storage.listTasks({
      caseId: req.query.caseId as string | undefined,
      assigneeId: req.query.assigneeId as string | undefined,
    }));
  });
  app.post("/api/tasks/status", (req, res) => {
    const parsed = updateTaskStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const t = storage.setTaskStatus(parsed.data.taskId, parsed.data.status);
    if (!t) return res.status(404).json({ error: "Not found" });
    res.json(t);
  });

  // Billing
  app.get("/api/invoices", (req, res) => {
    res.json(storage.listInvoices({ caseId: req.query.caseId as string | undefined }));
  });
  app.get("/api/time", (req, res) => {
    res.json(storage.listTimeEntries({
      caseId: req.query.caseId as string | undefined,
      staffId: req.query.staffId as string | undefined,
    }));
  });

  // Documents
  app.get("/api/documents", (req, res) => {
    res.json(storage.listDocuments({
      caseId: req.query.caseId as string | undefined,
      source: req.query.source as string | undefined,
    }));
  });

  // Firm settings
  app.get("/api/settings", (_req, res) => res.json(storage.getFirmSettings()));
  app.patch("/api/settings", (req, res) => {
    const parsed = updateFirmSettingsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    res.json(storage.updateFirmSettings(parsed.data));
  });

  // Court Watch
  app.get("/api/court-watch", (req, res) => {
    res.json(storage.listCourtFilings({
      category: req.query.category as string | undefined,
      status: req.query.status as string | undefined,
    }));
  });
  app.post("/api/court-watch/status", (req, res) => {
    const parsed = z.object({
      filingId: z.string(),
      status: z.enum(["new", "reviewing", "pursuing", "passed", "won"]),
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const f = storage.setCourtFilingStatus(parsed.data.filingId, parsed.data.status);
    if (!f) return res.status(404).json({ error: "Not found" });
    res.json(f);
  });

  // Case workflow milestones (crux / position / intake checklist)
  app.post("/api/cases/:id/crux", (req, res) => {
    const parsed = z.object({ completed: z.boolean() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const c = storage.setCaseCrux(req.params.id, parsed.data.completed);
    if (!c) return res.status(404).json({ error: "Not found" });
    res.json(c);
  });
  app.post("/api/cases/:id/position", (req, res) => {
    const parsed = z.object({ completed: z.boolean() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const c = storage.setCasePosition(req.params.id, parsed.data.completed);
    if (!c) return res.status(404).json({ error: "Not found" });
    res.json(c);
  });
  app.post("/api/cases/:id/intake-checklist", (req, res) => {
    const parsed = z.object({ completed: z.boolean() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const c = storage.setCaseIntakeChecklist(req.params.id, parsed.data.completed);
    if (!c) return res.status(404).json({ error: "Not found" });
    res.json(c);
  });
  app.post("/api/cases/:id/priority", (req, res) => {
    const parsed = flagEmergencySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const c = storage.setCasePriority(req.params.id, parsed.data.priority);
    if (!c) return res.status(404).json({ error: "Not found" });
    res.json(c);
  });

  // Milestones
  app.get("/api/milestones", (req, res) => {
    res.json(storage.listMilestones({
      caseId: req.query.caseId as string | undefined,
      assigneeId: req.query.assigneeId as string | undefined,
      kind: req.query.kind as any,
    }));
  });
  app.patch("/api/milestones/:id", (req, res) => {
    const parsed = updateMilestoneSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const m = storage.updateMilestone(req.params.id, parsed.data);
    if (!m) return res.status(404).json({ error: "Not found" });
    res.json(m);
  });
  app.post("/api/milestones/:id/reassign", (req, res) => {
    const parsed = reassignMilestoneSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const m = storage.reassignMilestone(req.params.id, parsed.data.newAssigneeId);
    if (!m) return res.status(404).json({ error: "Not found" });
    res.json(m);
  });

  // Capacity & routing
  app.get("/api/capacity", (req, res) => {
    const windowDays = req.query.windowDays ? parseInt(req.query.windowDays as string, 10) : 14;
    res.json(storage.computeLawyerLoads(windowDays));
  });

  // Alerts history (synthesized from milestones + deadlines for trend chart)
  app.get("/api/alerts-history", (_req, res) => {
    const settings = storage.getFirmSettings();
    const milestones = storage.listMilestones();
    const deadlines = storage.listDeadlines();
    const days = 30;
    const out: Array<{ date: string; red: number; yellow: number; total: number }> = [];
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      let red = 0, yellow = 0;
      for (const m of milestones) {
        if (m.status === "complete" && m.completedAt && new Date(m.completedAt) <= d) continue;
        if (new Date(m.dueDate) < new Date(d.getTime() - 60 * 86400000)) continue;
        const days2 = (new Date(m.dueDate).getTime() - d.getTime()) / 86400000;
        if (days2 <= settings.milestoneRedDays) red++;
        else if (days2 <= settings.milestoneYellowDays) yellow++;
      }
      for (const dl of deadlines) {
        if (dl.status === "completed" && dl.completedAt && new Date(dl.completedAt) <= d) continue;
        if (new Date(dl.dueDate) < new Date(d.getTime() - 60 * 86400000)) continue;
        const days2 = (new Date(dl.dueDate).getTime() - d.getTime()) / 86400000;
        if (days2 <= settings.deadlineRedDays) red++;
        else if (days2 <= settings.deadlineYellowDays) yellow++;
      }
      out.push({
        date: d.toISOString().slice(0, 10),
        red,
        yellow,
        total: red + yellow,
      });
    }
    res.json(out);
  });

  // Financials trend: billable hours and revenue by month for last 18 months
  app.get("/api/financials-trend", (_req, res) => {
    const time = storage.listTimeEntries();
    const invoices = storage.listInvoices();
    const months: Record<string, { month: string; billableHours: number; revenue: number; collected: number }> = {};
    const now = new Date();
    for (let i = 17; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = { month: key, billableHours: 0, revenue: 0, collected: 0 };
    }
    for (const t of time) {
      if (!t.billable) continue;
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (months[key]) months[key].billableHours += t.hours;
    }
    for (const inv of invoices) {
      const d = new Date(inv.issueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (months[key]) {
        months[key].revenue += inv.amount;
        months[key].collected += inv.amountPaid;
      }
    }
    const arr = Object.values(months).map((m) => ({
      ...m,
      billableHours: Math.round(m.billableHours),
      revenue: Math.round(m.revenue),
      collected: Math.round(m.collected),
    }));
    res.json(arr);
  });
  app.post("/api/routing/recommend", (req, res) => {
    const parsed = routingRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    res.json(storage.recommendLawyer(parsed.data));
  });

  // Potentials
  app.get("/api/potentials", (_req, res) => res.json(storage.listPotentials()));
  app.post("/api/potentials/:id/outreach", (req, res) => {
    const parsed = recordOutreachSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const p = storage.recordPotentialOutreach(req.params.id, parsed.data);
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(p);
  });
  app.post("/api/potentials/:id/status", (req, res) => {
    const parsed = updatePotentialStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const p = storage.updatePotentialStatus(req.params.id, parsed.data.outreachStatus);
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(p);
  });

  // Margaret's four-question dashboard summaries
  app.get("/api/hours-summary", (_req, res) => {
    res.json(storage.computeHoursSummary());
  });
  app.get("/api/firm-performance", (_req, res) => {
    res.json(storage.computeFirmPerformance());
  });
  app.get("/api/accountability-summary", (_req, res) => {
    res.json(storage.computeAccountabilitySummary());
  });
  app.get("/api/strategic-projects-summary", (_req, res) => {
    res.json(storage.computeStrategicProjectsSummary());
  });

  // Marketing
  app.get("/api/marketing/projects", (_req, res) => res.json(storage.listMarketingProjects()));
  app.patch("/api/marketing/projects/:id", (req, res) => {
    const parsed = updateMarketingProjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const m = storage.updateMarketingProject(req.params.id, parsed.data);
    if (!m) return res.status(404).json({ error: "Not found" });
    res.json(m);
  });
  app.post("/api/marketing/milestones/toggle", (req, res) => {
    const parsed = toggleMarketingMilestoneSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const m = storage.toggleMarketingMilestone(parsed.data.milestoneId, parsed.data.completed);
    if (!m) return res.status(404).json({ error: "Not found" });
    res.json(m);
  });

  return httpServer;
}
