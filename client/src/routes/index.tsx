import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Appearance } from "@/components/Common/Appearance"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useGame } from "@/contexts/GameContext"

const joinSchema = z.object({
  matchID: z.string().min(1, "Match ID is required"),
  playerName: z.string().min(2, "Name must be at least 2 characters"),
  numPlayers: z.string().optional(),
})

type JoinFormValues = z.infer<typeof joinSchema>

export const Route = createFileRoute("/")({
  component: Lobby,
})

function Lobby() {
  const { matchID, setMatchID, setPlayerID, lobbyClient } = useGame()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinFormValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: {
      matchID: "",
      playerName: localStorage.getItem("scout_player_name") || "",
    },
  })

  useEffect(() => {
    if (matchID) {
      navigate({ to: "/game/$roomId", params: { roomId: matchID } })
    }
  }, [matchID, navigate])

  const onJoin = async (data: JoinFormValues) => {
    try {
      localStorage.setItem("scout_player_name", data.playerName)
      const { matches } = await lobbyClient.getMatch("scout", data.matchID)

      // Find first empty seat
      const match = matches[0]
      const seat = match.players.find((p) => !p.name)
      if (!seat) {
        toast.error("Match is full")
        return
      }

      const { playerCredentials } = await lobbyClient.joinMatch(
        "scout",
        data.matchID,
        {
          playerID: seat.id.toString(),
          playerName: data.playerName,
        },
      )

      localStorage.setItem(
        `scout_credentials_${data.matchID}`,
        playerCredentials,
      )
      setPlayerID(seat.id.toString())
      setMatchID(data.matchID)
    } catch (_e) {
      toast.error("Failed to join match. Make sure the ID is correct.")
    }
  }

  const onCreate = async (data: JoinFormValues) => {
    try {
      localStorage.setItem("scout_player_name", data.playerName)
      const numPlayers = parseInt(data.numPlayers || "3", 10)
      const { matchID } = await lobbyClient.createMatch("scout", {
        numPlayers,
      })

      const { playerCredentials } = await lobbyClient.joinMatch(
        "scout",
        matchID,
        {
          playerID: "0",
          playerName: data.playerName,
        },
      )

      localStorage.setItem(`scout_credentials_${matchID}`, playerCredentials)
      setPlayerID("0")
      setMatchID(matchID)
    } catch (_e) {
      toast.error("Failed to create match.")
    }
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
        <CardContent className="space-y-6">
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
          </div>

          <div className="pt-4 border-t border-primary/5 space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="matchID"
                className="text-xs font-black uppercase tracking-widest opacity-50 ml-1"
              >
                Join Match ID
              </Label>
              <div className="flex gap-2">
                <Input
                  id="matchID"
                  placeholder="Match ID..."
                  {...register("matchID")}
                  className="h-12 font-bold rounded-xl bg-secondary/30 border-primary/10"
                />
                <Button
                  onClick={handleSubmit(onJoin)}
                  className="h-12 px-6 font-black uppercase"
                >
                  Join
                </Button>
              </div>
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-primary/5" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black text-muted-foreground">
                <span className="bg-background px-2">OR CREATE NEW</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">
                Number of Players
              </Label>
              <select
                {...register("numPlayers")}
                className="w-full h-12 px-4 rounded-xl bg-secondary/30 border border-primary/10 font-bold"
              >
                <option value="2">2 Players</option>
                <option value="3">3 Players</option>
                <option value="4">4 Players</option>
                <option value="5">5 Players</option>
              </select>
            </div>
            <Button
              onClick={handleSubmit(onCreate)}
              variant="outline"
              className="w-full h-14 text-lg font-black uppercase tracking-widest rounded-2xl border-2 border-primary/10"
            >
              Create Match
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
