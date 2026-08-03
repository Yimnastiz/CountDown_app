import { CountdownForm } from "@/components/countdown-form";
export default function NewCountdown({
  searchParams,
}: {
  searchParams?: { date?: string };
}) {
  return <CountdownForm prefillDate={searchParams?.date} />;
}
