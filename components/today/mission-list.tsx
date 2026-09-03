"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Habit, HabitCompletion, HabitSchedule } from "@/types";
import { recordCompletion } from "@/app/actions/habits";
import { cn } from "@/lib/utils/cn";
import HabitCompleteDialog from "./habit-complete-dialog";

interface EnrichedHabit extends Habit {
  schedule: HabitSchedule | null;
  completion: HabitCompletion | null;
}

interface MissionListProps {
  habits: EnrichedHabit[];
  date: string;
  userId: string;
  readOnly?: boolean;
}

function playPopSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    // Ignore
  }
}

export default function MissionList({ habits, date, userId, readOnly = false }: MissionListProps) {
  const [completions, setCompletions] = useState<Record<string, HabitCompletion | null>>(
    Object.fromEntries(habits.map((h) => [h.id, h.completion]))
  );
  const [dialogHabit, setDialogHabit] = useState<EnrichedHabit | null>(null);
  const [pending, startTransition] = useTransition();

  if (habits.length === 0) {
    return (
      <p className="text-sm py-4" style={{ color: "var(--text-muted)" }}>
        No habits configured.{" "}
        <a href="/habits" style={{ color: "var(--accent)" }}>
          Add habits →
        </a>
      </p>
    );
  }

  async function handleBooleanToggle(habit: EnrichedHabit) {
    const current = completions[habit.id];
    const newStatus = current?.status === "completed" ? "missed" : "completed";
    
    if (newStatus === "completed") {
      playPopSound();
    }
    
    // Optimistic update
    setCompletions((prev) => ({
      ...prev,
      [habit.id]: { ...current, status: newStatus, date, habitId: habit.id, userId } as HabitCompletion,
    }));
    startTransition(async () => {
      await recordCompletion({ habitId: habit.id, date, status: newStatus });
    });
  }

  function handleMeasurableClick(habit: EnrichedHabit) {
    setDialogHabit(habit);
  }

  async function handleMeasurableComplete(
    habit: EnrichedHabit,
    actualValue: number,
    status: HabitCompletion["status"]
  ) {
    if (status === "completed") {
      playPopSound();
    }
    
    setCompletions((prev) => ({
      ...prev,
      [habit.id]: {
        ...prev[habit.id],
        status,
        actualValue: String(actualValue),
        date,
        habitId: habit.id,
        userId,
      } as HabitCompletion,
    }));
    setDialogHabit(null);
    startTransition(async () => {
      await recordCompletion({
        habitId: habit.id,
        date,
        status,
        actualValue: String(actualValue),
      });
    });
  }

  // Sort: non-negotiables first, then by completion state
  const sorted = [...habits].sort((a, b) => {
    if (a.isNonNegotiable && !b.isNonNegotiable) return -1;
    if (!a.isNonNegotiable && b.isNonNegotiable) return 1;
    return 0;
  });

  return (
    <>
      <div className="space-y-0.5">
        {sorted.map((habit) => (
          <HabitRow
            key={habit.id}
            habit={habit}
            completion={completions[habit.id] ?? null}
            onBooleanToggle={() => !readOnly && handleBooleanToggle(habit)}
            onMeasurableClick={() => !readOnly && handleMeasurableClick(habit)}
            readOnly={readOnly}
          />
        ))}
      </div>

      <AnimatePresence>
        {dialogHabit && (
          <HabitCompleteDialog
            habit={dialogHabit}
            currentCompletion={completions[dialogHabit.id] ?? null}
            onComplete={handleMeasurableComplete}
            onClose={() => setDialogHabit(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Individual habit row ─────────────────────────────────────────────────────

function HabitRow({
  habit,
  completion,
  onBooleanToggle,
  onMeasurableClick,
  readOnly = false,
}: {
  habit: EnrichedHabit;
  completion: HabitCompletion | null;
  onBooleanToggle: () => void;
  onMeasurableClick: () => void;
  readOnly?: boolean;
}) {
  const status = completion?.status ?? null;
  const isMeasurable = habit.behavior === "quantity" || habit.behavior === "duration";
  const isAvoid = habit.direction === "avoid";

  function getStatusColor() {
    if (!status) return "var(--text-secondary)";
    if (status === "completed") return "var(--text-muted)";
    if (status === "partial" || status === "minimum") return "var(--warning)";
    if (status === "missed") return "var(--danger)";
    if (status === "paused" || status === "excused") return "var(--text-disabled)";
    return "var(--text-secondary)";
  }

  function getValueDisplay() {
    if (!isMeasurable) return null;
    const actual = completion?.actualValue ? parseFloat(completion.actualValue) : null;
    const target = habit.targetValue ? parseFloat(habit.targetValue) : null;
    const unit = habit.unit ?? "";

    if (isAvoid) {
      if (actual === null) return `0 ${unit}`;
      return `${actual} ${unit}`;
    }

    if (actual !== null && target) {
      return (
        <span>
          <span style={{ color: status === "completed" ? "var(--success)" : "var(--text-primary)" }}>
            {actual}
          </span>
          <span style={{ color: "var(--text-muted)" }}> / {target} {unit}</span>
        </span>
      );
    }
    if (target) return <span style={{ color: "var(--text-muted)" }}>— / {target} {unit}</span>;
    return null;
  }

  const onClick = readOnly ? undefined : (isMeasurable ? onMeasurableClick : onBooleanToggle);

  return (
    <motion.button
      onClick={onClick}
      disabled={readOnly}
      className={cn(
        "w-full flex items-center gap-3 px-2 py-2.5 text-left rounded-md transition-colors",
        readOnly ? "cursor-default" : "interactive-row"
      )}
      whileTap={readOnly ? {} : { scale: 0.98 }}
      transition={{ duration: 0.08 }}
    >
      {/* Checkbox / state indicator */}
      <CheckboxIndicator status={status} isNonNegotiable={habit.isNonNegotiable} readOnly={readOnly} />

      {/* Title */}
      <motion.span
        className="flex-1 text-sm font-medium relative"
        animate={{
          color: getStatusColor(),
          opacity: status === "completed" ? 0.6 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        {habit.title}
        {habit.isNonNegotiable && (
          <span className="ml-1.5 text-[9px] tracking-widest font-semibold" style={{ color: "var(--accent-dim)" }}>
            ★
          </span>
        )}
        <AnimatePresence>
          {status === "completed" && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              exit={{ width: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute top-1/2 left-0 h-[1.5px] bg-current origin-left -translate-y-1/2"
            />
          )}
        </AnimatePresence>
      </motion.span>

      {/* Value display for measurable habits */}
      {isMeasurable && (
        <span className="text-xs text-data flex-shrink-0">
          {getValueDisplay()}
        </span>
      )}

      {/* Status badge */}
      {status && status !== "completed" && (
        <StatusBadge status={status} />
      )}
    </motion.button>
  );
}

function CheckboxIndicator({
  status,
  isNonNegotiable,
  readOnly = false,
}: {
  status: string | null;
  isNonNegotiable: boolean;
  readOnly?: boolean;
}) {
  const isChecked = status === "completed";
  const isPartial = status === "partial" || status === "minimum";
  const isPaused = status === "paused" || status === "excused";

  return (
    <motion.div
      className={cn(
        "w-5 h-5 flex-shrink-0 border flex items-center justify-center transition-colors",
        readOnly && !isChecked && "opacity-50"
      )}
      style={{
        borderColor: isChecked
          ? "var(--success)"
          : isPartial
          ? "var(--warning)"
          : isPaused
          ? "var(--border)"
          : isNonNegotiable
          ? "var(--accent-dim)"
          : "var(--border-strong)",
        borderRadius: "4px",
        background: isChecked ? "var(--success)" : isPartial ? "var(--warning-subtle)" : "transparent",
      }}
      initial={false}
      animate={isChecked ? { scale: [0.8, 1.2, 1] } : { scale: 1 }}
      transition={{ duration: 0.25, type: "spring", stiffness: 400, damping: 15 }}
    >
      {readOnly && !isChecked && (
        <svg width="8" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      )}
      {isChecked && (
        <motion.svg 
          width="10" height="8" viewBox="0 0 10 8" fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          <path d="M1 4L3.5 6.5L9 1" stroke="#0A0A0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      )}
      {isPartial && (
        <div className="w-2.5 h-0.5 rounded" style={{ background: "var(--warning)" }} />
      )}
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const MAP: Record<string, { label: string; color: string }> = {
    partial:   { label: "PARTIAL",  color: "var(--warning)" },
    minimum:   { label: "MIN",      color: "var(--warning)" },
    missed:    { label: "MISSED",   color: "var(--danger)" },
    skipped:   { label: "SKIPPED",  color: "var(--text-muted)" },
    excused:   { label: "EXCUSED",  color: "var(--text-muted)" },
    paused:    { label: "PAUSED",   color: "var(--text-disabled)" },
    emergency: { label: "EMERG.",   color: "var(--warning)" },
  };
  const cfg = MAP[status];
  if (!cfg) return null;
  return (
    <span
      className="text-[9px] font-semibold tracking-widest flex-shrink-0"
      style={{ color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}
