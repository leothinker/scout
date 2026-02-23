import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Player, Room } from "@/lib/types"

interface GameHeaderProps {
  room: Room
  me?: Player
  currentTurnPlayerName?: string
}

export function GameHeader({
  room,
  me,
  currentTurnPlayerName,
}: GameHeaderProps) {
  return (
    <div className="flex justify-between items-center bg-card p-4 rounded-xl border shadow-sm">
      <div className="flex gap-4 items-center h-8">
        <div className="text-sm font-medium">
          Turn:{" "}
          <Badge variant="secondary" className="ml-1 text-primary font-bold">
            {currentTurnPlayerName}
          </Badge>
        </div>
        <Separator orientation="vertical" />
        <div className="text-sm font-medium">
          My Score:{" "}
          <span className="text-green-500 font-bold ml-1">{me?.score}</span>
        </div>
        <Separator orientation="vertical" />
        <div className="text-sm font-medium">
          Chips:{" "}
          <span className="text-yellow-500 font-bold ml-1">
            {me?.scoutChips}
          </span>
        </div>
      </div>
      <div className="flex gap-1">
        {room.players.map((p) => (
          <Badge
            key={p.id}
            variant={
              p.id === room.players[room.currentTurn]?.id
                ? "default"
                : "secondary"
            }
            className="text-[10px] px-2 py-0.5"
          >
            {p.name} ({p.hand.length})
          </Badge>
        ))}
      </div>
    </div>
  )
}
