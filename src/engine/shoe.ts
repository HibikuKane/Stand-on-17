import { RANKS, SUITS, type Card } from './cards';

export type Rng = () => number;

/** 카드 공급원. 테스트에서는 순서를 고정한 구현으로 교체한다. */
export interface CardSource {
  draw(): Card;
  /** 라운드 시작 전에 리셔플이 필요한지 */
  needsReshuffle(): boolean;
  reshuffle(): void;
  readonly remaining: number;
  readonly total: number;
}

export function buildDecks(decks: number): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) cards.push({ rank, suit });
    }
  }
  return cards;
}

export function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function cryptoRng(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 0x1_0000_0000;
}

export class Shoe implements CardSource {
  private cards: Card[] = [];
  readonly total: number;

  /**
   * @param decks 덱 수
   * @param penetration 이 비율만큼 소진되면 다음 라운드 전에 리셔플 (컷 카드)
   */
  constructor(
    readonly decks: number,
    private readonly penetration = 0.75,
    private readonly rng: Rng = cryptoRng,
  ) {
    this.total = decks * 52;
    this.reshuffle();
  }

  get remaining(): number {
    return this.cards.length;
  }

  reshuffle(): void {
    this.cards = shuffle(buildDecks(this.decks), this.rng);
  }

  needsReshuffle(): boolean {
    return this.cards.length <= this.total * (1 - this.penetration);
  }

  draw(): Card {
    // 라운드 도중 바닥나는 극단적인 경우(1덱 + 스플릿 연발) 대비
    if (this.cards.length === 0) this.reshuffle();
    return this.cards.pop()!;
  }
}
