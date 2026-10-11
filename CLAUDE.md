# CLAUDE.md

공통 규칙은 전부 `AGENTS.md`에 있다. 이 파일에는 Claude 전용 사항만 둔다.

@AGENTS.md

## Claude 전용

- 작성자 표기: `> 🤖 작성: Claude (Claude Code)`
- 절차형 작업은 `.claude/skills/`의 스킬을 쓴다.
  - `intent-log` — 세션의 Q&A·가정 기록
  - `spec` — 사양서 작성·갱신
  - `pr` — PR 본문 작성
  - `review` — 다른 모델(GPT·Gemini 등)이 만든 PR 리뷰
