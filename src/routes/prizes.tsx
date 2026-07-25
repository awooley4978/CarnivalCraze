import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { usePrizes } from "~/context/PrizeContext";
import { useTickets } from "~/context/TicketContext";
import { useSceneTransition } from "~/context/SceneContext";
import { useSound } from "~/context/SoundContext";
import { useSwipeGesture } from "~/hooks/useSwipeGesture";

export const Route = createFileRoute("/prizes")({
  component: PrizeShack,
});

// ── Prize emoji mapping ────────────────────────────────────
const PRIZE_EMOJI_MAP: Record<string, string> = {
  "Giant Teddy Bear": "🧸",
  "Plush Dragon": "🐉",
  "Alien Keychain": "👽",
  "Oversized Trophy": "🏆",
  "Inflatable Unicorn": "🦄",
  "Mini Carnival Tent": "🎪",
  "Glow-in-the-Dark Star": "⭐",
  "Clown Nose": "🤡",
};

/** Extract emoji from prize string (fallback to random from map) */
function prizeEmoji(prize: string): string {
  // Try prefix match in map
  for (const [key, emoji] of Object.entries(PRIZE_EMOJI_MAP)) {
    if (prize.includes(key)) return emoji;
  }
  // Fallback: extract first two chars if they look like emoji
  const firstTwo = prize.slice(0, 2);
  return firstTwo || "🎁";
}

/** Seed-based random for consistent layout */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ── Sub-components ────────────────────────────────────────

