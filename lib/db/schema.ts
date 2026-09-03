import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  date,
  unique,
} from "drizzle-orm/pg-core";

// ─── UTILS ───────────────────────────────────────────────────────────────────
const tstz = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });
const id = uuid("id").primaryKey().defaultRandom();
const userId = uuid("user_id").notNull();
const challengeId = uuid("challenge_id");
const defaultNow = (name: string) => tstz(name).defaultNow().notNull();

// ─── PROFILES (Extended from auth.users) ──────────────────────────────────────
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // matches auth.users.id
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  timezone: text("timezone").default("UTC").notNull(),
  createdAt: defaultNow("created_at"),
  updatedAt: defaultNow("updated_at"),
});

// ─── CHALLENGES ───────────────────────────────────────────────────────────────
export const challenges = pgTable("challenges", {
  id,
  userId,
  name: text("name").notNull(),
  objective: text("objective").notNull(),
  status: text("status", { enum: ["active", "paused", "draft", "complete", "archived"] })
    .default("active")
    .notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  
  // Customization JSON
  scoreWeights: jsonb("score_weights").$type<{
    habits: number;
    focus: number;
    tasks: number;
    reading: number;
  }>().default({
    habits: 60,
    focus: 20,
    tasks: 10,
    reading: 10
  }).notNull(),
  
  createdAt: defaultNow("created_at"),
  updatedAt: defaultNow("updated_at"),
});

// ─── CHALLENGE PHASES ────────────────────────────────────────────────────────
export const challengePhases = pgTable("challenge_phases", {
  id,
  challengeId: challengeId.notNull(),
  name: text("name").notNull(),
  orderIndex: integer("order_index").notNull(),
  durationDays: integer("duration_days").notNull(),
  objective: text("objective"),
  createdAt: defaultNow("created_at"),
});

// ─── GOALS ────────────────────────────────────────────────────────────────────
export const goals = pgTable("goals", {
  id,
  userId,
  challengeId: challengeId.notNull(),
  title: text("title").notNull(),
  targetValue: text("target_value"), // String to support multiple units
  unit: text("unit"),
  currentValue: text("current_value"),
  status: text("status", { enum: ["active", "achieved", "abandoned"] })
    .default("active")
    .notNull(),
  deadline: date("deadline"),
  createdAt: defaultNow("created_at"),
  updatedAt: defaultNow("updated_at"),
});

// ─── MILESTONES ───────────────────────────────────────────────────────────────
export const milestones = pgTable("milestones", {
  id,
  goalId: uuid("goal_id").notNull(),
  title: text("title").notNull(),
  targetValue: text("target_value"),
  isCompleted: boolean("is_completed").default(false).notNull(),
  completedAt: tstz("completed_at"),
  createdAt: defaultNow("created_at"),
});

// ─── HABITS ───────────────────────────────────────────────────────────────────
export const habits = pgTable("habits", {
  id,
  userId,
  challengeId, // Optional, can outlive challenges
  title: text("title").notNull(),
  description: text("description"),
  behavior: text("behavior", { enum: ["boolean", "quantity", "duration"] })
    .default("boolean")
    .notNull(),
  direction: text("direction", { enum: ["build", "avoid"] })
    .default("build")
    .notNull(),
  targetValue: text("target_value"), // Target quantity/duration per occurrence
  minimumValue: text("minimum_value"), // Minimum acceptable threshold
  unit: text("unit"),
  isNonNegotiable: boolean("is_non_negotiable").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: defaultNow("created_at"),
  updatedAt: defaultNow("updated_at"),
});

// ─── HABIT SCHEDULES (Temporal Validity) ──────────────────────────────────────
export const habitSchedules = pgTable("habit_schedules", {
  id,
  habitId: uuid("habit_id").notNull(),
  frequencyType: text("frequency_type", { 
    enum: ["daily", "specific_days", "x_per_week", "weekly_quantity"] 
  }).notNull(),
  daysOfWeek: jsonb("days_of_week").$type<number[]>(), // [0,1,2,3,4,5,6]
  timesPerWeek: integer("times_per_week"),
  weeklyQuantity: integer("weekly_quantity"), // if behavior = quantity
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  createdAt: defaultNow("created_at"),
});

// ─── HABIT COMPLETIONS (The Execution Ledger) ─────────────────────────────────
export const habitCompletions = pgTable("habit_completions", {
  id,
  habitId: uuid("habit_id").notNull(),
  userId,
  date: date("date").notNull(), // Local date string YYYY-MM-DD
  status: text("status", { 
    enum: ["completed", "partial", "minimum", "missed", "skipped", "excused", "emergency"] 
  }).notNull(),
  actualValue: text("actual_value"), // To track over-achieving or partial hits
  note: text("note"),
  createdAt: defaultNow("created_at"),
  updatedAt: defaultNow("updated_at"),
}, (t) => ({
  unq_habit_date: unique("unq_habit_date").on(t.habitId, t.date)
}));

// ─── HABIT EXCEPTIONS (Pauses / Sickness) ─────────────────────────────────────
export const habitExceptions = pgTable("habit_exceptions", {
  id,
  habitId: uuid("habit_id").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason", { enum: ["sick", "travel", "emergency", "planned_rest"] }).notNull(),
  note: text("note"),
  createdAt: defaultNow("created_at"),
});

