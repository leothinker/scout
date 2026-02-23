import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Room } from '@/lib/types';
import { toast } from 'sonner';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

interface GameContextType {
  room: Room | null;
  error: string | null;
  socketId: string | undefined;
  joinRoom: (roomId: string, playerName: string) => void;
  startGame: (roomId: string) => void;
  showCards: (roomId: string, cardIndices: number[]) => void;
  scoutCard: (roomId: string, cardIndex: number, insertIndex: number, flip: boolean) => void;
  useScoutAndShow: (roomId: string) => void;
  setReady: (roomId: string) => void;
  flipHand: (roomId: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// 单例 Socket 连接
const socket: Socket = io(SOCKET_URL);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    socket.on('roomUpdate', (updatedRoom: Room) => {
      setRoom(updatedRoom);
      setError(null);
    });

    socket.on('error', (msg: string) => {
      setError(msg);
      toast.error(msg);
    });

    return () => {
      socket.off('roomUpdate');
      socket.off('error');
    };
  }, []);

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    socket.emit('joinRoom', { roomId, playerName });
  }, []);

  const startGame = useCallback((roomId: string) => {
    socket.emit('startGame', roomId);
  }, []);

  const showCards = useCallback((roomId: string, cardIndices: number[]) => {
    socket.emit('show', { roomId, cardIndices });
  }, []);

  const scoutCard = useCallback((roomId: string, cardIndex: number, insertIndex: number, flip: boolean) => {
    socket.emit('scout', { roomId, cardIndex, insertIndex, flip });
  }, []);

  const useScoutAndShow = useCallback((roomId: string) => {
    socket.emit('scoutAndShow', roomId);
  }, []);

  const setReady = useCallback((roomId: string) => {
    socket.emit('setReady', roomId);
  }, []);

  const flipHand = useCallback((roomId: string) => {
    socket.emit('flipHand', roomId);
  }, []);

  return (
    <GameContext.Provider value={{
      room, error, socketId: socket.id,
      joinRoom, startGame, showCards, scoutCard, useScoutAndShow, setReady, flipHand
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
}
