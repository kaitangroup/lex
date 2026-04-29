import {
  STAFF,
  CASES,
  DEADLINES,
  CHECKLIST_TEMPLATES,
  CHECKLIST_ITEMS,
  COMMENTS,
  SCHEDULE,
  COMMUNICATIONS,
  TICKETS,
  TASKS,
  INVOICES,
  TIME_ENTRIES,
  DOCUMENTS,
  FIRM_SETTINGS,
  COURT_FILINGS,
  MILESTONES,
  POTENTIALS,
  MARKETING_PROJECTS,
} from "./seed";
import type {
  Staff,
  Case,
  Deadline,
  ChecklistTemplate,
  ChecklistItem,
  CaseComment,
  ScheduleBlock,
  Communication,
  Ticket,
  DelegatedTask,
  Invoice,
  TimeEntry,
  CaseDocument,
  FirmSettings,
  CourtFiling,
  Milestone,
  MilestoneWarn,
  LawyerLoad,
  RoutingRecommendation,
  CaseType,
  CasePriority,
  Potential,
  OutreachAttempt,
  OutreachStatus,
  OutreachChannel,
  MarketingProject,
  StaffHoursSummary,
  FirmPerformance,
  StrategicProjectSummary,
  AccountabilitySummary,
  StaffAccountability,
  StrategicCategory,
  StrategicGoal,
} from "@shared/schema";

export interface IStorage {
  // staff
  listStaff(): Staff[];
  getStaff(id: string): Staff | undefined;
  // cases
  listCases(): Case[];
  getCase(id: string): Case | undefined;
  // deadlines
  listDeadlines(filter?: { caseId?: string; assigneeId?: string }): Deadline[];
  setDeadlineCompleted(id: string, completed: boolean): Deadline | undefined;
  // checklists
  listChecklistTemplates(): ChecklistTemplate[];
  listChecklistItems(caseId?: string): ChecklistItem[];
  toggleChecklistItem(id: string, completed: boolean): ChecklistItem | undefined;
  // comments
  listComments(caseId: string): CaseComment[];
  addComment(c: Omit<CaseComment, "id" | "createdAt" | "authorName"> & { authorName?: string }): CaseComment;
  // schedule
  listSchedule(filter?: { staffId?: string; caseId?: string }): ScheduleBlock[];
  // communications
  listCommunications(filter?: { caseId?: string; assigneeId?: string; status?: string }): Communication[];
  setCommStatus(id: string, status: Communication["status"]): Communication | undefined;
  // tickets
  listTickets(filter?: { caseId?: string }): Ticket[];
  setTicketStatus(id: string, status: Ticket["status"]): Ticket | undefined;
  // tasks
  listTasks(filter?: { caseId?: string; assigneeId?: string }): DelegatedTask[];
  setTaskStatus(id: string, status: DelegatedTask["status"]): DelegatedTask | undefined;
  // billing
  listInvoices(filter?: { caseId?: string }): Invoice[];
  listTimeEntries(filter?: { caseId?: string; staffId?: string }): TimeEntry[];
  // documents
  listDocuments(filter?: { caseId?: string; source?: string }): CaseDocument[];
  // firm settings
  getFirmSettings(): FirmSettings;
  updateFirmSettings(patch: Partial<FirmSettings>): FirmSettings;
  // court watch
  listCourtFilings(filter?: { category?: string; status?: string }): CourtFiling[];
  setCourtFilingStatus(id: string, status: CourtFiling["status"]): CourtFiling | undefined;
  // case workflow updates
  setCaseCrux(id: string, completed: boolean): Case | undefined;
  setCasePosition(id: string, completed: boolean): Case | undefined;
  setCaseIntakeChecklist(id: string, completed: boolean): Case | undefined;
  setCasePriority(id: string, priority: CasePriority): Case | undefined;
  // milestones
  listMilestones(filter?: { caseId?: string; assigneeId?: string; kind?: Milestone["kind"] }): Milestone[];
  getMilestone(id: string): Milestone | undefined;
  updateMilestone(id: string, patch: Partial<Milestone>): Milestone | undefined;
  reassignMilestone(id: string, newAssigneeId: string): Milestone | undefined;
  // capacity & routing
  computeLawyerLoads(windowDays?: number): LawyerLoad[];
  recommendLawyer(req: { caseType: CaseType; priority: CasePriority; estimatedTotalHours?: number }): RoutingRecommendation[];
  // homepage zone summaries
  computeHoursSummary(): StaffHoursSummary[];
  computeFirmPerformance(): FirmPerformance;
  computeAccountabilitySummary(): AccountabilitySummary;
  computeStrategicProjectsSummary(): StrategicProjectSummary;
  // potentials
  listPotentials(): Potential[];
  getPotential(id: string): Potential | undefined;
  recordPotentialOutreach(id: string, attempt: { channel: OutreachChannel; byStaffId: string; notes?: string }): Potential | undefined;
  updatePotentialStatus(id: string, status: OutreachStatus): Potential | undefined;
  // marketing
  listMarketingProjects(): MarketingProject[];
  getMarketingProject(id: string): MarketingProject | undefined;
  updateMarketingProject(id: string, patch: Partial<MarketingProject>): MarketingProject | undefined;
  toggleMarketingMilestone(milestoneId: string, completed: boolean): MarketingProject | undefined;
}

