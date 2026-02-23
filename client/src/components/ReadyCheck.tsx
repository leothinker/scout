import { Button } from "@/components/ui/button"
import type { Player } from "@/lib/types"

interface ReadyCheckProps {
  me?: Player
  onFlip: () => void
  onReady: () => void
}

export function ReadyCheck({ me, onFlip, onReady }: ReadyCheckProps) {
  return (
    <div className="min-h-screen text-foreground p-8 flex flex-col items-center justify-center gap-8">
      <h2 className="text-3xl font-black italic uppercase tracking-tighter">
        Choose your hand orientation
      </h2>
      <div className="flex gap-2 p-6 bg-secondary/50 rounded-2xl border-2 border-dashed border-primary/20">
        {me?.hand.map((card, i) => (
          <div
            key={i}
            className="w-16 h-24 bg-white text-black rounded-lg flex flex-col justify-between p-2 shadow-lg ring-1 ring-primary/5"
          >
            <div className="font-black text-xl leading-none">{card.top}</div>
            <div className="text-[10px] text-muted-foreground self-end rotate-180 font-bold opacity-30">
              {card.bottom}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4">
        <Button
          variant="outline"
          size="lg"
          className="px-8 font-black uppercase tracking-widest"
          onClick={onFlip}
          disabled={me?.ready}
        >
          FLIP HAND
        </Button>
        <Button
          size="lg"
          className="px-10 font-black uppercase tracking-widest shadow-[0_0_25px_rgba(var(--primary),0.3)]"
          onClick={onReady}
          disabled={me?.ready}
        >
          I'M READY
        </Button>
      </div>
      <div className="flex gap-2">
        {/* Progress dots or indicators could go here */}
      </div>
    </div>
  )
}
