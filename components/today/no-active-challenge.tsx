import Link from "next/link";

interface NoActiveChallengeProps {
  displayName?: string | null;
}

export default function NoActiveChallenge({ displayName }: NoActiveChallengeProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="mb-8">
        <p className="label mb-4" style={{ color: "var(--text-muted)" }}>
          CHALLENGE OS
        </p>
        <h1
          className="text-3xl font-semibold tracking-tight mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          NOTHING ACTIVE
        </h1>
        <p className="text-sm max-w-xs mx-auto" style={{ color: "var(--text-muted)" }}>
          {displayName ? `${displayName}, you` : "You"} haven&apos;t committed to a challenge yet.
        </p>
      </div>

      <div className="space-y-3">
        <Link
          href="/challenges/new"
          className="btn btn-primary px-8 py-3 text-sm font-semibold tracking-wide block"
        >
          CREATE CHALLENGE
        </Link>
        <Link
          href="/challenges"
          className="block text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          or browse saved challenges →
        </Link>
      </div>
    </div>
  );
}
