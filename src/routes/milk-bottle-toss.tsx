import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useTickets } from "~/context/TicketContext";
import { usePrizes } from "~/context/PrizeContext";
import { useSceneTransition } from "~/context/SceneContext";
import { useSwipeGesture } from "~/hooks/useSwipeGesture";
import Confetti from "~/components/Confetti";

export const Route = createFileRoute("/milk-bottle-toss")({
  component: MilkBottleToss,
});

// ── Constants ──────────────────────────────────────
const TOTAL_THROWS = 4;
const BOTTLE_COUNT = 6;

// Pyramid layout: row 0 (top) has 1, row 1 has 2, row 2 (bottom) has 3
const PYRAMID: { row: number; col: number }[] = [
  { row: 0, col: 0 }, // top
  { row: 1, col: 0 }, // middle-left
  { row: 1, col: 1 }, // middle-right
  { row: 2, col: 0 }, // bottom-left
  { row: 2, col: 1 }, // bottom-center
  { row: 2, col: 2 }, // bottom-right
];

// ── Types ───────────────────────────────────────────
type BottlePhase = "standing" | "hit" | "toppling" | "settling" | "fallen";

interface DustParticle {
  id: number;
  dx: number; // px horizontal scatter
  dy: number; // px vertical scatter
  size: number; // px
}

interface Bottle {
  id: number;
  row: number;
  col: number;
  phase: BottlePhase;
  fallDir: 1 | -1; // 1 = right, -1 = left
  slideDist: number; // px to slide during topple
  dustParticles: DustParticle[];
}

type GameState = "playing" | "won" | "lost";

// ── Helpers ────────────────────────────────────────

function generateBottles(): Bottle[] {
  return PYRAMID.map((pos, i) => ({
    id: i,
    row: pos.row,
    col: pos.col,
    phase: "standing",
    // Bottom row bottles slide more (more inertia); top bottles wobble
    slideDist: pos.row === 2 ? 10 + Math.random() * 12 : 6 + Math.random() * 8,
    // Alternate fall direction per column for visual variety
    fallDir: (pos.col % 2 === 0 ? 1 : -1) as 1 | -1,
    dustParticles: [],
  }));
}

/**
 * Returns which bottle IDs are "above" the given bottle and would fall
 * in a chain reaction. A bottle at (row, col) supports bottles at
 * (row-1, col) and (row-1, col-1).
 */
function getBottlesAbove(bottle: Bottle, allBottles: Bottle[]): Bottle[] {
  return allBottles.filter(
    (b) =>
      b.row === bottle.row - 1 &&
      (b.col === bottle.col || b.col === bottle.col - 1),
  );
}

/**
 * Recursively collect all bottles in the chain reaction in BFS order
 * (hit bottle first, then its direct supports, then their supports...).
 */
function collectChain(
  startId: number,
  bottles: Bottle[],
): Bottle[] {
  const result: Bottle[] = [];
  const seen = new Set<number>();
  const queue = [startId];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const bottle = bottles.find((b) => b.id === id);
    if (!bottle) continue;
    result.push(bottle);
    const above = getBottlesAbove(bottle, bottles);
    // Add above bottles — push left then right for consistent visual order
    const sorted = [...above].sort((a, b) => a.col - b.col);
    for (const ab of sorted) {
      if (!seen.has(ab.id)) queue.push(ab.id);
    }
  }

  return result;
}

function generateDustParticles(): DustParticle[] {
  const count = 3 + Math.floor(Math.random() * 3); // 3–5
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    dx: (Math.random() - 0.5) * 30, // -15 to +15px
    dy: -(8 + Math.random() * 16), // -8 to -24px (mostly upward)
    size: 2 + Math.random() * 3, // 2–5px
  }));
}

// ── Diegetic UI Sub-components ─────────────────────

