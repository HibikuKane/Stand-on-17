import { describe, expect, it } from 'vitest';
import { handValue, type Card, type Rank } from '../src/engine/cards';
import { Game } from '../src/engine/game';
import { DEFAULT_RULES, type Rules } from '../src/engine/rules';
import { Shoe, type CardSource } from '../src/engine/shoe';

/** 지정한 순서대로 카드를 내주는 슈. 딜 순서: 플1, 딜업, 플2, 딜홀, 이후 순서대로. */
class StackedShoe implements CardSource {
  private i = 0;
  readonly total: number;
  constructor(private readonly cards: Card[]) {
    this.total = cards.length;
  }
  get remaining() {
    return this.cards.length - this.i;
  }
  draw(): Card {
    if (this.i >= this.cards.length) throw new Error('stacked shoe exhausted');
    return this.cards[this.i++];
  }
  needsReshuffle() {
    return false;
  }
  reshuffle() {}
}

const c = (...ranks: Rank[]): Card[] => ranks.map((rank) => ({ rank, suit: '♠' }));

function game(cards: Rank[], rules: Partial<Rules> = {}, bankroll = 1000) {
  return new Game({ ...DEFAULT_RULES, ...rules }, new StackedShoe(c(...cards)), bankroll);
}

describe('handValue', () => {
  it('A는 버스트가 안 나면 11 (소프트)', () => {
    expect(handValue(c('A', '6'))).toEqual({ total: 17, soft: true });
    expect(handValue(c('A', '6', '10'))).toEqual({ total: 17, soft: false });
    expect(handValue(c('A', 'A', '9'))).toEqual({ total: 21, soft: true });
    expect(handValue(c('10', '6'))).toEqual({ total: 16, soft: false });
  });
});

describe('기본 진행', () => {
  it('높은 쪽이 이긴다 (1:1)', () => {
    // 플: 10,9=19  딜: 10,8=18
    const g = game(['10', '10', '9', '8']);
    g.deal(100);
    g.stand();
    expect(g.phase).toBe('settled');
    expect(g.hands[0].outcome).toBe('win');
    expect(g.bankroll).toBe(1100);
  });

  it('플레이어 버스트면 딜러는 카드를 안 받고 패배', () => {
    // 플: 10,6 → +K 버스트, 딜: 10,6
    const g = game(['10', '10', '6', '6', 'K']);
    g.deal(100);
    g.hit();
    expect(g.hands[0].outcome).toBe('bust');
    expect(g.dealer).toHaveLength(2);
    expect(g.bankroll).toBe(900);
  });

  it('21이 되면 자동 스탠드', () => {
    const g = game(['5', '10', '6', '7', 'K']);
    g.deal(100);
    g.hit();
    expect(g.phase).toBe('settled');
    expect(g.hands[0].outcome).toBe('win');
  });
});

describe('블랙잭 배당', () => {
  it('3:2 → 100 베팅에 150 이익', () => {
    const g = game(['A', '9', 'K', '8']);
    g.deal(100);
    expect(g.phase).toBe('settled');
    expect(g.hands[0].outcome).toBe('blackjack');
    expect(g.bankroll).toBe(1150);
  });

  it('6:5 → 100 베팅에 120 이익', () => {
    const g = game(['A', '9', 'K', '8'], { blackjackPayout: 1.2 });
    g.deal(100);
    expect(g.bankroll).toBe(1120);
  });

  it('양쪽 다 블랙잭이면 푸시', () => {
    const g = game(['A', 'K', 'Q', 'A']);
    g.deal(100);
    expect(g.phase).toBe('settled');
    expect(g.hands[0].outcome).toBe('push');
    expect(g.bankroll).toBe(1000);
  });

  it('딜러 10 업카드 피크로 블랙잭 확인 → 즉시 패배', () => {
    const g = game(['9', 'K', '9', 'A']);
    g.deal(100);
    expect(g.phase).toBe('settled');
    expect(g.summary!.dealerBlackjack).toBe(true);
    expect(g.bankroll).toBe(900);
  });
});

describe('딜러 소프트 17', () => {
  // 플: 10,8=18  딜: A,6 = 소프트 17, 다음 카드 4
  const cards: Rank[] = ['10', 'A', '8', '6', '4'];

  it('S17: 소프트 17에서 스탠드 → 18이 이긴다', () => {
    const g = game(cards, { dealerHitsSoft17: false });
    g.deal(100);
    g.resolveInsurance(false);
    g.stand();
    expect(g.dealer).toHaveLength(2);
    expect(g.hands[0].outcome).toBe('win');
  });

  it('H17: 소프트 17에서 히트 → A,6,4 = 21로 딜러 승', () => {
    const g = game(cards, { dealerHitsSoft17: true });
    g.deal(100);
    g.resolveInsurance(false);
    g.stand();
    expect(g.dealer).toHaveLength(3);
    expect(g.hands[0].outcome).toBe('lose');
  });

  it('하드 17은 어느 룰이든 스탠드', () => {
    const g = game(['10', '10', '8', '7', '4'], { dealerHitsSoft17: true });
    g.deal(100);
    g.stand();
    expect(g.dealer).toHaveLength(2);
  });
});

