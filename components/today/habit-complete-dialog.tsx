"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Habit, HabitCompletion } from "@/types";
import { X } from "lucide-react";

interface HabitCompleteDialogProps {
  habit: Habit & { completion: HabitCompletion | null };
  currentCompletion: HabitCompletion | null;
  onComplete: (habit: any, actualValue: number, status: HabitCompletion["status"]) => void;
  onClose: () => void;
}

export default function HabitCompleteDialog({
  habit,
  currentCompletion,
  onComplete,
  onClose,
}: HabitCompleteDialogProps) {
  const target = habit.targetValue ? parseFloat(habit.targetValue) : null;
  const minimum = habit.minimumValue ? parseFloat(habit.minimumValue) : null;
  const existing = currentCompletion?.actualValue ? parseFloat(currentCompletion.actualValue) : null;
  const [value, setValue] = useState<string>(existing?.toString() ?? "");
  const unit = habit.unit ?? "";

  function computeStatus(val: number): HabitCompletion["status"] {
    if (habit.direction === "avoid") {
      return val === 0 ? "completed" : val > 0 ? "missed" : "completed";
    }
    if (!target) return "completed";
    if (val >= target) return "completed";
    if (minimum !== null && val >= minimum) return "minimum";
    if (val > 0) return "partial";
    return "missed";
  }

  function handleSubmit() {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    const status = computeStatus(num);
    onComplete(habit, num, status);
  }

  function handleQuickComplete() {
    if (!target) return;
    onComplete(habit, target, "completed");
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.7)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Dialog */}
      <motion.div
        className="fixed left-4 right-4 bottom-0 z-50 rounded-t-lg px-5 py-6 space-y-5 md:left-1/2 md:-translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-96 md:rounded-lg"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 400 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {habit.title}
            </h3>
            {target && (
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Target: {target} {unit}
                {minimum && ` · Minimum: ${minimum} ${unit}`}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Input */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            {habit.direction === "avoid" ? "Time spent (0 = none)" : `How much? (${unit})`}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm text-data"
              placeholder={`0`}
              min="0"
              step={habit.behavior === "duration" ? "5" : "1"}
              autoFocus
            />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>{unit}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {target && (
            <button
              onClick={handleQuickComplete}
              className="btn btn-ghost flex-1 text-xs"
              style={{ color: "var(--success)", borderColor: "var(--success)" }}
            >
              ✓ Full target ({target} {unit})
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!value || isNaN(parseFloat(value))}
            className="btn btn-primary flex-1 text-xs"
          >
            Save
          </button>
        </div>
      </motion.div>
    </>
  );
}
