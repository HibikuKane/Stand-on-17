import { describe, expect, it } from 'vitest';
import type { Card, Rank } from '../src/engine/cards';
import { Game } from '../src/engine/game';
import { DEFAULT_RULES } from '../src/engine/rules';
import type { CardSource } from '../src/engine/shoe';
import { bankrollBeforePayout, renderTable, resetSeen, withoutAnim, type ViewState } from '../src/ui/view';

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

describe('영역별 렌더 (연출 중 재렌더가 애니메이션을 끊지 않게)', () => {
  // 플: A,K 블랙잭 → 딜 직후 정산 / 딜: 10,8
  function revealing(): ViewState {
    resetSeen();
    const g = game(['A', '10', 'K', '8']);
    g.deal(100);
    return {
      game: g,
      bet: 100,
      showTotals: true,
      toast: '',
      reveal: { dealerShown: 2, holeOpen: false, flipNow: false, bankroll: 900 },
    };
  }

  it('뒤집는 도중 토스트만 바뀌면 딜러·플레이어 영역은 같은 내용으로 본다', () => {
    const s = revealing();
    renderTable(s);
    s.reveal = { ...s.reveal!, holeOpen: true, flipNow: true };
    const flipping = renderTable({ ...s, toast: '🔀 슈를 섞었습니다' });
    expect(flipping.dealerCards).toContain(' flip');
    const toastGone = renderTable(s);
    expect(withoutAnim(toastGone.dealerCards)).toBe(withoutAnim(flipping.dealerCards));
    expect(withoutAnim(toastGone.player)).toBe(withoutAnim(flipping.player));
    expect(toastGone.message).not.toBe(flipping.message);
  });

  it('홀 카드 공개·합계 갱신처럼 내용이 바뀌면 다른 내용으로 본다', () => {
    const s = revealing();
    const hidden = renderTable(s);
    s.reveal = { ...s.reveal!, holeOpen: true, flipNow: true };
    const flipping = renderTable(s);
    expect(withoutAnim(flipping.dealerCards)).not.toBe(withoutAnim(hidden.dealerCards));
    s.reveal = { ...s.reveal!, flipNow: false };
    const flipped = renderTable(s);
    // 뒤집기 후 합계가 10 → 18로 갱신. 카드 영역은 그대로
    expect(flipped.dealerLabel).not.toBe(flipping.dealerLabel);
    expect(flipped.dealerLabel).toContain('>18<');
    expect(withoutAnim(flipped.dealerCards)).toBe(withoutAnim(flipping.dealerCards));
  });

  it('뒤집는 도중 합계 표시를 끄면 라벨만 바뀌고 딜러 카드 영역은 같은 내용으로 본다', () => {
    const s = revealing();
    renderTable(s);
    s.reveal = { ...s.reveal!, holeOpen: true, flipNow: true };
    const flipping = renderTable(s);
    const totalsOff = renderTable({ ...s, showTotals: false });
    expect(totalsOff.dealerLabel).not.toBe(flipping.dealerLabel);
    expect(withoutAnim(totalsOff.dealerCards)).toBe(withoutAnim(flipping.dealerCards));
  });
});
