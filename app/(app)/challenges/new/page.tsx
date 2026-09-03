"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { quickCreateChallenge } from "@/app/actions/challenges";
import { Plus, X } from "lucide-react";

const MAX_STEPS = 3;

export default function QuickCreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [durationDays, setDurationDays] = useState(120);
  const [commitments, setCommitments] = useState<string[]>([""]);

  function getEndDate() {
    const start = new Date(startDate);
    start.setDate(start.getDate() + durationDays - 1);
    return start.toISOString().slice(0, 10);
  }

  function addCommitment() {
    if (commitments.length < 10) {
      setCommitments([...commitments, ""]);
    }
  }

  function updateCommitment(idx: number, val: string) {
    const updated = [...commitments];
    updated[idx] = val;
    setCommitments(updated);
  }

  function removeCommitment(idx: number) {
    setCommitments(commitments.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    const valid = commitments.filter((c) => c.trim());
    if (!name.trim() || !objective.trim() || valid.length === 0) {
      setError("Complete all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("objective", objective.trim());
    fd.set("startDate", startDate);
    fd.set("endDate", getEndDate());
    fd.set("commitments", JSON.stringify(valid));

    try {
      await quickCreateChallenge(fd);
      // redirect happens in action
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
      setLoading(false);
    }
  }

  const DURATION_PRESETS = [
    { label: "30 days", value: 30 },
    { label: "60 days", value: 60 },
    { label: "90 days", value: 90 },
    { label: "120 days", value: 120 },
    { label: "180 days", value: 180 },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="label mb-2" style={{ color: "var(--text-muted)" }}>
          STEP {step} / {MAX_STEPS}
        </p>
        <div className="flex gap-1.5 mb-5">
          {Array.from({ length: MAX_STEPS }, (_, i) => (
            <div
              key={i}
              className="h-0.5 flex-1 rounded-full"
              style={{
                background: i < step ? "var(--accent)" : "var(--border)",
                transition: "background 200ms",
              }}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <Step key="step1" title="DEFINE THE CHALLENGE" subtitle="What are you committing to?">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Challenge name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm"
                  placeholder="Winter Arc 2025"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Core objective *
                </label>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm resize-none"
                  placeholder="Transform my body, build discipline, and establish elite daily habits by Spring."
                />
              </div>
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step key="step2" title="SET THE TIMELINE" subtitle="When does it start and how long?">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Start date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
                  Duration
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {DURATION_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setDurationDays(p.value)}
                      className="py-2 text-xs font-medium rounded-sm border transition-colors"
                      style={{
                        background: durationDays === p.value ? "var(--accent)" : "transparent",
                        borderColor: durationDays === p.value ? "var(--accent)" : "var(--border)",
                        color: durationDays === p.value ? "#0A0A0B" : "var(--text-muted)",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Math.max(7, parseInt(e.target.value) || 7))}
                    className="w-20 px-3 py-2 text-sm text-data"
                    min="7"
                    max="730"
                  />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    days → ends {getEndDate()}
                  </span>
                </div>
              </div>
            </div>
          </Step>
        )}

        {step === 3 && (
          <Step key="step3" title="YOUR COMMITMENTS" subtitle="What will you do every day? These become your habits.">
            <div className="space-y-3">
              {commitments.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-data w-4 text-right flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={c}
                    onChange={(e) => updateCommitment(idx, e.target.value)}
                    className="flex-1 px-3 py-2 text-sm"
                    placeholder={
                      idx === 0 ? "Train at the gym" :
                      idx === 1 ? "Read 20 pages" :
                      idx === 2 ? "Cold shower" :
                      "Add a habit..."
                    }
                    autoFocus={idx === commitments.length - 1 && idx > 0}
                  />
                  {commitments.length > 1 && (
                    <button
                      onClick={() => removeCommitment(idx)}
                      className="p-1 rounded"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}

              {commitments.length < 10 && (
                <button
                  onClick={addCommitment}
                  className="flex items-center gap-2 text-xs mt-2"
                  style={{ color: "var(--accent)" }}
                >
                  <Plus size={12} /> Add commitment
                </button>
              )}

              <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
                These will be created as daily boolean habits. You can add more complex habits (quantified, schedules, targets) after creation.
              </p>
            </div>
          </Step>
        )}
      </AnimatePresence>

      {error && (
        <div
          className="mt-4 px-3 py-2.5 rounded text-xs"
          style={{ background: "var(--danger-subtle)", color: "var(--danger)", border: "1px solid var(--danger)" }}
        >
          {error}
        </div>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : router.back()}
          className="btn btn-ghost text-sm"
        >
          {step === 1 ? "Cancel" : "Back"}
        </button>

        {step < MAX_STEPS ? (
          <button
            onClick={() => {
              if (step === 1 && (!name.trim() || !objective.trim())) {
                setError("Fill in the name and objective.");
                return;
              }
              setError(null);
              setStep(step + 1);
            }}
            className="btn btn-primary text-sm px-6"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn btn-primary text-sm px-8 py-2.5"
          >
            {loading ? "Creating..." : "START CHALLENGE"}
          </button>
        )}
      </div>
    </div>
  );
}

function Step({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.15 }}
    >
      <h1 className="text-xl font-semibold tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
        {title}
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        {subtitle}
      </p>
      {children}
    </motion.div>
  );
}
