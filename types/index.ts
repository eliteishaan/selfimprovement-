/**
 * All TypeScript interfaces derived from the Drizzle schema.
 * These are the canonical types used throughout the application.
 */

// ─── Primitives ──────────────────────────────────────────────────────────────

export type HabitBehavior = "boolean" | "quantity" | "duration";
export type HabitDirection = "build" | "avoid";
export type HabitStatus =
  | "completed"
  | "partial"
  | "minimum"
  | "missed"
  | "skipped"
  | "excused"
  | "paused"
  | "emergency";
export type HabitFrequency =
  | "daily"
  | "specific_days"
  | "x_per_week"
  | "weekly_quantity";
export type HabitExceptionReason =
  | "sick"
  | "travel"
  | "emergency"
  | "planned_rest";

export type ChallengeStatus =
  | "draft"
  | "active"
  | "paused"
  | "complete"
  | "archived";

export type GoalStatus = "active" | "completed" | "cancelled" | "archived";
export type MilestoneStatus = "pending" | "in_progress" | "completed";
export type TaskStatus =
  | "inbox"
  | "today"
  | "planned"
  | "in_progress"
  | "completed"
  | "migrated"
  | "dropped";
export type TaskPriority = "critical" | "high" | "normal" | "low";
export type FocusSessionType = "pomodoro" | "stopwatch" | "flow";
export type BookStatus = "to_read" | "reading" | "completed" | "dropped";
export type RuleDirection = "will" | "will_not";

/**
 * Challenge Health — five statuses.
 * 'insufficient_data' is returned when fewer than 7 eligible days exist.
 */
export type HealthStatus =
  | "insufficient_data"
  | "strong"
  | "steady"
  | "at_risk"
  | "critical";

export interface ScoreWeights {
  habits: number;
  focus: number;
  tasks: number;
  reading: number;
}

// ─── Database row types ──────────────────────────────────────────────────────

