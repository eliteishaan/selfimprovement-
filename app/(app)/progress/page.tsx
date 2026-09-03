import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLocalDate, getWeekStart } from "@/lib/dates";
import { getCurrentChallenge } from "@/app/actions/challenges";

export const metadata = { title: "Progress" };

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();

  const timezone = profile?.timezone ?? "UTC";
  const today = getLocalDate(timezone);
  const challenge = await getCurrentChallenge();

  const { data: scoresRaw } = await supabase
    .from("daily_scores")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(30);

  const scores = scoresRaw ?? [];
  const avgExecution = scores.length > 0 
    ? Math.round(scores.reduce((sum: number, s: any) => sum + parseFloat(s.execution_score), 0) / scores.length)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>PROGRESS</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Last 30 days</p>
      </div>

      <div className="card px-4 py-6 text-center">
        <p className="label mb-2">30-DAY EXECUTION</p>
        <p className="text-score" style={{ color: "var(--text-primary)" }}>{avgExecution}%</p>
      </div>

      <div>
        <p className="section-header">RECENT DAYS</p>
        <div className="space-y-0.5">
          {scores.map((score: any) => (
            <div key={score.id} className="flex items-center justify-between px-3 py-3 card interactive-row border-0">
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                {new Date(score.date).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-data text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {Math.round(score.execution_score)}%
                </span>
                <div 
                  className="w-16 h-1.5 rounded-sm overflow-hidden flex-shrink-0" 
                  style={{ background: "var(--bg-elevated)" }}
                >
                  <div 
                    className="h-full" 
                    style={{ 
                      width: `${score.execution_score}%`,
                      background: parseFloat(score.execution_score) >= 80 ? "var(--success)" : 
                                 parseFloat(score.execution_score) < 60 ? "var(--danger)" : "var(--accent)"
                    }} 
                  />
                </div>
              </div>
            </div>
          ))}
          {scores.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
              No execution data yet. Complete your first day.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
