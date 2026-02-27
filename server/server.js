const { Server, Origins } = require('boardgame.io/server');
const { ScoutGame } = require('./shared/game');

const server = Server({
  games: [ScoutGame],
  origins: [Origins.LOCALHOST],
});

const PORT = process.env.PORT || 3001;
server.run(PORT, () => console.log(`boardgame.io server running on port ${PORT}`));
