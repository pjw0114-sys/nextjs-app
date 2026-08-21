# AI Agent 개발 규칙 (동네모임 / nextjs-app)

이 문서는 코딩 에이전트가 이 저장소에서 작업할 때 즉시 참조하는 명령형 규칙 문서다. 프로젝트 설명은 `CLAUDE.md`를 참고하고, 이 문서는 "무엇을 하고 하지 말아야 하는가"만 다룬다.

## 1. 프로젝트 개요

- Next.js 16.3.1 + React 19.2, App Router 전용(`src/app`), MariaDB(`mariadb` 드라이버), shadcn/ui(`base-nova` + Base UI).
- 이미 구현된 것: 이메일/비밀번호 회원가입·로그인, Google OAuth, 자체 세션(`profiles`, `sessions` 테이블).
- **아직 구현되지 않은 것**: 모임(groups)/이벤트(events)/RSVP/카풀/정산/알림 기능 전체. 이 기능들은 `docs/PRD.md`, `docs/ROADMAP.md`, `docs/LeanCavas.md`에만 존재한다. 코드에 `groups`, `events` 관련 라우트나 테이블이 보이지 않는다고 해서 누락된 것이 아니라 **아직 그 단계에 도달하지 않은 것**이다.

## 2. 기능 구현 시 반드시 지킬 순서 (모임/이벤트 기능)

- `docs/ROADMAP.md`의 Phase/Task 순서를 벗어나 임의로 구현하지 말 것.
- **금지**: Phase 2(UI 목업, Task 007~014)가 끝나기 전에 DB 도메인 테이블(groups/events/carpools/expenses 등)을 확정하는 것. 이 프로젝트는 "UI 목업을 먼저 본 뒤 스키마를 확정"하기로 사용자가 명시적으로 재배치했다(`docs/ROADMAP.md` Phase 3 Task 015가 스키마 확정 담당).
- Phase 1(Task 001~006)에서는 `src/types/*.ts`에 **잠정 타입**만 만든다. DB row 타입/bigint 처리/DTO는 Task 015(스키마 확정) 시점에 추가한다.
- 새 마이그레이션을 추가할 때는 `db/migrations/*.sql`과 `scripts/migrate.mjs`(둘 다 아직 미생성, Task 002에서 생성) 두 가지를 함께 만들어야 하며, ORM은 도입하지 않는다.
- `docs/ROADMAP.md`의 Task를 완료하면 해당 Task 항목에 ✅ 표시를 추가한다(문서 자체의 "개발 워크플로우" 절에 명시된 규칙).

## 3. DB 접근 규칙

- `src/lib/db.ts`가 export하는 `pool`을 직접 import해서 `pool.query()`를 호출한다. **ORM/쿼리빌더(Prisma, Drizzle 등)를 추가하지 말 것.**
- 여러 테이블에 걸친 쓰기(트랜잭션)가 필요하면 `pool.getConnection()` → `beginTransaction()` → 쿼리 → `commit()`/`rollback()` → `finally`에서 `release()` 패턴을 쓴다. 정확한 예시는 `src/lib/profiles.ts`의 `findOrCreateProfileFromGoogle`을 그대로 따른다.
- 반복되는 조회 로직(예: 그룹 멤버십 확인, 이벤트-그룹 관계 조회)은 `src/lib/groups.ts`, `src/lib/events.ts` 같은 "테이블별 함수 모음" 파일에 얇은 헬퍼로 뽑는다. **서비스 레이어/레포지토리 클래스를 만들지 말 것** — `src/lib/session.ts`, `src/lib/profiles.ts`처럼 순수 함수 모음 형태를 유지한다.
- `BIGINT` id는 API 응답으로 내보낼 때 `.toString()`으로 직렬화한다(mariadb 드라이버가 JS `bigint`/`Long`으로 반환하므로 `JSON.stringify` 전에 반드시 변환).

## 4. 인증 — 재구현 금지, 재사용만 할 것

