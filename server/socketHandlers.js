const { initGame, isStronger, checkEndCondition, calculateScores } = require('./gameLogic');

const MAX_PLAYERS = 5;
const MIN_PLAYERS = 2;
const rooms = new Map();
// 增加 socketId 到 playerId 的映射，方便断开连接时处理
const socketToPlayerId = new Map();
const playerIdToRoomId = new Map();

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    
    // 玩家重新连接时的标识逻辑
    socket.on('identify', ({ playerId }) => {
      socketToPlayerId.set(socket.id, playerId);
      
      // 检查玩家是否已经在某个房间中
      const roomId = playerIdToRoomId.get(playerId);
      if (roomId && rooms.has(roomId)) {
        socket.join(roomId);
        const room = rooms.get(roomId);
        // 更新该玩家的最新 socket.id
        const player = room.players.find(p => p.id === playerId);
        if (player) {
          player.socketId = socket.id; // 维护最新的 socketId 以便 io.to 发送消息
        }
        socket.emit('roomUpdate', room);
      }
    });

    socket.on('joinRoom', ({ roomId, playerName, playerId }) => {
      socket.join(roomId);
      socketToPlayerId.set(socket.id, playerId);
      playerIdToRoomId.set(playerId, roomId);

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
      
      // 检查玩家是否已经在房间里 (断线重连)
      let player = room.players.find(p => p.id === playerId);
      
      if (!player) {
        if (room.gameStarted) return socket.emit('error', 'Game in progress');
        if (room.players.length >= MAX_PLAYERS) return socket.emit('error', 'Room full');
        
        player = {
          id: playerId, // 这里使用 playerId 而不是 socket.id
          socketId: socket.id,
          name: playerName,
          hand: [],
          score: 0,
          scoutChips: 0,
          collectedCards: [],
          hasUsedScoutAndShow: false,
          ready: false
        };
        room.players.push(player);
      } else {
        // 更新玩家的 socketId
        player.socketId = socket.id;
      }

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
      
      const playerId = socketToPlayerId.get(socket.id);
      const player = room.players[room.currentTurn];
      if (!player || player.id !== playerId) return;

      const sortedIndices = [...cardIndices].sort((a, b) => a - b);
      const isAdjacent = sortedIndices.every((idx, i) => i === 0 || idx === sortedIndices[i - 1] + 1);
      if (!isAdjacent) return socket.emit('error', 'Cards must be adjacent');

      const cardsToPlay = cardIndices.map(idx => player.hand[idx]);
      if (isStronger(cardsToPlay, room.activeSet ? room.activeSet.cards : null)) {
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
      
      const playerId = socketToPlayerId.get(socket.id);
      const player = room.players[room.currentTurn];
      if (!player || player.id !== playerId) return;
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
      
      const owner = room.players.find(p => p.id === room.activeSet.ownerId);
      if (owner) owner.scoutChips++;

      if (activeCards.length === 0) room.activeSet = null;
      
      room.consecutiveScouts++;
      if (checkEndCondition(room)) {
        calculateScores(room);
      } else {
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
      
      const playerId = socketToPlayerId.get(socket.id);
      const player = room.players[room.currentTurn];
      if (!player || player.id !== playerId || player.hasUsedScoutAndShow) return;

      player.performingScoutAndShow = true;
      player.hasPerformedScoutInScoutAndShow = false;
      io.to(roomId).emit('roomUpdate', room);
    });

    socket.on('flipHand', (roomId) => {
      const room = rooms.get(roomId);
      if (!room || room.phase !== 'READY_CHECK') return;
      
      const playerId = socketToPlayerId.get(socket.id);
      const player = room.players.find(p => p.id === playerId);
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
      
      const playerId = socketToPlayerId.get(socket.id);
      const player = room.players.find(p => p.id === playerId);
      if (!player) return;

      player.ready = true;
      if (room.players.every(p => p.ready)) {
        room.phase = 'PLAYING';
      }
      io.to(roomId).emit('roomUpdate', room);
    });

    socket.on('disconnect', () => {
      const playerId = socketToPlayerId.get(socket.id);
      socketToPlayerId.delete(socket.id);
      // 注意：不要在断开连接时立即删除玩家，因为他可能正在刷新页面
      console.log(`Socket ${socket.id} disconnected (Player: ${playerId})`);
    });
  });
}

module.exports = { setupSocketHandlers, rooms };
