import type { Translator } from "@/lib/i18n/translator";

const SYSTEM_OWNER_NAMES = new Set([
  "Workspace Owner",
  "Propriétaire de l’espace de travail",
  "Propriétaire de l'espace de travail"
]);

const WORKSPACE_ROLE_LABELS = {
  owner: new Set(["Owner", "Propriétaire"]),
  admin: new Set(["Admin"]),
  member: new Set(["Member", "Membre"]),
  viewer: new Set(["Viewer", "Observer", "Observateur"])
} as const;

const HUMAN_LABELS = new Set(["Human", "Humain"]);
const AGENT_LABELS = new Set(["Agent"]);

function normalizeValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function inferWorkspaceRole(label: string | null) {
  if (!label) {
    return null;
  }

  if (WORKSPACE_ROLE_LABELS.owner.has(label)) {
    return "owner";
  }

  if (WORKSPACE_ROLE_LABELS.admin.has(label)) {
    return "admin";
  }

  if (WORKSPACE_ROLE_LABELS.viewer.has(label)) {
    return "viewer";
  }

  if (WORKSPACE_ROLE_LABELS.member.has(label)) {
    return "member";
  }

  return null;
}

export function formatLocalizedWorkspaceRole(role: string | null | undefined, t: Translator) {
  switch (role) {
    case "owner":
      return t("membersServer.owner");
    case "admin":
      return t("membersServer.admin");
    case "viewer":
      return t("membersServer.viewer");
    default:
      return t("membersServer.member");
  }
}

export function localizeLooseRoleLabel(roleLabel: string | null | undefined, t: Translator) {
  const normalized = normalizeValue(roleLabel);

  if (!normalized) {
    return t("membersServer.member");
  }

  const workspaceRole = inferWorkspaceRole(normalized);
  if (workspaceRole) {
    return formatLocalizedWorkspaceRole(workspaceRole, t);
  }

  if (AGENT_LABELS.has(normalized)) {
    return t("membersServer.agent");
  }

  if (HUMAN_LABELS.has(normalized)) {
    return t("membersServer.human");
  }

  return normalized;
}

export function localizeMemberRoleLabel(
  member: { roleLabel?: string | null; workspaceRole?: string | null; kind?: string | null },
  t: Translator
) {
  const normalized = normalizeValue(member.roleLabel);

  if (member.kind === "agent") {
    return !normalized || AGENT_LABELS.has(normalized) ? t("membersServer.agent") : normalized;
  }

  const inferredWorkspaceRole = inferWorkspaceRole(normalized);
  if (inferredWorkspaceRole) {
    return formatLocalizedWorkspaceRole(member.workspaceRole ?? inferredWorkspaceRole, t);
  }

  if (!normalized || HUMAN_LABELS.has(normalized)) {
    return formatLocalizedWorkspaceRole(member.workspaceRole, t);
  }

  return normalized;
}

export function localizeSystemMemberName(name: string | null | undefined, t: Translator) {
  const normalized = normalizeValue(name);

  if (!normalized) {
    return undefined;
  }

  return SYSTEM_OWNER_NAMES.has(normalized) ? t("taskServer.workspaceOwner") : normalized;
}