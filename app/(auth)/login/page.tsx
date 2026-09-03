"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SignInSchema } from "@/lib/validation/schemas";
import { cn } from "@/lib/utils/cn";

type FormData = z.infer<typeof SignInSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(SignInSchema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/today");
    router.refresh();
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4" style={{ background: "var(--bg-base)" }}>
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-10">
          <p className="label mb-3" style={{ color: "var(--accent)" }}>CHALLENGE OS</p>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Sign in
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Your challenge continues.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              className={cn(
                "w-full px-3 py-2.5 text-sm",
                errors.email && "border-[var(--danger)]"
              )}
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Password
            </label>
            <input
              {...register("password")}
              type="password"
              autoComplete="current-password"
              className={cn(
                "w-full px-3 py-2.5 text-sm",
                errors.password && "border-[var(--danger)]"
              )}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
                {errors.password.message}
              </p>
            )}
          </div>

          {error && (
            <div
              className="px-3 py-2.5 rounded text-xs"
              style={{ background: "var(--danger-subtle)", color: "var(--danger)", border: "1px solid var(--danger)" }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-2.5 mt-2"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            New here?{" "}
            <Link
              href="/signup"
              className="underline"
              style={{ color: "var(--text-secondary)" }}
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
