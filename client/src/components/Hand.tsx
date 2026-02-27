import type React from "react"
import { useState } from "react"
import { Card } from "@/components/Common/Card"
import { Button } from "@/components/ui/button"
import type { Card as CardType, Player, Room } from "@/lib/types"
import { cn } from "@/lib/utils"

interface HandProps {
  room: Room
  me: Player
  isMyTurn: boolean
  selectedIndices: number[]
  setSelectedIndices: React.Dispatch<React.SetStateAction<number[]>>
  scoutingCard: { card: CardType; activeIdx: number } | null
  onShow: () => void
  onConfirmScout: (insertIdx: number, flip: boolean) => void
  onCancelScout: () => void
  onScoutAndShow?: () => void
  onEndTurn?: () => void
}

export function Hand({
  room,
  me,
  isMyTurn,
  selectedIndices,
  setSelectedIndices,
  scoutingCard,
  onShow,
  onConfirmScout,
  onCancelScout,
  onScoutAndShow,
  onEndTurn,
}: HandProps) {
  const [isFlipping, setIsFlipping] = useState(false)

  return (
    <div className="fixed bottom-0 left-0 right-0 pb-6 pt-4 flex flex-col items-center bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-40">
      {/* Action Buttons */}
      <div className="flex gap-4 mb-4 pointer-events-auto items-center">
        {selectedIndices.length > 0 && !scoutingCard && (
          <Button
            onClick={() => setSelectedIndices([])}
            variant="ghost"
            className="rounded-full h-10 w-10 p-0 text-muted-foreground hover:text-destructive"
          >
            ✕
          </Button>
        )}

        {me.performingScoutAndShow && me.hasPerformedScoutInScoutAndShow && (
          <Button
            onClick={onEndTurn}
            variant="outline"
            className="px-6 h-12 rounded-full font-black text-xs tracking-widest border-2 border-destructive/20 hover:bg-destructive/10 text-destructive"
          >
            END TURN
          </Button>
        )}

        <Button
          onClick={onShow}
          disabled={
            !isMyTurn ||
            selectedIndices.length === 0 ||
            (me.performingScoutAndShow && !me.hasPerformedScoutInScoutAndShow)
          }
          className="px-8 sm:px-12 py-4 sm:py-6 bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground rounded-full font-black tracking-[0.2em] shadow-2xl transition-all active:scale-95 h-12 sm:h-14 border-2 sm:border-4 border-white/20"
        >
          SHOW
        </Button>

        {isMyTurn &&
          room.players.length > 2 &&
          !me.performingScoutAndShow &&
          !me.hasUsedScoutAndShow &&
          !scoutingCard && (
            <Button
              onClick={onScoutAndShow}
              variant="outline"
              className="px-4 sm:px-6 h-10 sm:h-12 rounded-full font-black text-[10px] sm:text-xs tracking-widest border-2 border-primary/20 hover:bg-primary/10"
            >
              SCOUT & SHOW
            </Button>
          )}
      </div>

      {/* Hand Container with horizontal scroll */}
      <div className="w-full overflow-x-auto no-scrollbar pointer-events-auto flex justify-start sm:justify-center px-8">
        <div className="flex items-end pb-8 min-w-max mx-auto h-40 sm:h-48 relative px-10">
          {/* First insertion point */}
          {scoutingCard && (
            <button
              onClick={() => onConfirmScout(0, isFlipping)}
              className="absolute left-0 bottom-8 w-8 h-28 sm:h-32 bg-primary/20 hover:bg-primary/40 rounded-full border-2 border-dashed border-primary/60 flex items-center justify-center text-primary font-black text-2xl transition-all z-50 animate-pulse"
            >
              +
            </button>
          )}

          {me.hand.map((card, idx) => {
            const rotation = (idx - (me.hand.length - 1) / 2) * 2 // Fan rotation
            const translationY = Math.abs(idx - (me.hand.length - 1) / 2) * 2 // Lift outer cards slightly? Actually, dip them.

            return (
              <div
                key={idx}
                className="relative group flex items-end"
                style={{
                  marginLeft: idx === 0 ? 0 : "-1.5rem",
                  transform: `rotate(${rotation}deg) translateY(${translationY}px)`,
                  transformOrigin: "bottom center",
                }}
              >
                <Card
                  card={card}
                  selected={selectedIndices.includes(idx)}
                  disabled={!!scoutingCard}
                  className={cn(
                    "transition-all duration-300",
                    selectedIndices.includes(idx)
                      ? "z-30 !-translate-y-20 !rotate-0"
                      : "hover:z-20",
                  )}
                  onClick={() => {
                    if (!isMyTurn) return
                    // Scout & Show check: Must scout first
                    if (
                      me.performingScoutAndShow &&
                      !me.hasPerformedScoutInScoutAndShow
                    ) {
                      import("sonner").then(({ toast }) =>
                        toast.info("Scout a card first, then you can Show!"),
                      )
                      return
                    }
                    if (scoutingCard) return

                    if (selectedIndices.includes(idx)) {
                      // Only allow removing if it's from the ends of the selection to maintain adjacency
                      const min = Math.min(...selectedIndices)
                      const max = Math.max(...selectedIndices)
                      if (idx === min || idx === max) {
                        setSelectedIndices(
                          selectedIndices.filter((i) => i !== idx),
                        )
                      } else if (selectedIndices.length === 1) {
                        setSelectedIndices([])
                      } else {
                        import("sonner").then(({ toast }) =>
                          toast.error("Can only deselect from the ends"),
                        )
                      }
                    } else {
                      if (selectedIndices.length === 0) {
                        setSelectedIndices([idx])
                      } else {
                        const min = Math.min(...selectedIndices)
                        const max = Math.max(...selectedIndices)
                        if (idx === min - 1 || idx === max + 1) {
                          setSelectedIndices(
                            [...selectedIndices, idx].sort((a, b) => a - b),
                          )
                        } else {
                          import("sonner").then(({ toast }) =>
                            toast.error("Cards must be adjacent in your hand"),
                          )
                        }
                      }
                    }
                  }}
                />

                {/* Mid/End insertion points for scouting - Positioned between cards */}
                {scoutingCard && (
                  <button
                    onClick={() => onConfirmScout(idx + 1, isFlipping)}
                    className="absolute right-[-1rem] bottom-8 w-8 h-28 sm:h-32 bg-primary/20 hover:bg-primary/40 rounded-full border-2 border-dashed border-primary/60 flex items-center justify-center text-primary font-black text-2xl transition-all z-50 animate-pulse"
                  >
                    +
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Insertion Preview */}
      {scoutingCard && (
        <div className="fixed bottom-32 sm:bottom-40 flex flex-col items-center gap-2 pointer-events-auto bg-card/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-primary/20 shadow-2xl z-50 scale-90 sm:scale-100">
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-black text-primary uppercase tracking-widest">
              Inserting:
            </div>
            <div
              className="relative group"
              onClick={() => setIsFlipping(!isFlipping)}
            >
              <Card
                card={{
                  ...scoutingCard.card,
                  top: isFlipping
                    ? scoutingCard.card.bottom
                    : scoutingCard.card.top,
                  bottom: isFlipping
                    ? scoutingCard.card.top
                    : scoutingCard.card.bottom,
                }}
                className="w-12 h-16 sm:w-14 sm:h-20 border-primary animate-in fade-in zoom-in"
              />
              <div className="absolute -top-2 -right-2 bg-primary text-white text-[8px] p-1 rounded-full shadow-lg">
                🔄
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-bold">
                Click card to FLIP
              </span>
              <button
                className="text-[10px] uppercase font-black text-destructive hover:scale-110 transition-transform text-left"
                onClick={() => {
                  onCancelScout()
                  setIsFlipping(false)
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
