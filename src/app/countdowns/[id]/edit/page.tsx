"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CountdownForm } from "@/components/countdown-form";
import { AppShell } from "@/components/shell";
import { EmptyState, PixelButton } from "@/components/ui";
import { countdownRepository } from "@/lib/repository";
import type { Countdown } from "@/lib/types";
export default function EditCountdown() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Countdown | null | undefined>();
  useEffect(() => setItem(countdownRepository.get(id) ?? null), [id]);
  if (item === undefined) return null;
  if (!item)
    return (
      <AppShell title="Edit countdown" back>
        <EmptyState title="Countdown not found">
          This item may have been deleted.
          <PixelButton onClick={() => location.assign("/")}>
            Back to dashboard
          </PixelButton>
        </EmptyState>
      </AppShell>
    );
  return <CountdownForm existing={item} />;
}
