import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ATTACHMENT_ROOT = path.join(process.cwd(), "storage", "task-attachments");
const WORKSPACE_ASSET_ROOT = path.join(process.cwd(), "storage", "workspace-assets");

function sanitizeFilename(filename: string) {
  const cleaned = filename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned || "attachment";
}

export function getAttachmentStoragePath(relativePath: string) {
  return path.join(ATTACHMENT_ROOT, relativePath);
}

export async function ensureAttachmentStorageRoot() {
  await mkdir(ATTACHMENT_ROOT, { recursive: true });
  return ATTACHMENT_ROOT;
}

export async function ensureWorkspaceAssetStorageRoot() {
  await mkdir(WORKSPACE_ASSET_ROOT, { recursive: true });
  return WORKSPACE_ASSET_ROOT;
}

export async function clearAttachmentStorage() {
  await rm(ATTACHMENT_ROOT, { recursive: true, force: true });
  await ensureAttachmentStorageRoot();
}

export async function clearWorkspaceAssetStorage() {
  await rm(WORKSPACE_ASSET_ROOT, { recursive: true, force: true });
  await ensureWorkspaceAssetStorageRoot();
}

export async function storeAttachmentFile(taskId: string, originalName: string, bytes: Uint8Array) {
  await ensureAttachmentStorageRoot();
  const safeName = sanitizeFilename(originalName);
  const relativePath = path.join(taskId, `${Date.now()}-${crypto.randomUUID()}-${safeName}`);
  const absolutePath = getAttachmentStoragePath(relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes);

  return {
    relativePath,
    absolutePath
  };
}

export async function readAttachmentFile(relativePath: string) {
  return readFile(getAttachmentStoragePath(relativePath));
}

export function getWorkspaceAssetStoragePath(relativePath: string) {
  return path.join(WORKSPACE_ASSET_ROOT, relativePath);
}

export async function storeWorkspaceAssetFile(workspaceSlug: string, originalName: string, bytes: Uint8Array) {
  await ensureWorkspaceAssetStorageRoot();
  const safeName = sanitizeFilename(originalName);
  const relativePath = path.join(workspaceSlug, `${Date.now()}-${crypto.randomUUID()}-${safeName}`);
  const absolutePath = getWorkspaceAssetStoragePath(relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes);

  return {
    relativePath,
    absolutePath
  };
}

export async function readWorkspaceAssetFile(relativePath: string) {
  return readFile(getWorkspaceAssetStoragePath(relativePath));
}
