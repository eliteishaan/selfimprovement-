import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLocalDate, getWeekStart } from "@/lib/dates";
import { getCurrentChallenge } from "@/app/actions/challenges";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage() {
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
  const currentWeekStart = getWeekStart(today, timezone);
  const challenge = await getCurrentChallenge();

  const [notesRes, plansRes, reviewsRes] = await Promise.all([
    supabase
      .from("daily_notes")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(7),
    supabase
      .from("weekly_plans")
      .select("*")
      .eq("user_id", user.id)
      .order("week_start", { ascending: false }),
    supabase
      .from("weekly_reviews")
      .select("*")
      .eq("user_id", user.id)
      .order("week_start", { ascending: false })
  ]);

  const recentNotes = notesRes.data ?? [];
  const plans = plansRes.data ?? [];
  const reviews = reviewsRes.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>REVIEWS</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Reflection and planning</p>
        </div>
      </div>

      <div>
        <p className="section-header">THIS WEEK</p>
        <div className="space-y-2">
          <Link href={`/reviews/plan/${currentWeekStart}`} className="card block px-4 py-4 interactive-row">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Weekly Plan</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Set intentions for the week</p>
          </Link>
          <Link href={`/reviews/review/${currentWeekStart}`} className="card block px-4 py-4 interactive-row">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Weekly Review</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Reflect on the past 7 days</p>
          </Link>
        </div>
      </div>

      {recentNotes.length > 0 && (
        <div>
          <p className="section-header">RECENT DAILY NOTES</p>
          <div className="space-y-2">
            {recentNotes.map((note: any) => (
              <div key={note.id} className="card px-4 py-3">
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                  {new Date(note.date).toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
                {note.what_went_well && (
                  <div className="mb-2">
                    <p className="text-[10px] uppercase tracking-wider text-success">Went well</p>
                    <p className="text-sm" style={{ color: "var(--text-primary)" }}>{note.what_went_well}</p>
                  </div>
                )}
                {note.what_went_wrong && (
                  <div className="mb-2">
                    <p className="text-[10px] uppercase tracking-wider text-danger">To improve</p>
                    <p className="text-sm" style={{ color: "var(--text-primary)" }}>{note.what_went_wrong}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  <div 
                    className="w-1.5 h-1.5 rounded-full" 
                    style={{ background: note.completed_honestly ? "var(--success)" : "var(--danger)" }}
                  />
                  <span className="text-[10px] text-muted">
                    {note.completed_honestly ? "Completed honestly" : "Not honest"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
