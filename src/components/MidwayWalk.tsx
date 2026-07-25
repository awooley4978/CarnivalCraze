import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useTickets } from "~/context/TicketContext";
import { useSceneTransition } from "~/context/SceneContext";

/* ───────────────────────────────────────────
   Booth Configuration
   ═══════════════════════════════════════════ */

interface BoothConfig {
  name: string;
  route: string;
  cost: number;
  signText: string;
  priceText: string;
  emoji: string;
  tentStripeColor: string;
  tentBaseColor: string;
  /** Extra decorative elements rendered in the background layer */
  bgDecorations: "balloons" | "bottles" | "ducks";
}

const BOOTHS: BoothConfig[] = [
  {
    name: "Balloon Pop",
    route: "/balloon-pop",
    cost: 2,
    signText: "POP 'EM ALL!",
    priceText: "3 DARTS — 2 🎟️",
    emoji: "🎯",
    tentStripeColor: "var(--color-circus-red)",
    tentBaseColor: "var(--color-tent-canvas)",
    bgDecorations: "balloons",
  },
  {
    name: "Bottle Bash",
    route: "/milk-bottle-toss",
    cost: 3,
    signText: "BOTTLE BASH",
    priceText: "4 THROWS — 3 🎟️",
    emoji: "⚾",
    tentStripeColor: "var(--color-tangerine)",
    tentBaseColor: "var(--color-tent-canvas)",
    bgDecorations: "bottles",
  },
  {
    name: "Duck Pond",
    route: "/duck-pond",
    cost: 1,
    signText: "PICK A DUCK!",
    priceText: "3 PICKS — 1 🎟️",
    emoji: "🦆",
    tentStripeColor: "var(--color-sky-pop)",
    tentBaseColor: "var(--color-deep-purple)",
    bgDecorations: "ducks",
  },
];

/* ───────────────────────────────────────────
   Background Decorations
   ═══════════════════════════════════════════ */

function BalloonBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {[
        { color: "#FF1493", x: 15, y: 20, size: 28, delay: 0 },
        { color: "#39FF14", x: 70, y: 12, size: 22, delay: 1.2 },
        { color: "#FF6B1A", x: 40, y: 35, size: 32, delay: 2.4 },
        { color: "#FFE600", x: 85, y: 28, size: 18, delay: 0.8 },
        { color: "#FF1493", x: 25, y: 55, size: 20, delay: 3.0 },
        { color: "#39FF14", x: 55, y: 18, size: 26, delay: 1.8 },
      ].map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-25"
          style={{
            width: b.size,
            height: b.size * 1.25,
            left: `${b.x}%`,
            top: `${b.y}%`,
            backgroundColor: b.color,
            borderRadius: "50% 50% 50% 50% / 40% 40% 60% 60%",
            animation: `bob-float 4s ease-in-out ${b.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function BottleBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Bottle pyramid silhouette */}
      <div className="absolute left-1/2 top-[20%] -translate-x-1/2 opacity-15">
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            <BottleShape />
            <BottleShape />
            <BottleShape />
          </div>
          <div className="flex gap-2">
            <BottleShape />
            <BottleShape />
          </div>
          <div className="flex gap-2">
            <BottleShape />
          </div>
        </div>
      </div>
      {/* Floating baseball */}
      <div
        className="absolute right-[20%] top-[45%] w-6 h-6 rounded-full opacity-15"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, var(--color-tent-canvas), var(--color-wood-dark))",
          animation: "bob-float 3.5s ease-in-out 0.5s infinite",
        }}
      />
    </div>
  );
}

function BottleShape() {
  return (
    <div
      className="w-5 h-12 rounded"
      style={{
        background: "var(--color-tent-canvas)",
        borderRadius: "4px 4px 2px 2px",
        opacity: 0.7,
      }}
    />
  );
}

function DuckBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Pond surface */}
      <div
        className="absolute left-0 right-0 bottom-[35%] h-[30%] opacity-20"
        style={{
          background:
            "linear-gradient(180deg, rgba(26,143,192,0.4) 0%, rgba(77,200,240,0.3) 100%)",
          borderRadius: "45% 45% 0 0 / 20% 20% 0 0",
        }}
      />
      {/* Duck silhouettes */}
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className="absolute opacity-20 text-3xl"
          style={{
            left: `${15 + n * 18}%`,
            top: `${50 + (n % 2) * 8}%`,
            animation: `bob-float ${3 + n * 0.3}s ease-in-out ${n * 0.7}s infinite`,
            filter: "brightness(0) invert(1)",
          }}
        >
          🦆
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────────────────────────
   WalkIndicator
   ═══════════════════════════════════════════ */

function WalkIndicator({
  total,
  active,
  onSelect,
}: {
  total: number;
  active: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 flex gap-3 items-center">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          className="transition-all duration-300 cursor-pointer select-none"
          style={{
            transform: i === active ? "scale(1.2)" : "scale(0.8)",
            opacity: i === active ? 1 : 0.4,
          }}
          aria-label={`Go to booth ${i + 1}`}
        >
          {/* Mini tent icon */}
          <div
            className="w-6 h-5 flex flex-col items-center"
            style={{
              filter:
                i === active
                  ? `drop-shadow(0 0 6px var(--color-bulb-gold))`
                  : "none",
            }}
          >
            <div
              className="w-0 h-0"
              style={{
                borderLeft: "10px solid transparent",
                borderRight: "10px solid transparent",
                borderBottom: i === active
                  ? "14px solid var(--color-bulb-gold)"
                  : "14px solid var(--color-bulb-off)",
              }}
            />
            <div
              className="w-5 h-1.5"
              style={{
                backgroundColor: i === active
                  ? "var(--color-bulb-gold)"
                  : "var(--color-bulb-off)",
                transition: "background-color 0.3s",
              }}
            />
          </div>
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────────────────────────
   BoothScene
   ═══════════════════════════════════════════ */

function BoothScene({
  booth,
  index,
  scrollOffset,
  viewportWidth,
  onPlay,
  showInsufficient,
}: {
  booth: BoothConfig;
  index: number;
  scrollOffset: number;
  viewportWidth: number;
  onPlay: () => void;
  showInsufficient: boolean;
}) {
  const boothCenter = index * viewportWidth;
  const offset = scrollOffset - boothCenter;

  const layer1X = offset * 0.2;
  const layer2X = offset * 0.5;
  const layer3X = offset * 1.0;
  const layer4X = offset * 1.2;

  return (
    <div className="min-w-[100vw] h-dvh relative snap-center overflow-hidden flex-shrink-0">
      {/* Layer 1: Backdrop — night sky, stars, decorations */}
      <div
        className="absolute inset-0"
        style={{ transform: `translateX(${layer1X}px)` }}
      >
        {/* Night sky gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(
              180deg,
              #0D0524 0%,
              #1A0A2E 50%,
              #2D1040 100%
            )`,
          }}
        />
        {/* Stars */}
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: 1 + (i % 3),
              height: 1 + (i % 3),
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 23 + 7) % 40}%`,
              opacity: 0.3 + (i % 3) * 0.2,
              animation: `pulse-star ${2 + (i % 3)}s ease-in-out ${i * 0.3}s infinite`,
            }}
          />
        ))}
        {/* Distant ferris wheel silhouette */}
        <div className="absolute right-[5%] top-[15%] opacity-8">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="30" stroke="var(--color-deep-purple)" strokeWidth="2" fill="none" opacity="0.15" />
            <circle cx="40" cy="40" r="2" fill="var(--color-deep-purple)" opacity="0.15" />
            {[0, 45, 90, 135].map((angle) => (
              <line
                key={angle}
                x1="40"
                y1="40"
                x2={40 + 28 * Math.cos((angle * Math.PI) / 180)}
                y2={40 + 28 * Math.sin((angle * Math.PI) / 180)}
                stroke="var(--color-deep-purple)"
                strokeWidth="1"
                opacity="0.12"
              />
            ))}
          </svg>
        </div>
        {/* Background decorations */}
        {booth.bgDecorations === "balloons" && <BalloonBg />}
        {booth.bgDecorations === "bottles" && <BottleBg />}
        {booth.bgDecorations === "ducks" && <DuckBg />}
      </div>

      {/* Layer 2: Tent Structure */}
      <div
        className="absolute inset-x-0 top-[8%] bottom-[20%]"
        style={{ transform: `translateX(${layer2X}px)` }}
      >
        {/* Tent top — striped awning */}
        <div
          className="relative mx-auto w-[90%] h-full"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              ${booth.tentStripeColor} 0px,
              ${booth.tentStripeColor} 48px,
              ${booth.tentBaseColor} 48px,
              ${booth.tentBaseColor} 96px
            )`,
            borderRadius: "50% 50% 0 0 / 8% 8% 0 0",
            border: "4px solid var(--color-toon-shadow)",
            borderBottom: "none",
            boxShadow: "inset 0 -40px 60px rgba(0,0,0,0.3)",
            overflow: "hidden",
          }}
        >
          {/* Subtle wave animation */}
          <div
            className="absolute inset-0 animate-tent-stripe-wave opacity-30"
            style={{
              background: `repeating-linear-gradient(
                90deg,
                transparent 0px,
                transparent 40px,
                rgba(255,255,255,0.08) 40px,
                rgba(255,255,255,0.08) 80px
              )`,
            }}
          />
          {/* Draped flaps on sides */}
          <div
            className="absolute left-0 top-0 bottom-0 w-8"
            style={{
              background: `linear-gradient(90deg, ${booth.tentStripeColor}, transparent)`,
            }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-8"
            style={{
              background: `linear-gradient(270deg, ${booth.tentStripeColor}, transparent)`,
            }}
          />
        </div>
        {/* Tent poles */}
        <div
          className="absolute left-[8%] top-0 bottom-0 w-2"
          style={{
            background: "linear-gradient(90deg, var(--color-ink), var(--color-toon-shadow))",
            borderRadius: "2px",
          }}
        />
        <div
          className="absolute right-[8%] top-0 bottom-0 w-2"
          style={{
            background: "linear-gradient(90deg, var(--color-toon-shadow), var(--color-ink))",
            borderRadius: "2px",
          }}
        />
      </div>

      {/* Layer 3: Foreground — signage, price, PLAY button */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center z-10"
        style={{ transform: `translateX(${layer3X}px)` }}
      >
        {/* Signage */}
        <div
          className="mb-3 px-6 py-3"
          style={{
            background: "linear-gradient(180deg, #3E2210, #7A4F2B)",
            borderRadius: "var(--radius-bounce)",
            border: "3px solid var(--color-toon-shadow)",
            boxShadow: "4px 4px 0 var(--color-toon-shadow)",
            transform: "rotate(-1.5deg)",
          }}
        >
          <h2
            className="text-center m-0"
            style={{
              fontFamily: "var(--font-carnival)",
              color: "var(--color-electric-yellow)",
              fontSize: "clamp(1.5rem, 6vw, 2.5rem)",
              textShadow: "3px 3px 0 var(--color-toon-shadow)",
              letterSpacing: "0.03em",
            }}
          >
            {booth.signText}
          </h2>
        </div>

        {/* Price chalkboard */}
        <div
          className="mb-5 px-4 py-2"
          style={{
            background: "#2A4A3A",
            borderRadius: "8px",
            border: "3px solid #3E2210",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4)",
            transform: "rotate(1deg)",
          }}
        >
          <p
            className="m-0 text-center"
            style={{
              fontFamily: "var(--font-toon)",
              color: "#D4E8D0",
              fontSize: "clamp(0.7rem, 2.5vw, 1rem)",
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            {booth.priceText}
          </p>
        </div>

        {/* Booth emoji */}
        <span
          className="text-5xl mb-4"
          style={{
            filter: "drop-shadow(3px 3px 0 var(--color-toon-shadow))",
          }}
          role="img"
          aria-label={booth.name}
        >
          {booth.emoji}
        </span>

        {/* PLAY button */}
        <button
          type="button"
          onClick={onPlay}
          className="cursor-pointer select-none"
          style={{
            fontFamily: "var(--font-carnival)",
            background: "var(--color-hot-magenta)",
            color: "var(--color-tent-canvas)",
            padding: "0.6rem 2.5rem",
            borderRadius: "var(--radius-bounce)",
            border: "3px solid var(--color-toon-shadow)",
            boxShadow: "5px 5px 0 var(--color-toon-shadow)",
            fontSize: "clamp(1rem, 4vw, 1.4rem)",
            letterSpacing: "0.05em",
            transform: "rotate(0.5deg)",
            transition: "transform 0.1s ease, box-shadow 0.1s ease",
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "translate(2px, 2px) rotate(0.5deg)";
            e.currentTarget.style.boxShadow = "2px 2px 0 var(--color-toon-shadow)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "rotate(0.5deg)";
            e.currentTarget.style.boxShadow = "5px 5px 0 var(--color-toon-shadow)";
          }}
        >
          PLAY
        </button>

        {/* Insufficient tickets indicator */}
        {showInsufficient && (
          <div
            className="mt-3 animate-bounce-in"
            style={{ animationDuration: "0.6s" }}
          >
            <span
              className="text-4xl block text-center"
              role="img"
              aria-label="Not enough tickets"
            >
              🤡
            </span>
            <p
              className="m-0 text-center"
              style={{
                fontFamily: "var(--font-toon)",
                color: "var(--color-hot-magenta)",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              Need more tickets!
            </p>
          </div>
        )}
      </div>

      {/* Layer 4: Ground — welcome mat, rope barriers */}
      <div
        className="absolute bottom-0 inset-x-0 h-[18%]"
        style={{ transform: `translateX(${layer4X}px)` }}
      >
        {/* Rope barriers */}
        <div className="absolute left-[5%] right-[5%] top-0 flex justify-between">
          <RopePost side="left" />
          <RopePost side="right" />
        </div>
        {/* Welcome mat */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[60%] max-w-[280px] h-3 rounded-sm"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              var(--color-circus-red) 0px,
              var(--color-circus-red) 20px,
              var(--color-tent-canvas) 20px,
              var(--color-tent-canvas) 40px
            )`,
            border: "2px solid var(--color-toon-shadow)",
            opacity: 0.7,
          }}
        />
      </div>
    </div>
  );
}

function RopePost({ side }: { side: "left" | "right" }) {
  return (
    <div className="flex flex-col items-center" aria-hidden>
      {/* Post */}
      <div
        className="w-2.5 h-12 rounded-sm"
        style={{
          background: "linear-gradient(90deg, var(--color-wood-light), var(--color-wood-dark))",
          border: "1px solid var(--color-toon-shadow)",
        }}
      />
      {/* Ball top */}
      <div
        className="w-4 h-4 rounded-full -mt-1"
        style={{
          background: "var(--color-bulb-gold)",
          border: "2px solid var(--color-toon-shadow)",
          boxShadow: "0 0 6px var(--color-bulb-gold)",
        }}
      />
    </div>
  );
}

/* ───────────────────────────────────────────
   BalloonPopBoothScene — Custom Balloon Pop Booth
   ═══════════════════════════════════════════ */

/** A single hanging balloon on the back wall */
function HangingBalloon({
  color,
  left,
  delay,
  size,
}: {
  color: string;
  left: string;
  delay: number;
  size: number;
}) {
  return (
    <div
      className="absolute"
      style={{
        left,
        top: "25%",
        animation: `wiggle ${3 + delay * 0.7}s ease-in-out ${delay}s infinite`,
        transformOrigin: "top center",
      }}
      aria-hidden
    >
      {/* String */}
      <div
        className="mx-auto w-px"
        style={{
          height: `${size * 1.6}px`,
          background: "var(--color-tent-canvas)",
          opacity: 0.5,
        }}
      />
      {/* Balloon body */}
      <div
        style={{
          width: `${size}px`,
          height: `${size * 1.25}px`,
          backgroundColor: color,
          borderRadius: "50% 50% 50% 50% / 40% 40% 60% 60%",
          border: "2px solid rgba(0,0,0,0.25)",
          boxShadow: `inset -3px -5px 8px rgba(0,0,0,0.2), inset 2px 2px 6px rgba(255,255,255,0.35)`,
        }}
      />
      {/* Knot */}
      <div
        className="mx-auto"
        style={{
          width: `${size * 0.22}px`,
          height: `${size * 0.18}px`,
          backgroundColor: color,
          filter: "brightness(0.7)",
          borderRadius: "2px",
          border: "1px solid rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
}

/** A popped balloon scrap still pinned to the wall */
function PoppedScrap({
  color,
  left,
  top,
  rotation,
}: {
  color: string;
  left: string;
  top: string;
  rotation: number;
}) {
  return (
    <div
      className="absolute"
      style={{
        left,
        top,
        transform: `rotate(${rotation}deg)`,
      }}
      aria-hidden
    >
      {/* Tiny string stub */}
      <div
        className="mx-auto w-px"
        style={{
          height: "14px",
          background: "var(--color-tent-canvas)",
          opacity: 0.4,
        }}
      />
      {/* Shriveled scrap */}
      <div
        style={{
          width: "14px",
          height: "10px",
          backgroundColor: color,
          borderRadius: "30% 70% 50% 50% / 30% 30% 70% 70%",
          border: "1.5px solid rgba(0,0,0,0.3)",
          opacity: 0.7,
        }}
      />
    </div>
  );
}

/** A dart stuck in the wooden counter */
function StuckDart({ angle, left, top }: { angle: number; left: string; top: string }) {
  return (
    <div
      className="absolute"
      style={{
        left,
        top,
        transform: `rotate(${angle}deg)`,
        transformOrigin: "bottom center",
      }}
      aria-hidden
    >
      {/* Dart shaft */}
      <div
        style={{
          width: "2px",
          height: "28px",
          background: "linear-gradient(180deg, #C0C0C0, #888)",
          margin: "0 auto",
        }}
      />
      {/* Dart flight (fletching) */}
      <div
        style={{
          width: "0",
          height: "0",
          borderLeft: "4px solid transparent",
          borderRight: "4px solid transparent",
          borderBottom: "6px solid var(--color-hot-magenta)",
          margin: "0 auto",
        }}
      />
      {/* Dart tip (embedded in wood — just visible) */}
      <div
        style={{
          width: "0",
          height: "0",
          borderLeft: "3px solid transparent",
          borderRight: "3px solid transparent",
          borderTop: "5px solid #CCC",
          margin: "0 auto",
          marginTop: "-1px",
        }}
      />
    </div>
  );
}

function BalloonPopBoothScene({
  booth,
  index,
  scrollOffset,
  viewportWidth,
  onPlay,
  showInsufficient,
}: {
  booth: BoothConfig;
  index: number;
  scrollOffset: number;
  viewportWidth: number;
  onPlay: () => void;
  showInsufficient: boolean;
}) {
  const boothCenter = index * viewportWidth;
  const offset = scrollOffset - boothCenter;

  const layer1X = offset * 0.2;
  const layer2X = offset * 0.5;
  const layer3X = offset * 1.0;
  const layer4X = offset * 1.2;

  // Balloon colors
  const balloonColors = [
    "var(--color-circus-red)",
    "var(--color-hot-magenta)",
    "var(--color-acid-green)",
    "var(--color-electric-yellow)",
    "var(--color-sky-pop)",
    "var(--color-tangerine)",
  ];

  return (
    <div className="min-w-[100vw] h-dvh relative snap-center overflow-hidden flex-shrink-0">
      {/* Layer 1: Backdrop — night sky */}
      <div
        className="absolute inset-0"
        style={{ transform: `translateX(${layer1X}px)` }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, #0D0524 0%, #1A0A2E 50%, #2D1040 100%)`,
          }}
        />
        {/* Stars */}
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: 1 + (i % 3),
              height: 1 + (i % 3),
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 23 + 7) % 40}%`,
              opacity: 0.3 + (i % 3) * 0.2,
              animation: `pulse-star ${2 + (i % 3)}s ease-in-out ${i * 0.3}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Layer 2: Booth Structure — wooden booth with awning */}
      <div
        className="absolute inset-x-0 top-[5%] bottom-[18%]"
        style={{ transform: `translateX(${layer2X}px)` }}
      >
        {/* ── Striped awning (top portion) ── */}
        <div
          className="relative mx-auto w-[88%] h-[28%]"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              var(--color-circus-red) 0px,
              var(--color-circus-red) 52px,
              var(--color-tent-canvas) 52px,
              var(--color-tent-canvas) 104px
            )`,
            borderRadius: "50% 50% 0 0 / 15% 15% 0 0",
            border: "4px solid var(--color-toon-shadow)",
            borderBottom: "none",
            boxShadow: "inset 0 -30px 50px rgba(0,0,0,0.25)",
            overflow: "hidden",
          }}
        >
          {/* Awning wave animation */}
          <div
            className="absolute inset-0 animate-tent-stripe-wave opacity-25"
            style={{
              background: `repeating-linear-gradient(
                90deg,
                transparent 0px,
                transparent 44px,
                rgba(255,255,255,0.06) 44px,
                rgba(255,255,255,0.06) 88px
              )`,
            }}
          />
          {/* Pennant flags along awning bottom */}
          {[10, 28, 46, 64, 82].map((pct, i) => (
            <div
              key={i}
              className="absolute bottom-0"
              style={{
                left: `${pct}%`,
                width: "0",
                height: "0",
                borderLeft: "7px solid transparent",
                borderRight: "7px solid transparent",
                borderTop: `10px solid ${i % 2 === 0 ? "var(--color-electric-yellow)" : "var(--color-hot-magenta)"}`,
                filter: "drop-shadow(1px 1px 0 var(--color-toon-shadow))",
              }}
            />
          ))}
        </div>

        {/* ── Booth back wall (wooden planks) ── */}
        <div
          className="relative mx-auto w-[88%] h-[55%]"
          style={{
            background: `
              repeating-linear-gradient(
                0deg,
                transparent 0px,
                transparent 1px,
                rgba(0,0,0,0.15) 1px,
                rgba(0,0,0,0.15) 2px
              ),
              linear-gradient(180deg, #4A2A14 0%, #3E2210 40%, #2A1508 100%)
            `,
            borderLeft: "4px solid var(--color-toon-shadow)",
            borderRight: "4px solid var(--color-toon-shadow)",
            boxShadow: "inset 0 4px 20px rgba(0,0,0,0.5)",
          }}
        >
          {/* ── Prize shelf at top of back wall ── */}
          <div
            className="absolute left-0 right-0 top-[8%] mx-3"
            style={{
              height: "3px",
              background: "linear-gradient(180deg, #8B6340, #5C3A1E)",
              borderBottom: "1px solid rgba(0,0,0,0.3)",
            }}
          />
          <div
            className="absolute left-0 right-0 top-[calc(8%+3px)] mx-2"
            style={{
              height: "8px",
              background: "linear-gradient(180deg, #7A4F2B 0%, #5C3A1E 60%, #3E2210 100%)",
              borderBottom: "2px solid var(--color-toon-shadow)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
            }}
          />
          {/* Prize emojis on the shelf */}
          <div className="absolute left-[12%] top-[2%] text-lg" aria-hidden>🧸</div>
          <div className="absolute left-[42%] top-[2%] text-lg" aria-hidden>⭐</div>
          <div className="absolute left-[72%] top-[2%] text-lg" aria-hidden>🎪</div>

          {/* ── Hanging balloons on back wall ── */}
          {balloonColors.map((color, i) => (
            <HangingBalloon
              key={`balloon-${i}`}
              color={color}
              left={`${8 + i * 15}%`}
              delay={i * 0.6}
              size={28 + (i % 3) * 4}
            />
          ))}

          {/* ── Popped balloon scraps ── */}
          <PoppedScrap
            color="var(--color-circus-red)"
            left="22%"
            top="55%"
            rotation={-15}
          />
          <PoppedScrap
            color="var(--color-acid-green)"
            left="62%"
            top="50%"
            rotation={12}
          />
          <PoppedScrap
            color="var(--color-sky-pop)"
            left="78%"
            top="60%"
            rotation={-8}
          />
        </div>

        {/* ── Wooden counter spanning booth width ── */}
        <div
          className="relative mx-auto w-[88%]"
          style={{
            height: "14px",
            background: "linear-gradient(180deg, #8B6340 0%, #7A4F2B 15%, #5C3A1E 50%, #3E2210 100%)",
            border: "4px solid var(--color-toon-shadow)",
            borderTop: "5px solid #9B7348",
            borderBottom: "none",
            boxShadow: "0 6px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
        >
          {/* ── Darts stuck in counter front ── */}
          <StuckDart angle={-20} left="18%" top="-32px" />
          <StuckDart angle={15} left="52%" top="-34px" />
          <StuckDart angle={-8} left="78%" top="-30px" />

          {/* Cork board texture dots on counter */}
          <div className="absolute inset-0 overflow-hidden opacity-30">
            {Array.from({ length: 15 }, (_, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: `${2 + (i % 2)}px`,
                  height: `${2 + (i % 2)}px`,
                  left: `${(i * 31 + 5) % 100}%`,
                  top: `${40 + (i % 3) * 15}%`,
                  background: "var(--color-cork)",
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Counter front face ── */}
        <div
          className="relative mx-auto w-[88%]"
          style={{
            height: "10px",
            background: "linear-gradient(180deg, #3E2210 0%, #2A1508 100%)",
            borderLeft: "4px solid var(--color-toon-shadow)",
            borderRight: "4px solid var(--color-toon-shadow)",
            borderBottom: "4px solid var(--color-toon-shadow)",
            boxShadow: "0 4px 10px rgba(0,0,0,0.6)",
          }}
        />
      </div>

      {/* Tent poles */}
      <div
        className="absolute left-[6%] top-[5%] bottom-[18%] w-2"
        style={{
          background: "linear-gradient(90deg, var(--color-ink), var(--color-toon-shadow))",
          borderRadius: "2px",
          transform: `translateX(${layer2X}px)`,
        }}
      />
      <div
        className="absolute right-[6%] top-[5%] bottom-[18%] w-2"
        style={{
          background: "linear-gradient(90deg, var(--color-toon-shadow), var(--color-ink))",
          borderRadius: "2px",
          transform: `translateX(${layer2X}px)`,
        }}
      />

      {/* ── Bulb lights along awning edge ── */}
      <div
        className="absolute inset-x-0 top-[calc(5%+28%-8px)] z-10 flex justify-center"
        style={{ transform: `translateX(${layer2X}px)` }}
      >
        <div className="w-[88%] flex justify-around px-4">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="w-3.5 h-3.5 rounded-full animate-blink-bulb"
              style={{
                backgroundColor: "var(--color-bulb-gold)",
                border: "2px solid var(--color-toon-shadow)",
                boxShadow: "0 0 6px 2px var(--color-bulb-gold)",
                animationDelay: `${i * 0.15}s`,
                marginTop: "-6px",
              }}
            />
          ))}
        </div>
      </div>

      {/* Layer 3: Foreground — sign, price, emoji, PLAY */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center z-10"
        style={{ transform: `translateX(${layer3X}px)` }}
      >
        {/* "POP 'EM ALL!" sign */}
        <div
          className="mb-2 px-6 py-3"
          style={{
            background: "linear-gradient(180deg, #3E2210, #7A4F2B)",
            borderRadius: "var(--radius-bounce)",
            border: "3px solid var(--color-toon-shadow)",
            boxShadow: "4px 4px 0 var(--color-toon-shadow)",
            transform: "rotate(-1.5deg)",
          }}
        >
          <h2
            className="text-center m-0"
            style={{
              fontFamily: "var(--font-carnival)",
              color: "var(--color-electric-yellow)",
              fontSize: "clamp(1.5rem, 6vw, 2.5rem)",
              textShadow: "3px 3px 0 var(--color-toon-shadow)",
              letterSpacing: "0.03em",
            }}
          >
            {booth.signText}
          </h2>
        </div>

        {/* Price chalkboard */}
        <div
          className="mb-5 px-4 py-2"
          style={{
            background: "#2A4A3A",
            borderRadius: "8px",
            border: "3px solid #3E2210",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4)",
            transform: "rotate(1deg)",
          }}
        >
          <p
            className="m-0 text-center"
            style={{
              fontFamily: "var(--font-toon)",
              color: "#D4E8D0",
              fontSize: "clamp(0.7rem, 2.5vw, 1rem)",
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            {booth.priceText}
          </p>
        </div>

        {/* Booth emoji */}
        <span
          className="text-5xl mb-4"
          style={{
            filter: "drop-shadow(3px 3px 0 var(--color-toon-shadow))",
          }}
          role="img"
          aria-label={booth.name}
        >
          {booth.emoji}
        </span>

        {/* PLAY button */}
        <button
          type="button"
          onClick={onPlay}
          className="cursor-pointer select-none"
          style={{
            fontFamily: "var(--font-carnival)",
            background: "var(--color-hot-magenta)",
            color: "var(--color-tent-canvas)",
            padding: "0.6rem 2.5rem",
            borderRadius: "var(--radius-bounce)",
            border: "3px solid var(--color-toon-shadow)",
            boxShadow: "5px 5px 0 var(--color-toon-shadow)",
            fontSize: "clamp(1rem, 4vw, 1.4rem)",
            letterSpacing: "0.05em",
            transform: "rotate(0.5deg)",
            transition: "transform 0.1s ease, box-shadow 0.1s ease",
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "translate(2px, 2px) rotate(0.5deg)";
            e.currentTarget.style.boxShadow = "2px 2px 0 var(--color-toon-shadow)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "rotate(0.5deg)";
            e.currentTarget.style.boxShadow = "5px 5px 0 var(--color-toon-shadow)";
          }}
        >
          PLAY
        </button>

        {/* Insufficient tickets */}
        {showInsufficient && (
          <div
            className="mt-3 animate-bounce-in"
            style={{ animationDuration: "0.6s" }}
          >
            <span
              className="text-4xl block text-center"
              role="img"
              aria-label="Not enough tickets"
            >
              🤡
            </span>
            <p
              className="m-0 text-center"
              style={{
                fontFamily: "var(--font-toon)",
                color: "var(--color-hot-magenta)",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              Need more tickets!
            </p>
          </div>
        )}
      </div>

      {/* Layer 4: Ground — welcome mat, rope barriers */}
      <div
        className="absolute bottom-0 inset-x-0 h-[18%]"
        style={{ transform: `translateX(${layer4X}px)` }}
      >
        <div className="absolute left-[5%] right-[5%] top-0 flex justify-between">
          <RopePost side="left" />
          <RopePost side="right" />
        </div>
        {/* Red-striped welcome mat */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[60%] max-w-[280px] h-3 rounded-sm"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              var(--color-circus-red) 0px,
              var(--color-circus-red) 20px,
              var(--color-tent-canvas) 20px,
              var(--color-tent-canvas) 40px
            )`,
            border: "2px solid var(--color-toon-shadow)",
            opacity: 0.8,
          }}
        />
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────
   MidwayGround
   ═══════════════════════════════════════════ */

