"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { motion } from "framer-motion";
import type { FocusSession } from "@/types";
import { startFocusSession, endFocusSession } from "@/app/actions/focus";
import { formatTimerDisplay, getElapsedSeconds } from "@/lib/dates";
import { Play, Square, Timer } from "lucide-react";

interface FocusWidgetProps {
  activeSession: FocusSession | null;
  todaySeconds: number;
  challengeId: string;
  userId: string;
}

export default function FocusWidget({
  activeSession: initialSession,
  todaySeconds,
  challengeId,
  userId,
}: FocusWidgetProps) {
  const [session, setSession] = useState<FocusSession | null>(initialSession);
  const [elapsed, setElapsed] = useState<number>(
    initialSession ? getElapsedSeconds(initialSession.startedAt) : 0
  );
  const [subject, setSubject] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timestamp-based timer — survives navigation because source is DB startedAt
  useEffect(() => {
    if (session) {
      intervalRef.current = setInterval(() => {
        setElapsed(getElapsedSeconds(session.startedAt));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session]);

  async function handleStart() {
    setIsStarting(false);
    startTransition(async () => {
      const result = await startFocusSession({
        challengeId,
        subject: subject.trim() || null,
        sessionType: "stopwatch",
      });
      if ("session" in result && result.session) {
        setSession(result.session as FocusSession);
        setElapsed(0);
      }
    });
  }

  async function handleEnd() {
    if (!session) return;
    startTransition(async () => {
      await endFocusSession({ sessionId: session.id });
      setSession(null);
      setElapsed(0);
    });
  }

  const totalSeconds = session ? elapsed : todaySeconds;

  return (
    <div className="card px-4 py-4">
      {session ? (
        /* Active session */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--accent)" }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
              <span className="text-xs" style={{ color: "var(--accent)" }}>
                {session.subject ?? "FOCUS"}
              </span>
            </div>
            <button
              onClick={handleEnd}
              disabled={isPending}
              className="btn btn-ghost text-xs gap-1.5"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              <Square size={10} />
              STOP
            </button>
          </div>
          <p className="text-timer font-mono">
            {formatTimerDisplay(elapsed)}
          </p>
        </div>
      ) : isStarting ? (
        /* Start form */
        <div className="space-y-3">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 text-sm"
            placeholder="What are you focusing on? (optional)"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setIsStarting(false)}
              className="btn btn-ghost flex-1 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              disabled={isPending}
              className="btn btn-primary flex-1 text-xs gap-1.5"
            >
              <Play size={10} />
              START
            </button>
          </div>
        </div>
      ) : (
        /* Idle */
        <div className="flex items-center justify-between">
          <div>
            <p className="text-data text-lg font-semibold" style={{ color: "var(--text-secondary)" }}>
              {formatTimerDisplay(todaySeconds)}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              today
            </p>
          </div>
          <button
            onClick={() => setIsStarting(true)}
            className="btn btn-ghost text-xs gap-1.5"
            style={{ borderColor: "var(--accent-dim)", color: "var(--accent)" }}
          >
            <Play size={10} />
            START FOCUS
          </button>
        </div>
      )}
    </div>
  );
}
