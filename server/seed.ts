import type {
  Staff,
  Case,
  CaseStage,
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
  CaseType,
  CaseStatus,
  CaseDocument,
  FirmSettings,
  CourtFiling,
  Milestone,
  MilestoneKind,
  MilestoneStatus,
} from "@shared/schema";

// Deterministic PRNG so data is stable across reloads
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const range = (min: number, max: number) =>
  min + Math.floor(rand() * (max - min + 1));

const TODAY = new Date("2026-04-25T00:00:00");
const iso = (d: Date) => d.toISOString();
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

// ---- Staff ----
export const STAFF: Staff[] = [
  { id: "s1", name: "Margaret Chen", initials: "MC", role: "partner", title: "Managing Partner", hoursThisWeek: 38, capacityHours: 40, caseIds: [], specialties: ["bankruptcy_avoidance", "commercial_litigation", "real_estate"], estimateRatio: 1.15, yearsExperience: 22 },
  { id: "s2", name: "David Rodriguez", initials: "DR", role: "partner", title: "Partner — Bankruptcy", hoursThisWeek: 42, capacityHours: 40, caseIds: [], specialties: ["bankruptcy_avoidance"], estimateRatio: 1.20, yearsExperience: 18 },
  { id: "s3", name: "Priya Patel", initials: "PP", role: "partner", title: "Partner — Commercial Lit", hoursThisWeek: 36, capacityHours: 40, caseIds: [], specialties: ["commercial_litigation", "real_estate"], estimateRatio: 1.18, yearsExperience: 15 },
  { id: "s4", name: "James O'Connor", initials: "JO", role: "associate", title: "Senior Associate", hoursThisWeek: 44, capacityHours: 40, caseIds: [], specialties: ["commercial_litigation", "bankruptcy_avoidance"], estimateRatio: 1.45, yearsExperience: 7 },
  { id: "s5", name: "Sarah Kim", initials: "SK", role: "associate", title: "Senior Associate", hoursThisWeek: 32, capacityHours: 40, caseIds: [], specialties: ["commercial_litigation", "real_estate"], estimateRatio: 1.25, yearsExperience: 6 },
  { id: "s6", name: "Marcus Johnson", initials: "MJ", role: "associate", title: "Associate", hoursThisWeek: 39, capacityHours: 40, caseIds: [], specialties: ["bankruptcy_avoidance", "commercial_litigation"], estimateRatio: 1.55, yearsExperience: 4 },
  { id: "s7", name: "Elena Vasquez", initials: "EV", role: "associate", title: "Associate", hoursThisWeek: 27, capacityHours: 40, caseIds: [], specialties: ["real_estate", "commercial_litigation"], estimateRatio: 1.30, yearsExperience: 4 },
  { id: "s8", name: "Aaron Liu", initials: "AL", role: "associate", title: "Junior Associate", hoursThisWeek: 41, capacityHours: 40, caseIds: [], specialties: ["commercial_litigation"], estimateRatio: 1.65, yearsExperience: 2 },
  { id: "p1", name: "Rachel Foster", initials: "RF", role: "paralegal", title: "Senior Paralegal", hoursThisWeek: 38, capacityHours: 40, caseIds: [], specialties: ["commercial_litigation", "real_estate"], estimateRatio: 1.10, yearsExperience: 12 },
  { id: "p2", name: "Thomas Greene", initials: "TG", role: "paralegal", title: "Paralegal — Bankruptcy", hoursThisWeek: 35, capacityHours: 40, caseIds: [], specialties: ["bankruptcy_avoidance"], estimateRatio: 1.12, yearsExperience: 9 },
  { id: "p3", name: "Nina Ahmadi", initials: "NA", role: "paralegal", title: "Paralegal — Litigation", hoursThisWeek: 40, capacityHours: 40, caseIds: [], specialties: ["commercial_litigation"], estimateRatio: 1.15, yearsExperience: 7 },
  { id: "p4", name: "Carlos Mendez", initials: "CM", role: "paralegal", title: "Paralegal", hoursThisWeek: 33, capacityHours: 40, caseIds: [], specialties: ["real_estate", "bankruptcy_avoidance"], estimateRatio: 1.20, yearsExperience: 5 },
  { id: "b1", name: "Linda Park", initials: "LP", role: "bookkeeper", title: "Bookkeeper", hoursThisWeek: 30, capacityHours: 40, caseIds: [], specialties: [], estimateRatio: 1.0, yearsExperience: 14 },
];

const ATTORNEYS = STAFF.filter((s) => s.role === "partner" || s.role === "associate");
const PARALEGALS = STAFF.filter((s) => s.role === "paralegal");

// ---- Cases ----
const CLIENTS = [
  "Sunset Capital Partners LLC",
  "Riverbend Manufacturing Inc.",
  "Coastal Holdings Trust",
  "Meridian Receivables Fund",
  "Apex Logistics Corp.",
  "Greenfield Investments LP",
  "Harbor Bay Realty",
  "Northstar Credit Union",
  "Pinnacle Asset Management",
  "Ironclad Industrial Supply",
  "Cascade Property Group",
  "Vanguard Mercantile Co.",
  "Brookside Lending Trust",
  "Crestline Wholesale",
  "Atlas Hard Money Fund III",
  "Beacon Distribution Inc.",
  "Summit Factoring LLC",
  "Lexington Avenue Partners",
  "Magnolia Trade Credit",
  "Triton Equipment Leasing",
];

const OPPOSING_FIRMS = [
  "Hodgson Russ LLP",
  "Bryan Cave Leighton Paisner",
  "Kelley Drye & Warren",
  "Cole Schotz P.C.",
  "Greenberg Traurig",
  "Smith Hulsey & Busey",
  "Fox Rothschild LLP",
  "Akerman LLP",
  "Holland & Knight",
];

const COURTS = [
  "S.D.N.Y. Bankr.",
  "D. Del. Bankr.",
  "M.D. Fla. Bankr.",
  "S.D. Fla.",
  "N.Y. Sup. Ct. Comm. Div.",
  "Fla. 12th Cir. Ct.",
  "E.D. Pa. Bankr.",
];

const CASE_TYPE_TITLES: Record<CaseType, string[]> = {
  bankruptcy_avoidance: [
    "Adversary Proceeding — Preference Recovery",
    "Adversary Proceeding — Fraudulent Transfer",
    "Avoidance Action — § 547 Preference",
    "Avoidance Action — § 548 Fraudulent Conveyance",
    "Trustee Clawback Litigation",
    "Subsequent Transferee Defense",
  ],
  commercial_litigation: [
    "Breach of Loan Agreement",
    "Factoring Receivables Dispute",
    "Hard Money Loan Default",
    "Commercial Note Enforcement",
    "Guaranty Enforcement Action",
    "UCC Article 9 Foreclosure",
  ],
  real_estate: [
    "Mortgage Foreclosure Defense",
    "Title Dispute — Commercial Property",
    "Mechanic's Lien Litigation",
    "Lease Default & Eviction",
  ],
};

const STATUSES: CaseStatus[] = [
  "discovery",
  "pleadings",
  "motion_practice",
  "trial_prep",
  "mediation",
  "post_trial",
];

const STAGES: CaseStage[] = ["intake", "pleadings", "discovery", "discovery", "motion_practice", "motion_practice", "mediation", "trial_prep"];
export const CASES: Case[] = [];

const CRUX_BY_TYPE: Record<CaseType, string[]> = {
  bankruptcy_avoidance: [
    "Trustee seeks recovery of $XAMOUNT in alleged preferential transfers made within the 90-day reachback. Defense centers on the ordinary course of business and contemporaneous exchange for new value defenses under § 547(c)(2) and § 547(c)(1).",
    "Adversary complaint alleges $XAMOUNT in fraudulent transfers under § 548 within the 2-year lookback. Our position: transfers were for reasonably equivalent value tied to legitimate trade credit — no actual or constructive fraud.",
    "Subsequent transferee defense under § 550(b). Trustee is reaching past the initial recipient to claw back funds from our client. Good-faith and value-given defenses are central.",
    "Preference action against client as ordinary trade vendor. Trustee seeks $XAMOUNT. New value advanced after the alleged preferential payment substantially offsets exposure.",
  ],
  commercial_litigation: [
    "Plaintiff alleges breach of $XAMOUNT loan agreement. Our defense: lender breached the implied covenant of good faith and fair dealing by accelerating without notice required under Section 7.04. Counterclaim for tortious interference also asserted.",
    "Factoring receivables dispute. Plaintiff factor claims our client diverted account-debtor payments. Our position: account debtor had legitimate setoff rights that predated the factoring assignment, defeating priority.",
    "Hard money loan default action. Borrower asserts usury and predatory lending defenses. Real estate collateral at issue — valuation and equity-of-redemption questions central to outcome.",
    "UCC Article 9 priority dispute over commercial receivables. Competing security interests; perfection date and PMSI status are decisive.",
  ],
  real_estate: [
    "Mortgage foreclosure defense. Borrower asserts servicer failed to comply with pre-foreclosure notice requirements under FL law. Standing and chain-of-assignment questions also raised.",
    "Mechanic's lien priority dispute. Multiple lienholders; our client's mortgage was recorded prior but lien claimant alleges visible commencement of work pre-dated mortgage recording.",
    "Commercial lease default and eviction. Tenant counterclaims for constructive eviction based on alleged failure to maintain HVAC and roof. Damages disputed.",
  ],
};

