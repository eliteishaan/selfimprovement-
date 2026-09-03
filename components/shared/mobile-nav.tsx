"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, Target, Timer, BarChart2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const MOBILE_NAV = [
  { href: "/today",    label: "Today",    icon: Zap },
  { href: "/habits",   label: "Habits",   icon: Target },
  { href: "/focus",    label: "Focus",    icon: Timer },
  { href: "/progress", label: "Progress", icon: BarChart2 },
  { href: "/tasks",    label: "More",     icon: MoreHorizontal },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex md:hidden border-t z-50"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs transition-colors"
            style={{
              color: isActive ? "var(--accent)" : "var(--text-muted)",
              background: isActive ? "var(--bg-elevated)" : "transparent",
            }}
          >
            <Icon size={18} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
