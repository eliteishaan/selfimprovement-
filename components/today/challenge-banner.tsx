"use client";

import { motion } from "framer-motion";
import type { ChallengeContext } from "@/types";
import { cn } from "@/lib/utils/cn";

const HEALTH_CONFIG = {
  insufficient_data: { label: "STARTING",  className: "health-unknown" },
  strong:            { label: "STRONG",    className: "health-strong" },
  steady:            { label: "STEADY",    className: "health-steady" },
  at_risk:           { label: "AT RISK",   className: "health-at-risk" },
  critical:          { label: "CRITICAL",  className: "health-critical" },
} as const;

interface ChallengeBannerProps {
  context: ChallengeContext;
}

export default function ChallengeBanner({ context }: ChallengeBannerProps) {
  const { challenge, currentPhase, day, daysRemaining, timeProgress, health } = context;
  const healthCfg = HEALTH_CONFIG[health.status];

  return (
    <div
      className="card px-4 py-4 space-y-3"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Top row: name + health badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="text-base font-semibold tracking-tight truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {challenge.name.toUpperCase()}
          </h2>
          {currentPhase && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {currentPhase.name.toUpperCase()}
            </p>
          )}
        </div>
        <span
          className={cn(
            "flex-shrink-0 text-[10px] font-semibold tracking-widest px-2 py-1 rounded-sm",
            healthCfg.className
          )}
        >
          {healthCfg.label}
        </span>
      </div>

      {/* Day counter */}
      <div className="flex items-baseline gap-2">
        <span className="text-data font-semibold" style={{ fontSize: "1.75rem", color: "var(--text-primary)", lineHeight: 1 }}>
          DAY {day}
        </span>
        <span className="text-data text-sm" style={{ color: "var(--text-muted)" }}>
          / {challenge.endDate ? Math.ceil((new Date(challenge.endDate).getTime() - new Date(challenge.startDate).getTime()) / 86400000) + 1 : "—"}
        </span>
        <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
          {daysRemaining} days left
        </span>
      </div>

      {/* Progress bar — TIME ELAPSED only */}
      <div>
        <div className="progress-track h-1 w-full">
          <motion.div
            className="progress-fill h-full"
            initial={{ width: 0 }}
            animate={{ width: `${timeProgress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <p className="text-[10px] mt-1 text-data" style={{ color: "var(--text-muted)" }}>
          {timeProgress}% TIME ELAPSED
        </p>
      </div>
    </div>
  );
}
