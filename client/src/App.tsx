import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import _ from 'lodash';

const socket: Socket = io('http://localhost:3001');

interface Card {
  id: number;
  top: number;
  bottom: number;
  isFlipped: boolean;
}

interface Player {
  id: string;
  name: string;
  hand: Card[];
  score: number;
  scoutChips: number;
  collectedCards: Card[];
  hasUsedScoutAndShow: boolean;
  ready: boolean;
  performingScoutAndShow?: boolean;
  hasPerformedScoutInScoutAndShow?: boolean;
  finalScore?: number;
}

interface Room {
  id: string;
  players: Player[];
  activeSet: { cards: Card[]; ownerId: string } | null;
  gameStarted: boolean;
  phase: 'WAITING' | 'READY_CHECK' | 'PLAYING' | 'SCORING';
  currentTurn: number;
}

const App: React.FC = () => {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [scoutingCard, setScoutingCard] = useState<{card: Card, activeIdx: number} | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    socket.on('roomUpdate', (updatedRoom: Room) => {
      setRoom(updatedRoom);
      setError('');
    });
    socket.on('error', (msg: string) => setError(msg));
    return () => {
      socket.off('roomUpdate');
      socket.off('error');
    };
  }, []);

  const joinRoom = () => {
    if (roomId && playerName) socket.emit('joinRoom', { roomId, playerName });
  };

  const startGame = () => {
    if (room) socket.emit('startGame', room.id);
  };

  const showCards = () => {
    if (room && selectedIndices.length > 0) {
      socket.emit('show', { roomId: room.id, cardIndices: selectedIndices });
      setSelectedIndices([]);
    }
  };

  const initiateScout = (activeIdx: number) => {
    if (room?.activeSet) {
      setScoutingCard({ card: room.activeSet.cards[activeIdx], activeIdx });
    }
  };

  const confirmScout = (insertIdx: number, flip: boolean) => {
    if (room && scoutingCard) {
      socket.emit('scout', { 
        roomId: room.id, 
        cardIndex: scoutingCard.activeIdx, 
        insertIndex: insertIdx, 
        flip 
      });
      setScoutingCard(null);
    }
  };

  const useScoutAndShow = () => {
    if (room) socket.emit('scoutAndShow', room.id);
  };

  const setReady = () => {
    if (room) socket.emit('setReady', room.id);
  };

  const flipHand = () => {
    if (room) socket.emit('flipHand', room.id);
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="bg-neutral-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-neutral-700">
          <h1 className="text-4xl font-bold text-center mb-8 text-white tracking-tight">SCOUT</h1>
          <input
            className="w-full p-4 mb-4 bg-neutral-700 rounded-lg text-white border border-neutral-600"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <input
            className="w-full p-4 mb-6 bg-neutral-700 rounded-lg text-white border border-neutral-600"
            placeholder="Your Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg" onClick={joinRoom}>Join Game</button>
          {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        </div>
      </div>
    );
  }

  const me = room.players.find(p => p.id === socket.id);
  const isMyTurn = room.players[room.currentTurn]?.id === socket.id;

  if (room.phase === 'WAITING') {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white">
        <div className="bg-neutral-800 p-8 rounded-xl border border-neutral-700 w-full max-w-lg">
          <h2 className="text-2xl font-bold mb-6 text-center text-blue-400">Room: {room.id}</h2>
          <div className="space-y-2 mb-8">
            {room.players.map(p => (
              <div key={p.id} className="p-3 bg-neutral-700 rounded-lg">{p.name} {p.id === socket.id ? '(You)' : ''}</div>
            ))}
          </div>
          {room.players[0]?.id === socket.id && (
            <button className="w-full py-4 bg-green-600 rounded-lg font-bold disabled:opacity-50" onClick={startGame} disabled={room.players.length < 2}>Start Game</button>
          )}
        </div>
      </div>
    );
  }

  if (room.phase === 'READY_CHECK') {
    return (
      <div className="min-h-screen bg-neutral-900 text-white p-8 flex flex-col items-center justify-center gap-8">
        <h2 className="text-3xl font-bold">Choose your hand orientation</h2>
        <div className="flex gap-2 p-6 bg-neutral-800 rounded-2xl border border-neutral-700">
          {me?.hand.map((card, i) => (
            <div key={i} className="w-16 h-24 bg-white text-black rounded-lg flex flex-col justify-between p-2">
              <div className="font-bold text-xl">{card.top}</div>
              <div className="text-xs text-neutral-400 self-end rotate-180">{card.bottom}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-4">
          <button className="px-8 py-4 bg-neutral-700 rounded-xl font-bold hover:bg-neutral-600" onClick={flipHand} disabled={me?.ready}>FLIP HAND</button>
          <button className="px-8 py-4 bg-blue-600 rounded-xl font-bold hover:bg-blue-500" onClick={setReady} disabled={me?.ready}>I'M READY</button>
        </div>
        <div className="flex gap-2">
          {room.players.map(p => (
            <div key={p.id} className={`w-3 h-3 rounded-full ${p.ready ? 'bg-green-500' : 'bg-neutral-600'}`}></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4 flex flex-col gap-4">
      {/* Header Info */}
      <div className="flex justify-between items-center bg-neutral-800 p-4 rounded-xl border border-neutral-700">
         <div className="flex gap-4">
           <div>Turn: <span className="text-blue-400 font-bold">{room.players[room.currentTurn]?.name}</span></div>
           <div>My Score: <span className="text-green-400 font-bold">{me?.score}</span></div>
           <div>Chips: <span className="text-yellow-400 font-bold">{me?.scoutChips}</span></div>
         </div>
         <div className="flex gap-1">
           {room.players.map(p => (
             <div key={p.id} className={`px-2 py-1 text-xs rounded ${p.id === room.players[room.currentTurn]?.id ? 'bg-blue-600' : 'bg-neutral-700'}`}>
               {p.name} ({p.hand.length})
             </div>
           ))}
         </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-16">
        {/* Table Area */}
        <div className="flex flex-col items-center gap-6">
          <div className="text-neutral-500 uppercase text-xs font-black tracking-widest">Active Set</div>
          {room.activeSet ? (
            <div className="flex gap-3 p-6 bg-neutral-800/50 rounded-3xl border border-neutral-700">
              {room.activeSet.cards.map((card, idx) => (
                <div key={idx} className="relative group">
                  <div className="w-20 h-28 bg-white text-black rounded-xl flex items-center justify-center text-3xl font-black shadow-2xl">
                    {card.top}
                  </div>
                  {isMyTurn && room.activeSet?.ownerId !== socket.id && !scoutingCard && (idx === 0 || idx === room.activeSet.cards.length - 1) && (
                    <button 
                      onClick={() => initiateScout(idx)}
                      className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-[10px] font-bold whitespace-nowrap shadow-lg"
                    >
                      SCOUT ↗
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : <div className="text-neutral-700 italic">Empty Table</div>}
        </div>

        {/* Action Controls */}
        <div className="flex gap-4">
           {isMyTurn && !me?.performingScoutAndShow && !me?.hasUsedScoutAndShow && (
             <button onClick={useScoutAndShow} className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full font-bold shadow-lg hover:brightness-110">SCOUT & SHOW</button>
           )}
           {me?.performingScoutAndShow && !me?.hasPerformedScoutInScoutAndShow && (
             <div className="text-purple-400 font-bold animate-pulse">Select a card to SCOUT first...</div>
           )}
        </div>
      </div>

      {/* Hand Area */}
      {me && (
        <div className="fixed bottom-0 left-0 right-0 p-8 flex flex-col items-center bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex gap-2 mb-6">
             <button 
               onClick={showCards}
               disabled={!isMyTurn || selectedIndices.length === 0 || (me.performingScoutAndShow && !me.hasPerformedScoutInScoutAndShow)}
               className="px-10 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-600 rounded-full font-black tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all"
             >
               SHOW
             </button>
          </div>

          <div className="flex gap-1 sm:gap-2 items-end">
            {/* Start insertion point for scouting */}
            {scoutingCard && (
              <button onClick={() => confirmScout(0, false)} className="w-8 h-24 bg-blue-600/20 hover:bg-blue-600/50 rounded-lg border-2 border-dashed border-blue-500 flex items-center justify-center text-blue-400 font-bold">+</button>
            )}
            
            {me.hand.map((card, idx) => (
              <React.Fragment key={idx}>
                <div 
                  onClick={() => {
                    if (!isMyTurn || scoutingCard) return;
                    if (selectedIndices.includes(idx)) setSelectedIndices(selectedIndices.filter(i => i !== idx));
                    else setSelectedIndices([...selectedIndices, idx].sort((a,b) => a-b));
                  }}
                  className={`
                    relative w-16 h-24 sm:w-20 sm:h-28 bg-white text-black rounded-xl p-2 flex flex-col justify-between shadow-xl cursor-pointer transition-all select-none
                    ${selectedIndices.includes(idx) ? '-translate-y-8 ring-4 ring-blue-500' : 'hover:-translate-y-2'}
                    ${scoutingCard ? 'opacity-40 grayscale pointer-events-none' : ''}
                  `}
                >
                  <div className="text-2xl font-black">{card.top}</div>
                  <div className="text-xs text-neutral-300 self-end rotate-180 font-bold">{card.bottom}</div>
                </div>
                {/* Mid/End insertion points for scouting */}
                {scoutingCard && (
                  <button onClick={() => confirmScout(idx + 1, false)} className="w-8 h-24 bg-blue-600/20 hover:bg-blue-600/50 rounded-lg border-2 border-dashed border-blue-500 flex items-center justify-center text-blue-400 font-bold">+</button>
                )}
              </React.Fragment>
            ))}
          </div>
          
          {scoutingCard && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <div className="text-blue-400 font-bold text-sm">INSERTING: {scoutingCard.card.top} (Bottom: {scoutingCard.card.bottom})</div>
              <button className="text-xs underline text-neutral-500" onClick={() => setScoutingCard(null)}>Cancel Scout</button>
            </div>
          )}
        </div>
      )}

      {/* Scoring Modal */}
      {room.phase === 'SCORING' && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-6">
          <div className="bg-neutral-800 p-8 rounded-3xl border border-neutral-700 w-full max-w-sm">
            <h2 className="text-4xl font-black mb-8 text-center bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent italic">GAME OVER</h2>
            <div className="space-y-4 mb-8">
              {[...room.players].sort((a,b) => (b.finalScore||0) - (a.finalScore||0)).map((p, i) => (
                <div key={p.id} className="flex justify-between items-center p-4 bg-neutral-700/50 rounded-2xl">
                  <div className="flex gap-3 items-center">
                    <span className="text-neutral-500 font-black">#{i+1}</span>
                    <span className="font-bold">{p.name}</span>
                  </div>
                  <span className="text-2xl font-black">{p.finalScore}</span>
                </div>
              ))}
            </div>
            <button className="w-full py-4 bg-white text-black font-black rounded-2xl" onClick={() => window.location.reload()}>PLAY AGAIN</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
