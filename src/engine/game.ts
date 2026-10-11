import { cardValue, handValue, isBlackjack, isBust, type Card } from './cards';
import type { Rules } from './rules';
import type { CardSource } from './shoe';

export type Phase = 'betting' | 'insurance' | 'player' | 'settled';
export type Outcome = 'blackjack' | 'win' | 'push' | 'lose' | 'bust' | 'surrender';

export interface PlayerHand {
  cards: Card[];
  bet: number;
  doubled: boolean;
  fromSplit: boolean;
  surrendered: boolean;
  done: boolean;
  outcome?: Outcome;
  /** 정산 시 돌려받는 총액 (원금 포함) */
  payout?: number;
}

export interface Actions {
  hit: boolean;
  stand: boolean;
  double: boolean;
  split: boolean;
  surrender: boolean;
}

export interface RoundSummary {
  /** 이번 라운드 순손익 (보험 포함) */
  net: number;
  insurance: { bet: number; won: boolean } | null;
  dealerBlackjack: boolean;
}

const NO_ACTIONS: Actions = { hit: false, stand: false, double: false, split: false, surrender: false };

export class Game {
  phase: Phase = 'betting';
  dealer: Card[] = [];
  hands: PlayerHand[] = [];
  active = 0;
  insuranceBet = 0;
  /** 딜러 홀 카드가 공개되었는지 */
  holeRevealed = false;
  summary: RoundSummary | null = null;
  /** 이번 라운드 시작 시 리셔플이 일어났는지 (UI 알림용) */
  shuffledThisRound = false;

  private roundStake = 0;

  constructor(
    public rules: Rules,
    public shoe: CardSource,
    public bankroll: number,
  ) {}

  get activeHand(): PlayerHand | undefined {
    return this.phase === 'player' ? this.hands[this.active] : undefined;
  }

  get dealerUpcard(): Card | undefined {
    return this.dealer[0];
  }

  /** 베팅하고 카드를 나눈다 */
  deal(bet: number): void {
    if (this.phase !== 'betting' && this.phase !== 'settled') throw new Error('라운드 진행 중');
    if (!(bet > 0) || bet > this.bankroll) throw new Error('잘못된 베팅 금액');

    this.shuffledThisRound = this.shoe.needsReshuffle();
    if (this.shuffledThisRound) this.shoe.reshuffle();

    this.bankroll -= bet;
    this.roundStake = bet;
    this.insuranceBet = 0;
    this.holeRevealed = false;
    this.summary = null;
    this.active = 0;
    this.hands = [newHand(bet, false)];
    this.dealer = [];

    // 플레이어 → 딜러(업) → 플레이어 → 딜러(홀)
    this.hands[0].cards.push(this.shoe.draw());
    this.dealer.push(this.shoe.draw());
    this.hands[0].cards.push(this.shoe.draw());
    this.dealer.push(this.shoe.draw());

    if (this.dealer[0].rank === 'A') {
      this.phase = 'insurance';
    } else {
      this.peek();
    }
  }

  /** 보험 비용 = 베팅의 절반 */
  get insuranceCost(): number {
    return this.hands[0] ? this.hands[0].bet / 2 : 0;
  }

  canAffordInsurance(): boolean {
    return this.bankroll >= this.insuranceCost;
  }

  resolveInsurance(take: boolean): void {
    if (this.phase !== 'insurance') throw new Error('보험 단계가 아님');
    if (take) {
      if (!this.canAffordInsurance()) throw new Error('잔액 부족');
      this.insuranceBet = this.insuranceCost;
      this.bankroll -= this.insuranceBet;
      this.roundStake += this.insuranceBet;
    }
    this.peek();
  }

  /** 딜러 업카드가 A 또는 10일 때 홀 카드로 블랙잭 확인 (미국식 피크) */
  private peek(): void {
    const up = cardValue(this.dealer[0]);
    const dealerBJ = (up === 1 || up === 10) && isBlackjack(this.dealer);
    if (dealerBJ || isBlackjack(this.hands[0].cards)) {
      this.hands[0].done = true;
      this.finishRound();
      return;
    }
    this.phase = 'player';
    this.autoAdvance();
  }

  availableActions(): Actions {
    const hand = this.activeHand;
    if (!hand || hand.done) return NO_ACTIONS;
    const twoCards = hand.cards.length === 2;
    const canAfford = this.bankroll >= hand.bet;
    return {
      hit: true,
      stand: true,
      double: twoCards && canAfford && (!hand.fromSplit || this.rules.doubleAfterSplit),
      split:
        twoCards &&
        canAfford &&
        this.hands.length < this.rules.maxHands &&
        cardValue(hand.cards[0]) === cardValue(hand.cards[1]),
      surrender: this.rules.allowSurrender && twoCards && this.hands.length === 1 && !hand.fromSplit,
    };
  }

