import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Room } from "@/lib/types"

interface WaitingRoomProps {
  room: Room
  socketId: string
  onStart: () => void
}

export function WaitingRoom({ room, socketId, onStart }: WaitingRoomProps) {
  const isHost = room.players[0]?.id === socketId

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-primary">
            Room: {room.id}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Players
            </h3>
            {room.players.map((p) => (
              <div
                key={p.id}
                className="p-3 bg-secondary/50 rounded-lg flex justify-between items-center"
              >
                <span>
                  {p.name} {p.id === socketId ? "(You)" : ""}
                </span>
                {room.players[0]?.id === p.id && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                    HOST
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          {isHost ? (
            <Button
              className="w-full h-12 text-lg font-bold"
              onClick={onStart}
              disabled={room.players.length < 2}
            >
              Start Game
            </Button>
          ) : (
            <div className="text-center w-full text-muted-foreground animate-pulse">
              Waiting for host to start...
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
