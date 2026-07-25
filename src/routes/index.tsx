import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function BulbString() {
  // 12 bulbs, alternating lit/unlit starting positions, each with staggered delay
  const bulbs = Array.from({ length: 12 }, (_, i) => ({
    lit: i % 2 === 0,
    delayClass: `delay-bulb-${(i % 10) + 1}`,
  }));

  return (
    <div className="flex justify-center gap-2 px-4 py-3">
      {bulbs.map((bulb, i) => (
        <div
          key={i}
          className={`
            animate-blink-bulb ${bulb.delayClass}
            h-4 w-4 rounded-full
            ${bulb.lit ? "bg-bulb-gold glow-bulb" : "bg-bulb-off"}
          `}
        />
      ))}
    </div>
  );
}

function BoothCard({
  emoji,
  name,
  cost,
  to,
}: {
  emoji: string;
  name: string;
  cost: string;
  to: string;
}) {
  return (
    <Link to={to} className="card-booth flex flex-col items-center gap-3 text-center no-underline">
      <span className="text-4xl" role="img" aria-label={name}>
        {emoji}
      </span>
      <h3 className="font-carnival text-electric-yellow text-xl m-0">{name}</h3>
      <p className="font-toon text-tent-canvas text-sm m-0">{cost}</p>
      <span className="ribbon-banner text-base mt-1 cursor-pointer select-none">
        PLAY
      </span>
    </Link>
  );
}

function Home() {
  return (
    <main className="bg-midnight min-h-dvh flex flex-col">
      {/* Bulb string */}
      <BulbString />

      {/* Big top tent header */}
      <div className="relative mx-4 mb-carnival">
        <div
          className="
            bg-tent-stripes animate-tent-stripe-wave
            rounded-t-[50%_30%] rounded-b-[20%_10%]
            pt-ringmaster pb-bouncy px-bouncy
            flex flex-col items-center
            border-toon
            shadow-[6px_6px_0_var(--color-toon-shadow)]
          "
        >
          <h1 className="font-carnival text-tent-canvas text-3xl sm:text-5xl text-center m-0 leading-tight">
            🎪 CARNIVAL CRAZE 🎪
          </h1>
        </div>
      </div>

      {/* Ticket counter */}
      <div className="sticky top-0 z-10 flex justify-center py-2">
        <span className="ticket-counter text-lg sm:text-xl">
          🎟️ 50
        </span>
      </div>

      {/* Booth cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-carnival px-bouncy pb-carnival flex-1">
        <div className="animate-bounce-in" style={{ animationDelay: "0.1s" }}>
          <BoothCard
            emoji="🎯"
            name="Balloon Pop"
            cost="2 Tickets"
            to="/balloon-pop"
          />
        </div>
        <div className="animate-bounce-in" style={{ animationDelay: "0.25s" }}>
          <BoothCard
            emoji="🦆"
            name="Duck Pond"
            cost="1 Ticket"
            to="/duck-pond"
          />
        </div>
        <div className="animate-bounce-in sm:col-span-2 flex justify-center" style={{ animationDelay: "0.4s" }}>
          <div className="card-booth flex flex-col items-center gap-3 text-center w-full sm:max-w-sm">
            <span className="text-4xl" role="img" aria-label="Prize Shelf">
              🧸
            </span>
            <h3 className="font-carnival text-electric-yellow text-xl m-0">Prize Shelf</h3>
            <p className="font-toon text-tent-canvas text-sm m-0">View Collection</p>
            <Link
              to="/prizes"
              className="ribbon-banner text-base mt-1 cursor-pointer select-none no-underline"
            >
              VIEW
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-bulb-off font-toon text-xs">
        Carnival Craze
      </footer>
    </main>
  );
}
