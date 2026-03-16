"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { AppButton, Panel } from "@/components/ui/primitives";
import { signInHighlights } from "@/lib/demo-data";
import { SparkIcon } from "@/components/ui/icons";

export function SignInScreen({ nextPath = "/", reason }: { nextPath?: string; reason?: "expired" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password,
          remember
        })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setErrorMessage(payload?.error?.message ?? "Sign-in failed. Please try again.");
        return;
      }

      router.replace(nextPath);
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-3 text-[var(--text)] md:p-4">
      <div className="grid min-h-[calc(100vh-1.5rem)] w-full gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <Panel className="relative overflow-hidden px-8 py-10 lg:px-12 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(60,94,201,0.12),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(15,23,42,0.08),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0.16))]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/70 px-3 py-1.5 text-xs text-[var(--text-muted)]">
                <SparkIcon className="h-3.5 w-3.5" />
                Mission Control
              </div>
              <h1 className="mt-8 max-w-2xl text-[clamp(2.75rem,5vw,4.9rem)] font-semibold leading-[0.94] tracking-[-0.05em] text-[var(--text-strong)]">
                Serious task orchestration for humans and agents.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-[var(--text-muted)]">
                A premium operational workspace for project work, execution visibility, and collaboration that stays calm under load.
              </p>
            </div>

            <div className="mt-12 grid gap-3 sm:grid-cols-3">
              {signInHighlights.map((item) => (
                <div key={item} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
                  <p className="text-sm leading-6 text-[var(--text-strong)]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel className="flex items-center px-6 py-8 md:px-8">
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-6">
              <p className="section-eyebrow">Owner access</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-strong)]">Sign in</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Access your workspace, project queue, and execution review surfaces.
              </p>
              {nextPath !== "/" ? (
                <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-muted)]">
                  Sign in to continue to <span className="font-medium text-[var(--text-strong)]">{nextPath}</span>.
                </div>
              ) : null}
              {reason === "expired" ? (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Your session expired. Sign in again to continue.
                </div>
              ) : null}

              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--text-strong)]">Email</span>
                  <input
                    className="input-control"
                    type="email"
                    placeholder="owner@mission-control.app"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--text-strong)]">Password</span>
                  <input
                    className="input-control"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </label>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-[var(--text-muted)]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--line-strong)]"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                    />
                    Remember this device
                  </label>
                  <span className="font-medium text-[var(--text-dim)]">Environment-backed owner access</span>
                </div>

                {errorMessage ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>
                ) : null}

                <AppButton className="w-full justify-center py-3" tone="primary" type="submit" disabled={isPending}>
                  {isPending ? "Signing in..." : "Continue to workspace"}
                </AppButton>
              </form>

              <div className="mt-6 flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-muted)]">
                <span>Local owner access is configured through environment variables.</span>
                <span className="font-medium text-[var(--text-strong)]">Docker-only workflow</span>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
