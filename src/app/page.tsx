"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CirclePlus,
  FolderCog,
  Settings,
} from "lucide-react";
import { AppShell } from "@/components/shell";
import {
  CategoryBadge,
  CountdownCard,
  EmptyState,
  PixelButton,
  PixelCard,
} from "@/components/ui";
import { byDue, formatDue, statusFor, timeLeft } from "@/lib/date";
import { categoryRepository, countdownRepository } from "@/lib/repository";
import type { Category, Countdown } from "@/lib/types";
export default function Dashboard() {
  const [items, setItems] = useState<Countdown[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  useEffect(() => {
    countdownRepository.seed();
    setItems(countdownRepository.list());
    setCats(categoryRepository.list());
  }, []);
  const active = useMemo(
    () =>
      items
        .filter((x) => !["completed", "archived"].includes(x.status))
        .sort(byDue),
    [items],
  );
  const counts = {
    today: active.filter((x) => statusFor(x) === "due-today").length,
    soon: active.filter((x) => {
      const left = timeLeft(x);
      return left.includes("days left") && Number(left.split(" ")[0]) <= 7;
    }).length,
    overdue: active.filter((x) => statusFor(x) === "overdue").length,
    completed: items.filter((x) => x.status === "completed").length,
  };
  const hero = active.find((x) => statusFor(x) !== "overdue") ?? active[0];
  return (
    <AppShell
      title="Count//Down"
      actions={
        <Link href="/settings" aria-label="Settings" className="icon-button">
          <Bell />
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
            View details →
          </Link>
        </PixelCard>
      ) : (
        <EmptyState title="Start your first countdown">
          Keep important dates visible, simple, and calm.
          <Link className="pixel-link" href="/countdowns/new">
            Create first countdown
          </Link>
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
                onOpen={() => location.assign(`/countdowns/${item.id}`)}
              />
            ))}
          </div>
        ) : null}
      </section>
      <section className="section">
        <h2>Quick actions</h2>
        <div className="quick-grid">
          <Link className="quick-action" href="/countdowns/new">
            <CirclePlus />
            Add Countdown
          </Link>
          <Link className="quick-action" href="/calendar">
            <CalendarDays />
            Calendar
          </Link>
          <Link className="quick-action" href="/categories">
            <FolderCog />
            Categories
          </Link>
          <Link className="quick-action" href="/settings">
            <Settings />
            Settings
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
