export type NavItem = {
  label: string;
  icon: string;
  href: string;
  count?: string;
};

export type WorkspaceSummary = {
  slug?: string;
  name: string;
  plan: string;
  progress: string;
};

export type ShellCounts = {
  myTasks: string;
  projects: string;
  members: string;
  queues: string;
};

export type WorkspaceOption = {
  slug: string;
  name: string;
  plan: string;
  progress: string;
  memberCount: number;
  projectCount: number;
};

export type ContextBlock = {
  title: string;
  summary: string;
  bullets: string[];
};

export type Metric = {
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "accent" | "success" | "warning";
};

export type ProjectSummary = {
  slug: string;
  name: string;
  description: string;
  status: "On track" | "At risk" | "Needs review";
  lifecycle?: "Active" | "Archived";
  visibility?: "Workspace" | "Project members";
  contextSummary: string;
  due: string;
  members: number;
  open: number;
  review: number;
  blocked: number;
  completed: number;
  completionRate: string;
};

export type Member = {
  id: string;
  name: string;
  type: "Human" | "Agent";
  role: string;
  workspaceRole?: "Owner" | "Admin" | "Member" | "Viewer";
  email?: string;
  avatarUrl?: string;
  capabilities?: string[];
  agentPermissions?: string[];
  active: boolean;
  load: string;
  projects: string[];
  taskCount?: number;
};

export type TaskRecord = {
  id: string;
  title: string;
  projectSlug: string;
  project: string;
  description: string;
  status: "Todo" | "In Progress" | "In Review" | "Blocked" | "Done";
  priority: "Low" | "Medium" | "High" | "Urgent";
  assignee: string;
  assigneeType: "Human" | "Agent";
  rawStatus?: "Todo" | "In Progress" | "In Review" | "Blocked" | "Done";
  rawAssigneeType?: "Human" | "Agent";
  assigneeSourceSystem?: string | null;
  reviewer?: string;
  due: string;
  startDate: string;
  tags: string[];
  effort: "XS" | "S" | "M" | "L";
  contextHint: string;
  parentTaskId?: string;
  parentTaskTitle?: string;
  childCount?: number;
  blockedReason?: string;
  dueAt?: string;
  startAt?: string;
  createdAt?: string;
  updatedAt?: string;
  assigneeCapabilities?: string[];
  assigneeEnabled?: boolean;
  assigneePermissions?: string[];
  humanTransitionOptions?: Array<{
    value: "todo" | "in_progress" | "review" | "blocked" | "done";
    label: string;
  }>;
  transitionOptions?: Array<{
    value: "todo" | "in_progress" | "review" | "blocked" | "done";
    label: string;
  }>;
};

export type WatcherRecord = {
  id: string;
  name: string;
  type: "Human" | "Agent";
};

export type AttachmentRecord = {
  id: string;
  name: string;
  mimeType: string;
  artifactType: string;
  sizeLabel: string;
  href: string;
  previewHref?: string;
  previewKind?: "image" | "document" | "text";
  previewable?: boolean;
  uploadedAt: string;
  author?: string;
};

export type Comment = {
  id: string;
  taskId: string;
  author: string;
  role: string;
  tone: "human" | "agent";
  body: string;
  time: string;
  editedAt?: string;
};

export type TimelineEvent = {
  taskId: string;
  label: string;
  detail: string;
  time: string;
};

export type ActivityFeedItem = {
  id?: string;
  label: string;
  detail: string;
  time: string;
};

export const workspaceSummary: WorkspaceSummary = {
  slug: "north-star-lab",
  name: "Main Workspace",
  plan: "Owner workspace",
  progress: "No active projects"
};

export const workspaceContext: ContextBlock = {
  title: "Workspace context",
  summary: "Define how this workspace operates before projects, tasks, and agents start using it.",
  bullets: [
    "Keep workspace rules short enough to inherit into projects.",
    "Use this area for norms around ownership, review, and documentation."
  ]
};

export const primaryNav: NavItem[] = [
  { label: "Projects", icon: "folder", href: "/projects", count: "0" },
  { label: "My Tasks", icon: "stack", href: "/my-tasks", count: "0" },
  { label: "Members", icon: "users", href: "/members", count: "0" },
  { label: "Settings", icon: "settings", href: "/manage-workspace" }
];

export const secondaryNav: NavItem[] = [
  { label: "Queue", icon: "inbox", href: "/queue", count: "0" },
  { label: "Sign In", icon: "inbox", href: "/sign-in" }
];

export const signInHighlights = [
  "Workspace-aware task management",
  "Shared human and agent operations",
  "Comments, activity, and execution kept separate"
];

export const activityFeed: ActivityFeedItem[] = [];

export const agentDocsSections: ContextBlock[] = [
  {
    title: "Core resources",
    summary: "Agents should work against stable resources instead of scraping UI surfaces.",
    bullets: [
      "Workspace: settings, context, members, shared files",
      "Project: governance, membership, status, task collection",
      "Task: metadata, comments, activity, execution, attachments",
      "Execution: status, logs, summary, blocked reason"
    ]
  },
  {
    title: "Agent workflow",
    summary: "Keep the autonomous loop simple, scoped, and auditable.",
    bullets: [
      "Read the task with inherited workspace and project context",
      "Start work only when permissions and visibility allow it",
      "Write execution logs without mixing into human comments",
      "Hand back for review, block, or complete with a clear summary"
    ]
  },
  {
    title: "Documentation expectations",
    summary: "Contracts should stay additive, explicit, and easy for both humans and agents to inspect.",
    bullets: [
      "Stable endpoint contracts and example payload shapes",
      "Explicit actor rules and allowed transitions",
      "Error semantics that autonomous clients can recover from",
      "Clear separation between comments, activity, and execution logs"
    ]
  }
];
