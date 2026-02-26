const _ = require('lodash');

function createDeck(playerCount) {
  let deck = [];
  let id = 1;
  // Card combinations for numbers 1-10
  // Note: cards are 1/2, 1/3... 9/10 etc.
  // There are 45 cards in total (10 choose 2)
  for (let i = 1; i <= 9; i++) {
    for (let j = i + 1; j <= 10; j++) {
      deck.push({ id: id++, top: i, bottom: j });
    }
  }

  if (playerCount === 3) {
    // 3 players: Cards with "10" written on them (9 cards) are removed.
    deck = deck.filter(c => c.top !== 10 && c.bottom !== 10);
  } else if (playerCount === 2 || playerCount === 4) {
    // 2 or 4 players: Card with both "9" and "10" written on it (1 card) is removed.
    deck = deck.filter(c => !(c.top === 9 && c.bottom === 10) && !(c.top === 10 && c.bottom === 9));
  }
  // 5 players: all cards used.

  // Shuffle the deck
  deck = _.shuffle(deck);
  
  // Also randomly flip each card's orientation
  return deck.map(card => {
    if (Math.random() > 0.5) {
      return { ...card, top: card.bottom, bottom: card.top };
    }
    return card;
  });
}

function getSetInfo(cards) {
  if (cards.length === 0) return null;
  const values = cards.map(c => c.top);
  
  if (cards.length === 1) return { type: 'single', value: values[0], length: 1 };

  // Matching numbers (Group)
  const isGroup = values.every(v => v === values[0]);
  if (isGroup) return { type: 'group', value: values[0], length: cards.length };

  // Consecutive numbers (Run)
  // Must be strictly ascending or strictly descending
  let isAscending = true;
  let isDescending = true;
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] + 1) isAscending = false;
    if (values[i] !== values[i - 1] - 1) isDescending = false;
  }

  if (isAscending || isDescending) {
    return { type: 'run', value: Math.min(...values), length: cards.length };
  }

  return null;
}

function isStronger(newSet, oldSet) {
  if (!oldSet) return true;
  const newInfo = getSetInfo(newSet);
  const oldInfo = getSetInfo(oldSet);

  if (!newInfo) return false;
  
  // 1. Check quantity
  if (newInfo.length > oldInfo.length) return true;
  if (newInfo.length < oldInfo.length) return false;

  // 2. Check type (if quantity is same)
  // Matching cards (group) > Consecutive cards (run)
  if (newInfo.type === 'group' && oldInfo.type === 'run') return true;
  if (newInfo.type === 'run' && oldInfo.type === 'group') return false;

  // 3. Check numbers (if quantity and type are same)
  // Compare the smallest number in each set. Wait, rule says "compare the smallest number card in each set".
  // Actually, for Matching cards, all numbers are the same, so "smallest" is just the number.
  // For Consecutive cards, smallest is the minimum value.
  return newInfo.value > oldInfo.value;
}

