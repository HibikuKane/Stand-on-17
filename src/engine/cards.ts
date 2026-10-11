export const SUITS = ['♠', '♥', '♦', '♣'] as const;
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];

export interface Card {
  rank: Rank;
  suit: Suit;
}

/** A는 1로 계산 (소프트 처리는 handValue에서) */
export function cardValue(card: Card): number {
  if (card.rank === 'A') return 1;
  if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return 10;
  return Number(card.rank);
}

export function isRed(card: Card): boolean {
  return card.suit === '♥' || card.suit === '♦';
}

export interface HandValue {
  total: number;
  /** A 하나를 11로 세고 있는 상태 (= 소프트 핸드) */
  soft: boolean;
}

export function handValue(cards: readonly Card[]): HandValue {
  let total = 0;
  let hasAce = false;
  for (const c of cards) {
    total += cardValue(c);
    if (c.rank === 'A') hasAce = true;
  }
  // A 하나를 11로 올려도 버스트가 아니면 소프트
  if (hasAce && total + 10 <= 21) return { total: total + 10, soft: true };
  return { total, soft: false };
}

/** 처음 두 장으로 21 = 내추럴 블랙잭 */
export function isBlackjack(cards: readonly Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21;
}

export function isBust(cards: readonly Card[]): boolean {
  return handValue(cards).total > 21;
}
