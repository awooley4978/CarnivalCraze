import { useMemo } from "react";

/** Chaotic double-blink pattern for ~25% of bulbs */
const DOUBLE_BLINK_INDICES = new Set([2, 7, 13, 19, 22, 25, 27]);

interface BulbConfig {
  lit: boolean;
  delayMs: number;
  doubleBlink: boolean;
}

export default function BulbMarquee() {
  const bulbs = useMemo<BulbConfig[]>(() => {
    return Array.from({ length: 28 }, (_, i) => ({
      // Start with a seeded chaos: most are lit, some off
      lit: i % 3 !== 1,
      // Stagger delays: 0s → 4.05s in 0.15s increments
      delayMs: i * 150,
      doubleBlink: DOUBLE_BLINK_INDICES.has(i),
    }));
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Backdrop strip so bulbs are visible over any content */}
      <div className="absolute inset-0 bg-midnight/70" />

      {/* Wire connecting all bulbs */}
      <div className="absolute top-1/2 left-2 right-2 h-1 bg-bulb-off -translate-y-1/2 rounded-full" />

      {/* Bulbs row */}
      <div className="relative flex justify-between items-center px-2 py-2">
        {bulbs.map((bulb, i) => (
          <div
            key={i}
            className={`
              h-5 w-5 rounded-full flex-shrink-0
              ${bulb.lit ? "bg-bulb-gold glow-bulb" : "bg-bulb-off"}
              ${bulb.doubleBlink ? "animate-blink-bulb-double" : "animate-blink-bulb"}
            `}
            style={{
              animationDelay: `${bulb.delayMs}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
