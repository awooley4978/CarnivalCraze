import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { usePrizes } from "~/context/PrizeContext";
import { useTickets } from "~/context/TicketContext";
import { useSceneTransition } from "~/context/SceneContext";
import { useSound } from "~/context/SoundContext";
import { useSwipeGesture } from "~/hooks/useSwipeGesture";

export const Route = createFileRoute("/prizes")({
  component: TrophyRoom,
});

// ── Helpers ───────────────────────────────────────────────

/** Distribute prizes across 3 rows evenly (row 1 = closest, row 3 = deepest) */
function distributePrizes(prizes: string[]): [string[], string[], string[]] {
  const total = prizes.length;
  if (total === 0) return [[], [], []];
  const perRow = Math.ceil(total / 3);
  const row1 = prizes.slice(0, perRow);
  const row2 = prizes.slice(perRow, perRow * 2);
  const row3 = prizes.slice(perRow * 2);
  return [row1, row2, row3];
}

/** Seed-based "random" for consistent per-prize variation without re-renders */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ── Sub-components ────────────────────────────────────────

/** Mini bulb string decoration across the top of the room */
function BulbString() {
  const bulbs = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        lit: i % 3 !== 1,
        delayClass: `delay-bulb-${(i % 10) + 1}`,
        doubleBlink: i === 3 || i === 8 || i === 12,
      })),
    [],
  );

  return (
    <div className="relative w-full flex justify-between items-center px-2 py-3">
      {/* Wire */}
      <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-bulb-off/60 -translate-y-1/2 rounded-full" />
      {bulbs.map((bulb, i) => (
        <div
          key={i}
          className={`
            h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full flex-shrink-0
            ${bulb.lit ? "bg-bulb-gold glow-bulb" : "bg-bulb-off"}
            ${bulb.doubleBlink ? "animate-blink-bulb-double" : "animate-blink-bulb"}
            ${bulb.delayClass}
          `}
        />
      ))}
    </div>
  );
}

/** Hanging sign: "🏆 TROPHY ROOM 🏆" */
function HangingSign() {
  return (
    <div className="relative mx-auto mb-1">
      {/* Sign body */}
      <div
        className="
          bg-wood-horizontal border-toon rounded-bounce
          px-6 py-2 sm:px-8 sm:py-3
          shadow-[4px_4px_0_var(--color-toon-shadow)]
          relative z-10
        "
      >
        <h1 className="font-carnival text-electric-yellow text-xl sm:text-3xl m-0 text-center leading-tight select-none">
          🏆 TROPHY ROOM 🏆
        </h1>
      </div>
      {/* Hanging ropes from ceiling */}
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

/** Dust mote — tiny floating particle in a spotlight beam */
function DustMote({
  index,
  left,
  top,
}: {
  index: number;
  left: number;
  top: number;
}) {
  const duration = 3 + seededRandom(index * 7) * 4; // 3–7s
  const delay = seededRandom(index * 13) * 5; // 0–5s
  const size = 1.5 + seededRandom(index * 17) * 2.5; // 1.5–4px

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

/** Spotlight cone over a pedestal */
function Spotlight({
  variant = "full",
  swayDelay = 0,
}: {
  variant?: "full" | "dim" | "faint";
  swayDelay?: number;
}) {
  const coneClass =
    variant === "faint"
      ? "spotlight-cone-faint"
      : variant === "dim"
        ? "spotlight-cone-dim"
        : "spotlight-cone";

  return (
    <div
      className={`
        absolute inset-0 animate-spotlight-sway ${coneClass}
      `}
      style={{
        animationDelay: `${swayDelay}s`,
      }}
      aria-hidden
    />
  );
}

/** Single pedestal with prize emoji on top */
function Pedestal({
  prize,
  index,
  depth,
}: {
  prize: string;
  index: number;
  depth: number;
}) {
  const emoji = prize.slice(0, 2);
  const name = prize.slice(3);

  // Scale down deeper pedestals
  const scale = depth === 3 ? 0.72 : depth === 2 ? 0.85 : 1;
  const isRare = prize.includes("🌟") || prize.includes("🏆");

  return (
    <div
      className="flex flex-col items-center select-none flex-shrink-0 mx-4 sm:mx-6"
      style={{ transform: `scale(${scale})`, transformOrigin: "bottom center" }}
    >
      {/* Prize emoji */}
      <div
        className={`
          relative flex items-center justify-center
          text-[3.5rem] sm:text-[4.5rem] leading-none
          animate-wiggle z-10
          mb-0.5
          ${isRare ? "animate-sparkle-prize" : ""}
        `}
        style={{
          filter: isRare
            ? "drop-shadow(0 0 14px var(--color-prize-sparkle)) drop-shadow(3px 3px 0 var(--color-toon-shadow))"
            : "drop-shadow(3px 3px 0 var(--color-toon-shadow))",
        }}
      >
        {emoji}

        {/* Prize name label */}
        <div
          className="
            absolute -bottom-5 left-1/2 -translate-x-1/2
            bg-ink/80 border border-toon-shadow/30 rounded-bounce
            px-2 py-0.5
            whitespace-nowrap
          "
          style={{ transform: `scale(${1 / scale})` }}
        >
          <span className="font-toon text-tent-canvas text-[0.6rem] sm:text-xs leading-tight">
            {name}
          </span>
        </div>
      </div>

      {/* Spotlight cone behind the prize */}
      <div className="absolute w-40 h-56 sm:w-48 sm:h-64 -z-10 top-0 pointer-events-none">
        <Spotlight
          variant={depth === 3 ? "faint" : depth === 2 ? "dim" : "full"}
          swayDelay={index * 1.1}
        />
      </div>

      {/* Pedestal top platform */}
      <div className="pedestal-top w-20 sm:w-24 h-3 sm:h-4 relative z-10 mt-1" />

      {/* Pedestal column */}
      <div className="pedestal-column w-10 sm:w-12 h-12 sm:h-16 relative z-10" />

      {/* Pedestal base */}
      <div className="pedestal-base w-24 sm:w-28 h-3 sm:h-4 relative z-10" />
    </div>
  );
}

/** A row of pedestals at a specific depth with parallax scroll */
function PedestalRow({
  prizes,
  depth,
}: {
  prizes: string[];
  depth: number;
}) {
  if (prizes.length === 0) return null;

  return (
    <div
      className="flex items-end justify-start pb-0"
      style={{
        // Depth-appropriate spacing and margin
        marginTop: depth === 3 ? "0.5rem" : depth === 2 ? "1rem" : "1.5rem",
        paddingLeft: depth === 3 ? "6rem" : depth === 2 ? "3rem" : "0.5rem",
        paddingRight: "4rem",
      }}
    >
      {prizes.map((prize, i) => (
        <Pedestal
          key={`d${depth}-${i}`}
          prize={prize}
          index={i}
          depth={depth}
        />
      ))}
    </div>
  );
}

/** Empty state: dark room, single spotlight, floating dust */
function EmptyState() {
  const dustMotes = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: 30 + seededRandom(i * 3) * 40, // 30–70%
        top: 20 + seededRandom(i * 5) * 60, // 20–80%
        index: i,
      })),
    [],
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative">
      {/* Single spotlight cone */}
      <div className="absolute w-64 h-80 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <Spotlight variant="full" />
      </div>

      {/* Empty pedestal */}
      <div className="flex flex-col items-center relative z-10">
        <div className="text-[5rem] sm:text-[6rem] opacity-20 select-none mb-0.5">
          ❓
        </div>
        <div className="pedestal-top w-20 sm:w-24 h-3 sm:h-4 relative z-10" />
        <div className="pedestal-column w-10 sm:w-12 h-12 sm:h-16 relative z-10" />
        <div className="pedestal-base w-24 sm:w-28 h-3 sm:h-4 relative z-10" />
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
      <p className="font-toon text-tent-canvas/50 text-base sm:text-lg mt-8 select-none z-10">
        No prizes yet… go win some!
      </p>
    </div>
  );
}

