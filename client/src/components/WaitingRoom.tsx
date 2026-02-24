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
      <Card className="w-full max-w-lg shadow-2xl border-2 border-primary/20 rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-primary/5 pb-8">
          <CardTitle className="text-4xl font-black text-center text-primary tracking-tighter italic">
            Room: {room.id}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-8">
          <div className="space-y-4">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em] ml-2">
              Players ({room.players.length})
            </h3>
            <div className="grid gap-3">
              {room.players.map((p) => (
                <div
                  key={p.id}
                  className="p-4 bg-secondary/30 backdrop-blur-sm rounded-2xl flex justify-between items-center border border-primary/5 transition-all hover:bg-secondary/50"
                >
                  <span className="font-bold text-lg flex items-center gap-2">
                    {p.name}
                    {p.id === socketId && (
                      <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                        You
                      </span>
                    )}
                  </span>
                  {room.players[0]?.id === p.id && (
                    <span className="text-[10px] bg-primary/20 text-primary px-3 py-1 rounded-full font-black uppercase tracking-[0.2em]">
                      HOST
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="pb-8">
          {isHost ? (
            <Button
              className="w-full h-16 text-xl font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:scale-[1.02] transition-transform"
              onClick={onStart}
              disabled={room.players.length < 2}
            >
              Start Game
            </Button>
          ) : (
            <div className="w-full p-4 bg-secondary/20 rounded-2xl text-center text-muted-foreground font-bold animate-pulse uppercase tracking-widest text-xs">
              Waiting for host to start...
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
