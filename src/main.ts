import './style.css';
import { Game } from './engine/game';
import { Shoe } from './engine/shoe';
import { CHIPS, money, renderControls, renderTable, resetSeen } from './ui/view';
import { load, save, STARTING_BANKROLL, type SaveData } from './ui/storage';
import { settingsHtml } from './ui/settings';

const data: SaveData = load();
let shoe = new Shoe(data.rules.decks);
const game = new Game({ ...data.rules }, shoe, data.bankroll);
let toast = '';
let toastTimer = 0;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header>
    <div class="bankroll">💰 <b id="bankroll"></b></div>
    <div class="shoe" id="shoe" title="슈 잔량"><div class="shoe-bar"><i></i></div><span></span></div>
    <button id="open-settings" class="icon" aria-label="설정">⚙️</button>
  </header>
  <main id="table"></main>
  <footer id="controls"></footer>
  <dialog id="settings"></dialog>`;

const $ = <T extends HTMLElement>(sel: string) => app.querySelector<T>(sel)!;
const settingsDialog = $<HTMLDialogElement>('#settings');

function persist(): void {
  save({ ...data, bankroll: game.bankroll });
}

function showToast(msg: string): void {
  toast = msg;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast = '';
    render();
  }, 1800);
}

function render(): void {
  // 베팅 단계에서 잔액보다 큰 베팅은 잘라낸다
  if ((game.phase === 'betting' || game.phase === 'settled') && data.bet > game.bankroll) {
    data.bet = Math.floor(game.bankroll / CHIPS[0]) * CHIPS[0];
  }
  const view = { game, bet: data.bet, showTotals: data.showTotals, toast };
  $('#bankroll').textContent = money(game.bankroll);
  $('#table').innerHTML = renderTable(view);
  $('#controls').innerHTML = renderControls(view);

  const ratio = shoe.remaining / shoe.total;
  $<HTMLElement>('#shoe i').style.width = `${ratio * 100}%`;
  $('#shoe span').textContent = `${shoe.remaining}`;
}

/** 라운드 사이에만 룰/덱 변경을 반영 */
function applyRules(): void {
  game.rules = { ...data.rules };
  if (shoe.decks !== data.rules.decks) {
    shoe = new Shoe(data.rules.decks);
    game.shoe = shoe;
    showToast(`${data.rules.decks}덱으로 새 슈 준비 완료`);
  }
}

function between(): boolean {
  return game.phase === 'betting' || game.phase === 'settled';
}

$('#controls').addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest('button');
  if (!target || target.disabled) return;

  const chip = target.dataset.chip;
  if (chip) {
    data.bet = Math.min(game.bankroll, data.bet + Number(chip));
    render();
    return;
  }

  switch (target.dataset.act) {
    case 'clear':
      data.bet = 0;
      break;
    case 'max':
      data.bet = Math.floor(game.bankroll / CHIPS[0]) * CHIPS[0];
      break;
    case 'deal':
      applyRules();
      resetSeen();
      game.deal(data.bet);
      if (game.shuffledThisRound) showToast('🔀 슈를 섞었습니다');
      break;
    case 'insurance-yes':
      game.resolveInsurance(true);
      break;
    case 'insurance-no':
      game.resolveInsurance(false);
      break;
    case 'hit':
      game.hit();
      break;
    case 'stand':
      game.stand();
      break;
    case 'double':
      game.double();
      break;
    case 'split':
      game.split();
      break;
    case 'surrender':
      game.surrender();
      break;
    case 'reset':
      game.bankroll = STARTING_BANKROLL;
      data.bet = CHIPS[0];
      break;
  }
  if (between()) persist();
  render();
});

// ---- 설정 ----

function openSettings(): void {
  settingsDialog.innerHTML = settingsHtml(data, between());
  settingsDialog.showModal();
}

$('#open-settings').addEventListener('click', openSettings);

settingsDialog.addEventListener('change', (e) => {
  const el = e.target as HTMLInputElement | HTMLSelectElement;
  switch (el.name) {
    case 'decks':
      data.rules.decks = Number(el.value);
      break;
    case 'soft17':
      data.rules.dealerHitsSoft17 = el.value === 'h17';
      break;
    case 'payout':
      data.rules.blackjackPayout = Number(el.value);
      break;
    case 'surrender':
      data.rules.allowSurrender = (el as HTMLInputElement).checked;
      break;
    case 'das':
      data.rules.doubleAfterSplit = (el as HTMLInputElement).checked;
      break;
    case 'totals':
      data.showTotals = (el as HTMLInputElement).checked;
      break;
  }
  persist();
});

settingsDialog.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  // 바깥(백드롭) 탭으로 닫기
  if (target === settingsDialog) settingsDialog.close();
  const act = target.closest('button')?.dataset.act;
  if (act === 'close') settingsDialog.close();
  if (act === 'reset-bankroll' && confirm(`잔액을 ${money(STARTING_BANKROLL)}으로 초기화할까요?`)) {
    if (between()) {
      game.bankroll = STARTING_BANKROLL;
      persist();
    }
    settingsDialog.close();
  }
});

settingsDialog.addEventListener('close', () => {
  if (between()) applyRules();
  render();
});

render();
