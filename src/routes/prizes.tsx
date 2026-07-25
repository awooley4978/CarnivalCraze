import { createFileRoute, Link } from "@tanstack/react-router";
import { usePrizes } from "~/context/PrizeContext";

export const Route = createFileRoute("/prizes")({
  component: Prizes,
});

/** Bulb string decoration for the top of the page */
function BulbString() {
  const bulbs = Array.from({ length: 10 }, (_, i) => ({
    lit: i % 2 === 0,
    delayClass: `delay-bulb-${(i % 10) + 1}`,
  }));

  return (
    <div className="flex justify-center gap-2 px-4 py-2">
      {bulbs.map((bulb, i) => (
        <div
          key={i}
          className={`
            animate-blink-bulb ${bulb.delayClass}
            h-3 w-3 sm:h-4 sm:w-4 rounded-full
            ${bulb.lit ? "bg-bulb-gold glow-bulb" : "bg-bulb-off"}
          `}
        />
      ))}
    </div>
  );
}

/** Single prize item displayed on the shelf */
function PrizeItem({ prize }: { prize: string }) {
  // Extract emoji (first 2 chars) and name (rest after space)
  const emoji = prize.slice(0, 2);
  const name = prize.slice(3);

  return (
    <div className="flex flex-col items-center gap-1 animate-bounce-in select-none">
      {/* Prize emoji with glow and wiggle */}
      <div
        className="
          flex items-center justify-center
          text-[4rem] sm:text-[5rem] leading-none
          animate-wiggle
          drop-shadow-[3px_3px_0_var(--color-toon-shadow)]
          relative
        "
        style={{
          filter: "drop-shadow(0 0 12px var(--color-prize-sparkle))",
        }}
      >
        {emoji}
      </div>
      {/* Name label */}
      <span
        className="
          font-toon text-tent-canvas text-xs sm:text-sm
          bg-ink/70 rounded-bounce px-2 py-0.5
          border border-toon-shadow/30
          text-center max-w-[5.5rem] leading-tight
          toon-shadow
        "
        style={{
          boxShadow: "2px 2px 0 var(--color-toon-shadow)",
        }}
      >
        {name}
      </span>
    </div>
  );
}

/** A single wooden shelf row */
function ShelfRow({
  prizes,
  offset,
  shelfIndex,
}: {
  prizes: string[];
  offset: number;
  shelfIndex: number;
}) {
  return (
    <div
      className="relative w-full flex flex-col items-center"
      style={{
        paddingLeft: `${offset}%`,
        paddingRight: `${offset}%`,
      }}
    >
      {/* Prizes sitting on the shelf */}
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-0 items-end px-2 pb-0">
        {prizes.map((prize, i) => (
          <PrizeItem key={`${shelfIndex}-${i}`} prize={prize} />
        ))}
      </div>

      {/* Wooden shelf bar */}
      <div
        className="w-full max-w-lg h-4 sm:h-5 rounded-sm relative z-10"
        style={{
          background:
            "linear-gradient(180deg, #7A4F2B 0%, #5C3A1E 25%, #3E2210 60%, #2A1508 100%)",
          borderTop: "3px solid #9B6B3D",
          borderBottom: "2px solid #1A0A00",
          boxShadow:
            "0 4px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      />

      {/* Shelf bracket — left */}
      <div
        className="absolute bottom-0 w-3 sm:w-4 h-8 sm:h-10"
        style={{
          background:
            "linear-gradient(180deg, #5C3A1E, #2A1508)",
          borderLeft: "2px solid #3E2210",
          borderRight: "2px solid #3E2210",
          boxShadow: "2px 2px 4px rgba(0,0,0,0.5)",
        }}
      />

      {/* Shelf bracket — right */}
      <div
        className="absolute bottom-0 right-0 w-3 sm:w-4 h-8 sm:h-10"
        style={{
          background:
            "linear-gradient(180deg, #5C3A1E, #2A1508)",
          borderLeft: "2px solid #3E2210",
          borderRight: "2px solid #3E2210",
          boxShadow: "-2px 2px 4px rgba(0,0,0,0.5)",
        }}
      />
    </div>
  );
}

function Prizes() {
  const { prizes } = usePrizes();

  // Distribute prizes across 3 shelves
  const shelf1 = prizes.slice(0, Math.ceil(prizes.length / 3));
  const shelf2 = prizes.slice(
    Math.ceil(prizes.length / 3),
    Math.ceil((prizes.length * 2) / 3),
  );
  const shelf3 = prizes.slice(Math.ceil((prizes.length * 2) / 3));

  const isEmpty = prizes.length === 0;

  return (
    <main className="bg-midnight min-h-dvh flex flex-col items-center">
      {/* Bulb string */}
      <BulbString />

      {/* Header */}
      <div className="w-full pt-4 pb-2 text-center animate-bounce-in">
        <h1 className="font-carnival text-electric-yellow text-3xl sm:text-5xl m-0">
          🏆 PRIZE SHELF 🏆
        </h1>
        <p className="font-toon text-tent-canvas/60 text-sm mt-1">
          {isEmpty
            ? "Your shelf is waiting…"
            : `${prizes.length} prize${prizes.length !== 1 ? "s" : ""} collected!`}
        </p>
      </div>

      {/* Shelf area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-4 py-4 gap-10 sm:gap-14">
        {isEmpty ? (
          /* Empty state */
          <div className="flex flex-col items-center gap-6 animate-bounce-in">
            {/* Empty shelf */}
            <div className="relative w-full max-w-md">
              {/* Empty shelf bar */}
              <div
                className="w-full h-5 rounded-sm relative z-10"
                style={{
                  background:
                    "linear-gradient(180deg, #7A4F2B 0%, #5C3A1E 25%, #3E2210 60%, #2A1508 100%)",
                  borderTop: "3px solid #9B6B3D",
                  borderBottom: "2px solid #1A0A00",
                  boxShadow:
                    "0 4px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
              />
              {/* Dust motes / sparkles */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-3xl opacity-60">
                ✨
              </div>
            </div>

            <p className="font-toon text-tent-canvas text-lg sm:text-xl text-center px-4">
              No prizes yet! Go win some games! 🎪
            </p>

            <Link
              to="/"
              className="ribbon-banner text-base no-underline"
            >
              ← Back to Midway
            </Link>
          </div>
        ) : (
          <>
            {/* Shelf 3 (top) — reversed: prizes fill from top to bottom */}
            {shelf3.length > 0 && (
              <ShelfRow prizes={shelf3} offset={12} shelfIndex={2} />
            )}

            {/* Shelf 2 (middle) */}
            {shelf2.length > 0 && (
              <ShelfRow prizes={shelf2} offset={6} shelfIndex={1} />
            )}

            {/* Shelf 1 (bottom) */}
            {shelf1.length > 0 && (
              <ShelfRow prizes={shelf1} offset={0} shelfIndex={0} />
            )}
          </>
        )}
      </div>

      {/* Footer nav */}
      {!isEmpty && (
        <div className="py-6 text-center">
          <Link
            to="/"
            className="font-toon text-tent-canvas/60 hover:text-tent-canvas text-sm no-underline transition-colors"
          >
            ← Back to Midway
          </Link>
        </div>
      )}

      {/* Subtle footer */}
      <footer className="text-center py-3 text-bulb-off font-toon text-xs">
        Carnival Craze
      </footer>
    </main>
  );
}