/** Mini bulb string decoration across the top */
function BulbString() {
  const bulbs = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        lit: i % 3 !== 1,
        delayClass: `delay-bulb-${(i % 10) + 1}`,
        doubleBlink: i === 3 || i === 8 || i === 12,
        flicker: i === 5 || i === 14,
      })),
    [],
  );

  return (
    <div className="relative w-full flex justify-between items-center px-2 py-3">
      <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-bulb-off/60 -translate-y-1/2 rounded-full" />
      {bulbs.map((bulb, i) => (
        <div
          key={i}
          className={`
            h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full flex-shrink-0
            ${bulb.lit ? "bg-bulb-gold glow-bulb" : "bg-bulb-off"}
            ${bulb.doubleBlink ? "animate-blink-bulb-double" : bulb.flicker ? "" : "animate-blink-bulb"}
            ${bulb.delayClass}
          `}
          style={
            bulb.flicker && bulb.lit
              ? {
                  animation: `bulb-flicker ${2.5 + i * 0.3}s step-end ${i * 0.05}s infinite`,
                  background: "var(--color-bulb-gold)",
                  boxShadow:
                    "0 0 8px 3px var(--color-bulb-gold), 0 0 20px 6px rgba(255, 215, 0, 0.5), 0 0 40px 10px rgba(255, 215, 0, 0.25)",
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}

/** Hanging sign: "PRIZE SHACK" */
function HangingSign() {
  return (
    <div className="relative mx-auto mb-1">
      <div
        className="
          bg-wood-horizontal border-toon rounded-bounce
          px-6 py-2 sm:px-8 sm:py-3
          shadow-[4px_4px_0_var(--color-toon-shadow)]
          relative z-10
        "
      >
        <h1 className="font-carnival text-electric-yellow text-xl sm:text-3xl m-0 text-center leading-tight select-none">
          🏆 PRIZE SHACK 🏆
        </h1>
      </div>
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-tent-canvas/40 rounded-full" />
      <div className="absolute -top-4 left-[calc(50%-28px)] w-0.5 h-4 bg-tent-canvas/30 rounded-full" />
      <div className="absolute -top-4 left-[calc(50%+28px)] w-0.5 h-4 bg-tent-canvas/30 rounded-full" />
    </div>
  );
}

/** Prize-count plaque */
function PrizePlaque({ count }: { count: number }) {
  return (
    <div
      className="
        inline-block bg-ink/80 border border-toon-shadow/40 rounded-bounce
        px-3 py-1 select-none
        shadow-[2px_2px_0_var(--color-toon-shadow)]
      "
    >
      <p className="font-toon text-tent-canvas/80 text-xs sm:text-sm m-0 text-center">
        {count === 0
          ? "No prizes yet..."
          : `${count} prize${count !== 1 ? "s" : ""} collected`}
      </p>
    </div>
  );
}

/** Mini chalkboard showing ticket balance */
function ChalkboardTickets({ tickets }: { tickets: number }) {
  return (
    <div className="bg-chalkboard rounded-sm px-2 py-1 inline-block shadow-[3px_3px_0_var(--color-toon-shadow)]">
      <p className="text-chalk font-toon text-xs sm:text-sm m-0 leading-tight">
        🎟️ {tickets}
      </p>
    </div>
  );
}

/** A single wooden shelf with prizes on it */
function Shelf({
  yPercent,
  prizes,
  shelfIndex,
}: {
  yPercent: number;
  prizes: string[];
  shelfIndex: number;
}) {
  const hasPrizes = prizes.length > 0;

  return (
    <div
      className="absolute left-[4%] right-[4%]"
      style={{ top: `${yPercent}%` }}
    >
      {/* Shelf bracket / support */}
      <div
        className="absolute -bottom-1.5 left-[8%]"
        style={{
          width: 5,
          height: 8,
          background: "var(--color-toon-shadow)",
          borderRadius: "1px",
          opacity: 0.6,
        }}
      />
      <div
        className="absolute -bottom-1.5 right-[8%]"
        style={{
          width: 5,
          height: 8,
          background: "var(--color-toon-shadow)",
          borderRadius: "1px",
          opacity: 0.6,
        }}
      />

      {/* Shelf board */}
      <div
        className="w-full h-2.5 sm:h-3 relative"
        style={{
          background: "linear-gradient(180deg, #8B5E3C, var(--color-wood-dark))",
          borderRadius: "2px",
          border: "2px solid var(--color-toon-shadow)",
          boxShadow: "3px 3px 0 var(--color-toon-shadow)",
        }}
      />

      {/* Prizes on the shelf */}
      {hasPrizes && (
        <div
          className="absolute -top-9 sm:-top-11 left-0 right-0 flex justify-center flex-wrap gap-1 sm:gap-1.5 px-2"
          style={{ flexWrap: "wrap", alignItems: "flex-end" }}
        >
          {prizes.map((prize, i) => {
            const emoji = prizeEmoji(prize);
            const wiggleDelay = seededRandom(shelfIndex * 10 + i) * 3;
            const scale = 0.85 + seededRandom(shelfIndex * 7 + i) * 0.3;
            return (
              <span
                key={`${shelfIndex}-${i}`}
                className="text-2xl sm:text-3xl select-none inline-block leading-none"
                style={{
                  transform: `scale(${scale}) rotate(${(seededRandom(shelfIndex * 13 + i) - 0.5) * 8}deg)`,
                  filter: "drop-shadow(2px 2px 0 var(--color-toon-shadow))",
                  animation: `wiggle 0.4s ease-in-out ${wiggleDelay}s infinite`,
                }}
                title={prize}
              >
                {emoji}
              </span>
            );
          })}
        </div>
      )}

      {/* Cobwebs for empty shelves */}
      {!hasPrizes && (
        <div className="absolute -top-7 left-0 right-0 flex justify-center gap-4" aria-hidden>
          <span className="text-tent-canvas/10 text-xs select-none">🕸️</span>
          <span className="text-tent-canvas/10 text-xs select-none">🕸️</span>
        </div>
      )}
    </div>
  );
}

/** Dust mote — tiny floating particle */
function DustMote({
  index,
  left,
  top,
}: {
  index: number;
  left: number;
  top: number;
}) {
  const duration = 4 + seededRandom(index * 7) * 5;
  const delay = seededRandom(index * 13) * 6;
  const size = 1.5 + seededRandom(index * 17) * 2.5;

  return (
    <div
      className="absolute rounded-full bg-tent-canvas pointer-events-none"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        left: `${left}%`,
        top: `${top}%`,
        animation: `dust-float ${duration}s ease-in-out ${delay}s infinite`,
        opacity: 0,
      }}
      aria-hidden
    />
  );
}

/** Empty state: dark room with dusty shelves and cobwebs */
function EmptyState() {
  const dustMotes = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: 15 + seededRandom(i * 3) * 70,
        top: 10 + seededRandom(i * 5) * 70,
        index: i,
      })),
    [],
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative">
      {/* Single spotlight cone in center */}
      <div
        className="absolute w-56 h-64 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none spotlight-cone-dim"
        style={{ animation: "spotlight-sway 6s ease-in-out infinite", transformOrigin: "top center" }}
      />

      {/* Empty shelves with cobwebs */}
      <div className="relative w-full max-w-sm h-48 my-2">
        <Shelf yPercent={15} prizes={[]} shelfIndex={99} />
        <Shelf yPercent={45} prizes={[]} shelfIndex={100} />
        <Shelf yPercent={75} prizes={[]} shelfIndex={101} />
      </div>

      {/* Dust motes */}
      {dustMotes.map((mote) => (
        <DustMote
          key={mote.id}
          index={mote.index}
          left={mote.left}
          top={mote.top}
        />
      ))}

      {/* Message */}
      <p className="font-toon text-tent-canvas/50 text-base sm:text-lg mt-6 select-none z-10">
        No prizes yet… go win some!
      </p>
    </div>
  );
}

