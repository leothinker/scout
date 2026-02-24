import { Appearance } from "@/components/Common/Appearance"
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
    <div className="flex flex-col sm:flex-row justify-between items-center bg-card/80 backdrop-blur-md p-2 sm:p-4 rounded-xl border shadow-sm gap-2 sm:gap-4">
      <div className="flex gap-2 sm:gap-4 items-center h-8 overflow-x-auto no-scrollbar w-full sm:w-auto">
        <div className="text-[10px] sm:text-sm font-medium whitespace-nowrap">
          Turn:{" "}
          <Badge variant="secondary" className="ml-1 text-primary font-bold">
            {currentTurnPlayerName}
          </Badge>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="text-[10px] sm:text-sm font-medium whitespace-nowrap">
          Score:{" "}
          <span className="text-green-500 font-bold ml-1">{me?.score}</span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="text-[10px] sm:text-sm font-medium whitespace-nowrap">
          Chips:{" "}
          <span className="text-yellow-500 font-bold ml-1">
            {me?.scoutChips}
          </span>
        </div>
      </div>
      <div className="flex gap-2 items-center w-full sm:w-auto justify-between sm:justify-end">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {room.players.map((p) => (
            <Badge
              key={p.id}
              variant={
                p.id === room.players[room.currentTurn]?.id
                  ? "default"
                  : "secondary"
              }
              className="text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 whitespace-nowrap"
            >
              {p.name} ({p.hand.length})
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Separator orientation="vertical" className="h-4 mx-1" />
          <Appearance />
        </div>
      </div>
    </div>
  )
}