class MemStorage implements IStorage {
  listStaff() { return STAFF; }
  getStaff(id: string) { return STAFF.find((s) => s.id === id); }
  listCases() { return CASES; }
  getCase(id: string) { return CASES.find((c) => c.id === id); }
  listDeadlines(filter?: { caseId?: string; assigneeId?: string }) {
    return DEADLINES.filter((d) =>
      (!filter?.caseId || d.caseId === filter.caseId) &&
      (!filter?.assigneeId || d.assigneeId === filter.assigneeId)
    );
  }
  setDeadlineCompleted(id: string, completed: boolean) {
    const d = DEADLINES.find((x) => x.id === id);
    if (!d) return undefined;
    if (completed) {
      d.status = "completed";
      d.completedAt = new Date().toISOString();
    } else {
      const now = new Date();
      const due = new Date(d.dueDate);
      const diff = (due.getTime() - now.getTime()) / 86400000;
      d.status = diff < 0 ? "overdue" : diff <= 7 ? "due_soon" : "upcoming";
      d.completedAt = undefined;
    }
    return d;
  }
  listChecklistTemplates() { return CHECKLIST_TEMPLATES; }
  listChecklistItems(caseId?: string) {
    return CHECKLIST_ITEMS.filter((x) => !caseId || x.caseId === caseId);
  }
  toggleChecklistItem(id: string, completed: boolean) {
    const i = CHECKLIST_ITEMS.find((x) => x.id === id);
    if (i) i.completed = completed;
    return i;
  }
  listComments(caseId: string) {
    return COMMENTS.filter((c) => c.caseId === caseId).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  addComment(c: Omit<CaseComment, "id" | "createdAt" | "authorName"> & { authorName?: string }) {
    const author = STAFF.find((s) => s.id === c.authorId);
    const cm: CaseComment = {
      id: `cm${COMMENTS.length + 1}_${Date.now()}`,
      caseId: c.caseId,
      authorId: c.authorId,
      authorName: c.authorName || author?.name || "Unknown",
      text: c.text,
      createdAt: new Date().toISOString(),
    };
    COMMENTS.unshift(cm);
    return cm;
  }
  listSchedule(filter?: { staffId?: string; caseId?: string }) {
    return SCHEDULE.filter((s) =>
      (!filter?.staffId || s.staffId === filter.staffId) &&
      (!filter?.caseId || s.caseId === filter.caseId)
    );
  }
  listCommunications(filter?: { caseId?: string; assigneeId?: string; status?: string }) {
    return COMMUNICATIONS.filter((c) =>
      (!filter?.caseId || c.caseId === filter.caseId) &&
      (!filter?.assigneeId || c.assigneeId === filter.assigneeId) &&
      (!filter?.status || c.status === filter.status)
    ).sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }
  setCommStatus(id: string, status: Communication["status"]) {
    const c = COMMUNICATIONS.find((x) => x.id === id);
    if (c) c.status = status;
    return c;
  }
  listTickets(filter?: { caseId?: string }) {
    return TICKETS.filter((t) => !filter?.caseId || t.caseId === filter.caseId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  setTicketStatus(id: string, status: Ticket["status"]) {
    const t = TICKETS.find((x) => x.id === id);
    if (t) {
      t.status = status;
      t.lastUpdate = new Date().toISOString();
    }
    return t;
  }
  listTasks(filter?: { caseId?: string; assigneeId?: string }) {
    return TASKS.filter((t) =>
      (!filter?.caseId || t.caseId === filter.caseId) &&
      (!filter?.assigneeId || t.assigneeId === filter.assigneeId)
    ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }
  setTaskStatus(id: string, status: DelegatedTask["status"]) {
    const t = TASKS.find((x) => x.id === id);
    if (t) t.status = status;
    return t;
  }
  listInvoices(filter?: { caseId?: string }) {
    return INVOICES.filter((i) => !filter?.caseId || i.caseId === filter.caseId)
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }
  listTimeEntries(filter?: { caseId?: string; staffId?: string }) {
    return TIME_ENTRIES.filter((t) =>
      (!filter?.caseId || t.caseId === filter.caseId) &&
      (!filter?.staffId || t.staffId === filter.staffId)
    );
  }
  listDocuments(filter?: { caseId?: string; source?: string }) {
    return DOCUMENTS.filter((d) =>
      (!filter?.caseId || d.caseId === filter.caseId) &&
      (!filter?.source || d.source === filter.source)
    ).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }
  getFirmSettings() { return FIRM_SETTINGS; }
  updateFirmSettings(patch: Partial<FirmSettings>) {
    Object.assign(FIRM_SETTINGS, patch);
    return FIRM_SETTINGS;
  }
  listCourtFilings(filter?: { category?: string; status?: string }) {
    return COURT_FILINGS.filter((f) =>
      (!filter?.category || f.category === filter.category) &&
      (!filter?.status || f.status === filter.status)
    ).sort((a, b) => new Date(b.flaggedAt).getTime() - new Date(a.flaggedAt).getTime());
  }
  setCourtFilingStatus(id: string, status: CourtFiling["status"]) {
    const f = COURT_FILINGS.find((x) => x.id === id);
    if (f) f.status = status;
    return f;
  }
  setCaseCrux(id: string, completed: boolean) {
    const c = CASES.find((x) => x.id === id);
    if (!c) return undefined;
    c.cruxAnalyzed = completed;
    c.cruxCompletedAt = completed ? new Date().toISOString() : undefined;
    return c;
  }
  setCasePosition(id: string, completed: boolean) {
    const c = CASES.find((x) => x.id === id);
    if (!c) return undefined;
    c.positionDrafted = completed;
    c.positionCompletedAt = completed ? new Date().toISOString() : undefined;
    return c;
  }
  setCaseIntakeChecklist(id: string, completed: boolean) {
    const c = CASES.find((x) => x.id === id);
    if (!c) return undefined;
    c.intakeChecklistComplete = completed;
    return c;
  }
  setCasePriority(id: string, priority: CasePriority) {
    const c = CASES.find((x) => x.id === id);
    if (!c) return undefined;
    c.priority = priority;
    c.emergencyFlaggedAt = priority === "emergency" ? new Date().toISOString() : undefined;
    return c;
  }
  listMilestones(filter?: { caseId?: string; assigneeId?: string; kind?: Milestone["kind"] }) {
    return MILESTONES.filter((m) =>
      (!filter?.caseId || m.caseId === filter.caseId) &&
      (!filter?.assigneeId || m.assigneeId === filter.assigneeId) &&
      (!filter?.kind || m.kind === filter.kind)
    ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }
  getMilestone(id: string) { return MILESTONES.find((m) => m.id === id); }
  updateMilestone(id: string, patch: Partial<Milestone>) {
    const m = MILESTONES.find((x) => x.id === id);
    if (!m) return undefined;
    if (patch.estimatedHours !== undefined && patch.estimatedHours !== m.estimatedHours) {
      m.estimateUpdatedAt = new Date().toISOString();
    }
    if (patch.status === "complete" && !m.completedAt) {
      m.completedAt = new Date().toISOString();
    }
    if (patch.status && patch.status !== "complete") {
      m.completedAt = undefined;
    }
    Object.assign(m, patch);
    return m;
  }
  reassignMilestone(id: string, newAssigneeId: string) {
    const m = MILESTONES.find((x) => x.id === id);
    if (!m) return undefined;
    m.assigneeId = newAssigneeId;
    return m;
  }
  computeLawyerLoads(windowDays = 14): LawyerLoad[] {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + windowDays * 86400000);
    const F = FIRM_SETTINGS;
    return STAFF.filter((s) => s.role !== "bookkeeper").map((s) => {
      const myMs = MILESTONES.filter(
        (m) => m.assigneeId === s.id && m.status !== "complete"
      );
      const inWindow = myMs.filter((m) => new Date(m.dueDate) <= windowEnd);
      const rawEstHours = inWindow.reduce((sum, m) => sum + m.estimatedHours, 0);
      const adjustedEstHours = Math.round(rawEstHours * s.estimateRatio * 10) / 10;
      const hoursLogged = inWindow.reduce((sum, m) => sum + m.hoursLogged, 0);
      const remainingHours = Math.max(0, Math.round((adjustedEstHours - hoursLogged) * 10) / 10);
      const forwardCapacity = Math.round(s.capacityHours * (windowDays / 7) * 10) / 10;
      const headroomHours = Math.round((forwardCapacity - remainingHours) * 10) / 10;
      const utilizationPct = Math.round((remainingHours / Math.max(1, forwardCapacity)) * 100);

      let red = 0, yellow = 0, green = 0;
      for (const m of myMs) {
        const days = (new Date(m.dueDate).getTime() - now.getTime()) / 86400000;
        if (days <= F.milestoneRedDays) red++;
        else if (days <= F.milestoneYellowDays) yellow++;
        else green++;
      }
      const urgencyScore = red * 3 + yellow * 1.5 + green * 1;
      const emergencyCases = CASES.filter(
        (c) => c.leadAttorneyId === s.id && c.priority === "emergency" && c.stage !== "closed"
      ).length;

      let status: LawyerLoad["status"] = "healthy";
      if (utilizationPct < 50) status = "available";
      else if (utilizationPct < 90) status = "healthy";
      else if (utilizationPct < 110) status = "stretched";
      else status = "overloaded";

      return {
        staffId: s.id,
        name: s.name,
        initials: s.initials,
        role: s.role,
        capacityHours: s.capacityHours,
        windowDays,
        estimateRatio: s.estimateRatio,
        rawEstHours: Math.round(rawEstHours * 10) / 10,
        adjustedEstHours,
        hoursLogged: Math.round(hoursLogged * 10) / 10,
        remainingHours,
        forwardCapacity,
        headroomHours,
        utilizationPct,
        redCount: red,
        yellowCount: yellow,
        greenCount: green,
        urgencyScore,
        emergencyCases,
        specialties: s.specialties,
        yearsExperience: s.yearsExperience,
        status,
      };
    });
  }
  recommendLawyer(req: { caseType: CaseType; priority: CasePriority; estimatedTotalHours?: number }): RoutingRecommendation[] {
    const loads = this.computeLawyerLoads(14).filter((l) => l.role !== "paralegal");
    const ranked = loads.map((l) => {
      const specialtyMatch = l.specialties.includes(req.caseType);
      // Score: headroom is the main driver; specialty match gives a big boost; urgency score penalizes stressed lawyers; experience helps for emergencies
      const headroomScore = Math.max(-40, Math.min(80, l.headroomHours)); // cap influence
      const specialtyBonus = specialtyMatch ? 25 : -15;
      const urgencyPenalty = -l.urgencyScore * (req.priority === "emergency" ? 2.5 : req.priority === "urgent" ? 1.5 : 1);
      const experienceBonus = req.priority === "emergency" ? Math.min(20, l.yearsExperience * 1.2) : Math.min(10, l.yearsExperience * 0.5);
      const emergencyPenalty = -l.emergencyCases * 12;
      const score = headroomScore + specialtyBonus + urgencyPenalty + experienceBonus + emergencyPenalty;

      const reasons: string[] = [];
      reasons.push(`${l.headroomHours >= 0 ? "+" : ""}${l.headroomHours.toFixed(0)}h headroom (next 14d)`);
      if (specialtyMatch) reasons.push(`specializes in ${labelType(req.caseType)}`);
      else reasons.push(`outside primary specialty`);
      if (l.redCount > 0) reasons.push(`${l.redCount} red`);
      if (l.yellowCount > 0) reasons.push(`${l.yellowCount} yellow`);
      if (l.emergencyCases > 0) reasons.push(`${l.emergencyCases} active emergency`);
      reasons.push(`${l.yearsExperience}y exp`);
      return {
        staffId: l.staffId,
        name: l.name,
        initials: l.initials,
        score: Math.round(score * 10) / 10,
        headroomHours: l.headroomHours,
        urgencyScore: l.urgencyScore,
        specialtyMatch,
        yearsExperience: l.yearsExperience,
        reasoning: reasons.join(" · "),
      };
    });
    return ranked.sort((a, b) => b.score - a.score);
  }
  listPotentials() {
    return POTENTIALS.slice().sort(
      (a, b) => new Date(b.flaggedAt).getTime() - new Date(a.flaggedAt).getTime()
    );
  }
  getPotential(id: string) { return POTENTIALS.find((p) => p.id === id); }
  recordPotentialOutreach(
    id: string,
    attempt: { channel: OutreachChannel; byStaffId: string; notes?: string }
  ) {
    const p = POTENTIALS.find((x) => x.id === id);
    if (!p) return undefined;
    const out: OutreachAttempt = {
      id: `out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      channel: attempt.channel,
      sentAt: new Date().toISOString(),
      byStaffId: attempt.byStaffId,
      notes: attempt.notes,
    };
    p.outreachAttempts = [...p.outreachAttempts, out];
    // auto-bump status from "none" to "sent" on first outreach
    if (p.outreachStatus === "none") {
      p.outreachStatus = "sent";
    }
    return p;
  }
  updatePotentialStatus(id: string, status: OutreachStatus) {
    const p = POTENTIALS.find((x) => x.id === id);
    if (!p) return undefined;
    p.outreachStatus = status;
    if (status === "declined" || status === "retained") {
      p.resolvedAt = new Date().toISOString();
    } else {
      p.resolvedAt = undefined;
    }
    return p;
  }
  listMarketingProjects() {
    return MARKETING_PROJECTS.slice().sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  }
  getMarketingProject(id: string) { return MARKETING_PROJECTS.find((m) => m.id === id); }
  updateMarketingProject(id: string, patch: Partial<MarketingProject>) {
    const m = MARKETING_PROJECTS.find((x) => x.id === id);
    if (!m) return undefined;
    Object.assign(m, patch);
    return m;
  }
  toggleMarketingMilestone(milestoneId: string, completed: boolean) {
    for (const proj of MARKETING_PROJECTS) {
      const ms = proj.milestones.find((x) => x.id === milestoneId);
      if (ms) {
        ms.completed = completed;
        ms.completedAt = completed ? new Date().toISOString() : undefined;
        return proj;
      }
    }
    return undefined;
  }

  // ===== Homepage zone summaries =====

  computeHoursSummary(): StaffHoursSummary[] {
    const F = FIRM_SETTINGS;
    const goal = F.weeklyHoursGoal;
    const now = new Date();
    // Find Monday of current week (week-to-date)
    const monday = new Date(now);
    const dayOfWeek = monday.getDay() === 0 ? 7 : monday.getDay(); // Sun=7, Mon=1
    monday.setDate(monday.getDate() - (dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const daysIntoWeek = Math.min(5, Math.max(1, dayOfWeek)); // workdays elapsed (cap at 5)

    // 4 weeks back from this Monday
    const fourWeeksAgo = new Date(monday); fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    // Last full quarter (~13 weeks) back from this Monday
    const quarterAgo = new Date(monday); quarterAgo.setDate(quarterAgo.getDate() - 91);
    // 14 days ago for daily sparkline
    const fourteenAgo = new Date(now); fourteenAgo.setDate(fourteenAgo.getDate() - 13); fourteenAgo.setHours(0,0,0,0);

    return STAFF.filter((s) => s.role !== "bookkeeper").map((s) => {
      const myEntries = TIME_ENTRIES.filter((t) => t.staffId === s.id);

      // Current week buckets
      const wk = myEntries.filter((t) => new Date(t.date) >= monday);
      const weekBillable = round1(wk.filter((t) => t.billable).reduce((a, t) => a + t.hours, 0));
      const weekNonBillable = round1(wk.filter((t) => !t.billable).reduce((a, t) => a + t.hours, 0));
      const weekTotal = round1(weekBillable + weekNonBillable);
      const weekProjected = round1((weekTotal / Math.max(1, daysIntoWeek)) * 5);

      // Rolling 4 weeks (excluding current week)
      const rolling = myEntries.filter((t) => {
        const d = new Date(t.date);
        return d >= fourWeeksAgo && d < monday && t.billable;
      });
      const rolling4WkBillableAvg = round1(rolling.reduce((a, t) => a + t.hours, 0) / 4);

      // Last quarter (13 weeks) avg per week
      const lastQ = myEntries.filter((t) => {
        const d = new Date(t.date);
        return d >= quarterAgo && d < monday && t.billable;
      });
      const lastQuarterBillableAvg = round1(lastQ.reduce((a, t) => a + t.hours, 0) / 13);

      // Daily sparkline (last 14 days)
      const dailyHours: { date: string; billable: number; nonBillable: number }[] = [];
      for (let i = 0; i < 14; i++) {
        const d = new Date(fourteenAgo); d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        const dayEntries = myEntries.filter((t) => t.date === key);
        dailyHours.push({
          date: key,
          billable: round1(dayEntries.filter((t) => t.billable).reduce((a, t) => a + t.hours, 0)),
          nonBillable: round1(dayEntries.filter((t) => !t.billable).reduce((a, t) => a + t.hours, 0)),
        });
      }

      const goalPctWeek = Math.round((weekTotal / goal) * 100);
      const goalPctProjected = Math.round((weekProjected / goal) * 100);
      let status: StaffHoursSummary["status"] = "on_track";
      if (goalPctProjected < 90) status = "under";
      else if (goalPctProjected > 110) status = "over";

      // Projected open workload (for paralegals especially, but useful for all)
      const windowEnd = new Date(now); windowEnd.setDate(windowEnd.getDate() + 14);
      const myMs = MILESTONES.filter((m) => m.assigneeId === s.id && m.status !== "complete" && new Date(m.dueDate) <= windowEnd);
      const projectedOpenHours = round1(myMs.reduce((a, m) => a + Math.max(0, m.estimatedHours * s.estimateRatio - m.hoursLogged), 0));

      return {
        staffId: s.id,
        name: s.name,
        initials: s.initials,
        role: s.role,
        weekBillable,
        weekNonBillable,
        weekTotal,
        weekProjected,
        rolling4WkBillableAvg,
        lastQuarterBillableAvg,
        status,
        goalPctWeek,
        goalPctProjected,
        dailyHours,
        projectedOpenHours,
      };
    });
  }

  computeFirmPerformance(): FirmPerformance {
    const F = FIRM_SETTINGS;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const day = now.getDate();
    const dayOfYear = Math.floor((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000) + 1;

    // ===== New cases =====
    // This month
    const monthStart = new Date(year, month, 1);
    const lastMonthStart = new Date(year, month - 1, 1);
    const lastMonthEnd = new Date(year, month, 0); // last day of last month
    const newCasesThisMonth = CASES.filter((c) => new Date(c.filedDate) >= monthStart).length;
    const newCasesLastMonth = CASES.filter((c) => {
      const d = new Date(c.filedDate);
      return d >= lastMonthStart && d <= lastMonthEnd;
    }).length;

    // Last 12 months
    const newCasesByMonth: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(year, month - i, 1);
      const end = new Date(year, month - i + 1, 1);
      const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
      const count = CASES.filter((c) => {
        const d = new Date(c.filedDate);
        return d >= start && d < end;
      }).length;
      newCasesByMonth.push({ month: key, count });
    }

    // QTD vs same days into last quarter
    const currentQuarter = Math.floor(month / 3); // 0..3
    const qStartMonth = currentQuarter * 3;
    const qStart = new Date(year, qStartMonth, 1);
    const daysIntoQuarter = Math.floor((now.getTime() - qStart.getTime()) / 86400000) + 1;
    const lastQStart = new Date(qStartMonth === 0 ? year - 1 : year, qStartMonth === 0 ? 9 : qStartMonth - 3, 1);
    const lastQSameDays = new Date(lastQStart);
    lastQSameDays.setDate(lastQStart.getDate() + daysIntoQuarter - 1);
    const newCasesQTD = CASES.filter((c) => new Date(c.filedDate) >= qStart).length;
    const newCasesLastQTD = CASES.filter((c) => {
      const d = new Date(c.filedDate);
      return d >= lastQStart && d <= lastQSameDays;
    }).length;

    // YTD vs same days into last year
    const ytdStart = new Date(year, 0, 1);
    const lastYearStart = new Date(year - 1, 0, 1);
    const lastYearSameDay = new Date(year - 1, month, day);
    const newCasesYTD = CASES.filter((c) => new Date(c.filedDate) >= ytdStart).length;
    const newCasesLastYTD = CASES.filter((c) => {
      const d = new Date(c.filedDate);
      return d >= lastYearStart && d <= lastYearSameDay;
    }).length;

    // ===== Net income =====
    // Simple model: monthly net income = collected revenue − monthly expenses
    const netIncomeByMonth: FirmPerformance["netIncomeByMonth"] = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(year, month - i, 1);
      const end = new Date(year, month - i + 1, 1);
      const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
      let revenue = 0;
      let collected = 0;
      for (const inv of INVOICES) {
        const issued = new Date(inv.issueDate);
        if (issued >= start && issued < end) {
          revenue += inv.amount;
          collected += inv.amountPaid;
        }
      }
      const expenses = F.monthlyExpenses;
      netIncomeByMonth.push({
        month: key,
        revenue: Math.round(revenue),
        collected: Math.round(collected),
        expenses,
        netIncome: Math.round(collected - expenses),
      });
    }

    // QTD net income (last 3 months including current)
    const qtdMonths = netIncomeByMonth.slice(-3);
    const netIncomeQTD = qtdMonths.reduce((a, m) => a + m.netIncome, 0);
    // Last quarter at same point: months -6 to -4 from now
    const lastQMonths = netIncomeByMonth.slice(-6, -3);
    const netIncomeLastQ = lastQMonths.reduce((a, m) => a + m.netIncome, 0);
    // Quarter goal = annual / 4
    const netIncomeQuarterGoal = Math.round(F.netIncomeYearGoal / 4);

    // YTD net income
    let netIncomeYTD = 0;
    for (const m of netIncomeByMonth) {
      const [y] = m.month.split("-");
      if (Number(y) === year) netIncomeYTD += m.netIncome;
    }

    // YTD same period last year: simulate by scaling avg of last 12 months by % of year elapsed,
    // then subtract a growth factor. For seeded data without true LY history, approximate with
    // 80% of the trailing 12-month average proportional to days elapsed.
    const trailingAvg = netIncomeByMonth.reduce((a, m) => a + m.netIncome, 0) / 12;
    const netIncomeLastYTD = Math.round(trailingAvg * (dayOfYear / 365) * 12 * 0.82);

    return {
      newCasesGoalPerMonth: F.newCasesGoalPerMonth,
      newCasesThisMonth,
      newCasesLastMonth,
      newCasesByMonth,
      newCasesQTD,
      newCasesLastQTD,
      newCasesYTD,
      newCasesLastYTD,
      netIncomeQTD,
      netIncomeLastQ,
      netIncomeQuarterGoal,
      netIncomeYTD,
      netIncomeLastYTD,
      netIncomeYearGoal: F.netIncomeYearGoal,
      netIncomeByMonth,
    };
  }

  computeAccountabilitySummary(): AccountabilitySummary {
    const F = FIRM_SETTINGS;
    const now = new Date();
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    // Margaret = managing partner
    const margaret = STAFF.find((s) => s.role === "partner" && s.title?.toLowerCase().includes("managing"))
      ?? STAFF.find((s) => s.role === "partner");
    const margaretId = margaret?.id ?? "s1";

    // ===== Tasks Margaret personally assigned =====
    const myTasks = TASKS.filter((t) => t.delegatedById === margaretId);
    const myOpen = myTasks.filter((t) => t.status !== "done");
    const myOverdue = myOpen.filter((t) => new Date(t.dueDate) < now);
    let myRed = 0, myYellow = 0, myGreen = 0;
    for (const t of myOpen) {
      const days = (new Date(t.dueDate).getTime() - now.getTime()) / 86400000;
      if (days <= F.taskRedDays) myRed++;
      else if (days <= F.taskYellowDays) myYellow++;
      else myGreen++;
    }
    const myAssignedRecent = myOpen
      .slice()
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 8)
      .map((t) => {
        const assignee = STAFF.find((s) => s.id === t.assigneeId);
        const days = Math.round((new Date(t.dueDate).getTime() - now.getTime()) / 86400000);
        return {
          id: t.id,
          title: t.title,
          assigneeId: t.assigneeId,
          assigneeName: assignee?.name ?? t.assigneeId,
          dueDate: t.dueDate,
          daysUntilDue: days,
          status: t.status,
          caseId: t.caseId,
        };
      });

    // ===== Per-staff accountability =====
    const byStaff: StaffAccountability[] = STAFF.filter((s) => s.role !== "bookkeeper").map((s) => {
      const myAssignedTasks = TASKS.filter((t) => t.assigneeId === s.id);
      const open = myAssignedTasks.filter((t) => t.status !== "done");
      const overdue = open.filter((t) => new Date(t.dueDate) < now);
      const completed30d = myAssignedTasks.filter((t) => t.status === "done" && new Date(t.createdAt) >= thirtyDaysAgo).length;
      const denom = completed30d + open.length;
      const completionRate = denom === 0 ? 100 : Math.round((completed30d / denom) * 100);

      // Last time entry
      const myEntries = TIME_ENTRIES.filter((t) => t.staffId === s.id);
      const lastEntryDate = myEntries.length ? myEntries.map((t) => new Date(t.date).getTime()).reduce((a, b) => Math.max(a, b)) : 0;
      const daysSinceLastTimeEntry = lastEntryDate === 0 ? 999 : Math.floor((now.getTime() - lastEntryDate) / 86400000);

      // Last milestone update (look at completedAt or estimateUpdatedAt across their open milestones)
      const myMs = MILESTONES.filter((m) => m.assigneeId === s.id);
      const lastMsUpdate = myMs.reduce((max, m) => {
        const t1 = m.estimateUpdatedAt ? new Date(m.estimateUpdatedAt).getTime() : 0;
        const t2 = m.completedAt ? new Date(m.completedAt).getTime() : 0;
        return Math.max(max, t1, t2);
      }, 0);
      const daysSinceLastMilestoneUpdate = lastMsUpdate === 0 ? 999 : Math.floor((now.getTime() - lastMsUpdate) / 86400000);

      // Stale estimates
      const staleEstimates = myMs.filter((m) => {
        if (m.status === "complete") return false;
        if (!m.estimateUpdatedAt) return true;
        const days = (now.getTime() - new Date(m.estimateUpdatedAt).getTime()) / 86400000;
        return days > F.estimateStaleDays;
      }).length;

      // Unrouted comms (paralegal-only)
      let unroutedComms = 0;
      let unroutedOver4h = 0;
      if (s.role === "paralegal") {
        const myComms = COMMUNICATIONS.filter((c) => c.assigneeId === s.id && c.status !== "resolved");
        unroutedComms = myComms.length;
        unroutedOver4h = myComms.filter((c) => {
          const ageH = (now.getTime() - new Date(c.receivedAt).getTime()) / 3600000;
          return ageH > 4;
        }).length;
      }

      // Status logic
      const flags: string[] = [];
      let red = false, yellow = false;
      if (overdue.length > 0) { red = true; flags.push(`${overdue.length} overdue task${overdue.length === 1 ? "" : "s"}`); }
      if (s.role === "paralegal" && unroutedOver4h > 0) { red = true; flags.push(`${unroutedOver4h} comm${unroutedOver4h === 1 ? "" : "s"} past 4h SLA`); }
      if (daysSinceLastTimeEntry >= 5) { red = true; flags.push(`No time logged ${daysSinceLastTimeEntry}d`); }
      else if (daysSinceLastTimeEntry >= 3) { yellow = true; flags.push(`Time stale ${daysSinceLastTimeEntry}d`); }
      if (staleEstimates >= 3) { yellow = true; flags.push(`${staleEstimates} stale estimates`); }
      if (completionRate < 60 && (completed30d + open.length) >= 3) { yellow = true; flags.push(`${completionRate}% task completion`); }
      const status: StaffAccountability["status"] = red ? "behind" : yellow ? "watch" : "reliable";

      return {
        staffId: s.id,
        name: s.name,
        initials: s.initials,
        role: s.role,
        openTasks: open.length,
        overdueTasks: overdue.length,
        completedTasks30d: completed30d,
        taskCompletionRate30d: completionRate,
        daysSinceLastTimeEntry,
        daysSinceLastMilestoneUpdate,
        staleEstimates,
        unroutedComms,
        unroutedOver4h,
        status,
        flags,
      };
    });

    return {
      myAssignedTotal: myTasks.length,
      myAssignedOpen: myOpen.length,
      myAssignedOverdue: myOverdue.length,
      myAssignedRed: myRed,
      myAssignedYellow: myYellow,
      myAssignedGreen: myGreen,
      myAssignedRecent,
      byStaff,
      totalOpenTasks: TASKS.filter((t) => t.status !== "done").length,
      totalOverdueTasks: TASKS.filter((t) => t.status !== "done" && new Date(t.dueDate) < now).length,
      reliable: byStaff.filter((b) => b.status === "reliable").length,
      watch: byStaff.filter((b) => b.status === "watch").length,
      behind: byStaff.filter((b) => b.status === "behind").length,
    };
  }

  computeStrategicProjectsSummary(): StrategicProjectSummary {
    const F = FIRM_SETTINGS;
    const now = new Date();
    const active = MARKETING_PROJECTS.filter((p) => p.status === "in_progress" || p.status === "planning" || p.status === "on_hold");

    const byCategory = new Map<StrategicCategory, { total: number; red: number; yellow: number; green: number }>();
    const byGoal = new Map<StrategicGoal, { total: number; red: number; yellow: number; green: number }>();

    let red = 0, yellow = 0, green = 0;
    const atRisk: StrategicProjectSummary["atRisk"] = [];

    for (const p of active) {
      // Determine project R/Y/G from its open milestones
      const open = p.milestones.filter((m) => !m.completed);
      const completedMs = p.milestones.filter((m) => m.completed).length;
      const totalMs = p.milestones.length;
      const pctComplete = totalMs === 0 ? 0 : Math.round((completedMs / totalMs) * 100);
      let pRed = 0, pYellow = 0, pGreen = 0;
      for (const m of open) {
        const days = (new Date(m.dueDate).getTime() - now.getTime()) / 86400000;
        if (days <= F.milestoneRedDays) pRed++;
        else if (days <= F.milestoneYellowDays) pYellow++;
        else pGreen++;
      }
      const projectStatus: "red" | "yellow" | "green" = pRed > 0 ? "red" : pYellow > 0 ? "yellow" : "green";
      if (projectStatus === "red") red++; else if (projectStatus === "yellow") yellow++; else green++;

      // Roll up by category and goal
      const cat = byCategory.get(p.category) ?? { total: 0, red: 0, yellow: 0, green: 0 };
      cat.total++;
      cat[projectStatus]++;
      byCategory.set(p.category, cat);

      const g = byGoal.get(p.goal) ?? { total: 0, red: 0, yellow: 0, green: 0 };
      g.total++;
      g[projectStatus]++;
      byGoal.set(p.goal, g);

      // At-risk list: red projects, top 6
      if (projectStatus === "red" || projectStatus === "yellow") {
        const owner = STAFF.find((s) => s.id === p.ownerId);
        atRisk.push({
          id: p.id,
          title: p.title,
          category: p.category,
          goal: p.goal,
          ownerId: p.ownerId,
          ownerName: owner?.name ?? p.ownerId,
          dueDate: p.dueDate,
          redMs: pRed,
          yellowMs: pYellow,
          greenMs: pGreen,
          completedMs,
          totalMs,
          pctComplete,
          daysUntilDue: Math.round((new Date(p.dueDate).getTime() - now.getTime()) / 86400000),
          expectedImpact: p.expectedImpact,
        });
      }
    }

    atRisk.sort((a, b) => {
      // Reds first (more red milestones), then nearest due date
      if (a.redMs !== b.redMs) return b.redMs - a.redMs;
      return a.daysUntilDue - b.daysUntilDue;
    });

    // Completions by month (last 12 months)
    const completionsByMonth: { month: string; launched: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
      const launched = MARKETING_PROJECTS.filter((p) => {
        if (p.status !== "launched") return false;
        // Use due date as launch proxy
        const d = new Date(p.dueDate);
        return d >= start && d < end;
      }).length;
      completionsByMonth.push({ month: key, launched });
    }

    return {
      totalActive: active.length,
      red,
      yellow,
      green,
      byCategory: Array.from(byCategory.entries()).map(([category, v]) => ({ category, ...v })),
      byGoal: Array.from(byGoal.entries()).map(([goal, v]) => ({ goal, ...v })),
      atRisk: atRisk.slice(0, 8),
      completionsByMonth,
    };
  }
}

function round1(n: number): number { return Math.round(n * 10) / 10; }

function labelType(t: CaseType): string {
  return t === "bankruptcy_avoidance" ? "bankruptcy" : t === "commercial_litigation" ? "commercial lit" : "real estate";
}


export const storage: IStorage = new MemStorage();

// ============================================================================
// SQLite-backed persistence
//
// MemStorage holds in-memory arrays that were seeded at module load. We snapshot
// these into SQLite as JSON, and on boot replace each array's contents in place
// with whatever was last persisted. Mutations elsewhere call persistNow() to
// schedule a debounced write.
// ============================================================================

import { loadSnapshot, scheduleSnapshot } from "./db";

// Registry of all collections to persist. Each entry is a tuple of [key, ref].
// Arrays are mutated by splice; objects by Object.assign.
const _collections: Array<[string, unknown]> = [
  ["STAFF", STAFF],
  ["CASES", CASES],
  ["DEADLINES", DEADLINES],
  ["CHECKLIST_TEMPLATES", CHECKLIST_TEMPLATES],
  ["CHECKLIST_ITEMS", CHECKLIST_ITEMS],
  ["COMMENTS", COMMENTS],
  ["SCHEDULE", SCHEDULE],
  ["COMMUNICATIONS", COMMUNICATIONS],
  ["TICKETS", TICKETS],
  ["TASKS", TASKS],
  ["INVOICES", INVOICES],
  ["TIME_ENTRIES", TIME_ENTRIES],
  ["DOCUMENTS", DOCUMENTS],
  ["COURT_FILINGS", COURT_FILINGS],
  ["MILESTONES", MILESTONES],
  ["POTENTIALS", POTENTIALS],
  ["MARKETING_PROJECTS", MARKETING_PROJECTS],
];
// FIRM_SETTINGS is an object, persisted separately

function takeSnapshot(): Record<string, unknown> {
  const snap: Record<string, unknown> = {};
  for (const [key, ref] of _collections) snap[key] = ref;
  snap.FIRM_SETTINGS = FIRM_SETTINGS;
  snap.__schemaVersion = 1;
  return snap;
}

function restoreSnapshot(snap: Record<string, unknown>): void {
  for (const [key, ref] of _collections) {
    const incoming = snap[key];
    if (Array.isArray(ref) && Array.isArray(incoming)) {
      ref.splice(0, ref.length, ...incoming);
    }
  }
  if (snap.FIRM_SETTINGS && typeof snap.FIRM_SETTINGS === "object") {
    Object.assign(FIRM_SETTINGS, snap.FIRM_SETTINGS);
  }
}

let _bootstrapped = false;

export function bootstrapPersistence(): void {
  if (_bootstrapped) return;
  _bootstrapped = true;
  try {
    const snap = loadSnapshot();
    if (snap) {
      restoreSnapshot(snap);
      console.log("[storage] hydrated from SQLite snapshot");
    } else {
      // First run: persist the seeded baseline so subsequent restarts can hydrate.
      scheduleSnapshot(takeSnapshot(), 0);
      console.log("[storage] no snapshot found; seeded baseline written to SQLite");
    }
  } catch (e) {
    console.error("[storage] bootstrap failed; continuing with in-memory seed:", e);
  }
}

export function persistNow(): void {
  if (!_bootstrapped) return;
  scheduleSnapshot(takeSnapshot());
}

