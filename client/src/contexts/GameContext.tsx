import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Room } from '@/lib/types';
import { toast } from 'sonner';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

interface GameContextType {
  room: Room | null;
  error: string | null;
  socketId: string | undefined; // This is the persistent playerId
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

// 生成或获取持久化 ID
const getPersistentId = () => {
  let id = localStorage.getItem('scout_player_id');
  if (!id) {
    id = 'p_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('scout_player_id', id);
  }
  return id;
};

const playerId = getPersistentId();

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 连接时告知服务器我们的持久化 ID
    socket.emit('identify', { playerId });

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
    socket.emit('joinRoom', { roomId, playerName, playerId });
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
      room, error, socketId: playerId,
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
