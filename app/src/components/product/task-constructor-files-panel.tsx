"use client";

import { ChangeEvent, DragEvent, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/product/i18n-provider";
import { AppButton } from "@/components/ui/primitives";
import { DownloadIcon, PaperclipIcon, RefreshIcon, TrashIcon, UploadIcon } from "@/components/ui/icons";

type ConstructorFileRecord = {
  id: string;
  fileName: string;
  mediaType: string | null;
  sizeBytes: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  kind: "input" | "output";
  active: boolean;
};

type ConstructorFilesPayload = {
  constructor: {
    state: "ready" | "disabled" | "not_configured" | "api_token_required" | "task_files_disabled";
    available: boolean;
    externalTaskId: string;
    message: string | null;
    capabilities: {
      taskFilesEnabled: boolean | null;
      uploadMaxBytes: number | null;
      uploadTransport: string | null;
      checkedAt: string | null;
    };
  };
  files: {
    inputs: ConstructorFileRecord[];
    outputs: ConstructorFileRecord[];
  };
};

type DownloadState = {
  active: boolean;
  progress: number | null;
};

function formatBytes(value: number | null, fallback: string) {
  if (value === null || !Number.isFinite(value)) {
    return fallback;
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatBinaryLimit(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    const kib = value / 1024;
    return `${kib >= 10 ? kib.toFixed(0) : kib.toFixed(1)} KiB`;
  }

  if (value < 1024 * 1024 * 1024) {
    const mib = value / (1024 * 1024);
    return `${mib >= 10 ? mib.toFixed(0) : mib.toFixed(1)} MiB`;
  }

  const gib = value / (1024 * 1024 * 1024);
  return `${gib >= 10 ? gib.toFixed(0) : gib.toFixed(1)} GiB`;
}

function parseDownloadName(headerValue: string | null, fallback: string) {
  if (!headerValue) {
    return fallback;
  }

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const filenameMatch = headerValue.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1] ?? fallback;
}

async function readFileAsBase64(file: File, onProgress: (progress: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("read_failed"));
    reader.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress(Math.max(5, Math.min(35, Math.round((event.loaded / event.total) * 35))));
    };
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, base64 = ""] = result.split(",", 2);
      resolve(base64);
    };

    reader.readAsDataURL(file);
  });
}

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

function formatTimestamp(value: string | null, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value ?? Date.now())
  );
}

