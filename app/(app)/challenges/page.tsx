import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listChallenges } from "@/app/actions/challenges";
import { Plus } from "lucide-react";

export const metadata = { title: "Challenges" };

export default async function ChallengesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const challenges = await listChallenges();

  const STATUS_ORDER = ["active", "paused", "draft", "complete", "archived"];
  const sorted = [...challenges].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            CHALLENGES
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {challenges.length} challenge{challenges.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/challenges/new" className="btn btn-primary text-xs gap-1.5">
          <Plus size={12} /> NEW
        </Link>
      </div>

      {challenges.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No challenges yet.
          </p>
          <Link href="/challenges/new" className="btn btn-primary mt-4 text-sm px-6 inline-flex">
            Create your first challenge
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((c) => {
            const totalDays =
              Math.ceil(
                (new Date(c.endDate).getTime() -
                  new Date(c.startDate).getTime()) /
                  86400000
              ) + 1;
            const today = new Date().toISOString().slice(0, 10);
            const elapsed = Math.max(
              0,
              Math.ceil(
                (new Date(today).getTime() -
                  new Date(c.startDate).getTime()) /
                  86400000
              ) + 1
            );

            return (
              <Link
                key={c.id}
                href={`/challenges/${c.id}`}
                className="card block px-4 py-4 interactive-row"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <StatusDot status={c.status} />
                      <h2
                        className="text-sm font-semibold truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {c.name}
                      </h2>
                    </div>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                      {c.objective}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className="text-data text-xs font-semibold"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {c.status === "active" ? `Day ${elapsed}` : c.status.toUpperCase()}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {totalDays}d
                    </p>
                  </div>
                </div>

                {c.status === "active" && (
                  <div className="mt-3 progress-track h-0.5 w-full">
                    <div
                      className="progress-fill h-full"
                      style={{
                        width: `${Math.min(100, (elapsed / totalDays) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active:   "var(--success)",
    paused:   "var(--warning)",
    draft:    "var(--text-muted)",
    complete: "var(--accent)",
    archived: "var(--text-disabled)",
  };
  return (
    <div
      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: colors[status] ?? "var(--text-muted)" }}
    />
  );
}
