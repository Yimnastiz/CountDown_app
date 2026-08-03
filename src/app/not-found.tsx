import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-page">
      <section className="pixel-card">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>This route does not point to a Count//Down page.</p>
        <Link className="pixel-link" href="/">
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}
