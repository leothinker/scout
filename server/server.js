const { Server } = require('boardgame.io/server');
const { ScoutGame } = require('./shared/game');

const server = Server({
  games: [ScoutGame],
  origins: true,
});

const PORT = process.env.PORT || 3001;
server.run(PORT, () => console.log(`boardgame.io server running on port ${PORT}`));
