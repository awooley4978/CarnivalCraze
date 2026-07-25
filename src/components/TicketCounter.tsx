import { useEffect, useRef, useState } from "react";
import { useTickets } from "~/context/TicketContext";

export default function TicketCounter() {
  const { tickets } = useTickets();
  const prevTickets = useRef(tickets);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (tickets !== prevTickets.current) {
      prevTickets.current = tickets;
      setFlash(true);
      const timeout = setTimeout(() => setFlash(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [tickets]);

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50
        ticket-counter text-xl sm:text-2xl
        select-none
        ${flash ? "animate-counter-flash" : ""}
      `}
    >
      🎟️ {tickets}
    </div>
  );
}
