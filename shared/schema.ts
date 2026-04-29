import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ----- Domain types (used in API responses) -----

export type StaffRole = "partner" | "associate" | "paralegal" | "bookkeeper";

export interface Staff {
  id: string;
  name: string;
  initials: string;
  role: StaffRole;
  title: string;
  hoursThisWeek: number;
  capacityHours: number;
  caseIds: string[];
  // Capacity engine
  specialties: CaseType[];           // case types this lawyer handles
  estimateRatio: number;             // historical actual/estimated (1.3 = chronic underestimator)
  yearsExperience: number;
}

export type CaseType =
  | "bankruptcy_avoidance"
  | "commercial_litigation"
  | "real_estate";

export type CaseStatus =
  | "discovery"
  | "pleadings"
  | "motion_practice"
  | "trial_prep"
  | "mediation"
  | "post_trial";

export type CaseStage =
  | "intake"
  | "pleadings"
  | "discovery"
  | "motion_practice"
  | "mediation"
  | "trial_prep"
  | "trial"
  | "post_trial"
  | "closed";

export type CasePriority = "normal" | "urgent" | "emergency";

export interface Case {
  id: string;
  caption: string;
  shortName: string;
  client: string;
  caseNumber: string;
  court: string;
  type: CaseType;
  status: CaseStatus;
  stage: CaseStage;
  cruxSummary: string; // one-paragraph summary of the core issue
  ourPosition: string; // our theory of the case
  exposureRange?: string; // e.g. "$180K – $420K"
  claimAmount?: number; // single numeric claim/exposure value (for averages)
  leadAttorneyId: string;
  teamIds: string[];
  filedDate: string;
  trialDate?: string;
  description: string;
  // Billing
  feeArrangement: "hourly" | "contingency" | "flat" | "hybrid";
  billingRate?: number;
  retainerBalance: number;
  budgetCap?: number;
  wipBalance: number;
  // Workflow milestones (managing partner reviews these)
  cruxAnalyzed: boolean;
  cruxDueDate: string; // when the crux must be analyzed
  cruxCompletedAt?: string;
  positionDrafted: boolean;
  positionDueDate: string; // when the position statement must be drafted
  positionCompletedAt?: string;
  intakeChecklistComplete: boolean; // intake checklist done
  priority: CasePriority;            // normal / urgent / emergency
  emergencyFlaggedAt?: string;       // when partner flagged as emergency
}

export type DocumentSource = "client" | "our_production" | "opposing_production" | "court_filing" | "work_product" | "expert";
export type DocumentKind = "pdf" | "docx" | "xlsx" | "email" | "image" | "other";

export interface CaseDocument {
  id: string;
  caseId: string;
  name: string;
  source: DocumentSource;
  kind: DocumentKind;
  sizeKb: number;
  uploadedAt: string;
  uploadedById: string;
  bates?: string; // e.g. PROD-001234
  privileged: boolean;
  tags: string[];
  description?: string;
}

export type DeadlineKind = "court" | "internal" | "hearing" | "mediation";
export type DeadlineStatus =
  | "upcoming"
  | "due_soon"
  | "overdue"
  | "completed";

export interface Deadline {
  id: string;
  caseId: string;
  title: string;
  kind: DeadlineKind;
  dueDate: string;
  assigneeId: string;
  status: DeadlineStatus;
  notes?: string;
  completedAt?: string;
}

// ---- Milestones (the spine of the practice) ----
// Sequenced internal deliverables. Lawyer provides time estimate; partner reviews R/Y/G.
export type MilestoneKind =
  | "info_gathering"      // 1. collect info from client
  | "analysis_memo"       // 2. substantive analysis memo summarizing facts (BEFORE discovery)
  | "position_statement"  // 3. position statement
  | "discovery"           // 4. discovery work
  | "hearing"             // 5. hearing date
  | "mediation";          // 5. mediation date

export type MilestoneStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "complete";

export interface Milestone {
  id: string;
  caseId: string;
  kind: MilestoneKind;
  title: string;
  sequence: number;            // ordering within case
  dueDate: string;             // target date
  assigneeId: string;          // lawyer responsible
  status: MilestoneStatus;
  estimatedHours: number;      // lawyer's time estimate (required)
  hoursLogged: number;         // actual logged so far
  estimateUpdatedAt?: string;  // when lawyer last updated estimate
  estimateConfidence?: "low" | "medium" | "high"; // lawyer's own confidence
  dependsOnIds: string[];      // ids of milestones that must complete first
  notes?: string;
  completedAt?: string;
  // Court hearings/mediations carry these:
  location?: string;
  judge?: string;
}

