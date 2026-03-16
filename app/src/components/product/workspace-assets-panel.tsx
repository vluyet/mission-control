"use client";

import { ChangeEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AttachmentRecord } from "@/lib/demo-data";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";
import { ArrowUpRightIcon, PaperclipIcon } from "@/components/ui/icons";

export function WorkspaceAssetsPanel({
  assets
}: {
  assets: AttachmentRecord[];
}) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [assetType, setAssetType] = useState("reference");
  const [expandedPreviewId, setExpandedPreviewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  async function upload() {
    if (!selectedFile) {
      setError("Choose a file before uploading.");
      return;
    }

    setError(null);
    setIsUploading(true);
    const formData = new FormData();
    formData.set("file", selectedFile);
    formData.set("assetType", assetType);

    const response = await fetch("/api/workspaces/current/assets", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setIsUploading(false);
      setError(payload?.error?.message ?? "File upload failed.");
      return;
    }

    setSelectedFile(null);
    startTransition(() => {
      router.refresh();
    });
    setIsUploading(false);
  }

  return (
    <Panel className="overflow-hidden">
      <PanelHeader eyebrow="Workspace files" title="Shared documents" />
      <div className="space-y-4 px-5 py-5">
        {assets.length ? (
          <div className="space-y-3">
            {assets.map((asset) => (
              <div key={asset.id} className="rounded-2xl border border-[var(--line)] bg-white px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <PaperclipIcon className="h-4 w-4 text-[var(--text-dim)]" />
                      <p className="truncate text-sm font-medium text-[var(--text-strong)]">{asset.name}</p>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">
                      {asset.artifactType} · {asset.sizeLabel} · {asset.author ?? "Unknown"} · {asset.uploadedAt}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {asset.previewable ? (
                      <button
                        type="button"
                        onClick={() => setExpandedPreviewId((current) => (current === asset.id ? null : asset.id))}
                        className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs text-[var(--text-dim)] transition hover:border-[var(--line-strong)] hover:text-[var(--text-strong)]"
                      >
                        {expandedPreviewId === asset.id ? "Hide preview" : "Preview"}
                      </button>
                    ) : (
                      <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs text-[var(--text-dim)]">
                        Download only
                      </span>
                    )}
                    <a href={asset.href} className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs text-[var(--text-dim)] transition hover:border-[var(--line-strong)] hover:text-[var(--text-strong)]">
                      Download
                    </a>
                    <ArrowUpRightIcon className="h-4 w-4 text-[var(--text-dim)]" />
                  </div>
                </div>
                {expandedPreviewId === asset.id && asset.previewable && asset.previewHref ? (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)]">
                    {asset.previewKind === "image" ? (
                      <img src={asset.previewHref} alt={asset.name} className="max-h-[320px] w-full object-contain bg-white" />
                    ) : (
                      <iframe src={asset.previewHref} title={asset.name} className="h-[260px] w-full bg-white" />
                    )}
                  </div>
                ) : null}
                {!asset.previewable ? (
                  <div className="mt-3 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-xs text-[var(--text-dim)]">
                    Preview is unavailable for this format. Download the file to inspect it.
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-subtle)] px-4 py-5">
            <h3 className="text-sm font-semibold text-[var(--text-strong)]">No shared documents</h3>
            <p className="mt-1 text-sm text-[var(--text-dim)]">
              Upload policies, briefs, and playbooks here so projects do not need to duplicate them.
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-white px-3 py-3">
          <div className="grid gap-3">
            <input type="file" onChange={handleFileChange} className="text-sm text-[var(--text-muted)]" />
            <select value={assetType} onChange={(event) => setAssetType(event.target.value)} className="input-control">
              <option value="reference">Reference</option>
              <option value="policy">Policy</option>
              <option value="playbook">Playbook</option>
              <option value="brief">Brief</option>
            </select>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-[var(--text-dim)]">
                {selectedFile ? `${selectedFile.name} selected` : "Shared files live at workspace scope, not on a single task."}
              </span>
              <AppButton tone="secondary" className="px-3 py-2" disabled={isPending || isUploading} onClick={upload}>
                {isPending || isUploading ? "Uploading..." : "Upload file"}
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
    </Panel>
  );
}
