import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useTickets } from "~/context/TicketContext";

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
  type: "balloons" | "bottles" | "ducks";
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
    type: "balloons",
  },
  {
    name: "Bottle Bash",
    route: "/milk-bottle-toss",
    cost: 3,
    signText: "BOTTLE BASH",
    priceText: "4 THROWS — 3 🎟️",
    emoji: "🍾",
    tentStripeColor: "var(--color-tangerine)",
    tentBaseColor: "var(--color-tent-canvas)",
    type: "bottles",
  },
  {
    name: "Duck Shoot",
    route: "/duck-pond",
    cost: 1,
    signText: "DUCK SHOOT",
    priceText: "3 SHOTS — 1 🎟️",
    emoji: "🦆",
    tentStripeColor: "var(--color-sky-pop)",
    tentBaseColor: "var(--color-deep-purple)",
    type: "ducks",
  },
];

/* ═══════════════════════════════════════════════════════
   SHARED UTILITIES (kept from V2)
   ═══════════════════════════════════════════════════════ */

function RopePost({ side }: { side: "left" | "right" }) {
  return (
    <div className="flex flex-col items-center" aria-hidden>
      <div
        className="w-2.5 h-12 rounded-sm"
        style={{
          background:
            "linear-gradient(90deg, var(--color-wood-light), var(--color-wood-dark))",
          border: "1px solid var(--color-toon-shadow)",
        }}
      />
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

/* ── Ambient Life Components ── */

function PennantFlags() {
  const flagColors = [
    "var(--color-circus-red)",
    "var(--color-electric-yellow)",
    "var(--color-hot-magenta)",
    "var(--color-acid-green)",
    "var(--color-sky-pop)",
    "var(--color-tangerine)",
  ];

  return (
    <div
      className="absolute top-0 left-0 right-0 h-8 z-30 pointer-events-none"
      aria-hidden
    >
      {Array.from({ length: 20 }, (_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: 2,
            left: `${(i * 19 + 3) % 100}%`,
            animation: `pennant-flutter ${2.5 + (i % 3) * 0.8}s ease-in-out ${i * 0.3}s infinite`,
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "7px solid transparent",
              borderRight: "7px solid transparent",
              borderBottom: `14px solid ${flagColors[i % flagColors.length]}`,
              filter: "drop-shadow(1px 1px 0 var(--color-toon-shadow))",
            }}
          />
        </div>
      ))}
    </div>
  );
}

function DustMotes() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden
    >
      {Array.from({ length: 12 }, (_, i) => {
        const seed = Math.sin(i * 127.1 + 311.7) * 43758.5453;
        const rand = seed - Math.floor(seed);
        return (
          <div
            key={i}
            className="absolute rounded-full bg-tent-canvas"
            style={{
              width: `${1.5 + rand * 2.5}px`,
              height: `${1.5 + rand * 2.5}px`,
              left: `${15 + (i * 29 + 11) % 70}%`,
              top: `${10 + (i * 23 + 7) % 75}%`,
              animation: `dust-float ${8 + (i % 4) * 3}s ease-in-out ${i * 0.9}s infinite`,
              opacity: 0,
            }}
          />
        );
      })}
    </div>
  );
}

function AmbientConfetti() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden
    >
      {Array.from({ length: 3 }, (_, i) => {
        const seed = Math.sin(i * 231.7 + 511.3) * 43758.5453;
        const rand = seed - Math.floor(seed);
        const colors = [
          "var(--color-circus-red)",
          "var(--color-electric-yellow)",
          "var(--color-hot-magenta)",
          "var(--color-sky-pop)",
          "var(--color-acid-green)",
        ];
        return (
          <div
            key={i}
            className="absolute"
            style={{
              width: 6,
              height: 4,
              backgroundColor: colors[i % colors.length],
              borderRadius: "1px",
              left: `${20 + rand * 60}%`,
              top: "-5%",
              animation: `confetti-drift ${12 + i * 5}s linear ${i * 4}s infinite`,
              opacity: 0.6,
            }}
          />
        );
      })}
    </div>
  );
}

/* ── Night Sky Backdrop ── */

