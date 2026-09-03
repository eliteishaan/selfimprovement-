"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { motion } from "framer-motion";
import type { FocusSession } from "@/types";
import { startFocusSession, endFocusSession } from "@/app/actions/focus";
import { formatTimerDisplay, formatDuration, getElapsedSeconds } from "@/lib/dates";
import { Play, Square, Clock } from "lucide-react";

interface FocusPageClientProps {
  activeSession: FocusSession | null;
  todayFocusSeconds: number;
  todaySessions: FocusSession[];
  challengeId: string | null;
  userId: string;
  today: string;
}

export default function FocusPageClient({
  activeSession: initial,
  todayFocusSeconds,
  todaySessions,
  challengeId,
  today,
}: FocusPageClientProps) {
  const [session, setSession] = useState<FocusSession | null>(initial);
  const [elapsed, setElapsed] = useState(
    initial ? getElapsedSeconds(initial.startedAt) : 0
  );
  const [subject, setSubject] = useState("");
  const [sessionType, setSessionType] = useState<"stopwatch" | "countdown" | "pomodoro">("stopwatch");
  const [endNote, setEndNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (session) {
      intervalRef.current = setInterval(() => {
        setElapsed(getElapsedSeconds(session.startedAt));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [session]);

  async function handleStart() {
    startTransition(async () => {
      const r = await startFocusSession({
        challengeId,
        subject: subject.trim() || null,
        sessionType,
      });
      if ("session" in r && r.session) {
        setSession(r.session as FocusSession);
        setElapsed(0);
      }
    });
  }

  async function handleEnd() {
    if (!session) return;
    startTransition(async () => {
      await endFocusSession({ sessionId: session.id, note: endNote || null });
      setSession(null);
      setElapsed(0);
      setEndNote("");
    });
  }

  const totalToday = session ? todayFocusSeconds + elapsed : todayFocusSeconds;

  return (
    <div className="space-y-6">
      {/* Main timer card */}
      <div className="card px-6 py-8 text-center space-y-6">
        {/* Big timer */}
        <div>
          {session ? (
            <>
              <motion.p
                className="text-timer font-mono"
                style={{ fontSize: "clamp(3rem, 12vw, 5rem)", lineHeight: 1 }}
                animate={{ opacity: [1, 0.8, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {formatTimerDisplay(elapsed)}
              </motion.p>
              {session.subject && (
                <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {session.subject}
                </p>
              )}
            </>
          ) : (
            <p className="text-score" style={{ color: "var(--text-muted)" }}>
              {formatDuration(totalToday) || "0m"}
            </p>
          )}
          <p className="label mt-2" style={{ color: "var(--text-muted)" }}>
            {session ? "ACTIVE SESSION" : "TODAY'S FOCUS"}
          </p>
        </div>

        {/* Controls */}
        {session ? (
          <div className="space-y-3">
            <input
              type="text"
              value={endNote}
              onChange={(e) => setEndNote(e.target.value)}
              className="w-full px-3 py-2 text-sm text-center"
              placeholder="Add a note (optional)"
            />
            <button
              onClick={handleEnd}
              disabled={isPending}
              className="btn btn-ghost w-full py-3 gap-2 text-sm"
              style={{ borderColor: "var(--border-strong)", color: "var(--text-secondary)" }}
            >
              <Square size={14} />
              STOP SESSION
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-sm text-center"
              placeholder="What are you focusing on?"
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
            />
            <div className="flex gap-1.5 justify-center">
              {(["stopwatch", "pomodoro"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSessionType(t)}
                  className="px-3 py-1.5 text-xs font-medium rounded-sm border transition-colors"
                  style={{
                    background: sessionType === t ? "var(--accent)" : "transparent",
                    borderColor: sessionType === t ? "var(--accent)" : "var(--border)",
                    color: sessionType === t ? "#0A0A0B" : "var(--text-muted)",
                  }}
                >
                  {t === "stopwatch" ? "STOPWATCH" : "POMODORO"}
                </button>
              ))}
            </div>
            <button
              onClick={handleStart}
              disabled={isPending}
              className="btn btn-primary w-full py-3 gap-2 text-sm"
            >
              <Play size={14} />
              START FOCUS
            </button>
          </div>
        )}
      </div>

      {/* Today's sessions log */}
      {todaySessions.length > 0 && (
        <div>
          <p className="section-header">TODAY&apos;S SESSIONS</p>
          <div className="space-y-0.5">
            {todaySessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-2 py-2.5 interactive-row"
              >
                <div>
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                    {s.subject ?? "Focus session"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(s.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {s.endedAt && ` → ${new Date(s.endedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                  </p>
                </div>
                <span className="text-data text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                  {s.durationSeconds ? formatDuration(s.durationSeconds) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
