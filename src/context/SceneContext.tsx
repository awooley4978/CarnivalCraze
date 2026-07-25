import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

interface SceneContextType {
  isTransitioning: boolean;
  triggerTransition: (onDark: () => void) => void;
  consumeDarkCallback: () => (() => void) | null;
}

const SceneContext = createContext<SceneContextType | null>(null);

export function SceneProvider({ children }: { children: ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const darkCallbackRef = useRef<(() => void) | null>(null);

  const triggerTransition = useCallback((onDark: () => void) => {
    darkCallbackRef.current = onDark;
    setIsTransitioning((prev) => !prev);
  }, []);

  const consumeDarkCallback = useCallback(() => {
    const cb = darkCallbackRef.current;
    darkCallbackRef.current = null;
    return cb;
  }, []);

  return (
    <SceneContext.Provider
      value={{ isTransitioning, triggerTransition, consumeDarkCallback }}
    >
      {children}
    </SceneContext.Provider>
  );
}

export function useSceneTransition(): SceneContextType {
  const ctx = useContext(SceneContext);
  if (!ctx) {
    throw new Error("useSceneTransition must be used within a SceneProvider");
  }
  return ctx;
}