/** Wooden sign hanging above the booth: "BOTTLE BASH" */
function BashSign({ glow }: { glow?: boolean }) {
  return (
    <div
      className={`
        relative mx-auto mb-1
        bg-wood-horizontal border-toon rounded-bounce
        px-4 py-1 sm:px-6 sm:py-2
        shadow-[4px_4px_0_var(--color-toon-shadow)]
        ${glow ? "animate-pulse-glow" : ""}
      `}
    >
      <p className="font-carnival text-tent-canvas text-lg sm:text-2xl m-0 text-center leading-tight">
        BOTTLE BASH
      </p>
      {/* Hanging rope illusion */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-1 h-3 bg-tent-canvas/60 rounded-full" />
      <div className="absolute -top-3 left-[calc(50%-18px)] w-1 h-3 bg-tent-canvas/60 rounded-full" />
      <div className="absolute -top-3 left-[calc(50%+18px)] w-1 h-3 bg-tent-canvas/60 rounded-full" />
    </div>
  );
}

/** Chalkboard on the right wall showing ticket balance */
function ChalkboardTickets({ tickets }: { tickets: number }) {
  return (
    <div className="bg-chalkboard rounded-sm px-2 py-1 inline-block shadow-[3px_3px_0_var(--color-toon-shadow)]">
      <p className="text-chalk font-toon text-xs sm:text-sm m-0 leading-tight">
        🎟️ {tickets}
      </p>
    </div>
  );
}

/** Physical baseball ammo display in the wooden crate */
function BaseballDisplay({ used, total }: { used: number; total: number }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {Array.from({ length: total }, (_, i) => {
        const isUsed = i < used;
        return (
          <div
            key={i}
            className={`
              relative text-2xl sm:text-3xl select-none transition-all duration-300
              ${isUsed ? "opacity-20 translate-y-1.5 grayscale" : "opacity-100 translate-y-0"}
            `}
            title={isUsed ? "Thrown" : "Ready"}
          >
            ⚾
            {/* "Taken" mark when used */}
            {isUsed && (
              <div className="absolute bottom-0.5 left-2 right-2 h-0.5 bg-wood-dark rounded-full" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Bottle Item ─────────────────────────────────────

function BottleItem({
  bottle,
  isNearWin,
  onClick,
  disabled,
}: {
  bottle: Bottle;
  isNearWin: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const isStanding = bottle.phase === "standing";
  const isHit = bottle.phase === "hit";
  const isToppling = bottle.phase === "toppling";
  const isSettling = bottle.phase === "settling";
  const isFallen = bottle.phase === "fallen";
  const isClickable = isStanding && !disabled;

  const fallDir = bottle.fallDir;
  const slideDist = bottle.slideDist;

  // Style based on phase
  const getTransform = (): string => {
    if (isStanding) return "rotate(0deg) translateY(0) translateX(0)";
    if (isHit) return "rotate(-16deg) translateY(-5px) translateX(0)";
    if (isToppling)
      return `rotate(${fallDir * 83}deg) translateY(12px) translateX(${fallDir * slideDist}px)`;
    if (isSettling || isFallen)
      return `rotate(${fallDir * 83}deg) translateY(12px) translateX(${fallDir * slideDist}px)`;
    return "";
  };

  const getOpacity = (): number => {
    if (isStanding) return 1;
    if (isHit) return 1;
    if (isToppling) return 0.5;
    if (isSettling) return 0.4;
    if (isFallen) return 0.35;
    return 1;
  };

  const getTransition = (): string => {
    if (isHit) return "transform 0.15s ease-out, opacity 0.15s ease-out";
    if (isToppling)
      return "transform 0.25s cubic-bezier(0.25,0.1,0.25,1), opacity 0.25s ease-out";
    if (isSettling)
      return "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease-out";
    if (isFallen) return "none";
    if (isClickable)
      return "transform 0.15s ease-out, opacity 0.15s ease-out";
    return "none";
  };

  if (isFallen) {
    // Render fallen bottle statically in final position
    return (
      <div
        className="relative flex flex-col items-center select-none pointer-events-none"
        style={{
          transform: getTransform(),
          opacity: getOpacity(),
        }}
      >
        <BottleBody isNearWin={false} isShimmering={false} isClickable={false} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={`
        relative flex flex-col items-center
        select-none outline-none border-none bg-transparent p-0
        ${isClickable ? "cursor-pointer" : "cursor-default"}
      `}
      style={{
        transform: getTransform(),
        opacity: getOpacity(),
        transition: getTransition(),
      }}
    >
      {/* Dust particles — visible during settling phase */}
      {(isSettling || isToppling) &&
        bottle.dustParticles.map((p) => (
          <div
            key={p.id}
            className="absolute z-20 rounded-full pointer-events-none"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: "#D4B896",
              left: "50%",
              top: "85%", // near bottle base
              animation: "dust-particle 0.35s ease-out forwards",
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
            } as React.CSSProperties}
          />
        ))}

      <BottleBody
        isNearWin={isNearWin}
        isShimmering={isNearWin && isStanding}
        isClickable={isClickable}
      />
    </button>
  );
}

/** The visual bottle body — shared between standing and fallen states */
function BottleBody({
  isNearWin,
  isShimmering,
  isClickable,
}: {
  isNearWin: boolean;
  isShimmering: boolean;
  isClickable: boolean;
}) {
  return (
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
        ${isShimmering ? "animate-[bottle-shimmer_1.2s_ease-in-out_infinite]" : ""}
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
      {/* Label — faint milk bottle text */}
      <div
        className="absolute bottom-2 left-0 right-0 text-center font-toon text-ink/15 text-[8px] leading-none"
      >
        MILK
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────

function MilkBottleToss() {
  const [bottles, setBottles] = useState<Bottle[]>(generateBottles);
  const [throwsLeft, setThrowsLeft] = useState(TOTAL_THROWS);
  const [gameState, setGameState] = useState<GameState>("playing");
  const [showConfetti, setShowConfetti] = useState(false);

  const { tickets, earnTickets } = useTickets();
  const { awardPrize } = usePrizes();
  const { triggerTransition } = useSceneTransition();
  const navigate = useNavigate();

  const paidForSession = useRef(false);
  const awardedPrizeRef = useRef<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  // Track timeouts so we can clear them on play-again
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Curtain exit via scene context ──
  const exitToMidway = useCallback(() => {
    // Clear any pending timeouts
    for (const t of timeoutRefs.current) clearTimeout(t);
    timeoutRefs.current = [];
    triggerTransition(() => {
      navigate({ to: "/" });
    });
  }, [triggerTransition, navigate]);

  // ── Swipe-down gesture ──
  useSwipeGesture(mainRef, exitToMidway, 80);

  // ── Award tickets + prize on win ──
  useEffect(() => {
    if (gameState === "won" && !paidForSession.current) {
      paidForSession.current = true;
      earnTickets(3);
      awardedPrizeRef.current = awardPrize();
      setTimeout(() => setShowConfetti(true), 100);
    }
  }, [gameState, earnTickets, awardPrize]);

  // ── Handle bottle tap ──
  const handleBottleClick = useCallback(
    (id: number) => {
      if (gameState !== "playing") return;

      const bottle = bottles.find((b) => b.id === id);
      if (!bottle || bottle.phase !== "standing") return;

      // Calculate the chain of bottles that will fall
      const chain = collectChain(id, bottles);
      const newThrowsLeft = throwsLeft - 1;
      setThrowsLeft(newThrowsLeft);

      // Stagger duration between chain bottles: 60–80ms
      const staggerMs = 60 + Math.random() * 20;

      // Schedule each bottle in the chain
      chain.forEach((chainBottle, index) => {
        const offset = index * staggerMs;

        // Stage 1: hit
        const t1 = setTimeout(() => {
          setBottles((prev) =>
            prev.map((b) =>
              b.id === chainBottle.id ? { ...b, phase: "hit" as BottlePhase } : b,
            ),
          );
        }, offset);
        timeoutRefs.current.push(t1);

        // Stage 2: topple (150ms after hit)
        const t2 = setTimeout(() => {
          setBottles((prev) =>
            prev.map((b) =>
              b.id === chainBottle.id
                ? {
                    ...b,
                    phase: "toppling" as BottlePhase,
                    dustParticles: generateDustParticles(),
                  }
                : b,
            ),
          );
        }, offset + 150);
        timeoutRefs.current.push(t2);

        // Stage 3: settle (400ms after hit = 150 + 250)
        const t3 = setTimeout(() => {
          setBottles((prev) =>
            prev.map((b) =>
              b.id === chainBottle.id
                ? { ...b, phase: "settling" as BottlePhase }
                : b,
            ),
          );
        }, offset + 400);
        timeoutRefs.current.push(t3);

        // Stage 4: fallen (600ms after hit = 150 + 250 + 200)
        const t4 = setTimeout(() => {
          setBottles((prev) => {
            const updated = prev.map((b) =>
              b.id === chainBottle.id
                ? { ...b, phase: "fallen" as BottlePhase, dustParticles: [] }
                : b,
            );

            // Check win/lose on the last chain bottle
            if (chainBottle.id === chain[chain.length - 1].id) {
              const allFallen = updated.every((b) => b.phase === "fallen");
              if (allFallen) {
                setGameState("won");
              } else if (newThrowsLeft <= 0) {
                setGameState("lost");
              }
            }

            return updated;
          });
        }, offset + 600);
        timeoutRefs.current.push(t4);
      });
    },
    [bottles, throwsLeft, gameState],
  );

  // ── Play again ──
  const handlePlayAgain = useCallback(() => {
    // Clear all pending timeouts
    for (const t of timeoutRefs.current) clearTimeout(t);
    timeoutRefs.current = [];
    setBottles(generateBottles());
    setThrowsLeft(TOTAL_THROWS);
    setGameState("playing");
    setShowConfetti(false);
    paidForSession.current = false;
    awardedPrizeRef.current = null;
  }, []);

  // ── Derived state ──
  const fallenCount = bottles.filter((b) => b.phase === "fallen").length;
  const usedThrows = TOTAL_THROWS - throwsLeft;
  const isNearWin =
    gameState === "playing" &&
    fallenCount >= 4 &&
    throwsLeft === 1 &&
    bottles.some((b) => b.phase === "standing");

  // Confetti palette — warm bottle-themed colors
  const confettiColors = useMemo(
    () => [
      "#FFF8E7", // tent-canvas
      "#FF6B1A", // tangerine
      "#7A4F2B", // wood-light
      "#FFE600", // electric-yellow
      "#39FF14", // acid-green
      "#C4A265", // cork
    ],
    [],
  );

  // Group bottles by row for rendering
  const bottlesByRow = useMemo(
    () => [0, 1, 2].map((row) => bottles.filter((b) => b.row === row)),
    [bottles],
  );

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

      {/* Ceiling — dark canvas tent strip */}
      <div
        className="absolute top-0 left-0 right-0 h-10 sm:h-12 z-10"
        style={{
          background:
            "linear-gradient(180deg, #0D0517 0%, #1A0A2E 60%, transparent 100%)",
        }}
      >
        <div className="absolute bottom-1 left-4 right-4 h-px bg-tent-canvas/10" />
      </div>

      {/* Back wall — warm canvas with tangerine stripes */}
      <div
        className={`
          absolute inset-0 z-0
          ${gameState === "won" ? "animate-shake-tent" : "animate-tent-stripe-wave"}
        `}
        style={{
          background: `repeating-linear-gradient(
            90deg,
            var(--color-tent-canvas) 0px,
            var(--color-tent-canvas) 52px,
            var(--color-tangerine) 52px,
            var(--color-tangerine) 58px,
            var(--color-tent-canvas) 58px,
            var(--color-tent-canvas) 64px,
            #FFE0B8 64px,
            #FFE0B8 70px,
            var(--color-tent-canvas) 70px,
            var(--color-tent-canvas) 122px
          )`,
        }}
      />

      {/* Near-win vignette */}
      {isNearWin && (
        <div
          className="absolute inset-0 z-30 pointer-events-none animate-vignette-pulse"
          style={{
            boxShadow: "inset 0 0 80px 30px rgba(255, 107, 26, 0.2)",
          }}
          aria-hidden
        />
      )}

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

      {/* ═══ CENTER AREA: SIGN + PYRAMID + LEDGE ═══ */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-dvh px-3 pt-14 pb-36">
        {/* Sign */}
        <BashSign glow={isNearWin} />

        {/* Booth backdrop for the pyramid area */}
        <div
          className={`
            relative w-full max-w-md
            bg-ink/20 border-toon rounded-bounce
            shadow-[inset_0_0_40px_rgba(0,0,0,0.35),6px_6px_0_var(--color-toon-shadow)]
            flex flex-col items-center justify-end
            px-4 pt-8 pb-0
          `}
          style={{ minHeight: "340px" }}
        >
          {/* Bottle pyramid */}
          <div className="flex flex-col items-center gap-2 mb-1">
            {/* Row 0 — top (1 bottle) */}
            <div className="flex justify-center gap-5">
              {bottlesByRow[0].map((bottle) => (
                <BottleItem
                  key={bottle.id}
                  bottle={bottle}
                  isNearWin={isNearWin}
                  onClick={() => handleBottleClick(bottle.id)}
                  disabled={gameState !== "playing"}
                />
              ))}
            </div>

            {/* Row 1 — middle (2 bottles) */}
            <div className="flex justify-center gap-5">
              {bottlesByRow[1].map((bottle) => (
                <BottleItem
                  key={bottle.id}
                  bottle={bottle}
                  isNearWin={isNearWin}
                  onClick={() => handleBottleClick(bottle.id)}
                  disabled={gameState !== "playing"}
                />
              ))}
            </div>

            {/* Row 2 — bottom (3 bottles) */}
            <div className="flex justify-center gap-5">
              {bottlesByRow[2].map((bottle) => (
                <BottleItem
                  key={bottle.id}
                  bottle={bottle}
                  isNearWin={isNearWin}
                  onClick={() => handleBottleClick(bottle.id)}
                  disabled={gameState !== "playing"}
                />
              ))}
            </div>
          </div>

          {/* Wooden ledge / shelf */}
          <div
            className="w-full h-3 rounded-sm mt-0"
            style={{
              background:
                "linear-gradient(180deg, #7A4F2B 0%, #5C3A1E 30%, #3E2210 70%, #2A1508 100%)",
              borderTop: "3px solid #8B6340",
              boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
            }}
          />
        </div>
      </div>

      {/* ═══ WOODEN BASEBALL CRATE (bottom) ═══ */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {/* Crate back rim */}
        <div className="h-2 sm:h-3 bg-wood-horizontal border-t-2 border-toon-shadow" />
        {/* Crate face with slots */}
        <div
          className="bg-wood pt-2 pb-4 px-4 sm:px-6 flex items-center justify-center gap-4"
          style={{
            borderTop: "3px solid var(--color-wood-light)",
            background:
              "linear-gradient(180deg, #5C3A1E 0%, #3E2210 40%, #2A1508 100%)",
          }}
        >
          {/* Slotted crate dividers */}
          <div className="flex items-center gap-1">
            <BaseballDisplay used={usedThrows} total={TOTAL_THROWS} />
          </div>
          <div className="text-tent-canvas/30 font-toon text-xs hidden sm:block">
            · · · baseballs · · ·
          </div>
        </div>
        {/* Crate front lip */}
        <div
          className="h-1.5 sm:h-2 mx-2 rounded-b-sm"
          style={{
            background:
              "linear-gradient(180deg, #4A2A12 0%, #2A1508 100%)",
            borderTop: "2px solid #6B4226",
          }}
        />
      </div>

      {/* ═══ WIN OVERLAY ═══ */}
      {gameState === "won" && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center"
          style={{ backgroundColor: "rgba(26, 10, 46, 0.85)" }}
        >
          <div className="animate-bounce-in text-center flex flex-col items-center gap-3 px-4">
            <span className="text-5xl sm:text-6xl">🎉</span>
            <h2 className="font-carnival text-electric-yellow text-3xl sm:text-5xl m-0 leading-tight">
              YOU WIN!
            </h2>
            <p className="font-carnival text-tent-canvas text-xl sm:text-2xl m-0">
              +3 🎟️
            </p>

            {/* Prize reveal with spotlight */}
            {awardedPrizeRef.current && (
              <div
                className="relative mt-2 mb-1 px-6 py-3 rounded-bounce animate-bounce-in border-toon"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(255,230,0,0.25) 0%, rgba(26,10,46,0.8) 70%)",
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

      {/* ═══ LOSE OVERLAY ═══ */}
      {gameState === "lost" && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center"
          style={{ backgroundColor: "rgba(26, 10, 46, 0.85)" }}
        >
          <div className="animate-bounce-in text-center flex flex-col items-center gap-3 px-4">
            <span className="text-5xl sm:text-6xl">😢</span>
            <h2 className="font-carnival text-hot-magenta text-3xl sm:text-4xl m-0 leading-tight">
              Not Enough Throws!
            </h2>
            <p className="font-toon text-tent-canvas/70 text-lg m-0">
              {fallenCount} of {BOTTLE_COUNT} bottles knocked down
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

      {/* ═══ CONFETTI (win only) ═══ */}
      {showConfetti && gameState === "won" && (
        <Confetti count={50} colors={confettiColors} />
      )}
    </main>
  );
}
