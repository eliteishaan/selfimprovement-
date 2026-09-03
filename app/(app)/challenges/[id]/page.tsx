import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Target, Plus } from "lucide-react";
import { getChallengeWithPhases } from "@/app/actions/challenges";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { habits } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getChallengeTimeProgress, getDaysRemaining } from "@/lib/calculations/challenge";

export const metadata = { title: "Challenge Details" };

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const data = await getChallengeWithPhases(id);
  if (!data) notFound();
  
  const { challenge, phases } = data;

  const challengeHabits = await db
    .select()
    .from(habits)
    .where(eq(habits.challengeId, challenge.id))
    .orderBy(desc(habits.createdAt));

  const progress = getChallengeTimeProgress(challenge, new Date().toISOString().slice(0, 10));
  const remaining = getDaysRemaining(challenge, new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div>
        <Link
          href="/challenges"
          className="inline-flex items-center gap-1.5 text-xs font-medium mb-6 hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={12} /> BACK TO CHALLENGES
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <StatusBadge status={challenge.status} />
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                {challenge.name}
              </h1>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {challenge.objective}
            </p>
          </div>
        </div>
      </div>

      {/* Progress & Stats */}
      <div className="card p-5 space-y-5">
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: "var(--text-secondary)" }}>Timeline Progress</span>
          <span className="font-semibold text-data">{progress}%</span>
        </div>
        <div className="progress-track h-2 w-full rounded-full overflow-hidden">
          <div
            className="progress-fill h-full rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
          <span>Started {new Date(challenge.startDate).toLocaleDateString()}</span>
          <span>{Math.max(0, remaining)} days remaining</span>
        </div>
      </div>

      {/* Habits */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: "var(--text-primary)" }}>
            LINKED HABITS
          </h2>
          <Link href={`/habits/new?challengeId=${challenge.id}`} className="btn btn-primary text-xs gap-1.5 px-3 py-1.5">
            <Plus size={12} /> NEW HABIT
          </Link>
        </div>
        
        {challengeHabits.length === 0 ? (
          <div className="card py-12 text-center border-dashed">
            <Target size={24} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No habits linked to this challenge.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {challengeHabits.map((h) => (
              <Link
                key={h.id}
                href={`/habits/${h.id}`}
                className="card flex items-center justify-between px-4 py-3 interactive-row block"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {h.title}
                    {h.isNonNegotiable && (
                      <span className="ml-1.5 text-[9px] font-semibold" style={{ color: "var(--accent-dim)" }}>★</span>
                    )}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {h.behavior === "boolean" ? "Completion" : h.behavior === "quantity" ? "Target" : "Duration"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Phases */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: "var(--text-primary)" }}>
            PHASES
          </h2>
        </div>
        
        {phases.length === 0 ? (
          <div className="card py-8 text-center text-sm" style={{ color: "var(--text-muted)", borderStyle: "dashed" }}>
            No phases configured.
          </div>
        ) : (
          <div className="space-y-2">
            {phases.map((p, i) => (
              <div key={p.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Phase {i + 1}: {p.name}
                  </h3>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{p.durationDays} days</span>
                </div>
                {p.objective && (
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{p.objective}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    active: { bg: "var(--success-subtle)", text: "var(--success)" },
    paused: { bg: "var(--warning-subtle)", text: "var(--warning)" },
    draft: { bg: "rgba(255,255,255,0.05)", text: "var(--text-muted)" },
    complete: { bg: "var(--accent-subtle)", text: "var(--accent)" },
    archived: { bg: "rgba(255,255,255,0.05)", text: "var(--text-disabled)" },
  };
  const config = colors[status] ?? colors.draft;
  
  return (
    <span
      className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {status}
    </span>
  );
}
