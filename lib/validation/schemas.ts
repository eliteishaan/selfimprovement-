import { z } from "zod";

// ─── Profile ─────────────────────────────────────────────────────────────────

export const ProfileSchema = z.object({
  displayName: z.string().min(1).max(100),
  timezone: z.string().min(1),
  avatarUrl: z.string().url().nullable().optional(),
});

// ─── Challenge ────────────────────────────────────────────────────────────────

export const QuickCreateChallengeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  objective: z.string().min(1, "Objective is required").max(300),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  commitments: z
    .array(z.string().min(1))
    .min(1, "At least one commitment is required")
    .max(10),
});

export const UpdateChallengeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  theme: z.string().max(100).nullable().optional(),
  objective: z.string().min(1).max(300).optional(),
  why: z.string().max(2000).nullable().optional(),
  successCriteria: z.string().max(2000).nullable().optional(),
  allowedRecovery: z.string().max(1000).nullable().optional(),
  status: z.enum(["draft", "active", "paused", "complete", "archived"]).optional(),
  scoreWeights: z
    .object({
      habits: z.number().min(0).max(1),
      focus: z.number().min(0).max(1),
      tasks: z.number().min(0).max(1),
      reading: z.number().min(0).max(1),
    })
    .optional(),
});

// ─── Challenge Phase ──────────────────────────────────────────────────────────

export const CreatePhaseSchema = z.object({
  challengeId: z.string().uuid(),
  name: z.string().min(1).max(100),
  objective: z.string().max(500).nullable().optional(),
  durationDays: z.number().int().min(1),
  orderIndex: z.number().int().min(0),
});

// ─── Challenge Rule ───────────────────────────────────────────────────────────

export const CreateRuleSchema = z.object({
  challengeId: z.string().uuid(),
  direction: z.enum(["will", "will_not"]),
  ruleText: z.string().min(1).max(500),
});

// ─── Goal ─────────────────────────────────────────────────────────────────────

export const CreateGoalSchema = z.object({
  challengeId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  numericTarget: z.string().nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const UpdateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  currentValue: z.string().optional(),
  numericTarget: z.string().nullable().optional(),
  status: z.enum(["active", "completed", "cancelled", "archived"]).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

// ─── Milestone ────────────────────────────────────────────────────────────────

export const CreateMilestoneSchema = z.object({
  goalId: z.string().uuid(),
  challengeId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  orderIndex: z.number().int().min(0).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

// ─── Habit ────────────────────────────────────────────────────────────────────

export const CreateHabitSchema = z.object({
  challengeId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  behavior: z.enum(["boolean", "quantity", "duration"]),
  direction: z.enum(["build", "avoid"]),
  targetValue: z.string().nullable().optional(),
  minimumValue: z.string().nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  isNonNegotiable: z.boolean().optional(),
  color: z.string().nullable().optional(),
  // Schedule
  frequencyType: z.enum(["daily", "specific_days", "x_per_week", "weekly_quantity"]),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).nullable().optional(),
  timesPerWeek: z.number().int().min(1).max(7).nullable().optional(),
  weeklyQuantity: z.coerce.number().int().positive().nullable().optional(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const UpdateHabitSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  targetValue: z.string().nullable().optional(),
  minimumValue: z.string().nullable().optional(),
  isNonNegotiable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  color: z.string().nullable().optional(),
});

// ─── Habit Completion ─────────────────────────────────────────────────────────

export const RecordCompletionSchema = z.object({
  habitId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum([
    "completed",
    "partial",
    "minimum",
    "missed",
    "skipped",
    "excused",
    "paused",
    "emergency",
  ]),
  actualValue: z.string().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

// ─── Habit Exception ──────────────────────────────────────────────────────────

export const CreateExceptionSchema = z.object({
  habitId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.enum(["sick", "travel", "emergency", "planned_rest"]),
  note: z.string().max(500).nullable().optional(),
});

// ─── Task ─────────────────────────────────────────────────────────────────────

export const CreateTaskSchema = z.object({
  challengeId: z.string().uuid().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
  milestoneId: z.string().uuid().nullable().optional(),
  phaseId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).nullable().optional(),
  status: z
    .enum(["inbox", "today", "planned", "in_progress", "completed", "migrated", "dropped"])
    .optional(),
  priority: z.enum(["critical", "high", "normal", "low"]).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z
    .enum(["inbox", "today", "planned", "in_progress", "completed", "migrated", "dropped"])
    .optional(),
  priority: z.enum(["critical", "high", "normal", "low"]).optional(),
  isTopPriority: z.boolean().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

// ─── Focus Session ────────────────────────────────────────────────────────────

export const StartFocusSessionSchema = z.object({
  challengeId: z.string().uuid().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
  taskId: z.string().uuid().nullable().optional(),
  subject: z.string().max(200).nullable().optional(),
  sessionType: z.enum(["pomodoro", "stopwatch", "flow"]),
});

export const EndFocusSessionSchema = z.object({
  sessionId: z.string().uuid(),
  note: z.string().max(500).nullable().optional(),
});

// ─── Book ─────────────────────────────────────────────────────────────────────

export const CreateBookSchema = z.object({
  challengeId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(300),
  author: z.string().max(200).nullable().optional(),
  totalPages: z.number().int().positive().nullable().optional(),
  status: z.enum(["to_read", "reading", "completed", "dropped"]).optional(),
});

export const AddReadingSessionSchema = z.object({
  bookId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pagesRead: z.number().int().min(1),
  durationMinutes: z.number().int().positive().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

// ─── Daily Note ───────────────────────────────────────────────────────────────

export const UpsertDailyNoteSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  morningNote: z.string().max(1000).nullable().optional(),
  eveningNote: z.string().max(1000).nullable().optional(),
  whatWentWell: z.string().max(1000).nullable().optional(),
  whatWentWrong: z.string().max(1000).nullable().optional(),
  completedHonestly: z.boolean().nullable().optional(),
  tomorrowPriority: z.string().max(500).nullable().optional(),
});

// ─── Weekly Plan ──────────────────────────────────────────────────────────────

export const UpsertWeeklyPlanSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  challengeId: z.string().uuid().nullable().optional(),
  topPriorities: z.array(z.string().max(200)).max(5).optional(),
  focusTargetHours: z.number().positive().nullable().optional(),
  workoutTarget: z.number().int().positive().nullable().optional(),
  readingTarget: z.number().int().positive().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// ─── Weekly Review ────────────────────────────────────────────────────────────

export const SaveWeeklyReviewSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  challengeId: z.string().uuid().nullable().optional(),
  whatWentWell: z.string().max(2000).nullable().optional(),
  whatWentWrong: z.string().max(2000).nullable().optional(),
  why: z.string().max(2000).nullable().optional(),
  whatChanges: z.string().max(2000).nullable().optional(),
  nextWeekPriority: z.string().max(500).nullable().optional(),
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const SignUpSchema = z.object({
  displayName: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  timezone: z.string().min(1, "Timezone is required"),
});

export const SignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
