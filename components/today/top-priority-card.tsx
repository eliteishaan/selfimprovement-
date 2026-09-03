"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import type { Task } from "@/types";
import { updateTask } from "@/app/actions/tasks";
import { CheckSquare } from "lucide-react";

interface TopPriorityCardProps {
  task: Task;
  userId: string;
}

export default function TopPriorityCard({ task, userId }: TopPriorityCardProps) {
  const [done, setDone] = useState(task.status === "completed");
  const [isPending, startTransition] = useTransition();

  function handleComplete() {
    if (done) return;
    setDone(true); // optimistic
    startTransition(async () => {
      await updateTask(task.id, { status: "completed" });
    });
  }

  return (
    <div
      className="card px-4 py-4 flex items-start gap-3"
      style={{ borderColor: done ? "var(--border)" : "var(--border-strong)" }}
    >
      <button
        onClick={handleComplete}
        disabled={done || isPending}
        className="mt-0.5 flex-shrink-0"
      >
        <motion.div
          className="w-4 h-4 border flex items-center justify-center"
          style={{
            borderColor: done ? "var(--success)" : "var(--border-strong)",
            borderRadius: "2px",
            background: done ? "var(--success)" : "transparent",
          }}
          animate={done ? { scale: [1, 0.9, 1] } : {}}
          transition={{ duration: 0.12 }}
        >
          {done && (
            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
              <path d="M1 3L3 5L7 1" stroke="#0A0A0B" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </motion.div>
      </button>

      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium"
          style={{
            color: done ? "var(--text-muted)" : "var(--text-primary)",
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {task.title}
        </p>
        {task.description && !done && (
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
            {task.description}
          </p>
        )}
      </div>

      {task.priority === "critical" && !done && (
        <span className="text-[9px] font-semibold tracking-widest flex-shrink-0" style={{ color: "var(--danger)" }}>
          CRITICAL
        </span>
      )}
    </div>
  );
}
