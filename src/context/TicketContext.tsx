import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

interface TicketContextType {
  tickets: number;
  spendTickets: (amount: number) => boolean;
  earnTickets: (amount: number) => void;
}

const TicketContext = createContext<TicketContextType | null>(null);

const STORAGE_KEY = "carnival-tickets";
const INITIAL_TICKETS = 50;

function loadTickets(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
  } catch {
    // localStorage unavailable (SSR / private browsing)
  }
  return INITIAL_TICKETS;
}

export function TicketProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<number>(loadTickets);
  const ticketsRef = useRef(tickets);
  ticketsRef.current = tickets;

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(tickets));
    } catch {
      // localStorage unavailable
    }
  }, [tickets]);

  const spendTickets = useCallback((amount: number): boolean => {
    if (ticketsRef.current < amount) return false;
    setTickets((prev) => prev - amount);
    return true;
  }, []);

  const earnTickets = useCallback((amount: number) => {
    setTickets((prev) => prev + amount);
  }, []);

  return (
    <TicketContext.Provider value={{ tickets, spendTickets, earnTickets }}>
      {children}
    </TicketContext.Provider>
  );
}

export function useTickets(): TicketContextType {
  const ctx = useContext(TicketContext);
  if (!ctx) {
    throw new Error("useTickets must be used within a TicketProvider");
  }
  return ctx;
}
