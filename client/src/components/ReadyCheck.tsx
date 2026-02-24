import { Card } from "@/components/Common/Card"
import { Button } from "@/components/ui/button"
import type { Player } from "@/lib/types"

interface ReadyCheckProps {
  me?: Player
  onFlip: () => void
  onReady: () => void
}

export function ReadyCheck({ me, onFlip, onReady }: ReadyCheckProps) {
  return (
    <div className="min-h-screen text-foreground p-8 flex flex-col items-center justify-center gap-12">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-primary">
          Check your hand
        </h2>
        <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">
          Choose your orientation
        </p>
      </div>

      <div className="flex gap-2 p-10 bg-secondary/30 backdrop-blur-md rounded-[2.5rem] border-4 border-dashed border-primary/20 shadow-2xl transition-transform hover:scale-105">
        {me?.hand.map((card, i) => (
          <Card key={i} card={card} className="shadow-2xl" />
        ))}
      </div>

      <div className="flex gap-6">
        <Button
          variant="outline"
          size="lg"
          className="px-12 py-8 text-lg rounded-2xl border-2 font-black uppercase tracking-widest hover:bg-primary/10 transition-all"
          onClick={onFlip}
          disabled={me?.ready}
        >
          FLIP HAND 🔄
        </Button>
        <Button
          size="lg"
          className="px-14 py-8 text-xl rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all"
          onClick={onReady}
          disabled={me?.ready}
        >
          I'M READY
        </Button>
      </div>

      {me?.ready && (
        <div className="text-primary font-black animate-bounce uppercase tracking-[0.3em] text-sm">
          Waiting for other players...
        </div>
      )}
    </div>
  )
}
