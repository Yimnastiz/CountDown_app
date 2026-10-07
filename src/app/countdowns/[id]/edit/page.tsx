"use client";
import { useParams } from "next/navigation";
import { CountdownForm } from "@/components/countdown-form";
import { AppShell } from "@/components/shell";
import { EmptyState, PixelButton } from "@/components/ui";
import { useAppData } from "@/components/app-data";
export default function EditCountdown() {
  const { id } = useParams<{ id: string }>();
  const { countdowns } = useAppData();
  const item = countdowns.find((countdown) => countdown.id === id) ?? null;
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
