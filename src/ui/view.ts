import { handValue, isRed, type Card } from '../engine/cards';
import type { Game, Outcome, PlayerHand } from '../engine/game';

export const CHIPS = [10, 50, 100, 500] as const;

const OUTCOME_LABEL: Record<Outcome, string> = {
  blackjack: '블랙잭!',
  evenmoney: '이븐 머니',
  win: '승리',
  push: '푸시',
  lose: '패배',
  bust: '버스트',
  surrender: '서렌더',
};

export function money(n: number): string {
  return n.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
}

function signed(n: number): string {
  return n > 0 ? `+${money(n)}` : n < 0 ? `−${money(-n)}` : '±0';
}

/**
 * 연출 타이밍(ms). CSS 애니메이션 길이와 맞춰 둔다 (style.css의 .deal / .flip).
 * 플레이어 카드는 기존(0.28s, 간격 140ms)보다 약 18% 느리게,
 * 딜러 홀 카드 공개와 추가 카드는 긴장감이 생기도록 충분히 느리게.
 */
export const TIMING = {
  /** 한 번에 여러 장 나올 때 카드 사이 간격 */
  dealStagger: 165,
  /** 마지막 플레이어 액션 후 홀 카드를 뒤집기 시작할 때까지 */
  beforeFlip: 550,
  /** 첫 딜 직후 바로 정산되는 라운드(블랙잭 등): 4장이 다 깔린 뒤 뒤집기 */
  beforeFlipAfterDeal: 1000,
  /** 홀 카드 뒤집기 (CSS .flip 길이와 같게) */
  flip: 950,
  /** 뒤집은 뒤 다음 카드까지 숨 고르기 */
  afterFlip: 450,
  /** 딜러 추가 카드 1장당 간격 */
  dealerDraw: 800,
  /** 마지막 딜러 카드 후 결과 표시까지 */
  beforeResult: 400,
} as const;

/** 직전 렌더에서 각 영역에 몇 장 있었는지 → 새로 나온 카드에만 딜 애니메이션 */
const seen = new Map<string, number>();

/**
 * @param hideHole 두 번째 카드(홀 카드)를 뒷면으로
 * @param flipHole 두 번째 카드를 뒤집는 애니메이션과 함께 앞면으로
 */
function cardsHtml(key: string, cards: readonly Card[], hideHole: boolean, flipHole = false): string {
  const before = seen.get(key) ?? 0;
  seen.set(key, cards.length);
  let newIdx = 0;
  return cards
    .map((card, i) => {
      const isNew = i >= before;
      const anim = isNew ? ` deal" style="animation-delay:${newIdx++ * TIMING.dealStagger}ms` : '';
      if (hideHole && i === 1) return `<div class="card back${anim}"></div>`;
      const color = isRed(card) ? 'red' : 'black';
      const flip = flipHole && i === 1 && !isNew ? ' flip' : '';
      return `<div class="card ${color}${flip}${anim}">
        <span class="corner">${card.rank}<br>${card.suit}</span>
        <span class="pip">${card.suit}</span>
      </div>`;
    })
    .join('');
}

/** 화면이 바뀔 때(새 라운드 등) 애니메이션 기준 초기화 */
export function resetSeen(): void {
  seen.clear();
}

function totalLabel(cards: readonly Card[], final: boolean): string {
  if (cards.length === 0) return '';
  const { total, soft } = handValue(cards);
  if (soft && !final && total < 21) return `${total - 10}/${total}`;
  return String(total);
}

function handHtml(game: Game, hand: PlayerHand, i: number, showTotals: boolean, revealing: boolean): string {
  const active = game.phase === 'player' && game.active === i;
  // 딜러 공개 연출 중에는 결과를 아직 보여주지 않는다
  const settled = game.phase === 'settled' && !revealing;
  const outcome = settled && hand.outcome ? hand.outcome : null;
  const net = outcome ? hand.payout! - hand.bet : 0;
  const badge = outcome
    ? `<span class="badge ${outcome}">${OUTCOME_LABEL[outcome]} ${signed(net)}</span>`
    : '';
  const tags = [hand.doubled ? '더블' : ''].filter(Boolean).join(' ');
  const many = hand.cards.length >= 5 ? 'many' : '';
  return `<div class="hand ${active ? 'active' : ''} ${outcome ? 'o-' + outcome : ''} ${many}">
    <div class="cards">${cardsHtml(`p${i}`, hand.cards, false)}</div>
    <div class="hand-info">
      ${showTotals ? `<span class="total">${totalLabel(hand.cards, hand.done || settled)}</span>` : ''}
      <span class="bet">🪙 ${money(hand.bet)}${tags ? ` · ${tags}` : ''}</span>
    </div>
    ${badge}
  </div>`;
}

/**
 * 딜러 공개 연출 상태. 엔진은 정산까지 한 번에 끝내므로,
 * 화면은 이 상태로 딜러 카드를 한 장씩 보여 준 뒤 결과를 띄운다.
 */
export interface Reveal {
  /** 지금까지 보여 준 딜러 카드 수 */
  dealerShown: number;
  /** 홀 카드를 앞면으로 보여 주는지 */
  holeOpen: boolean;
  /** 이번 렌더에서 홀 카드 뒤집기 애니메이션을 재생할지 */
  flipNow: boolean;
  /** 정산 전 잔액 (연출이 끝날 때까지 헤더에 표시) */
  bankroll: number;
}

