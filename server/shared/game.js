const { INVALID_MOVE } = require('boardgame.io/core');
const _ = require('lodash');

const ScoutGame = {
  name: 'scout',

  setup: (ctx) => {
    const playerCount = ctx.numPlayers;
    const totalRounds = playerCount;
    
    return {
      roundCount: 0,
      totalRounds,
      deck: [],
      fullDeck: [],
      activeSet: null,
      consecutiveScouts: 0,
      endReason: null,
      winnerId: null,
      players: Array(playerCount).fill(null).map((_, i) => ({
        id: i.toString(),
        hand: [],
        score: 0,
        scoutChips: 0,
        collectedCards: [],
        hasUsedScoutAndShow: false,
        ready: false,
        performingScoutAndShow: false,
        hasPerformedScoutInScoutAndShow: false,
        finalScore: 0
      }))
    };
  },

  phases: {
    readyCheck: {
      start: true,
      onBegin: (G, ctx) => {
        G.roundCount++;
        const playerCount = ctx.numPlayers;
        
        let deck;
        if (playerCount === 2) {
          if (G.roundCount % 2 === 1) {
            G.fullDeck = createDeck(playerCount);
          }
          const startIndex = ((G.roundCount - 1) % 2) * 22;
          deck = G.fullDeck.slice(startIndex, startIndex + 22);
          
          G.players.forEach((player, idx) => {
            player.hand = deck.slice(idx * 11, (idx + 1) * 11);
            player.scoutChips = 3;
            player.collectedCards = [];
            player.hasUsedScoutAndShow = false;
            player.performingScoutAndShow = false;
            player.hasPerformedScoutInScoutAndShow = false;
            player.ready = false;
          });
        } else {
          deck = createDeck(playerCount);
          let cardsPerPlayer = playerCount === 3 ? 12 : (playerCount === 4 ? 11 : 9);
          G.players.forEach((player) => {
            player.hand = deck.splice(0, cardsPerPlayer);
            player.scoutChips = 0;
            player.collectedCards = [];
            player.hasUsedScoutAndShow = false;
            player.performingScoutAndShow = false;
            player.hasPerformedScoutInScoutAndShow = false;
            player.ready = false;
          });
        }
        G.activeSet = null;
        G.consecutiveScouts = 0;
        G.endReason = null;
        G.winnerId = null;
      },
      moves: {
        flipHand: (G, ctx) => {
          const player = G.players[ctx.currentPlayer];
          if (player.ready) return INVALID_MOVE;
          player.hand = player.hand.map((card) => ({
            ...card,
            top: card.bottom,
            bottom: card.top
          }));
        },
        setReady: (G, ctx) => {
          G.players[ctx.currentPlayer].ready = true;
          if (G.players.every((p) => p.ready)) {
            ctx.events.endPhase();
          }
        }
      },
      next: 'playing'
    },

    playing: {
      turn: {
        order: {
          first: (G, ctx) => (G.roundCount - 1) % ctx.numPlayers,
          next: (G, ctx) => {
            const player = G.players[ctx.currentPlayer];
            if (ctx.numPlayers === 2 && G.lastAction === 'scout') {
                return ctx.playOrderPos;
            }
            if (player.performingScoutAndShow && !player.hasPerformedScoutInScoutAndShow) {
                return ctx.playOrderPos;
            }
            if (player.performingScoutAndShow && player.hasPerformedScoutInScoutAndShow && !G.lastActionWasShow) {
                return ctx.playOrderPos;
            }

            return (ctx.playOrderPos + 1) % ctx.numPlayers;
          }
        },
        onBegin: (G) => {
            G.lastAction = null;
            G.lastActionWasShow = false;
        }
      },
      moves: {
        show: (G, ctx, cardIndices) => {
          const player = G.players[ctx.currentPlayer];
          if (cardIndices.length === 0) return INVALID_MOVE;

          const sortedIndices = [...cardIndices].sort((a, b) => a - b);
          const isAdjacent = sortedIndices.every((idx, i) => i === 0 || idx === sortedIndices[i - 1] + 1);
          if (!isAdjacent) return INVALID_MOVE;

          const cardsToPlay = cardIndices.map(idx => player.hand[idx]);
          if (!isStronger(cardsToPlay, G.activeSet ? G.activeSet.cards : null)) {
            return INVALID_MOVE;
          }

          if (G.activeSet) {
            player.collectedCards.push(...G.activeSet.cards);
          }

          G.activeSet = {
            cards: cardsToPlay,
            ownerId: ctx.currentPlayer
          };
          player.hand = player.hand.filter((_, idx) => !cardIndices.includes(idx));
          G.consecutiveScouts = 0;
          G.lastAction = 'show';
          G.lastActionWasShow = true;

          if (player.performingScoutAndShow) {
            player.hasUsedScoutAndShow = true;
            player.performingScoutAndShow = false;
            player.hasPerformedScoutInScoutAndShow = false;
          }

          if (checkEndCondition(G, ctx)) {
            calculateScores(G, ctx);
            ctx.events.endPhase({ next: 'scoring' });
          } else {
            ctx.events.endTurn();
          }
        },

        scout: (G, ctx, cardIndex, insertIndex, flip) => {
          const player = G.players[ctx.currentPlayer];
          if (!G.activeSet || ctx.currentPlayer === G.activeSet.ownerId) return INVALID_MOVE;

          if (player.performingScoutAndShow && player.hasPerformedScoutInScoutAndShow) {
            return INVALID_MOVE;
          }

          const is2Player = ctx.numPlayers === 2;
          if (is2Player && player.scoutChips <= 0) return INVALID_MOVE;

          const activeCards = G.activeSet.cards;
          if (cardIndex !== 0 && cardIndex !== activeCards.length - 1) return INVALID_MOVE;

          const [scoutedCard] = activeCards.splice(cardIndex, 1);
          const finalCard = { ...scoutedCard };
          if (flip) {
            [finalCard.top, finalCard.bottom] = [finalCard.bottom, finalCard.top];
          }

          player.hand.splice(insertIndex, 0, finalCard);
          
          if (is2Player) {
            player.scoutChips--;
          } else {
            const owner = G.players[G.activeSet.ownerId];
            owner.scoutChips++;
          }

          if (activeCards.length === 0) G.activeSet = null;
          G.consecutiveScouts++;
          G.lastAction = 'scout';

          if (player.performingScoutAndShow) {
            player.hasPerformedScoutInScoutAndShow = true;
          } else if (is2Player) {
              // 2-player Scout doesn't end turn
          } else {
            if (checkEndCondition(G, ctx)) {
                calculateScores(G, ctx);
                ctx.events.endPhase({ next: 'scoring' });
            } else {
                ctx.events.endTurn();
            }
          }
        },

        scoutAndShow: (G, ctx) => {
          const player = G.players[ctx.currentPlayer];
          if (player.hasUsedScoutAndShow) return INVALID_MOVE;
          player.performingScoutAndShow = true;
          player.hasPerformedScoutInScoutAndShow = false;
        },

        endTurn: (G, ctx) => {
            const player = G.players[ctx.currentPlayer];
            if (player.performingScoutAndShow && player.hasPerformedScoutInScoutAndShow) {
                player.hasUsedScoutAndShow = true;
                player.performingScoutAndShow = false;
                player.hasPerformedScoutInScoutAndShow = false;
                ctx.events.endTurn();
            } else {
                return INVALID_MOVE;
            }
        }
      }
    },

    scoring: {
      moves: {
        nextRound: (G, ctx) => {
            if (G.roundCount < G.totalRounds) {
                ctx.events.endPhase({ next: 'readyCheck' });
            }
        },
        restartGame: (G, ctx) => {
            G.roundCount = 0;
            G.players.forEach((p) => p.score = 0);
            ctx.events.endPhase({ next: 'readyCheck' });
        }
      }
    }
  }
};

