const { initGame, isStronger, checkEndCondition, calculateScores } = require('./gameLogic');

const MAX_PLAYERS = 5;
const MIN_PLAYERS = 2;
const rooms = new Map();

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('joinRoom', ({ roomId, playerName }) => {
      socket.join(roomId);
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          id: roomId,
          players: [],
          activeSet: null,
          gameStarted: false,
          phase: 'WAITING'
        });
      }
      const room = rooms.get(roomId);
      if (room.gameStarted) return socket.emit('error', 'Game in progress');
      if (room.players.length >= MAX_PLAYERS) return socket.emit('error', 'Room full');

      room.players.push({
        id: socket.id,
        name: playerName,
        hand: [],
        score: 0,
        scoutChips: 0,
        collectedCards: [],
        hasUsedScoutAndShow: false,
        ready: false
      });
      io.to(roomId).emit('roomUpdate', room);
    });

    socket.on('startGame', (roomId) => {
      const room = rooms.get(roomId);
      if (room && room.players.length >= MIN_PLAYERS) {
        initGame(room);
        io.to(roomId).emit('roomUpdate', room);
      }
    });

    socket.on('show', ({ roomId, cardIndices }) => {
      const room = rooms.get(roomId);
      if (!room || room.phase !== 'PLAYING') return;
      const player = room.players[room.currentTurn];
      if (!player || player.id !== socket.id) return;

      // Validate adjacency
      const sortedIndices = [...cardIndices].sort((a, b) => a - b);
      const isAdjacent = sortedIndices.every((idx, i) => i === 0 || idx === sortedIndices[i - 1] + 1);
      if (!isAdjacent) return socket.emit('error', 'Cards must be adjacent');

      const cardsToPlay = cardIndices.map(idx => player.hand[idx]);
      if (isStronger(cardsToPlay, room.activeSet ? room.activeSet.cards : null)) {
        // Award chips/cards from previous active set to current player
        if (room.activeSet) {
          player.collectedCards.push(...room.activeSet.cards);
        }

        room.activeSet = {
          cards: cardsToPlay,
          ownerId: player.id
        };
        player.hand = player.hand.filter((_, idx) => !cardIndices.includes(idx));
        room.consecutiveScouts = 0;

        if (player.performingScoutAndShow) {
          player.hasUsedScoutAndShow = true;
          player.performingScoutAndShow = false;
          player.hasPerformedScoutInScoutAndShow = false;
        }

        if (checkEndCondition(room)) {
          calculateScores(room);
        } else {
          room.currentTurn = (room.currentTurn + 1) % room.players.length;
        }
        io.to(roomId).emit('roomUpdate', room);
      }
    });

    socket.on('scout', ({ roomId, cardIndex, insertIndex, flip }) => {
      const room = rooms.get(roomId);
      if (!room || !room.activeSet || room.phase !== 'PLAYING') return;
      const player = room.players[room.currentTurn];
      if (!player || player.id !== socket.id) return;
      if (player.id === room.activeSet.ownerId) return;

      const activeCards = room.activeSet.cards;
      if (cardIndex !== 0 && cardIndex !== activeCards.length - 1) return;

      const [scoutedCard] = activeCards.splice(cardIndex, 1);
      if (flip) {
        const temp = scoutedCard.top;
        scoutedCard.top = scoutedCard.bottom;
        scoutedCard.bottom = temp;
        scoutedCard.isFlipped = !scoutedCard.isFlipped;
      }

      player.hand.splice(insertIndex, 0, scoutedCard);
      
      // Reward owner with a scout chip
      const owner = room.players.find(p => p.id === room.activeSet.ownerId);
      if (owner) owner.scoutChips++;

      if (activeCards.length === 0) room.activeSet = null;
      
      room.consecutiveScouts++;
      if (checkEndCondition(room)) {
        calculateScores(room);
      } else {
        // If it was a normal scout, move turn. If part of Scout & Show, wait for Show.
        if (!player.performingScoutAndShow) {
          room.currentTurn = (room.currentTurn + 1) % room.players.length;
        } else {
          player.hasPerformedScoutInScoutAndShow = true;
        }
      }
      io.to(roomId).emit('roomUpdate', room);
    });

    socket.on('scoutAndShow', (roomId) => {
      const room = rooms.get(roomId);
      if (!room || room.phase !== 'PLAYING') return;
      const player = room.players[room.currentTurn];
      if (!player || player.id !== socket.id || player.hasUsedScoutAndShow) return;

      player.performingScoutAndShow = true;
      player.hasPerformedScoutInScoutAndShow = false;
      io.to(roomId).emit('roomUpdate', room);
    });

    socket.on('flipHand', (roomId) => {
      const room = rooms.get(roomId);
      if (!room || room.phase !== 'READY_CHECK') return;
      const player = room.players.find(p => p.id === socket.id);
      if (!player || player.ready) return;

      player.hand = player.hand.map(card => ({
        ...card,
        top: card.bottom,
        bottom: card.top,
        isFlipped: !card.isFlipped
      }));
      io.to(roomId).emit('roomUpdate', room);
    });

    socket.on('setReady', (roomId) => {
      const room = rooms.get(roomId);
      if (!room || room.phase !== 'READY_CHECK') return;
      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      player.ready = true;
      if (room.players.every(p => p.ready)) {
        room.phase = 'PLAYING';
      }
      io.to(roomId).emit('roomUpdate', room);
    });

    socket.on('disconnect', () => {
      // Room cleanup logic could go here
    });
  });
}

module.exports = { setupSocketHandlers };
