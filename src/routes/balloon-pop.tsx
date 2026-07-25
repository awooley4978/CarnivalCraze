import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useTickets } from "~/context/TicketContext";
import { usePrizes } from "~/context/PrizeContext";
import { useSceneTransition } from "~/context/SceneContext";
import { useSound } from "~/context/SoundContext";
import { useSwipeGesture } from "~/hooks/useSwipeGesture";
import Confetti from "~/components/Confetti";

export const Route = createFileRoute("/balloon-pop")({
  component: BalloonPop,
});

// ── Balloon colour palette (Tailwind classes → hex for particles) ──
const BALLOON_DEFS = [
  { tw: "bg-circus-red", hex: "#FF2A2A" },
  { tw: "bg-hot-magenta", hex: "#FF1493" },
  { tw: "bg-acid-green", hex: "#39FF14" },
  { tw: "bg-electric-yellow", hex: "#FFE600" },
  { tw: "bg-sky-pop", hex: "#00BFFF" },
  { tw: "bg-tangerine", hex: "#FF6B1A" },
] as const;

const TOTAL_DARTS = 3;
const BALLOON_COUNT = 6;

// ── Types ─────────────────────────────────────────
type BalloonPhase = "idle" | "resisting" | "bursting" | "popped";

interface Particle {
  id: number;
  angle: number; // radians
  distance: number; // px
  color: string;
  size: number; // px
}

interface Balloon {
  id: number;
  twClass: string;
  hexColor: string;
  phase: BalloonPhase;
  offsetX: number;
  offsetY: number;
  particles: Particle[];
}

type GameState = "playing" | "won" | "lost";

// ── Helpers ───────────────────────────────────────
function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateBalloons(): Balloon[] {
  const shuffled = shuffle(BALLOON_DEFS);
  return shuffled.map((def, i) => ({
    id: i,
    twClass: def.tw,
    hexColor: def.hex,
    phase: "idle" as BalloonPhase,
    offsetX: (Math.random() - 0.5) * 12,
    offsetY: (Math.random() - 0.5) * 10,
    particles: [],
  }));
}

function generateParticles(color: string): Particle[] {
  const count = 4 + Math.floor(Math.random() * 3); // 4–6
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6,
    distance: 20 + Math.random() * 40, // 20–60px
    color,
    size: 4 + Math.random() * 5, // 4–9px
  }));
}

// ── Sub-components ────────────────────────────────

