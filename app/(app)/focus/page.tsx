import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLocalDate } from "@/lib/dates";
import { getCurrentChallenge } from "@/app/actions/challenges";
import { getActiveSession, getTodayFocusSeconds } from "@/app/actions/focus";
import FocusPageClient from "@/components/focus/focus-page-client";

export const metadata = { title: "Focus" };

export default async function FocusPage() {
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
  const [activeSession, todayFocusSeconds, sessionsRes] = await Promise.all([
    getActiveSession(),
    getTodayFocusSeconds(today),
    supabase
      .from("focus_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("started_at", `${today}T00:00:00`)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
          FOCUS
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Deep work sessions</p>
      </div>

      <FocusPageClient
        activeSession={activeSession}
        todayFocusSeconds={todayFocusSeconds}
        todaySessions={sessionsRes.data ?? []}
        challengeId={challenge?.id ?? null}
        userId={user.id}
        today={today}
      />
    </div>
  );
}
