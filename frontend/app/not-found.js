import Link from "next/link";

export default function NotFound() {
  return (
    <main className="room-message light">
      <div className="card form-card">
        <h1>Page not found</h1>
        <p className="muted">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className="btn btn-primary">Go home</Link>
      </div>
    </main>
  );
}
