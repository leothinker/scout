import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { ActiveSet } from "@/components/ActiveSet"
import { GameHeader } from "@/components/GameHeader"
import { Hand } from "@/components/Hand"
import { ReadyCheck } from "@/components/ReadyCheck"
import { ScoringModal } from "@/components/ScoringModal"
import { Button } from "@/components/ui/button"
import { useGame } from "@/contexts/GameContext"
import type { Card } from "@/lib/types"

export const Route = createFileRoute("/game/$roomId")({
  component: GamePage,
})

function GamePage() {
  const { G, ctx, moves, playerID, matchID, setMatchID, setPlayerID } =
    useGame()
  const navigate = useNavigate()

  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [scoutingCard, setScoutingCard] = useState<{
    card: Card
    activeIdx: number
  } | null>(null)

  useEffect(() => {
    if (!matchID) {
      navigate({ to: "/" })
    }
  }, [matchID, navigate])

  if (!G || !ctx)
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <div className="text-2xl font-black animate-pulse text-primary tracking-widest uppercase">
          Connecting to Match...
        </div>
        <Button
          variant="outline"
          className="rounded-2xl font-black border-2"
          onClick={() => {
            setMatchID(null)
            setPlayerID(null)
            navigate({ to: "/" })
          }}
        >
          Back to Lobby
        </Button>
      </div>
    )

  const me = G.players[playerID!]
  const isMyTurn = ctx.currentPlayer === playerID

  if (ctx.phase === "readyCheck") {
    return (
      <ReadyCheck
        me={me}
        onFlip={() => moves.flipHand()}
        onReady={() => moves.setReady()}
      />
    )
  }

  // Waiting logic for players in lobby
  // In boardgame.io, setup usually finishes when all players are present
  // But we can check if players are assigned names in setup
  // For now, let's assume the game starts when the phase changes

  return (
    <div className="min-h-screen bg-background text-foreground p-4 flex flex-col gap-4 relative overflow-hidden">
      <GameHeader
        room={{ ...G, id: matchID } as any}
        me={me}
        currentTurnPlayerName={
          G.players[ctx.currentPlayer]?.name || `Player ${ctx.currentPlayer}`
        }
      />

      <div className="flex-1 flex flex-col items-center justify-center gap-16 pb-48">
        <ActiveSet
          activeSet={G.activeSet}
          isMyTurn={isMyTurn}
          socketId={playerID!}
          scoutingCard={scoutingCard}
          onInitiateScout={(idx) =>
            G.activeSet &&
            setScoutingCard({ card: G.activeSet.cards[idx], activeIdx: idx })
          }
        />

        <div className="flex gap-4 min-h-[40px]">
          {me?.performingScoutAndShow &&
            !me?.hasPerformedScoutInScoutAndShow && (
              <div className="text-primary font-bold animate-pulse uppercase tracking-widest text-sm bg-primary/5 px-4 py-2 rounded-full border border-primary/20">
                Select a card from the Active Set to SCOUT first...
              </div>
            )}
        </div>
      </div>

      {me && (
        <Hand
          room={{ ...G, id: matchID, players: G.players } as any}
          me={me}
          isMyTurn={isMyTurn}
          selectedIndices={selectedIndices}
          setSelectedIndices={setSelectedIndices}
          scoutingCard={scoutingCard}
          onShow={() => {
            moves.show(selectedIndices)
            setSelectedIndices([])
          }}
          onConfirmScout={(insertIdx, flip) => {
            if (scoutingCard) {
              moves.scout(scoutingCard.activeIdx, insertIdx, flip)
              setScoutingCard(null)
            }
          }}
          onCancelScout={() => setScoutingCard(null)}
          onScoutAndShow={() => moves.scoutAndShow()}
          onEndTurn={() => moves.endTurn()}
        />
      )}

      {ctx.phase === "scoring" && (
        <ScoringModal players={G.players} room={{ ...G, id: matchID } as any} />
      )}
    </div>
  )
}
