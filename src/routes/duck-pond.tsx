import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useTickets } from "~/context/TicketContext";
import { usePrizes } from "~/context/PrizeContext";
import { useSceneTransition } from "~/context/SceneContext";
import { useSwipeGesture } from "~/hooks/useSwipeGesture";
import Confetti from "~/components/Confetti";

export const Route = createFileRoute("/duck-pond")({
  component: DuckPond,
});

const TOTAL_PICKS = 3;
const DUCK_COUNT = 8;

// ── Types ───────────────────────────────────────────
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

// Scatter positions for ducks within the pond oval (x%, y%)
const DUCK_POSITIONS = [
  { x: 18, y: 22 },
  { x: 68, y: 18 },
  { x: 38, y: 42 },
  { x: 78, y: 38 },
  { x: 22, y: 62 },
  { x: 55, y: 58 },
  { x: 80, y: 65 },
  { x: 42, y: 78 },
];

// ── Confetti colours (water-themed) ──────────────────
const WATER_COLORS = ["#00BFFF", "#FFE600", "#39FF14", "#7B2D8E", "#1A8FC0", "#4DC8F0"];

// ── Sub-Components ──────────────────────────────────

/** Life-preserver sign hanging above the track */
function DuckShootSign() {
  return (
    <div className="relative mx-auto mb-3 flex items-center justify-center" aria-hidden>
      {/* Ring — redesigned as a shooting gallery sign */}
      <div
        className="
          relative w-28 h-28 sm:w-36 sm:h-36 rounded-full
          border-[6px] sm:border-[8px] border-electric-yellow
          bg-circus-red/40
          flex items-center justify-center
          shadow-[0_4px_12px_rgba(0,0,0,0.3)]
        "
        style={{
          boxShadow:
            "0 4px 12px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.15)",
        }}
      >
        {/* Inner text area */}
        <div className="text-center px-2">
          <p className="font-carnival text-electric-yellow text-sm sm:text-lg m-0 leading-tight drop-shadow-[2px_2px_0_var(--color-toon-shadow)]">
            DUCK
          </p>
          <p className="font-carnival text-electric-yellow text-sm sm:text-lg m-0 leading-tight drop-shadow-[2px_2px_0_var(--color-toon-shadow)]">
            SHOOT
          </p>
        </div>
      </div>
      {/* Rope hangers */}
      <div className="absolute -top-3 left-[calc(50%-30px)] w-1.5 h-4 bg-tent-canvas/60 rounded-full" />
      <div className="absolute -top-3 left-[calc(50%+30px)] w-1.5 h-4 bg-tent-canvas/60 rounded-full" />
    </div>
  );
}

/** Chalkboard showing ticket balance */
function ChalkboardTickets({ tickets }: { tickets: number }) {
  return (
    <div className="bg-chalkboard rounded-sm px-2 py-1 inline-block shadow-[3px_3px_0_var(--color-toon-shadow)]">
      <p className="text-chalk font-toon text-xs sm:text-sm m-0 leading-tight">
        🎟️ {tickets}
      </p>
    </div>
  );
}

/** Duck shot counter shelf — 3 duck icons, used ones greyed out */
function DuckPickShelf({ used, total }: { used: number; total: number }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* Mini wooden shelf base */}
      <div className="flex items-center gap-1.5 bg-wood-horizontal rounded-sm px-3 py-1.5 border-toon shadow-[3px_3px_0_var(--color-toon-shadow)]">
        {Array.from({ length: total }, (_, i) => {
          const isUsed = i < used;
          return (
            <span
              key={i}
              className={`
                text-xl sm:text-2xl select-none transition-all duration-300 inline-block
                ${isUsed ? "opacity-30 grayscale scale-90 rotate-12" : "opacity-100"}
              `}
              title={isUsed ? "Shot taken" : "Available shot"}
            >
              🦆
            </span>
          );
        })}
        {/* Label */}
        <span className="font-toon text-tent-canvas/70 text-xs ml-1 hidden sm:inline">
          SHOTS
        </span>
      </div>
    </div>
  );
}

