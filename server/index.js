const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { setupSocketHandlers, rooms } = require('./socketHandlers');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

setupSocketHandlers(io);

// 示例 REST API：检查房间状态
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (room) {
    res.json({ id: room.id, playersCount: room.players.length, started: room.gameStarted });
  } else {
    res.status(404).json({ message: 'Room not found' });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
