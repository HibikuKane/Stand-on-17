# Stand-on-17

폰 브라우저에서 바로 켜서 노는 블랙잭. TypeScript + Vite, 프레임워크 없음.

## 기능

- 히트 / 스탠드 / 더블 다운 / 스플릿(최대 4핸드) / 보험·이븐 머니 / 레이트 서렌더
- 설정: 덱 수(1·2·4·6·8), S17·H17, 블랙잭 배당 3:2·6:5, 서렌더·DAS on/off, 합계 표시
- 컷 카드 75% 지점에서 자동 리셔플
- 잔액·설정은 localStorage에 저장

## 개발

```bash
npm install
npm run dev     # --host 로 띄우므로 같은 Wi-Fi의 폰에서 http://<PC IP>:5173 접속 가능
npm test        # 엔진 룰 테스트 (vitest)
npm run build   # dist/ 생성
```

## 구조

```
src/engine/   순수 게임 로직 (DOM 의존 없음, 테스트 대상)
  cards.ts    카드·핸드 합계 계산
  shoe.ts     슈(덱 묶음)·셔플
  rules.ts    룰 설정
  game.ts     라운드 진행·정산 상태 머신
src/ui/       화면 렌더링·설정·저장
tests/        엔진 테스트
```

## 문서

- [`docs/specs/`](docs/specs/) — 기능 사양서
- [`docs/intent-log/`](docs/intent-log/) — 개발 세션별 의도 기록 (LLM 질문 ↔ 사용자 답변 원문)
- [`AGENTS.md`](AGENTS.md) — AI 에이전트(Claude·GPT·Gemini) 공통 작업 규칙

## 배포

`main`에 푸시하면 GitHub Actions가 GitHub Pages로 배포합니다.
처음 한 번은 저장소 **Settings → Pages → Source** 를 **GitHub Actions** 로 지정해야 합니다.
