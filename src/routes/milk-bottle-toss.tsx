import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect } from "react";
import { useTickets } from "~/context/TicketContext";
import { usePrizes } from "~/context/PrizeContext";

export const Route = createFileRoute("/milk-bottle-toss")({
  component: MilkBottleToss,
});

// ── Types ───────────────────────────────────────────
interface Bottle {
  id: number;
  row: number; // 0 = top, 1 = middle, 2 = bottom
  col: number; // column within row
  fallen: boolean;
}

type GameState = "playing" | "won" | "lost";

const TOTAL_THROWS = 4;
const BOTTLE_COUNT = 6;

// Pyramid layout: row 0 (top) has 1 bottle, row 1 has 2, row 2 (bottom) has 3
const PYRAMID: { row: number; col: number }[] = [
  { row: 0, col: 0 }, // top
  { row: 1, col: 0 }, // middle-left
  { row: 1, col: 1 }, // middle-right
  { row: 2, col: 0 }, // bottom-left
  { row: 2, col: 1 }, // bottom-center
  { row: 2, col: 2 }, // bottom-right
];

function generateBottles(): Bottle[] {
  return PYRAMID.map((pos, i) => ({
    id: i,
    row: pos.row,
    col: pos.col,
    fallen: false,
  }));
}

/**
 * Returns which bottle IDs are "above" the given bottle and would fall in a chain reaction.
 * A bottle at (row, col) supports bottles at (row-1, col) and (row-1, col-1).
 */
function getBottlesAbove(bottle: Bottle, allBottles: Bottle[]): Bottle[] {
  return allBottles.filter(
    (b) =>
      !b.fallen &&
      b.row === bottle.row - 1 &&
      (b.col === bottle.col || b.col === bottle.col - 1),
  );
}

/** Recursively mark bottle + chain reaction above it as fallen */
function knockDown(
  bottleId: number,
  bottles: Bottle[],
): Bottle[] {
  const updated = bottles.map((b) =>
    b.id === bottleId ? { ...b, fallen: true } : b,
  );

  // Find newly fallen bottle and knock down bottles above it (recursively)
  const fallenBottle = updated.find((b) => b.id === bottleId)!;
  const aboveBottles = getBottlesAbove(fallenBottle, updated);

  let result = updated;
  for (const above of aboveBottles) {
    if (!result.find((b) => b.id === above.id)!.fallen) {
      result = knockDown(above.id, result);
    }
  }
  return result;
}

