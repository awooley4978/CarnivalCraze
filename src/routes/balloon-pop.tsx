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
type BalloonPhase = "idle" | "stretching" | "bursting" | "popped";

interface ShredParticle {
  id: number;
  angle: number;
  distance: number;
  color: string;
  size: number;
  rotation: number;
}

interface Balloon {
  id: number;
  twClass: string;
  hexColor: string;
  phase: BalloonPhase;
  offsetX: number;
  offsetY: number;
  shreds: ShredParticle[];
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
    shreds: [],
  }));
}

function generateShreds(color: string): ShredParticle[] {
  const count = 4 + Math.floor(Math.random() * 3); // 4–6
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6,
    distance: 25 + Math.random() * 45,
    color,
    size: 5 + Math.random() * 6,
    rotation: Math.random() * 360,
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
      <div className="w-2.5 h-2.5 rounded-full bg-[#C0C0C0] border border-[#808080] shadow-sm" />
      <div className="w-0.5 h-2 bg-[#808080]" />
    </div>
  );
}

/** Individual balloon with stretch-resistance + pop */
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
  const isStretching = balloon.phase === "stretching";
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
    >
      {/* Shred particles — visible during burst phase */}
      {isBursting &&
        balloon.shreds.map((p) => (
          <div
            key={p.id}
            className="absolute z-20 pointer-events-none"
            style={{
              width: `${p.size}px`,
              height: `${p.size * 0.7}px`,
              backgroundColor: p.color,
              borderRadius: "40% 60% 30% 50%",
              left: "50%",
              top: "40%",
              animation: "particle-shred 0.45s ease-out forwards",
              "--px": `${Math.cos(p.angle) * p.distance}px`,
              "--py": `${Math.sin(p.angle) * p.distance}px`,
              transform: `rotate(${p.rotation}deg)`,
            } as React.CSSProperties}
          />
        ))}

      {/* Balloon body — teardrop shape */}
      <div
        className={`
          relative
          w-16 h-20 sm:w-20 sm:h-24
          border-toon
          flex items-center justify-center
          shadow-[4px_4px_0_var(--color-toon-shadow)]
          ${balloon.twClass}
          ${isIdle ? (isNearWin ? "animate-wiggle" : "animate-wiggle") : ""}
        `}
        style={{
          // Teardrop/oval balloon shape
          borderRadius: "50% 50% 50% 50% / 40% 40% 60% 60%",
          transform: `translate(${balloon.offsetX}px, ${balloon.offsetY}px)`,
          ...(isIdle && isNearWin
            ? { animationDuration: "0.25s" }
            : {}),
          ...(isStretching
            ? {
                animation: "balloon-stretch-pop 0.35s ease-out forwards",
                transform: `translate(${balloon.offsetX}px, ${balloon.offsetY}px)`,
              }
            : {}),
          ...(isBursting
            ? {
                animation: "balloon-stretch-pop 0.35s ease-out forwards",
                transform: `translate(${balloon.offsetX}px, ${balloon.offsetY}px)`,
              }
            : {}),
        }}
      >
        {/* Specular highlight — curved reflection on the balloon surface */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: "30%",
            height: "40%",
            top: "12%",
            left: "18%",
            background:
              "radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
            transform: "rotate(-15deg)",
          }}
        />
        {/* Secondary small highlight dot */}
        <div
          className="absolute w-2 h-2.5 rounded-full bg-white/50 pointer-events-none"
          style={{
            top: "25%",
            left: "45%",
          }}
        />
      </div>

      {/* Tied knot at bottom */}
      <div
        className="relative -mt-[1px]"
        style={{
          ...(isBursting ? { opacity: 0, transition: "opacity 0.2s" } : {}),
        }}
      >
        {/* Knot body — small oval */}
        <div
          className="w-3 h-2 mx-auto rounded-full"
          style={{
            backgroundColor: balloon.hexColor,
            border: "2px solid var(--color-toon-shadow)",
            filter: "brightness(0.7)",
          }}
        />
        {/* Knot tail — tiny triangle pointing down */}
        <div
          className="w-0 h-0 mx-auto
            border-l-[3px] border-r-[3px] border-t-[4px]
            border-l-transparent border-r-transparent"
          style={{
            borderTopColor: "var(--color-toon-shadow)",
          }}
        />
      </div>

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

      // Phase 1: stretch (the balloon gives resistance)
      setBalloons((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, phase: "stretching" as BalloonPhase } : b,
        ),
      );

      // Play dart throw sound immediately
      playSfx("dart_throw");

      // Phase 2: burst after 200ms (stretch animation plays first)
      setTimeout(() => {
        const newDarts = dartsLeft - 1;
        const poppedBefore = balloons.filter(
          (b) => b.phase === "popped" || b.id === id,
        ).length;

        setDartsLeft(newDarts);

        setBalloons((prev) => {
          const target = prev.find((b) => b.id === id);
          if (!target || target.phase !== "stretching") return prev;

          const shreds = generateShreds(target.hexColor);
          return prev.map((b) =>
            b.id === id
              ? { ...b, phase: "bursting" as BalloonPhase, shreds }
              : b,
          );
        });

        // Play loud pop sound
        playSfx("pop");

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
                ? { ...b, phase: "popped" as BalloonPhase, shreds: [] }
                : b,
            ),
          );
        }, 400);
      }, 200);
    },
    [balloons, dartsLeft, gameState, playSfx],
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
        <div className="h-3 sm:h-4 bg-wood-horizontal border-t-2 border-toon-shadow" />
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