/** Arrow indicator when scrollable */
function ScrollArrows({
  canScrollLeft,
  canScrollRight,
  onScrollLeft,
  onScrollRight,
}: {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onScrollLeft: () => void;
  onScrollRight: () => void;
}) {
  return (
    <>
      {canScrollLeft && (
        <button
          type="button"
          onClick={onScrollLeft}
          className="
            absolute left-1 top-1/2 -translate-y-1/2 z-30
            w-9 h-9 sm:w-10 sm:h-10
            rounded-full bg-ink/60 border border-tent-canvas/20
            flex items-center justify-center
            text-tent-canvas/70 hover:text-tent-canvas hover:bg-ink/80
            active:scale-90 transition-all
            cursor-pointer select-none
          "
          aria-label="Scroll left"
        >
          ◀
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={onScrollRight}
          className="
            absolute right-1 top-1/2 -translate-y-1/2 z-30
            w-9 h-9 sm:w-10 sm:h-10
            rounded-full bg-ink/60 border border-tent-canvas/20
            flex items-center justify-center
            text-tent-canvas/70 hover:text-tent-canvas hover:bg-ink/80
            active:scale-90 transition-all
            cursor-pointer select-none
          "
          aria-label="Scroll right"
        >
          ▶
        </button>
      )}
    </>
  );
}

// ── Main Component ────────────────────────────────────────

