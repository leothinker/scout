const _ = require('lodash');

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
    player.finalScore = player.collectedCards.length + player.scoutChips - player.hand.length;
    player.score += player.finalScore;
  });
  room.phase = 'SCORING';
}

module.exports = {
  initGame,
  isStronger,
  checkEndCondition,
  calculateScores
};