// ── Component ──────────────────────────────────────
function MilkBottleToss() {
  const [bottles, setBottles] = useState<Bottle[]>(generateBottles);
  const [throwsLeft, setThrowsLeft] = useState(TOTAL_THROWS);
  const [gameState, setGameState] = useState<GameState>("playing");
  const [lastHitId, setLastHitId] = useState<number | null>(null);

  const { tickets, earnTickets } = useTickets();
  const { awardPrize } = usePrizes();
  const paidForSession = useRef(false);
  const awardedPrizeRef = useRef<string | null>(null);

  // Award tickets and a prize once when the player wins this session
  useEffect(() => {
    if (gameState === "won" && !paidForSession.current) {
      paidForSession.current = true;
      earnTickets(3);
      awardedPrizeRef.current = awardPrize();
    }
  }, [gameState, earnTickets, awardPrize]);

  const handleBottleClick = useCallback(
    (id: number) => {
      if (gameState !== "playing") return;

      const bottle = bottles.find((b) => b.id === id);
      if (!bottle || bottle.fallen) return;

      // Knock down the bottle + chain reaction
      const updatedBottles = knockDown(id, bottles);
      const newThrowsLeft = throwsLeft - 1;

      setBottles(updatedBottles);
      setThrowsLeft(newThrowsLeft);
      setLastHitId(id);

      // Check win/lose
      const allFallen = updatedBottles.every((b) => b.fallen);

      if (allFallen) {
        setGameState("won");
      } else if (newThrowsLeft === 0) {
        setGameState("lost");
      }
    },
    [bottles, throwsLeft, gameState],
  );

  const handlePlayAgain = useCallback(() => {
    setBottles(generateBottles());
    setThrowsLeft(TOTAL_THROWS);
    setGameState("playing");
    setLastHitId(null);
    paidForSession.current = false;
    awardedPrizeRef.current = null;
  }, []);

  const fallenCount = bottles.filter((b) => b.fallen).length;

  // Group bottles by row for rendering
  const bottlesByRow = [0, 1, 2].map((row) =>
    bottles.filter((b) => b.row === row),
  );

  return (
    <main className="bg-midnight min-h-dvh flex flex-col items-center">
      {/* Header */}
      <div className="w-full pt-6 pb-2 text-center">
        <h1 className="font-carnival text-electric-yellow text-3xl sm:text-5xl m-0">
          🥛 Milk Bottle Toss
        </h1>
        <p className="font-toon text-tent-canvas/70 text-sm mt-1">
          Knock down all {BOTTLE_COUNT} bottles with {TOTAL_THROWS} throws!
        </p>
      </div>

      {/* Throw counter + ticket balance */}
      <div className="sticky top-0 z-20 py-3 flex gap-4">
        <span className="ticket-counter text-lg sm:text-xl">
          ⚾ x{throwsLeft}
        </span>
        <span className="ticket-counter text-lg sm:text-xl">
          🎟️ {tickets}
        </span>
      </div>

      {/* Play area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-4 gap-6">
        {/* Booth backdrop */}
        <div
          className="
            relative w-full max-w-md
            bg-ink/40 border-toon rounded-bounce
            shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]
            flex flex-col items-center justify-end
            px-6 pt-8 pb-4
          "
          style={{ minHeight: "380px" }}
        >
          {/* Pyramid of bottles */}
          <div className="flex flex-col items-center gap-2 mb-1">
            {/* Row 0 — top (1 bottle) */}
            <div className="flex justify-center gap-5">
              {bottlesByRow[0].map((bottle) => (
                <BottleItem
                  key={bottle.id}
                  bottle={bottle}
                  onClick={() => handleBottleClick(bottle.id)}
                  disabled={gameState !== "playing"}
                  isLastHit={lastHitId === bottle.id}
                />
              ))}
            </div>

            {/* Row 1 — middle (2 bottles) */}
            <div className="flex justify-center gap-5">
              {bottlesByRow[1].map((bottle) => (
                <BottleItem
                  key={bottle.id}
                  bottle={bottle}
                  onClick={() => handleBottleClick(bottle.id)}
                  disabled={gameState !== "playing"}
                  isLastHit={lastHitId === bottle.id}
                />
              ))}
            </div>

            {/* Row 2 — bottom (3 bottles) */}
            <div className="flex justify-center gap-5">
              {bottlesByRow[2].map((bottle) => (
                <BottleItem
                  key={bottle.id}
                  bottle={bottle}
                  onClick={() => handleBottleClick(bottle.id)}
                  disabled={gameState !== "playing"}
                  isLastHit={lastHitId === bottle.id}
                />
              ))}
            </div>
          </div>

          {/* Shelf / ledge */}
          <div
            className="w-full h-3 rounded-sm mt-0"
            style={{
              background:
                "linear-gradient(180deg, #5C3A1E 0%, #3E2210 40%, #2A1508 100%)",
              borderTop: "3px solid #7A4F2B",
              boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
            }}
          />

          {/* Win overlay */}
          {gameState === "won" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-midnight/85 rounded-bounce">
              <div className="animate-bounce-in text-center flex flex-col items-center gap-3">
                <span className="text-5xl">🎉</span>
                <h2 className="font-carnival text-electric-yellow text-3xl sm:text-4xl m-0">
                  YOU WIN!
                </h2>
                <p className="font-carnival text-tent-canvas text-xl">
                  +3 🎟️
                </p>
                {awardedPrizeRef.current && (
                  <p className="font-toon text-prize-sparkle text-sm animate-bounce-in glow-prize rounded-bounce px-3 py-1 bg-ink/50">
                    You won {awardedPrizeRef.current}!
                  </p>
                )}
                <p className="font-toon text-tent-canvas/60 text-sm">
                  Balance: 🎟️ {tickets}
                </p>
                <button
                  type="button"
                  onClick={handlePlayAgain}
                  className="ribbon-banner text-base cursor-pointer select-none mt-2"
                >
                  Play Again
                </button>
              </div>
            </div>
          )}

          {/* Lose overlay */}
          {gameState === "lost" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-midnight/85 rounded-bounce">
              <div className="animate-bounce-in text-center flex flex-col items-center gap-3">
                <span className="text-5xl">😢</span>
                <h2 className="font-carnival text-hot-magenta text-3xl sm:text-4xl m-0">
                  Out of Throws!
                </h2>
                <p className="font-toon text-tent-canvas/80 text-lg">
                  {fallenCount} of {BOTTLE_COUNT} bottles knocked down
                </p>
                <button
                  type="button"
                  onClick={handlePlayAgain}
                  className="ribbon-banner text-base cursor-pointer select-none mt-2"
                >
                  Play Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tap hint */}
        {gameState === "playing" && (
          <p className="font-toon text-tent-canvas/50 text-xs -mt-2">
            Tap a bottle to throw ⚾
          </p>
        )}
      </div>

      {/* Footer nav */}
      <div className="py-6 text-center">
        <Link
          to="/"
          className="font-toon text-tent-canvas/60 hover:text-tent-canvas text-sm no-underline transition-colors"
        >
          ← Back to Midway
        </Link>
      </div>
    </main>
  );
}

// ── Bottle Item ────────────────────────────────────
function BottleItem({
  bottle,
  onClick,
  disabled,
  isLastHit,
}: {
  bottle: Bottle;
  onClick: () => void;
  disabled: boolean;
  isLastHit: boolean;
}) {
  const isClickable = !disabled && !bottle.fallen;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={`
        relative flex flex-col items-center
        select-none outline-none border-none bg-transparent p-0
        ${isClickable ? "cursor-pointer" : "cursor-default"}
        ${bottle.fallen ? "pointer-events-none" : ""}
      `}
      style={{
        transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease-out",
        transform: bottle.fallen
          ? "rotate(80deg) translateX(20px) translateY(8px)"
          : isClickable
            ? "scale(1)"
            : "scale(1)",
        opacity: bottle.fallen ? 0.35 : 1,
      }}
    >
      {/* Bottle body */}
      <div
        className={`
          relative
          bg-tent-canvas
          rounded-bounce
          border-toon
          shadow-[4px_4px_0_var(--color-toon-shadow)]
          flex flex-col items-center
          transition-transform duration-150
          ${isClickable ? "hover:scale-105 active:scale-95" : ""}
          ${isLastHit && bottle.fallen ? "" : ""}
        `}
        style={{
          width: "44px",
          height: "80px",
        }}
      >
        {/* Bottle neck — slightly narrower */}
        <div
          className="bg-tent-canvas border-toon rounded-bounce"
          style={{
            width: "28px",
            height: "18px",
            marginTop: "-4px",
            borderBottom: "none",
            borderBottomLeftRadius: "0",
            borderBottomRightRadius: "0",
          }}
        />
        {/* Highlight/shine */}
        <div
          className="absolute bg-white/30 rounded-full"
          style={{
            width: "8px",
            height: "30px",
            top: "22px",
            left: "8px",
          }}
        />
      </div>
    </button>
  );
}