export interface ViewState {
  game: Game;
  bet: number;
  showTotals: boolean;
  toast: string;
  reveal: Reveal | null;
}

/** 정산 직전(베팅·더블·스플릿·보험이 빠진 뒤, 반환 전)의 잔액 */
export function bankrollBeforePayout(game: Game): number {
  if (!game.summary) return game.bankroll;
  const stake = game.hands.reduce((sum, h) => sum + h.bet, 0) + game.insuranceBet;
  return game.bankroll - (game.summary.net + stake);
}

export function renderTable(s: ViewState): string {
  const { game, showTotals, reveal } = s;
  const dealer = reveal ? game.dealer.slice(0, reveal.dealerShown) : game.dealer;
  const holeOpen = reveal ? reveal.holeOpen : game.holeRevealed;
  const hideHole = !holeOpen && dealer.length > 1;
  const dealerFinal = game.holeRevealed && !reveal;
  // 뒤집는 도중에는 합계를 갱신하지 않는다 (애니메이션이 끝난 뒤 다음 렌더에서 반영)
  const dealerCards = hideHole || reveal?.flipNow ? dealer.slice(0, 1) : dealer;
  const dealerTotal = showTotals && dealer.length ? totalLabel(dealerCards, dealerFinal) : '';

  const hands = game.hands.map((h, i) => handHtml(game, h, i, showTotals, !!reveal)).join('');
  const empty = game.hands.length === 0;

  return `
    <section class="dealer">
      <div class="label">딜러 ${dealerTotal ? `<span class="total">${dealerTotal}</span>` : ''}</div>
      <div class="cards">${cardsHtml('d', dealer, hideHole, !!reveal?.flipNow)}</div>
    </section>
    <div class="message">${messageText(s)}</div>
    <section class="player ${game.hands.length > 1 ? 'multi' : ''}">
      ${empty ? '<div class="placeholder">칩을 눌러 베팅하고 딜!</div>' : hands}
    </section>`;
}

function messageText({ game, toast, reveal }: ViewState): string {
  if (toast) return `<span class="toast">${toast}</span>`;
  if (reveal) return '<span class="dealer-turn">딜러 차례</span>';
  if (game.phase === 'insurance') {
    return game.evenMoneyOffered ? '딜러 A — 이븐 머니(1:1 확정) 받을까요?' : '딜러 A — 보험 들까요?';
  }
  if (game.phase === 'settled' && game.summary) {
    const { net, insurance, dealerBlackjack } = game.summary;
    const parts: string[] = [];
    if (dealerBlackjack) parts.push('딜러 블랙잭');
    if (insurance) parts.push(insurance.won ? `보험 적중 +${money(insurance.bet * 2)}` : '보험 실패');
    parts.push(`이번 판 ${signed(net)}`);
    return `<span class="${net > 0 ? 'up' : net < 0 ? 'down' : ''}">${parts.join(' · ')}</span>`;
  }
  if (game.phase === 'player' && game.hands.length > 1) {
    return `핸드 ${game.active + 1} / ${game.hands.length}`;
  }
  return '';
}

export function renderControls(s: ViewState): string {
  const { game, bet } = s;

  // 딜러 공개 연출 중: 조작 없음. 높이는 플레이어 조작부와 같게 유지
  if (s.reveal) return '<div class="actions waiting"></div>';

  if (game.phase === 'insurance') {
    const yes = game.evenMoneyOffered
      ? `<button data-act="even-money">이븐 머니 (+${money(game.hands[0].bet)})</button>`
      : `<button data-act="insurance-yes" ${game.canAffordInsurance() ? '' : 'disabled'}>보험 (${money(game.insuranceCost)})</button>`;
    return `<div class="actions two">
      ${yes}
      <button data-act="insurance-no" class="secondary">안 함</button>
    </div>`;
  }

  if (game.phase === 'player') {
    const a = game.availableActions();
    // 더블·스플릿·서렌더는 지금 할 수 있을 때만 보여 준다
    const extra = [
      a.double ? '<button data-act="double">더블</button>' : '',
      a.split ? '<button data-act="split">스플릿</button>' : '',
      a.surrender ? '<button data-act="surrender" class="secondary">서렌더</button>' : '',
    ].join('');
    return `<div class="actions">
      ${extra ? `<div class="extra">${extra}</div>` : ''}
      <div class="main">
        <button data-act="hit" class="primary" ${a.hit ? '' : 'disabled'}>히트</button>
        <button data-act="stand" class="primary" ${a.stand ? '' : 'disabled'}>스탠드</button>
      </div>
    </div>`;
  }

  // betting / settled
  if (game.bankroll < CHIPS[0]) {
    return `<div class="broke">
      <p>칩이 다 떨어졌어요 💸</p>
      <button data-act="reset" class="primary">1,000으로 다시 시작</button>
    </div>`;
  }

  const chips = CHIPS.map(
    (v) =>
      `<button class="chip c${v}" data-chip="${v}" ${bet + v > game.bankroll ? 'disabled' : ''}>${v}</button>`,
  ).join('');
  return `<div class="betting">
    <div class="bet-row">
      <span class="bet-amount">베팅 <b>${money(bet)}</b></span>
      <button data-act="clear" class="ghost" ${bet ? '' : 'disabled'}>지우기</button>
      <button data-act="max" class="ghost">올인</button>
    </div>
    <div class="chips">${chips}</div>
    <button data-act="deal" class="primary deal" ${bet > 0 && bet <= game.bankroll ? '' : 'disabled'}>딜</button>
  </div>`;
}