// ─── TASKS ────────────────────────────────────────────────────────────────────
export const tasks = pgTable("tasks", {
  id,
  userId,
  challengeId,
  goalId: uuid("goal_id"),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { 
    enum: ["inbox", "today", "planned", "in_progress", "completed", "migrated", "dropped"] 
  }).default("inbox").notNull(),
  priority: text("priority", { enum: ["critical", "high", "normal", "low"] })
    .default("normal")
    .notNull(),
  isTopPriority: boolean("is_top_priority").default(false).notNull(), // The ONE thing today
  dueDate: date("due_date"),
  completedAt: tstz("completed_at"),
  createdAt: defaultNow("created_at"),
  updatedAt: defaultNow("updated_at"),
});

// ─── FOCUS SESSIONS ───────────────────────────────────────────────────────────
export const focusSessions = pgTable("focus_sessions", {
  id,
  userId,
  challengeId,
  goalId: uuid("goal_id"),
  taskId: uuid("task_id"),
  subject: text("subject"),
  sessionType: text("session_type", { enum: ["pomodoro", "stopwatch", "flow"] }).notNull(),
  startedAt: tstz("started_at").notNull(),
  endedAt: tstz("ended_at"),
  durationSeconds: integer("duration_seconds"), // Populated on end
  note: text("note"),
  createdAt: defaultNow("created_at"),
});

// ─── BOOKS (Reading List) ─────────────────────────────────────────────────────
export const books = pgTable("books", {
  id,
  userId,
  challengeId,
  title: text("title").notNull(),
  author: text("author"),
  totalPages: integer("total_pages"),
  currentPage: integer("current_page").default(0).notNull(),
  status: text("status", { enum: ["to_read", "reading", "completed", "dropped"] })
    .default("to_read")
    .notNull(),
  startDate: date("start_date"),
  completionDate: date("completion_date"),
  createdAt: defaultNow("created_at"),
  updatedAt: defaultNow("updated_at"),
});

export const readingSessions = pgTable("reading_sessions", {
  id,
  bookId: uuid("book_id").notNull(),
  userId,
  date: date("date").notNull(),
  pagesRead: integer("pages_read").notNull(),
  durationSeconds: integer("duration_seconds"),
  note: text("note"),
  createdAt: defaultNow("created_at"),
});

// ─── DAILY REVIEWS (The Shutdown) ─────────────────────────────────────────────
export const dailyNotes = pgTable("daily_notes", {
  id,
  userId,
  date: date("date").notNull(),
  whatWentWell: text("what_went_well"),
  whatWentWrong: text("what_went_wrong"),
  tomorrowPriority: text("tomorrow_priority"),
  completedHonestly: boolean("completed_honestly"),
  createdAt: defaultNow("created_at"),
  updatedAt: defaultNow("updated_at"),
}, (t) => ({
  unq_daily_user_date: unique("unq_daily_user_date").on(t.userId, t.date)
}));

// ─── WEEKLY PLANS & REVIEWS ───────────────────────────────────────────────────
export const weeklyPlans = pgTable("weekly_plans", {
  id,
  userId,
  challengeId,
  weekStart: date("week_start").notNull(), // Monday date
  focusArea: text("focus_area"),
  commitments: text("commitments"), // Could be JSON array of short text
  createdAt: defaultNow("created_at"),
  updatedAt: defaultNow("updated_at"),
}, (t) => ({
  unq_wp_user_date: unique("unq_wp_user_date").on(t.userId, t.weekStart)
}));

export const weeklyReviews = pgTable("weekly_reviews", {
  id,
  userId,
  challengeId,
  weekStart: date("week_start").notNull(), // Match plan
  reflection: text("reflection"),
  adjustments: text("adjustments"),
  scoreSelfAssessment: integer("score_self_assessment"), // 1-100 manual feel
  createdAt: defaultNow("created_at"),
  updatedAt: defaultNow("updated_at"),
}, (t) => ({
  unq_wr_user_date: unique("unq_wr_user_date").on(t.userId, t.weekStart)
}));

// ─── HISTORICAL DATA SNAPSHOTS (Immutable Performance Records) ────────────────
export const dailyScores = pgTable("daily_scores", {
  id,
  userId,
  challengeId: challengeId.notNull(),
  date: date("date").notNull(),
  
  // The aggregated final score
  executionScore: integer("execution_score").notNull(),
  
  // Component breakdown for auditing
  habitsComponent: integer("habits_component").notNull(),
  focusComponent: integer("focus_component").notNull(),
  tasksComponent: integer("tasks_component").notNull(),
  readingComponent: integer("reading_component").notNull(),
  
  // Rules reference at time of calculation
  scoreWeightsSnapshot: jsonb("score_weights_snapshot").notNull(),
  
  calculatedAt: tstz("calculated_at").notNull(),
}, (t) => ({
  unq_ds_user_chal_date: unique("unq_ds_user_chal_date").on(t.userId, t.challengeId, t.date)
}));
