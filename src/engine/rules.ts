export interface Rules {
  /** 슈에 들어가는 덱 수 */
  decks: number;
  /** true = H17 (딜러가 소프트 17에서 히트), false = S17 (모든 17에서 스탠드) */
  dealerHitsSoft17: boolean;
  /** 블랙잭 배당. 1.5 = 3:2, 1.2 = 6:5 */
  blackjackPayout: number;
  /** 레이트 서렌더 (딜러 피크 후, 첫 두 장일 때만) */
  allowSurrender: boolean;
  /** 스플릿 후 더블 다운 허용 (DAS) */
  doubleAfterSplit: boolean;
  /** 스플릿으로 만들 수 있는 최대 핸드 수 */
  maxHands: number;
}

export const DEFAULT_RULES: Rules = {
  decks: 6,
  dealerHitsSoft17: false,
  blackjackPayout: 1.5,
  allowSurrender: true,
  doubleAfterSplit: true,
  maxHands: 4,
};