// What partner sees: derived RYG for each milestone
export type MilestoneWarn = "red" | "yellow" | "green" | "complete";

// ---- Capacity & Routing ----
// Computed per lawyer for the next N days (default 14)
export interface LawyerLoad {
  staffId: string;
  name: string;
  initials: string;
  role: StaffRole;
  capacityHours: number;          // weekly capacity (typically 40)
  windowDays: number;             // window for forward load (default 14)
  estimateRatio: number;          // their personal padding ratio
  rawEstHours: number;            // sum of lawyer's estimates in window
  adjustedEstHours: number;       // raw × estimateRatio
  hoursLogged: number;            // already logged in window (counts toward used)
  remainingHours: number;         // adjusted - logged
  forwardCapacity: number;        // capacity × (window/7)
  headroomHours: number;          // forwardCapacity - remaining
  utilizationPct: number;         // remaining / forwardCapacity × 100
  redCount: number;
  yellowCount: number;
  greenCount: number;
  urgencyScore: number;           // weighted: 3×red + 1.5×yellow + 1×green
  emergencyCases: number;         // cases this lawyer leads that are flagged emergency
  specialties: CaseType[];
  yearsExperience: number;
  status: "available" | "healthy" | "stretched" | "overloaded";
}

// ---- Hours summary (per-staff billable hours vs 40-hour goal) ----
export interface StaffHoursSummary {
  staffId: string;
  name: string;
  initials: string;
  role: StaffRole;
  // Current week (Mon – Sun, week-to-date)
  weekBillable: number;
  weekNonBillable: number;
  weekTotal: number;
  weekProjected: number;          // straight-line projection from days elapsed in week
  // Last 4 weeks rolling avg (for stable comparison)
  rolling4WkBillableAvg: number;
  // Last quarter avg per week (excluding current week)
  lastQuarterBillableAvg: number;
  // Status vs 40h goal
  status: "under" | "on_track" | "over";   // under: <90%, on_track: 90–110%, over: >110%
  goalPctWeek: number;            // weekTotal / 40 * 100
  goalPctProjected: number;       // weekProjected / 40 * 100
  // Daily history (last 14 days) for sparkline
  dailyHours: { date: string; billable: number; nonBillable: number }[];
  // Projected workload for paralegals: open milestones assigned, est hours remaining
  projectedOpenHours: number;     // sum of (estHours - logged) on open milestones for next 14d
}

// ---- Firm performance (Margaret's homepage profitability tiles) ----
export interface FirmPerformance {
  // New cases per month (goal: 10)
  newCasesGoalPerMonth: number;
  newCasesThisMonth: number;
  newCasesLastMonth: number;
  newCasesByMonth: { month: string; count: number }[];   // last 12 months
  newCasesQTD: number;
  newCasesLastQTD: number;        // same days into last quarter
  newCasesYTD: number;
  newCasesLastYTD: number;
  // Net income (revenue collected − expenses, simple model)
  netIncomeQTD: number;
  netIncomeLastQ: number;         // same N days into prior quarter
  netIncomeQuarterGoal: number;
  netIncomeYTD: number;
  netIncomeLastYTD: number;
  netIncomeYearGoal: number;
  netIncomeByMonth: { month: string; revenue: number; collected: number; expenses: number; netIncome: number }[];
}

export interface RoutingRecommendation {
  staffId: string;
  name: string;
  initials: string;
  score: number;                  // higher = better fit
  headroomHours: number;
  urgencyScore: number;
  specialtyMatch: boolean;
  yearsExperience: number;
  reasoning: string;              // human-readable rationale
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  caseType: CaseType | "all";
  items: string[];
}

export interface ChecklistItem {
  id: string;
  caseId: string;
  templateId: string;
  templateName: string;
  text: string;
  completed: boolean;
  assigneeId?: string;
}

