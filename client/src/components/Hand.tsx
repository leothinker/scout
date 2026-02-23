import React from "react"
import { Button } from "@/components/ui/button"
import type { Card, Player } from "@/lib/types"
import { cn } from "@/lib/utils"

interface HandProps {
  me: Player
  isMyTurn: boolean
  selectedIndices: number[]
  setSelectedIndices: React.Dispatch<React.SetStateAction<number[]>>
  scoutingCard: { card: Card; activeIdx: number } | null
  onShow: () => void
  onConfirmScout: (insertIdx: number, flip: boolean) => void
  onCancelScout: () => void
}

export function Hand({
  me,
  isMyTurn,
  selectedIndices,
  setSelectedIndices,
  scoutingCard,
  onShow,
  onConfirmScout,
  onCancelScout,
}: HandProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-8 flex flex-col items-center bg-gradient-to-t from-black/20 to-transparent pointer-events-none">
      <div className="flex gap-2 mb-8 pointer-events-auto">
        <Button
          onClick={onShow}
          disabled={
            !isMyTurn ||
            selectedIndices.length === 0 ||
            (me.performingScoutAndShow && !me.hasPerformedScoutInScoutAndShow)
          }
          className="px-12 py-6 bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground rounded-full font-black tracking-[0.2em] shadow-2xl transition-all scale-110 h-14"
        >
          SHOW
        </Button>
      </div>

      <div className="flex gap-1 sm:gap-2 items-end pointer-events-auto">
        {/* Start insertion point for scouting */}
        {scoutingCard && (
          <button
            onClick={() => onConfirmScout(0, false)}
            className="w-10 h-28 bg-primary/5 hover:bg-primary/20 rounded-lg border-2 border-dashed border-primary/40 flex items-center justify-center text-primary font-black text-xl transition-colors"
          >
            +
          </button>
        )}

        {me.hand.map((card, idx) => (
          <React.Fragment key={idx}>
            <div
              onClick={() => {
                if (!isMyTurn || scoutingCard) return
                if (selectedIndices.includes(idx)) {
                  setSelectedIndices(selectedIndices.filter((i) => i !== idx))
                } else {
                  setSelectedIndices(
                    [...selectedIndices, idx].sort((a, b) => a - b),
                  )
                }
              }}
              className={cn(`
                relative w-16 h-24 sm:w-20 sm:h-28 bg-white text-black rounded-xl p-3 flex flex-col justify-between shadow-2xl cursor-pointer transition-all select-none border border-primary/5
                ${selectedIndices.includes(idx) ? "-translate-y-12 ring-4 ring-primary shadow-primary/40" : "hover:-translate-y-4"}
                ${scoutingCard ? "opacity-30 grayscale pointer-events-none" : ""}
              `)}
            >
              <div className="text-3xl font-black leading-none">{card.top}</div>
              <div className="text-[10px] text-muted-foreground self-end rotate-180 font-black opacity-30">
                {card.bottom}
              </div>
            </div>
            {/* Mid/End insertion points for scouting */}
            {scoutingCard && (
              <button
                onClick={() => onConfirmScout(idx + 1, false)}
                className="w-10 h-28 bg-primary/5 hover:bg-primary/20 rounded-lg border-2 border-dashed border-primary/40 flex items-center justify-center text-primary font-black text-xl transition-colors"
              >
                +
              </button>
            )}
          </React.Fragment>
        ))}
      </div>

      {scoutingCard && (
        <div className="mt-8 flex flex-col items-center gap-3 pointer-events-auto bg-card px-6 py-3 rounded-full border shadow-xl">
          <div className="text-primary font-black text-xs uppercase tracking-widest">
            INSERTING:{" "}
            <span className="text-lg bg-primary text-primary-foreground px-2 py-1 rounded ml-2">
              {scoutingCard.card.top}
            </span>{" "}
            (Bottom: {scoutingCard.card.bottom})
          </div>
          <button
            className="text-[10px] uppercase font-black tracking-widest text-muted-foreground hover:text-primary transition-colors"
            onClick={onCancelScout}
          >
            Cancel Scout
          </button>
        </div>
      )}
    </div>
  )
}
