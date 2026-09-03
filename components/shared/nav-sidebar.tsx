"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Target,
  Calendar,
  CheckSquare,
  Timer,
  BookOpen,
  BarChart2,
  FileText,
  Settings,
  LogOut,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/today",      label: "Today",     icon: Zap },
  { href: "/challenges", label: "Challenge",  icon: Target },
  { href: "/habits",     label: "Habits",     icon: CheckSquare },
  { href: "/tasks",      label: "Tasks",      icon: Calendar },
  { href: "/focus",      label: "Focus",      icon: Timer },
  { href: "/books",      label: "Books",      icon: BookOpen },
  { href: "/progress",   label: "Progress",   icon: BarChart2 },
  { href: "/reviews",    label: "Reviews",    icon: FileText },
  { href: "/settings",   label: "Settings",   icon: Settings },
];

interface NavSidebarProps {
  user: { name: string; email: string };
}

export default function NavSidebar({ user }: NavSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="hidden md:flex flex-col w-52 border-r flex-shrink-0 h-dvh"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <p className="label" style={{ color: "var(--accent)" }}>CHALLENGE OS</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "nav-item",
                isActive && "nav-item-active"
              )}
            >
              <Icon
                size={14}
                style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
          {user.name}
        </p>
        <p className="text-xs truncate mb-3" style={{ color: "var(--text-muted)" }}>
          {user.email}
        </p>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-xs transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <LogOut size={12} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