/** Filled state: shelves packed with prizes */
function FilledShelves({ prizes }: { prizes: string[] }) {
  // Distribute prizes across 4 shelves
  const shelves = useMemo(() => {
    const total = prizes.length;
    const shelfCount = 4;
    const perShelf = Math.max(1, Math.ceil(total / shelfCount));
    const result: string[][] = Array.from({ length: shelfCount }, () => []);
    prizes.forEach((prize, i) => {
      const shelfIdx = Math.min(Math.floor(i / perShelf), shelfCount - 1);
      result[shelfIdx].push(prize);
    });
    return result;
  }, [prizes]);

  const shelfYPositions = [18, 38, 58, 78];

  return (
    <div className="flex-1 relative px-2 pt-2 pb-4">
      {shelves.map((shelfPrizes, i) => (
        <Shelf
          key={i}
          yPercent={shelfYPositions[i]}
          prizes={shelfPrizes}
          shelfIndex={i}
        />
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────

function PrizeShack() {
  const { prizes } = usePrizes();
  const { tickets } = useTickets();
  const { triggerTransition } = useSceneTransition();
  const { playMusic, stopMusic } = useSound();
  const navigate = useNavigate();

  const isEmpty = prizes.length === 0;

  // Curtain rise entrance animation
  const [curtainRisen, setCurtainRisen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setCurtainRisen(true), 200);
    return () => clearTimeout(t);
  }, []);

  // Music
  useEffect(() => {
    playMusic("trophy");
    return () => {
      stopMusic();
    };
  }, [playMusic, stopMusic]);

  // Exit to midway
  const exitToMidway = useCallback(() => {
    stopMusic();
    triggerTransition(() => {
      navigate({ to: "/" });
    });
  }, [triggerTransition, navigate, stopMusic]);

  // Swipe-down gesture
  const mainRef = useRef<HTMLElement>(null);
  useSwipeGesture(mainRef, exitToMidway, 80);

  return (
    <main
      ref={mainRef}
      className="relative min-h-dvh overflow-hidden bg-midnight touch-pan-y select-none"
    >
      {/* ═══ ROOM BACKDROP ═══ */}

      {/* Back wall — carnival tent stripes */}
      <div className="absolute inset-0 bottom-[20%] z-0">
        {/* Bold tent stripes on the walls */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              var(--color-deep-purple) 0px,
              var(--color-deep-purple) 48px,
              var(--color-hot-magenta) 48px,
              var(--color-hot-magenta) 56px,
              var(--color-tent-canvas) 56px,
              var(--color-tent-canvas) 64px,
              var(--color-deep-purple) 64px,
              var(--color-deep-purple) 112px
            )`,
          }}
        />
        {/* Tent fold lines */}
        <div className="absolute top-0 left-[18%] bottom-0 w-px bg-tent-canvas/[0.05]" />
        <div className="absolute top-0 left-[52%] bottom-0 w-px bg-tent-canvas/[0.05]" />
        <div className="absolute top-0 left-[78%] bottom-0 w-px bg-tent-canvas/[0.05]" />
        {/* Ceiling dark gradient */}
        <div
          className="absolute top-0 left-0 right-0 h-16 sm:h-20 z-10"
          style={{
            background:
              "linear-gradient(180deg, #0D0517 0%, #1A0A2E 50%, transparent 100%)",
          }}
        />
      </div>

      {/* Wooden floor */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[20%] z-0"
        style={{
          background: `
            linear-gradient(
              to bottom,
              rgba(26, 10, 46, 0.2) 0%,
              rgba(26, 10, 46, 0.5) 30%,
              rgba(26, 10, 46, 0.9) 100%
            ),
            repeating-linear-gradient(
              0deg,
              transparent 0px,
              transparent 16px,
              rgba(0, 0, 0, 0.3) 16px,
              rgba(0, 0, 0, 0.3) 17px
            ),
            linear-gradient(
              180deg,
              var(--color-wood-dark) 0%,
              #3E2210 50%,
              #2A1508 100%
            )
          `,
          clipPath: "polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)",
        }}
      />

      {/* ═══ CONTENT (curtain-rise animated) ═══ */}
      <div
        className={`
          relative z-10 min-h-dvh flex flex-col
          ${curtainRisen ? "animate-curtain-rise" : "opacity-0"}
        `}
      >
        {/* Bulb string at top */}
        <BulbString />

        {/* Header area */}
        <div className="flex flex-col items-center gap-1 pt-1 pb-2 px-4">
          <HangingSign />
          <PrizePlaque count={prizes.length} />
        </div>

        {/* Main room area */}
        {isEmpty ? <EmptyState /> : <FilledShelves prizes={prizes} />}

        {/* ═══ DIEGETIC UI ELEMENTS ═══ */}

        {/* Chalkboard (top-right) */}
        <div className="absolute top-16 sm:top-20 right-3 sm:right-5 z-20">
          <ChalkboardTickets tickets={tickets} />
        </div>

        {/* EXIT sign */}
        <button
          type="button"
          onClick={exitToMidway}
          className={`
            absolute top-28 sm:top-36 right-3 sm:right-5 z-20
            exit-sign text-xs sm:text-sm
            bg-transparent border-none cursor-pointer
            hover:scale-110 active:scale-95
            transition-transform select-none
          `}
          aria-label="Exit to midway"
        >
          EXIT &rarr;
        </button>

        {/* Swipe-down hint */}
        {!isEmpty && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none">
            <span className="font-toon text-tent-canvas/25 text-[0.65rem] sm:text-xs animate-bob-float">
              ↓ swipe down to exit
            </span>
          </div>
        )}
      </div>
    </main>
  );
}
