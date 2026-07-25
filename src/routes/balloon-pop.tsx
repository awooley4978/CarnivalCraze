import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback } from "react";

export const Route = createFileRoute("/balloon-pop")({
  component: BalloonPop,
});

const BALLOON_COLORS = [
  "bg-circus-red",
  "bg-hot-magenta",
  "bg-acid-green",
  "bg-electric-yellow",
  "bg-sky-pop",
  "bg-tangerine",
] as const;

const TOTAL_DARTS = 3;
const BALLOON_COUNT = 6;

interface Balloon {
  id: number;
  color: (typeof BALLOON_COLORS)[number];
  popped: boolean;
  offsetX: number;
  offsetY: number;
}

function shuffleColors(): (typeof BALLOON_COLORS)[number][] {
  const colors = [...BALLOON_COLORS];
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }
  return colors;
}

function generateBalloons(): Balloon[] {
  const colors = shuffleColors();
  return colors.map((color, i) => ({
    id: i,
    color,
    popped: false,
    offsetX: (Math.random() - 0.5) * 16,
    offsetY: (Math.random() - 0.5) * 12,
  }));
}

type GameState = "playing" | "won" | "lost";

function BalloonPop() {
  const [balloons, setBalloons] = useState<Balloon[]>(generateBalloons);
  const [dartsLeft, setDartsLeft] = useState(TOTAL_DARTS);
  const [gameState, setGameState] = useState<GameState>("playing");

  const handleBalloonClick = useCallback(
    (id: number) => {
      if (gameState !== "playing") return;

      const balloon = balloons.find((b) => b.id === id);
      if (!balloon || balloon.popped) return;

      // Pop the balloon
      const updatedBalloons = balloons.map((b) =>
        b.id === id ? { ...b, popped: true } : b,
      );
      const newDartsLeft = dartsLeft - 1;

      setBalloons(updatedBalloons);
      setDartsLeft(newDartsLeft);

      // Check win/lose after state update via the updated values
      const allPopped = updatedBalloons.every((b) => b.popped);

      if (allPopped) {
        setGameState("won");
      } else if (newDartsLeft === 0) {
        setGameState("lost");
      }
    },
    [balloons, dartsLeft, gameState],
  );

  const handlePlayAgain = useCallback(() => {
    setBalloons(generateBalloons());
    setDartsLeft(TOTAL_DARTS);
    setGameState("playing");
  }, []);

  const poppedCount = balloons.filter((b) => b.popped).length;

  return (
    <main className="bg-midnight min-h-dvh flex flex-col items-center">
      {/* Header */}
      <div className="w-full pt-6 pb-2 text-center">
        <h1 className="font-carnival text-electric-yellow text-4xl sm:text-5xl m-0">
          🎯 Balloon Pop
        </h1>
        <p className="font-toon text-tent-canvas/70 text-sm mt-1">
          Pop all {BALLOON_COUNT} balloons with {TOTAL_DARTS} darts!
        </p>
      </div>

      {/* Dart counter */}
      <div className="sticky top-0 z-20 py-3">
        <span className="ticket-counter text-lg sm:text-xl">
          🎯 x{dartsLeft}
        </span>
      </div>

      {/* Play area — booth wall */}
      <div className="flex-1 flex items-center justify-center w-full px-4">
        <div
          className="
            relative w-full max-w-md aspect-[4/3]
            bg-ink/40 border-toon rounded-bounce
            shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]
            flex items-center justify-center
          "
        >
          {/* Balloon grid */}
          <div className="grid grid-cols-3 gap-x-6 gap-y-8 px-4">
            {balloons.map((balloon) => (
              <BalloonItem
                key={balloon.id}
                balloon={balloon}
                onClick={() => handleBalloonClick(balloon.id)}
                disabled={gameState !== "playing"}
              />
            ))}
          </div>

          {/* Win overlay */}
          {gameState === "won" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-midnight/80 rounded-bounce">
              <div className="animate-bounce-in text-center flex flex-col items-center gap-3">
                <span className="text-5xl">🎉</span>
                <h2 className="font-carnival text-electric-yellow text-3xl sm:text-4xl m-0">
                  YOU WIN!
                </h2>
                <p className="font-carnival text-tent-canvas text-xl">
                  +2 🎟️
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
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-midnight/80 rounded-bounce">
              <div className="animate-bounce-in text-center flex flex-col items-center gap-3">
                <span className="text-5xl">💨</span>
                <h2 className="font-carnival text-hot-magenta text-3xl sm:text-4xl m-0">
                  Out of Darts!
                </h2>
                <p className="font-toon text-tent-canvas/80 text-lg">
                  {poppedCount} of {BALLOON_COUNT} balloons popped
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

function BalloonItem({
  balloon,
  onClick,
  disabled,
}: {
  balloon: Balloon;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || balloon.popped}
      className={`
        relative flex flex-col items-center cursor-pointer
        select-none outline-none border-none bg-transparent p-0
        transition-transform duration-200 ease-out
        ${balloon.popped ? "scale-0 opacity-0 pointer-events-none" : "hover:scale-110 active:scale-95"}
        ${disabled ? "" : ""}
      `}
      style={{
        transform: balloon.popped
          ? "scale(0)"
          : `translate(${balloon.offsetX}px, ${balloon.offsetY}px)`,
        transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease-out",
      }}
    >
      {/* Balloon shape — circle with knot */}
      <div
        className={`
          ${balloon.color} rounded-blob
          w-20 h-24
          shadow-[6px_6px_0_var(--color-toon-shadow)]
          border-toon
          flex items-center justify-center
          animate-wiggle
        `}
      >
        {/* Shine / highlight */}
        <div className="w-3 h-3 bg-white/40 rounded-full absolute top-3 left-3" />
      </div>
      {/* Knot triangle */}
      <div
        className="
          w-0 h-0
          border-l-[6px] border-r-[6px] border-t-[8px]
          border-l-transparent border-r-transparent
          -mt-[1px]
        "
        style={{ borderTopColor: "var(--color-toon-shadow)" }}
      />
    </button>
  );
}