const POSITION_TEMPLATES = [
  "Strong defense on the merits; settlement leverage building. Push for early dispositive motion.",
  "Mixed posture — strong on liability defenses, weaker on damages mitigation. Mediation track recommended.",
  "Aggressive posture justified. Discovery favors us; counterclaim has independent value.",
  "Defensive posture. Goal is to minimize exposure through narrowed-scope settlement before MSJ briefing.",
  "Counterclaim is the case. Plaintiff's claims are weak; our affirmative claims drive value.",
];

for (let i = 0; i < 60; i++) {
  const types: CaseType[] = ["bankruptcy_avoidance", "bankruptcy_avoidance", "commercial_litigation", "commercial_litigation", "real_estate"];
  const type = pick(types);
  const titlePool = CASE_TYPE_TITLES[type];
  const title = pick(titlePool);
  const client = CLIENTS[i % CLIENTS.length];
  const lead = pick(ATTORNEYS).id;
  const teamSize = range(1, 3);
  const team = new Set<string>([lead]);
  while (team.size < teamSize + 1) team.add(pick(STAFF).id);
  const filed = addDays(TODAY, -range(30, 540));
  const trial = rand() > 0.4 ? addDays(TODAY, range(20, 280)) : undefined;
  const fee = pick<Case["feeArrangement"]>(["hourly", "hourly", "hourly", "contingency", "flat", "hybrid"]);
  const exposureLow = range(50, 400);
  const exposureHigh = exposureLow + range(50, 300);
  const cruxAmount = `$${range(120, 1800)},000`;
  const claimAmount = (exposureLow + exposureHigh) / 2 * 1000;
  // Workflow milestones — use deterministic distribution so warnings have content:
  // ~70% have crux done, ~55% have position drafted, ~60% have intake checklist
  const cruxDone = rand() < 0.7;
  const positionDone = cruxDone && rand() < 0.78; // can't have position without crux
  const intakeDone = rand() < 0.6;
  const cruxDueDate = iso(addDays(filed, 7));
  const positionDueDate = iso(addDays(filed, 14));
  const cruxCompletedAt = cruxDone ? iso(addDays(filed, range(2, 12))) : undefined;
  const positionCompletedAt = positionDone ? iso(addDays(filed, range(8, 20))) : undefined;
  CASES.push({
    id: `c${i + 1}`,
    caption: `${client} v. ${pick([
      "Westwood Industries",
      "Acme Distributors",
      "Pioneer Holdings",
      "Stellar Trade Co.",
      "Apex Mills",
      "Granite Steel",
      "Lakeshore Imports",
    ])}`,
    shortName: title,
    client,
    caseNumber: `${range(20, 26)}-${range(10000, 99999)}-${pick(["RDD", "MEW", "JAF", "KBO", "LSS"])}`,
    court: pick(COURTS),
    type,
    status: pick(STATUSES),
    stage: pick(STAGES),
    cruxSummary: pick(CRUX_BY_TYPE[type]).replace("$XAMOUNT", cruxAmount),
    ourPosition: pick(POSITION_TEMPLATES),
    exposureRange: `$${exposureLow}K – $${exposureHigh}K`,
    leadAttorneyId: lead,
    teamIds: Array.from(team),
    filedDate: iso(filed),
    trialDate: trial ? iso(trial) : undefined,
    description: `${title}. Client ${client}. Active matter requiring coordinated discovery, motion practice, and resolution strategy.`,
    feeArrangement: fee,
    billingRate: fee === "hourly" || fee === "hybrid" ? pick([425, 475, 525, 575, 625, 675]) : undefined,
    retainerBalance: range(0, 75) * 1000,
    budgetCap: rand() > 0.3 ? range(50, 350) * 1000 : undefined,
    wipBalance: range(2, 85) * 1000,
    claimAmount,
    cruxAnalyzed: cruxDone,
    cruxDueDate,
    cruxCompletedAt,
    positionDrafted: positionDone,
    positionDueDate,
    positionCompletedAt,
    intakeChecklistComplete: intakeDone,
    priority: rand() < 0.08 ? "emergency" : rand() < 0.15 ? "urgent" : "normal",
    emergencyFlaggedAt: undefined,
  });
}

// Fill caseIds on staff
for (const c of CASES) {
  for (const id of c.teamIds) {
    const s = STAFF.find((x) => x.id === id);
    if (s && !s.caseIds.includes(c.id)) s.caseIds.push(c.id);
  }
}

// ---- Deadlines (avg 12 per case) ----
const COURT_DEADLINES = [
  "Answer to Complaint",
  "Initial Disclosures (Rule 26)",
  "Fact Discovery Cutoff",
  "Expert Discovery Cutoff",
  "Dispositive Motion Deadline",
  "Reply Brief — MSJ",
  "Pretrial Conference",
  "Joint Pretrial Order",
  "Motions in Limine",
  "Trial Date",
  "Mediation Statement Due",
  "Status Conference",
  "Document Production Response",
  "Deposition — 30(b)(6)",
];
const INTERNAL_MILESTONES = [
  "Internal: Case strategy memo",
  "Internal: Document review complete",
  "Internal: Witness prep session",
  "Internal: Expert report draft",
  "Internal: Settlement analysis",
  "Internal: Client status update",
  "Internal: Brief outline review",
];

export const DEADLINES: Deadline[] = [];
let dCounter = 1;
for (const c of CASES) {
  const courtCount = range(7, 9);
  const internalCount = range(3, 5);
  for (let i = 0; i < courtCount; i++) {
    const offset = range(-25, 180);
    const d = addDays(TODAY, offset);
    let status: Deadline["status"] = "upcoming";
    if (offset < 0) status = rand() > 0.85 ? "overdue" : "completed";
    else if (offset <= 7) status = "due_soon";
    DEADLINES.push({
      id: `d${dCounter++}`,
      caseId: c.id,
      title: pick(COURT_DEADLINES),
      kind: "court",
      dueDate: iso(d),
      assigneeId: pick(c.teamIds),
      status,
      completedAt: status === "completed" ? iso(addDays(d, -1)) : undefined,
    });
  }
  for (let i = 0; i < internalCount; i++) {
    const offset = range(-15, 90);
    const d = addDays(TODAY, offset);
    let status: Deadline["status"] = "upcoming";
    if (offset < 0) status = rand() > 0.7 ? "overdue" : "completed";
    else if (offset <= 5) status = "due_soon";
    DEADLINES.push({
      id: `d${dCounter++}`,
      caseId: c.id,
      title: pick(INTERNAL_MILESTONES),
      kind: "internal",
      dueDate: iso(d),
      assigneeId: pick(c.teamIds),
      status,
      completedAt: status === "completed" ? iso(addDays(d, -1)) : undefined,
    });
  }
}

// ---- Checklist Templates ----
export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: "tpl1",
    name: "New Case Intake",
    caseType: "all",
    items: [
      "Conflicts check completed",
      "Engagement letter signed",
      "Retainer received and deposited to trust",
      "File opened in document management system",
      "Initial client interview documented",
      "Key documents collected from client",
      "Statute of limitations calendared",
      "Insurance coverage reviewed",
    ],
  },
  {
    id: "tpl2",
    name: "Avoidance Action Defense",
    caseType: "bankruptcy_avoidance",
    items: [
      "Verify 90-day / 1-year reachback dates",
      "Demand for itemization of transfers",
      "Ordinary course of business defense analysis",
      "New value defense calculation",
      "Subsequent new value worksheet",
      "Contemporaneous exchange analysis",
      "Client witness identification",
      "Document preservation hold issued",
      "Initial settlement demand evaluation",
    ],
  },
  {
    id: "tpl3",
    name: "Deposition Preparation",
    caseType: "all",
    items: [
      "Witness outline drafted",
      "Exhibit binder prepared",
      "Prior testimony reviewed",
      "Witness prep session 1 (overview)",
      "Witness prep session 2 (Q&A)",
      "Court reporter scheduled",
      "Conference room or Zoom confirmed",
      "Cross-noticed parties confirmed",
    ],
  },
  {
    id: "tpl4",
    name: "Motion for Summary Judgment Filing",
    caseType: "commercial_litigation",
    items: [
      "Statement of undisputed facts drafted",
      "Memorandum of law drafted",
      "Supporting declarations executed",
      "Exhibits Bates-stamped and indexed",
      "Local rule compliance reviewed",
      "Senior partner final review",
      "Filing fee processed",
      "ECF filing confirmed",
      "Courtesy copies delivered to chambers",
    ],
  },
  {
    id: "tpl5",
    name: "Trial Prep — 30 Day Countdown",
    caseType: "all",
    items: [
      "Trial notebook assembled",
      "Witness list finalized",
      "Exhibit list and objections logged",
      "Jury instructions drafted",
      "Voir dire questions prepared",
      "Opening statement outline",
      "Closing argument outline",
      "Daily trial schedule mapped",
      "Tech/AV check at courthouse",
    ],
  },
];

