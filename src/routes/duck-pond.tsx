import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useTickets } from "~/context/TicketContext";
import { usePrizes } from "~/context/PrizeContext";
import { useSceneTransition } from "~/context/SceneContext";
import { useSound } from "~/context/SoundContext";
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
  /** 1 = fall right, -1 = fall left */
  fallDir: 1 | -1;
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
    fallDir: (i % 2 === 0 ? 1 : -1) as 1 | -1,
  }));
}

// Positions for ducks along the metal track — spread across the track width
const DUCK_POSITIONS = [
  { x: 12, y: 30 },
  { x: 28, y: 52 },
  { x: 44, y: 24 },
  { x: 60, y: 48 },
  { x: 76, y: 35 },
  { x: 18, y: 58 },
  { x: 52, y: 65 },
  { x: 82, y: 55 },
];

// ── Confetti colours ──────────────────────────────────
const WATER_COLORS = ["#00BFFF", "#FFE600", "#39FF14", "#7B2D8E", "#1A8FC0", "#4DC8F0"];

// ── Sub-Components ──────────────────────────────────

/** Shooting gallery sign hanging above the track */
function DuckShootSign() {
  return (
    <div className="relative mx-auto mb-3 flex items-center justify-center" aria-hidden>
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
        <div className="text-center px-2">
          <p className="font-carnival text-electric-yellow text-sm sm:text-lg m-0 leading-tight drop-shadow-[2px_2px_0_var(--color-toon-shadow)]">
            DUCK
          </p>
          <p className="font-carnival text-electric-yellow text-sm sm:text-lg m-0 leading-tight drop-shadow-[2px_2px_0_var(--color-toon-shadow)]">
            SHOOT
          </p>
        </div>
      </div>
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

/** Shot counter shelf — 3 duck icons, used ones greyed out */
function ShotCounter({ used, total }: { used: number; total: number }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
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
        <span className="font-toon text-tent-canvas/70 text-xs ml-1 hidden sm:inline">
          SHOTS
        </span>
      </div>
    </div>
  );
}

/** Individual metal duck on the track */
function DuckItem({
  duck,
  posX,
  posY,
  driftDuration,
  driftDelay,
  onClick,
  disabled,
}: {
  duck: Duck;
  posX: number;
  posY: number;
  driftDuration: number;
  driftDelay: number;
  onClick: () => void;
  disabled: boolean;
}) {
  const isPicked = duck.picked;
  const isRevealed = duck.revealed;
  const isIdle = !isPicked && !isRevealed;
  const isWobbling = isPicked && !isRevealed;
  const fallDir = duck.fallDir;

  if (isRevealed) {
    // Revealed: fallen duck on its side showing ticket value
    return (
      <div
        className="absolute pointer-events-none select-none"
        style={{
          left: `${posX}%`,
          top: `${posY}%`,
          transform: `translate(-50%, -50%) rotate(${fallDir * 75}deg)`,
        }}
      >
        {/* Fallen metal duck body */}
        <div
          className="relative w-14 h-10 sm:w-16 sm:h-11"
          style={{
            background: "linear-gradient(180deg, #C0C0C0 0%, #A8A8A8 40%, #808090 100%)",
            borderRadius: "40% 40% 40% 40%",
            border: "3px solid var(--color-toon-shadow)",
            boxShadow: "3px 3px 0 var(--color-toon-shadow)",
          }}
        >
          {/* Duck head area (still visible on its side) */}
          <div
            className="absolute"
            style={{
              top: "15%",
              left: fallDir === 1 ? "70%" : "5%",
              width: "14px",
              height: "14px",
              background: "linear-gradient(135deg, #FFD700 0%, #E6C200 100%)",
              borderRadius: "50%",
              border: "2px solid var(--color-toon-shadow)",
            }}
          />
          {/* Ticket value bubble */}
          <div
            className="
              absolute -top-6 left-1/2 -translate-x-1/2
              flex items-center justify-center
              bg-tent-canvas/90 rounded-full
              border-2 border-electric-yellow
              px-2 py-0.5
              shadow-[0_2px_8px_rgba(0,0,0,0.2)]
            "
          >
            <span className="font-carnival text-ink text-xs whitespace-nowrap">
              +{duck.value} 🎟️
            </span>
          </div>
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
        transform: "translate(-50%, -50%)",
      }}
      aria-label={
        isRevealed
          ? `Duck worth ${duck.value} ticket${duck.value > 1 ? "s" : ""}`
          : isPicked
            ? "Hit duck, falling..."
            : "Metal duck — tap to shoot"
      }
    >
      {/* Wobble + fall wrapper */}
      <div
        className="relative"
        style={{
          ...(isIdle
            ? {
                animation: `duck-drift-track ${driftDuration}s ease-in-out ${driftDelay}s infinite alternate`,
              }
            : {}),
          ...(isWobbling
            ? {
                animation: "duck-hit-wobble 0.2s ease-out forwards, duck-fall-over 0.35s cubic-bezier(0.34,1.56,0.64,1) 0.2s forwards",
                "--fall-dir": fallDir,
              } as React.CSSProperties
            : {}),
        }}
      >
        {/* Metal duck body — silver/grey with golden head */}
        <div
          className="relative w-16 h-10 sm:w-18 sm:h-11 flex items-center"
        >
          {/* Duck body */}
          <div
            className="relative w-full h-full overflow-visible"
            style={{
              background: "linear-gradient(180deg, #D4D4D4 0%, #B0B0B0 35%, #909098 100%)",
              borderRadius: "35% 45% 40% 35%",
              border: "3px solid var(--color-toon-shadow)",
              boxShadow: "4px 4px 0 var(--color-toon-shadow), inset 0 2px 4px rgba(255,255,255,0.4)",
            }}
          >
            {/* Metallic sheen/highlight */}
            <div
              className="absolute rounded-full"
              style={{
                width: "10px",
                height: "6px",
                top: "8px",
                left: "10px",
                background: "rgba(255,255,255,0.55)",
                filter: "blur(1px)",
              }}
            />
            {/* Duck head — bright yellow */}
            <div
              className="absolute"
              style={{
                top: "-8px",
                right: "-4px",
                width: "18px",
                height: "16px",
                background: "linear-gradient(135deg, #FFE600 0%, #FFD700 50%, #E6C200 100%)",
                borderRadius: "50%",
                border: "2px solid var(--color-toon-shadow)",
              }}
            >
              {/* Eye */}
              <div
                className="absolute w-2 h-2.5 bg-tent-canvas rounded-full flex items-center justify-center"
                style={{ top: "3px", left: "3px" }}
              >
                <div className="w-1 h-1 bg-ink rounded-full" />
              </div>
              {/* Beak */}
              <div
                className="absolute w-0 h-0"
                style={{
                  top: "5px",
                  right: "-6px",
                  borderTop: "3px solid transparent",
                  borderBottom: "3px solid transparent",
                  borderLeft: "6px solid var(--color-tangerine)",
                }}
              />
            </div>
          </div>

          {/* Track connector / base */}
          <div
            className="absolute bottom-[-4px] left-[15%] right-[15%] h-[3px] rounded-full"
            style={{
              background: "linear-gradient(90deg, #999, #CCC, #999)",
            }}
          />
        </div>
      </div>

      {/* Impact spark — brief flash on hit */}
      {isWobbling && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: "6px",
            height: "6px",
            background: "radial-gradient(circle, #FFF 0%, #FFD700 50%, transparent 100%)",
            borderRadius: "50%",
            animation: "particle-burst 0.3s ease-out forwards",
            "--px": "0px",
            "--py": "0px",
          } as React.CSSProperties}
        />
      )}
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
  const [wobblingIds, setWobblingIds] = useState<Set<number>>(new Set());

  const { tickets, earnTickets } = useTickets();
  const { awardPrize } = usePrizes();
  const { triggerTransition } = useSceneTransition();
  const { playSfx, playMusic, setTempo, stopMusic } = useSound();
  const navigate = useNavigate();

  const paidForSession = useRef(false);
  const awardedPrizeRef = useRef<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  const picksLeftRef = useRef(TOTAL_PICKS);
  const gameStateRef = useRef<GameState>("playing");
  const generationRef = useRef(0);

  // ── Curtain exit via scene context ──
  const exitToMidway = useCallback(() => {
    stopMusic();
    triggerTransition(() => {
      navigate({ to: "/" });
    });
  }, [triggerTransition, navigate, stopMusic]);

  // ── Music on mount ──
  useEffect(() => {
    playMusic("duck-pond");
    return () => {
      setTempo(1.0);
    };
  }, [playMusic, setTempo]);

  // ── Swipe-down gesture ──
  useSwipeGesture(mainRef, exitToMidway, 80);

  // ── Award tickets + prize once when the game finishes ──
  useEffect(() => {
    if (gameState === "finished" && !paidForSession.current) {
      paidForSession.current = true;
      const reward = ducks
        .filter((d) => d.picked)
        .reduce((sum, d) => sum + d.value, 0);
      if (reward > 0) {
        earnTickets(reward);
      }
      playSfx("ticket");
      awardedPrizeRef.current = awardPrize();
      playSfx("prize");
      playSfx("fanfare");
      setTimeout(() => setShowConfetti(true), 100);
    }
  }, [gameState, ducks, earnTickets, awardPrize, playSfx]);

  // ── Stable drift durations and delays for each duck ──
  const [driftDurations] = useState<number[]>(() =>
    Array.from({ length: DUCK_COUNT }, () => 3.5 + Math.random() * 2.5),
  );
  const [driftDelays] = useState<number[]>(() =>
    Array.from({ length: DUCK_COUNT }, () => Math.random() * 3),
  );

  // ── Handle duck tap (shoot) ──
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

      // Play metallic tink sound
      playSfx("tink");

      // Mark as wobbling
      setWobblingIds((prev) => new Set(prev).add(id));

      picksLeftRef.current -= 1;
      setPicksLeft(picksLeftRef.current);

      if (picksLeftRef.current <= 0) {
        gameStateRef.current = "finished";
        setGameState("finished");
      }

      const currentGen = generationRef.current;

      // After wobble (200ms) + fall (350ms) = 550ms, reveal value
      setTimeout(() => {
        if (generationRef.current !== currentGen) return;

        setWobblingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setDucks((prev) =>
          prev.map((d) => (d.id === id ? { ...d, revealed: true } : d)),
        );
        setTotalReward((prev) => prev + duckValue);
      }, 550);
    },
    [playSfx],
  );

  // ── Play again ──
  const handlePlayAgain = useCallback(() => {
    generationRef.current += 1;
    setDucks(generateDucks());
    setPicksLeft(TOTAL_PICKS);
    setGameState("playing");
    setTotalReward(0);
    setShowConfetti(false);
    setWobblingIds(new Set());
    picksLeftRef.current = TOTAL_PICKS;
    gameStateRef.current = "playing";
    paidForSession.current = false;
    awardedPrizeRef.current = null;
  }, []);

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

      {/* Back wall — blue-striped tent fabric */}
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

      {/* ═══ CENTER AREA: SIGN + METAL TRACK ═══ */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-dvh px-3 pt-14 pb-28">
        {/* Duck Shoot Sign */}
        <DuckShootSign />

        {/* Metal Track — shooting gallery trough */}
        <div className="relative w-full max-w-md mx-auto">
          {/* Outer wooden frame */}
          <div
            className="
              relative mx-auto
              rounded-xl border-[6px] sm:border-[8px]
              shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_2px_8px_rgba(0,0,0,0.3)]
            "
            style={{
              width: "94%",
              aspectRatio: "1 / 0.75",
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
            {/* Metal channel / track */}
            <div
              className="absolute inset-3 sm:inset-4 rounded-lg overflow-hidden"
              style={{
                background: `linear-gradient(180deg,
                  #B8B8C0 0%,
                  #D0D0D8 8%,
                  #A0A0A8 15%,
                  #C8C8D0 40%,
                  #909098 70%,
                  #787880 85%,
                  #686870 100%
                )`,
                boxShadow: "inset 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.3)",
              }}
            >
              {/* Track grooves / rails */}
              <div
                className="absolute left-0 right-0 h-[3px]"
                style={{
                  top: "32%",
                  background: "linear-gradient(90deg, #999 0%, #CCC 50%, #999 100%)",
                  boxShadow: "0 1px 0 rgba(255,255,255,0.2), 0 2px 0 rgba(0,0,0,0.3)",
                }}
              />
              <div
                className="absolute left-0 right-0 h-[3px]"
                style={{
                  top: "66%",
                  background: "linear-gradient(90deg, #999 0%, #CCC 50%, #999 100%)",
                  boxShadow: "0 1px 0 rgba(255,255,255,0.2), 0 2px 0 rgba(0,0,0,0.3)",
                }}
              />

              {/* Ducks on the metal track */}
              {ducks.map((duck, i) => (
                <DuckItem
                  key={duck.id}
                  duck={duck}
                  posX={DUCK_POSITIONS[i].x}
                  posY={DUCK_POSITIONS[i].y}
                  driftDuration={driftDurations[i]}
                  driftDelay={driftDelays[i]}
                  onClick={() => handleDuckClick(duck.id)}
                  disabled={gameState !== "playing"}
                />
              ))}

              {/* Track rivets on the sides */}
              {[10, 30, 50, 70, 90].map((pct) => (
                <div
                  key={pct}
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{
                    left: `${pct}%`,
                    top: "10%",
                    background: "radial-gradient(circle, #CCC 0%, #888 100%)",
                    boxShadow: "0 1px 1px rgba(0,0,0,0.3)",
                  }}
                />
              ))}
              {[15, 35, 55, 75, 95].map((pct) => (
                <div
                  key={pct}
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{
                    left: `${pct}%`,
                    top: "85%",
                    background: "radial-gradient(circle, #CCC 0%, #888 100%)",
                    boxShadow: "0 1px 1px rgba(0,0,0,0.3)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ WOODEN COUNTER (bottom) ═══ */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="h-3 sm:h-4 bg-wood-horizontal border-t-2 border-toon-shadow" />
        <div
          className="bg-wood pt-2 pb-4 px-4 sm:px-6 flex items-center justify-center gap-4"
          style={{
            borderTop: "3px solid var(--color-wood-light)",
          }}
        >
          <ShotCounter used={usedPicks} total={TOTAL_PICKS} />
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
