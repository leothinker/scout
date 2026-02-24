import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Appearance } from "@/components/Common/Appearance"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useGame } from "@/contexts/GameContext"

const joinSchema = z.object({
  roomId: z.string().min(1, "Room ID is required"),
  playerName: z.string().min(2, "Name must be at least 2 characters"),
})

type JoinFormValues = z.infer<typeof joinSchema>

export const Route = createFileRoute("/")({
  component: Lobby,
})

function Lobby() {
  const { room, joinRoom } = useGame()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinFormValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: {
      roomId: "",
      playerName: "",
    },
  })

  useEffect(() => {
    if (room) {
      navigate({ to: "/game/$roomId", params: { roomId: room.id } })
    }
  }, [room, navigate])

  const onSubmit = (data: JoinFormValues) => {
    joinRoom(data.roomId, data.playerName)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <Appearance />
      </div>
      <Card className="w-full max-w-md shadow-2xl border-2 border-primary/10">
        <CardHeader>
          <CardTitle className="text-5xl font-black text-center tracking-tighter italic bg-gradient-to-br from-primary to-primary/40 bg-clip-text text-transparent">
            SCOUT
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="roomId"
                className="text-xs font-black uppercase tracking-widest opacity-50 ml-1"
              >
                Room ID
              </Label>
              <Input
                id="roomId"
                placeholder="Enter room code..."
                {...register("roomId")}
                className="h-14 text-lg font-bold rounded-2xl bg-secondary/30 border-primary/10"
              />
              {errors.roomId && (
                <p className="text-destructive text-xs font-bold ml-1">
                  {errors.roomId.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="playerName"
                className="text-xs font-black uppercase tracking-widest opacity-50 ml-1"
              >
                Your Name
              </Label>
              <Input
                id="playerName"
                placeholder="Enter your name..."
                {...register("playerName")}
                className="h-14 text-lg font-bold rounded-2xl bg-secondary/30 border-primary/10"
              />
              {errors.playerName && (
                <p className="text-destructive text-xs font-bold ml-1">
                  {errors.playerName.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full h-16 text-xl font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:scale-[1.02] transition-transform"
            >
              Join Game
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