function NightSkyBackdrop() {
  return (
    <>
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
      <div className="absolute right-[5%] top-[15%] opacity-8">
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
        >
          <circle
            cx="40"
            cy="40"
            r="30"
            stroke="var(--color-deep-purple)"
            strokeWidth="2"
            fill="none"
            opacity="0.15"
          />
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
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   V3: OPEN-FRONT TENT STRUCTURE
   Each booth is a tent you look INTO — no curtains.
   ═══════════════════════════════════════════════════════ */

/** The back wall of the tent where game pieces live. Darker, narrower
 *  than the opening, to create depth through forced perspective. */
function TentBackWall({
  stripeColor,
  baseColor,
  children,
}: {
  stripeColor: string;
  baseColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute left-[12%] right-[12%] top-[18%] bottom-[28%] rounded-t-lg overflow-hidden"
      style={{
        background: `repeating-linear-gradient(
          90deg,
          ${stripeColor}08 0px,
          ${stripeColor}08 36px,
          ${baseColor}06 36px,
          ${baseColor}06 72px
        )`,
        border: "3px solid var(--color-toon-shadow)",
        borderBottom: "none",
        boxShadow:
          "inset 0 0 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.3)",
      }}
    >
      {/* Subtle spotlight from above */}
      <div
        className="absolute inset-0 pointer-events-none spotlight-cone-dim"
        aria-hidden
      />
      {children}
    </div>
  );
}

/** Left tent side wall — angled inward for perspective */
function TentLeftWall() {
  return (
    <div
      className="absolute left-[5%] top-[18%] bottom-[20%] w-[10%]"
      style={{
        background:
          "linear-gradient(180deg, rgba(30,10,50,0.85) 0%, rgba(20,8,35,0.9) 100%)",
        clipPath: "polygon(0 0, 100% 8%, 100% 92%, 0 100%)",
        borderLeft: "2px solid var(--color-toon-shadow)",
      }}
      aria-hidden
    />
  );
}

/** Right tent side wall — angled inward for perspective */
function TentRightWall() {
  return (
    <div
      className="absolute right-[5%] top-[18%] bottom-[20%] w-[10%]"
      style={{
        background:
          "linear-gradient(180deg, rgba(30,10,50,0.85) 0%, rgba(20,8,35,0.9) 100%)",
        clipPath: "polygon(0 8%, 100% 0, 100% 100%, 0 92%)",
        borderRight: "2px solid var(--color-toon-shadow)",
      }}
      aria-hidden
    />
  );
}

/** Perspective floor — converges toward the back wall */
function TentFloor() {
  return (
    <div
      className="absolute left-[12%] right-[12%] bottom-[20%]"
      style={{
        height: "12%",
        background:
          "linear-gradient(180deg, #1A0A2E 0%, #2D1040 30%, #3E2210 70%, #5C3A1E 100%)",
        clipPath: "polygon(0 0, 100% 0, 92% 100%, 8% 100%)",
        borderTop: "2px solid var(--color-toon-shadow)",
      }}
      aria-hidden
    />
  );
}

/** Striped tent awning at the top — frames the view from above */
function TentAwningV3({
  stripeColor,
  baseColor,
}: {
  stripeColor: string;
  baseColor: string;
}) {
  return (
    <div className="absolute left-0 right-0 top-0 z-20" aria-hidden>
      {/* Main awning fabric */}
      <div
        className="mx-auto w-[90%] h-20 sm:h-24"
        style={{
          background: `repeating-linear-gradient(
            90deg,
            ${stripeColor} 0px,
            ${stripeColor} 48px,
            ${baseColor} 48px,
            ${baseColor} 96px
          )`,
          borderRadius: "50% 50% 0 0 / 20% 20% 0 0",
          border: "4px solid var(--color-toon-shadow)",
          borderBottom: "none",
          boxShadow: "inset 0 -30px 50px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        {/* Fabric wave overlay */}
        <div
          className="absolute inset-0 animate-tent-stripe-wave opacity-25"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              transparent 0px,
              transparent 40px,
              rgba(255,255,255,0.06) 40px,
              rgba(255,255,255,0.06) 80px
            )`,
          }}
        />
        {/* Edge darkness for depth */}
        <div
          className="absolute left-0 top-0 bottom-0 w-10"
          style={{
            background: `linear-gradient(90deg, ${stripeColor}88, transparent)`,
          }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-10"
          style={{
            background: `linear-gradient(270deg, ${stripeColor}88, transparent)`,
          }}
        />
      </div>

      {/* Shadow cast by awning onto tent interior */}
      <div
        className="mx-auto w-[90%] h-16"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 40%, transparent 100%)",
        }}
      />

      {/* Bulb string hanging from awning edge */}
      <div className="flex justify-center gap-3 -mt-3 mx-auto w-[85%]">
        {Array.from({ length: 11 }, (_, i) => (
          <FlickerBulb key={i} delayMs={i * 3} size={5} />
        ))}
      </div>
    </div>
  );
}

function FlickerBulb({
  delayMs,
  size,
}: {
  delayMs: number;
  size?: number;
}) {
  const s = size ?? 6;
  return (
    <div
      className="rounded-full flex-shrink-0"
      style={{
        width: s,
        height: s,
        background: "var(--color-bulb-gold)",
        border: "1px solid var(--color-toon-shadow)",
        animation: `bulb-flicker ${2.5 + delayMs * 0.1}s step-end ${delayMs * 0.05}s infinite`,
      }}
    />
  );
}

/** Shared signage board hanging in the tent */
function BoothSign({ text }: { text: string }) {
  return (
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
          fontSize: "clamp(1.3rem, 5vw, 2.2rem)",
          textShadow: "3px 3px 0 var(--color-toon-shadow)",
          letterSpacing: "0.03em",
        }}
      >
        {text}
      </h2>
    </div>
  );
}

/** Shared price chalkboard */
function PriceChalkboard({ text }: { text: string }) {
  return (
    <div
      className="mb-4 px-4 py-2"
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
        {text}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   GAME PIECES — at the back of each tent
   ═══════════════════════════════════════════════════════ */

/* ── Balloon Pop: balloons pinned to back wall ── */

function BackWallBalloon({
  color,
  left,
  delay,
  size,
}: {
  color: string;
  left: number;
  delay: number;
  size: number;
}) {
  return (
    <div
      className="absolute"
      style={{
        left: `${left}%`,
        top: "8%",
        width: size,
        height: size * 1.25,
        animation: `bob-float 4s ease-in-out ${delay}s infinite`,
      }}
      aria-hidden
    >
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: "50% 50% 50% 50% / 40% 40% 60% 60%",
          border: "2px solid var(--color-toon-shadow)",
          boxShadow:
            "inset -3px -3px 8px rgba(0,0,0,0.25), inset 2px 2px 6px rgba(255,255,255,0.3)",
        }}
      />
      <div
        className="mx-auto"
        style={{
          width: size * 0.2,
          height: size * 0.15,
          backgroundColor: color,
          filter: "brightness(0.7)",
          borderRadius: "2px",
        }}
      />
      <div
        className="mx-auto"
        style={{
          width: 1.5,
          height: size * 0.6,
          background: "var(--color-tent-canvas)",
          opacity: 0.5,
        }}
      />
    </div>
  );
}

function BalloonBackWall() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Balloons hanging from top of back wall */}
      {[
        { color: "#FF1493", left: 10, delay: 0, size: 28 },
        { color: "#39FF14", left: 30, delay: 1.5, size: 24 },
        { color: "#FFE600", left: 50, delay: 0.7, size: 30 },
        { color: "#FF6B1A", left: 70, delay: 2.1, size: 26 },
        { color: "#FF1493", left: 85, delay: 1.0, size: 22 },
      ].map((b, i) => (
        <BackWallBalloon key={i} {...b} />
      ))}

      {/* Wooden shelf with mini prizes — at bottom of back wall */}
      <div
        className="absolute left-[8%] right-[8%] bottom-[8%] h-3"
        style={{
          background:
            "linear-gradient(180deg, var(--color-wood-light), var(--color-wood-dark))",
          borderRadius: "2px",
          border: "2px solid var(--color-toon-shadow)",
        }}
      />
      <span className="absolute left-[18%] bottom-[12%] text-base" aria-hidden>
        🧸
      </span>
      <span className="absolute left-[45%] bottom-[12%] text-base" aria-hidden>
        ⭐
      </span>
      <span className="absolute left-[72%] bottom-[12%] text-base" aria-hidden>
        🎖️
      </span>
    </div>
  );
}

/* ── Bottle Bash: stacked bottles on a shelf ── */

function StackedBottle({
  wobbleDelay,
  size: sz,
}: {
  wobbleDelay?: number;
  size?: "sm" | "md";
}) {
  const s =
    sz === "sm"
      ? { w: 14, h: 30, neckW: 5, neckH: 7 }
      : { w: 18, h: 38, neckW: 6, neckH: 9 };
  return (
    <div
      className="flex flex-col items-center"
      style={
        wobbleDelay !== undefined
          ? { animation: `wiggle 0.4s ease-in-out ${wobbleDelay}s infinite` }
          : undefined
      }
      aria-hidden
    >
      <div
        style={{
          width: s.neckW,
          height: s.neckH,
          background: "linear-gradient(90deg, #F5F0E8, #FFF8E7, #EDE5D8)",
          borderRadius: "3px 3px 1px 1px",
          border: "1.5px solid var(--color-toon-shadow)",
          borderBottom: "none",
        }}
      />
      <div
        style={{
          width: s.neckW + 4,
          height: 3,
          background: "var(--color-tangerine)",
          borderRadius: "1px",
          border: "1px solid var(--color-toon-shadow)",
        }}
      />
      <div
        style={{
          width: s.w,
          height: s.h,
          background:
            "linear-gradient(90deg, #F0EBE0 0%, #FFF8E7 20%, #F5F0E8 50%, #FFF8E7 80%, #EDE5D8 100%)",
          borderRadius: "3px",
          border: "2px solid var(--color-toon-shadow)",
          boxShadow:
            "inset -2px -2px 4px rgba(0,0,0,0.15), inset 1px 1px 3px rgba(255,255,255,0.4)",
        }}
      />
      <div
        style={{
          width: s.w + 2,
          height: 3,
          background: "var(--color-toon-shadow)",
          borderRadius: "1px",
          opacity: 0.3,
        }}
      />
    </div>
  );
}

function BottleBackWall() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Wooden counter for bottles */}
      <div
        className="absolute left-[10%] right-[10%] bottom-[15%]"
        style={{ maxWidth: "280px" }}
      >
        {/* Shelf ledge */}
        <div
          style={{
            width: "100%",
            height: 8,
            background:
              "linear-gradient(180deg, #8B5E3C, var(--color-wood-dark))",
            borderRadius: "3px",
            border: "3px solid var(--color-toon-shadow)",
            boxShadow: "3px 3px 0 var(--color-toon-shadow)",
          }}
        />
        {/* Bottle pyramid: Row 1 (3 bottles) */}
        <div className="flex justify-center gap-1 -mt-[44px]">
          <StackedBottle wobbleDelay={0} />
          <StackedBottle wobbleDelay={0.8} />
          <StackedBottle wobbleDelay={1.6} />
        </div>
        {/* Row 2 (2 bottles) */}
        <div className="flex justify-center gap-2 -mt-[8px]">
          <StackedBottle size="sm" wobbleDelay={0.4} />
          <StackedBottle size="sm" wobbleDelay={1.2} />
        </div>
        {/* Row 3 (1 bottle on top) */}
        <div className="flex justify-center -mt-[6px]">
          <StackedBottle size="sm" />
        </div>
      </div>

      {/* Prize shelf above */}
      <div
        className="absolute left-[10%] right-[10%] top-[12%] h-2"
        style={{
          background:
            "linear-gradient(180deg, var(--color-wood-light), var(--color-wood-dark))",
          borderRadius: "2px",
          border: "2px solid var(--color-toon-shadow)",
        }}
      />
      <span className="absolute left-[16%] top-[4%] text-sm" aria-hidden>
        🧸
      </span>
      <span className="absolute left-[48%] top-[4%] text-sm" aria-hidden>
        ⭐
      </span>
      <span className="absolute left-[76%] top-[4%] text-sm" aria-hidden>
        🏆
      </span>
    </div>
  );
}

/* ── Duck Shoot: metal track with ducks ── */

function MetalTrack() {
  return (
    <div
      className="absolute left-[8%] right-[8%]"
      style={{ top: "45%", height: 26 }}
      aria-hidden
    >
      <div
        className="w-full h-full"
        style={{
          background:
            "linear-gradient(180deg, #6B6B7B 0%, #9A9AAA 15%, #C0C0D0 40%, #9A9AAA 60%, #6B6B7B 100%)",
          borderRadius: "0 0 8px 8px",
          border: "3px solid var(--color-toon-shadow)",
          borderTop: "2px solid #555568",
          boxShadow:
            "inset 0 4px 8px rgba(0,0,0,0.4), 0 2px 0 rgba(255,255,255,0.1)",
        }}
      >
        <div
          className="absolute inset-0 rounded-b-lg"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 40%, rgba(255,255,255,0.08) 70%, transparent 100%)",
          }}
        />
        <div
          className="absolute bottom-0 left-1 right-1"
          style={{
            height: 14,
            background:
              "linear-gradient(180deg, rgba(0,191,255,0.3) 0%, rgba(26,143,192,0.5) 100%)",
            borderRadius: "0 0 5px 5px",
          }}
        />
      </div>
    </div>
  );
}

function DriftingDuck({
  speed,
  delay,
  hasTarget,
}: {
  speed: number;
  delay: number;
  hasTarget: boolean;
}) {
  return (
    <div
      className="absolute"
      style={{
        top: "42%",
        animation: `drift-duck ${speed}s ease-in-out ${delay}s infinite alternate`,
      }}
      aria-hidden
    >
      <div className="relative" style={{ width: 24, height: 18 }}>
        <div
          style={{
            width: 22,
            height: 16,
            background: "#FFD700",
            borderRadius: "50% 50% 50% 50% / 55% 55% 45% 45%",
            border: "2px solid var(--color-toon-shadow)",
            boxShadow:
              "inset -1px -2px 3px rgba(0,0,0,0.15), inset 1px 1px 2px rgba(255,255,255,0.4)",
          }}
        />
        <div
          className="absolute"
          style={{
            right: -4,
            top: 6,
            width: 7,
            height: 4,
            background: "#FF6B1A",
            borderRadius: "0 3px 3px 0",
            border: "1.5px solid var(--color-toon-shadow)",
            borderLeft: "none",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            right: 3,
            top: 3,
            width: 3,
            height: 3,
            background: "var(--color-ink)",
          }}
        />
        {hasTarget && (
          <div
            className="absolute"
            style={{ left: 7, top: 5, width: 8, height: 8 }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "var(--color-circus-red)",
                border: "1px solid var(--color-toon-shadow)",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                left: 2,
                top: 2,
                width: 4,
                height: 4,
                background: "var(--color-tent-canvas)",
                border: "1px solid var(--color-toon-shadow)",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                left: 3,
                top: 3,
                width: 2,
                height: 2,
                background: "var(--color-circus-red)",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function BlinkBulb({
  delayClass,
  size,
}: {
  delayClass: string;
  size?: number;
}) {
  const s = size ?? 6;
  return (
    <div
      className={`rounded-full animate-blink-bulb ${delayClass}`}
      style={{
        width: s,
        height: s,
        background: "var(--color-bulb-gold)",
        border: "1px solid var(--color-toon-shadow)",
      }}
    />
  );
}

function DuckBackWall() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Illuminated sign above the track */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: "6%", width: "65%", maxWidth: "260px" }}
      >
        {/* Bulb string top */}
        <div className="flex justify-center gap-2 mb-0.5">
          {[
            "delay-bulb-1",
            "delay-bulb-3",
            "delay-bulb-5",
            "delay-bulb-7",
            "delay-bulb-9",
          ].map((d, i) => (
            <BlinkBulb key={i} delayClass={d} size={5} />
          ))}
        </div>
        {/* Sign board */}
        <div
          style={{
            background: "linear-gradient(180deg, #1A3A5C, #0D2040)",
            borderRadius: "8px",
            border: "3px solid var(--color-toon-shadow)",
            boxShadow:
              "0 0 12px rgba(0,191,255,0.3), inset 0 0 8px rgba(0,191,255,0.1)",
            padding: "5px 10px",
          }}
        >
          <h2
            className="text-center m-0"
            style={{
              fontFamily: "var(--font-carnival)",
              color: "var(--color-electric-yellow)",
              fontSize: "clamp(0.9rem, 3.5vw, 1.4rem)",
              textShadow:
                "2px 2px 0 var(--color-toon-shadow), 0 0 10px rgba(255,230,0,0.4)",
              letterSpacing: "0.05em",
            }}
          >
            DUCK SHOOT
          </h2>
        </div>
        {/* Bulb string bottom */}
        <div className="flex justify-center gap-2 mt-0.5">
          {[
            "delay-bulb-2",
            "delay-bulb-4",
            "delay-bulb-6",
            "delay-bulb-8",
            "delay-bulb-10",
          ].map((d, i) => (
            <BlinkBulb key={i} delayClass={d} size={5} />
          ))}
        </div>
      </div>

      {/* Metal Track */}
      <MetalTrack />

      {/* Drifting ducks */}
      <div
        className="absolute left-[10%] right-[10%]"
        style={{ top: "43%", height: 30 }}
      >
        {[
          { speed: 3.5, delay: 0, hasTarget: true },
          { speed: 4.2, delay: 1.5, hasTarget: false },
          { speed: 3.0, delay: 0.8, hasTarget: true },
          { speed: 4.8, delay: 2.2, hasTarget: true },
          { speed: 3.8, delay: 3.0, hasTarget: false },
        ].map((d, i) => (
          <DriftingDuck
            key={i}
            speed={d.speed}
            delay={d.delay}
            hasTarget={d.hasTarget}
          />
        ))}
      </div>

      {/* Fishing nets on booth wall */}
      <div
        className="absolute left-[14%]"
        style={{
          top: "60%",
          width: 36,
          height: 26,
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(255,255,255,0.08) 4px, rgba(255,255,255,0.08) 5px), repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.08) 4px, rgba(255,255,255,0.08) 5px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "2px",
        }}
        aria-hidden
      />
      <div
        className="absolute right-[14%]"
        style={{
          top: "60%",
          width: 36,
          height: 26,
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(255,255,255,0.08) 4px, rgba(255,255,255,0.08) 5px), repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.08) 4px, rgba(255,255,255,0.08) 5px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "2px",
        }}
        aria-hidden
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TENT BOOTH — the full open-front tent for each game
   ═══════════════════════════════════════════════════════ */

function TentBooth({
  booth,
  onPlay,
  showInsufficient,
}: {
  booth: BoothConfig;
  onPlay: () => void;
  showInsufficient: boolean;
}) {
  const gameContent = (() => {
    switch (booth.type) {
      case "balloons":
        return <BalloonBackWall />;
      case "bottles":
        return <BottleBackWall />;
      case "ducks":
        return <DuckBackWall />;
      default:
        return <BalloonBackWall />;
    }
  })();

  return (
    <div className="min-w-[100vw] h-dvh relative overflow-hidden flex-shrink-0">
      {/* Night sky backdrop — behind the tent */}
      <div className="absolute inset-0">
        <NightSkyBackdrop />
      </div>

      {/* Tent interior */}
      <div className="absolute inset-0">
        {/* Back wall with game pieces */}
        <TentBackWall
          stripeColor={booth.tentStripeColor}
          baseColor={booth.tentBaseColor}
        >
          {/* Game pieces at the back */}
          <div className="absolute inset-0">{gameContent}</div>

          {/* Tappable hit area over the game — positioned over the lower 70% of back wall */}
          <button
            type="button"
            onClick={onPlay}
            className="absolute inset-0 z-10 cursor-pointer bg-transparent border-none select-none"
            style={{ WebkitTapHighlightColor: "transparent" }}
            aria-label={`Play ${booth.name}`}
          >
            {/* Invisible hit area — tapping anywhere in the tent plays */}
          </button>
        </TentBackWall>

        {/* Side walls for perspective */}
        <TentLeftWall />
        <TentRightWall />

        {/* Perspective floor */}
        <TentFloor />

        {/* Awning at top */}
        <TentAwningV3
          stripeColor={booth.tentStripeColor}
          baseColor={booth.tentBaseColor}
        />
      </div>

      {/* Foreground UI — sign and price, centered vertically over the game area */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
        <BoothSign text={booth.signText} />
        <PriceChalkboard text={booth.priceText} />
      </div>

      {/* Insufficient tickets indicator */}
      {showInsufficient && (
        <div
          className="absolute bottom-[22%] left-1/2 -translate-x-1/2 z-30 animate-bounce-in pointer-events-none"
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
              textShadow: "1px 1px 0 var(--color-toon-shadow)",
            }}
          >
            Need more tickets!
          </p>
        </div>
      )}

      {/* Ground with rope posts at the bottom */}
      <div className="absolute bottom-0 inset-x-0 h-[15%] z-20">
        {/* Rope posts */}
        <div className="absolute left-[5%] right-[5%] top-2 flex justify-between">
          <RopePost side="left" />
          <RopePost side="right" />
        </div>
        {/* Ground strip */}
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
        {/* Ground texture */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          {Array.from({ length: 30 }, (_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 1 + (i % 3),
                height: 1 + (i % 3),
                left: `${(i * 17 + 5) % 100}%`,
                top: `${(i * 13 + 2) % 100}%`,
                background:
                  i % 2 === 0
                    ? "var(--color-tent-canvas)"
                    : "var(--color-wood-light)",
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Prize Shack slide
   ═══════════════════════════════════════════════════════ */

function PrizeShackSlide() {
  return (
    <div className="min-w-[100vw] h-dvh relative overflow-hidden flex-shrink-0 flex flex-col items-center justify-center">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, #0D0524 0%, #1A0A2E 50%, #2D1040 100%)`,
        }}
      />
      <div className="absolute inset-0">
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

      {/* Prize Shack tent awning */}
      <div className="relative w-[70%] max-w-[280px] mb-5 z-10">
        <div className="flex justify-center gap-1.5 mb-0.5">
          {Array.from({ length: 9 }, (_, i) => (
            <BlinkBulb
              key={i}
              delayClass={`delay-bulb-${(i % 10) + 1}`}
              size={5}
            />
          ))}
        </div>
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
          style={{ background: "var(--color-toon-shadow)" }}
        />
      </div>

      <div className="flex flex-col items-center gap-4 z-10">
        <span className="text-5xl" role="img" aria-label="Prize Shack">
          🏆
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
          Prize Shack
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

      <div className="absolute bottom-0 left-0 right-0 h-[12%]">
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

/* ═══════════════════════════════════════════════════════
   WalkIndicator
   ═══════════════════════════════════════════════════════ */

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
                borderBottom:
                  i === active
                    ? "14px solid var(--color-bulb-gold)"
                    : "14px solid var(--color-bulb-off)",
              }}
            />
            <div
              className="w-5 h-1.5"
              style={{
                backgroundColor:
                  i === active
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

/* ═══════════════════════════════════════════════════════
   MidwayWalk — V3 Continuous Scroll Midway
   ═══════════════════════════════════════════════════════ */

export default function MidwayWalk() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeBooth, setActiveBooth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 375,
  );
  const [insufficientBooth, setInsufficientBooth] = useState<number | null>(
    null,
  );
  const insufficientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { spendTickets } = useTickets();
  const navigate = useNavigate();

  // Track viewport width
  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update active booth based on scroll position (debounced, no snap)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function handleScroll() {
      // Debounce active booth update — only update after scroll settles
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
      }
      scrollEndTimerRef.current = setTimeout(() => {
        const vw = track?.clientWidth ?? viewportWidth;
        if (vw > 0 && track) {
          const idx = Math.round(track.scrollLeft / vw);
          setActiveBooth(Math.min(idx, BOOTHS.length));
        }
      }, 150);
    }

    track.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", handleScroll);
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    };
  }, [viewportWidth]);

  // Cleanup insufficient timer
  useEffect(() => {
    return () => {
      if (insufficientTimerRef.current) {
        clearTimeout(insufficientTimerRef.current);
      }
    };
  }, []);

  // Smooth scroll to a booth (used by WalkIndicator taps)
  const scrollToBooth = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const vw = track.clientWidth;
    track.scrollTo({
      left: index * vw,
      behavior: "smooth",
    });
  }, []);

  // Handle play — direct navigation, no curtain
  const handlePlay = useCallback(
    (index: number) => {
      const booth = BOOTHS[index];
      if (!booth) return;

      if (!spendTickets(booth.cost)) {
        setInsufficientBooth(index);
        if (insufficientTimerRef.current) {
          clearTimeout(insufficientTimerRef.current);
        }
        insufficientTimerRef.current = setTimeout(() => {
          setInsufficientBooth(null);
        }, 2500);
        return;
      }

      // Navigate directly — no SceneTransition curtain
      navigate({ to: booth.route } as any);
    },
    [spendTickets, navigate],
  );

  const totalSlides = BOOTHS.length + 1; // booths + prize shack

  return (
    <main className="w-full h-dvh overflow-hidden relative bg-midnight">
      {/* Ambient Life overlays */}
      <PennantFlags />
      <DustMotes />
      <AmbientConfetti />

      {/* Continuous scroll track — NO snap */}
      <div
        ref={trackRef}
        className="flex h-full overflow-x-auto"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {BOOTHS.map((booth, i) => (
          <TentBooth
            key={booth.route}
            booth={booth}
            onPlay={() => handlePlay(i)}
            showInsufficient={insufficientBooth === i}
          />
        ))}
        <PrizeShackSlide />
      </div>

      {/* Walk Indicator dots */}
      <WalkIndicator
        total={totalSlides}
        active={activeBooth}
        onSelect={scrollToBooth}
      />
    </main>
  );
}
