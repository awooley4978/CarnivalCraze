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
    emoji: "🍾",
    tentStripeColor: "var(--color-tangerine)",
    tentBaseColor: "var(--color-tent-canvas)",
    bgDecorations: "bottles",
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
    bgDecorations: "ducks",
  },
];

/* ═══════════════════════════════════════════════════════
   SHARED UTILITIES
   ═══════════════════════════════════════════════════════ */

function RopePost({ side }: { side: "left" | "right" }) {
  return (
    <div className="flex flex-col items-center" aria-hidden>
      <div
        className="w-2.5 h-12 rounded-sm"
        style={{
          background: "linear-gradient(90deg, var(--color-wood-light), var(--color-wood-dark))",
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

/** Pennant flags fluttering along the top of the midway */
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
    <div className="absolute top-0 left-0 right-0 h-8 z-30 pointer-events-none" aria-hidden>
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

/** Ambient dust motes floating in spotlight beams */
function DustMotes() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
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

/** Occasional ambient confetti pieces drifting across */
function AmbientConfetti() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {Array.from({ length: 3 }, (_, i) => {
        const seed = Math.sin(i * 231.7 + 511.3) * 43758.5453;
        const rand = seed - Math.floor(seed);
        const colors = ["var(--color-circus-red)", "var(--color-electric-yellow)", "var(--color-hot-magenta)", "var(--color-sky-pop)", "var(--color-acid-green)"];
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

/** Flicker bulb with chaotic rapid blinking */
function FlickerBulb({ delayMs, size }: { delayMs: number; size?: number }) {
  const s = size ?? 6;
  return (
    <div
      className="rounded-full"
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

/** Shared night-sky backdrop with stars and distant ferris wheel */
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
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="30" stroke="var(--color-deep-purple)" strokeWidth="2" fill="none" opacity="0.15" />
          <circle cx="40" cy="40" r="2" fill="var(--color-deep-purple)" opacity="0.15" />
          {[0, 45, 90, 135].map((angle) => (
            <line
              key={angle}
              x1="40" y1="40"
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

/** Shared striped-tent awning for all booths */
function TentAwning({ stripeColor, baseColor }: { stripeColor: string; baseColor: string }) {
  return (
    <div
      className="relative mx-auto w-[90%] h-full"
      style={{
        background: `repeating-linear-gradient(
          90deg,
          ${stripeColor} 0px,
          ${stripeColor} 48px,
          ${baseColor} 48px,
          ${baseColor} 96px
        )`,
        borderRadius: "50% 50% 0 0 / 8% 8% 0 0",
        border: "4px solid var(--color-toon-shadow)",
        borderBottom: "none",
        boxShadow: "inset 0 -40px 60px rgba(0,0,0,0.3)",
        overflow: "hidden",
      }}
    >
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
      <div
        className="absolute left-0 top-0 bottom-0 w-8"
        style={{ background: `linear-gradient(90deg, ${stripeColor}, transparent)` }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-8"
        style={{ background: `linear-gradient(270deg, ${stripeColor}, transparent)` }}
      />
    </div>
  );
}

/** Shared tent poles (left & right) */
function TentPoles() {
  return (
    <>
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
    </>
  );
}

/** Shared signage board */
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
        {text}
      </p>
    </div>
  );
}

/** Shared PLAY button */
function PlayButton({
  onClick,
  insufficient,
  boothName,
}: {
  onClick: () => void;
  insufficient: boolean;
  boothName: string;
}) {
  return (
    <>
      <span
        className="text-5xl mb-4"
        style={{ filter: "drop-shadow(3px 3px 0 var(--color-toon-shadow))" }}
        role="img"
        aria-label={boothName}
      >
        🎪
      </span>
      <button
        type="button"
        onClick={onClick}
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
      {insufficient && (
        <div className="mt-3 animate-bounce-in" style={{ animationDuration: "0.6s" }}>
          <span className="text-4xl block text-center" role="img" aria-label="Not enough tickets">
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
    </>
  );
}

/** Shared welcome mat */
function WelcomeMat({ accentColor }: { accentColor: string }) {
  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[60%] max-w-[280px] h-3 rounded-sm"
      style={{
        background: `repeating-linear-gradient(
          90deg,
          ${accentColor} 0px,
          ${accentColor} 20px,
          var(--color-tent-canvas) 20px,
          var(--color-tent-canvas) 40px
        )`,
        border: "2px solid var(--color-toon-shadow)",
        opacity: 0.7,
      }}
    />
  );
}

/** Shared foreground ground strip with rope posts */
function GroundStrip({
  layer4X,
  accentColor,
}: {
  layer4X: number;
  accentColor: string;
}) {
  return (
    <div
      className="absolute bottom-0 inset-x-0 h-[18%]"
      style={{ transform: `translateX(${layer4X}px)` }}
    >
      <div className="absolute left-[5%] right-[5%] top-0 flex justify-between">
        <RopePost side="left" />
        <RopePost side="right" />
      </div>
      <WelcomeMat accentColor={accentColor} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   BALLOON POP BOOTH SCENE
   ═══════════════════════════════════════════════════════ */

function HangingBalloon({
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
        top: "5%",
        width: size,
        height: size * 1.25,
        animation: `bob-float 4s ease-in-out ${delay}s infinite`,
      }}
      aria-hidden
    >
      {/* Balloon body */}
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: "50% 50% 50% 50% / 40% 40% 60% 60%",
          border: "2px solid var(--color-toon-shadow)",
          boxShadow: "inset -3px -3px 8px rgba(0,0,0,0.25), inset 2px 2px 6px rgba(255,255,255,0.3)",
        }}
      />
      {/* Knot */}
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
      {/* String */}
      <div
        className="mx-auto"
        style={{
          width: 1.5,
          height: size * 0.8,
          background: "var(--color-tent-canvas)",
          opacity: 0.6,
        }}
      />
    </div>
  );
}

function PoppedScrap({ left, top, rotation, color }: { left: number; top: number; rotation: number; color: string }) {
  return (
    <div
      className="absolute"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: 10,
        height: 7,
        backgroundColor: color,
        opacity: 0.5,
        borderRadius: "2px",
        transform: `rotate(${rotation}deg)`,
        border: "1px solid var(--color-toon-shadow)",
      }}
      aria-hidden
    />
  );
}

function StuckDart({ left, top, angle }: { left: number; top: number; angle: number }) {
  return (
    <div
      className="absolute"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: `rotate(${angle}deg)`,
      }}
      aria-hidden
    >
      {/* Dart shaft */}
      <div
        style={{
          width: 20,
          height: 2,
          background: "linear-gradient(90deg, #C0C0C0, #888)",
          borderRadius: "1px",
        }}
      />
      {/* Dart flight */}
      <div
        style={{
          position: "absolute",
          right: -6,
          top: -3,
          width: 8,
          height: 8,
          background: "var(--color-circus-red)",
          clipPath: "polygon(0 0, 100% 50%, 0 100%)",
        }}
      />
      {/* Dart tip stuck in */}
      <div
        className="absolute"
        style={{
          left: -3,
          top: -1,
          width: 4,
          height: 4,
          background: "#888",
          borderRadius: "50%",
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

  return (
    <div className="min-w-[100vw] h-dvh relative snap-center overflow-hidden flex-shrink-0">
      {/* Layer 1: Backdrop */}
      <div className="absolute inset-0" style={{ transform: `translateX(${layer1X}px)` }}>
        <NightSkyBackdrop />
        {/* Floating balloon bg silhouettes */}
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
      </div>

      {/* Layer 2: Tent */}
      <div
        className="absolute inset-x-0 top-[8%] bottom-[20%]"
        style={{ transform: `translateX(${layer2X}px)` }}
      >
        <TentAwning stripeColor={booth.tentStripeColor} baseColor={booth.tentBaseColor} />
        <TentPoles />

        {/* Hanging balloons from awning */}
        {[
          { color: "#FF1493", left: 18, delay: 0, size: 22 },
          { color: "#39FF14", left: 35, delay: 1.5, size: 18 },
          { color: "#FFE600", left: 52, delay: 0.7, size: 24 },
          { color: "#FF6B1A", left: 68, delay: 2.1, size: 20 },
          { color: "#FF1493", left: 82, delay: 1.0, size: 16 },
        ].map((b, i) => (
          <HangingBalloon key={i} color={b.color} left={b.left} delay={b.delay} size={b.size} />
        ))}

        {/* Popped balloon scraps on the booth wall */}
        {[
          { left: 22, top: 45, rotation: -30, color: "#FF1493" },
          { left: 72, top: 52, rotation: 45, color: "#39FF14" },
          { left: 48, top: 38, rotation: -15, color: "#FFE600" },
        ].map((s, i) => (
          <PoppedScrap key={i} {...s} />
        ))}

        {/* Darts stuck in wood */}
        <StuckDart left={15} top={62} angle={-25} />
        <StuckDart left={78} top={55} angle={30} />
        <StuckDart left={40} top={70} angle={-10} />

        {/* Wooden shelf with prize hint */}
        <div
          className="absolute left-1/2 bottom-[25%] -translate-x-1/2 w-[70%] h-3"
          style={{
            background: "linear-gradient(180deg, var(--color-wood-light), var(--color-wood-dark))",
            borderRadius: "2px",
            border: "2px solid var(--color-toon-shadow)",
          }}
        />
        {/* Mini prizes on shelf */}
        <span className="absolute left-[22%] bottom-[27%] text-sm" aria-hidden>🧸</span>
        <span className="absolute left-[42%] bottom-[27%] text-sm" aria-hidden>⭐</span>
        <span className="absolute left-[62%] bottom-[27%] text-sm" aria-hidden>🎖️</span>
      </div>

      {/* Layer 3: Foreground UI */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center z-10"
        style={{ transform: `translateX(${layer3X}px)` }}
      >
        <BoothSign text={booth.signText} />
        <PriceChalkboard text={booth.priceText} />
        <PlayButton onClick={onPlay} insufficient={showInsufficient} boothName={booth.name} />
      </div>

      {/* Layer 4: Ground */}
      <GroundStrip layer4X={layer4X} accentColor="var(--color-circus-red)" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   BOTTLE BASH BOOTH SCENE
   ═══════════════════════════════════════════════════════ */

function StackedBottle({
  wobbleDelay,
  size,
}: {
  wobbleDelay?: number;
  size?: "sm" | "md";
}) {
  const s = size === "sm" ? { w: 16, h: 36, neckW: 6, neckH: 8 } : { w: 20, h: 44, neckW: 7, neckH: 10 };
  return (
    <div
      className="flex flex-col items-center"
      style={wobbleDelay !== undefined ? {
        animation: `wiggle 0.4s ease-in-out ${wobbleDelay}s infinite`,
      } : undefined}
      aria-hidden
    >
      {/* Neck */}
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
      {/* Neck ring */}
      <div
        style={{
          width: s.neckW + 4,
          height: 3,
          background: "var(--color-tangerine)",
          borderRadius: "1px",
          border: "1px solid var(--color-toon-shadow)",
        }}
      />
      {/* Body */}
      <div
        style={{
          width: s.w,
          height: s.h,
          background: "linear-gradient(90deg, #F0EBE0 0%, #FFF8E7 20%, #F5F0E8 50%, #FFF8E7 80%, #EDE5D8 100%)",
          borderRadius: "3px 3px 3px 3px",
          border: "2px solid var(--color-toon-shadow)",
          boxShadow: "inset -2px -2px 4px rgba(0,0,0,0.15), inset 1px 1px 3px rgba(255,255,255,0.4)",
        }}
      />
      {/* Base */}
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

function Baseball({ left, rotation }: { left: number; rotation: number }) {
  return (
    <div
      className="absolute"
      style={{
        left: `${left}%`,
        top: "78%",
        width: 16,
        height: 16,
        transform: `rotate(${rotation}deg)`,
      }}
      aria-hidden
    >
      {/* Ball body */}
      <div
        className="rounded-full w-full h-full"
        style={{
          background: "radial-gradient(circle at 35% 35%, #FFF8E7, #E8E0D0)",
          border: "2px solid var(--color-toon-shadow)",
          boxShadow: "inset -1px -1px 3px rgba(0,0,0,0.2)",
        }}
      />
      {/* Red stitching lines */}
      <div
        className="absolute"
        style={{
          left: "50%",
          top: "10%",
          width: 1.5,
          height: "80%",
          background: "var(--color-circus-red)",
          transform: "translateX(-50%)",
          opacity: 0.7,
        }}
      />
      <div
        className="absolute"
        style={{
          left: "10%",
          top: "50%",
          width: "80%",
          height: 1.5,
          background: "var(--color-circus-red)",
          transform: "translateY(-50%)",
          opacity: 0.7,
        }}
      />
    </div>
  );
}

function BottleBashBoothScene({
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
      {/* Layer 1: Backdrop */}
      <div className="absolute inset-0" style={{ transform: `translateX(${layer1X}px)` }}>
        <NightSkyBackdrop />
        {/* Ambient bottle silhouettes in background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute left-1/2 top-[20%] -translate-x-1/2 opacity-15">
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-2">
                <BottleShape /><BottleShape /><BottleShape />
              </div>
              <div className="flex gap-2">
                <BottleShape /><BottleShape />
              </div>
              <div className="flex gap-2">
                <BottleShape />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Layer 2: Tent + Bottle Pyramid + Baseballs */}
      <div
        className="absolute inset-x-0 top-[8%] bottom-[20%]"
        style={{ transform: `translateX(${layer2X}px)` }}
      >
        <TentAwning stripeColor={booth.tentStripeColor} baseColor={booth.tentBaseColor} />
        <TentPoles />

        {/* Prize shelf above */}
        <div
          className="absolute top-[12%] left-1/2 -translate-x-1/2 w-[80%] h-2"
          style={{
            background: "linear-gradient(180deg, var(--color-wood-light), var(--color-wood-dark))",
            borderRadius: "2px",
            border: "2px solid var(--color-toon-shadow)",
          }}
        />
        <span className="absolute top-[4%] left-[20%] text-xs" aria-hidden>🧸</span>
        <span className="absolute top-[4%] left-[50%] text-xs" aria-hidden>⭐</span>
        <span className="absolute top-[4%] left-[75%] text-xs" aria-hidden>🏆</span>

        {/* Wooden counter/shelf for bottles */}
        <div
          className="absolute bottom-[40%] left-1/2 -translate-x-1/2"
          style={{
            width: "70%",
            maxWidth: "300px",
          }}
        >
          {/* Shelf ledge */}
          <div
            style={{
              width: "100%",
              height: 10,
              background: "linear-gradient(180deg, #8B5E3C, var(--color-wood-dark))",
              borderRadius: "3px",
              border: "3px solid var(--color-toon-shadow)",
              boxShadow: "3px 3px 0 var(--color-toon-shadow)",
            }}
          />

          {/* Bottle pyramid: Row 1 (3 bottles) */}
          <div className="flex justify-center gap-2 -mt-[52px]">
            <StackedBottle wobbleDelay={0} />
            <StackedBottle wobbleDelay={0.8} />
            <StackedBottle wobbleDelay={1.6} />
          </div>

          {/* Bottle pyramid: Row 2 (2 bottles) */}
          <div className="flex justify-center gap-3 -mt-[10px]">
            <StackedBottle size="sm" wobbleDelay={0.4} />
            <StackedBottle size="sm" wobbleDelay={1.2} />
          </div>

          {/* Bottle pyramid: Row 3 (1 bottle on top) */}
          <div className="flex justify-center -mt-[8px]">
            <StackedBottle size="sm" />
          </div>
        </div>

        {/* Baseballs sitting on the counter */}
        <Baseball left={20} rotation={15} />
        <Baseball left={38} rotation={-20} />
        <Baseball left={65} rotation={45} />
        <Baseball left={78} rotation={-10} />
      </div>

      {/* Layer 3: Foreground UI */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center z-10"
        style={{ transform: `translateX(${layer3X}px)` }}
      >
        <BoothSign text={booth.signText} />
        <PriceChalkboard text={booth.priceText} />
        <PlayButton onClick={onPlay} insufficient={showInsufficient} boothName={booth.name} />
      </div>

      {/* Layer 4: Ground */}
      <GroundStrip layer4X={layer4X} accentColor="var(--color-tangerine)" />
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

/* ═══════════════════════════════════════════════════════
   DUCK POND BOOTH SCENE
   ═══════════════════════════════════════════════════════ */

function MetalTrack() {
  return (
    <div
      className="absolute left-[10%] right-[10%]"
      style={{ top: "42%", height: 30 }}
      aria-hidden
    >
      {/* U-shaped channel */}
      <div
        className="w-full h-full"
        style={{
          background: "linear-gradient(180deg, #6B6B7B 0%, #9A9AAA 15%, #C0C0D0 40%, #9A9AAA 60%, #6B6B7B 100%)",
          borderRadius: "0 0 8px 8px",
          border: "3px solid var(--color-toon-shadow)",
          borderTop: "2px solid #555568",
          boxShadow: "inset 0 4px 8px rgba(0,0,0,0.4), 0 2px 0 rgba(255,255,255,0.1)",
        }}
      >
        {/* Metallic sheen overlay */}
        <div
          className="absolute inset-0 rounded-b-lg"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 40%, rgba(255,255,255,0.08) 70%, transparent 100%)",
          }}
        />
        {/* Water line inside track */}
        <div
          className="absolute bottom-0 left-1 right-1"
          style={{
            height: 18,
            background: "linear-gradient(180deg, rgba(0,191,255,0.3) 0%, rgba(26,143,192,0.5) 100%)",
            borderRadius: "0 0 5px 5px",
          }}
        />
      </div>
      {/* Track supports/brackets */}
      <div
        className="absolute -bottom-3 left-[10%]"
        style={{
          width: 6,
          height: 10,
          background: "var(--color-toon-shadow)",
          borderRadius: "1px",
        }}
      />
      <div
        className="absolute -bottom-3 right-[10%]"
        style={{
          width: 6,
          height: 10,
          background: "var(--color-toon-shadow)",
          borderRadius: "1px",
        }}
      />
    </div>
  );
}

function DriftingDuck({
  index,
  speed,
  delay,
  hasTarget,
}: {
  index: number;
  speed: number;
  delay: number;
  hasTarget: boolean;
}) {
  return (
    <div
      className="absolute"
      style={{
        top: `${38 + index * 3}%`,
        animation: `drift-duck ${speed}s ease-in-out ${delay}s infinite alternate`,
      }}
      aria-hidden
    >
      {/* Duck body */}
      <div className="relative" style={{ width: 28, height: 20 }}>
        {/* Yellow duck shape */}
        <div
          style={{
            width: 24,
            height: 18,
            background: "#FFD700",
            borderRadius: "50% 50% 50% 50% / 55% 55% 45% 45%",
            border: "2px solid var(--color-toon-shadow)",
            boxShadow: "inset -1px -2px 3px rgba(0,0,0,0.15), inset 1px 1px 2px rgba(255,255,255,0.4)",
          }}
        />
        {/* Beak */}
        <div
          className="absolute"
          style={{
            right: -5,
            top: 7,
            width: 8,
            height: 5,
            background: "#FF6B1A",
            borderRadius: "0 3px 3px 0",
            border: "1.5px solid var(--color-toon-shadow)",
            borderLeft: "none",
          }}
        />
        {/* Eye */}
        <div
          className="absolute rounded-full bg-ink"
          style={{
            right: 4,
            top: 4,
            width: 3,
            height: 3,
            background: "var(--color-ink)",
          }}
        />
        {/* Target (red bullseye) — only on some ducks */}
        {hasTarget && (
          <div
            className="absolute"
            style={{
              left: 8,
              top: 6,
              width: 10,
              height: 10,
            }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "var(--color-circus-red)",
                border: "1px solid var(--color-toon-shadow)",
              }}
            />
            <div
              className="absolute rounded-full bg-tent-canvas"
              style={{
                left: 2.5,
                top: 2.5,
                width: 5,
                height: 5,
                background: "var(--color-tent-canvas)",
                border: "1px solid var(--color-toon-shadow)",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                left: 4,
                top: 4,
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

/** Blinking bulb for carnival sign */
function BlinkBulb({ delayClass, size }: { delayClass: string; size?: number }) {
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

function DuckPondBoothScene({
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
      {/* Layer 1: Backdrop */}
      <div className="absolute inset-0" style={{ transform: `translateX(${layer1X}px)` }}>
        <NightSkyBackdrop />
        {/* Pond surface bg */}
        <div
          className="absolute left-0 right-0 bottom-[35%]"
          style={{
            height: "25%",
            background: "linear-gradient(180deg, rgba(0,191,255,0.15) 0%, rgba(26,143,192,0.25) 100%)",
            borderRadius: "45% 45% 0 0 / 20% 20% 0 0",
          }}
          aria-hidden
        />
        {/* Duck bg silhouettes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
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
      </div>

      {/* Layer 2: Tent + Metal Track + Ducks */}
      <div
        className="absolute inset-x-0 top-[8%] bottom-[20%]"
        style={{ transform: `translateX(${layer2X}px)` }}
      >
        <TentAwning stripeColor={booth.tentStripeColor} baseColor={booth.tentBaseColor} />
        <TentPoles />

        {/* Illuminated carnival sign above the track */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: "10%", width: "70%", maxWidth: "280px" }}
        >
          {/* Bulb string top */}
          <div className="flex justify-center gap-2 mb-0.5">
            {["delay-bulb-1", "delay-bulb-3", "delay-bulb-5", "delay-bulb-7", "delay-bulb-9"].map((d, i) => (
              <BlinkBulb key={i} delayClass={d} size={5} />
            ))}
          </div>
          {/* Sign board */}
          <div
            style={{
              background: "linear-gradient(180deg, #1A3A5C, #0D2040)",
              borderRadius: "8px",
              border: "3px solid var(--color-toon-shadow)",
              boxShadow: "0 0 12px rgba(0,191,255,0.3), inset 0 0 8px rgba(0,191,255,0.1)",
              padding: "6px 12px",
            }}
          >
            <h2
              className="text-center m-0"
              style={{
                fontFamily: "var(--font-carnival)",
                color: "var(--color-electric-yellow)",
                fontSize: "clamp(1rem, 4vw, 1.6rem)",
                textShadow: "2px 2px 0 var(--color-toon-shadow), 0 0 10px rgba(255,230,0,0.4)",
                letterSpacing: "0.05em",
              }}
            >
              DUCK SHOOT
            </h2>
          </div>
          {/* Bulb string bottom */}
          <div className="flex justify-center gap-2 mt-0.5">
            {["delay-bulb-2", "delay-bulb-4", "delay-bulb-6", "delay-bulb-8", "delay-bulb-10"].map((d, i) => (
              <BlinkBulb key={i} delayClass={d} size={5} />
            ))}
          </div>
        </div>

        {/* Metal Track */}
        <MetalTrack />

        {/* Drifting ducks in the track */}
        <div className="absolute left-[12%] right-[12%]" style={{ top: "40%", height: 34 }}>
          {[
            { speed: 3.5, delay: 0, hasTarget: true },
            { speed: 4.2, delay: 1.5, hasTarget: false },
            { speed: 3.0, delay: 0.8, hasTarget: true },
            { speed: 4.8, delay: 2.2, hasTarget: true },
            { speed: 3.8, delay: 3.0, hasTarget: false },
          ].map((d, i) => (
            <DriftingDuck key={i} index={i} speed={d.speed} delay={d.delay} hasTarget={d.hasTarget} />
          ))}
        </div>

        {/* Fishing nets / decorations on booth wall */}
        <div
          className="absolute left-[14%]"
          style={{
            top: "58%",
            width: 40,
            height: 30,
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
            top: "58%",
            width: 40,
            height: 30,
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(255,255,255,0.08) 4px, rgba(255,255,255,0.08) 5px), repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.08) 4px, rgba(255,255,255,0.08) 5px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "2px",
          }}
          aria-hidden
        />
      </div>

      {/* Layer 3: Foreground UI */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center z-10"
        style={{ transform: `translateX(${layer3X}px)` }}
      >
        <BoothSign text={booth.signText} />
        <PriceChalkboard text={booth.priceText} />
        <PlayButton onClick={onPlay} insufficient={showInsufficient} boothName={booth.name} />
      </div>

      {/* Layer 4: Ground */}
      <GroundStrip layer4X={layer4X} accentColor="var(--color-sky-pop)" />
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

/* ═══════════════════════════════════════════════════════
   MidwayGround
   ═══════════════════════════════════════════════════════ */

function MidwayGround({ scrollOffset }: { scrollOffset: number }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-[15%] pointer-events-none z-5"
      style={{ transform: `translateX(${scrollOffset * 0.1}px)` }}
    >
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

/* ═══════════════════════════════════════════════════════
   Prize Shelf slide
   ═══════════════════════════════════════════════════════ */

function PrizeShackSlide({
  scrollOffset,
  viewportWidth,
}: {
  scrollOffset: number;
  viewportWidth: number;
}) {
  const boothCenter = 3 * viewportWidth;
  const offset = scrollOffset - boothCenter;

  return (
    <div className="min-w-[100vw] h-dvh relative snap-center overflow-hidden flex-shrink-0 flex flex-col items-center justify-center">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, #0D0524 0%, #1A0A2E 50%, #2D1040 100%)`,
          transform: `translateX(${offset * 0.2}px)`,
        }}
      />
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

      {/* Prize Shack tent awning */}
      <div
        className="relative w-[70%] max-w-[280px] mb-5"
        style={{ transform: `translateX(${offset * 0.5}px)` }}
      >
        {/* Bulb string across the top of awning */}
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
        <div className="w-full h-1" style={{ background: "var(--color-toon-shadow)" }} />
      </div>

      <div
        style={{ transform: `translateX(${offset * 1.0}px)` }}
        className="flex flex-col items-center gap-4 z-10"
      >
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

/* ═══════════════════════════════════════════════════════
   MidwayWalk — Main Component
   ═══════════════════════════════════════════════════════ */

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

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function handleScroll() {
      const offset = track.scrollLeft;
      setScrollOffset(offset);
      const vw = track.clientWidth;
      if (vw > 0) {
        const idx = Math.round(offset / vw);
        setActiveBooth(Math.min(idx, BOOTHS.length));
      }
    }

    track.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => track.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    return () => {
      if (insufficientTimerRef.current) {
        clearTimeout(insufficientTimerRef.current);
      }
    };
  }, []);

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

      triggerTransition(() => {
        navigate({ to: booth.route } as any);
      });
    },
    [spendTickets, triggerTransition, navigate],
  );

  const totalSlides = BOOTHS.length + 1;

  /** Render the appropriate booth scene based on bgDecorations */
  const renderBoothScene = (booth: BoothConfig, i: number) => {
    const shared = {
      key: booth.route,
      booth,
      index: i,
      scrollOffset,
      viewportWidth,
      onPlay: () => handlePlay(i),
      showInsufficient: insufficientBooth === i,
    };

    switch (booth.bgDecorations) {
      case "balloons":
        return <BalloonPopBoothScene {...shared} />;
      case "bottles":
        return <BottleBashBoothScene {...shared} />;
      case "ducks":
        return <DuckPondBoothScene {...shared} />;
      default:
        return <BalloonPopBoothScene {...shared} />;
    }
  };

  return (
    <main className="w-full h-dvh overflow-hidden relative bg-midnight">
      {/* Ambient Life overlays */}
      <PennantFlags />
      <DustMotes />
      <AmbientConfetti />

      <div
        ref={trackRef}
        className="flex h-full overflow-x-auto snap-x snap-mandatory scroll-smooth"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {BOOTHS.map((booth, i) => renderBoothScene(booth, i))}
        <PrizeShackSlide
          scrollOffset={scrollOffset}
          viewportWidth={viewportWidth}
        />
      </div>

      <WalkIndicator
        total={totalSlides}
        active={activeBooth}
        onSelect={scrollToBooth}
      />

      <MidwayGround scrollOffset={scrollOffset} />
    </main>
  );
}
