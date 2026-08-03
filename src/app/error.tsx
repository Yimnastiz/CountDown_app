"use client";
import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-page">
      <section className="pixel-card">
        <p className="eyebrow">SOMETHING WENT WRONG</p>
        <h1>Count//Down needs another try.</h1>
        <p>Your stored countdown data was not changed.</p>
        <div className="dialog-actions">
          <button className="pixel-button" onClick={reset}>
            Try again
          </button>
          <Link className="pixel-link" href="/">
            Back to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