function initGame(room) {
  const playerCount = room.players.length;
  
  // Initialize or increment round count
  if (room.roundCount === undefined) {
    room.roundCount = 1;
    room.currentTurn = 0; // First round starting player (can be randomized or fixed)
  } else {
    room.roundCount++;
    // Starting player shifts clockwise each round
    room.currentTurn = (room.roundCount - 1) % playerCount;
  }
  room.totalRounds = playerCount;

  // Handle deck and 2-player special case
  let deck;
  if (playerCount === 2) {
    // 2-player: Deal 11 cards, use the other 22 in round 2.
    // roundCount 1, 3, 5... should create a new full deck
    if (room.roundCount % 2 === 1) {
      room.fullDeck = createDeck(playerCount);
    }
    // Round 1 -> index 0, Round 2 -> index 22, Round 3 -> index 0...
    const startIndex = ((room.roundCount - 1) % 2) * 22;
    deck = room.fullDeck.slice(startIndex, startIndex + 22);
    
    room.players.forEach((player, idx) => {
      const hand = deck.slice(idx * 11, (idx + 1) * 11).map(card => ({
        id: card.id, top: card.top, bottom: card.bottom, isFlipped: false
      }));
      player.hand = hand;
      player.scoutChips = 3; // 2-player starts with 3 chips
      player.collectedCards = [];
      player.hasUsedScoutAndShow = false;
      player.performingScoutAndShow = false;
      player.hasPerformedScoutInScoutAndShow = false;
      player.ready = false;
    });
  } else {
    deck = createDeck(playerCount);
    let cardsPerPlayer;
    if (playerCount === 3) cardsPerPlayer = 12;
    else if (playerCount === 4) cardsPerPlayer = 11;
    else if (playerCount === 5) cardsPerPlayer = 9;

    room.players.forEach((player) => {
      const hand = deck.splice(0, cardsPerPlayer).map(card => ({
        id: card.id, top: card.top, bottom: card.bottom, isFlipped: false
      }));
      player.hand = hand;
      player.scoutChips = 0;
      player.collectedCards = [];
      player.hasUsedScoutAndShow = false;
      player.performingScoutAndShow = false;
      player.hasPerformedScoutInScoutAndShow = false;
      player.ready = false;
    });
  }

  room.activeSet = null;
  room.gameStarted = true;
  room.phase = 'READY_CHECK';
  room.consecutiveScouts = 0;
}

function canShow(player, activeSet) {
  if (!activeSet) return true;
  const hand = player.hand;
  // Check all possible adjacent sub-sequences
  for (let start = 0; start < hand.length; start++) {
    for (let end = start; end < hand.length; end++) {
      const subSet = hand.slice(start, end + 1);
      if (isStronger(subSet, activeSet.cards)) {
        return true;
      }
    }
  }
  return false;
}

function checkEndCondition(room) {
  const currentPlayer = room.players[room.currentTurn];
  const is2Player = room.players.length === 2;
  
  // Condition 1: Someone emptied their hand
  if (currentPlayer.hand.length === 0) {
    room.endReason = 'EMPTY_HAND';
    room.winnerId = currentPlayer.id;
    return true;
  }

  // Condition 2: Active set came back to owner (everyone else scouted)
  if (!is2Player) {
    if (room.activeSet && room.consecutiveScouts === room.players.length - 1) {
      room.endReason = 'ROUND_ROBIN';
      room.winnerId = room.activeSet.ownerId;
      return true;
    }
  } else {
    // 2-player Condition 2: After a Show, the other player could not Show or Scout.
    // This is checked for the player whose turn it currently is.
    const hasChips = currentPlayer.scoutChips > 0;
    const canPerformShow = canShow(currentPlayer, room.activeSet);
    
    if (!hasChips && !canPerformShow && room.activeSet && room.activeSet.ownerId !== currentPlayer.id) {
      room.endReason = 'ROUND_ROBIN';
      room.winnerId = room.activeSet.ownerId;
      return true;
    }
  }

  return false;
}

function calculateScores(room) {
  room.players.forEach(player => {
    // Basic Score: Collected cards + Scout chips
    let finalScore = player.collectedCards.length + player.scoutChips;
    
    // Penalty: -1 per remaining card
    // EXCEPTION: If the game ended because your set wasn't beaten (ROUND_ROBIN), 
    // you don't get the penalty.
    if (room.endReason === 'ROUND_ROBIN' && player.id === room.winnerId) {
      // No penalty for the winner in Round Robin case
    } else if (room.endReason === 'EMPTY_HAND' && player.id === room.winnerId) {
      // No penalty obviously as hand is 0
    } else {
      finalScore -= player.hand.length;
    }
    
    player.finalScore = finalScore;
    player.score += finalScore;
  });
  room.phase = 'SCORING';
}

module.exports = {
  initGame,
  isStronger,
  checkEndCondition,
  calculateScores
};