  hit(): void {
    const hand = this.requireAction('hit');
    hand.cards.push(this.shoe.draw());
    if (handValue(hand.cards).total >= 21) hand.done = true;
    this.autoAdvance();
  }

  stand(): void {
    this.requireAction('stand').done = true;
    this.autoAdvance();
  }

  double(): void {
    const hand = this.requireAction('double');
    this.bankroll -= hand.bet;
    this.roundStake += hand.bet;
    hand.bet *= 2;
    hand.doubled = true;
    hand.cards.push(this.shoe.draw());
    hand.done = true;
    this.autoAdvance();
  }

  split(): void {
    const hand = this.requireAction('split');
    this.bankroll -= hand.bet;
    this.roundStake += hand.bet;
    const second = newHand(hand.bet, true);
    second.cards.push(hand.cards.pop()!);
    hand.fromSplit = true;
    this.hands.splice(this.active + 1, 0, second);
    this.dealSecondCard(hand);
    this.autoAdvance();
  }

  surrender(): void {
    const hand = this.requireAction('surrender');
    hand.surrendered = true;
    hand.done = true;
    this.autoAdvance();
  }

  private requireAction(action: keyof Actions): PlayerHand {
    if (!this.availableActions()[action]) throw new Error(`${action} 불가`);
    return this.hands[this.active];
  }

  /** 스플릿된 핸드에 두 번째 카드를 준다. A 스플릿은 한 장만 받고 종료. */
  private dealSecondCard(hand: PlayerHand): void {
    hand.cards.push(this.shoe.draw());
    if (hand.cards[0].rank === 'A' || handValue(hand.cards).total === 21) hand.done = true;
  }

  /** 끝난 핸드는 건너뛰고, 모든 핸드가 끝나면 딜러 차례로 */
  private autoAdvance(): void {
    while (this.active < this.hands.length) {
      const hand = this.hands[this.active];
      if (hand.cards.length === 1) this.dealSecondCard(hand);
      if (!hand.done && handValue(hand.cards).total === 21) hand.done = true;
      if (!hand.done) return;
      this.active++;
    }
    this.finishRound();
  }

  private dealerPlays(): boolean {
    // 모든 핸드가 버스트/서렌더면 딜러는 카드를 더 받지 않는다
    return this.hands.some((h) => !h.surrendered && !isBust(h.cards));
  }

  private finishRound(): void {
    this.holeRevealed = true;
    const dealerBJ = isBlackjack(this.dealer);
    const playerNatural = this.hands.length === 1 && isBlackjack(this.hands[0].cards);

    if (!dealerBJ && !playerNatural && this.dealerPlays()) {
      for (;;) {
        const { total, soft } = handValue(this.dealer);
        if (total > 17 || (total === 17 && !(soft && this.rules.dealerHitsSoft17))) break;
        this.dealer.push(this.shoe.draw());
      }
    }

    const dealerTotal = handValue(this.dealer).total;
    let returned = 0;
    for (const hand of this.hands) {
      settleHand(hand, dealerTotal, dealerBJ, this.rules.blackjackPayout);
      returned += hand.payout!;
    }

    let insurance: RoundSummary['insurance'] = null;
    if (this.insuranceBet > 0) {
      // 보험은 2:1 → 원금 포함 3배
      const won = dealerBJ;
      if (won) returned += this.insuranceBet * 3;
      insurance = { bet: this.insuranceBet, won };
    }

    this.bankroll += returned;
    this.summary = { net: returned - this.roundStake, insurance, dealerBlackjack: dealerBJ };
    this.phase = 'settled';
  }
}

function newHand(bet: number, fromSplit: boolean): PlayerHand {
  return { cards: [], bet, doubled: false, fromSplit, surrendered: false, done: false };
}

function settleHand(hand: PlayerHand, dealerTotal: number, dealerBJ: boolean, bjPayout: number): void {
  const natural = !hand.fromSplit && isBlackjack(hand.cards);
  const total = handValue(hand.cards).total;
  let outcome: Outcome;
  let payout: number;

  if (hand.surrendered) {
    outcome = 'surrender';
    payout = hand.bet / 2;
  } else if (total > 21) {
    outcome = 'bust';
    payout = 0;
  } else if (dealerBJ) {
    outcome = natural ? 'push' : 'lose';
    payout = natural ? hand.bet : 0;
  } else if (natural) {
    outcome = 'blackjack';
    payout = hand.bet + hand.bet * bjPayout;
  } else if (dealerTotal > 21 || total > dealerTotal) {
    outcome = 'win';
    payout = hand.bet * 2;
  } else if (total === dealerTotal) {
    outcome = 'push';
    payout = hand.bet;
  } else {
    outcome = 'lose';
    payout = 0;
  }

  hand.outcome = outcome;
  hand.payout = payout;
}
