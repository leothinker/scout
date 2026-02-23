import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useGame } from '@/contexts/GameContext';
import { Card } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { GameHeader } from '@/components/GameHeader';
import { ActiveSet } from '@/components/ActiveSet';
import { Hand } from '@/components/Hand';
import { ReadyCheck } from '@/components/ReadyCheck';
import { ScoringModal } from '@/components/ScoringModal';
import { WaitingRoom } from '@/components/WaitingRoom';

export const Route = createFileRoute('/game/$roomId')({
  component: GamePage,
});

function GamePage() {
  const { roomId } = Route.useParams();
  const { 
    room, 
    socketId, 
    startGame, 
    showCards, 
    scoutCard, 
    useScoutAndShow, 
    setReady, 
    flipHand 
  } = useGame();
  
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [scoutingCard, setScoutingCard] = useState<{card: Card, activeIdx: number} | null>(null);

  const me = room?.players.find(p => p.id === socketId);
  const isMyTurn = room?.players[room.currentTurn]?.id === socketId;

  // Handle case where user refreshes the page
  useEffect(() => {
    if (!room && roomId) {
      // You might want to automatically re-join or redirect to lobby
      // For now, let's toast a message
      import('sonner').then(({ toast }) => toast.info("If stuck, please re-join from lobby"));
    }
  }, [room, roomId]);

  if (!room) return <div className="min-h-screen flex items-center justify-center flex-col gap-4">
    <div className="text-2xl font-black animate-pulse">Connecting...</div>
    <Button variant="outline" onClick={() => window.location.href = '/'}>Back to Lobby</Button>
  </div>;

  if (room.phase === 'WAITING') {
    return <WaitingRoom room={room} socketId={socketId} onStart={() => startGame(room.id)} />;
  }

  if (room.phase === 'READY_CHECK') {
    return <ReadyCheck me={me} onFlip={() => flipHand(room.id)} onReady={() => setReady(room.id)} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 flex flex-col gap-4 relative">
      <GameHeader room={room} me={me} currentTurnPlayerName={room.players[room.currentTurn]?.name} />
      
      <div className="flex-1 flex flex-col items-center justify-center gap-16">
        <ActiveSet 
          activeSet={room.activeSet} 
          isMyTurn={isMyTurn} 
          socketId={socketId} 
          scoutingCard={scoutingCard} 
          onInitiateScout={(idx) => room.activeSet && setScoutingCard({ card: room.activeSet.cards[idx], activeIdx: idx })} 
        />

        <div className="flex gap-4">
           {isMyTurn && !me?.performingScoutAndShow && !me?.hasUsedScoutAndShow && (
             <Button onClick={() => useScoutAndShow(room.id)} variant="outline" className="rounded-full font-bold">
               SCOUT & SHOW
             </Button>
           )}
           {me?.performingScoutAndShow && !me?.hasPerformedScoutInScoutAndShow && (
             <div className="text-primary font-bold animate-pulse">Select a card to SCOUT first...</div>
           )}
        </div>
      </div>

      {me && (
        <Hand 
          me={me} 
          isMyTurn={isMyTurn} 
          selectedIndices={selectedIndices} 
          setSelectedIndices={setSelectedIndices}
          scoutingCard={scoutingCard}
          onShow={() => {
            showCards(room.id, selectedIndices);
            setSelectedIndices([]);
          }}
          onConfirmScout={(insertIdx, flip) => {
            if (scoutingCard) {
              scoutCard(room.id, scoutingCard.activeIdx, insertIdx, flip);
              setScoutingCard(null);
            }
          }}
          onCancelScout={() => setScoutingCard(null)}
        />
      )}

      {room.phase === 'SCORING' && (
        <ScoringModal players={room.players} />
      )}
    </div>
  );
}
