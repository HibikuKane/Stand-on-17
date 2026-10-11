import { describe, expect, it } from 'vitest';
import type { Card, Rank } from '../src/engine/cards';
import { Game } from '../src/engine/game';
import { DEFAULT_RULES } from '../src/engine/rules';
import type { CardSource } from '../src/engine/shoe';
import { bankrollBeforePayout } from '../src/ui/view';

/** 딜 순서: 플1, 딜업, 플2, 딜홀, 이후 순서대로 */
function game(ranks: Rank[], bankroll = 1000): Game {
  const cards: Card[] = ranks.map((rank) => ({ rank, suit: '♠' }));
  let i = 0;
  const shoe: CardSource = {
    total: cards.length,
    get remaining() {
      return cards.length - i;
    },
    draw: () => cards[i++],
    needsReshuffle: () => false,
    reshuffle: () => {},
  };
  return new Game({ ...DEFAULT_RULES }, shoe, bankroll);
}

describe('bankrollBeforePayout (딜러 공개 연출 중 헤더 잔액)', () => {
  it('정산 전에는 현재 잔액 그대로', () => {
    const g = game(['10', '10', '6', '7']);
    g.deal(100);
    expect(bankrollBeforePayout(g)).toBe(900);
  });

  it('더블 후 승리: 더블 금액까지 빠진 잔액', () => {
    // 플: 6,5 → 더블 +10 = 21 / 딜: 10,7
    const g = game(['6', '10', '5', '7', '10']);
    g.deal(100);
    g.double();
    expect(g.bankroll).toBe(1200);
    expect(bankrollBeforePayout(g)).toBe(800);
  });

  it('보험 + 딜러 블랙잭: 보험료까지 빠진 잔액', () => {
    // 플: 10,9 / 딜: A,K (블랙잭)
    const g = game(['10', 'A', '9', 'K']);
    g.deal(100);
    g.resolveInsurance(true);
    expect(g.phase).toBe('settled');
    expect(bankrollBeforePayout(g)).toBe(850);
  });

  it('스플릿 후 정산: 두 핸드 베팅이 모두 빠진 잔액', () => {
    // 플: 8,8 → 스플릿, 각 +10 = 18 / 딜: 10,7
    const g = game(['8', '10', '8', '7', '10', '10']);
    g.deal(100);
    g.split();
    g.stand();
    g.stand();
    expect(g.phase).toBe('settled');
    expect(bankrollBeforePayout(g)).toBe(800);
  });
});