export interface Profile {
  id: string;
  displayName: string | null;
  timezone: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Challenge {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  theme: string | null;
  objective: string;
  why: string | null;
  successCriteria: string | null;
  allowedRecovery: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: ChallengeStatus;
  scoreWeights: ScoreWeights;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengePhase {
  id: string;
  challengeId: string;
  name: string;
  objective: string | null;
  durationDays: number;
  orderIndex: number;
  createdAt: string;
}

export interface ChallengeRule {
  id: string;
  challengeId: string;
  direction: RuleDirection;
  ruleText: string;
  metricType: string | null;
  metricRef: string | null; // uuid, no FK in V1
  threshold: string | null;
  unit: string | null;
  createdAt: string;
}

export interface Goal {
  id: string;
  challengeId: string;
  userId: string;
  title: string;
  description: string | null;
  category: string | null;
  numericTarget: string | null;
  currentValue: string;
  unit: string | null;
  deadline: string | null;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  goalId: string;
  challengeId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  status: MilestoneStatus;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface Habit {
  id: string;
  userId: string;
  challengeId: string | null;
  title: string;
  behavior: HabitBehavior;
  direction: HabitDirection;
  targetValue: string | null;
  minimumValue: string | null;
  unit: string | null;
  isNonNegotiable: boolean;
  isActive: boolean;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HabitSchedule {
  id: string;
  habitId: string;
  frequencyType: HabitFrequency;
  daysOfWeek: number[] | null; // [0=Sun, 1=Mon, ..., 6=Sat]
  timesPerWeek: number | null;
  weeklyQuantity: string | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
  createdAt: string;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  userId: string;
  date: string; // YYYY-MM-DD in user's timezone
  status: HabitStatus;
  actualValue: string | null;
  note: string | null;
  createdAt: string;
}

export interface HabitException {
  id: string;
  habitId: string;
  startDate: string;
  endDate: string;
  reason: HabitExceptionReason;
  note: string | null;
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  challengeId: string | null;
  goalId: string | null;
  milestoneId: string | null;
  phaseId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  isTopPriority: boolean;
  dueDate: string | null;
  plannedDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FocusSession {
  id: string;
  userId: string;
  challengeId: string | null;
  goalId: string | null;
  taskId: string | null;
  subject: string | null;
  sessionType: FocusSessionType;
  startedAt: string; // timestamptz
  endedAt: string | null; // null = active session
  durationSeconds: number | null;
  note: string | null;
  createdAt: string;
}

export interface Book {
  id: string;
  userId: string;
  challengeId: string | null;
  title: string;
  author: string | null;
  totalPages: number | null;
  currentPage: number;
  status: BookStatus;
  startDate: string | null;
  completionDate: string | null;
  coverUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  userId: string;
  date: string;
  pagesRead: number;
  durationMinutes: number | null;
  note: string | null;
  createdAt: string;
}

export interface WeeklyPlan {
  id: string;
  userId: string;
  challengeId: string | null;
  weekStart: string;
  topPriorities: string[] | null;
  focusTargetHours: string | null;
  workoutTarget: number | null;
  readingTarget: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReview {
  id: string;
  userId: string;
  challengeId: string | null;
  weekStart: string;
  executionPct: string | null;
  focusHours: string | null;
  readingPages: number | null;
  tasksDone: number | null;
  tasksTotal: number | null;
  bestDay: string | null;
  worstDay: string | null;
  mostInconsistentHabitId: string | null;
  whatWentWell: string | null;
  whatWentWrong: string | null;
  why: string | null;
  whatChanges: string | null;
  nextWeekPriority: string | null;
  createdAt: string;
}

export interface DailyNote {
  id: string;
  userId: string;
  date: string;
  morningNote: string | null;
  eveningNote: string | null;
  whatWentWell: string | null;
  whatWentWrong: string | null;
  completedHonestly: boolean | null;
  tomorrowPriority: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyScore {
  id: string;
  userId: string;
  challengeId: string;
  date: string;
  executionScore: string; // 0-100
  habitsComponent: string | null;
  focusComponent: string | null;
  tasksComponent: string | null;
  readingComponent: string | null;
  scoreWeightsSnapshot: ScoreWeights; // immutable at write time
  calculatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  scheduledFor: string | null;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

// ─── Computed / UI types ─────────────────────────────────────────────────────

export interface ChallengeHealth {
  status: HealthStatus;
  message: string;
}

export interface ExecutionScoreResult {
  score: number;
  breakdown: {
    habits: number;
    focus: number;
    tasks: number;
    reading: number;
  };
  weightsUsed: ScoreWeights;
}

export interface WeeklyQuotaProgress {
  done: number;
  target: number;
}

export interface HabitStreaks {
  current: number;
  best: number;
}

export interface BookProgress {
  pct: number;
  pacePerDay: number;
  estimatedDaysLeft: number | null;
}

export interface WeeklyStats {
  weekStart: string;
  executionPct: number;
  focusHours: number;
  readingPages: number;
  tasksDone: number;
  tasksTotal: number;
  bestDay: string | null;
  worstDay: string | null;
  habitConsistency: Record<string, number>; // habitId → pct
}

export interface MonthlyStats {
  month: string; // YYYY-MM
  avgExecutionPct: number;
  totalFocusHours: number;
  totalReadingPages: number;
  totalTasksDone: number;
  avgDailyScore: number;
}

export interface FocusStats {
  totalSeconds: number;
  sessionCount: number;
  avgSessionSeconds: number;
  byDate: Record<string, number>; // date → seconds
}

// ─── Challenge context (used across Today, Control Center) ───────────────────

export interface ChallengeContext {
  challenge: Challenge;
  phases: ChallengePhase[];
  currentPhase: ChallengePhase | null;
  day: number;
  daysRemaining: number;
  timeProgress: number; // getChallengeTimeProgress — 0–100
  health: ChallengeHealth;
}

// ─── Today screen data ───────────────────────────────────────────────────────

export interface TodayData {
  challengeContext: ChallengeContext | null;
  habits: Array<Habit & { schedule: HabitSchedule | null; completion: HabitCompletion | null }>;
  tasks: Task[];
  topPriorityTask: Task | null;
  activeSession: FocusSession | null;
  todayFocusSeconds: number;
  todayReadingPages: number;
  executionScore: ExecutionScoreResult | null;
  outcomeProgress: number | null;
  dailyNote: DailyNote | null;
  date: string;
}
