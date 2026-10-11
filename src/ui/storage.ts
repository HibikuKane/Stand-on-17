import { DEFAULT_RULES, type Rules } from '../engine/rules';

export const STARTING_BANKROLL = 1000;

export interface SaveData {
  bankroll: number;
  bet: number;
  rules: Rules;
  showTotals: boolean;
}

const KEY = 'stand-on-17:v1';

export function defaults(): SaveData {
  return { bankroll: STARTING_BANKROLL, bet: 10, rules: { ...DEFAULT_RULES }, showTotals: true };
}

export function load(): SaveData {
  const base = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const data = JSON.parse(raw) as Partial<SaveData>;
    return {
      bankroll: typeof data.bankroll === 'number' ? data.bankroll : base.bankroll,
      bet: typeof data.bet === 'number' ? data.bet : base.bet,
      rules: { ...base.rules, ...data.rules },
      showTotals: data.showTotals ?? base.showTotals,
    };
  } catch {
    return base;
  }
}

export function save(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 프라이빗 모드 등에서는 저장 없이 진행
  }
}