// Apply 1-2 templates per case
export const CHECKLIST_ITEMS: ChecklistItem[] = [];
let ciCounter = 1;
for (const c of CASES) {
  const intakeTpl = CHECKLIST_TEMPLATES[0];
  for (const text of intakeTpl.items) {
    CHECKLIST_ITEMS.push({
      id: `ci${ciCounter++}`,
      caseId: c.id,
      templateId: intakeTpl.id,
      templateName: intakeTpl.name,
      text,
      completed: rand() > 0.25,
      assigneeId: pick(c.teamIds),
    });
  }
  // Add one type-specific template
  const typed = CHECKLIST_TEMPLATES.find(
    (t) => t.caseType === c.type && t.id !== "tpl1"
  );
  if (typed) {
    for (const text of typed.items) {
      CHECKLIST_ITEMS.push({
        id: `ci${ciCounter++}`,
        caseId: c.id,
        templateId: typed.id,
        templateName: typed.name,
        text,
        completed: rand() > 0.5,
        assigneeId: pick(c.teamIds),
      });
    }
  }
}

// ---- Comments ----
const COMMENT_SAMPLES = [
  "Spoke with opposing counsel re: extension on document production. They've agreed to a 14-day extension in exchange for a stipulation on privilege log timing.",
  "Client confirmed they will be available for deposition prep next Wednesday. Prefers afternoon session.",
  "Reviewed bankruptcy court docket — trustee filed amended schedule of assets last night. Need to revise our 547(c) defense calculations.",
  "Mediation rescheduled. New date confirmed with mediator. Updated all team calendars.",
  "Settlement offer received: $185,000. Recommending counter at $310,000 with structured payment terms.",
  "Discovery dispute looming — we need to push back on their requests for production Nos. 14-22 as overbroad. Drafting letter today.",
  "Expert report received from Goldberg & Associates. Damages opinion supports our position. Sharing with team for review.",
  "Client called concerned about billing. I explained the recent motion practice was unanticipated. Will follow up with detailed accounting.",
];
export const COMMENTS: CaseComment[] = [];
let cmCounter = 1;
for (const c of CASES) {
  const n = range(1, 4);
  const teamPool = c.teamIds.length ? c.teamIds : [c.leadAttorneyId];
  for (let i = 0; i < n; i++) {
    const authorId = pick(teamPool);
    const author = STAFF.find((s) => s.id === authorId) || STAFF[0];
    COMMENTS.push({
      id: `cm${cmCounter++}`,
      caseId: c.id,
      authorId: author.id,
      authorName: author.name,
      text: pick(COMMENT_SAMPLES),
      createdAt: iso(addDays(TODAY, -range(0, 21))),
    });
  }
}

// ---- Schedule blocks (current week + next week per attorney) ----
export const SCHEDULE: ScheduleBlock[] = [];
let sbCounter = 1;
const blockTitles: Record<ScheduleBlock["kind"], string[]> = {
  deposition: ["Depo: 30(b)(6) witness", "Depo prep — client", "Depo: opposing expert"],
  court: ["Court hearing", "Status conference", "Motion hearing"],
  drafting: ["Draft MSJ brief", "Draft answer", "Draft discovery responses", "Brief revisions"],
  client: ["Client call", "Client meeting", "Strategy session w/ client"],
  internal: ["Team status", "Case review w/ Margaret", "All-hands"],
  research: ["Legal research — preference defense", "Research — UCC Art. 9"],
};
const startOfWeek = addDays(TODAY, -((TODAY.getDay() + 6) % 7)); // Monday
for (const s of STAFF) {
  for (let day = 0; day < 10; day++) {
    if (day % 7 === 5 || day % 7 === 6) continue; // skip weekends
    const d = addDays(startOfWeek, day);
    const blockCount = range(2, 5);
    let hour = 9;
    for (let b = 0; b < blockCount; b++) {
      const kind = pick(Object.keys(blockTitles)) as ScheduleBlock["kind"];
      const dur = pick([1, 1, 2, 2, 3]);
      if (hour + dur > 18) break;
      const cs = pick(s.caseIds.length ? s.caseIds : CASES.map((c) => c.id));
      SCHEDULE.push({
        id: `sb${sbCounter++}`,
        staffId: s.id,
        caseId: cs,
        date: iso(d).slice(0, 10),
        startHour: hour,
        durationHours: dur,
        title: pick(blockTitles[kind]),
        kind,
      });
      hour += dur + (rand() > 0.6 ? 1 : 0);
    }
  }
}

// ---- Communications ----
const COMM_SUBJECTS = {
  opposing_counsel: [
    "Re: Production of Documents — Request Nos. 12-18",
    "Re: Deposition Scheduling for 30(b)(6) Witness",
    "Re: Privilege Log Deficiencies",
    "Re: Proposed Stipulation on Discovery Extension",
    "Re: Settlement Discussion — Without Prejudice",
    "Re: Joint Status Report",
    "Re: Objections to Subpoena Duces Tecum",
  ],
  client: [
    "Question about settlement offer",
    "Concerns about recent invoice",
    "Update request — case status",
    "New documents to produce",
    "Available for deposition prep?",
    "Press inquiry — should I respond?",
    "Wire transfer for retainer replenishment",
  ],
  court: [
    "Notice of Hearing Rescheduled",
    "Order on Motion to Compel",
    "Minute Order — Status Conference",
  ],
  expert: [
    "Draft expert report attached",
    "Need additional documents for analysis",
    "Availability for trial testimony",
  ],
};
const COMM_PREVIEWS = [
  "We're following up on the items discussed at the last meet and confer. Please advise on your client's position regarding...",
  "Per our conversation yesterday, attached please find the proposed stipulation. We need this back signed by EOD Friday...",
  "I wanted to flag a few concerns about the recent invoice. Specifically, the line items dated April 14 seem high for...",
  "The court has rescheduled the status conference previously set for May 8 to May 22 at 10:00 a.m...",
  "Please find attached our preliminary damages analysis. We anticipate finalizing the report within two weeks...",
];

export const COMMUNICATIONS: Communication[] = [];
let coCounter = 1;
for (const c of CASES) {
  const n = range(2, 6);
  for (let i = 0; i < n; i++) {
    const source = pick(["opposing_counsel", "opposing_counsel", "client", "client", "court", "expert"] as const);
    const channel = pick(["email", "email", "email", "letter", "phone", "filing"] as const);
    const status = pick(["needs_response", "needs_response", "in_progress", "responded", "responded", "no_action"] as const);
    const priority = pick(["high", "normal", "normal", "normal", "low"] as const);
    const recv = addDays(TODAY, -range(0, 14));
    const due = status === "needs_response" || status === "in_progress" ? addDays(recv, range(2, 7)) : undefined;
    const fromName =
      source === "opposing_counsel"
        ? pick(["R. Hartley", "S. Brennan", "M. Fitzgerald", "L. Watanabe", "T. Goldfarb"])
        : source === "client"
        ? c.client
        : source === "court"
        ? "Clerk of Court"
        : pick(["Dr. A. Kessler (Expert)", "P. Stein, CFA"]);
    COMMUNICATIONS.push({
      id: `co${coCounter++}`,
      caseId: c.id,
      source,
      channel,
      fromName,
      fromOrg: source === "opposing_counsel" ? pick(OPPOSING_FIRMS) : undefined,
      subject: pick(COMM_SUBJECTS[source]),
      preview: pick(COMM_PREVIEWS),
      receivedAt: iso(recv),
      assigneeId: pick(c.teamIds),
      status,
      priority,
      responseDueAt: due ? iso(due) : undefined,
    });
  }
}

// ---- Tickets ----
const TICKET_TITLES: Record<string, string[]> = {
  billing_dispute: ["Disputing April invoice line items", "Question on contingency fee calculation", "Retainer drawdown concerns"],
  case_strategy: ["Wants more aggressive discovery posture", "Disagrees with settlement recommendation", "Requesting second opinion on motion strategy"],
  missed_communication: ["Hasn't received update in 3 weeks", "Voicemail unreturned x2", "Email thread went cold"],
  service_complaint: ["Frustrated with response times", "Feels under-informed on case progress", "Wants partner attention, not associate"],
  scope_change: ["Asking us to handle related counterclaim", "Wants to add second matter", "Expanding into related arbitration"],
  other: ["Conflict concern raised", "Document destruction worry"],
};
export const TICKETS: Ticket[] = [];
let tkCounter = 1;
for (let i = 0; i < 14; i++) {
  const c = pick(CASES);
  const cat = pick(Object.keys(TICKET_TITLES) as Ticket["category"][]);
  const sev = pick<Ticket["severity"]>(["critical", "high", "high", "normal", "normal", "low"]);
  const created = addDays(TODAY, -range(0, 12));
  const slaHours = sev === "critical" ? 4 : sev === "high" ? 24 : sev === "normal" ? 72 : 168;
  const sla = new Date(created);
  sla.setHours(sla.getHours() + slaHours);
  TICKETS.push({
    id: `tk${tkCounter++}`,
    caseId: c.id,
    clientName: c.client,
    title: pick(TICKET_TITLES[cat]),
    description: "Client reached out via " + pick(["phone", "email", "in-person meeting"]) + ". " + pick(COMM_PREVIEWS),
    status: pick<Ticket["status"]>(["open", "open", "in_progress", "in_progress", "waiting_client", "resolved"]),
    severity: sev,
    category: cat,
    createdAt: iso(created),
    ownerId: c.leadAttorneyId,
    slaDueAt: iso(sla),
    lastUpdate: iso(addDays(created, range(0, 3))),
  });
}

