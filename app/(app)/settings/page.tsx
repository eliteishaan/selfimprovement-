import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>SETTINGS</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Manage your account and preferences</p>
      </div>

      <div className="card px-4 py-5 space-y-4">
        <p className="section-header border-none mb-0 pb-0">PROFILE</p>
        
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Email
          </label>
          <input
            type="email"
            value={user.email || ""}
            disabled
            className="w-full px-3 py-2 text-sm opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Display Name
          </label>
          <input
            type="text"
            defaultValue={profile?.display_name || ""}
            disabled
            className="w-full px-3 py-2 text-sm opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Timezone
          </label>
          <input
            type="text"
            defaultValue={profile?.timezone || "UTC"}
            disabled
            className="w-full px-3 py-2 text-sm opacity-60"
          />
        </div>
        
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Preferences editing is disabled in this version.
        </p>
      </div>
      
      <div className="text-center mt-12">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Challenge OS v1.0
        </p>
      </div>
    </div>
  );
}
