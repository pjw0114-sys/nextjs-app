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
npm run dev           # 개발 서버 (Turbopack, .next/dev에 출력)
npm run build         # 프로덕션 빌드 (Turbopack)
npm run start         # 프로덕션 서버 실행
npm run lint          # ESLint 실행 (eslint-config-next core-web-vitals + typescript + eslint-config-prettier)
npm run lint:fix      # ESLint 자동 수정
npm run format        # Prettier로 전체 포맷 적용 (prettier-plugin-tailwindcss로 Tailwind 클래스 자동 정렬)
npm run format:check  # Prettier 포맷 검사만 (수정 없음)
npm run typecheck     # tsc --noEmit. 정확한 검사를 위해 dev/build를 먼저 1회 실행해 .next/types를 생성해둘 것
```

테스트 프레임워크는 구성되어 있지 않다. 단일 파일/테스트 실행 명령은 존재하지 않는다.

## Git 훅

- **pre-commit** (Husky + lint-staged): staged된 `*.{js,jsx,mjs,cjs,ts,tsx}` 파일에 `eslint --fix` → `prettier --write`, `*.{json,css,md,yml,yaml}` 파일에 `prettier --write`를 자동 적용하고 재-stage한다. ESLint가 자동 수정하지 못하는 오류(파싱 에러 등)가 있으면 커밋이 차단된다. `no-unused-vars` 등 `eslint-config-next`에서 warning으로 분류된 규칙은 커밋을 막지 않는다.
- `tsc --noEmit`은 부분 실행이 안 되는 전체 프로젝트 대상 검사라 pre-commit에는 포함하지 않았다. 커밋 전에 `npm run typecheck`를 수동으로 실행할 것.
- 줄바꿈은 `.gitattributes`(`* text=auto eol=lf`)로 LF로 고정되어 있다. Windows에서 `core.autocrlf=true`로 설정된 환경이어도 이 저장소 안에서는 CRLF로 바뀌지 않는다 (Prettier의 `endOfLine: "lf"` 설정과 일치시키기 위함).

## 아키텍처

- **App Router 전용** (`src/app`). Pages Router는 사용하지 않는다.
- **경로 별칭**: `@/*` → `src/*` (`tsconfig.json` 참고).
- **DB 접근**: `src/lib/db.ts`가 `mariadb` 커넥션 풀을 생성하고 `globalThis`에 캐싱해 개발 모드에서 HMR로 인한 풀 중복 생성을 막는다. Route Handler(`src/app/api/**/route.ts`)와 Server Component 모두 이 `pool`을 직접 import해서 쿼리한다 — 별도의 서비스/레포지토리 레이어는 아직 없다.
  - 예: `src/app/api/health/route.ts` (DB 헬스체크), `src/app/instruments/page.tsx` (Server Component에서 직접 쿼리 + `Suspense`로 로딩 상태 처리, `bigint`를 `JSON.stringify`할 때 커스텀 replacer로 문자열 변환).
  - DB 접속 정보는 `.env.local`의 `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`으로 주입된다 (커밋되지 않음).
  - `utils/mariadb/server.ts`는 현재 빈 파일이다. `src/lib/db.ts`와 혼동하지 말 것.
- **스타일링**: Tailwind CSS v4 (`@import "tailwindcss"` in `src/app/globals.css`, `@theme inline`으로 CSS 변수 매핑). 별도의 `tailwind.config.*` 파일 없이 CSS 기반 설정을 사용한다.
- **UI 컴포넌트**: `shadcn/ui`가 설치되어 있다 (`components.json` 참고). **`style: "base-nova"`, 기반 라이브러리는 Radix가 아니라 `@base-ui/react`(Base UI)** — 흔히 알려진 "new-york + Radix UI" 조합이 아니므로 예제/학습 데이터를 그대로 믿지 말 것. 컴포넌트는 `src/components/ui/`에 생성되고(`@/components/ui` alias), `src/lib/utils.ts`의 `cn()`(`clsx` + `tailwind-merge`)으로 클래스를 병합한다. 새 컴포넌트 추가는 `npx shadcn@latest add <name>`. 아이콘은 `lucide-react`, 변형(variant)은 `class-variance-authority`(`cva`) 사용.
  - `src/app/globals.css`의 폰트 변수는 `--font-sans: var(--font-geist-sans)`로 유지해야 한다 — `shadcn init`을 다시 실행하면 이 값이 `var(--font-sans)`(자기 참조)로 덮어써져 Geist 폰트가 깨질 수 있으니 재실행 후 반드시 확인할 것.
- **인증/회원가입**: `src/app/signup/page.tsx`(클라이언트 컴포넌트, fetch로 `/api/signup` 호출) → `src/app/api/signup/route.ts`(입력 검증 후 `pool.query`로 `profiles` 테이블에 INSERT) → `src/lib/auth.ts`(Node `crypto.scrypt` 기반 비밀번호 해싱/검증, 외부 패키지 미사용). 이메일 UNIQUE 제약 위반(`ER_DUP_ENTRY`)은 409로 별도 응답한다. 별도의 세션/로그인 기능은 아직 없다.

## 주의: 실제 스택과 다른 참고 문서

`docs/guides/*.md`와 `.claude/agents/dev/nextjs-app-developer.md`, `ui-markup-specialist.md`는 범용 스타터 템플릿용으로 작성된 문서로, react-hook-form, zod, next-themes, 라우트 그룹·병렬/인터셉트 라우트, Next.js 15.5.3, **shadcn/ui의 "new-york" 스타일 + Radix UI**를 전제로 한다. `react-hook-form`/`zod`/`next-themes`는 여전히 설치되어 있지 않고, shadcn/ui는 설치되어 있지만 실제로는 위 "UI 컴포넌트" 절에 적힌 `base-nova` + Base UI 조합이라 이 문서들이 설명하는 것과 다르다. 코드 작성 시 이 문서들의 패턴을 그대로 따르지 말고 위 "아키텍처" 절과 실제 `src/` 코드를 기준으로 판단할 것.
