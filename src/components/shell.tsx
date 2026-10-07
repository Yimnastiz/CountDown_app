"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CirclePlus,
  FolderCog,
  History,
  House,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Tag,
  TimerReset,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { settingsRepository } from "@/lib/repository";
import type { AppSettings } from "@/lib/types";
import { normalizeSidebarMode } from "@/lib/sidebar";
import { AuthControl } from "@/components/auth-control";
const desktopNav = [
  { href: "/", label: "Dashboard", icon: House },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/countdowns/new", label: "Add", icon: CirclePlus },
  { href: "/history", label: "History", icon: History },
  { href: "/categories", label: "Categories", icon: Tag },
  { href: "/settings", label: "Settings", icon: Settings },
];
const mobileNav = desktopNav.filter(
  (item) => !["Categories", "Settings"].includes(item.label),
);
const titles: Record<string, string> = {
  "/": "Dashboard",
  "/calendar": "Calendar",
  "/history": "History",
  "/categories": "Categories",
  "/settings": "Settings",
  "/countdowns/new": "Add countdown",
};
function DesktopNav({ mode }: { mode: AppSettings["sidebarMode"] }) {
  const path = usePathname();
  return (
    <nav className="sidebar-nav" aria-label="Main navigation">
      {desktopNav.map(({ href, label, icon: Icon }) => (
        <Link
          href={href}
          key={href}
          title={mode === "collapsed" ? label : undefined}
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
function MobileNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  const moreActive = path === "/categories" || path === "/settings";
  return (
    <>
      <nav className="mobile-nav" aria-label="Main navigation">
        {mobileNav.map(({ href, label, icon: Icon }) => (
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
        <button
          ref={trigger}
          type="button"
          className={moreActive ? "active" : ""}
          aria-label="More navigation"
          aria-expanded={open}
          aria-controls="mobile-more-menu"
          onClick={() => setOpen(true)}
        >
          <MoreHorizontal size={21} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>
      {open && (
        <div
          className="dialog-backdrop mobile-more-backdrop"
          onMouseDown={close}
        >
          <section
            id="mobile-more-menu"
            className="mobile-more"
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="icon-button close"
              aria-label="Close more navigation"
              onClick={close}
            >
              <X aria-hidden="true" />
            </button>
            <h2>More</h2>
            <Link href="/categories" onClick={close}>
              <FolderCog aria-hidden="true" />
              Categories
            </Link>
            <Link href="/settings" onClick={close}>
              <Settings aria-hidden="true" />
              Settings
            </Link>
            <AuthControl />
          </section>
        </div>
      )}
    </>
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
  const [mode, setMode] = useState<AppSettings["sidebarMode"]>("expanded");
  useEffect(
    () => setMode(normalizeSidebarMode(settingsRepository.get().sidebarMode)),
    [],
  );
  const updateMode = (next: NonNullable<AppSettings["sidebarMode"]>) => {
    setMode(next);
    settingsRepository.save({ sidebarMode: next });
  };
  return (
    <div className={`app-shell sidebar-${mode}`}>
      <aside className="sidebar" aria-label="Desktop navigation">
        <div className="sidebar-top">
          <Link
            href="/"
            className="brand"
            title={mode === "collapsed" ? "Count//Down" : undefined}
          >
            <TimerReset size={22} aria-hidden="true" />
            <span>COUNT//DOWN</span>
          </Link>
          <button
            className="sidebar-toggle icon-button"
            aria-label={
              mode === "expanded" ? "Collapse sidebar" : "Expand sidebar"
            }
            title={mode === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={mode === "expanded"}
            onClick={() =>
              updateMode(mode === "expanded" ? "collapsed" : "expanded")
            }
          >
            {mode === "expanded" ? (
              <PanelLeftClose aria-hidden="true" />
            ) : (
              <PanelLeftOpen aria-hidden="true" />
            )}
          </button>
        </div>
        <p>Important days, clearly.</p>
        <DesktopNav mode={mode} />
        <AuthControl />
      </aside>
      {mode === "hidden" && (
        <button
          className="sidebar-reveal icon-button"
          aria-label="Show sidebar"
          onClick={() => updateMode("expanded")}
        >
          <PanelLeftOpen aria-hidden="true" />
        </button>
      )}
      <main>
        <PageHeader title={title} back={back} actions={actions} />
        <div className="page-content">{children}</div>
      </main>
      <MobileNav />
    </div>
  );
}
