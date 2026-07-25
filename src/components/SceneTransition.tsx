import { useEffect, useRef, useState, type ReactNode } from "react";

type TransitionPhase = "open" | "closing" | "dark" | "opening";

interface SceneTransitionProps {
  isOpen: boolean;
  onTransitionEnd?: () => void;
  onDark?: () => void;
  children: ReactNode;
}

export default function SceneTransition({
  isOpen,
  onTransitionEnd,
  onDark,
  children,
}: SceneTransitionProps) {
  const [phase, setPhase] = useState<TransitionPhase>("open");
  const prevIsOpen = useRef(isOpen);
  const onTransitionEndRef = useRef(onTransitionEnd);
  onTransitionEndRef.current = onTransitionEnd;
  const onDarkRef = useRef(onDark);
  onDarkRef.current = onDark;

  useEffect(() => {
    if (isOpen === prevIsOpen.current) return;
    prevIsOpen.current = isOpen;

    // Sequence: close curtains → dark pause → open curtains
    setPhase("closing");

    const darkTimer = setTimeout(() => {
      setPhase("dark");
      onDarkRef.current?.();
    }, 400);
    const openTimer = setTimeout(() => setPhase("opening"), 600);
    const doneTimer = setTimeout(() => {
      setPhase("open");
      onTransitionEndRef.current?.();
    }, 950);

    return () => {
      clearTimeout(darkTimer);
      clearTimeout(openTimer);
      clearTimeout(doneTimer);
    };
  }, [isOpen]);

  const flapsClosed = phase === "closing" || phase === "dark";
  const transitionDuration = phase === "opening" ? "0.35s" : "0.4s";

  return (
    <>
      {children}

      {/* Curtain overlay */}
      <div
        className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
        aria-hidden
      >
        {/* Left flap */}
        <div
          className="absolute top-0 bottom-0 w-1/2 left-0"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              var(--color-circus-red) 0px,
              var(--color-circus-red) 36px,
              var(--color-tent-canvas) 36px,
              var(--color-tent-canvas) 72px
            )`,
            transform: flapsClosed ? "translateX(0)" : "translateX(-100%)",
            transition: `transform ${transitionDuration} cubic-bezier(0.4,0,0.2,1)`,
            borderRight: "3px solid var(--color-toon-shadow)",
          }}
        />

        {/* Right flap */}
        <div
          className="absolute top-0 bottom-0 w-1/2 right-0"
          style={{
            background: `repeating-linear-gradient(
              270deg,
              var(--color-circus-red) 0px,
              var(--color-circus-red) 36px,
              var(--color-tent-canvas) 36px,
              var(--color-tent-canvas) 72px
            )`,
            transform: flapsClosed ? "translateX(0)" : "translateX(100%)",
            transition: `transform ${transitionDuration} cubic-bezier(0.4,0,0.2,1)`,
            borderLeft: "3px solid var(--color-toon-shadow)",
          }}
        />
      </div>
    </>
  );
}
