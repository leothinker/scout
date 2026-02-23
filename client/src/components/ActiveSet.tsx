import { Button } from "@/components/ui/button"
import type { Card } from "@/lib/types"

interface ActiveSetProps {
  activeSet: { cards: Card[]; ownerId: string } | null
  isMyTurn: boolean
  socketId: string
  scoutingCard: { card: Card; activeIdx: number } | null
  onInitiateScout: (idx: number) => void
}

export function ActiveSet({
  activeSet,
  isMyTurn,
  socketId,
  scoutingCard,
  onInitiateScout,
}: ActiveSetProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-muted-foreground uppercase text-[10px] font-black tracking-[0.2em] opacity-40">
        Active Set
      </div>
      {activeSet ? (
        <div className="flex gap-3 p-6 bg-card border rounded-3xl shadow-xl">
          {activeSet.cards.map((card, idx) => (
            <div key={idx} className="relative group">
              <div className="w-20 h-28 bg-white text-black rounded-xl flex items-center justify-center text-3xl font-black shadow-lg ring-1 ring-primary/5 transition-transform group-hover:scale-105">
                {card.top}
              </div>
              {isMyTurn &&
                activeSet?.ownerId !== socketId &&
                !scoutingCard &&
                (idx === 0 || idx === activeSet.cards.length - 1) && (
                  <Button
                    onClick={() => onInitiateScout(idx)}
                    className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary hover:bg-primary/90 rounded text-[9px] font-black whitespace-nowrap shadow-xl uppercase h-6"
                  >
                    SCOUT ↗
                  </Button>
                )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground italic text-sm opacity-20 py-8">
          Empty Table
        </div>
      )}
    </div>
  )
}