describe('더블 다운', () => {
  it('베팅 2배, 카드 한 장만 받고 종료', () => {
    // 플: 6,5=11 +10=21, 딜: 10,8
    const g = game(['6', '10', '5', '8', '10']);
    g.deal(100);
    g.double();
    expect(g.hands[0].bet).toBe(200);
    expect(g.hands[0].cards).toHaveLength(3);
    expect(g.hands[0].outcome).toBe('win');
    expect(g.bankroll).toBe(1200);
  });

  it('잔액이 부족하면 불가', () => {
    const g = game(['6', '10', '5', '8'], {}, 150);
    g.deal(100);
    expect(g.availableActions().double).toBe(false);
  });
});

describe('스플릿', () => {
  it('8,8 스플릿 → 두 핸드 각각 정산', () => {
    // 플: 8,8  딜: 10,7  스플릿 후 첫 핸드 +3 → 11, 더블 +10=21 / 둘째 핸드 +9=17
    const g = game(['8', '10', '8', '7', '3', '10', '9']);
    g.deal(100);
    expect(g.availableActions().split).toBe(true);
    g.split();
    expect(g.hands).toHaveLength(2);
    expect(g.hands[0].cards.map((x) => x.rank)).toEqual(['8', '3']);
    g.double(); // DAS
    expect(g.hands[1].cards.map((x) => x.rank)).toEqual(['8', '9']);
    g.stand();
    expect(g.hands.map((h) => h.outcome)).toEqual(['win', 'push']);
    // 베팅 총 300 → 첫 핸드 400 + 둘째 100 반환
    expect(g.bankroll).toBe(1200);
  });

  it('스플릿 후 A+10은 블랙잭이 아닌 21 (1:1)', () => {
    // 플: A,A  딜: 10,8  → A+K=21, A+7=18
    const g = game(['A', '10', 'A', '8', 'K', '7']);
    g.deal(100);
    g.split();
    // A 스플릿은 한 장씩만 받고 자동 종료
    expect(g.phase).toBe('settled');
    expect(g.hands.map((h) => h.outcome)).toEqual(['win', 'push']);
    expect(g.bankroll).toBe(1100);
  });

  it('DAS 꺼져 있으면 스플릿 후 더블 불가', () => {
    const g = game(['8', '10', '8', '7', '3', '9'], { doubleAfterSplit: false });
    g.deal(100);
    g.split();
    expect(g.availableActions().double).toBe(false);
  });

  it('최대 핸드 수 제한', () => {
    const g = game(['8', '10', '8', '7', '8', '8', '8'], { maxHands: 2 });
    g.deal(100);
    g.split();
    expect(g.hands).toHaveLength(2);
    expect(g.availableActions().split).toBe(false);
  });
});

describe('보험', () => {
  it('딜러 A 업카드면 보험 단계', () => {
    const g = game(['10', 'A', '9', '7']);
    g.deal(100);
    expect(g.phase).toBe('insurance');
  });

  it('보험 들고 딜러 블랙잭 → 보험 2:1로 본전', () => {
    const g = game(['10', 'A', '9', 'K']);
    g.deal(100);
    g.resolveInsurance(true);
    expect(g.phase).toBe('settled');
    expect(g.summary!.insurance).toEqual({ bet: 50, won: true });
    expect(g.summary!.net).toBe(0);
    expect(g.bankroll).toBe(1000);
  });

  it('보험 들었는데 딜러 블랙잭 아님 → 보험금 잃고 게임 계속', () => {
    const g = game(['10', 'A', '9', '7']);
    g.deal(100);
    g.resolveInsurance(true);
    expect(g.phase).toBe('player');
    g.stand(); // 19 vs 18
    expect(g.summary!.net).toBe(50);
    expect(g.bankroll).toBe(1050);
  });

  it('이븐 머니: 블랙잭 + 보험 → 딜러 블랙잭이어도 1:1 확정', () => {
    const g = game(['A', 'A', 'K', 'Q']);
    g.deal(100);
    g.resolveInsurance(true);
    expect(g.summary!.net).toBe(100);
  });
});

describe('서렌더', () => {
  it('베팅 절반 회수', () => {
    const g = game(['10', '10', '6', '9']);
    g.deal(100);
    g.surrender();
    expect(g.hands[0].outcome).toBe('surrender');
    expect(g.bankroll).toBe(950);
  });

  it('룰에서 끄면 불가, 히트 후에도 불가', () => {
    expect(
      (() => {
        const g = game(['10', '10', '6', '9'], { allowSurrender: false });
        g.deal(100);
        return g.availableActions().surrender;
      })(),
    ).toBe(false);

    const g = game(['5', '10', '3', '9', '2']);
    g.deal(100);
    g.hit();
    expect(g.availableActions().surrender).toBe(false);
  });
});

describe('Shoe', () => {
  it('덱 수 × 52장, 컷 카드 이후 리셔플 요구', () => {
    const shoe = new Shoe(2, 0.5, () => 0.42);
    expect(shoe.remaining).toBe(104);
    for (let i = 0; i < 51; i++) shoe.draw();
    expect(shoe.needsReshuffle()).toBe(false);
    shoe.draw();
    expect(shoe.needsReshuffle()).toBe(true);
    shoe.reshuffle();
    expect(shoe.remaining).toBe(104);
  });
});
