"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createHabit } from "@/app/actions/habits";

function HabitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultChallengeId = searchParams.get("challengeId");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [behavior, setBehavior] = useState<"boolean" | "quantity" | "duration">("boolean");
  const [direction, setDirection] = useState<"build" | "avoid">("build");
  const [isNonNegotiable, setIsNonNegotiable] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "specific_days" | "x_per_week" | "weekly_quantity">("daily");
  
  // Specific targets
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");
  const [timesPerWeek, setTimesPerWeek] = useState("3");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setLoading(true);
    setError(null);

    const fd = new FormData();
    if (defaultChallengeId) fd.set("challengeId", defaultChallengeId);
    fd.set("title", title.trim());
    fd.set("behavior", behavior);
    fd.set("direction", direction);
    fd.set("isNonNegotiable", isNonNegotiable ? "on" : "");
    fd.set("frequencyType", frequency);
    fd.set("effectiveFrom", new Date().toISOString().slice(0, 10));

    if (behavior !== "boolean" && targetValue) {
      fd.set("targetValue", targetValue);
    }
    if (behavior === "quantity" && unit) {
      fd.set("unit", unit.trim());
    }

    if (frequency === "x_per_week") {
      fd.set("timesPerWeek", timesPerWeek);
    } else if (frequency === "weekly_quantity") {
      fd.set("weeklyQuantity", targetValue); // if weekly_quantity, target is weekly
    }

    try {
      const res = await createHabit(fd);
      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        router.push(defaultChallengeId ? `/challenges/${defaultChallengeId}` : "/habits");
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to create habit.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card p-5 space-y-5">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Habit Name *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 text-sm"
            placeholder="e.g. Read 20 pages"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Behavior
            </label>
            <select
              value={behavior}
              onChange={(e) => setBehavior(e.target.value as any)}
              className="w-full px-3 py-2.5 text-sm bg-transparent border rounded"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              <option value="boolean" className="bg-[#0A0A0B]">Yes / No</option>
              <option value="quantity" className="bg-[#0A0A0B]">Quantity</option>
              <option value="duration" className="bg-[#0A0A0B]">Duration (mins)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Direction
            </label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as any)}
              className="w-full px-3 py-2.5 text-sm bg-transparent border rounded"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              <option value="build" className="bg-[#0A0A0B]">Build (Positive)</option>
              <option value="avoid" className="bg-[#0A0A0B]">Avoid (Negative)</option>
            </select>
          </div>
        </div>

        {behavior !== "boolean" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Target {behavior === "duration" ? "Mins" : "Value"}
              </label>
              <input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="w-full px-3 py-2.5 text-sm"
                placeholder={behavior === "duration" ? "45" : "20"}
                min="1"
              />
            </div>
            {behavior === "quantity" && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Unit
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm"
                  placeholder="e.g. pages, bottles"
                />
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Frequency
          </label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as any)}
            className="w-full px-3 py-2.5 text-sm bg-transparent border rounded"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
          >
            <option value="daily" className="bg-[#0A0A0B]">Daily</option>
            <option value="x_per_week" className="bg-[#0A0A0B]">X times per week</option>
            <option value="weekly_quantity" className="bg-[#0A0A0B]">Weekly aggregate target</option>
          </select>
        </div>

        {frequency === "x_per_week" && (
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Times per week
            </label>
            <input
              type="number"
              value={timesPerWeek}
              onChange={(e) => setTimesPerWeek(e.target.value)}
              className="w-full px-3 py-2.5 text-sm"
              min="1"
              max="7"
            />
          </div>
        )}

        <div className="flex items-center gap-3 mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <input
            type="checkbox"
            id="nonnegotiable"
            checked={isNonNegotiable}
            onChange={(e) => setIsNonNegotiable(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-transparent text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <label htmlFor="nonnegotiable" className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Make this Non-Negotiable
          </label>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2.5 rounded text-xs" style={{ background: "var(--danger-subtle)", color: "var(--danger)", border: "1px solid var(--danger)" }}>
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="btn btn-ghost text-sm">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn btn-primary text-sm px-6 py-2.5">
          {loading ? "Creating..." : "Create Habit"}
        </button>
      </div>
    </form>
  );
}

export default function NewHabitPage() {
  return (
    <div className="max-w-lg mx-auto pb-12">
      <Link
        href="/habits"
        className="inline-flex items-center gap-1.5 text-xs font-medium mb-6 hover:underline"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={12} /> BACK
      </Link>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          CREATE HABIT
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Define a new behavior to track.
        </p>
      </div>

      <Suspense fallback={<div className="animate-pulse h-64 bg-[var(--surface)] rounded-lg"></div>}>
        <HabitForm />
      </Suspense>
    </div>
  );
}