// ---- Delegated Tasks ----
const TASK_TITLES = [
  "Draft response to motion to compel",
  "Cite-check brief sections II–IV",
  "Prepare deposition outline for opposing 30(b)(6)",
  "Update client status memo",
  "Bates-stamp and index production set 003",
  "Privilege log review",
  "Settlement demand letter — first draft",
  "Calendar all upcoming deadlines for May",
  "Witness prep session scheduling",
  "Research: § 547(c)(2) ordinary course defense recent caselaw",
  "Damages calculation — update model",
  "File answer with affirmative defenses",
  "Draft mediation statement",
  "Organize trial exhibit binder",
];
export const TASKS: DelegatedTask[] = [];
let tCounter = 1;
for (let i = 0; i < 35; i++) {
  const c = pick(CASES);
  const assignee = pick(c.teamIds);
  const status = pick<DelegatedTask["status"]>(["todo", "todo", "in_progress", "in_progress", "blocked", "review", "done"]);
  TASKS.push({
    id: `tsk${tCounter++}`,
    caseId: c.id,
    title: pick(TASK_TITLES),
    description: "Delegated by managing partner. " + pick(COMMENT_SAMPLES),
    delegatedById: "s1",
    assigneeId: assignee,
    status,
    priority: pick<DelegatedTask["priority"]>(["high", "high", "normal", "normal", "normal", "low"]),
    dueDate: iso(addDays(TODAY, range(-3, 14))),
    createdAt: iso(addDays(TODAY, -range(1, 21))),
    estimatedHours: pick([1, 2, 3, 4, 6, 8]),
  });
}

// ---- Invoices ----
export const INVOICES: Invoice[] = [];
let invCounter = 1;
for (const c of CASES) {
  const n = range(1, 4);
  for (let i = 0; i < n; i++) {
    const issue = addDays(TODAY, -range(5, 120));
    const due = addDays(issue, 30);
    const amount = range(3, 65) * 1000;
    const status = pick<Invoice["status"]>(
      due < TODAY ? ["paid", "paid", "paid", "overdue", "partial"] : ["sent", "sent", "draft", "paid"]
    );
    const paid = status === "paid" ? amount : status === "partial" ? Math.round(amount * 0.4) : 0;
    INVOICES.push({
      id: `inv${invCounter++}`,
      caseId: c.id,
      clientName: c.client,
      number: `INV-${2026}-${String(invCounter).padStart(4, "0")}`,
      issueDate: iso(issue),
      dueDate: iso(due),
      status,
      amount,
      amountPaid: paid,
      hoursBilled: Math.round(amount / 525),
    });
  }
}

// ---- Time entries (last 180 days for week-over-week and quarter-over-quarter trends) ----
// Each lawyer/paralegal has a baseline daily target; some chronically under-log,
// some are at-target, some over-log. This produces realistic R/Y/G distribution.
export const TIME_ENTRIES: TimeEntry[] = [];
let teCounter = 1;
// Per-staff baseline hours-per-workday (varies the dataset realistically)
const STAFF_DAILY_BASELINE: Record<string, number> = {};
for (const s of STAFF) {
  if (s.role === "bookkeeper") { STAFF_DAILY_BASELINE[s.id] = 6.5; continue; }
  // Goal is 8h/day = 40h/week. Spread between 5.5 and 9.5 so some lawyers underperform, some overperform.
  // Use a hash of the id for stable variation across runs.
  const hash = s.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const variant = (hash % 9) - 3; // -3 .. +5
  STAFF_DAILY_BASELINE[s.id] = Math.max(5.0, Math.min(9.5, 8 + variant * 0.5));
}
for (let day = 180; day >= 0; day--) {
  const date = addDays(TODAY, -day);
  if (date.getDay() === 0 || date.getDay() === 6) continue;
  for (const s of STAFF) {
    // Skip occasional days (PTO, light days)
    if (rand() > 0.92) continue;
    const baseline = STAFF_DAILY_BASELINE[s.id] ?? 7;
    // Daily noise: +/- 25%
    const target = baseline * (0.75 + rand() * 0.5);
    // Break the day's hours into 2-5 entries on different cases
    const entries = range(2, 5);
    let remaining = target;
    for (let e = 0; e < entries; e++) {
      const isLast = e === entries - 1;
      const slice = isLast ? Math.max(0.25, remaining) : Math.min(remaining * 0.6, pick([0.5, 1, 1.5, 2, 2.5, 3]));
      remaining = Math.max(0, remaining - slice);
      const candidates = CASES.filter((cc) => cc.teamIds.includes(s.id));
      const c = pick(candidates.length ? candidates : CASES);
      // Round to nearest 0.25h
      const hrs = Math.max(0.25, Math.round(slice * 4) / 4);
      TIME_ENTRIES.push({
        id: `te${teCounter++}`,
        caseId: c.id,
        staffId: s.id,
        date: iso(date).slice(0, 10),
        hours: hrs,
        rate: c.billingRate || 525,
        description: pick(["Draft brief", "Discovery review", "Client call", "Court appearance", "Deposition", "Internal team meeting", "Legal research", "Document production", "Witness prep", "Settlement negotiation"]),
        billable: s.role === "bookkeeper" ? false : (s.role !== "paralegal" || rand() > 0.2),
      });
      if (remaining <= 0) break;
    }
  }
}

// ---- Documents ----
const DOC_NAMES_BY_SOURCE: Record<string, string[]> = {
  client: [
    "Engagement Letter — signed.pdf",
    "Client intake questionnaire.pdf",
    "Master Services Agreement.pdf",
    "Promissory Note (original).pdf",
    "Account ledger 2023-2024.xlsx",
    "Wire confirmations Q3.pdf",
    "Email thread — pre-litigation demand.pdf",
    "Personal financial statement.pdf",
    "Corporate formation docs.pdf",
    "Insurance policies.pdf",
  ],
  our_production: [
    "Responses to Interrogatories — Set One.pdf",
    "Responses to RFPs — Set One.pdf",
    "Privilege log v3.xlsx",
    "Document production volume 001.pdf",
    "Document production volume 002.pdf",
    "Supplemental responses to RFPs.pdf",
    "30(b)(6) deposition outline (work product).docx",
  ],
  opposing_production: [
    "Opposing production OPP-000001 to OPP-002500.pdf",
    "Opposing production OPP-002501 to OPP-005000.pdf",
    "Plaintiff's Initial Disclosures.pdf",
    "Trustee's amended schedule of assets.pdf",
    "Opposing privilege log.pdf",
    "Plaintiff's expert report — damages.pdf",
    "Bank records produced by trustee.xlsx",
  ],
  court_filing: [
    "Complaint (filed).pdf",
    "Answer with Affirmative Defenses (filed).pdf",
    "Motion to Dismiss — memorandum.pdf",
    "Order on Motion to Compel.pdf",
    "Joint Status Report.pdf",
    "Stipulated Protective Order.pdf",
  ],
  work_product: [
    "Internal case strategy memo.docx",
    "Settlement analysis worksheet.xlsx",
    "Legal research — preference defenses.docx",
    "Damages model v4.xlsx",
    "Witness interview notes — confidential.docx",
  ],
  expert: [
    "Expert report — Goldberg & Associates.pdf",
    "Expert CV.pdf",
    "Expert engagement letter.pdf",
    "Damages methodology worksheet.xlsx",
  ],
};

const DOC_KIND_FROM_NAME = (name: string): CaseDocument["kind"] => {
  if (name.endsWith(".xlsx")) return "xlsx";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".pdf")) return "pdf";
  return "other";
};

const DOC_TAGS = ["key", "discovery", "financials", "communications", "pleadings", "expert", "trial", "settlement", "privileged"];

export const DOCUMENTS: CaseDocument[] = [];
let docCounter = 1;
for (const c of CASES) {
  const sources: CaseDocument["source"][] = ["client", "our_production", "opposing_production", "court_filing", "work_product"];
  if (rand() > 0.5) sources.push("expert");
  for (const src of sources) {
    const pool = DOC_NAMES_BY_SOURCE[src];
    const n = src === "client" ? range(3, 6) : src === "opposing_production" ? range(2, 4) : range(1, 3);
    const used = new Set<string>();
    for (let i = 0; i < n; i++) {
      let nm = pick(pool);
      let guard = 0;
      while (used.has(nm) && guard++ < 5) nm = pick(pool);
      used.add(nm);
      const isProd = src === "our_production" || src === "opposing_production";
      const prefix = src === "our_production" ? "PROD" : "OPP";
      const bates = isProd ? `${prefix}-${String(range(1, 9999)).padStart(6, "0")}` : undefined;
      DOCUMENTS.push({
        id: `doc${docCounter++}`,
        caseId: c.id,
        name: nm,
        source: src,
        kind: DOC_KIND_FROM_NAME(nm),
        sizeKb: range(80, 18000),
        uploadedAt: iso(addDays(TODAY, -range(0, 200))),
        uploadedById: pick(c.teamIds),
        bates,
        privileged: src === "work_product" || (src === "client" && rand() > 0.85),
        tags: Array.from(new Set([pick(DOC_TAGS), pick(DOC_TAGS)])),
        description: rand() > 0.6 ? pick(["Key liability exhibit", "Foundational financial record", "Produced under protective order", "Marked confidential", "Subject to clawback request"]) : undefined,
      });
    }
  }
}

