"use client";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/shell";
import {
  ConfirmDialog,
  CountdownCard,
  EmptyState,
  PixelButton,
} from "@/components/ui";
import { categoryRepository, countdownRepository } from "@/lib/repository";
import { byDue } from "@/lib/date";
import { getCompletedHistory, occurrenceDateFor } from "@/lib/occurrences";
import type { Category, Countdown } from "@/lib/types";
export default function HistoryPage() {
  const [items, setItems] = useState<Countdown[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [order, setOrder] = useState("newest");
  const [clear, setClear] = useState(false);
  const load = () => {
    setItems(countdownRepository.list());
    setCats(categoryRepository.list());
  };
  useEffect(load, []);
  const results = useMemo(
    () =>
      getCompletedHistory(items)
        .filter(
          (x) =>
            x.title.toLowerCase().includes(query.toLowerCase()) &&
            (category === "all" || x.categoryId === category),
        )
        .sort((a, b) => (order === "newest" ? byDue(b, a) : byDue(a, b))),
    [items, query, category, order],
  );
  return (
    <AppShell title="History">
      <div className="filters">
        <input
          aria-label="Search history"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search history"
        />
        <select
          aria-label="Filter category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort history"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
        >
          <option value="newest">Latest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
      {results.length ? (
        <>
          <div className="list">
            {results.map((i) => (
              <CountdownCard
                key={i.id}
                item={i}
                categories={cats}
                onOpen={() =>
                  location.assign(
                    i.isVirtualOccurrence
                      ? `/countdowns/${i.seriesId}?occurrence=${occurrenceDateFor(i)}`
                      : `/countdowns/${i.id}`,
                  )
                }
              />
            ))}
          </div>
          <PixelButton className="danger" onClick={() => setClear(true)}>
            Clear history
          </PixelButton>
        </>
      ) : (
        <EmptyState title="No history yet">
          Completed and archived countdowns will live here.
        </EmptyState>
      )}
      <ConfirmDialog
        open={clear}
        title="Clear all history?"
        danger
        confirmText="Clear history"
        onClose={() => setClear(false)}
        onConfirm={() => {
          countdownRepository.clearCompletedHistory();
          load();
          setClear(false);
        }}
      >
        This permanently deletes all completed and archived countdowns.
      </ConfirmDialog>
    </AppShell>
  );
}
