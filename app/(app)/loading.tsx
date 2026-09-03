import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
      <p className="text-xs tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
        Loading...
      </p>
    </div>
  );
}
