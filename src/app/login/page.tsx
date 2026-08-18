import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

// 로그인 세션 쿠키를 확인해야 하므로 정적 프리렌더링 대상에서 제외한다.
export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Google 로그인 동의가 취소되었습니다.",
  invalid_state:
    "로그인 요청이 만료되었거나 위조되었을 수 있습니다. 다시 시도해 주세요.",
  email_not_verified:
    "Google에서 이메일 인증이 확인되지 않아 계정을 연동할 수 없습니다.",
  account_conflict: "이미 다른 계정에 연동된 이메일입니다.",
  invalid_credentials: "이메일 또는 비밀번호가 올바르지 않습니다.",
  server_error:
    "서버 오류로 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const errorCode = typeof params.error === "string" ? params.error : undefined;
  const errorMessage = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? "로그인 중 오류가 발생했습니다.")
    : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-sm flex-col gap-6 px-6 py-16">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="self-start rounded-full border border-black/[.08] px-3 py-1 text-sm font-medium text-zinc-600 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-[#1a1a1a]"
          >
            ← 메인으로
          </Link>
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            로그인
          </h1>
        </div>

        {errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900 dark:bg-red-950">
            <p className="text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          </div>
        )}

        <form
          action="/api/auth/login"
          method="post"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="rounded-md border border-black/[.08] bg-white px-3 py-2 text-black outline-none focus:border-zinc-400 dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="rounded-md border border-black/[.08] bg-white px-3 py-2 text-black outline-none focus:border-zinc-400 dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
            />
          </div>

          <button
            type="submit"
            className="bg-foreground text-background mt-2 flex h-12 w-full items-center justify-center rounded-full px-5 text-base font-medium transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            로그인
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-black/[.08] dark:bg-white/[.145]" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">또는</span>
          <div className="h-px flex-1 bg-black/[.08] dark:bg-white/[.145]" />
        </div>

        {/* next/link가 아닌 일반 a 태그를 의도적으로 사용:
            accounts.google.com(외부 origin)으로 완전한 브라우저 내비게이션이 필요함 */}
        <a
          href="/api/auth/google"
          className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 text-base font-medium transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Google로 로그인
        </a>
      </main>
    </div>
  );
}
