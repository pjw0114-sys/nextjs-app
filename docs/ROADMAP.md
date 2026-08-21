# 동네모임 개발 로드맵

소규모 정기 취미 모임의 주최자와 참여자가 모임 생성부터 회차 공지, RSVP, 카풀, 정산까지 한 곳에서 처리하는 웹 서비스.

## 개요

동네모임은 수영/헬스/러닝 등 **고정 인원으로 정기 운영되는 취미 모임의 주최자 1명**과 **매회 참석 여부만 체크하면 되는 참여자들**을 위한 모임 운영 도구로, 다음 기능을 제공합니다:

- **모임/초대 관리**: 모임 생성, 고유 초대코드 발급·공유, 초대코드로 참여, 참여자 목록 관리
- **회차(이벤트) 운영**: 회차별 공지 등록, RSVP(참석/불참) 응답, 마감·정원 처리, 응답 현황 집계
- **카풀 매칭**: 차량 등록, 탑승 신청, 운전자의 탑승 확정
- **정산 안내**: 비용 항목 입력과 참석 확정 인원 기준 1인당 금액 자동 계산, 납부 완료 체크
- **웹 알림함**: RSVP 마감 임박, 카풀 확정, 정산 등록 등을 앱 접속 시 목록으로 확인
- **최소 인증**: 이메일/비밀번호 회원가입·로그인, Google OAuth 로그인 (이미 구현 완료)

> 참고 문서: `docs/PRD.md`(기능 명세 전문), `CLAUDE.md`/`AGENTS.md`(실제 스택·아키텍처 기준, Next.js 16 학습 데이터와의 차이 주의)

## 개발 워크플로우

1. **작업 계획** — 기존 코드베이스 학습 및 현재 상태 파악, `docs/ROADMAP.md` 업데이트, 우선순위 작업은 마지막 완료 작업 다음에 삽입
2. **작업 생성** — `/tasks` 디렉토리에 `XXX-description.md` 형식으로 새 작업 파일 생성, 고수준 명세/관련 파일/수락 기준/구현 단계 포함, API·비즈니스 로직 작업은 "## 테스트 체크리스트" 섹션 필수
3. **작업 구현** — 작업 파일 명세를 따라 구현, Playwright MCP E2E 테스트 수행, 각 단계 완료 후 중단하고 추가 지시 대기
4. **로드맵 업데이트** — 완료된 작업을 ✅로 표시

## 개발 단계

### Phase 1: 애플리케이션 골격 구축

전체 라우트 구조, 빈 페이지, 공통 레이아웃, UI 목업용 잠정 타입을 실제 기능 구현 없이 먼저 확정한다. **DB 스키마는 이 단계에서 확정하지 않는다** — Phase 2에서 UI 목업을 먼저 완성해 실제 화면에 필요한 필드/엔티티를 검증한 뒤, Phase 3 착수 시점에 스키마를 확정한다. 인증(F015~F017)은 이미 구현이 끝난 상태이므로 이번 Phase의 기반으로 재사용한다.

