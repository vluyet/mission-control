"use client";

import { ChangeEvent, useState, useTransition } from "react";
import type { AttachmentRecord } from "@/lib/demo-data";
import { AppButton } from "@/components/ui/primitives";
import { PaperclipIcon, ArrowUpRightIcon } from "@/components/ui/icons";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/product/i18n-provider";

export function TaskAttachmentsPanel({
  taskId,
  attachments,
  agentActorName,
  agentActorEnabled = false
}: {
  taskId: string;
  attachments: AttachmentRecord[];
  agentActorName?: string;
  agentActorEnabled?: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [artifactType, setArtifactType] = useState("reference");
  const [actorType, setActorType] = useState<"human" | "agent">(agentActorName && agentActorEnabled ? "agent" : "human");
  const [expandedPreviewId, setExpandedPreviewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  async function upload() {
    if (!selectedFile) {
      setError(t("taskAttachments.chooseFileBeforeUploading"));
      return;
    }

    setError(null);
    setIsUploading(true);
    const formData = new FormData();
    formData.set("file", selectedFile);
    formData.set("artifactType", artifactType);
    formData.set("actorType", actorType);
    formData.set("actorName", actorType === "agent" && agentActorName ? agentActorName : t("taskAttachments.workspaceOwner"));

    const response = await fetch(`/api/tasks/${taskId}/attachments`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setIsUploading(false);
      setError(payload?.error?.message ?? t("taskAttachments.attachmentUploadFailed"));
      return;
    }

    setSelectedFile(null);
    startTransition(() => {
      router.refresh();
    });
    setIsUploading(false);
  }

  return (
    <div>
      <p className="section-eyebrow">{t("taskAttachments.files")}</p>

      <div className="mt-4 space-y-3">
        {attachments.length ? (
          attachments.map((attachment) => (
            <div key={attachment.id} className="rounded-2xl border border-[var(--line)] bg-white px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <PaperclipIcon className="h-4 w-4 text-[var(--text-dim)]" />
                    <p className="truncate text-sm font-medium text-[var(--text-strong)]">{attachment.name}</p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-dim)]">
                    {attachment.artifactType} · {attachment.sizeLabel} · {attachment.author ?? t("taskAttachments.unknownAuthor")} · {attachment.uploadedAt}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {attachment.previewable ? (
                    <button
                      type="button"
                      onClick={() => setExpandedPreviewId((current) => (current === attachment.id ? null : attachment.id))}
                      className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs text-[var(--text-dim)] transition hover:border-[var(--line-strong)] hover:text-[var(--text-strong)]"
                      >
                        {expandedPreviewId === attachment.id ? t("taskAttachments.hidePreview") : t("taskAttachments.preview")}
                      </button>
                  ) : (
                    <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs text-[var(--text-dim)]">
                      {t("taskAttachments.downloadOnly")}
                    </span>
                  )}
                  <a href={attachment.href} className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs text-[var(--text-dim)] transition hover:border-[var(--line-strong)] hover:text-[var(--text-strong)]">
                    {t("taskAttachments.download")}
                  </a>
                  <ArrowUpRightIcon className="h-4 w-4 text-[var(--text-dim)]" />
                </div>
              </div>
                {expandedPreviewId === attachment.id && attachment.previewable && attachment.previewHref ? (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)]">
                  {attachment.previewKind === "image" ? (
                    <img src={attachment.previewHref} alt={attachment.name} className="max-h-[320px] w-full object-contain bg-white" />
                  ) : (
                    <iframe src={attachment.previewHref} title={attachment.name} className="h-[260px] w-full bg-white" />
                  )}
                  </div>
                ) : null}
                {!attachment.previewable ? (
                  <div className="mt-3 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-xs text-[var(--text-dim)]">
                    {t("taskAttachments.previewUnavailableDescription")}
                  </div>
                ) : null}
              </div>
            ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-subtle)] px-4 py-5">
            <h3 className="text-sm font-semibold text-[var(--text-strong)]">{t("taskAttachments.noFilesTitle")}</h3>
            <p className="mt-1 text-sm text-[var(--text-dim)]">
              {t("taskAttachments.noFilesDescription")}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-[var(--line-strong)] bg-white px-3 py-3">
        <div className="grid gap-3">
          {agentActorName && agentActorEnabled ? (
            <div className="flex flex-wrap gap-2">
              {[
                { value: "human", label: t("taskAttachments.uploadAsHuman") },
                { value: "agent", label: t("taskAttachments.uploadAsAgent", { name: agentActorName ?? t("memberDirectory.agent") }) }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setActorType(option.value as "human" | "agent");
                    if (option.value === "agent") {
                      setArtifactType("output");
                    }
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    actorType === option.value
                      ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                      : "border-[var(--line)] bg-[var(--surface)] text-[var(--text-dim)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
          <input type="file" onChange={handleFileChange} className="text-sm text-[var(--text-muted)]" />
          <select value={artifactType} onChange={(event) => setArtifactType(event.target.value)} className="input-control">
            <option value="reference">{t("taskAttachments.reference")}</option>
            <option value="source">{t("taskAttachments.source")}</option>
            <option value="deliverable">{t("taskAttachments.deliverable")}</option>
            <option value="output">{t("taskAttachments.output")}</option>
          </select>
          <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-[var(--text-dim)]">
                {selectedFile
                  ? t("taskAttachments.fileSelected", { name: selectedFile.name })
                  : actorType === "agent"
                    ? t("taskAttachments.agentUploadHint")
                    : t("taskAttachments.localUploadHint")}
              </span>
            <AppButton tone="secondary" className="px-3 py-2" disabled={isPending || isUploading} onClick={upload}>
              {isPending || isUploading ? t("taskAttachments.uploading") : t("taskAttachments.uploadFile")}
            </AppButton>
          </div>
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