// ===== Firm Settings (defaults; managing partner can edit) =====
export const FIRM_SETTINGS: FirmSettings = {
  deadlineRedDays: 3,
  deadlineYellowDays: 7,
  milestoneRedDays: 3,
  milestoneYellowDays: 7,
  taskRedDays: 1,
  taskYellowDays: 5,
  invoiceYellowDays: 30,
  invoiceRedDays: 60,
  cruxDueDays: 7,
  positionDueDays: 14,
  hearingPrepDays: 14,
  estimateStaleDays: 21,
  newCasesGoalPerMonth: 10,
  weeklyHoursGoal: 40,
  // 8 lawyers × ~$425k avg revenue/lawyer × 25% net margin ≈ $850k
  netIncomeYearGoal: 850000,
  // Rent + 12 staff salaries + insurance + tech + misc ≈ $185k/month
  monthlyExpenses: 185000,
};

// ===== Court Watch — newly filed lawsuits =====
const PLAINTIFF_FIRMS = [
  "Berger Montague PC",
  "Robbins Geller Rudman & Dowd LLP",
  "Bursor & Fisher PA",
  "Hagens Berman",
  "Lieff Cabraser Heimann",
  "Susman Godfrey LLP",
];
const DEFENDANT_NAMES = [
  "Apex Logistics Corp.",
  "Meridian Fund Holdings",
  "Sunbelt Manufacturing Co.",
  "Cascade Property Group",
  "Riverbend Industries",
  "Stellar Trade Co.",
];
const COURT_VENUES = [
  "S.D. Fla.",
  "M.D. Fla.",
  "Fla. Cir. Ct. (Miami-Dade)",
  "11th Cir.",
  "Bankr. S.D. Fla.",
];

const FILING_TEMPLATES: Array<{
  category: CourtFiling["category"];
  caption: string;
  summary: string;
  groupSize: () => number;
  estimatedValue?: () => number;
}> = [
  {
    category: "mass_filing",
    caption: "Re: Solera Energy Securities Litigation",
    summary: "Wave of related securities class actions following $480M restatement; 14 filed in last 11 days.",
    groupSize: () => range(8, 22),
    estimatedValue: () => range(80, 240) * 1_000_000,
  },
  {
    category: "mass_filing",
    caption: "In re Aerion Health Data Breach",
    summary: "Coordinated filings across multiple districts after disclosure of 2.1M-record breach.",
    groupSize: () => range(6, 14),
    estimatedValue: () => range(40, 120) * 1_000_000,
  },
  {
    category: "mass_filing",
    caption: "In re Coastal Bank Overdraft Fees MDL",
    summary: "Plaintiff firm filing parallel UCC and consumer claims in 9 states; defendant class banks.",
    groupSize: () => range(9, 18),
    estimatedValue: () => range(60, 180) * 1_000_000,
  },
  {
    category: "bankruptcy",
    caption: "In re Pinnacle Resorts Holdings, Ch. 11",
    summary: "Large debtor with ~$1.4B in funded debt; preference and avoidance opportunities likely substantial.",
    groupSize: () => 1,
    estimatedValue: () => range(800, 1_800) * 1_000_000,
  },
  {
    category: "bankruptcy",
    caption: "In re Crestmont Manufacturing, Ch. 7",
    summary: "Liquidating debtor; trustee likely to retain special counsel for fraudulent transfer pursuit.",
    groupSize: () => 1,
    estimatedValue: () => range(120, 380) * 1_000_000,
  },
  {
    category: "bankruptcy",
    caption: "In re Lockwood Real Estate Trust, Ch. 11",
    summary: "Real estate debtor; cross-collateralization and lien priority disputes among 14 secured creditors.",
    groupSize: () => 1,
    estimatedValue: () => range(220, 540) * 1_000_000,
  },
  {
    category: "commercial",
    caption: "Hadley Capital Partners LP v. Riverbend Industries",
    summary: "Breach of stock purchase agreement; $42M earn-out dispute filed in S.D. Fla.",
    groupSize: () => 1,
    estimatedValue: () => range(20, 80) * 1_000_000,
  },
  {
    category: "commercial",
    caption: "Vista Logistics Inc. v. Cascade Property Group",
    summary: "Commercial lease default; counterclaims for fraud and tortious interference.",
    groupSize: () => 1,
    estimatedValue: () => range(4, 22) * 1_000_000,
  },
  {
    category: "commercial",
    caption: "Apex Logistics v. Beacon Distribution",
    summary: "UCC Article 9 priority dispute over commingled inventory collateral; 3 secured creditors.",
    groupSize: () => 1,
    estimatedValue: () => range(8, 30) * 1_000_000,
  },
  {
    category: "real_estate",
    caption: "Coastal Mortgage Trust v. Magnolia Estates",
    summary: "Foreclosure on 142-unit multifamily; potential receivership.",
    groupSize: () => 1,
    estimatedValue: () => range(20, 60) * 1_000_000,
  },
  {
    category: "real_estate",
    caption: "In re North Shore Title Defects (8 related cases)",
    summary: "Quiet title actions stemming from defective recordation in Broward County.",
    groupSize: () => range(5, 12),
    estimatedValue: () => range(2, 10) * 1_000_000,
  },
  {
    category: "real_estate",
    caption: "Magnolia Trade Credit v. Harbor Bay Realty",
    summary: "Mechanic's lien priority and contractor-payment dispute on commercial development.",
    groupSize: () => 1,
    estimatedValue: () => range(3, 14) * 1_000_000,
  },
];

export const COURT_FILINGS: CourtFiling[] = FILING_TEMPLATES.map((t, i) => ({
  id: `cf${i + 1}`,
  category: t.category,
  caption: t.caption,
  court: pick(COURT_VENUES),
  filedDate: iso(addDays(TODAY, -range(0, 18))),
  plaintiffFirm: t.category === "mass_filing" ? pick(PLAINTIFF_FIRMS) : undefined,
  defendant: t.category === "mass_filing" ? pick(DEFENDANT_NAMES) : undefined,
  groupSize: t.groupSize(),
  estimatedValue: t.estimatedValue ? t.estimatedValue() : undefined,
  summary: t.summary,
  status: pick<CourtFiling["status"]>(["new", "new", "new", "reviewing", "reviewing", "pursuing", "passed"]),
  flaggedAt: iso(addDays(TODAY, -range(0, 12))),
}));

// ===== Milestones (the spine of the practice) =====
// Each case gets a chain: info_gathering → analysis_memo → position_statement → discovery → hearing/mediation
// Lawyer-provided time estimates are required. Status distribution varies by case stage.

const MILESTONE_TITLES: Record<MilestoneKind, string> = {
  info_gathering: "Client info gathering",
  analysis_memo: "Substantive analysis memo",
  position_statement: "Position statement",
  discovery: "Discovery work",
  hearing: "Hearing",
  mediation: "Mediation",
};

const STAGE_PROGRESS: Record<string, number> = {
  intake: 0,
  pleadings: 1,
  discovery: 3,
  motion_practice: 4,
  mediation: 4,
  trial_prep: 5,
  trial: 5,
  post_trial: 6,
  closed: 6,
};

// Estimated hours by milestone kind — defensible defaults a litigation lawyer would give
const EST_HOURS: Record<MilestoneKind, [number, number]> = {
  info_gathering: [4, 12],
  analysis_memo: [12, 30],
  position_statement: [8, 20],
  discovery: [40, 120],
  hearing: [6, 16],
  mediation: [10, 24],
};

export const MILESTONES: Milestone[] = [];
let mCounter = 1;