- 회원가입/로그인/세션/Google OAuth는 이미 완성되어 있다(`src/lib/auth.ts`, `session.ts`, `google-oauth.ts`, `profiles.ts`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/api/auth/**`, `src/app/api/signup/route.ts`). 새 기능에서 로그인 상태가 필요하면 `getCurrentUser()`(`src/lib/session.ts`)를 호출한다.
- **금지**: NextAuth, JWT 라이브러리, bcrypt 등 외부 인증 패키지 추가. 이 프로젝트는 `crypto` 표준 모듈로 직접 구현하는 것이 확립된 패턴이다.
- 세션에 의존하는 페이지/라우트는 `export const dynamic = "force-dynamic";`을 반드시 추가한다(정적 프리렌더링에서 세션 쿠키를 읽을 수 없기 때문).

## 5. Next.js 16 — 학습 데이터와 다른 부분 (위반 시 빌드/타입 오류)

- `next lint`를 사용하지 말 것. `npm run lint`는 `eslint`(플랫 컨피그)를 직접 호출한다.
- `next dev`/`next build`에 `--turbopack` 플래그를 붙이지 말 것(기본값).
- 모든 `page.tsx`/`layout.tsx`/`route.ts`의 `params`/`searchParams`는 **Promise**다. 동기 접근(`params.id`)을 쓰지 말고 `await params`를 사용한다.
- 새 페이지의 props 타입은 직접 정의하지 말고 자동 생성된 `PageProps<'/route'>`, `LayoutProps<'/route'>`, `RouteContext<'/route'>`를 쓴다(`next dev`/`build`/`typegen` 실행 후 생성됨).
- 미들웨어가 필요하면 `middleware.ts`가 아니라 `proxy.ts` 파일명/export명을 사용한다.
- `npm run typecheck` 전에 `npm run dev` 또는 `npm run build`를 최소 1회 실행해 `.next/types`를 생성해야 정확한 타입체크가 된다.

## 6. UI 컴포넌트

- shadcn/ui는 `style: "base-nova"`이며 기반 라이브러리는 **Radix가 아니라 `@base-ui/react`(Base UI)** 다. Radix API(예: `asChild` 패턴 일부, Radix 전용 prop)를 가정하고 코드를 작성하지 말 것.
- 새 컴포넌트가 필요하면 `npx shadcn@latest add <name>`으로 설치한다. **설치 후 `src/app/globals.css`의 `--font-sans: var(--font-geist-sans)` 값이 `var(--font-sans)`(자기참조)로 덮어써지지 않았는지 반드시 확인**하고, 덮어써졌다면 되돌린다.
- 아이콘은 `lucide-react`, variant는 `class-variance-authority`(`cva`)를 사용한다.
- `docs/guides/*.md`와 `.claude/agents/dev/nextjs-app-developer.md`, `ui-markup-specialist.md`는 **따르지 말 것** — react-hook-form/zod/next-themes/Radix/"new-york" 스타일/Next.js 15.5.3을 전제로 한 구식 문서이며 이 프로젝트의 실제 스택과 다르다.

## 7. 의존성 추가 원칙

- 이 프로젝트는 신규 런타임 의존성을 최소화하는 것이 일관된 방향이다(인증도 bcrypt 없이 직접 구현). 다음을 사용자의 명시적 요청 없이 추가하지 말 것: `zod`, `react-hook-form`, `next-themes`, ORM(Prisma/Drizzle 등), `dotenv`(Node의 `--env-file` 플래그로 대체).
- 폼 검증은 Route Handler 내부의 수동 `if` 검증으로 처리한다(`src/app/api/signup/route.ts` 패턴 참고).

## 8. 커스텀 서브에이전트 (`.claude/agents/`)

- `.claude/agents/dev/*.md`, `.claude/agents/docs/*.md`에 정의된 `development-planner`, `prd-generator`, `prd-validator`, `code-reviewer`, `nextjs-app-developer` 등은 **이 환경의 Agent 도구에 `subagent_type`으로 등록되어 있지 않다**. `subagent_type: "prd-generator"` 같은 직접 호출은 `Agent type not found` 오류로 실패한다.
- 이런 페르소나가 필요하면 해당 `.md` 파일의 지침 전문을 읽어 `general-purpose` 에이전트의 프롬프트에 주입해서 실행한다.

## 9. 문서 동시 갱신 규칙

- `docs/ROADMAP.md`의 Task 순서/번호를 변경하면, 그 안에서 Task 번호를 상호 참조하는 문구(예: "Task 006 가드를 교체")가 깨지지 않는지 확인한다.
- `docs/PRD.md`의 기능 ID(F001~F017)를 추가/변경하면 "메뉴 구조"와 "페이지별 상세 기능" 절 양쪽에서 정합성(기능 ID가 두 곳 모두에 존재)을 맞춘다 — 한쪽에만 존재하는 기능/페이지를 남기지 않는다.
- `CLAUDE.md`를 갱신할 때 이 문서(`shrimp-rules.md`)와 내용이 충돌하면(예: 인증 구현 여부), 실제 소스 코드를 다시 확인해 최신 상태를 반영하고 양쪽을 함께 고친다.

## 10. AI 의사결정 우선순위

모호한 상황에서는 다음 순서로 판단한다:

1. 실제 소스 코드(`src/`)와 `package.json`을 직접 확인 — 학습 데이터의 Next.js/React 관례를 신뢰하지 않는다.
2. `docs/ROADMAP.md`의 현재 Phase/Task 상태를 확인 — 다음 미완료 우선순위(`- 우선순위` 표시) Task를 우선한다.
3. `docs/guides/*.md`와 `.claude/agents/dev/nextjs-app-developer.md`/`ui-markup-specialist.md`는 참고하지 않는다(6절 참고).
4. 위 세 가지로도 판단이 안 되면 사용자에게 질문한다.

## 11. 금지 행위 요약

- `next lint`, `--turbopack` 플래그, `middleware.ts` 파일명 사용 금지
- ORM, `zod`, `react-hook-form`, `next-themes`, `dotenv` 신규 추가 금지(명시적 요청 없이)
- 서비스/레포지토리 클래스 레이어 신설 금지 — `pool.query()` 직접 호출 유지
- 인증(로그인/세션/OAuth) 재구현 금지 — 기존 `src/lib/auth.ts`/`session.ts`/`google-oauth.ts`/`profiles.ts` 재사용
- Phase 2(UI 목업) 완료 전 도메인 DB 스키마 확정 금지
- `docs/guides/*.md`, `.claude/agents/dev/nextjs-app-developer.md`, `ui-markup-specialist.md`의 패턴을 그대로 따르는 것 금지
- `.claude/agents/*.md` 커스텀 에이전트를 `subagent_type`으로 직접 호출 금지(8절 참고)