function TrophyRoom() {
  const { prizes } = usePrizes();
  const { tickets } = useTickets();
  const { triggerTransition } = useSceneTransition();
  const { playMusic, stopMusic } = useSound();
  const navigate = useNavigate();

  const isEmpty = prizes.length === 0;

  // Distribute prizes across 3 rows
  const [row1, row2, row3] = useMemo(() => distributePrizes(prizes), [prizes]);

  // ── Scroll state for arrows & parallax ──
  const scrollRef = useRef<HTMLDivElement>(null);
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);
  const row3Ref = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // ── Curtain rise entrance animation ──
  const [curtainRisen, setCurtainRisen] = useState(false);
  useEffect(() => {
    // Small delay so the SceneTransition curtains are done opening first
    const t = setTimeout(() => setCurtainRisen(true), 200);
    return () => clearTimeout(t);
  }, []);

  // ── Music ──
  useEffect(() => {
    playMusic("trophy");
    return () => {
      stopMusic();
    };
  }, [playMusic, stopMusic]);

  // ── Scroll arrow state ──
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => el.removeEventListener("scroll", updateScrollState);
  }, [updateScrollState, prizes]);

  // ── Parallax on scroll ──
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;

    if (row2Ref.current) {
      row2Ref.current.style.transform = `translateX(${-scrollLeft * 0.3}px)`;
    }
    if (row3Ref.current) {
      row3Ref.current.style.transform = `translateX(${-scrollLeft * 0.6}px)`;
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isEmpty) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    // Initial call
    handleScroll();
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll, isEmpty]);

  // ── Arrow button handlers ──
  const scrollBy = useCallback((dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.7, 400);
    el.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }, []);

  // ── Exit to midway ──
  const exitToMidway = useCallback(() => {
    stopMusic();
    triggerTransition(() => {
      navigate({ to: "/" });
    });
  }, [triggerTransition, navigate, stopMusic]);

  // ── Swipe-down gesture ──
  const mainRef = useRef<HTMLElement>(null);
  useSwipeGesture(mainRef, exitToMidway, 80);

  return (
    <main
      ref={mainRef}
      className="relative min-h-dvh overflow-hidden bg-midnight touch-pan-y select-none"
    >
      {/* ═══ ROOM BACKDROP ═══ */}

      {/* Back wall — tent stripes */}
      <div className="absolute inset-0 bottom-[25%] z-0">
        {/* Subtle striped tent pattern on the back wall */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              var(--color-circus-red) 0px,
              var(--color-circus-red) 60px,
              var(--color-tent-canvas) 60px,
              var(--color-tent-canvas) 120px
            )`,
          }}
        />
        {/* Tent fold lines */}
        <div className="absolute top-0 left-[20%] bottom-0 w-px bg-tent-canvas/[0.04]" />
        <div className="absolute top-0 left-[50%] bottom-0 w-px bg-tent-canvas/[0.04]" />
        <div className="absolute top-0 left-[80%] bottom-0 w-px bg-tent-canvas/[0.04]" />
        {/* Ceiling dark gradient */}
        <div
          className="absolute top-0 left-0 right-0 h-16 sm:h-20 z-10"
          style={{
            background:
              "linear-gradient(180deg, #0D0517 0%, #1A0A2E 50%, transparent 100%)",
          }}
        />
      </div>

      {/* Wooden floor with perspective */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[25%] z-0"
        style={{
          background: `
            linear-gradient(
              to bottom,
              rgba(26, 10, 46, 0.2) 0%,
              rgba(26, 10, 46, 0.6) 40%,
              rgba(26, 10, 46, 1) 100%
            ),
            repeating-linear-gradient(
              0deg,
              transparent 0px,
              transparent 14px,
              rgba(0, 0, 0, 0.25) 14px,
              rgba(0, 0, 0, 0.25) 15px
            ),
            linear-gradient(
              180deg,
              var(--color-wood-dark) 0%,
              #3E2210 50%,
              #2A1508 100%
            )
          `,
          // Perspective: floor lines converge toward center
          clipPath: "polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)",
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
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="flex-1 relative flex flex-col justify-end pb-4">
            {/* Scroll arrows */}
            <ScrollArrows
              canScrollLeft={canScrollLeft}
              canScrollRight={canScrollRight}
              onScrollLeft={() => scrollBy("left")}
              onScrollRight={() => scrollBy("right")}
            />

            {/* Horizontal scroll container */}
            <div
              ref={scrollRef}
              className="
                overflow-x-auto overflow-y-hidden
                scroll-snap-x-mandatory
                flex-shrink-0
                pb-2
                [scrollbar-width:none] [-ms-overflow-style:none]
                [&::-webkit-scrollbar]:hidden
              "
              style={{
                scrollSnapType: "x mandatory",
              }}
            >
              {/* Parallax rows — deepest first (rendered behind) */}
              <div className="relative w-max min-w-full flex flex-col">
                {/* Row 3: deepest (parallax 0.4×, rendered in JS at -0.6× on container scroll) */}
                <div ref={row3Ref} className="relative" style={{ willChange: "transform" }}>
                  <PedestalRow prizes={row3} depth={3} />
                </div>

                {/* Row 2: middle (parallax 0.7×, rendered in JS at -0.3×) */}
                <div ref={row2Ref} className="relative" style={{ willChange: "transform" }}>
                  <PedestalRow prizes={row2} depth={2} />
                </div>

                {/* Row 1: closest (parallax 1.0×, no JS translate needed — natural scroll) */}
                <div ref={row1Ref} className="relative">
                  <PedestalRow prizes={row1} depth={1} />
                </div>
              </div>
            </div>

            {/* Floor edge line */}
            <div className="h-1.5 sm:h-2 bg-wood-horizontal border-t-2 border-toon-shadow flex-shrink-0" />
          </div>
        )}

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

        {/* Swipe-down hint (bottom center, subtle) */}
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
