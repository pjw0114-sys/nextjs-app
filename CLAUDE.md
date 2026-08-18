# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Next.js 16 — 학습 데이터와 다른 버전임에 주의

이 프로젝트는 **Next.js 16.3.1** + **React 19.2**를 사용한다. 위 `AGENTS.md` import가 지시하듯, 코드를 작성하기 전에 `node_modules/next/dist/docs/`의 문서를 확인할 것. 특히 아래 항목은 학습 데이터의 관례와 다르므로 명시해 둔다.

- **`next lint` 명령이 제거됨.** `package.json`의 `lint` 스크립트는 `eslint` (플랫 컨피그, `eslint.config.mjs`)를 직접 호출한다. `next lint`를 사용하려 하지 말 것.
- **Turbopack이 기본값.** `next dev`/`next build`에 `--turbopack` 플래그가 필요 없다.
- **`params`/`searchParams`는 항상 비동기(Promise)이며 동기 접근은 완전히 제거됨** (`layout`, `page`, `route`, 이미지 생성 함수 등).
- **전역 타입 헬퍼 `PageProps<'/route'>`, `LayoutProps<'/route'>`, `RouteContext<'/route'>`**가 자동 생성되어 import 없이 사용 가능하다 (`src/app/layout.tsx`에서 `LayoutProps<"/">` 사용 중인 것 참고). `next dev`/`next build`/`next typegen` 실행 시 타입이 생성된다.
- **`middleware.ts` → `proxy.ts`로 이름 변경됨** (아직 이 프로젝트에는 없음). 새로 추가할 경우 `proxy` 파일명/export명을 사용할 것.
- **병렬 라우트 슬롯은 `default.js`가 필수.** 아직 이 프로젝트에는 병렬 라우트가 없음.

## 명령어

```bash
npm run dev     # 개발 서버 (Turbopack, .next/dev에 출력)
npm run build   # 프로덕션 빌드 (Turbopack)
npm run start   # 프로덕션 서버 실행
npm run lint    # ESLint 실행 (eslint-config-next core-web-vitals + typescript)
```

테스트 프레임워크는 구성되어 있지 않다. 단일 파일/테스트 실행 명령은 존재하지 않는다.

## 아키텍처

- **App Router 전용** (`src/app`). Pages Router는 사용하지 않는다.
- **경로 별칭**: `@/*` → `src/*` (`tsconfig.json` 참고).
- **DB 접근**: `src/lib/db.ts`가 `mariadb` 커넥션 풀을 생성하고 `globalThis`에 캐싱해 개발 모드에서 HMR로 인한 풀 중복 생성을 막는다. Route Handler(`src/app/api/**/route.ts`)와 Server Component 모두 이 `pool`을 직접 import해서 쿼리한다 — 별도의 서비스/레포지토리 레이어는 아직 없다.
  - 예: `src/app/api/health/route.ts` (DB 헬스체크), `src/app/instruments/page.tsx` (Server Component에서 직접 쿼리 + `Suspense`로 로딩 상태 처리, `bigint`를 `JSON.stringify`할 때 커스텀 replacer로 문자열 변환).
  - DB 접속 정보는 `.env.local`의 `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`으로 주입된다 (커밋되지 않음).
  - `utils/mariadb/server.ts`는 현재 빈 파일이다. `src/lib/db.ts`와 혼동하지 말 것.
- **스타일링**: Tailwind CSS v4 (`@import "tailwindcss"` in `src/app/globals.css`, `@theme inline`으로 CSS 변수 매핑). 별도의 `tailwind.config.*` 파일 없이 CSS 기반 설정을 사용한다.
- **인증/회원가입**: `src/app/signup/page.tsx`(클라이언트 컴포넌트, fetch로 `/api/signup` 호출) → `src/app/api/signup/route.ts`(입력 검증 후 `pool.query`로 `profiles` 테이블에 INSERT) → `src/lib/auth.ts`(Node `crypto.scrypt` 기반 비밀번호 해싱/검증, 외부 패키지 미사용). 이메일 UNIQUE 제약 위반(`ER_DUP_ENTRY`)은 409로 별도 응답한다. 별도의 세션/로그인 기능은 아직 없다.

## 주의: 실제 스택과 다른 참고 문서

`docs/guides/*.md`와 `.claude/agents/dev/nextjs-app-developer.md`는 범용 스타터 템플릿용으로 작성된 문서로, shadcn/ui, react-hook-form, zod, next-themes, 라우트 그룹·병렬/인터셉트 라우트, Next.js 15.5.3 등을 전제로 한다. 이 프로젝트의 `package.json`에는 해당 패키지들이 설치되어 있지 않고 실제 코드도 그런 구조를 쓰지 않으므로, 코드 작성 시 이 문서들의 패턴을 그대로 따르지 말고 위 "아키텍처" 절과 실제 `src/` 코드를 기준으로 판단할 것.
