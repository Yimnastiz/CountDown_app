"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CirclePlus,
  History,
  House,
  Settings,
  Tag,
  TimerReset,
} from "lucide-react";
import type { ReactNode } from "react";
const nav = [
  { href: "/", label: "Dashboard", icon: House },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/countdowns/new", label: "Add", icon: CirclePlus },
  { href: "/history", label: "History", icon: History },
  { href: "/categories", label: "Categories", icon: Tag },
  { href: "/settings", label: "Settings", icon: Settings },
];
const titles: Record<string, string> = {
  "/": "Dashboard",
  "/calendar": "Calendar",
  "/history": "History",
  "/categories": "Categories",
  "/settings": "Settings",
  "/countdowns/new": "Add countdown",
};
function Nav({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname();
  return (
    <nav
      className={mobile ? "mobile-nav" : "sidebar-nav"}
      aria-label="Main navigation"
    >
      {nav
        .filter((x) => !mobile || x.label !== "Categories")
        .map(({ href, label, icon: Icon }) => (
          <Link
            href={href}
            key={href}
            className={`${path === href ? "active" : ""} ${label === "Add" ? "add-link" : ""}`}
            aria-label={label}
          >
            <Icon size={21} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
    </nav>
  );
}
export function PageHeader({
  title,
  back = false,
  actions,
}: {
  title?: string;
  back?: boolean;
  actions?: ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  return (
    <header className="page-header">
      {back && (
        <button
          className="icon-button"
          aria-label="Go back"
          onClick={() => router.back()}
        >
          <ArrowLeft aria-hidden="true" />
        </button>
      )}
      <h1>
        {title ??
          titles[path] ??
          (path.includes("edit") ? "Edit countdown" : "Countdown")}
      </h1>
      <div className="header-actions">{actions}</div>
    </header>
  );
}
export function AppShell({
  children,
  title,
  back = false,
  actions,
}: {
  children: ReactNode;
  title?: string;
  back?: boolean;
  actions?: ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <TimerReset size={22} aria-hidden="true" /> COUNT//DOWN
        </Link>
        <p>Important days, clearly.</p>
        <Nav />
      </aside>
      <main>
        <PageHeader title={title} back={back} actions={actions} />
        <div className="page-content">{children}</div>
      </main>
      <Nav mobile />
    </div>
  );
}
