import { LobbyClient } from "boardgame.io/client"
import { SocketIO } from "boardgame.io/multiplayer"
import { Client } from "boardgame.io/react"
import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { ScoutGame } from "@/shared/game"

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"
const lobbyClient = new LobbyClient({ server: SOCKET_URL })

interface GameContextType {
  G: any
  ctx: any
  moves: any
  playerID: string | null
  isActive: boolean
  isConnected: boolean
  setPlayerID: (id: string | null) => void
  setMatchID: (id: string | null) => void
  matchID: string | null
  lobbyClient: LobbyClient
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [playerID, setPlayerID] = useState<string | null>(
    localStorage.getItem("scout_player_id"),
  )
  const [matchID, setMatchID] = useState<string | null>(
    localStorage.getItem("scout_match_id"),
  )
  const [gameState, setGameState] = useState<any>(null)
  const [bgioClient, setBgioClient] = useState<any>(null)

  useEffect(() => {
    if (playerID) localStorage.setItem("scout_player_id", playerID)
    else localStorage.removeItem("scout_player_id")
  }, [playerID])

  useEffect(() => {
    if (matchID) localStorage.setItem("scout_match_id", matchID)
    else localStorage.removeItem("scout_match_id")
  }, [matchID])

  useEffect(() => {
    if (matchID && playerID !== null) {
      const client = Client({
        game: ScoutGame,
        multiplayer: SocketIO({ server: SOCKET_URL }),
        matchID,
        playerID,
      })
      client.start()
      setBgioClient(client)

      const unsubscribe = client.subscribe((state) => {
        setGameState(state)
      })

      return () => {
        unsubscribe()
        client.stop()
      }
    }
    setGameState(null)
    setBgioClient(null)
  }, [matchID, playerID])

  return (
    <GameContext.Provider
      value={{
        G: gameState?.G,
        ctx: gameState?.ctx,
        moves: bgioClient?.moves,
        playerID,
        isActive: gameState?.isActive,
        isConnected: gameState?.isConnected,
        setPlayerID,
        setMatchID,
        matchID,
        lobbyClient,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) throw new Error("useGame must be used within a GameProvider")
  return context
}
