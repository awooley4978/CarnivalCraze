import { useMemo } from "react";

interface ConfettiProps {
  count: number;
  colors: string[];
}

interface Piece {
  id: number;
  left: number; // 0–100%
  color: string;
  size: number; // px
  delay: number; // seconds
  duration: number; // seconds
  rotation: number; // degrees
  isCircle: boolean;
}

export default function Confetti({ count, colors }: ConfettiProps) {
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 6, // 6–14px
        delay: Math.random() * 1.5, // 0–1.5s
        duration: Math.random() * 2 + 2.5, // 2.5–4.5s
        rotation: Math.random() * 360,
        isCircle: Math.random() > 0.5,
      })),
    [count, colors],
  );

  return (
    <div
      className="fixed inset-0 z-[90] pointer-events-none overflow-hidden"
      aria-hidden
    >
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute"
          style={{
            left: `${piece.left}%`,
            top: "-10px",
            width: `${piece.size}px`,
            height: piece.isCircle ? `${piece.size}px` : `${piece.size * 0.6}px`,
            backgroundColor: piece.color,
            borderRadius: piece.isCircle ? "50%" : "2px",
            opacity: 0,
            animationName: "confetti-fall",
            animationDuration: `${piece.duration}s`,
            animationDelay: `${piece.delay}s`,
            animationTimingFunction: "linear",
            animationFillMode: "forwards",
            transform: `rotate(${piece.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}