function createDeck(playerCount) {
  let deck = [];
  let id = 1;
  for (let i = 1; i <= 9; i++) {
    for (let j = i + 1; j <= 10; j++) {
      deck.push({ id: id++, top: i, bottom: j });
    }
  }
  if (playerCount === 3) deck = deck.filter(c => c.top !== 10 && c.bottom !== 10);
  else if (playerCount === 2 || playerCount === 4) {
    deck = deck.filter(c => !(c.top === 9 && c.bottom === 10) && !(c.top === 10 && c.bottom === 9));
  }
  deck = _.shuffle(deck);
  return deck.map(card => {
    if (Math.random() > 0.5) return { ...card, top: card.bottom, bottom: card.top };
    return card;
  });
}

function getSetInfo(cards) {
  if (cards.length === 0) return null;
  const values = cards.map(c => c.top);
  if (cards.length === 1) return { type: 'single', value: values[0], length: 1 };
  const isGroup = values.every(v => v === values[0]);
  if (isGroup) return { type: 'group', value: values[0], length: cards.length };
  let isAscending = true, isDescending = true;
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] + 1) isAscending = false;
    if (values[i] !== values[i - 1] - 1) isDescending = false;
  }
  if (isAscending || isDescending) return { type: 'run', value: Math.min(...values), length: cards.length };
  return null;
}

