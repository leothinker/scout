import { Card } from "@/components/Common/Card"
import { Button } from "@/components/ui/button"
import type { Card as CardType } from "@/lib/types"

interface ActiveSetProps {
  activeSet: { cards: CardType[]; ownerId: string } | null
  isMyTurn: boolean
  socketId: string
  scoutingCard: { card: CardType; activeIdx: number } | null
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
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-full">
      <div className="text-primary uppercase text-[8px] sm:text-[10px] font-black tracking-[0.3em] bg-primary/10 px-3 sm:px-4 py-1 rounded-full">
        Active Set
      </div>
      {activeSet ? (
        <div className="w-full overflow-x-auto no-scrollbar pb-10">
          <div className="flex gap-2 sm:gap-3 p-4 sm:p-8 bg-card/50 backdrop-blur-sm border-2 border-primary/20 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl min-w-max mx-auto justify-center">
            {activeSet.cards.map((card, idx) => (
              <div key={idx} className="relative group">
                <Card
                  card={card}
                  className="w-14 h-20 sm:w-20 sm:h-28 group-hover:scale-110 shadow-2xl"
                />
                {isMyTurn &&
                  activeSet?.ownerId !== socketId &&
                  !scoutingCard &&
                  (idx === 0 || idx === activeSet.cards.length - 1) && (
                    <Button
                      onClick={() => onInitiateScout(idx)}
                      className="absolute -bottom-8 sm:-bottom-10 left-1/2 -translate-x-1/2 px-2 sm:px-4 py-1 bg-primary hover:bg-primary/90 rounded-full text-[8px] sm:text-[10px] font-black whitespace-nowrap shadow-2xl uppercase h-6 sm:h-7 border-2 border-white/20 hover:scale-110 transition-all"
                    >
                      SCOUT ↗
                    </Button>
                  )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-muted-foreground italic text-sm sm:text-lg opacity-20 py-8 sm:py-12 tracking-widest uppercase">
          Table is Empty
        </div>
      )}
    </div>
  )
}