/** Wooden sign hanging above the corkboard */
function PopSign({ glow }: { glow?: boolean }) {
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
        POP &rsquo;EM ALL!
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

/** Physical dart ammo display on the wooden counter */
function DartDisplay({ used, total }: { used: number; total: number }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {Array.from({ length: total }, (_, i) => {
        const isUsed = i < used;
        return (
          <div
            key={i}
            className={`
              relative text-2xl sm:text-3xl select-none transition-all duration-300
              ${isUsed ? "opacity-30 translate-y-1.5 grayscale" : "opacity-100 translate-y-0"}
            `}
            title={isUsed ? "Used dart" : "Ready dart"}
          >
            🎯
            {/* Pushpin illusion when used — a dark line across */}
            {isUsed && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-wood-dark rounded-full" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Pushpin at the top of a balloon */
function Pushpin() {
  return (
    <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
      {/* Pin head */}
      <div className="w-2.5 h-2.5 rounded-full bg-[#C0C0C0] border border-[#808080] shadow-sm" />
      {/* Pin shaft */}
      <div className="w-0.5 h-2 bg-[#808080]" />
    </div>
  );
}

/** Individual balloon with resistance + burst animation */
function BalloonItem({
  balloon,
  isNearWin,
  onClick,
  disabled,
}: {
  balloon: Balloon;
  isNearWin: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const isIdle = balloon.phase === "idle";
  const isResisting = balloon.phase === "resisting";
  const isBursting = balloon.phase === "bursting";
  const isPopped = balloon.phase === "popped";

  if (isPopped) {
    return <div className="w-16 h-20 sm:w-20 sm:h-24" aria-hidden />;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !isIdle}
      className={`
        relative flex flex-col items-center
        select-none outline-none border-none bg-transparent p-0
        ${isIdle ? "cursor-pointer" : "cursor-default"}
      `}
      style={{
        width: undefined,
        height: undefined,
      }}
    >
      {/* Particles (rendered even before burst, but invisible) */}
      {isBursting &&
        balloon.particles.map((p) => (
          <div
            key={p.id}
            className="absolute z-20 rounded-full pointer-events-none"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              left: "50%",
              top: "40%",
              animation: "particle-burst 0.4s ease-out forwards",
              "--px": `${Math.cos(p.angle) * p.distance}px`,
              "--py": `${Math.sin(p.angle) * p.distance}px`,
            } as React.CSSProperties}
          />
        ))}

      {/* Balloon body */}
      <div
        className={`
          relative
          w-16 h-20 sm:w-20 sm:h-24
          rounded-blob border-toon
          flex items-center justify-center
          shadow-[4px_4px_0_var(--color-toon-shadow)]
          ${balloon.twClass}
          ${isIdle ? (isNearWin ? "animate-wiggle" : "animate-wiggle") : ""}
        `}
        style={{
          transform: `translate(${balloon.offsetX}px, ${balloon.offsetY}px)`,
          ...(isIdle && isNearWin
            ? { animationDuration: "0.25s" } // 1.5× speed = shorter duration
            : {}),
          ...(isResisting
            ? {
                animation: "balloon-resist 0.15s ease-out forwards",
                transform: `translate(${balloon.offsetX}px, ${balloon.offsetY}px)`,
              }
            : {}),
          ...(isBursting
            ? {
                animation: "balloon-pop-scale 0.25s cubic-bezier(0.36,0,0.66,1) forwards",
                transform: `translate(${balloon.offsetX}px, ${balloon.offsetY}px)`,
              }
            : {}),
        }}
      >
        {/* Shine / highlight */}
        <div className="w-3 h-3 bg-white/40 rounded-full absolute top-2 left-2.5 sm:top-3 sm:left-3" />
      </div>

      {/* Knot triangle */}
      <div
        className={`
          w-0 h-0
          border-l-[5px] border-r-[5px] border-t-[6px]
          border-l-transparent border-r-transparent
          -mt-[1px]
        `}
        style={{
          borderTopColor: "var(--color-toon-shadow)",
          ...(isBursting ? { opacity: 0, transition: "opacity 0.2s" } : {}),
        }}
      />

      {/* Pushpin at top */}
      <Pushpin />
    </button>
  );
}

// ── Main Component ────────────────────────────────

function BalloonPop() {
  const [balloons, setBalloons] = useState<Balloon[]>(generateBalloons);
  const [dartsLeft, setDartsLeft] = useState(TOTAL_DARTS);
  const [gameState, setGameState] = useState<GameState>("playing");
  const [showConfetti, setShowConfetti] = useState(false);

  const { tickets, earnTickets } = useTickets();
  const { awardPrize } = usePrizes();
  const { triggerTransition } = useSceneTransition();
  const navigate = useNavigate();
  const { playSfx, playMusic, setTempo, stopMusic } = useSound();

  const paidForSession = useRef(false);
  const awardedPrizeRef = useRef<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  // ── Curtain exit via scene context ──
  const exitToMidway = useCallback(() => {
    stopMusic();
    triggerTransition(() => {
      navigate({ to: "/" });
    });
  }, [triggerTransition, navigate, stopMusic]);

  // ── Swipe-down gesture ──
  useSwipeGesture(mainRef, exitToMidway, 80);

  // ── Music on mount ──
  useEffect(() => {
    playMusic("balloon");
    return () => {
      setTempo(1.0);
    };
  }, [playMusic, setTempo]);

  // ── Award tickets + prize on win ──
  useEffect(() => {
    if (gameState === "won" && !paidForSession.current) {
      paidForSession.current = true;
      earnTickets(2);
      playSfx("ticket");
      awardedPrizeRef.current = awardPrize();
      playSfx("prize");
      playSfx("fanfare");
      // Trigger confetti after a tiny delay so the overlay renders first
      setTimeout(() => setShowConfetti(true), 100);
    }
  }, [gameState, earnTickets, awardPrize, playSfx]);

  // ── Lose SFX ──
  useEffect(() => {
    if (gameState === "lost") {
      playSfx("lose");
    }
  }, [gameState, playSfx]);

  // ── Handle balloon tap ──
  const handleBalloonClick = useCallback(
    (id: number) => {
      if (gameState !== "playing") return;

      const balloon = balloons.find((b) => b.id === id);
      if (!balloon || balloon.phase !== "idle") return;

      // Phase 1: resistance
      setBalloons((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, phase: "resisting" as BalloonPhase } : b,
        ),
      );

      // Phase 2: burst after 150ms
      setTimeout(() => {
        const newDarts = dartsLeft - 1;
        const poppedBefore = balloons.filter(
          (b) => b.phase === "popped" || b.id === id,
        ).length;

        setDartsLeft(newDarts);

        setBalloons((prev) => {
          const target = prev.find((b) => b.id === id);
          if (!target || target.phase !== "resisting") return prev;

          const particles = generateParticles(target.hexColor);
          return prev.map((b) =>
            b.id === id
              ? { ...b, phase: "bursting" as BalloonPhase, particles }
              : b,
          );
        });

        if (poppedBefore + 1 >= BALLOON_COUNT) {
          setGameState("won");
        } else if (newDarts <= 0) {
          setGameState("lost");
        }

        // Phase 3: mark as popped after burst animation completes
        setTimeout(() => {
          setBalloons((prev) =>
            prev.map((b) =>
              b.id === id
                ? { ...b, phase: "popped" as BalloonPhase, particles: [] }
                : b,
            ),
          );
        }, 300);
      }, 150);
    },
    [balloons, dartsLeft, gameState],
  );

  // ── Play again ──
  const handlePlayAgain = useCallback(() => {
    setBalloons(generateBalloons());
    setDartsLeft(TOTAL_DARTS);
    setGameState("playing");
    setShowConfetti(false);
    paidForSession.current = false;
    awardedPrizeRef.current = null;
  }, []);

  // ── Derived state ──
  const poppedCount = balloons.filter((b) => b.phase === "popped").length;
  const usedDarts = TOTAL_DARTS - dartsLeft;
  const isNearWin =
    gameState === "playing" &&
    poppedCount >= 2 &&
    dartsLeft === 1 &&
    balloons.some((b) => b.phase === "idle");

  // Confetti colors from the balloon palette
  const confettiColors = useMemo(
    () => BALLOON_DEFS.map((d) => d.hex),
    [],
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

      {/* Ceiling — dark tent canvas strip */}
      <div
        className="absolute top-0 left-0 right-0 h-10 sm:h-12 z-10"
        style={{
          background:
            "linear-gradient(180deg, #0D0517 0%, #1A0A2E 60%, transparent 100%)",
        }}
      >
        {/* Subtle fold lines */}
        <div className="absolute bottom-1 left-4 right-4 h-px bg-tent-canvas/10" />
      </div>

      {/* Back wall — crimson-striped tent fabric */}
      <div
        className={`
          absolute inset-0 z-0
          ${gameState === "won" ? "animate-shake-tent" : "animate-tent-stripe-wave"}
        `}
        style={{
          background: `repeating-linear-gradient(
            90deg,
            var(--color-tent-balloon) 0px,
            var(--color-tent-balloon) 48px,
            var(--color-circus-red) 48px,
            var(--color-circus-red) 54px,
            var(--color-tent-canvas) 54px,
            var(--color-tent-canvas) 60px,
            var(--color-circus-red) 60px,
            var(--color-circus-red) 66px,
            var(--color-tent-balloon) 66px,
            var(--color-tent-balloon) 114px
          )`,
        }}
      />

      {/* Vignette pulse for near-win tension */}
      {isNearWin && (
        <div
          className="absolute inset-0 z-30 pointer-events-none animate-vignette-pulse"
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

      {/* ═══ CENTER AREA: SIGN + CORKBOARD + BALLOONS ═══ */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-dvh px-3 pt-14 pb-28">
        {/* Sign */}
        <PopSign glow={isNearWin} />

        {/* Corkboard */}
        <div
          className={`
            relative w-full max-w-md
            bg-cork border-[6px] rounded-bounce
            shadow-[inset_2px_2px_12px_rgba(0,0,0,0.3),6px_6px_0_var(--color-toon-shadow)]
            px-3 py-6 sm:px-4 sm:py-8
          `}
          style={{ borderColor: "var(--color-wood-dark)" }}
        >
          {/* Pushpins in corners of corkboard */}
          <div className="absolute top-1 left-2 w-2 h-2 rounded-full bg-[#C0C0C0] border border-[#808080]" />
          <div className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#C0C0C0] border border-[#808080]" />
          <div className="absolute bottom-1 left-2 w-2 h-2 rounded-full bg-[#C0C0C0] border border-[#808080]" />
          <div className="absolute bottom-1 right-2 w-2 h-2 rounded-full bg-[#C0C0C0] border border-[#808080]" />

          {/* Balloon grid */}
          <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8 place-items-center">
            {balloons.map((balloon) => (
              <BalloonItem
                key={balloon.id}
                balloon={balloon}
                isNearWin={isNearWin}
                onClick={() => handleBalloonClick(balloon.id)}
                disabled={gameState !== "playing"}
              />
            ))}
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
          <DartDisplay used={usedDarts} total={TOTAL_DARTS} />
          <div className="text-tent-canvas/40 font-toon text-xs hidden sm:block">
            · · · darts · · ·
          </div>
        </div>
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
              +2 🎟️
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
            <span className="text-5xl sm:text-6xl">💨</span>
            <h2 className="font-carnival text-hot-magenta text-3xl sm:text-4xl m-0 leading-tight">
              Out of Darts!
            </h2>
            <p className="font-toon text-tent-canvas/70 text-lg m-0">
              You popped {poppedCount} of {BALLOON_COUNT} balloons
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
