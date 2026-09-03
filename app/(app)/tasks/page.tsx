import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TasksClient from "@/components/tasks/tasks-client";
import { getCurrentChallenge } from "@/app/actions/challenges";

export const metadata = { title: "Tasks" };

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const challenge = await getCurrentChallenge();

  const [inboxRes, todayRes, completedRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["inbox", "planned"])
      .order("priority")
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["today", "in_progress"])
      .order("is_top_priority", { ascending: false })
      .order("priority"),
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>TASKS</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Inbox → Today → Done</p>
      </div>
      <TasksClient
        initial={{
          inbox: inboxRes.data ?? [],
          today: todayRes.data ?? [],
          completed: completedRes.data ?? [],
        }}
        challengeId={challenge?.id ?? null}
      />
    </div>
  );
}
