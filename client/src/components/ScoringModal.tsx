import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useGame } from "@/contexts/GameContext"
import type { Player, Room } from "@/lib/types"

interface ScoringModalProps {
  players: Player[]
  room: Room
}

export function ScoringModal({ players, room }: ScoringModalProps) {
  const { moves, playerID } = useGame()
  const isHost = playerID === "0"
  const isGameOver = room.roundCount >= room.totalRounds

  // For final results, sort by total score. For mid-round, sort by current round score.
  const sortedPlayers = [...players].sort((a, b) =>
    isGameOver
      ? (b.score || 0) - (a.score || 0)
      : (b.finalScore || 0) - (a.finalScore || 0),
  )

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-md flex items-center justify-center z-50 p-6">
      <Card className="w-full max-w-sm shadow-2xl border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-4xl font-black mb-2 text-center bg-gradient-to-br from-primary to-primary/40 bg-clip-text text-transparent italic tracking-tight uppercase">
            {isGameOver ? "Final Results" : "Round Over"}
          </CardTitle>
          {!isGameOver && (
            <div className="text-center text-xs text-muted-foreground font-black uppercase tracking-widest">
              Round {room.roundCount} of {room.totalRounds}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4 mb-8">
          {sortedPlayers.map((p, i) => (
            <div
              key={p.id}
              className="flex justify-between items-center p-5 bg-secondary/50 rounded-2xl border border-primary/5 transition-transform hover:scale-105"
            >
              <div className="flex gap-4 items-center">
                <span className="text-muted-foreground font-black text-xs">
                  #{i + 1}
                </span>
                <span className="font-bold text-lg">
                  {p.name || `Player ${p.id}`}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-3xl font-black text-primary">
                  {isGameOver ? p.score : p.finalScore}
                </span>
                {!isGameOver && (
                  <span className="text-[10px] text-muted-foreground font-bold">
                    Total: {p.score}
                  </span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter>
          {isHost ? (
            <Button
              className="w-full py-6 text-xl font-black tracking-widest uppercase rounded-2xl h-14"
              onClick={() =>
                isGameOver ? moves.restartGame() : moves.nextRound()
              }
            >
              {isGameOver ? "NEW GAME" : "NEXT ROUND"}
            </Button>
          ) : (
            <div className="w-full p-4 bg-secondary/20 rounded-2xl text-center text-muted-foreground font-bold animate-pulse uppercase tracking-widest text-xs">
              Waiting for host...
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
