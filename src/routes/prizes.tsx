import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/prizes")({
  component: Prizes,
});

function Prizes() {
  return (
    <main className="bg-midnight min-h-dvh flex flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-carnival text-electric-yellow text-4xl sm:text-5xl">
        🧸 Prize Shelf
      </h1>
      <p className="font-toon text-tent-canvas text-lg">
        Coming soon! Your prize collection awaits.
      </p>
      <Link
        to="/"
        className="ribbon-banner text-base no-underline"
      >
        ← Back to Midway
      </Link>
    </main>
  );
}
