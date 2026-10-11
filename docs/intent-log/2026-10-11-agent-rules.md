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

## 리뷰 반영 (PR #2, GPT 리뷰)

사용자가 GPT(Codex)에게 리뷰를 맡겨 P2 2건, nit 1건, 운영 정책 제안 1건이 나왔다.

| 지적 | 판단 | 조치 |
|---|---|---|
| [P2] intent-log 스킬은 기록과 다른 지시를 무조건 재질문하게 함. AGENTS.md 1절과 흐름이 다름 | 타당. 두 문서가 실제로 다르게 안내함 | 명확한 최신 지시는 적용 + "이전 결정을 뒤집음" 기록, 의도가 불명확할 때만 확인하도록 AGENTS.md·스킬 통일 |
| [P2] review 스킬의 "범위 밖은 지적하지 않음"이 이번 diff가 만든 회귀까지 막음 | 타당. 같은 스킬 4·5단계와 충돌 | 범위 밖 제외는 신규 기능·무관한 기존 문제로 한정. 회귀·사양 위반·필수 누락은 항상 지적하도록 AGENTS.md 4·5절·스킬 수정 |
| [nit] `pr` 스킬의 템플릿 상대 경로 `../../../.github/...`가 한 단계 더 올라감 | 해당 없음. `.claude/skills/pr/` 기준 `../../../`는 저장소 루트이고 `ls`로 확인함. 제안 경로(`../../../../`)는 저장소 밖을 가리킴 | 변경 없음, 스레드에 근거를 답함 |
| (제안) 문서만 바뀐 PR의 test/build 생략 예외를 문서화 | 타당. 이 PR 자체가 규칙과 어긋나 있었음 | AGENTS.md 0절·`pr` 스킬에 예외 추가 (대신 링크·지침 정합성 확인 + 생략 사유 명시). 예외로 볼 파일 범위는 에이전트 판단 |

## 추가 요청 (PR #2 코멘트)

> PR 1번을 작성한 후인 만큼, 아마 githubio 페이지가 생기지 않았을까 하는 예상을 함. 해당 링크를 이 리포지토리 루트 readme에 병기해두었으면 함.

→ `README.md` 상단에 `https://hibikukane.github.io/Stand-on-17/` 링크 추가.

확인 결과 PR #1 머지 후 배포 워크플로는 `deploy` 단계에서 실패했다 (`404 ... Ensure GitHub Pages has been enabled`). 저장소의 Pages가 아직 켜져 있지 않아서 페이지는 아직 없다. Settings → Pages → Source를 **GitHub Actions**로 바꾸고 워크플로를 재실행(또는 이 PR 머지)하면 위 주소로 열린다. 주소는 GitHub Pages 규칙(`<owner 소문자>.github.io/<repo>`)과 `vite.config.ts`의 `base: './'`로 정한 것이다(에이전트 판단, 실제 접속 확인 못 함).