/** Water ripples — expanding concentric circles inside the pond */
function WaterRipples() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {[0, 2, 4, 6, 8].map((delay, i) => (
        <div
          key={i}
          className="
            absolute left-1/2 top-1/2
            w-20 h-20 rounded-full
            border-2 border-tent-canvas/15
          "
          style={{
            animation: `water-ripple ${8 + i * 1.5}s ease-out ${delay * 0.8}s infinite`,
            marginLeft: `${(i - 2) * 15}px`,
            marginTop: `${(i % 3) * 12 - 10}px`,
          }}
        />
      ))}
    </div>
  );
}

/** Individual duck on the pond */
function DuckItem({
  duck,
  posX,
  posY,
  rotation,
  bobDelay,
  onClick,
  disabled,
}: {
  duck: Duck;
  posX: number;
  posY: number;
  rotation: number;
  bobDelay: number;
  onClick: () => void;
  disabled: boolean;
}) {
  const isPicked = duck.picked;
  const isRevealed = duck.revealed;
  const isIdle = !isPicked && !isRevealed;

  if (isRevealed) {
    // Revealed state: ticket value bubble rising
    return (
      <div
        className="absolute pointer-events-none select-none"
        style={{
          left: `${posX}%`,
          top: `${posY}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        {/* Bubble with ticket value */}
        <div
          className="
            flex items-center justify-center
            bg-tent-canvas/90 rounded-full
            border-2 border-electric-yellow
            px-2 py-0.5
            shadow-[0_2px_8px_rgba(0,0,0,0.2)]
          "
          style={{
            animation: "bubble-rise 1.2s ease-out forwards",
          }}
        >
          <span className="font-carnival text-ink text-xs whitespace-nowrap">
            +{duck.value} 🎟️
          </span>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isPicked}
      className={`
        absolute select-none outline-none border-none bg-transparent p-0
        ${isIdle ? "cursor-pointer" : "cursor-default"}
        ${isIdle ? "active:scale-90" : ""}
        transition-transform duration-150
      `}
      style={{
        left: `${posX}%`,
        top: `${posY}%`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      }}
      aria-label={
        isRevealed
          ? `Duck worth ${duck.value} ticket${duck.value > 1 ? "s" : ""}`
          : isPicked
            ? "Picked duck, revealing..."
            : "Mystery duck — tap to pick"
      }
    >
      {/* Ripple burst from pick point */}
      {isPicked && !isRevealed && (
        <>
          <div
            className="
              absolute left-1/2 top-1/2
              w-4 h-4 rounded-full border-2 border-sky-pop/60
              pointer-events-none
            "
            style={{
              animation: "ripple-burst 0.8s ease-out forwards",
            }}
          />
          <div
            className="
              absolute left-1/2 top-1/2
              w-4 h-4 rounded-full border-2 border-tent-canvas/30
              pointer-events-none
            "
            style={{
              animation: "ripple-burst 0.8s ease-out 0.15s forwards",
            }}
          />
        </>
      )}

      {/* Splash droplets */}
      {isPicked && !isRevealed && (
        <>
          <span
            className="absolute left-1/2 top-1/2 z-10 w-2 h-2 rounded-full bg-sky-pop/60 pointer-events-none"
            style={{
              animation: "splash-droplet 0.4s ease-out forwards",
              "--sx": "-14px",
              "--sy": "-10px",
            } as React.CSSProperties}
          />
          <span
            className="absolute left-1/2 top-1/2 z-10 w-1.5 h-1.5 rounded-full bg-sky-pop/50 pointer-events-none"
            style={{
              animation: "splash-droplet 0.4s ease-out 0.05s forwards",
              "--sx": "12px",
              "--sy": "-8px",
            } as React.CSSProperties}
          />
          <span
            className="absolute left-1/2 top-1/2 z-10 w-1.5 h-1.5 rounded-full bg-tent-canvas/50 pointer-events-none"
            style={{
              animation: "splash-droplet 0.35s ease-out 0.08s forwards",
              "--sx": "-8px",
              "--sy": "-14px",
            } as React.CSSProperties}
          />
          <span
            className="absolute left-1/2 top-1/2 z-10 w-1 h-1 rounded-full bg-electric-yellow/60 pointer-events-none"
            style={{
              animation: "splash-droplet 0.38s ease-out 0.03s forwards",
              "--sx": "6px",
              "--sy": "-12px",
            } as React.CSSProperties}
          />
        </>
      )}

      {/* Duck body */}
      <div
        className={`
          relative w-14 h-14 sm:w-16 sm:h-16
          ${isIdle ? "animate-wiggle" : ""}
          ${isPicked ? "pointer-events-none" : ""}
        `}
        style={{
          ...(isIdle
            ? {
                animationName: "duck-dip",
                animationDuration: `${3.5 + bobDelay * 0.4}s`,
                animationTimingFunction: "ease-in-out",
                animationIterationCount: "infinite",
                animationDelay: `${bobDelay * 0.6}s`,
              }
            : {}),
          ...(isPicked && !isRevealed
            ? {
                animation: "duck-sink 0.35s ease-in forwards",
              }
            : {}),
          ...(isRevealed && !isPicked
            ? {
                animation: "duck-emerge 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
              }
            : {}),
        }}
      >
        {/* Duck shape — yellow blob with eye and beak */}
        <div
          className="
            w-full h-full bg-electric-yellow rounded-blob
            border-toon toon-shadow
            flex items-center justify-center
            relative
          "
          style={{
            boxShadow: "4px 4px 0 var(--color-toon-shadow)",
          }}
        >
          {/* Eye */}
          <div className="w-3 h-3.5 bg-tent-canvas rounded-full absolute top-[28%] left-[28%] flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-ink rounded-full" />
          </div>
          {/* Beak */}
          <div
            className="
              absolute top-[38%] -right-[4px]
              w-0 h-0
              border-t-[5px] border-t-transparent
              border-b-[5px] border-b-transparent
              border-l-[9px]
            "
            style={{ borderLeftColor: "var(--color-tangerine)" }}
          />
        </div>
      </div>
    </button>
  );
}

// ── Main Component ──────────────────────────────────

function DuckPond() {
  const [ducks, setDucks] = useState<Duck[]>(generateDucks);
  const [picksLeft, setPicksLeft] = useState(TOTAL_PICKS);
  const [gameState, setGameState] = useState<GameState>("playing");
  const [totalReward, setTotalReward] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  /** Track which ducks are in their "sinking" (picked, not yet revealed) phase */
  const [sinkingIds, setSinkingIds] = useState<Set<number>>(new Set());

  const { tickets, earnTickets } = useTickets();
  const { awardPrize } = usePrizes();
  const { triggerTransition } = useSceneTransition();
  const navigate = useNavigate();

  const paidForSession = useRef(false);
  const awardedPrizeRef = useRef<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  const picksLeftRef = useRef(TOTAL_PICKS);
  const gameStateRef = useRef<GameState>("playing");
  const generationRef = useRef(0);

  // ── Curtain exit via scene context ──
  const exitToMidway = useCallback(() => {
    triggerTransition(() => {
      navigate({ to: "/" });
    });
  }, [triggerTransition, navigate]);

  // ── Swipe-down gesture ──
  useSwipeGesture(mainRef, exitToMidway, 80);

  // ── Award tickets and a prize once when the game finishes ──
  useEffect(() => {
    if (gameState === "finished" && !paidForSession.current) {
      paidForSession.current = true;
      const reward = ducks
        .filter((d) => d.picked)
        .reduce((sum, d) => sum + d.value, 0);
      if (reward > 0) {
        earnTickets(reward);
      }
      awardedPrizeRef.current = awardPrize();
      // Trigger confetti after a tiny delay so the overlay renders first
      setTimeout(() => setShowConfetti(true), 100);
    }
  }, [gameState, ducks, earnTickets, awardPrize]);

  // ── Stable random rotations for each duck position ──
  const [rotations] = useState<number[]>(() =>
    Array.from({ length: DUCK_COUNT }, () => (Math.random() - 0.5) * 20),
  );

  // ── Bob delays for staggered bobbing ──
  const [bobDelays] = useState<number[]>(() =>
    Array.from({ length: DUCK_COUNT }, () => Math.random() * 5),
  );

  // ── Handle duck tap ──
  const handleDuckClick = useCallback(
    (id: number) => {
      if (gameStateRef.current !== "playing") return;
      if (picksLeftRef.current <= 0) return;

      let duckValue = 0;

      setDucks((prev) => {
        const duck = prev.find((d) => d.id === id);
        if (!duck || duck.picked) return prev;
        duckValue = duck.value;
        return prev.map((d) => (d.id === id ? { ...d, picked: true } : d));
      });

      if (duckValue === 0) return;

      // Mark as sinking for animation
      setSinkingIds((prev) => new Set(prev).add(id));

      picksLeftRef.current -= 1;
      setPicksLeft(picksLeftRef.current);

      if (picksLeftRef.current <= 0) {
        gameStateRef.current = "finished";
        setGameState("finished");
      }

      const currentGen = generationRef.current;

      // 300ms tension delay, then reveal
      setTimeout(() => {
        if (generationRef.current !== currentGen) return;

        setSinkingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setDucks((prev) =>
          prev.map((d) => (d.id === id ? { ...d, revealed: true } : d)),
        );
        setTotalReward((prev) => prev + duckValue);
      }, 300);
    },
    [],
  );

  // ── Play again ──
  const handlePlayAgain = useCallback(() => {
    generationRef.current += 1;
    setDucks(generateDucks());
    setPicksLeft(TOTAL_PICKS);
    setGameState("playing");
    setTotalReward(0);
    setShowConfetti(false);
    setSinkingIds(new Set());
    picksLeftRef.current = TOTAL_PICKS;
    gameStateRef.current = "playing";
    paidForSession.current = false;
    awardedPrizeRef.current = null;
  }, []);

  // Individual duck values for the result display
  const pickedDucks = useMemo(
    () => ducks.filter((d) => d.picked),
    [ducks],
  );

  const usedPicks = TOTAL_PICKS - picksLeft;

  return (
    <main
      ref={mainRef}
      className={`
        relative min-h-dvh overflow-hidden
        touch-pan-y
        select-none
      `}
      style={{ backgroundColor: "var(--color-midnight)" }}
    >
      {/* ═══ BOOTH INTERIOR ═══ */}

      {/* Ceiling — dark tent canvas strip */}
      <div
        className="absolute top-0 left-0 right-0 h-10 sm:h-12 z-10"
        style={{
          background:
            "linear-gradient(180deg, #0D0517 0%, #1A0A2E 60%, transparent 100%)",
        }}
      >
        <div className="absolute bottom-1 left-4 right-4 h-px bg-tent-canvas/10" />
      </div>

      {/* Back wall — blue-striped tent fabric (sky-pop + deep-purple) */}
      <div
        className="absolute inset-0 z-0 animate-tent-stripe-wave"
        style={{
          background: `repeating-linear-gradient(
            90deg,
            var(--color-sky-pop) 0px,
            var(--color-sky-pop) 42px,
            var(--color-deep-purple) 42px,
            var(--color-deep-purple) 48px,
            var(--color-tent-canvas) 48px,
            var(--color-tent-canvas) 54px,
            var(--color-deep-purple) 54px,
            var(--color-deep-purple) 60px,
            var(--color-sky-pop) 60px,
            var(--color-sky-pop) 102px
          )`,
        }}
      />

      {/* ═══ CHALKBOARD (top-right) ═══ */}
      <div className="absolute top-12 sm:top-14 right-3 sm:right-4 z-20">
        <ChalkboardTickets tickets={tickets} />
      </div>

      {/* ═══ EXIT SIGN (top-right, below chalkboard) ═══ */}
      <button
        type="button"
        onClick={exitToMidway}
        className={`
          absolute top-28 sm:top-32 right-3 sm:right-4 z-20
          exit-sign text-xs sm:text-sm
          bg-transparent border-none cursor-pointer
          hover:scale-110 active:scale-95
          transition-transform
        `}
        aria-label="Exit to midway"
      >
        EXIT &rarr;
      </button>

      {/* ═══ CENTER AREA: SIGN + POND ═══ */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-dvh px-3 pt-14 pb-28">
        {/* Duck Shoot Sign */}
        <DuckShootSign />

        {/* Pond Basin — built into the floor */}
        <div className="relative w-full max-w-md mx-auto">
          {/* Outer wooden rim (slightly larger than pond) */}
          <div
            className="
              relative mx-auto
              rounded-[45%] border-[8px] sm:border-[10px]
              shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_2px_8px_rgba(0,0,0,0.3)]
            "
            style={{
              width: "92%",
              aspectRatio: "1 / 1.1",
              borderColor: "var(--color-wood-dark)",
              background: `linear-gradient(180deg,
                var(--color-wood-light) 0%,
                var(--color-wood-dark) 30%,
                var(--color-wood-dark) 100%
              )`,
              boxShadow:
                "0 4px 16px rgba(0,0,0,0.5), inset 0 2px 8px rgba(0,0,0,0.3), 6px 6px 0 var(--color-toon-shadow)",
            }}
          >
            {/* Inner water surface */}
            <div
              className="
                absolute inset-2 sm:inset-3
                rounded-[42%]
                overflow-hidden
              "
              style={{
                backgroundColor: "#0D3B66",
                background:
                  "radial-gradient(ellipse at 40% 30%, #1A6B8A 0%, #0D3B66 50%, #092A45 100%)",
                boxShadow: "inset 0 0 40px rgba(0,0,0,0.4)",
              }}
            >
              {/* Water ripples */}
              <WaterRipples />

              {/* Ducks scattered on pond */}
              {ducks.map((duck, i) => (
                <DuckItem
                  key={duck.id}
                  duck={duck}
                  posX={DUCK_POSITIONS[i].x}
                  posY={DUCK_POSITIONS[i].y}
                  rotation={rotations[i]}
                  bobDelay={bobDelays[i]}
                  onClick={() => handleDuckClick(duck.id)}
                  disabled={gameState !== "playing"}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ WOODEN COUNTER (bottom) ═══ */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {/* Counter top edge */}
        <div className="h-3 sm:h-4 bg-wood-horizontal border-t-2 border-toon-shadow" />
        {/* Counter face */}
        <div
          className="bg-wood pt-2 pb-4 px-4 sm:px-6 flex items-center justify-center gap-4"
          style={{
            borderTop: "3px solid var(--color-wood-light)",
          }}
        >
          <DuckPickShelf used={usedPicks} total={TOTAL_PICKS} />
          <div className="text-tent-canvas/40 font-toon text-xs hidden sm:block">
            · · · take a shot · · ·
          </div>
        </div>
      </div>

      {/* ═══ FINISHED OVERLAY (full-screen takeover) ═══ */}
      {gameState === "finished" && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center"
          style={{ backgroundColor: "rgba(26, 10, 46, 0.85)" }}
        >
          <div className="animate-bounce-in text-center flex flex-col items-center gap-3 px-4">
            <span className="text-5xl sm:text-6xl">🎉</span>
            <h2 className="font-carnival text-electric-yellow text-3xl sm:text-5xl m-0 leading-tight">
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

            {/* Prize reveal with spotlight */}
            {awardedPrizeRef.current && (
              <div
                className="relative mt-2 mb-1 px-6 py-3 rounded-bounce animate-bounce-in border-toon"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(0,191,255,0.25) 0%, rgba(26,10,46,0.8) 70%)",
                  animationDelay: "0.4s",
                }}
              >
                <p className="font-toon text-prize-sparkle text-sm sm:text-base m-0 glow-prize">
                  🎁 You won:{" "}
                  <span className="font-carnival">{awardedPrizeRef.current}</span>
                </p>
              </div>
            )}

            <p className="font-toon text-tent-canvas/60 text-sm m-0">
              Balance: 🎟️ {tickets}
            </p>

            <button
              type="button"
              onClick={handlePlayAgain}
              className="ribbon-banner text-base sm:text-lg cursor-pointer select-none mt-2"
            >
              Play Again
            </button>

            <button
              type="button"
              onClick={exitToMidway}
              className="font-toon text-tent-canvas/50 hover:text-tent-canvas text-sm bg-transparent border-none cursor-pointer mt-1 transition-colors"
            >
              Back to Midway
            </button>
          </div>
        </div>
      )}

      {/* ═══ CONFETTI (finished only) ═══ */}
      {showConfetti && gameState === "finished" && (
        <Confetti count={50} colors={WATER_COLORS} />
      )}
    </main>
  );
}
