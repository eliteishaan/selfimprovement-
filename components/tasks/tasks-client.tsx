"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { createTask, updateTask, getTasksByStatus } from "@/app/actions/tasks";
import { Plus, Inbox, Calendar, CheckSquare, ArrowRight } from "lucide-react";
import type { Task, TaskStatus, TaskPriority } from "@/types";

interface TasksClientProps {
  initial: {
    inbox: Task[];
    today: Task[];
    completed: Task[];
  };
  challengeId?: string | null;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: "var(--danger)",
  high:     "var(--warning)",
  normal:   "var(--text-muted)",
  low:      "var(--text-disabled)",
};

export default function TasksClient({ initial, challengeId }: TasksClientProps) {
  const [activeTab, setActiveTab] = useState<"inbox" | "today" | "completed">("today");
  const [inbox, setInbox] = useState<Task[]>(initial.inbox);
  const [todayTasks, setTodayTasks] = useState<Task[]>(initial.today);
  const [completed, setCompleted] = useState<Task[]>(initial.completed);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("normal");
  const [isPending, startTransition] = useTransition();

  function currentList() {
    if (activeTab === "inbox") return inbox;
    if (activeTab === "today") return todayTasks;
    return completed;
  }

  function handleAdd() {
    if (!newTitle.trim()) return;
    const targetStatus: TaskStatus = activeTab === "completed" ? "inbox" : activeTab;
    startTransition(async () => {
      const result = await createTask({
        title: newTitle.trim(),
        status: targetStatus,
        priority: newPriority,
        challengeId: challengeId ?? null,
      });
      if ("task" in result && result.task) {
        const t = result.task as Task;
        if (t.status === "inbox") setInbox((prev) => [t, ...prev]);
        else if (t.status === "today") setTodayTasks((prev) => [t, ...prev]);
      }
    });
    setNewTitle("");
    setShowAdd(false);
  }

  function handleStatusChange(task: Task, newStatus: TaskStatus) {
    startTransition(async () => {
      await updateTask(task.id, { status: newStatus });
    });
    // Optimistic: move between lists
    const remove = (list: Task[]) => list.filter((t) => t.id !== task.id);
    const updated = { ...task, status: newStatus };
    setInbox((p) => {
      const base = remove(p);
      return newStatus === "inbox" ? [updated, ...base] : base;
    });
    setTodayTasks((p) => {
      const base = remove(p);
      return newStatus === "today" || newStatus === "in_progress" ? [updated, ...base] : base;
    });
    setCompleted((p) => {
      const base = remove(p);
      return newStatus === "completed" ? [updated, ...base] : base;
    });
  }

  const TABS = [
    { key: "today" as const, label: "Today", icon: CheckSquare },
    { key: "inbox" as const, label: "Inbox", icon: Inbox },
    { key: "completed" as const, label: "Done", icon: Calendar },
  ];

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-px" style={{ background: "var(--border)" }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            style={{
              background: activeTab === key ? "var(--bg-elevated)" : "var(--bg-surface)",
              color: activeTab === key ? "var(--text-primary)" : "var(--text-muted)",
            }}
          >
            <Icon size={12} />
            {label}
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: "var(--bg-base)",
                color: "var(--text-muted)",
              }}
            >
              {key === "inbox" ? inbox.length : key === "today" ? todayTasks.length : completed.length}
            </span>
          </button>
        ))}
      </div>

      {/* Add task */}
      {showAdd ? (
        <div className="card px-4 py-4 space-y-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm"
            placeholder="Task title..."
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <div className="flex items-center gap-2">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
              className="text-xs px-2 py-1.5 flex-1"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <button onClick={() => setShowAdd(false)} className="btn btn-ghost text-xs">Cancel</button>
            <button onClick={handleAdd} disabled={!newTitle.trim()} className="btn btn-primary text-xs">
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 text-xs w-full px-1"
          style={{ color: "var(--text-muted)" }}
        >
          <Plus size={12} style={{ color: "var(--accent)" }} />
          Add task to {activeTab}
        </button>
      )}

      {/* Task list */}
      <div className="space-y-0.5">
        {currentList().length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            {activeTab === "inbox" ? "Inbox is clear." : activeTab === "today" ? "Nothing for today." : "No completed tasks."}
          </p>
        ) : (
          currentList().map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              activeTab={activeTab}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  activeTab,
  onStatusChange,
}: {
  task: Task;
  activeTab: string;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-2 py-2.5 interactive-row group"
    >
      {/* Completion checkbox */}
      <button
        onClick={() => {
          if (task.status === "completed") {
            onStatusChange(task, "today");
          } else {
            onStatusChange(task, "completed");
          }
        }}
        className="flex-shrink-0"
      >
        <div
          className="w-4 h-4 border flex items-center justify-center"
          style={{
            borderColor: task.status === "completed" ? "var(--success)" : PRIORITY_COLORS[task.priority],
            borderRadius: "2px",
            background: task.status === "completed" ? "var(--success)" : "transparent",
          }}
        >
          {task.status === "completed" && (
            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
              <path d="M1 3L3 5L7 1" stroke="#0A0A0B" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </div>
      </button>

      {/* Title */}
      <span
        className="flex-1 text-sm"
        style={{
          color: task.status === "completed" ? "var(--text-muted)" : "var(--text-primary)",
          textDecoration: task.status === "completed" ? "line-through" : "none",
          opacity: task.status === "completed" ? 0.6 : 1,
        }}
      >
        {task.isTopPriority && (
          <span className="mr-1.5 text-[9px] font-semibold" style={{ color: "var(--accent)" }}>★</span>
        )}
        {task.title}
      </span>

      {/* Priority badge */}
      {task.priority !== "normal" && (
        <span
          className="text-[9px] font-semibold tracking-widest"
          style={{ color: PRIORITY_COLORS[task.priority] }}
        >
          {task.priority.toUpperCase()}
        </span>
      )}

      {/* Move to today */}
      {activeTab === "inbox" && (
        <button
          onClick={() => onStatusChange(task, "today")}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center gap-1"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowRight size={11} /> Today
        </button>
      )}
    </motion.div>
  );
}
