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

/** 직전 렌더에서 각 영역에 몇 장 있었는지 → 새로 나온 카드에만 딜 애니메이션 */
const seen = new Map<string, number>();

function cardsHtml(key: string, cards: readonly Card[], hideHole: boolean): string {
  const before = seen.get(key) ?? 0;
  seen.set(key, cards.length);
  let newIdx = 0;
  return cards
    .map((card, i) => {
      const isNew = i >= before;
      const anim = isNew ? ` deal" style="animation-delay:${newIdx++ * 140}ms` : '';
      if (hideHole && i === 1) return `<div class="card back${anim}"></div>`;
      const color = isRed(card) ? 'red' : 'black';
      return `<div class="card ${color}${anim}">
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

function handHtml(game: Game, hand: PlayerHand, i: number, showTotals: boolean): string {
  const active = game.phase === 'player' && game.active === i;
  const settled = game.phase === 'settled';
  const outcome = settled && hand.outcome ? hand.outcome : null;
  const net = outcome ? hand.payout! - hand.bet : 0;
  const badge = outcome
    ? `<span class="badge ${outcome}">${OUTCOME_LABEL[outcome]} ${signed(net)}</span>`
    : '';
  const tags = [hand.doubled ? '더블' : ''].filter(Boolean).join(' ');
  return `<div class="hand ${active ? 'active' : ''} ${outcome ? 'o-' + outcome : ''}">
    <div class="cards">${cardsHtml(`p${i}`, hand.cards, false)}</div>
    <div class="hand-info">
      ${showTotals ? `<span class="total">${totalLabel(hand.cards, hand.done || settled)}</span>` : ''}
      <span class="bet">🪙 ${money(hand.bet)}${tags ? ` · ${tags}` : ''}</span>
    </div>
    ${badge}
  </div>`;
}

export interface ViewState {
  game: Game;
  bet: number;
  showTotals: boolean;
  toast: string;
}

export function renderTable(s: ViewState): string {
  const { game, showTotals } = s;
  const hideHole = !game.holeRevealed && game.dealer.length > 1;
  const dealerCards = hideHole ? game.dealer.slice(0, 1) : game.dealer;
  const dealerTotal =
    showTotals && game.dealer.length ? totalLabel(dealerCards, game.holeRevealed) : '';

  const hands = game.hands.map((h, i) => handHtml(game, h, i, showTotals)).join('');
  const empty = game.hands.length === 0;

  return `
    <section class="dealer">
      <div class="label">딜러 ${dealerTotal ? `<span class="total">${dealerTotal}</span>` : ''}</div>
      <div class="cards">${cardsHtml('d', game.dealer, hideHole)}</div>
    </section>
    <div class="message">${messageText(s)}</div>
    <section class="player ${game.hands.length > 1 ? 'multi' : ''}">
      ${empty ? '<div class="placeholder">칩을 눌러 베팅하고 딜!</div>' : hands}
    </section>`;
}

function messageText({ game, toast }: ViewState): string {
  if (toast) return `<span class="toast">${toast}</span>`;
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
    const btn = (act: keyof typeof a, label: string, cls = '') =>
      `<button data-act="${act}" class="${cls}" ${a[act] ? '' : 'disabled'}>${label}</button>`;
    return `<div class="actions">
      ${btn('hit', '히트', 'primary')}
      ${btn('stand', '스탠드', 'primary')}
      ${btn('double', '더블')}
      ${btn('split', '스플릿')}
      ${game.rules.allowSurrender ? btn('surrender', '서렌더', 'secondary') : ''}
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
