import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { habits, habitSchedules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const metadata = { title: "Habit Details" };

export default async function HabitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [habit] = await db
    .select()
    .from(habits)
    .where(eq(habits.id, id))
    .limit(1);

  if (!habit || habit.userId !== user.id) {
    notFound();
  }

  const [schedule] = await db
    .select()
    .from(habitSchedules)
    .where(eq(habitSchedules.habitId, id))
    .limit(1);

  return (
    <div className="max-w-2xl mx-auto pb-12 space-y-8">
      <div>
        <Link
          href="/habits"
          className="inline-flex items-center gap-1.5 text-xs font-medium mb-6 hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={12} /> BACK
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {habit.title}
          </h1>
          {habit.isNonNegotiable && (
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded" style={{ backgroundColor: "var(--accent-subtle)", color: "var(--accent)" }}>
              NON-NEGOTIABLE
            </span>
          )}
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {habit.behavior === "boolean" ? "Completion Based" : habit.behavior === "quantity" ? `Target: ${habit.targetValue} ${habit.unit}` : `Duration: ${habit.targetValue} mins`} 
          {" · "} {habit.direction === "build" ? "Build Habit" : "Avoid Habit"}
        </p>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold tracking-wide mb-4" style={{ color: "var(--text-primary)" }}>
          SCHEDULE CONFIGURATION
        </h2>
        {schedule ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span style={{ color: "var(--text-secondary)" }}>Frequency Type</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{schedule.frequencyType}</span>
            </div>
            {schedule.frequencyType === "x_per_week" && (
              <div className="flex justify-between">
                <span style={{ color: "var(--text-secondary)" }}>Target</span>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{schedule.timesPerWeek} times per week</span>
              </div>
            )}
            {schedule.frequencyType === "weekly_quantity" && (
              <div className="flex justify-between">
                <span style={{ color: "var(--text-secondary)" }}>Target</span>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{schedule.weeklyQuantity} per week</span>
              </div>
            )}
            <div className="flex justify-between">
              <span style={{ color: "var(--text-secondary)" }}>Effective From</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{new Date(schedule.effectiveFrom).toLocaleDateString()}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No active schedule found for this habit.</p>
        )}
      </div>
      
      <div className="card p-5 border-dashed">
        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
          Advanced analytics and history coming soon.
        </p>
      </div>
    </div>
  );
}
