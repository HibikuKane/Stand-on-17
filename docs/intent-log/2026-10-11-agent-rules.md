# 2026-10-11 AI 에이전트 작업 규칙 정비

사양서: 해당 없음 (게임 동작 변경 없음. 규칙 본문은 [`AGENTS.md`](../../AGENTS.md))
작성: Claude (Claude Code)

## 시작

> 가볍게 AI 에이전틱 코딩을 위한 기반만 좀 쌓아두자
>
> 세션에서 대화를 통해 얻은 'LLM의 질문에 대한 사용자의 대답'이 이런 식이었음을 저장하는 SoT 저장 디렉토리가 있으니까 그거 활용해라 라던가
> 코드로 구현한 사양에 대해서는 spec를 확실히 남겨라 라던가
>
> 그리고 보통 GPT한테 개발시키면 리뷰는 claude한테 맞기고 하는 편인데, PR 적을 때에는 '이번 변경 범위가 어떤지'를 적어둬라 라던가, 'PR작성자는 claude인지 gpt인지(아니면 gemini인지?) 서두에 반드시 명시해두도록 해라' 라던가(동일 룰에 대해 PR코멘트, discussion 내지는 issues등에 대해서도 동일하게 적용)
>
> 이런 룰링들을 쓱싹쓱싹 모아둬서 skills라던가 agents(claude.md?) 등등에 슥 추가하는 PR 하나 만들어줄 수 있어?

## Q&A

질문 없이 진행함 (요청에 규칙 항목이 구체적으로 나와 있었음).

요청에서 뽑은 규칙:

| 요청 | 반영 위치 |
|---|---|
| SoT 디렉토리(`docs/intent-log/`) 활용 | `AGENTS.md` 1절, `intent-log` 스킬 |
| 구현한 사양은 spec으로 확실히 남김 | `AGENTS.md` 2절, `spec` 스킬 |
| PR에 이번 변경 범위 기재 | `AGENTS.md` 4절, `pr` 스킬, PR 템플릿 |
| 작성자(Claude/GPT/Gemini)를 서두에 명시. PR 코멘트·Discussion·Issue도 동일 | `AGENTS.md` 3절, PR 템플릿 첫 줄 |
| GPT 개발 → Claude 리뷰 흐름 | `AGENTS.md` 5절, `review` 스킬 |

## 사용자가 명시하지 않아 에이전트가 정한 것

| 항목 | 정한 값 | 이유 |
|---|---|---|
| 규칙 원본 파일 | `AGENTS.md` 하나. `CLAUDE.md`는 `@AGENTS.md` import, `GEMINI.md`는 링크 | Codex(GPT)는 `AGENTS.md`, Claude Code는 `CLAUDE.md`, Gemini CLI는 `GEMINI.md`를 읽음. 내용 중복을 피하려고 원본 1개 |
| 스킬 위치 | `.claude/skills/{intent-log,spec,pr,review}/SKILL.md` | Claude Code 스킬 형식. 내용은 일반 마크다운이라 GPT·Gemini도 `AGENTS.md`에서 경로 안내받아 읽음 |
| 작성자 표기 형식 | 첫 줄 `> 🤖 작성: <모델 계열> (<도구>)` | 한눈에 보이고 검색 가능. 모델 버전 ID는 넣지 않음(계열까지만) |
| 리뷰 심각도 | P0 / P1 / P2 / nit | PR #1 GPT 리뷰가 P2 표기를 썼던 것과 맞춤 |
| `review` 스킬 추가 | 추가함 | 요청은 PR 작성 쪽이었지만 "리뷰는 Claude한테 맡긴다"는 흐름이 있어서, 리뷰 시 intent-log·spec 대비 확인 절차를 같이 둠 |
| PR 템플릿 | `.github/pull_request_template.md` 추가 | GitHub 웹에서 사람이 PR을 열어도 같은 형식이 나오게 |
| 문서 언어 | 한국어 | 기존 문서와 통일 |

## 결과

- 브랜치 `claude/keen-turing-fkhjqm` → `main` PR