export interface CaseComment {
  id: string;
  caseId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface ScheduleBlock {
  id: string;
  staffId: string;
  caseId?: string;
  date: string;
  startHour: number;
  durationHours: number;
  title: string;
  kind: "deposition" | "court" | "drafting" | "client" | "internal" | "research";
}

// Communications from outside (opposing counsel, clients)
export type CommSource = "opposing_counsel" | "client" | "court" | "expert";
export type CommChannel = "email" | "letter" | "phone" | "filing";
export type CommStatus = "needs_response" | "in_progress" | "responded" | "no_action";
export type CommPriority = "high" | "normal" | "low";

export interface Communication {
  id: string;
  caseId: string;
  source: CommSource;
  channel: CommChannel;
  fromName: string;
  fromOrg?: string;
  subject: string;
  preview: string;
  receivedAt: string;
  assigneeId: string;
  status: CommStatus;
  priority: CommPriority;
  responseDueAt?: string;
}

// Client trouble tickets
export type TicketStatus = "open" | "in_progress" | "waiting_client" | "resolved";
export type TicketSeverity = "critical" | "high" | "normal" | "low";
export type TicketCategory = "billing_dispute" | "case_strategy" | "missed_communication" | "service_complaint" | "scope_change" | "other";

export interface Ticket {
  id: string;
  caseId: string;
  clientName: string;
  title: string;
  description: string;
  status: TicketStatus;
  severity: TicketSeverity;
  category: TicketCategory;
  createdAt: string;
  ownerId: string;
  slaDueAt: string;
  lastUpdate: string;
}

// Delegated tasks
export type TaskStatus = "todo" | "in_progress" | "blocked" | "review" | "done";
export type TaskPriority = "high" | "normal" | "low";

export interface DelegatedTask {
  id: string;
  caseId?: string;
  title: string;
  description: string;
  delegatedById: string; // managing partner
  assigneeId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  createdAt: string;
  estimatedHours: number;
}

// Billing & payments
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "partial";

export interface Invoice {
  id: string;
  caseId: string;
  clientName: string;
  number: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  amount: number;
  amountPaid: number;
  hoursBilled: number;
}

export interface TimeEntry {
  id: string;
  caseId: string;
  staffId: string;
  date: string;
  hours: number;
  rate: number;
  description: string;
  billable: boolean;
}

// Firm-wide warning thresholds (editable in settings)
export interface FirmSettings {
  deadlineRedDays: number; // overdue or within N days = red
  deadlineYellowDays: number; // within N days = yellow
  milestoneRedDays: number;
  milestoneYellowDays: number;
  taskRedDays: number;
  taskYellowDays: number;
  invoiceYellowDays: number; // unpaid > N days past due = yellow
  invoiceRedDays: number; // unpaid > N days past due = red
  cruxDueDays: number; // crux must be analyzed within N days of intake
  positionDueDays: number; // position drafted within N days of intake
  // Hearing/mediation prep readiness — flag when prep work isn't complete in time
  hearingPrepDays: number; // analysis memo + discovery should be complete N days before
  // Estimate freshness — flag when lawyer's time estimate is stale
  estimateStaleDays: number; // estimate older than N days = needs refresh
  // ----- Growth goals (Margaret edits in Settings) -----
  newCasesGoalPerMonth: number;       // intake goal (default 10)
  weeklyHoursGoal: number;            // billable goal per lawyer/paralegal (default 40)
  netIncomeYearGoal: number;          // annual net income goal in dollars
  monthlyExpenses: number;            // average monthly fixed expenses (rent, salaries, overhead)
}

// Court Watch — newly filed lawsuits monitored as business development opportunities
export type FilingCategory =
  | "mass_filing"
  | "bankruptcy"
  | "commercial"
  | "real_estate";

export interface CourtFiling {
  id: string;
  category: FilingCategory;
  caption: string; // case caption / lead case
  court: string;
  filedDate: string;
  plaintiffFirm?: string;
  defendant?: string;
  groupSize: number; // number of related complaints in the group (1 = single)
  estimatedValue?: number; // dollar size if known
  summary: string;
  status: "new" | "reviewing" | "pursuing" | "passed" | "won";
  flaggedAt: string;
}

// ---- Potentials: high-value or specific-type filings that need outreach ----
// Auto-flagged when value >= $500K OR matter type is fraudulent_conveyance / preference / s549 / s548
export type PotentialTrigger =
  | "high_value"           // estimatedValue >= $500K
  | "fraudulent_conveyance"
  | "preference"
  | "section_549"          // post-petition transfer
  | "section_548"          // fraudulent transfer
  | "commercial_fraud"
  | "breach_fiduciary";

export type OutreachStatus =
  | "none"          // no outreach yet (red)
  | "sent"          // letter/email sent, no reply (yellow)
  | "engaged"       // they replied / meeting set (green)
  | "declined"      // they passed (gray, terminal)
  | "retained";     // we got the work (green, terminal)

export type OutreachChannel = "letter" | "email" | "phone" | "meeting";

export interface OutreachAttempt {
  id: string;
  channel: OutreachChannel;
  sentAt: string;
  byStaffId: string;
  notes?: string;
}

export interface Potential {
  id: string;
  caption: string;          // case / target description
  triggers: PotentialTrigger[]; // why this was flagged (one or many)
  category: FilingCategory; // which Court Watch bucket
  court: string;
  filedDate: string;
  defendant?: string;       // the party we'd represent
  plaintiffFirm?: string;
  estimatedValue?: number;
  summary: string;
  ownerId: string;          // attorney responsible for outreach
  outreachStatus: OutreachStatus;
  outreachAttempts: OutreachAttempt[];
  flaggedAt: string;
  resolvedAt?: string;
}

// ---- Strategic Projects (firm-building work — marketing, hiring, BD, ops, compliance) ----
// MarketingProject is kept as the entity name for backwards compat, but with a `category`
// field it now represents any strategic project Margaret is driving.
export type StrategicCategory =
  | "marketing"        // webinars, blogs, newsletters, campaigns
  | "business_dev"     // referral networks, partnerships, speaking
  | "hiring"           // adding lawyers, paralegals, support staff
  | "operations"       // internal systems, conflict checks, intake processes
  | "compliance"       // SOC 2, malpractice, ethics infrastructure
  | "practice_area";   // launching/expanding a new area of law

export type StrategicGoal =
  | "growth"           // brings in new clients/cases/revenue
  | "capacity"         // increases firm's ability to handle work
  | "profitability"    // reduces cost or improves margin
  | "brand"            // reputation, credibility, market position
  | "risk";            // reduces firm risk (compliance, conflicts)

export type MarketingProjectKind =
  | "webinar"
  | "newsletter"
  | "blog"
  | "speaking"
  | "cle"
  | "event"
  | "campaign"
  | "website"
  | "hire"             // open headcount
  | "partnership"      // referral or co-counsel relationship
  | "system"           // internal tool / process
  | "certification"    // SOC 2, ISO, etc.
  | "practice_launch"  // launching new practice area
  | "other";

export type MarketingProjectStatus =
  | "planning"
  | "in_progress"
  | "on_hold"
  | "launched"
  | "cancelled";

export interface MarketingMilestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
}

