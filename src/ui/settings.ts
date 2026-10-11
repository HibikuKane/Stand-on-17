import type { SaveData } from './storage';

const DECK_OPTIONS = [1, 2, 4, 6, 8];

export function settingsHtml(data: SaveData, idle: boolean): string {
  const r = data.rules;
  const checked = (b: boolean) => (b ? 'checked' : '');
  return `<form method="dialog" class="settings">
    <div class="settings-head">
      <h2>설정</h2>
      <button type="button" class="icon" data-act="close" aria-label="닫기">✕</button>
    </div>
    ${idle ? '' : '<p class="note">진행 중인 판이 끝난 뒤 적용됩니다.</p>'}

    <label class="row">
      <span>덱 수</span>
      <select name="decks">
        ${DECK_OPTIONS.map((n) => `<option value="${n}" ${n === r.decks ? 'selected' : ''}>${n}덱</option>`).join('')}
      </select>
    </label>

    <fieldset class="row">
      <legend>딜러 소프트 17</legend>
      <div class="seg">
        <label><input type="radio" name="soft17" value="s17" ${checked(!r.dealerHitsSoft17)}><span>S17 스탠드</span></label>
        <label><input type="radio" name="soft17" value="h17" ${checked(r.dealerHitsSoft17)}><span>H17 히트</span></label>
      </div>
    </fieldset>

    <fieldset class="row">
      <legend>블랙잭 배당</legend>
      <div class="seg">
        <label><input type="radio" name="payout" value="1.5" ${checked(r.blackjackPayout === 1.5)}><span>3:2</span></label>
        <label><input type="radio" name="payout" value="1.2" ${checked(r.blackjackPayout === 1.2)}><span>6:5</span></label>
      </div>
    </fieldset>

    <label class="row toggle"><span>서렌더 허용</span><input type="checkbox" name="surrender" ${checked(r.allowSurrender)}></label>
    <label class="row toggle"><span>스플릿 후 더블 (DAS)</span><input type="checkbox" name="das" ${checked(r.doubleAfterSplit)}></label>
    <label class="row toggle"><span>핸드 합계 표시</span><input type="checkbox" name="totals" ${checked(data.showTotals)}></label>

    <details class="help">
      <summary>룰 설명</summary>
      <dl>
        <dt>S17 / H17</dt>
        <dd>A를 11로 세는 17(예: A+6)이 <b>소프트 17</b>. S17은 딜러가 여기서 멈추고, H17은 한 장 더 받습니다. 딜러가 더 강해지는 H17이 플레이어에게 약 0.2% 불리.</dd>
        <dt>3:2 vs 6:5</dt>
        <dd>처음 두 장으로 21(블랙잭)일 때 배당. 100 걸면 3:2는 +150, 6:5는 +120. 6:5는 하우스 엣지가 약 1.4% 늘어나는 악명 높은 룰.</dd>
        <dt>더블 다운</dt>
        <dd>베팅을 2배로 올리고 카드를 딱 한 장만 받습니다.</dd>
        <dt>스플릿</dt>
        <dd>같은 숫자 두 장을 두 핸드로 나눕니다(베팅 추가). A 스플릿은 한 장씩만 받고, 스플릿 후 A+10은 블랙잭이 아닌 그냥 21.</dd>
        <dt>보험 / 이븐 머니</dt>
        <dd>딜러 업카드가 A일 때 베팅 절반으로 '딜러 블랙잭'에 거는 사이드 벳(2:1). 내가 블랙잭이면 이븐 머니(1:1 확정)가 됩니다. 장기적으로는 손해인 베팅.</dd>
        <dt>서렌더</dt>
        <dd>첫 두 장을 보고 포기, 베팅 절반을 돌려받습니다. 딜러가 블랙잭 확인(피크)을 한 뒤에만 가능한 레이트 서렌더.</dd>
      </dl>
    </details>

    <button type="button" class="danger" data-act="reset-bankroll" ${idle ? '' : 'disabled'}>잔액 초기화</button>
  </form>`;
}
