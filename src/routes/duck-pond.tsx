import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useTickets } from "~/context/TicketContext";
import { usePrizes } from "~/context/PrizeContext";

export const Route = createFileRoute("/duck-pond")({
  component: DuckPond,
});

const TOTAL_PICKS = 3;
const DUCK_COUNT = 8;

interface Duck {
  id: number;
  value: number;
  picked: boolean;
  revealed: boolean;
}

type GameState = "playing" | "finished";

/** Weighted random: 1=40%, 2=30%, 3=25%, 5=5% */
function randomTicketValue(): number {
  const rand = Math.random();
  if (rand < 0.4) return 1;
  if (rand < 0.7) return 2;
  if (rand < 0.95) return 3;
  return 5;
}

function generateDucks(): Duck[] {
  return Array.from({ length: DUCK_COUNT }, (_, i) => ({
    id: i,
    value: randomTicketValue(),
    picked: false,
    revealed: false,
  }));
}

function DuckPond() {
  const [ducks, setDucks] = useState<Duck[]>(generateDucks);
  const [picksLeft, setPicksLeft] = useState(TOTAL_PICKS);
  const [gameState, setGameState] = useState<GameState>("playing");
  const [totalReward, setTotalReward] = useState(0);

  const { tickets, earnTickets } = useTickets();
  const { awardPrize } = usePrizes();
  const paidForSession = useRef(false);
  const awardedPrizeRef = useRef<string | null>(null);

  const picksLeftRef = useRef(TOTAL_PICKS);
  const gameStateRef = useRef<GameState>("playing");
  const generationRef = useRef(0);

  // Award tickets and a prize once when the game finishes
  useEffect(() => {
    if (gameState === "finished" && !paidForSession.current) {
      paidForSession.current = true;
      // Compute reward synchronously from picked ducks (values are known immediately)
      const reward = ducks
        .filter((d) => d.picked)
        .reduce((sum, d) => sum + d.value, 0);
      if (reward > 0) {
        earnTickets(reward);
      }
      awardedPrizeRef.current = awardPrize();
    }
  }, [gameState, ducks, earnTickets, awardPrize]);

  // Stable random rotations for each duck position (regenerated on reset)
  const [rotations, setRotations] = useState<number[]>(() =>
    Array.from({ length: DUCK_COUNT }, () => (Math.random() - 0.5) * 20),
  );

  const handleDuckClick = useCallback((id: number) => {
    if (gameStateRef.current !== "playing") return;
    if (picksLeftRef.current <= 0) return;

    let duckValue = 0;

    setDucks((prev) => {
      const duck = prev.find((d) => d.id === id);
      if (!duck || duck.picked) return prev;
      duckValue = duck.value;
      return prev.map((d) => (d.id === id ? { ...d, picked: true } : d));
    });

    // Duck was already picked or not found — bail out
    if (duckValue === 0) return;

    picksLeftRef.current -= 1;
    setPicksLeft(picksLeftRef.current);

    if (picksLeftRef.current <= 0) {
      gameStateRef.current = "finished";
      setGameState("finished");
    }

    const currentGen = generationRef.current;

    // 300ms tension delay, then reveal
    setTimeout(() => {
      // Bail if game was reset (Play Again) before reveal fired
      if (generationRef.current !== currentGen) return;

      setDucks((prev) =>
        prev.map((d) => (d.id === id ? { ...d, revealed: true } : d)),
      );
      setTotalReward((prev) => prev + duckValue);
    }, 300);
  }, []);

  const handlePlayAgain = useCallback(() => {
    generationRef.current += 1;
    setDucks(generateDucks());
    setPicksLeft(TOTAL_PICKS);
    setGameState("playing");
    setTotalReward(0);
    picksLeftRef.current = TOTAL_PICKS;
    gameStateRef.current = "playing";
    paidForSession.current = false;
    awardedPrizeRef.current = null;
    setRotations(
      Array.from({ length: DUCK_COUNT }, () => (Math.random() - 0.5) * 20),
    );
  }, []);

  // Individual duck values for the result display
  const pickedDucks = useMemo(
    () => ducks.filter((d) => d.picked),
    [ducks],
  );

  return (
    <main className="bg-midnight min-h-dvh flex flex-col items-center">
      {/* Header */}
      <div className="w-full pt-6 pb-2 text-center">
        <h1 className="font-carnival text-electric-yellow text-4xl sm:text-5xl m-0">
          🦆 Duck Pond
        </h1>
        <p className="font-toon text-tent-canvas/70 text-sm mt-1">
          Pick {TOTAL_PICKS} ducks — win mystery tickets!
        </p>
      </div>

      {/* Pick counter + ticket balance */}
      <div className="sticky top-0 z-20 py-3 flex gap-4">
        <span className="ticket-counter text-lg sm:text-xl">
          🦆 Picks: {picksLeft}
        </span>
        <span className="ticket-counter text-lg sm:text-xl">
          🎟️ {tickets}
        </span>
      </div>

      {/* Pond play area */}
      <div className="flex-1 flex items-center justify-center w-full px-4">
        <div
          className="
            relative w-full max-w-md aspect-square
            bg-sky-pop/25 rounded-[3rem] border-toon
            shadow-[inset_0_0_60px_rgba(0,0,0,0.25)]
            flex items-center justify-center
            overflow-hidden
          "
        >
          {/* Water ripple decorations */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute top-[20%] left-[15%] w-12 h-12 rounded-full border-2 border-tent-canvas/10" />
            <div className="absolute top-[60%] right-[20%] w-16 h-16 rounded-full border-2 border-tent-canvas/10" />
            <div className="absolute bottom-[25%] left-[25%] w-10 h-10 rounded-full border-2 border-tent-canvas/8" />
            <div className="absolute top-[35%] right-[35%] w-8 h-8 rounded-full border border-tent-canvas/8" />
          </div>

          {/* Duck grid — 4×2 */}
          <div className="grid grid-cols-4 gap-x-3 gap-y-8 px-2 py-6">
            {ducks.map((duck, i) => (
              <DuckItem
                key={duck.id}
                duck={duck}
                rotation={rotations[i]}
                onClick={() => handleDuckClick(duck.id)}
                disabled={gameState !== "playing"}
              />
            ))}
          </div>

          {/* Finished overlay */}
          {gameState === "finished" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-midnight/85 rounded-[3rem]">
              <div className="animate-bounce-in text-center flex flex-col items-center gap-3 px-4">
                <span className="text-5xl">🎉</span>
                <h2 className="font-carnival text-electric-yellow text-3xl sm:text-4xl m-0">
                  You won {totalReward} 🎟️!
                </h2>

                {/* Individual duck reveals */}
                <div className="flex flex-wrap justify-center gap-2 mt-1">
                  {pickedDucks.map((d) => (
                    <span
                      key={d.id}
                      className="font-toon text-tent-canvas text-sm bg-ink/50 rounded-bounce px-3 py-1 border-toon inline-flex items-center gap-1"
                    >
                      {d.revealed ? (
                        <>+{d.value} 🎟️</>
                      ) : (
                        <span className="animate-wiggle">🦆</span>
                      )}
                    </span>
                  ))}
                </div>

                <p className="font-toon text-tent-canvas/60 text-sm">
                  Balance: 🎟️ {tickets}
                </p>

                {awardedPrizeRef.current && (
                  <p className="font-toon text-prize-sparkle text-sm animate-bounce-in glow-prize rounded-bounce px-3 py-1 bg-ink/50">
                    You won {awardedPrizeRef.current}!
                  </p>
                )}

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

      {/* Inline keyframes for duck-specific animations */}
      <style>{`
        @keyframes duck-dip {
          0%   { transform: translateY(0) scale(1); }
          30%  { transform: translateY(10px) scale(0.95); }
          60%  { transform: translateY(2px) scale(1.02); }
          100% { transform: translateY(0) scale(1); }
        }

        @keyframes splash-droplet {
          0%   { transform: translate(0, 0) scale(1); opacity: 0.9; }
          100% { transform: translate(var(--sx, 10px), var(--sy, -15px)) scale(0); opacity: 0; }
        }
      `}</style>
    </main>
  );
}

function DuckItem({
  duck,
  rotation,
  onClick,
  disabled,
}: {
  duck: Duck;
  rotation: number;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || duck.picked}
      className={`
        relative w-16 h-16 cursor-pointer
        select-none outline-none border-none bg-transparent p-0
        ${!duck.picked ? "hover:scale-110 active:scale-95" : ""}
        transition-transform duration-200 ease-out
      `}
      style={{ transform: `rotate(${rotation}deg)` }}
      aria-label={
        duck.revealed
          ? `Duck worth ${duck.value} ticket${duck.value > 1 ? "s" : ""}`
          : duck.picked
            ? "Picked duck, revealing..."
            : "Mystery duck — tap to pick"
      }
    >
      {/* Splash droplets when duck is picked but not yet revealed */}
      {duck.picked && !duck.revealed && (
        <>
          <span
            className="
              absolute left-1/2 top-1/2 z-10
              w-2 h-2 rounded-full bg-sky-pop/60
              pointer-events-none
            "
            style={{
              animation: "splash-droplet 0.35s ease-out forwards",
              "--sx": "-14px",
              "--sy": "-10px",
            } as React.CSSProperties}
          />
          <span
            className="
              absolute left-1/2 top-1/2 z-10
              w-1.5 h-1.5 rounded-full bg-sky-pop/50
              pointer-events-none
            "
            style={{
              animation: "splash-droplet 0.35s ease-out 0.05s forwards",
              "--sx": "12px",
              "--sy": "-8px",
            } as React.CSSProperties}
          />
          <span
            className="
              absolute left-1/2 top-1/2 z-10
              w-1 h-1 rounded-full bg-tent-canvas/50
              pointer-events-none
            "
            style={{
              animation: "splash-droplet 0.3s ease-out 0.08s forwards",
              "--sx": "-8px",
              "--sy": "-14px",
            } as React.CSSProperties}
          />
        </>
      )}

      {/* Duck body */}
      <div
        className={`
          absolute inset-0 bg-electric-yellow rounded-blob
          border-toon toon-shadow
          flex items-center justify-center
          ${duck.picked && !duck.revealed ? "animate-[duck-dip_0.35s_ease-in-out]" : ""}
          ${!duck.picked ? "animate-wiggle" : ""}
          ${duck.revealed ? "scale-0 opacity-0" : ""}
          transition-all duration-200 ease-out
        `}
        style={{
          boxShadow: duck.revealed
            ? undefined
            : "4px 4px 0 var(--color-toon-shadow)",
        }}
      >
        {/* Eye — white with black pupil */}
        <div className="w-3 h-3.5 bg-tent-canvas rounded-full absolute top-[28%] left-[28%] flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-ink rounded-full" />
        </div>

        {/* Beak — orange triangle pointing right */}
        <div
          className="
            absolute top-[42%] -right-[5px]
            w-0 h-0
            border-t-[5px] border-t-transparent
            border-b-[5px] border-b-transparent
            border-l-[9px]
          "
          style={{ borderLeftColor: "var(--color-tangerine)" }}
        />
      </div>

      {/* Revealed ticket */}
      {duck.revealed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center animate-bounce-in">
          <span className="text-xl leading-none">🎟️</span>
          <span className="font-carnival text-electric-yellow text-xs mt-0.5 drop-shadow-[1px_1px_0_var(--color-toon-shadow)]">
            +{duck.value}
          </span>
        </div>
      )}
    </button>
  );
}