- **Task 001: 이메일/비밀번호 및 Google OAuth 인증 기반 구축** ✅ - 완료 (See: `src/lib/auth.ts`, `src/lib/session.ts`, `src/lib/google-oauth.ts`, `src/lib/profiles.ts`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/api/auth/**`, `src/app/api/signup/route.ts` 참조)
  - ✅ 이메일/비밀번호 회원가입 (F015) — `crypto.scrypt` 기반 해싱, `profiles` 테이블 UNIQUE 이메일 제약 및 409 처리
  - ✅ 이메일/비밀번호 로그인 (F016)
  - ✅ Google OAuth 로그인/가입 (F017)
  - ✅ 세션 관리 (`src/lib/session.ts`)
  - ✅ 로그인(`/login`), 회원가입(`/signup`) 페이지

- **Task 002: 마이그레이션 실행 도구 구축** - 우선순위
  - `db/migrations/*.sql` + `scripts/migrate.mjs` 방식으로 마이그레이션 파일/실행 스크립트 구축(신규 도입, ORM 미사용 원칙 유지)
  - `schema_migrations(version, name, applied_at)` 테이블로 적용 이력 관리(파일명 순으로 미적용 파일만 실행)
  - `npm run db:migrate` 스크립트 추가(Node `--env-file=.env.local`로 `.env.local` 접속 정보 재사용, 신규 패키지 없음)
  - **도메인 테이블(groups/events/carpools/expenses 등) 정의는 포함하지 않음** — Phase 2 UI 검증 후 Phase 3 Task 015에서 확정

- **Task 003: UI 목업용 공통 타입 정의 (잠정)** - 우선순위
  - `src/types/group.ts`: `Group`, `GroupMember`, `MemberRole`("owner"|"member") 등 잠정 타입
  - `src/types/event.ts`: `Event`, `EventStatus`, `EventRsvp`, `RsvpStatus` 잠정 타입
  - `src/types/carpool.ts`: `Carpool`, `CarpoolPassenger`, `PassengerStatus` 잠정 타입
  - `src/types/settlement.ts`: `Expense`, `ExpenseShare` 잠정 타입
  - `src/types/notification.ts`: `Notification`, `NotificationType` 잠정 타입
  - 이 시점에는 DB 스키마가 미확정이므로 Phase 2 더미 데이터 표시용 프론트엔드 인터페이스로만 정의한다. `bigint` id 등 DB row 타입과 API 응답 DTO는 정의하지 않음
  - ⚠️ Phase 3 Task 015에서 실제 스키마 확정 후 이 타입들을 재정렬함(각주: 잠정 타입 → 확정 타입)

- **Task 004: 전체 라우트 구조 및 빈 페이지 스캐폴딩** - 우선순위
  - `src/app/groups/page.tsx` (모임 목록), `src/app/groups/new/page.tsx` (모임 생성·참여)
  - `src/app/groups/[groupId]/page.tsx` (모임 상세)
  - `src/app/groups/[groupId]/events/new/page.tsx` (이벤트 생성, 주최자 전용)
  - `src/app/groups/[groupId]/events/[eventId]/page.tsx` (이벤트 상세)
  - `src/app/groups/[groupId]/events/[eventId]/carpool/page.tsx`, `.../settlement/page.tsx`
  - `src/app/notifications/page.tsx` (알림함)
  - 각 페이지는 placeholder 컨텐츠만 표시, `PageProps<'/route'>` 전역 타입 헬퍼 사용(동기 `params` 접근 금지, Next.js 16 규칙 준수)

- **Task 005: 공통 레이아웃 및 네비게이션 골격 구축**
  - 로그인 후 공통 헤더(`내 모임`, `알림함`, 로그아웃) 레이아웃 컴포넌트
  - 로그인 전/후 분기 레이아웃 구조(`src/app/(auth)/layout.tsx`류 그룹 또는 조건 렌더링 방식 확정)
  - 모바일/데스크톱 반응형 헤더 골격(Tailwind CSS v4 기반)
  - 페이지 이동 시 활성 메뉴 표시(현재 경로 하이라이트)
  - 알림 미확인 배지 표시 영역(더미 카운트로 우선 배치)

- **Task 006: 권한 모델 및 라우트 접근 제어 골격 설계**
  - `role`("owner"|"member") 및 `status`(참여 상태) 기준 접근 제어 규칙 정의 문서화
  - 주최자 전용 페이지(이벤트 생성, 참여자 관리, 비용 등록) 진입 가드 골격(서버 컴포넌트에서 세션+역할 확인 스텁)
  - 비로그인 사용자의 보호 라우트 접근 시 `/login` 리다이렉트 처리 방식 확정(Next.js 16: `middleware.ts` 대신 `proxy.ts` 명명 규칙 준수 여부 검토)
  - 이후 Phase 3에서 실제 검증 로직으로 교체될 지점(TODO) 표시

### Phase 2: UI/UX 완성 (더미 데이터 활용)

Phase 1의 빈 페이지에 하드코딩된 더미 데이터로 전체 UI/UX를 완성한다. shadcn/ui `base-nova`(Base UI 기반) 컴포넌트를 확장 사용한다. 이 단계에서 확정되는 화면 구성과 필드는 Phase 3 착수 시 DB 스키마 확정의 근거가 된다.

- **Task 007: 공통 UI 컴포넌트 라이브러리 확장**
  - `npx shadcn@latest add card dialog input select badge tabs avatar table` 등 필요한 컴포넌트 설치(`src/components/ui/`)
  - 설치 후 `src/app/globals.css`의 `--font-sans: var(--font-geist-sans)` 값 보존 여부 확인(재설치 시 자기참조로 덮어써지는 이슈 주의)
  - 공통 상태 표시 컴포넌트: `EmptyState`, `LoadingSkeleton`, `ErrorBanner` 등 신규 작성
  - `lucide-react` 아이콘 세트 선정 및 사용 규칙 정리
  - `class-variance-authority`(`cva`) 기반 역할별(주최자/참여자) 배지 variant 정의

- **Task 008: 모임 목록·생성·참여 페이지 UI (더미 데이터)**
  - 모임 목록 페이지: 모임 카드 그리드(모임명, 카테고리, 참여자 수 더미), "새 모임 만들기"/"초대코드로 참여" 버튼
  - 모임 생성 폼 UI(모임명/설명/카테고리 입력, controlled input)
  - 초대코드 참여 폼 UI(코드 입력 필드, 오류 상태 UI)
  - 빈 목록 상태(모임 없음) UI

- **Task 009: 모임 상세 페이지 UI (더미 데이터)**
  - 초대코드 표시 + 복사 버튼 UI(클립보드 복사 인터랙션만, 실제 저장 없음)
  - 참여자 목록 테이블/리스트 UI(역할 배지, [주최자 전용] 강제 탈퇴 버튼)
  - 이벤트(회차) 목록 카드 UI(더미 일시/장소/RSVP 마감)
  - [주최자 전용] "이벤트 만들기" 버튼 노출 조건 UI

- **Task 010: 이벤트 생성·상세 페이지 UI (더미 데이터)**
  - 이벤트 생성 폼 UI(제목/일시/장소/공지/RSVP 마감/정원 입력)
  - 이벤트 상세 페이지: 공지 내용, RSVP 참석/불참 버튼(마감 후 비활성 상태 UI 포함)
  - RSVP 현황 집계 UI([주최자 전용] 참석/불참/미응답 카운트, 목록)
  - "카풀"/"정산" 이동 버튼

- **Task 011: 카풀 관리 페이지 UI (더미 데이터)**
  - 차량 등록 폼 UI(출발지/출발 시각/탑승 가능 인원)
  - 등록된 차량 목록 카드 UI(잔여 좌석, 탑승 신청 버튼)
  - 탑승 신청자 목록 UI + [운전자 전용] 수락/거절 버튼
  - 확정/대기/거절 상태 배지 UI

- **Task 012: 정산 관리 페이지 UI (더미 데이터)**
  - [주최자 전용] 비용 항목 입력 폼 UI(항목명/총액)
  - 1인당 금액 표시 UI(참석 확정 인원 기준 계산 결과 더미 표시)
  - 참여자별 납부 현황 테이블 UI(납부 완료 체크박스)
  - [주최자 전용] 전체 납부 현황 요약 UI

- **Task 013: 알림함 페이지 UI + 헤더 알림 배지 (더미 데이터)**
  - 알림 목록 UI(타입별 아이콘, 읽음/안읽음 스타일 구분, 상대 시간 표시)
  - 알림 클릭 시 딥링크 이동 UI 동작(더미 경로)
  - 헤더 알림 배지 실데이터 연동 전 더미 카운트 표시 확정

- **Task 014: 반응형 및 접근성 전체 검증**
  - 전체 페이지 모바일/태블릿/데스크톱 브레이크포인트 점검
  - 키보드 포커스 이동 순서 및 포커스 링 스타일 점검(Base UI 컴포넌트 기본 접근성 활용)
  - 폼 요소 label/aria 속성 점검
  - 명도 대비(WCAG AA) 점검

### Phase 3: 핵심 기능 구현

Phase 2의 더미 데이터를 실제 MariaDB 연동과 API로 교체한다. 착수 전 반드시 DB 스키마를 확정해야 하므로 이 Phase의 첫 작업은 스키마 설계다. API·비즈니스 로직 구현 Task는 완료 전 Playwright MCP로 실제 브라우저 플로우 테스트를 반드시 수행한다.

- **Task 015: UI 목업 검증 결과 기반 DB 스키마 확정 및 마이그레이션 작성** - 우선순위
  - Phase 2에서 확정된 화면/필드를 근거로 `groups(name, description, category, owner_id, invite_code, is_archived)` 테이블 정의
  - `group_members(group_id, profile_id, role, status)` 테이블 정의
  - `events(group_id, title, description, location, start_at, end_at, rsvp_deadline, capacity, status, created_by)` 테이블 정의
  - `event_rsvps`, `carpools`, `carpool_passengers`, `expenses`, `expense_shares`, `notifications` 테이블 정의 및 외래키/인덱스 설계
  - `profiles` 테이블과의 관계(소유자/작성자 참조) 명시
  - Task 002에서 구축한 마이그레이션 도구로 `db/migrations/*.sql` 작성 후 `npm run db:migrate` 실행 검증
  - Task 003의 UI 목업용 잠정 타입을 확정 스키마에 맞춘 실제 DB row 타입/API 응답 DTO로 재정렬
  - 이 Task 완료가 이후 모든 API 연동 Task(Task 016~)의 전제조건

- **Task 016: 모임 생성/목록 조회 API 연동 (F001)**
  - `POST /api/groups` — 모임명/설명/카테고리 검증 후 `groups` INSERT, `owner_id`는 세션에서 조회
  - `GET /api/groups` — 로그인 사용자가 속한 모임 목록 조회(`group_members` JOIN)
  - 모임 목록/생성 페이지를 실제 API로 교체(더미 데이터 제거)
  - 에러 핸들링(검증 실패 400, DB 오류 500) 및 일관된 API 응답 포맷 적용
  - Playwright MCP로 "모임 생성 → 목록에 노출" 플로우 테스트 수행

- **Task 017: 초대코드 발급·공유 및 참여 API 연동 (F002, F003)**
  - 모임 생성 시 고유 `invite_code` 자동 생성 로직(충돌 방지 재시도 포함)
  - `GET /api/groups/[groupId]` — 초대코드 등 모임 상세 조회
  - `POST /api/groups/join` — 초대코드로 `group_members` INSERT, 잘못된 코드/중복 참여 처리
  - 초대코드 복사 UI를 실제 값과 연동
  - Playwright MCP로 "초대코드 발급 → 다른 계정으로 참여" 플로우 테스트 수행

- **Task 018: 참여자 목록 관리 API 연동 (F004)**
  - `GET /api/groups/[groupId]/members` — 참여자 목록 + 역할 조회
  - `DELETE /api/groups/[groupId]/members/[profileId]` — [주최자 전용] 강제 탈퇴, 본인/주최자 탈퇴 방지 검증
  - 권한 검증(Task 006 가드를 실제 로직으로 교체): 주최자만 탈퇴 처리 가능
  - Playwright MCP로 "주최자가 참여자 강제 탈퇴" 플로우 테스트 수행

- **Task 019: 이벤트(회차) 생성/공지 조회 API 연동 (F005, F006)**
  - `POST /api/groups/[groupId]/events` — [주최자 전용] 제목/일시/장소/공지/RSVP 마감/정원 검증 후 INSERT
  - `GET /api/groups/[groupId]/events`, `GET /api/groups/[groupId]/events/[eventId]` — 이벤트 목록/상세 조회
  - 이벤트 생성/상세 페이지를 실제 API로 교체
  - Playwright MCP로 "이벤트 생성 → 상세에서 공지 확인" 플로우 테스트 수행

- **Task 020: RSVP 응답 및 마감·정원 처리 API 연동 (F007)**
  - `POST /api/events/[eventId]/rsvp` — 참석/불참 응답 upsert, `rsvp_deadline` 경과 시 403, `capacity` 초과 시 마감 처리
  - DB 트랜잭션으로 정원 초과 동시성 이슈 방지(참석 카운트 확인 후 INSERT를 하나의 트랜잭션으로 처리)
  - RSVP 버튼 활성/비활성 상태를 서버 상태와 동기화
  - Playwright MCP로 "마감 전 응답 성공 / 마감 후 응답 차단" 플로우 테스트 수행

- **Task 021: RSVP 현황 집계 API 연동 (F008)**
  - `GET /api/events/[eventId]/rsvps/summary` — [주최자 전용] 참석/불참/미응답 카운트 및 명단 집계 쿼리
  - 집계 UI를 실제 데이터로 교체
  - Playwright MCP로 "참여자 응답 후 주최자 화면에 집계 반영" 플로우 테스트 수행

- **Task 022: 카풀 등록·신청·확정 API 연동 (F009, F010, F011)**
  - `POST /api/events/[eventId]/carpools` — 차량 등록(출발지/출발시각/총 좌석)
  - `POST /api/carpools/[carpoolId]/passengers` — 탑승 신청(잔여 좌석 검증)
  - `PATCH /api/carpools/[carpoolId]/passengers/[passengerId]` — [운전자 전용] 수락/거절 상태 변경
  - 좌석 초과 신청 방지 로직(트랜잭션 처리)
  - Playwright MCP로 "차량 등록 → 탑승 신청 → 운전자 확정" 전체 플로우 테스트 수행

- **Task 023: 비용 항목 입력 및 1인당 금액 자동 계산 API 연동 (F012)**
  - `POST /api/events/[eventId]/expenses` — [주최자 전용] 항목명/총액 입력 후 `expenses` INSERT
  - 참석 확정 인원(RSVP 참석자) 기준 `expense_shares` 자동 생성 및 1인당 금액 계산(나머지 처리 규칙 정의: 예 — 최소 단위 절상)
  - `GET /api/events/[eventId]/expenses` — 항목별/총액/1인당 금액 조회
  - Playwright MCP로 "비용 등록 → 참여자별 1인당 금액 자동 계산 확인" 플로우 테스트 수행

- **Task 024: 납부 완료 체크 API 연동 (F013)**
  - `PATCH /api/expenses/[expenseId]/shares/[profileId]` — 본인 납부 여부 토글, 본인 것만 수정 가능하도록 검증
  - `GET /api/events/[eventId]/expenses/summary` — [주최자 전용] 전체 납부 현황 조회
  - Playwright MCP로 "참여자 납부 체크 → 주최자 화면에 현황 반영" 플로우 테스트 수행

- **Task 025: 웹 알림함 API 및 이벤트 트리거 연동 (F014)**
  - `notifications` INSERT 트리거 지점 구현: RSVP 마감 임박(배치/조회 시점 판단), 카풀 탑승 확정, 비용 항목 등록
  - `GET /api/notifications` — 로그인 사용자 알림 목록 조회, `PATCH /api/notifications/[id]/read` — 읽음 처리
  - 알림 클릭 시 `link_path`로 딥링크 이동 실제 연동, 헤더 배지 실제 미확인 카운트로 교체
  - Playwright MCP로 "카풀 확정 발생 → 알림함에 노출 → 클릭 시 해당 페이지 이동" 플로우 테스트 수행

- **Task 026: 권한/역할 기반 접근 제어 로직 전체 구현**
  - Task 006 가드 스텁을 실제 세션+역할(`group_members.role`) 검증 로직으로 교체(모든 주최자 전용 API/페이지 일괄 점검)
  - 비주최자의 주최자 전용 API 직접 호출 시 403 응답 및 일관된 에러 응답 포맷 적용
  - 모임 미가입 사용자의 접근 차단(그룹 리소스 전반)
  - Playwright MCP로 "참여자 계정으로 주최자 전용 화면/API 접근 차단" 플로우 테스트 수행

### Phase 4: 고급 기능 및 최적화

- **Task 027: 쿼리 성능 최적화 및 인덱스 점검**
  - `group_members`, `event_rsvps`, `carpool_passengers`, `expense_shares` 등 조회 빈도 높은 컬럼에 인덱스 추가
  - N+1 쿼리 패턴 점검(이벤트 목록 + RSVP 집계 등 JOIN/서브쿼리로 통합)
  - 커넥션 풀(`connectionLimit`) 설정값 운영 기준 재검토

- **Task 028: 에러 핸들링 및 로딩 상태 고도화**
  - 전역 API 응답 포맷 일관성 재점검(성공/에러 스키마 통일)
  - 낙관적 업데이트(RSVP, 납부 체크 등 즉시 반응성 필요한 액션) 도입
  - `error.tsx`/`loading.tsx` 등 App Router 규칙 기반 페이지별 에러/로딩 UI 보강

- **Task 029: Playwright MCP 기반 회귀 테스트 스위트 구축**
  - 핵심 사용자 여정(로그인 → 모임 생성 → 이벤트 생성 → RSVP → 카풀 → 정산) 전체 E2E 스크립트화
  - CI에서 재사용 가능한 테스트 시나리오 문서화(`docs/testing/*.md` 등)
  - Playwright MCP로 전체 스위트 실행 및 결과 기록

- **Task 030: 배포 파이프라인 구성**
  - Vercel 프로젝트 연동 및 환경변수(`DATABASE_*`, OAuth 클라이언트 정보 등) 설정
  - `scripts/migrate.mjs`를 배포 전 단계에 연동하는 방식 정리(수동 실행 또는 배포 훅)
  - 프로덕션 빌드(`npm run build`) 및 `npm run typecheck`, `npm run lint`를 배포 전 체크리스트로 문서화

- **Task 031: MVP 이후 기능 백로그 (착수 보류)**
  - 알림 외부 발송(이메일/푸시/실시간 웹소켓)
  - 실제 결제/송금(카카오페이 등) 연동
  - 상세 프로필 편집, 프로필 이미지, 알림 설정(끄기/주기)
  - 반복 이벤트 자동 생성, 참여자 간 채팅/댓글, 참석률·비용 통계 리포트
  - 위 항목은 이번 로드맵의 Phase 1~4 범위에서 제외하며, Phase 4 완료 이후 별도 우선순위 논의를 거쳐 착수한다
