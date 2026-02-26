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
      console.log(`Identify: ${playerId} for socket ${socket.id}`);
      socketToPlayerId.set(socket.id, playerId);
      
      const roomId = playerIdToRoomId.get(playerId);
      if (roomId && rooms.has(roomId)) {
        socket.join(roomId);
        const room = rooms.get(roomId);
        const player = room.players.find(p => p.id === playerId);
        if (player) {
          player.socketId = socket.id;
        }
        console.log(`Re-joined ${playerId} to ${roomId}`);
        // 使用 io.to(roomId) 广播，确保所有人知道该玩家“回来了”
        io.to(roomId).emit('roomUpdate', room);
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
      
      let player = room.players.find(p => p.id === playerId);
      
      if (!player) {
        if (room.gameStarted) return socket.emit('error', 'Game in progress');
        if (room.players.length >= MAX_PLAYERS) return socket.emit('error', 'Room full');
        
        player = {
          id: playerId,
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
        player.socketId = socket.id;
        player.name = playerName; // 允许重连时更新名字
      }

      io.to(roomId).emit('roomUpdate', room);
    });

    socket.on('startGame', (roomId) => {
      const room = rooms.get(roomId);
      const playerId = socketToPlayerId.get(socket.id);
      
      // 增加安全检查：只有第一个玩家（房主）可以开始游戏
      if (room && room.players[0]?.id === playerId && room.players.length >= MIN_PLAYERS) {
        initGame(room);
        io.to(roomId).emit('roomUpdate', room);
      } else if (room && room.players.length < MIN_PLAYERS) {
        socket.emit('error', `Need at least ${MIN_PLAYERS} players`);
      }
    });

    socket.on('show', ({ roomId, cardIndices }) => {
      const room = rooms.get(roomId);
      if (!room) return socket.emit('error', 'Room not found');
      if (room.phase !== 'PLAYING') return socket.emit('error', 'Game not in playing phase');
      
      const playerId = socketToPlayerId.get(socket.id);
      const player = room.players[room.currentTurn];
      
      if (!player || player.id !== playerId) {
        return socket.emit('error', "It's not your turn");
      }

      if (cardIndices.length === 0) return socket.emit('error', 'No cards selected');

      const sortedIndices = [...cardIndices].sort((a, b) => a - b);
      const isAdjacent = sortedIndices.every((idx, i) => i === 0 || idx === sortedIndices[i - 1] + 1);
      if (!isAdjacent) return socket.emit('error', 'Cards must be adjacent');

      const cardsToPlay = cardIndices.map(idx => player.hand[idx]);
      if (cardsToPlay.some(c => !c)) return socket.emit('error', 'Invalid card selection');

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
      } else {
        socket.emit('error', 'Selected cards are not stronger than the active set');
      }
    });

    socket.on('scout', ({ roomId, cardIndex, insertIndex, flip }) => {
      const room = rooms.get(roomId);
      if (!room || !room.activeSet || room.phase !== 'PLAYING') return;
      
      const playerId = socketToPlayerId.get(socket.id);
      const player = room.players[room.currentTurn];
      if (!player || player.id !== playerId) return;
      if (player.id === room.activeSet.ownerId) return;

      // Prevent scouting twice during Scout & Show
      if (player.performingScoutAndShow && player.hasPerformedScoutInScoutAndShow) {
        return socket.emit('error', 'Already scouted. Now you must SHOW or end turn.');
      }

      const is2Player = room.players.length === 2;
      if (is2Player && player.scoutChips <= 0) {
        return socket.emit('error', 'No scout chips left');
      }

      const activeCards = room.activeSet.cards;
      if (cardIndex !== 0 && cardIndex !== activeCards.length - 1) return;

      const [scoutedCard] = activeCards.splice(cardIndex, 1);
      const finalCard = { ...scoutedCard };
      if (flip) {
        const temp = finalCard.top;
        finalCard.top = finalCard.bottom;
        finalCard.bottom = temp;
        finalCard.isFlipped = !finalCard.isFlipped;
      }

      player.hand.splice(insertIndex, 0, finalCard);
      
      if (is2Player) {
        player.scoutChips--;
        // In 2-player, chip goes to center, not to owner.
      } else {
        const owner = room.players.find(p => p.id === room.activeSet.ownerId);
        if (owner) owner.scoutChips++;
      }

      if (activeCards.length === 0) room.activeSet = null;
      
      room.consecutiveScouts++;
      
      // In 2-player, Scout doesn't end the turn
      const shouldChangeTurn = !is2Player && !player.performingScoutAndShow;

      if (checkEndCondition(room)) {
        calculateScores(room);
      } else if (shouldChangeTurn) {
        room.currentTurn = (room.currentTurn + 1) % room.players.length;
      } else if (player.performingScoutAndShow) {
        player.hasPerformedScoutInScoutAndShow = true;
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

    socket.on('endTurn', (roomId) => {
      const room = rooms.get(roomId);
      if (!room || room.phase !== 'PLAYING') return;
      
      const playerId = socketToPlayerId.get(socket.id);
      const player = room.players[room.currentTurn];
      if (!player || player.id !== playerId) return;

      // Only allow ending turn if performing Scout & Show after scouting
      if (player.performingScoutAndShow && player.hasPerformedScoutInScoutAndShow) {
        player.hasUsedScoutAndShow = true;
        player.performingScoutAndShow = false;
        player.hasPerformedScoutInScoutAndShow = false;
        
        room.currentTurn = (room.currentTurn + 1) % room.players.length;
        io.to(roomId).emit('roomUpdate', room);
      } else {
        socket.emit('error', 'You must perform an action.');
      }
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

    socket.on('restartGame', (roomId) => {
      const room = rooms.get(roomId);
      const playerId = socketToPlayerId.get(socket.id);
      
      if (room && room.players[0]?.id === playerId && room.phase === 'SCORING') {
        room.gameStarted = false;
        room.phase = 'WAITING';
        room.activeSet = null;
        room.roundCount = undefined; // This will trigger re-init in initGame
        room.players.forEach(p => {
          p.score = 0;
          p.hand = [];
          p.ready = false;
          p.collectedCards = [];
          p.scoutChips = 0;
          p.hasUsedScoutAndShow = false;
          p.performingScoutAndShow = false;
          p.hasPerformedScoutInScoutAndShow = false;
        });
        io.to(roomId).emit('roomUpdate', room);
      }
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
