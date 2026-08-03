"use client";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CirclePlus,
  FolderCog,
  Settings,
  Star,
  X,
} from "lucide-react";
import { AppShell } from "@/components/shell";
import {
  CategoryBadge,
  CountdownCard,
  EmptyState,
  PixelCard,
} from "@/components/ui";
import { byDue, formatDue, statusFor, timeLeft } from "@/lib/date";
import { CategoryIcon } from "@/lib/icons";
import {
  emptyDashboardFilters,
  filterCountdowns,
  type DashboardFilters,
} from "@/lib/filters";
import { categoryRepository, countdownRepository } from "@/lib/repository";
import type { Category, Countdown } from "@/lib/types";
const parseFilters = (params: URLSearchParams): DashboardFilters => ({
  categoryIds: params.get("categories")?.split(",").filter(Boolean) ?? [],
  importance:
    (params.get("importance") as DashboardFilters["importance"]) || "all",
});
function DashboardContent() {
  const [items, setItems] = useState<Countdown[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = parseFilters(params);
  useEffect(() => {
    countdownRepository.seed();
    setItems(countdownRepository.list());
    setCats(categoryRepository.list());
  }, []);
  const setFilters = (next: DashboardFilters) => {
    const query = new URLSearchParams();
    if (next.categoryIds.length)
      query.set("categories", next.categoryIds.join(","));
    if (next.importance !== "all") query.set("importance", next.importance);
    router.replace(query.size ? `${pathname}?${query}` : pathname);
  };
  const active = useMemo(
    () => filterCountdowns(items, filters).sort(byDue),
    [items, filters],
  );
  const counts = {
    today: active.filter((x) => statusFor(x) === "due-today").length,
    soon: active.filter((x) => {
      const days = Math.ceil(
        (new Date(x.dueAt).getTime() - Date.now()) / 86400000,
      );
      return days > 0 && days <= 7;
    }).length,
    overdue: active.filter((x) => statusFor(x) === "overdue").length,
    completed: items.filter((x) => statusFor(x) === "completed").length,
  };
  const hero = active.find((x) => statusFor(x) !== "overdue") ?? active[0];
  const selectedFilters =
    filters.categoryIds.length + (filters.importance === "all" ? 0 : 1);
  return (
    <AppShell
      title="Count//Down"
      actions={
        <Link href="/settings" aria-label="Settings" className="icon-button">
          <Bell aria-hidden="true" />
        </Link>
      }
    >
      <div className="dashboard-intro">
        <div>
          <p className="eyebrow">
            {new Intl.DateTimeFormat("th-TH", { dateStyle: "full" }).format(
              new Date(),
            )}
          </p>
          <h2>What needs your attention?</h2>
        </div>
      </div>
      <section className="dashboard-filters" aria-label="Dashboard filters">
        <div className="filter-heading">
          <span>
            Filters{selectedFilters ? ` · ${selectedFilters} selected` : ""}
          </span>
          {selectedFilters > 0 && (
            <button
              className="clear-filter"
              onClick={() => setFilters(emptyDashboardFilters)}
            >
              <X size={15} aria-hidden="true" />
              Clear filters
            </button>
          )}
        </div>
        <div
          className="filter-chips"
          role="group"
          aria-label="Filter by category"
        >
          <button
            aria-pressed={!filters.categoryIds.length}
            className={!filters.categoryIds.length ? "selected" : ""}
            onClick={() => setFilters({ ...filters, categoryIds: [] })}
          >
            All
          </button>
          {cats.map((category) => {
            const selected = filters.categoryIds.includes(category.id);
            return (
              <button
                key={category.id}
                aria-pressed={selected}
                className={selected ? "selected" : ""}
                onClick={() =>
                  setFilters({
                    ...filters,
                    categoryIds: selected
                      ? filters.categoryIds.filter((id) => id !== category.id)
                      : [...filters.categoryIds, category.id],
                  })
                }
              >
                <CategoryIcon name={category.icon} size={15} />
                {category.name}
              </button>
            );
          })}
        </div>
        <div
          className="filter-chips importance"
          role="group"
          aria-label="Filter by importance"
        >
          {(["all", "important", "normal"] as const).map((value) => (
            <button
              key={value}
              aria-pressed={filters.importance === value}
              className={filters.importance === value ? "selected" : ""}
              onClick={() => setFilters({ ...filters, importance: value })}
            >
              {value === "important" && <Star size={15} aria-hidden="true" />}{" "}
              {value === "all"
                ? "All priorities"
                : value === "important"
                  ? "Important only"
                  : "Normal only"}
            </button>
          ))}
        </div>
      </section>
      {hero ? (
        <PixelCard className="hero">
          <p className="eyebrow">NEXT UP</p>
          <b className="hero-number">{timeLeft(hero)}</b>
          <h2>{hero.title}</h2>
          <p>{formatDue(hero.dueAt, hero.allDay)}</p>
          <CategoryBadge
            category={cats.find((c) => c.id === hero.categoryId)}
          />
          <Link href={`/countdowns/${hero.id}`} className="pixel-link">
            View details
          </Link>
        </PixelCard>
      ) : (
        <EmptyState
          title={
            selectedFilters
              ? "No countdowns match the selected filters"
              : "Start your first countdown"
          }
        >
          {selectedFilters ? (
            <button
              className="pixel-button"
              onClick={() => setFilters(emptyDashboardFilters)}
            >
              Clear filters
            </button>
          ) : (
            <>
              <span>Keep important dates visible, simple, and calm.</span>
              <Link className="pixel-link" href="/countdowns/new">
                Create first countdown
              </Link>
            </>
          )}
        </EmptyState>
      )}
      <div className="summary-grid">
        {[
          ["Due today", counts.today],
          ["Next 7 days", counts.soon],
          ["Overdue", counts.overdue],
          ["Completed", counts.completed],
        ].map(([label, number]) => (
          <PixelCard key={label as string}>
            <b className="summary-number">{number}</b>
            <span>{label}</span>
          </PixelCard>
        ))}
      </div>
      <section className="section">
        <div className="section-heading">
          <h2>Upcoming countdowns</h2>
          <Link href="/calendar">View calendar</Link>
        </div>
        {active.length ? (
          <div className="list">
            {active.slice(0, 5).map((item) => (
              <CountdownCard
                key={item.id}
                item={item}
                categories={cats}
                onOpen={() => router.push(`/countdowns/${item.id}`)}
              />
            ))}
          </div>
        ) : null}
      </section>
      <section className="section">
        <h2>Quick actions</h2>
        <div className="quick-grid">
          <Link className="quick-action" href="/countdowns/new">
            <CirclePlus aria-hidden="true" />
            Add Countdown
          </Link>
          <Link className="quick-action" href="/calendar">
            <CalendarDays aria-hidden="true" />
            Calendar
          </Link>
          <Link className="quick-action" href="/categories">
            <FolderCog aria-hidden="true" />
            Categories
          </Link>
          <Link className="quick-action" href="/settings">
            <Settings aria-hidden="true" />
            Settings
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
