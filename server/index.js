const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const _ = require('lodash');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const MAX_PLAYERS = 5;
const MIN_PLAYERS = 2;

const rooms = new Map();

function createDeck() {
  const deck = [];
  let id = 1;
  // Card combinations for numbers 1-10
  for (let i = 1; i <= 9; i++) {
    for (let j = i + 1; j <= 10; j++) {
      deck.push({ id: id++, top: i, bottom: j });
    }
  }
  return _.shuffle(deck);
}

function getSetInfo(cards) {
  if (cards.length === 0) return null;
  if (cards.length === 1) return { type: 'single', value: cards[0].top, length: 1 };

  const values = cards.map(c => c.top);
  const isGroup = values.every(v => v === values[0]);
  if (isGroup) return { type: 'group', value: values[0], length: cards.length };

  const sortedValues = [...values].sort((a, b) => a - b);
  const isRun = sortedValues.every((v, i) => i === 0 || v === sortedValues[i - 1] + 1);
  // In SCOUT, a run must be in order in the hand.
  const isOrderedRun = values.every((v, i) => i === 0 || v === values[i-1] + 1 || v === values[i-1] - 1);

  if (isRun && isOrderedRun) {
    return { type: 'run', value: Math.min(...values), length: cards.length };
  }

  return null;
}

function isStronger(newSet, oldSet) {
  if (!oldSet) return true;
  const newInfo = getSetInfo(newSet);
  const oldInfo = getSetInfo(oldSet);

  if (!newInfo) return false;
  if (newInfo.length > oldInfo.length) return true;
  if (newInfo.length < oldInfo.length) return false;

  if (newInfo.type === 'group' && oldInfo.type === 'run') return true;
  if (newInfo.type === 'run' && oldInfo.type === 'group') return false;

  return newInfo.value > oldInfo.value;
}

function initGame(room) {
  const deck = createDeck();
  const playerCount = room.players.length;
  
  let cardsPerPlayer = playerCount === 5 ? 9 : (playerCount === 3 ? 12 : 11);

  room.players.forEach((player) => {
    const hand = deck.splice(0, cardsPerPlayer).map(card => {
      return {
        id: card.id,
        top: card.top,
        bottom: card.bottom,
        isFlipped: false
      };
    });
    player.hand = hand;
    player.score = 0;
    player.scoutChips = 0;
    player.hasUsedScoutAndShow = false;
    player.performingScoutAndShow = false;
    player.hasPerformedScoutInScoutAndShow = false;
    player.collectedCards = [];
    player.ready = false;
  });

  room.activeSet = null;
  room.currentTurn = 0;
  room.gameStarted = true;
  room.phase = 'READY_CHECK';
  room.consecutiveScouts = 0;
}

function checkEndCondition(room) {
  const currentPlayer = room.players[room.currentTurn];
  
  // Condition 1: Someone emptied their hand
  if (currentPlayer.hand.length === 0) return true;

  // Condition 2: Active set came back to owner (everyone else scouted)
  if (room.consecutiveScouts === room.players.length - 1 && room.activeSet) {
    return true;
  }

  return false;
}

function calculateScores(room) {
  room.players.forEach(player => {
    // Points = collected cards + scout chips - remaining cards in hand
    // Special case: if player ended the game by emptying hand, they don't subtract hand cards (which are 0)
    player.finalScore = player.collectedCards.length + player.scoutChips - player.hand.length;
    player.score += player.finalScore;
  });
  room.phase = 'SCORING';
}

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
      hasUsedScoutAndShow: false
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
    if (player.id !== socket.id) return;

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
    if (player.id !== socket.id) return;
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
    if (player.id !== socket.id || player.hasUsedScoutAndShow) return;

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
});

const PORT = 3001;
server.listen(PORT, () => console.log(`Server on ${PORT}`));