export interface MarketingProject {
  id: string;
  title: string;
  kind: MarketingProjectKind;
  category: StrategicCategory;          // NEW: which bucket of firm-building work
  goal: StrategicGoal;                  // NEW: what business outcome it serves
  expectedImpact: string;               // NEW: plain-English impact, e.g. "+2 clients/qtr"
  ownerId: string;
  description: string;
  startDate: string;
  dueDate: string;          // target launch / publish date
  status: MarketingProjectStatus;
  milestones: MarketingMilestone[];
  notes?: string;
}

// ---- Accountability summary (Zone 2: Is the team doing what they're supposed to do?) ----
// Combines task delivery + process compliance + milestone reliability per staff member.
export interface StaffAccountability {
  staffId: string;
  name: string;
  initials: string;
  role: StaffRole;
  // Tasks delegated to them
  openTasks: number;
  overdueTasks: number;
  completedTasks30d: number;
  taskCompletionRate30d: number;          // completed / (completed + still-open from same period)
  // Process compliance flags
  daysSinceLastTimeEntry: number;          // staleness of time logging
  daysSinceLastMilestoneUpdate: number;    // staleness of milestone progress reporting
  staleEstimates: number;                  // count of milestones with estimate older than threshold
  unroutedComms: number;                   // paralegal-only: comms they own and haven't routed yet
  unroutedOver4h: number;                  // paralegal-only: same, older than 4h SLA
  // Overall accountability status
  status: "reliable" | "watch" | "behind";  // green/yellow/red
  flags: string[];                          // human-readable reasons for the status
}

export interface AccountabilitySummary {
  // Tasks Margaret personally assigned (filterable: assignedById = managing partner)
  myAssignedTotal: number;
  myAssignedOpen: number;
  myAssignedOverdue: number;
  myAssignedRed: number;
  myAssignedYellow: number;
  myAssignedGreen: number;
  myAssignedRecent: {
    id: string;
    title: string;
    assigneeId: string;
    assigneeName: string;
    dueDate: string;
    daysUntilDue: number;
    status: DelegatedTask["status"];
    caseId?: string;
  }[];
  // Per-staff accountability rollup
  byStaff: StaffAccountability[];
  // Firm-wide rollup
  totalOpenTasks: number;
  totalOverdueTasks: number;
  reliable: number;                         // count of staff in green
  watch: number;                            // yellow
  behind: number;                           // red
}