for (const c of CASES) {
  const filed = new Date(c.filedDate);
  const progress = STAGE_PROGRESS[c.stage] ?? 1;
  const lead = c.leadAttorneyId;
  const trial = c.trialDate ? new Date(c.trialDate) : addDays(filed, range(180, 360));

  // Sequence of milestones — every case has these 4, plus hearing/mediation as appropriate
  const chain: Array<{ kind: MilestoneKind; offsetFromFiled: number; index: number }> = [
    { kind: "info_gathering", offsetFromFiled: 7, index: 0 },
    { kind: "analysis_memo", offsetFromFiled: 21, index: 1 },
    { kind: "position_statement", offsetFromFiled: 35, index: 2 },
    { kind: "discovery", offsetFromFiled: 90, index: 3 },
  ];

  // Hearing date — most cases have one, scheduled 30-150 days from now
  const hasHearing = rand() < 0.85;
  const hasMediation = rand() < 0.55;

  const ids: Record<number, string> = {};
  for (const step of chain) {
    const id = `m${mCounter++}`;
    ids[step.index] = id;
    const due = addDays(filed, step.offsetFromFiled);
    let status: MilestoneStatus = "not_started";
    if (step.index < progress) status = "complete";
    else if (step.index === progress) status = rand() < 0.7 ? "in_progress" : (rand() < 0.5 ? "blocked" : "not_started");
    else status = "not_started";

    // Some cases are behind: bump a couple of milestones to overdue
    let dueDate = due;
    if (status !== "complete" && rand() < 0.25) {
      dueDate = addDays(TODAY, -range(0, 14)); // overdue
    } else if (status !== "complete" && rand() < 0.25) {
      dueDate = addDays(TODAY, range(0, 7)); // due soon (yellow/red)
    } else if (status !== "complete") {
      dueDate = addDays(TODAY, range(8, 60)); // green
    }

    const [estLow, estHigh] = EST_HOURS[step.kind];
    const estimatedHours = range(estLow, estHigh);
    // hoursLogged correlates with status
    const hoursLogged =
      status === "complete" ? Math.round(estimatedHours * (0.85 + rand() * 0.4)) :
      status === "in_progress" ? Math.round(estimatedHours * (0.2 + rand() * 0.5)) :
      status === "blocked" ? Math.round(estimatedHours * rand() * 0.3) :
      0;

    // Estimate freshness — older cases sometimes have stale estimates
    const estimateUpdatedAt = iso(addDays(TODAY, -range(0, 35)));

    // Dependencies: analysis_memo depends on info_gathering; position_statement depends on analysis_memo;
    // discovery depends on analysis_memo (the partner specifically called this out)
    const dependsOnIds: string[] = [];
    if (step.kind === "analysis_memo" && ids[0]) dependsOnIds.push(ids[0]);
    if (step.kind === "position_statement" && ids[1]) dependsOnIds.push(ids[1]);
    if (step.kind === "discovery" && ids[1]) dependsOnIds.push(ids[1]);

    MILESTONES.push({
      id,
      caseId: c.id,
      kind: step.kind,
      title: MILESTONE_TITLES[step.kind],
      sequence: step.index,
      dueDate: iso(dueDate),
      assigneeId: lead,
      status,
      estimatedHours,
      hoursLogged,
      estimateUpdatedAt,
      estimateConfidence: pick<"low" | "medium" | "high">(["medium", "medium", "high", "low"]),
      dependsOnIds,
      completedAt: status === "complete" ? iso(addDays(dueDate, -range(0, 5))) : undefined,
    });
  }

  // Hearing
  if (hasHearing) {
    const hearingDate = addDays(TODAY, range(15, 180));
    const id = `m${mCounter++}`;
    const [estLow, estHigh] = EST_HOURS.hearing;
    MILESTONES.push({
      id,
      caseId: c.id,
      kind: "hearing",
      title: "Hearing",
      sequence: 4,
      dueDate: iso(hearingDate),
      assigneeId: lead,
      status: hearingDate < TODAY ? "complete" : "not_started",
      estimatedHours: range(estLow, estHigh),
      hoursLogged: 0,
      estimateUpdatedAt: iso(addDays(TODAY, -range(0, 30))),
      estimateConfidence: pick<"low" | "medium" | "high">(["medium", "high", "high"]),
      dependsOnIds: ids[1] ? [ids[1]] : [], // analysis memo must be done
      location: pick(["S.D. Fla. — Courtroom 11-2", "Fla. Cir. Ct. (Miami-Dade) — Rm. 6-1", "Bankr. S.D. Fla. — Courtroom 7"]),
      judge: pick(["Hon. R. Devereaux", "Hon. M. Whitfield", "Hon. K. Okonkwo", "Hon. L. Sandoval", "Hon. J. Aragon"]),
    });
  }

  // Mediation
  if (hasMediation) {
    const medDate = addDays(TODAY, range(20, 150));
    const id = `m${mCounter++}`;
    const [estLow, estHigh] = EST_HOURS.mediation;
    MILESTONES.push({
      id,
      caseId: c.id,
      kind: "mediation",
      title: "Mediation",
      sequence: 5,
      dueDate: iso(medDate),
      assigneeId: lead,
      status: medDate < TODAY ? "complete" : "not_started",
      estimatedHours: range(estLow, estHigh),
      hoursLogged: 0,
      estimateUpdatedAt: iso(addDays(TODAY, -range(0, 30))),
      estimateConfidence: pick<"low" | "medium" | "high">(["medium", "high"]),
      dependsOnIds: ids[2] ? [ids[2]] : [], // position statement should be done
      location: pick(["JAMS Miami", "Upchurch Watson White & Max", "ADR Solutions Inc."]),
    });
  }
}

// ============================================================================
// POTENTIALS — high-value or specific-type filings that need outreach
// ============================================================================
const POTENTIAL_TEMPLATES: Array<{
  caption: string;
  triggers: import("@shared/schema").PotentialTrigger[];
  category: import("@shared/schema").FilingCategory;
  court: string;
  filedDaysAgo: number;
  defendant?: string;
  plaintiffFirm?: string;
  estimatedValue?: number;
  summary: string;
  outreachStatus: import("@shared/schema").OutreachStatus;
  outreachAttempts: Array<{ channel: "letter" | "email" | "phone" | "meeting"; daysAgo: number; notes?: string }>;
}> = [
  {
    caption: "Trustee v. Sunset Capital Partners LLC",
    triggers: ["fraudulent_conveyance", "section_548", "high_value"],
    category: "bankruptcy",
    court: "Bankr. S.D. Fla.",
    filedDaysAgo: 6,
    defendant: "Sunset Capital Partners LLC",
    plaintiffFirm: "Whitfield Trustees PA",
    estimatedValue: 2_400_000,
    summary: "Chapter 7 trustee alleging $2.4M intentional fraudulent transfer to insider 18 months pre-petition. §548 claim with state-law badges. Defendant has no current bankruptcy counsel.",
    outreachStatus: "none",
    outreachAttempts: [],
  },
  {
    caption: "Trustee v. Riverbend Manufacturing Inc.",
    triggers: ["preference", "section_549"],
    category: "bankruptcy",
    court: "Bankr. M.D. Fla.",
    filedDaysAgo: 4,
    defendant: "Riverbend Manufacturing Inc.",
    plaintiffFirm: "Coastal Trustee Group",
    estimatedValue: 380_000,
    summary: "§547 preference + §549 post-petition transfer claim. 90-day reachback. Defendant is operating debtor.",
    outreachStatus: "none",
    outreachAttempts: [],
  },
  {
    caption: "Apex Logistics Corp. v. Hartford & Co.",
    triggers: ["high_value", "commercial_fraud"],
    category: "commercial",
    court: "Fla. Cir. Ct. (Miami-Dade)",
    filedDaysAgo: 11,
    defendant: "Hartford & Co.",
    plaintiffFirm: "Reston Wexler LLP",
    estimatedValue: 8_750_000,
    summary: "$8.75M commercial fraud and breach of contract. Complex damages model, sophisticated counsel for plaintiff. Defendant likely needs experienced commercial litigation team.",
    outreachStatus: "sent",
    outreachAttempts: [
      { channel: "letter", daysAgo: 8, notes: "Intro letter w/ firm capabilities packet. No response yet." },
    ],
  },
  {
    caption: "Coastal Holdings Trust v. Meridian Receivables",
    triggers: ["fraudulent_conveyance", "high_value"],
    category: "commercial",
    court: "Fla. Cir. Ct. (Broward)",
    filedDaysAgo: 14,
    defendant: "Meridian Receivables Fund",
    plaintiffFirm: "Brick & Stone PA",
    estimatedValue: 1_200_000,
    summary: "Fraudulent transfer claim under Florida UFTA. $1.2M in receivable assignments allegedly to hinder creditors.",
    outreachStatus: "engaged",
    outreachAttempts: [
      { channel: "email", daysAgo: 12, notes: "Sent intro + capabilities deck" },
      { channel: "phone", daysAgo: 7, notes: "GC called back, scheduled meeting" },
      { channel: "meeting", daysAgo: 2, notes: "Met w/ GC and CFO — engagement letter under review" },
    ],
  },
  {
    caption: "Trustee v. Greenfield Investments LP",
    triggers: ["preference"],
    category: "bankruptcy",
    court: "Bankr. S.D. Fla.",
    filedDaysAgo: 9,
    defendant: "Greenfield Investments LP",
    plaintiffFirm: "Aldrich & Pace",
    estimatedValue: 215_000,
    summary: "§547 preference claim against LP. Standard 90-day window, ordinary course defense likely viable.",
    outreachStatus: "sent",
    outreachAttempts: [
      { channel: "letter", daysAgo: 6 },
      { channel: "email", daysAgo: 3, notes: "Follow-up email" },
    ],
  },
  {
    caption: "Harbor Bay Realty v. Vanguard Mercantile",
    triggers: ["high_value", "breach_fiduciary"],
    category: "real_estate",
    court: "Fla. Cir. Ct. (Palm Beach)",
    filedDaysAgo: 5,
    defendant: "Vanguard Mercantile Co.",
    plaintiffFirm: "Tate Sutter LLP",
    estimatedValue: 4_100_000,
    summary: "$4.1M breach of fiduciary duty + JV partnership dispute. Real estate development project. Defendant likely needs counsel familiar with FL partnership law.",
    outreachStatus: "none",
    outreachAttempts: [],
  },
  {
    caption: "Trustee v. Brookside Lending Trust",
    triggers: ["fraudulent_conveyance", "section_548", "section_549", "high_value"],
    category: "bankruptcy",
    court: "Bankr. S.D. Fla.",
    filedDaysAgo: 2,
    defendant: "Brookside Lending Trust",
    plaintiffFirm: "Whitfield Trustees PA",
    estimatedValue: 6_300_000,
    summary: "Three-count complaint: §548 actual fraud, §548 constructive fraud, §549 post-petition transfer. $6.3M aggregate. High-stakes — defendant urgently needs counsel.",
    outreachStatus: "none",
    outreachAttempts: [],
  },
  {
    caption: "Pinnacle Asset Management v. Ironclad Industrial",
    triggers: ["commercial_fraud"],
    category: "commercial",
    court: "Fla. Cir. Ct. (Miami-Dade)",
    filedDaysAgo: 19,
    defendant: "Ironclad Industrial Supply",
    plaintiffFirm: "Calloway Reed",
    estimatedValue: 720_000,
    summary: "Commercial fraud + breach. Mid-size commercial dispute, defendant's prior counsel withdrew per docket.",
    outreachStatus: "declined",
    outreachAttempts: [
      { channel: "letter", daysAgo: 15 },
      { channel: "email", daysAgo: 10, notes: "Defendant said they have in-house counsel handling" },
    ],
  },
  {
    caption: "Cascade Property Group · Receiver Action",
    triggers: ["high_value", "fraudulent_conveyance"],
    category: "real_estate",
    court: "Fla. Cir. Ct. (Orange)",
    filedDaysAgo: 1,
    defendant: "Cascade Property Group",
    plaintiffFirm: "Renton Caldwell",
    estimatedValue: 3_800_000,
    summary: "Receiver appointment + fraudulent transfer counts on $3.8M property portfolio. Filed yesterday, defendant has 20 days to respond.",
    outreachStatus: "none",
    outreachAttempts: [],
  },
  {
    caption: "Northstar Credit Union v. Multiple Defs.",
    triggers: ["section_549"],
    category: "bankruptcy",
    court: "Bankr. M.D. Fla.",
    filedDaysAgo: 23,
    defendant: "Northstar Credit Union",
    plaintiffFirm: "Kessler Reilly",
    estimatedValue: 165_000,
    summary: "§549 unauthorized post-petition transfer claim. Smaller dollar but legally interesting fact pattern.",
    outreachStatus: "retained",
    outreachAttempts: [
      { channel: "letter", daysAgo: 20 },
      { channel: "phone", daysAgo: 17 },
      { channel: "meeting", daysAgo: 14 },
      { channel: "email", daysAgo: 12, notes: "Engagement signed" },
    ],
  },
];

