import type { Card as CardType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CardProps {
  card: CardType
  className?: string
  onClick?: () => void
  selected?: boolean
  disabled?: boolean
}

const numberColors: Record<number, string> = {
  1: "oklch(0.5427 0.1331 261.17)",
  2: "oklch(0.6115 0.1404 240.78)",
  3: "oklch(0.7016 0.1332 225.24)",
  4: "oklch(0.6547 0.1114 197.07)",
  5: "oklch(0.6687 0.2078 141.72)",
  6: "oklch(0.7941 0.1907 121.25)",
  7: "oklch(0.871 0.1783 92.98)",
  8: "oklch(0.7934 0.1636 76.57)",
  9: "oklch(0.7146 0.1718 57.59)",
  10: "oklch(0.5998 0.2256 20.73)",
}

export const Card = ({
  card,
  className,
  onClick,
  selected,
  disabled,
}: CardProps) => {
  const topColor = numberColors[card.top] || "oklch(0.5 0 0)"
  const bottomColor = numberColors[card.bottom] || "oklch(0.5 0 0)"
  const textColor = "oklch(0.223 0.021 39.22)"

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative w-16 h-24 sm:w-20 sm:h-28 rounded-xl overflow-hidden shadow-lg cursor-pointer transition-all select-none border-2 border-white/20",
        selected && "-translate-y-12 ring-4 ring-primary shadow-primary/40",
        !selected && "hover:-translate-y-4",
        disabled && "opacity-30 grayscale pointer-events-none",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, ${topColor} 0%, ${topColor} 50%, ${bottomColor} 50%, ${bottomColor} 100%)`,
      }}
    >
      {/* Top Number */}
      <div className="absolute top-0 left-0 p-2 sm:p-3">
        <span
          className="text-2xl sm:text-3xl font-black leading-none"
          style={{ color: textColor }}
        >
          {card.top}
        </span>
      </div>

      {/* Middle Divider/Accent */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20 rotate-[135deg] scale-150 pointer-events-none" />

      {/* Bottom Number (Inverted) */}
      <div className="absolute bottom-0 right-0 p-2 sm:p-3 rotate-180">
        <span
          className="text-xl sm:text-2xl font-black leading-none opacity-60"
          style={{ color: textColor }}
        >
          {card.bottom}
        </span>
      </div>
    </div>
  )
}
