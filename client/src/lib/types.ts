export interface Card {
  id: number;
  top: number;
  bottom: number;
  isFlipped: boolean;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  score: number;
  scoutChips: number;
  collectedCards: Card[];
  hasUsedScoutAndShow: boolean;
  ready: boolean;
  performingScoutAndShow?: boolean;
  hasPerformedScoutInScoutAndShow?: boolean;
  finalScore?: number;
}

export type GamePhase = 'WAITING' | 'READY_CHECK' | 'PLAYING' | 'SCORING';

export interface Room {
  id: string;
  players: Player[];
  activeSet: { cards: Card[]; ownerId: string } | null;
  gameStarted: boolean;
  phase: GamePhase;
  currentTurn: number;
}