let potCounter = 1;
let outreachCounter = 1;
export const POTENTIALS: import("@shared/schema").Potential[] = POTENTIAL_TEMPLATES.map((t) => ({
  id: `pot${potCounter++}`,
  caption: t.caption,
  triggers: t.triggers,
  category: t.category,
  court: t.court,
  filedDate: iso(addDays(TODAY, -t.filedDaysAgo)),
  defendant: t.defendant,
  plaintiffFirm: t.plaintiffFirm,
  estimatedValue: t.estimatedValue,
  summary: t.summary,
  ownerId: pick(["s2", "s3", "s4", "s5"]),
  outreachStatus: t.outreachStatus,
  outreachAttempts: t.outreachAttempts.map((a) => ({
    id: `out${outreachCounter++}`,
    channel: a.channel,
    sentAt: iso(addDays(TODAY, -a.daysAgo)),
    byStaffId: pick(["s2", "s3", "s4", "s5"]),
    notes: a.notes,
  })),
  flaggedAt: iso(addDays(TODAY, -t.filedDaysAgo)),
  resolvedAt: t.outreachStatus === "declined" || t.outreachStatus === "retained"
    ? iso(addDays(TODAY, -1))
    : undefined,
}));

// ============================================================================
// MARKETING PROJECTS — webinars, newsletters, blog posts, speaking, etc.
// ============================================================================
type StratCat = import("@shared/schema").StrategicCategory;
type StratGoal = import("@shared/schema").StrategicGoal;
const MARKETING_TEMPLATES: Array<{
  title: string;
  kind: import("@shared/schema").MarketingProjectKind;
  category: StratCat;
  goal: StratGoal;
  expectedImpact: string;
  ownerId: string;
  description: string;
  startDaysAgo: number;
  dueDaysFromNow: number;
  status: import("@shared/schema").MarketingProjectStatus;
  milestones: Array<{ title: string; offset: number; completed: boolean }>;
  notes?: string;
}> = [
  {
    title: "Q2 Bankruptcy Avoidance Webinar",
    kind: "webinar",
    category: "marketing",
    goal: "growth",
    expectedImpact: "3-5 qualified leads, ~2 retainers (~$60K)",
    ownerId: "s2",
    description: "60-min CLE webinar on §547/§548/§549 defense strategies. Target audience: in-house counsel, mid-market CFOs.",
    startDaysAgo: 35,
    dueDaysFromNow: 18,
    status: "in_progress",
    milestones: [
      { title: "Topic outline approved", offset: -28, completed: true },
      { title: "Speaker deck draft", offset: -14, completed: true },
      { title: "Marketing email blast", offset: -7, completed: false },
      { title: "Dry run rehearsal", offset: 7, completed: false },
      { title: "Live broadcast", offset: 18, completed: false },
    ],
    notes: "Need to push the marketing email — already 1 week behind schedule.",
  },
  {
    title: "April Client Newsletter",
    kind: "newsletter",
    category: "marketing",
    goal: "brand",
    expectedImpact: "Top-of-mind with 2,400 subscribers",
    ownerId: "s3",
    description: "Monthly newsletter — featured case study, regulatory update, firm news.",
    startDaysAgo: 18,
    dueDaysFromNow: -2,
    status: "in_progress",
    milestones: [
      { title: "Article topics finalized", offset: -14, completed: true },
      { title: "Drafts from contributors", offset: -7, completed: true },
      { title: "Edit + design", offset: -3, completed: false },
      { title: "Send via Mailchimp", offset: -1, completed: false },
    ],
    notes: "Overdue — design step blocked waiting on partner review.",
  },
  {
    title: "Florida UFTA Update — Blog Series",
    kind: "blog",
    category: "marketing",
    goal: "brand",
    expectedImpact: "SEO + thought leadership in core practice",
    ownerId: "s5",
    description: "Three-part blog series on recent Florida UFTA developments.",
    startDaysAgo: 21,
    dueDaysFromNow: 35,
    status: "in_progress",
    milestones: [
      { title: "Outline all 3 posts", offset: -14, completed: true },
      { title: "Draft post 1", offset: -7, completed: true },
      { title: "Publish post 1", offset: 0, completed: false },
      { title: "Draft post 2", offset: 14, completed: false },
      { title: "Publish post 2", offset: 21, completed: false },
      { title: "Draft + publish post 3", offset: 35, completed: false },
    ],
  },
  {
    title: "FL Bar CLE Speaking Slot",
    kind: "speaking",
    category: "business_dev",
    goal: "brand",
    expectedImpact: "~200 attorneys reached, referral pipeline",
    ownerId: "s1",
    description: "45-min talk at FL Bar Annual — 'Defending Avoidance Actions in 2026'.",
    startDaysAgo: 60,
    dueDaysFromNow: 42,
    status: "in_progress",
    milestones: [
      { title: "Abstract submitted + accepted", offset: -55, completed: true },
      { title: "Draft slide deck", offset: -14, completed: true },
      { title: "Internal rehearsal", offset: 21, completed: false },
      { title: "Final slides to organizers", offset: 35, completed: false },
      { title: "Talk delivered", offset: 42, completed: false },
    ],
  },
  {
    title: "Real Estate Practice Page Refresh",
    kind: "website",
    category: "marketing",
    goal: "growth",
    expectedImpact: "+30% organic traffic to RE practice",
    ownerId: "s7",
    description: "Update real-estate practice landing page — new case results, partner bios, schema markup.",
    startDaysAgo: 8,
    dueDaysFromNow: 22,
    status: "in_progress",
    milestones: [
      { title: "Audit current page", offset: -6, completed: true },
      { title: "Copy revisions", offset: 4, completed: false },
      { title: "Designer mockups", offset: 11, completed: false },
      { title: "Dev + launch", offset: 22, completed: false },
    ],
  },
  {
    title: "May Newsletter",
    kind: "newsletter",
    category: "marketing",
    goal: "brand",
    expectedImpact: "Top-of-mind with 2,400 subscribers",
    ownerId: "s3",
    description: "May edition — kickoff content planning.",
    startDaysAgo: 0,
    dueDaysFromNow: 28,
    status: "planning",
    milestones: [
      { title: "Article topics finalized", offset: 7, completed: false },
      { title: "Drafts from contributors", offset: 14, completed: false },
      { title: "Edit + design", offset: 21, completed: false },
      { title: "Send", offset: 28, completed: false },
    ],
  },
  {
    title: "Plaintiff Outreach — Bankruptcy Trustees Campaign",
    kind: "campaign",
    category: "business_dev",
    goal: "growth",
    expectedImpact: "5-8 trustee referrals (~$120K)",
    ownerId: "s2",
    description: "Targeted outreach to FL Chapter 7 trustees offering defense referrals.",
    startDaysAgo: 12,
    dueDaysFromNow: 40,
    status: "in_progress",
    milestones: [
      { title: "Trustee list compiled", offset: -10, completed: true },
      { title: "Mailing materials approved", offset: -4, completed: true },
      { title: "First mail wave", offset: 4, completed: false },
      { title: "Follow-up call wave", offset: 18, completed: false },
      { title: "Second mail wave + report", offset: 40, completed: false },
    ],
  },
  {
    title: "Q3 Construction-Industry Webinar",
    kind: "webinar",
    category: "marketing",
    goal: "growth",
    expectedImpact: "Open new construction-vertical niche",
    ownerId: "s3",
    description: "Webinar for construction GCs on lien priority and bankruptcy.",
    startDaysAgo: 6,
    dueDaysFromNow: 75,
    status: "planning",
    milestones: [
      { title: "Topic + abstract", offset: 7, completed: false },
      { title: "Co-speaker confirmed", offset: 21, completed: false },
      { title: "Slide deck draft", offset: 50, completed: false },
      { title: "Marketing push", offset: 60, completed: false },
      { title: "Live broadcast", offset: 75, completed: false },
    ],
  },
  {
    title: "March Newsletter — Already Sent",
    kind: "newsletter",
    category: "marketing",
    goal: "brand",
    expectedImpact: "Sent to 2,400 subscribers, 32% open rate",
    ownerId: "s3",
    description: "March 2026 client newsletter.",
    startDaysAgo: 50,
    dueDaysFromNow: -25,
    status: "launched",
    milestones: [
      { title: "Article topics", offset: -45, completed: true },
      { title: "Drafts", offset: -38, completed: true },
      { title: "Edit + design", offset: -32, completed: true },
      { title: "Send", offset: -25, completed: true },
    ],
  },
  // ===== HIRING =====
  {
    title: "Hire Real Estate Senior Associate",
    kind: "hire",
    category: "hiring",
    goal: "capacity",
    expectedImpact: "+25 cases/yr capacity in real estate (~$300K rev)",
    ownerId: "s1",
    description: "Senior associate, 5-8 yrs experience, FL real estate litigation. Need to absorb the growing RE caseload — currently David is at 130% utilization.",
    startDaysAgo: 22,
    dueDaysFromNow: 30,
    status: "in_progress",
    milestones: [
      { title: "Job description finalized", offset: -20, completed: true },
      { title: "Recruiter engaged", offset: -15, completed: true },
      { title: "First-round interviews", offset: -3, completed: true },
      { title: "Final-round interviews", offset: 7, completed: false },
      { title: "Offer extended", offset: 14, completed: false },
      { title: "Start date", offset: 30, completed: false },
    ],
    notes: "Two strong candidates from second round. David identified the bottleneck in last week's partner meeting.",
  },
  {
    title: "Hire Litigation Paralegal (3rd seat)",
    kind: "hire",
    category: "hiring",
    goal: "capacity",
    expectedImpact: "Frees ~12 lawyer hours/week from admin",
    ownerId: "s1",
    description: "Add a 5th paralegal. Rachel and team are at 110% on discovery work — lawyers handling tasks that should be paralegal-level.",
    startDaysAgo: 45,
    dueDaysFromNow: -5,
    status: "in_progress",
    milestones: [
      { title: "Headcount approved by Margaret", offset: -42, completed: true },
      { title: "JD posted", offset: -35, completed: true },
      { title: "Resume screening", offset: -28, completed: true },
      { title: "Phone screens", offset: -14, completed: true },
      { title: "In-person interviews", offset: -5, completed: false },
      { title: "Offer + start", offset: 14, completed: false },
    ],
    notes: "Behind schedule — in-person interviews keep getting pushed by partner conflicts.",
  },
  // ===== BUSINESS DEVELOPMENT / PARTNERSHIPS =====
  {
    title: "PI Firm Referral Network — Top 5 Targets",
    kind: "partnership",
    category: "business_dev",
    goal: "growth",
    expectedImpact: "~10 referrals/yr (~$200K rev)",
    ownerId: "s1",
    description: "Build formal referral relationships with 5 PI firms that frequently see commercial litigation conflicts.",
    startDaysAgo: 70,
    dueDaysFromNow: 60,
    status: "in_progress",
    milestones: [
      { title: "Identify 5 target firms", offset: -65, completed: true },
      { title: "Initial coffee meetings (5)", offset: -30, completed: true },
      { title: "Reciprocal referral agreements drafted", offset: 7, completed: false },
      { title: "3 of 5 agreements signed", offset: 30, completed: false },
      { title: "All 5 active in pipeline", offset: 60, completed: false },
    ],
    notes: "Two firms already sent first referrals — conversion better than expected.",
  },
  {
    title: "Bankruptcy Trustees — Quarterly CLE Sponsorship",
    kind: "partnership",
    category: "business_dev",
    goal: "growth",
    expectedImpact: "Sustained trustee mindshare",
    ownerId: "s2",
    description: "Sponsor and present at quarterly Trustee Association CLE for FY26.",
    startDaysAgo: 14,
    dueDaysFromNow: 90,
    status: "in_progress",
    milestones: [
      { title: "Sponsorship contract signed", offset: -10, completed: true },
      { title: "Q2 CLE presentation", offset: 25, completed: false },
      { title: "Q3 CLE presentation", offset: 90, completed: false },
    ],
  },
  // ===== OPERATIONS =====
  {
    title: "Implement Lex Practice OS firmwide",
    kind: "system",
    category: "operations",
    goal: "capacity",
    expectedImpact: "Eliminate dropped balls; ~5 hrs/week saved per partner",
    ownerId: "s1",
    description: "Roll out Lex — deadlines, milestones, comms watchdog, client portal — firmwide. Replace patchwork of spreadsheets and Outlook tasks.",
    startDaysAgo: 5,
    dueDaysFromNow: 60,
    status: "in_progress",
    milestones: [
      { title: "Pilot with Margaret + Rachel", offset: -3, completed: true },
      { title: "Onboard all partners", offset: 14, completed: false },
      { title: "Onboard all associates + paralegals", offset: 28, completed: false },
      { title: "Client portal launched to top 10 clients", offset: 45, completed: false },
      { title: "Sunset legacy spreadsheets", offset: 60, completed: false },
    ],
    notes: "This is the project. Margaret is owner.",
  },
  {
    title: "Conflict-check system upgrade",
    kind: "system",
    category: "operations",
    goal: "risk",
    expectedImpact: "Reduces malpractice exposure; faster intake",
    ownerId: "s1",
    description: "Replace manual Excel-based conflict checks with automated tool integrated with intake.",
    startDaysAgo: 30,
    dueDaysFromNow: 45,
    status: "in_progress",
    milestones: [
      { title: "Vendor evaluation (3 demos)", offset: -25, completed: true },
      { title: "Vendor selected", offset: -14, completed: true },
      { title: "Data migration", offset: 14, completed: false },
      { title: "Staff training", offset: 28, completed: false },
      { title: "Go live", offset: 45, completed: false },
    ],
  },
  // ===== COMPLIANCE =====
  {
    title: "SOC 2 Type II certification",
    kind: "certification",
    category: "compliance",
    goal: "brand",
    expectedImpact: "Required by 3 enterprise prospects ($400K+ pipeline)",
    ownerId: "s1",
    description: "Achieve SOC 2 Type II to qualify for enterprise client engagements.",
    startDaysAgo: 90,
    dueDaysFromNow: 120,
    status: "in_progress",
    milestones: [
      { title: "Auditor selected", offset: -85, completed: true },
      { title: "Gap assessment complete", offset: -60, completed: true },
      { title: "Remediation plan", offset: -40, completed: true },
      { title: "Type I attestation", offset: 14, completed: false },
      { title: "6-month observation period start", offset: 21, completed: false },
      { title: "Type II report issued", offset: 120, completed: false },
    ],
  },
  // ===== NEW PRACTICE AREA =====
  {
    title: "Launch Construction Litigation Practice",
    kind: "practice_launch",
    category: "practice_area",
    goal: "growth",
    expectedImpact: "$500K-$800K revenue in year 1",
    ownerId: "s3",
    description: "Stand up dedicated construction-litigation sub-practice with senior associate lead, marketing presence, and BD outreach.",
    startDaysAgo: 25,
    dueDaysFromNow: 150,
    status: "in_progress",
    milestones: [
      { title: "Practice strategy memo approved", offset: -22, completed: true },
      { title: "Senior associate recruiting (see hire project)", offset: 30, completed: false },
      { title: "Construction industry whitepaper published", offset: 45, completed: false },
      { title: "5 client meetings booked", offset: 90, completed: false },
      { title: "Q3 webinar (see marketing project)", offset: 75, completed: false },
      { title: "First 3 retainers signed", offset: 150, completed: false },
    ],
  },
];

let mpCounter = 1;
let mmCounter = 1;
export const MARKETING_PROJECTS: import("@shared/schema").MarketingProject[] = MARKETING_TEMPLATES.map((t) => ({
  id: `mp${mpCounter++}`,
  title: t.title,
  kind: t.kind,
  category: t.category,
  goal: t.goal,
  expectedImpact: t.expectedImpact,
  ownerId: t.ownerId,
  description: t.description,
  startDate: iso(addDays(TODAY, -t.startDaysAgo)),
  dueDate: iso(addDays(TODAY, t.dueDaysFromNow)),
  status: t.status,
  notes: t.notes,
  milestones: t.milestones.map((m) => ({
    id: `mm${mmCounter++}`,
    title: m.title,
    dueDate: iso(addDays(TODAY, m.offset)),
    completed: m.completed,
    completedAt: m.completed ? iso(addDays(TODAY, m.offset - 1)) : undefined,
  })),
}));