function isStronger(newSet, oldSet) {
  if (!oldSet) return true;
  const newInfo = getSetInfo(newSet);
  const oldInfo = getSetInfo(oldSet);
  if (!newInfo || !oldInfo) return false;
  if (newInfo.length > oldInfo.length) return true;
  if (newInfo.length < oldInfo.length) return false;
  if (newInfo.type === 'group' && oldInfo.type === 'run') return true;
  if (newInfo.type === 'run' && oldInfo.type === 'group') return false;
  return newInfo.value > oldInfo.value;
}

function checkEndCondition(G, ctx) {
  const currentPlayer = G.players[ctx.currentPlayer];
  if (currentPlayer.hand.length === 0) {
    G.endReason = 'EMPTY_HAND';
    G.winnerId = ctx.currentPlayer;
    return true;
  }
  if (ctx.numPlayers > 2) {
    if (G.activeSet && G.consecutiveScouts === ctx.numPlayers - 1) {
      G.endReason = 'ROUND_ROBIN';
      G.winnerId = G.activeSet.ownerId;
      return true;
    }
  } else {
    const otherPlayerIdx = (ctx.playOrderPos + 1) % 2;
    const otherPlayer = G.players[otherPlayerIdx];
    const hasChips = otherPlayer.scoutChips > 0;
    const canPerformShow = canShow(otherPlayer, G.activeSet);
    if (!hasChips && !canPerformShow && G.activeSet && G.activeSet.ownerId !== otherPlayer.id) {
        G.endReason = 'ROUND_ROBIN';
        G.winnerId = G.activeSet.ownerId;
        return true;
    }
  }
  return false;
}

function canShow(player, activeSet) {
  if (!activeSet) return true;
  for (let start = 0; start < player.hand.length; start++) {
    for (let end = start; end < player.hand.length; end++) {
      if (isStronger(player.hand.slice(start, end + 1), activeSet.cards)) return true;
    }
  }
  return false;
}

function calculateScores(G, ctx) {
  G.players.forEach((player, idx) => {
    let finalScore = player.collectedCards.length + player.scoutChips;
    if (!(G.endReason === 'ROUND_ROBIN' && idx.toString() === G.winnerId) &&
        !(G.endReason === 'EMPTY_HAND' && idx.toString() === G.winnerId)) {
      finalScore -= player.hand.length;
    }
    player.finalScore = finalScore;
    player.score += finalScore;
  });
}

module.exports = { ScoutGame };
