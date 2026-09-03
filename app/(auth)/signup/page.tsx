"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SignUpSchema } from "@/lib/validation/schemas";
import { cn } from "@/lib/utils/cn";

type FormData = z.infer<typeof SignUpSchema>;

// Common timezones list
const TIMEZONES = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Seoul",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
  "UTC",
];

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { display_name: data.displayName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      // Create profile row
      await supabase.from("profiles").upsert({
        id: authData.user.id,
        display_name: data.displayName,
        timezone: data.timezone,
      });
    }

    router.push("/today");
    router.refresh();
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-12" style={{ background: "var(--bg-base)" }}>
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-10">
          <p className="label mb-3" style={{ color: "var(--accent)" }}>CHALLENGE OS</p>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Create your account
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            The challenge starts when you commit.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Your name
            </label>
            <input
              {...register("displayName")}
              type="text"
              autoComplete="name"
              className={cn("w-full px-3 py-2.5 text-sm", errors.displayName && "border-[var(--danger)]")}
              placeholder="Alex"
            />
            {errors.displayName && <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>{errors.displayName.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              className={cn("w-full px-3 py-2.5 text-sm", errors.email && "border-[var(--danger)]")}
              placeholder="you@example.com"
            />
            {errors.email && <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Password
            </label>
            <input
              {...register("password")}
              type="password"
              autoComplete="new-password"
              className={cn("w-full px-3 py-2.5 text-sm", errors.password && "border-[var(--danger)]")}
              placeholder="Min. 8 characters"
            />
            {errors.password && <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Timezone
            </label>
            <select
              {...register("timezone")}
              className={cn("w-full px-3 py-2.5 text-sm", errors.timezone && "border-[var(--danger)]")}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
              ))}
            </select>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              Used to determine your daily challenge reset time.
            </p>
            {errors.timezone && <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>{errors.timezone.message}</p>}
          </div>

          {error && (
            <div className="px-3 py-2.5 rounded text-xs" style={{ background: "var(--danger-subtle)", color: "var(--danger)", border: "1px solid var(--danger)" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary w-full py-2.5 mt-2">
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link href="/login" className="underline" style={{ color: "var(--text-secondary)" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