export function TaskConstructorFilesPanel({
  taskId
}: {
  taskId: string;
}) {
  const { t, locale } = useI18n();
  const [data, setData] = useState<ConstructorFilesPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [downloadState, setDownloadState] = useState<Record<string, DownloadState>>({});
  const uploadMaxBytes = data?.constructor.capabilities.uploadMaxBytes ?? null;
  const uploadLimitLabel = uploadMaxBytes !== null ? formatBinaryLimit(uploadMaxBytes) : null;
  const selectedFileTooLarge = Boolean(selectedFile && uploadMaxBytes !== null && selectedFile.size > uploadMaxBytes);

  function updateSelectedFile(file: File | null) {
    setSelectedFile(file);
    setNotice(null);

    if (!file) {
      setPanelError(null);
      return;
    }

    if (uploadLimitLabel && uploadMaxBytes !== null && file.size > uploadMaxBytes) {
      setPanelError(t("constructorFiles.fileTooLargeSelected", { limit: uploadLimitLabel }));
      return;
    }

    setPanelError(null);
  }

  async function loadFiles(options?: { silent?: boolean }) {
    if (options?.silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}/constructor/files`, {
        method: "GET",
        cache: "no-store"
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            data?: ConstructorFilesPayload;
            error?: {
              message?: string;
            };
          }
        | null;

      if (!response.ok || !payload?.ok || !payload.data) {
        throw new Error(payload?.error?.message ?? t("constructorFiles.loadFailed"));
      }

      setData(payload.data);
      setPanelError(null);
    } catch (loadError) {
      setPanelError(loadError instanceof Error ? loadError.message : t("constructorFiles.loadFailed"));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadFiles();
  }, [taskId]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
    setNotice(null);
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(true);
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setIsDragActive(false);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    updateSelectedFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function uploadSelectedFile() {
    if (!selectedFile) {
      setPanelError(t("constructorFiles.chooseFileBeforeUploading"));
      return;
    }

    if (selectedFileTooLarge) {
      setPanelError(
        t("constructorFiles.fileTooLargeSelected", {
          limit: uploadLimitLabel ?? formatBytes(uploadMaxBytes, t("constructorFiles.unknownSize"))
        })
      );
      return;
    }

    setPanelError(null);
    setIsUploading(true);
    setUploadProgress(5);

    try {
      const contentBase64 = await readFileAsBase64(selectedFile, setUploadProgress);

      const responsePayload = await new Promise<{
        status: number;
        payload: {
          ok?: boolean;
          data?: {
            deduplicated?: boolean;
          };
          error?: {
            message?: string;
          };
        } | null;
      }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/tasks/${taskId}/constructor/files`);
        xhr.setRequestHeader("content-type", "application/json");
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) {
            return;
          }

          const networkProgress = Math.round((event.loaded / event.total) * 65);
          setUploadProgress(Math.min(99, 35 + networkProgress));
        };
        xhr.onerror = () => reject(new Error(t("constructorFiles.uploadFailed")));
        xhr.onload = () => {
          const payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
          resolve({ status: xhr.status, payload });
        };
        xhr.send(
          JSON.stringify({
            fileName: selectedFile.name,
            contentBase64,
            contentType: selectedFile.type || "application/octet-stream"
          })
        );
      });

      if (!responsePayload.payload?.ok) {
        throw new Error(responsePayload.payload?.error?.message ?? t("constructorFiles.uploadFailed"));
      }

      setUploadProgress(100);
      setNotice(
        responsePayload.status === 200 || responsePayload.payload.data?.deduplicated
          ? t("constructorFiles.deduplicatedNotice", { name: selectedFile.name })
          : t("constructorFiles.uploadComplete", { name: selectedFile.name })
      );
      setSelectedFile(null);
      await loadFiles({ silent: true });
    } catch (uploadError) {
      setPanelError(uploadError instanceof Error ? uploadError.message : t("constructorFiles.uploadFailed"));
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }

  async function downloadFile(file: ConstructorFileRecord) {
    setPanelError(null);
    setDownloadState((current) => ({
      ...current,
      [file.id]: { active: true, progress: 0 }
    }));

    try {
      const response = await fetch(`/api/tasks/${taskId}/constructor/files/${file.id}/download`, {
        method: "GET"
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | {
              error?: {
                message?: string;
              };
            }
          | null;
        throw new Error(payload?.error?.message ?? t("constructorFiles.downloadFailed"));
      }

      const totalBytes = Number(response.headers.get("content-length") || "0");
      const fileName = parseDownloadName(response.headers.get("content-disposition"), file.fileName);

      if (!response.body) {
        triggerBrowserDownload(await response.blob(), fileName);
      } else {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

        while (true) {
          const result = await reader.read();

          if (result.done) {
            break;
          }

          chunks.push(result.value);
          received += result.value.length;
          setDownloadState((current) => ({
            ...current,
            [file.id]: {
              active: true,
              progress: totalBytes ? Math.min(100, Math.round((received / totalBytes) * 100)) : null
            }
          }));
        }

        const blobParts = chunks.map((chunk) => {
          const bytes = new Uint8Array(chunk.byteLength);
          bytes.set(chunk);
          return bytes.buffer;
        });

        triggerBrowserDownload(
          new Blob(blobParts, { type: response.headers.get("content-type") || file.mediaType || undefined }),
          fileName
        );
      }
    } catch (downloadError) {
      setPanelError(downloadError instanceof Error ? downloadError.message : t("constructorFiles.downloadFailed"));
    } finally {
      setDownloadState((current) => ({
        ...current,
        [file.id]: { active: false, progress: null }
      }));
    }
  }

  async function removeInputFile(fileId: string) {
    setPanelError(null);
    setDeletingId(fileId);

    try {
      const response = await fetch(`/api/tasks/${taskId}/constructor/files/${fileId}`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: {
              message?: string;
            };
          }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? t("constructorFiles.deleteFailed"));
      }

      setNotice(t("constructorFiles.inputRemoved"));
      setConfirmDeleteId(null);
      await loadFiles({ silent: true });
    } catch (deleteError) {
      setPanelError(deleteError instanceof Error ? deleteError.message : t("constructorFiles.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  const inputs = data?.files.inputs ?? [];
  const constructorState = data?.constructor;

  if (isLoading && !data) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-3xl bg-[linear-gradient(135deg,rgba(37,99,235,0.08),rgba(15,23,42,0.05))]" />
        <div className="h-32 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-32 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      {panelError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {panelError}
        </div>
      ) : null}

      {constructorState && !constructorState.available ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4">
          <p className="text-sm font-semibold text-slate-900">
            {constructorState.state === "disabled"
              ? t("constructorFiles.disabledTitle")
              : constructorState.state === "task_files_disabled"
                ? t("constructorFiles.taskFilesDisabledTitle")
              : constructorState.state === "not_configured"
                ? t("constructorFiles.notConfiguredTitle")
                : t("constructorFiles.apiTokenRequiredTitle")}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{constructorState.message ?? t("constructorFiles.loadFailed")}</p>
        </div>
      ) : (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "overflow-hidden rounded-2xl border bg-white transition",
            isDragActive
              ? "border-sky-400 bg-sky-50 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.18)]"
              : inputs.length || selectedFile
                ? "border-slate-200"
                : "border-dashed border-slate-300 bg-slate-50"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <PaperclipIcon className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="text-sm font-semibold text-slate-950">{t("taskWorkspace.attachments")}</span>
                {inputs.length ? (
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    {inputs.length}
                  </span>
                ) : null}
              </div>
              {uploadLimitLabel ? (
                <p className="mt-1 text-xs text-slate-500">{t("constructorFiles.maxFileSizeLabel", { value: uploadLimitLabel })}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {inputs.length ? (
                <button
                  type="button"
                  onClick={() => void loadFiles({ silent: true })}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                  aria-label={isRefreshing ? t("constructorFiles.refreshing") : t("constructorFiles.refresh")}
                  title={isRefreshing ? t("constructorFiles.refreshing") : t("constructorFiles.refresh")}
                >
                  <RefreshIcon className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                </button>
              ) : null}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
                <UploadIcon className="h-4 w-4" />
                {t("constructorFiles.addAttachment")}
                <input type="file" className="hidden" onChange={onFileChange} />
              </label>
            </div>
          </div>

          {selectedFile ? (
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{selectedFile.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatBytes(selectedFile.size, t("constructorFiles.unknownSize"))} · {selectedFile.type || t("constructorFiles.mediaTypeFallback")}
                  </p>
                  {selectedFileTooLarge && uploadLimitLabel ? (
                    <p className="mt-1 text-xs font-medium text-rose-700">
                      {t("constructorFiles.fileTooLargeSelected", { limit: uploadLimitLabel })}
                    </p>
                  ) : null}
                </div>
                <AppButton tone="primary" className="gap-2" disabled={isUploading || selectedFileTooLarge} onClick={() => void uploadSelectedFile()}>
                  <UploadIcon className="h-4 w-4" />
                  {isUploading ? t("constructorFiles.uploading") : t("taskAttachments.uploadFile")}
                </AppButton>
              </div>

              {isUploading && uploadProgress !== null ? (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{t("constructorFiles.uploading")}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-[linear-gradient(90deg,#0f172a,#2563eb,#38bdf8)] transition-[width] duration-200" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {inputs.length ? (
            <div className="divide-y divide-slate-200 border-t border-slate-200">
              {inputs.map((file) => {
                const download = downloadState[file.id] ?? { active: false, progress: null };
                const isConfirmingDelete = confirmDeleteId === file.id;

                return (
                  <div key={file.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-950">{file.fileName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatBytes(file.sizeBytes, t("constructorFiles.unknownSize"))} · {file.mediaType || t("constructorFiles.mediaTypeFallback")} · {formatTimestamp(file.updatedAt ?? file.createdAt, locale)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void downloadFile(file)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                      >
                        <DownloadIcon className="h-3.5 w-3.5" />
                        {download.active
                          ? download.progress === null
                            ? t("constructorFiles.downloading")
                            : t("constructorFiles.downloadingProgress", { value: String(download.progress) })
                          : t("constructorFiles.download")}
                      </button>
                      {!isConfirmingDelete ? (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(file.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          {t("constructorFiles.remove")}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => void removeInputFile(file.id)}
                            disabled={deletingId === file.id}
                            className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-800 transition hover:bg-rose-100 disabled:opacity-60"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                            {deletingId === file.id ? t("constructorFiles.removing") : t("constructorFiles.confirmRemove")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                          >
                            {t("constructorFiles.keepFile")}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}