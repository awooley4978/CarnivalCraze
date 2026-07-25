import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

export const PRIZE_POOL: string[] = [
  "🧸 Giant Teddy Bear",
  "🐉 Plush Dragon",
  "👽 Alien Keychain",
  "🏆 Oversized Trophy",
  "🦄 Inflatable Unicorn",
  "🎪 Mini Carnival Tent",
  "🌟 Glow-in-the-Dark Star",
  "🤡 Clown Nose",
];

interface PrizeContextType {
  prizes: string[];
  awardPrize: () => string;
}

const PrizeContext = createContext<PrizeContextType | null>(null);

const STORAGE_KEY = "carnival-prizes";

function loadPrizes(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // localStorage unavailable (SSR / private browsing)
  }
  return [];
}

export function PrizeProvider({ children }: { children: ReactNode }) {
  const [prizes, setPrizes] = useState<string[]>(loadPrizes);
  const prizesRef = useRef(prizes);
  prizesRef.current = prizes;

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prizes));
    } catch {
      // localStorage unavailable
    }
  }, [prizes]);

  const awardPrize = useCallback((): string => {
    const prize =
      PRIZE_POOL[Math.floor(Math.random() * PRIZE_POOL.length)];
    setPrizes((prev) => [...prev, prize]);
    return prize;
  }, []);

  return (
    <PrizeContext.Provider value={{ prizes, awardPrize }}>
      {children}
    </PrizeContext.Provider>
  );
}

export function usePrizes(): PrizeContextType {
  const ctx = useContext(PrizeContext);
  if (!ctx) {
    throw new Error("usePrizes must be used within a PrizeProvider");
  }
  return ctx;
}
