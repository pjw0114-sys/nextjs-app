"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signedUpName, setSignedUpName] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.message ?? "회원가입에 실패했습니다.");
        return;
      }

      setSignedUpName(name);
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (signedUpName) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <main className="flex w-full max-w-sm flex-col items-center gap-6 px-6 py-16 text-center">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            가입이 완료되었습니다
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {signedUpName}님, 환영합니다.
          </p>
          <Link
            href="/"
            className="bg-foreground text-background flex h-12 w-full items-center justify-center rounded-full px-5 text-base font-medium transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            메인 화면으로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-sm flex-col gap-6 px-6 py-16">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="self-start rounded-full border border-black/[.08] px-3 py-1 text-sm font-medium text-zinc-600 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-[#1a1a1a]"
          >
            ← 메인으로
          </button>
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            회원가입
          </h1>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="name"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              이름
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-md border border-black/[.08] bg-white px-3 py-2 text-black outline-none focus:border-zinc-400 dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              이메일
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-md border border-black/[.08] bg-white px-3 py-2 text-black outline-none focus:border-zinc-400 dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              8자 이상 입력해 주세요.
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900 dark:bg-red-950">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-foreground text-background mt-2 flex h-12 w-full items-center justify-center rounded-full px-5 text-base font-medium transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            {isSubmitting ? "가입 중..." : "가입하기"}
          </button>
        </form>
      </main>
    </div>
  );
}
