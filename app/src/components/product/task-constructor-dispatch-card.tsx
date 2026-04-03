"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AppButton } from "@/components/ui/primitives";

type SendResult = {
  accepted?: boolean;
  bridgeExecutionId?: string;
  externalTaskId?: string;
  executionState?: string;
  message?: string;
};

function getConstructorSignal(executionFeed: string[]) {
  const constructorLines = executionFeed.filter((line) => /constructor/i.test(line));
  const latestLine = constructorLines[constructorLines.length - 1] ?? null;

  if (!latestLine) {
    return {
      tone: "slate" as const,
      label: "No Constructor activity yet",
      detail: "Dispatch a task to see Constructor execution and callback updates here."
    };
  }

  if (latestLine.includes("CONSTRUCTOR_CALLBACK_DUPLICATE_IGNORED")) {
    return {
      tone: "amber" as const,
      label: "Callback already processed",
      detail: latestLine
    };
  }

  if (latestLine.includes("CONSTRUCTOR_CALLBACK_RECEIVED")) {
    return {
      tone: "emerald" as const,
      label: "Callback received",
      detail: latestLine
    };
  }

  if (/dispatch failed|unauthorized|error/i.test(latestLine)) {
    return {
      tone: "rose" as const,
      label: "Constructor needs attention",
      detail: latestLine
    };
  }

  return {
    tone: "blue" as const,
    label: "Dispatch in progress",
    detail: latestLine
  };
}

function getSignalClasses(tone: "slate" | "blue" | "emerald" | "amber" | "rose") {
  switch (tone) {
    case "blue":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "emerald":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "rose":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export function TaskConstructorDispatchCard({
  taskId,
  taskTitle,
  executionFeed = []
}: {
  taskId: string;
  taskTitle: string;
  executionFeed?: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);

  const constructorSignal = useMemo(() => getConstructorSignal(executionFeed), [executionFeed]);

  const effectiveInstruction = useMemo(() => {
    const trimmed = instructions.trim();
    if (trimmed) return trimmed;
    return [
      `Generate a final answer for the task \"${taskTitle}\" using only the task details provided in the request.`,
      "Do not attempt to access Mission Control directly.",
      "Do not post comments yourself.",
      "Return only the final answer that Mission Control should post back to the task comments."
    ].join(" ");
  }, [instructions, taskTitle]);

  async function handleSend() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setMessage("Sending task to Constructor...");
    setResult(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/constructor/dispatch`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ instruction: effectiveInstruction })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(null);
        setError(payload?.error?.message ?? "Constructor dispatch failed.");
        return;
      }

      const dispatch = payload?.data?.dispatch ?? payload?.data ?? {};
      setResult(dispatch);
      setMessage(dispatch?.message ?? "Task accepted by Constructor. Mission Control will post the final answer to comments when the callback arrives.");
      startTransition(() => router.refresh());
    } catch {
      setMessage(null);
      setError("Constructor dispatch failed. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Send task via Constructor</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Run the Constructor-based answer generation flow for this task.
            Mission Control posts the terminal result into task comments from the Constructor callback.
          </p>
        </div>
        <span className="rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
          Constructor
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Task instructions for Constructor
          </span>
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            rows={6}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            placeholder="Optional override. Keep it self-contained: ask for a final answer only, not direct Mission Control actions."
          />
        </label>

        <div className={`rounded-xl border px-3 py-3 text-xs leading-5 ${getSignalClasses(constructorSignal.tone)}`}>
          <p className="font-semibold">Latest Constructor signal</p>
          <p className="mt-2 text-sm font-medium">{constructorSignal.label}</p>
          <p className="mt-1 break-words">{constructorSignal.detail}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs leading-5 text-slate-600">
          <p className="font-semibold text-slate-800">Operator note</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Use this to exercise the Constructor ingestion and callback flow end to end.</li>
            <li>Constructor should generate a final answer from the provided task context.</li>
            <li>Mission Control writes that final answer into task comments after the callback arrives.</li>
          </ul>
        </div>

        <AppButton type="button" tone="primary" onClick={handleSend} disabled={isSubmitting || isPending}>
          {isSubmitting || isPending ? "Sending..." : "Send via Constructor"}
        </AppButton>

        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {result ? (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs leading-5 text-slate-600">
            <p><span className="font-semibold text-slate-800">External task:</span> {result.externalTaskId ?? "n/a"}</p>
            <p><span className="font-semibold text-slate-800">Bridge execution:</span> {result.bridgeExecutionId ?? "n/a"}</p>
            <p><span className="font-semibold text-slate-800">Initial state:</span> {result.executionState ?? "queued"}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