// Summary used on Margaret's home (Zone 4: Am I moving the needle?)
export interface StrategicProjectSummary {
  totalActive: number;
  red: number;            // any milestone overdue or due in <= milestoneRedDays
  yellow: number;         // any milestone due in <= milestoneYellowDays
  green: number;          // all milestones healthy
  byCategory: { category: StrategicCategory; total: number; red: number; yellow: number; green: number }[];
  byGoal: { goal: StrategicGoal; total: number; red: number; yellow: number; green: number }[];
  atRisk: {
    id: string;
    title: string;
    category: StrategicCategory;
    goal: StrategicGoal;
    ownerId: string;
    ownerName: string;
    dueDate: string;
    redMs: number;
    yellowMs: number;
    greenMs: number;
    completedMs: number;
    totalMs: number;
    pctComplete: number;
    daysUntilDue: number;
    expectedImpact: string;
  }[];
  // Last 12 months: how many strategic projects launched/completed each month
  completionsByMonth: { month: string; launched: number }[];
}

export const updateFirmSettingsSchema = z.object({
  deadlineRedDays: z.number().int().min(0).max(60).optional(),
  deadlineYellowDays: z.number().int().min(0).max(90).optional(),
  milestoneRedDays: z.number().int().min(0).max(60).optional(),
  milestoneYellowDays: z.number().int().min(0).max(90).optional(),
  taskRedDays: z.number().int().min(0).max(60).optional(),
  taskYellowDays: z.number().int().min(0).max(90).optional(),
  invoiceYellowDays: z.number().int().min(0).max(180).optional(),
  invoiceRedDays: z.number().int().min(0).max(360).optional(),
  cruxDueDays: z.number().int().min(0).max(90).optional(),
  positionDueDays: z.number().int().min(0).max(180).optional(),
  hearingPrepDays: z.number().int().min(0).max(90).optional(),
  estimateStaleDays: z.number().int().min(0).max(90).optional(),
});

// Lawyer updates their milestone (time estimate + status)
export const updateMilestoneSchema = z.object({
  status: z.enum(["not_started", "in_progress", "blocked", "complete"]).optional(),
  estimatedHours: z.number().min(0).max(2000).optional(),
  hoursLogged: z.number().min(0).max(2000).optional(),
  estimateConfidence: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
  assigneeId: z.string().optional(),
});

export const reassignMilestoneSchema = z.object({
  newAssigneeId: z.string(),
  reason: z.string().max(500).optional(),
});

export const flagEmergencySchema = z.object({
  priority: z.enum(["normal", "urgent", "emergency"]),
});

export const routingRequestSchema = z.object({
  caseType: z.enum(["bankruptcy_avoidance", "commercial_litigation", "real_estate"]),
  priority: z.enum(["normal", "urgent", "emergency"]),
  estimatedTotalHours: z.number().min(0).max(2000).optional(),
});

// Potentials
export const recordOutreachSchema = z.object({
  channel: z.enum(["letter", "email", "phone", "meeting"]),
  notes: z.string().max(1000).optional(),
  byStaffId: z.string(),
});

export const updatePotentialStatusSchema = z.object({
  outreachStatus: z.enum(["none", "sent", "engaged", "declined", "retained"]),
});

// Marketing
export const updateMarketingProjectSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(["planning", "in_progress", "on_hold", "launched", "cancelled"]).optional(),
  dueDate: z.string().optional(),
  ownerId: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const toggleMarketingMilestoneSchema = z.object({
  milestoneId: z.string(),
  completed: z.boolean(),
});

// Minimal users table to keep template happy (unused in app)
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// API request schemas
export const insertCommentSchema = z.object({
  caseId: z.string(),
  authorId: z.string(),
  text: z.string().min(1),
});
export type InsertComment = z.infer<typeof insertCommentSchema>;

export const toggleChecklistSchema = z.object({
  itemId: z.string(),
  completed: z.boolean(),
});
export const completeDeadlineSchema = z.object({
  deadlineId: z.string(),
  completed: z.boolean(),
});
export const updateTaskStatusSchema = z.object({
  taskId: z.string(),
  status: z.enum(["todo", "in_progress", "blocked", "review", "done"]),
});
export const updateCommStatusSchema = z.object({
  commId: z.string(),
  status: z.enum(["needs_response", "in_progress", "responded", "no_action"]),
});
export const updateTicketStatusSchema = z.object({
  ticketId: z.string(),
  status: z.enum(["open", "in_progress", "waiting_client", "resolved"]),
});