function MidwayGround({ scrollOffset }: { scrollOffset: number }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-[15%] pointer-events-none z-5"
      style={{ transform: `translateX(${scrollOffset * 0.1}px)` }}
    >
      {/* Dirt gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            180deg,
            #3E2210 0%,
            #5C3A1E 30%,
            #2A4A1E 70%,
            #1A3A0E 100%
          )`,
          borderTop: "3px solid var(--color-toon-shadow)",
        }}
      />
      {/* Sawdust texture dots */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        {Array.from({ length: 60 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 1 + (i % 3),
              height: 1 + (i % 3),
              left: `${(i * 17 + 5) % 100}%`,
              top: `${(i * 13 + 2) % 100}%`,
              background: i % 2 === 0 ? "var(--color-tent-canvas)" : "var(--color-wood-light)",
              opacity: 0.5,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────
   Prize Shelf slide
   ═══════════════════════════════════════════ */

function PrizeShelfSlide({
  scrollOffset,
  viewportWidth,
}: {
  scrollOffset: number;
  viewportWidth: number;
}) {
  const boothCenter = 3 * viewportWidth; // 4th slide
  const offset = scrollOffset - boothCenter;

  return (
    <div className="min-w-[100vw] h-dvh relative snap-center overflow-hidden flex-shrink-0 flex flex-col items-center justify-center">
      {/* Night sky backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, #0D0524 0%, #1A0A2E 50%, #2D1040 100%)`,
          transform: `translateX(${offset * 0.2}px)`,
        }}
      />
      {/* Stars */}
      <div
        className="absolute inset-0"
        style={{ transform: `translateX(${offset * 0.2}px)` }}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: 1 + (i % 2),
              height: 1 + (i % 2),
              left: `${(i * 41 + 11) % 100}%`,
              top: `${(i * 19 + 5) % 35}%`,
              opacity: 0.2 + (i % 3) * 0.15,
              animation: `pulse-star ${2 + (i % 3)}s ease-in-out ${i * 0.3}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Small tent for prize shelf */}
      <div
        className="relative w-[70%] max-w-[280px] mb-5"
        style={{ transform: `translateX(${offset * 0.5}px)` }}
      >
        {/* Mini tent top */}
        <div
          className="w-full h-32"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              var(--color-deep-purple) 0px,
              var(--color-deep-purple) 36px,
              var(--color-hot-magenta) 36px,
              var(--color-hot-magenta) 72px
            )`,
            borderRadius: "50% 50% 0 0 / 12% 12% 0 0",
            border: "4px solid var(--color-toon-shadow)",
            borderBottom: "none",
            boxShadow: "inset 0 -20px 40px rgba(0,0,0,0.3)",
          }}
        />
        <div
          className="w-full h-1"
          style={{
            background: "var(--color-toon-shadow)",
          }}
        />
      </div>

      {/* Sign and link */}
      <div
        style={{ transform: `translateX(${offset * 1.0}px)` }}
        className="flex flex-col items-center gap-4 z-10"
      >
        <span className="text-5xl" role="img" aria-label="Prize Shelf">
          🧸
        </span>
        <h2
          className="text-center m-0"
          style={{
            fontFamily: "var(--font-carnival)",
            color: "var(--color-electric-yellow)",
            fontSize: "clamp(1.2rem, 5vw, 2rem)",
            textShadow: "3px 3px 0 var(--color-toon-shadow)",
          }}
        >
          Prize Shelf
        </h2>
        <p
          className="text-center m-0"
          style={{
            fontFamily: "var(--font-toon)",
            color: "var(--color-tent-canvas)",
            fontSize: "0.85rem",
            opacity: 0.8,
          }}
        >
          View your collection
        </p>
        <Link
          to="/prizes"
          className="cursor-pointer select-none no-underline"
          style={{
            fontFamily: "var(--font-carnival)",
            background: "var(--color-prize-sparkle)",
            color: "var(--color-ink)",
            padding: "0.5rem 2rem",
            borderRadius: "var(--radius-bounce)",
            border: "3px solid var(--color-toon-shadow)",
            boxShadow: "4px 4px 0 var(--color-toon-shadow)",
            fontSize: "1.1rem",
            letterSpacing: "0.05em",
            transition: "transform 0.1s ease",
          }}
        >
          VIEW
        </Link>
      </div>

      {/* Ground strip */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[12%]"
        style={{ transform: `translateX(${offset * 1.2}px)` }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #3E2210 0%, #5C3A1E 40%, #2A4A1E 80%, #1A3A0E 100%)",
            borderTop: "3px solid var(--color-toon-shadow)",
          }}
        />
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────
   MidwayWalk — Main Component
   ═══════════════════════════════════════════ */

export default function MidwayWalk() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeBooth, setActiveBooth] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 375,
  );
  const [insufficientBooth, setInsufficientBooth] = useState<number | null>(null);
  const insufficientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { spendTickets } = useTickets();
  const { triggerTransition } = useSceneTransition();
  const navigate = useNavigate();

  // Track viewport width
  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Scroll listener
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function handleScroll() {
      const offset = track.scrollLeft;
      setScrollOffset(offset);
      const vw = track.clientWidth;
      if (vw > 0) {
        const idx = Math.round(offset / vw);
        setActiveBooth(Math.min(idx, BOOTHS.length)); // allow up to prize shelf slide
      }
    }

    track.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => track.removeEventListener("scroll", handleScroll);
  }, []);

  // Cleanup insufficient timer
  useEffect(() => {
    return () => {
      if (insufficientTimerRef.current) {
        clearTimeout(insufficientTimerRef.current);
      }
    };
  }, []);

  /** Navigate to a specific booth index */
  const scrollToBooth = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      track.scrollTo({
        left: index * track.clientWidth,
        behavior: "smooth",
      });
    },
    [],
  );

  /** Handle PLAY tap on a booth */
  const handlePlay = useCallback(
    (index: number) => {
      const booth = BOOTHS[index];
      if (!booth) return;

      if (!spendTickets(booth.cost)) {
        // Show sad clown
        setInsufficientBooth(index);
        if (insufficientTimerRef.current) {
          clearTimeout(insufficientTimerRef.current);
        }
        insufficientTimerRef.current = setTimeout(() => {
          setInsufficientBooth(null);
        }, 2500);
        return;
      }

      triggerTransition(() => {
        navigate({ to: booth.route } as any);
      });
    },
    [spendTickets, triggerTransition, navigate],
  );

  const totalSlides = BOOTHS.length + 1; // +1 for Prize Shelf

  return (
    <main className="w-full h-dvh overflow-hidden relative bg-midnight">
      {/* Carousel Track */}
      <div
        ref={trackRef}
        className="flex h-full overflow-x-auto snap-x snap-mandatory scroll-smooth"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {BOOTHS.map((booth, i) =>
          booth.bgDecorations === "balloons" ? (
            <BalloonPopBoothScene
              key={booth.route}
              booth={booth}
              index={i}
              scrollOffset={scrollOffset}
              viewportWidth={viewportWidth}
              onPlay={() => handlePlay(i)}
              showInsufficient={insufficientBooth === i}
            />
          ) : (
            <BoothScene
              key={booth.route}
              booth={booth}
              index={i}
              scrollOffset={scrollOffset}
              viewportWidth={viewportWidth}
              onPlay={() => handlePlay(i)}
              showInsufficient={insufficientBooth === i}
            />
          ),
        )}
        <PrizeShelfSlide
          scrollOffset={scrollOffset}
          viewportWidth={viewportWidth}
        />
      </div>

      {/* WalkIndicator */}
      <WalkIndicator
        total={totalSlides}
        active={activeBooth}
        onSelect={scrollToBooth}
      />

      {/* MidwayGround */}
      <MidwayGround scrollOffset={scrollOffset} />
    </main>
  );
}
