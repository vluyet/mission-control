"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useTransition } from "react";
import { primaryNav, secondaryNav, ShellCounts, workspaceSummary, WorkspaceOption, WorkspaceSummary } from "@/lib/demo-data";
import type { DeploymentMetadata } from "@/lib/runtime-metadata";
import {
  BellIcon,
  BoardIcon,
  BookIcon,
  ChevronDownIcon,
  FolderIcon,
  HomeIcon,
  InboxIcon,
  PulseIcon,
  SettingsIcon,
  SparkIcon,
  StackIcon,
  UsersIcon
} from "@/components/ui/icons";
import { AppButton } from "@/components/ui/primitives";
import { GlobalSearchBar } from "@/components/product/global-search-bar";

function iconFor(name: string) {
  switch (name) {
    case "home":
      return <HomeIcon className="h-4 w-4" />;
    case "inbox":
      return <InboxIcon className="h-4 w-4" />;
    case "stack":
      return <StackIcon className="h-4 w-4" />;
    case "folder":
      return <FolderIcon className="h-4 w-4" />;
    case "board":
      return <BoardIcon className="h-4 w-4" />;
    case "users":
      return <UsersIcon className="h-4 w-4" />;
    case "pulse":
      return <PulseIcon className="h-4 w-4" />;
    case "spark":
      return <SparkIcon className="h-4 w-4" />;
    case "book":
      return <BookIcon className="h-4 w-4" />;
    case "settings":
      return <SettingsIcon className="h-4 w-4" />;
    default:
      return <HomeIcon className="h-4 w-4" />;
  }
}

function matchesPath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getSectionLabel(pathname: string) {
  if (pathname === "/") {
    return "Home";
  }

  if (pathname.startsWith("/projects")) {
    return "Projects";
  }

  if (pathname.startsWith("/tasks")) {
    return "Task";
  }

  if (pathname === "/my-tasks") {
    return "My Tasks";
  }

  if (pathname === "/members") {
    return "Members";
  }

  if (pathname === "/activity") {
    return "Activity";
  }

  if (pathname === "/queue") {
    return "Queues";
  }

  if (pathname.startsWith("/docs/agents")) {
    return "Agent Docs";
  }

  if (pathname === "/manage-workspace") {
    return "Manage Workspace";
  }

  if (pathname === "/search") {
    return "Search";
  }

  return "Workspace";
}

function getWorkspaceDestination(pathname: string) {
  if (
    pathname === "/" ||
    pathname === "/projects" ||
    pathname === "/members" ||
    pathname === "/activity" ||
    pathname === "/queue" ||
    pathname === "/my-tasks" ||
    pathname === "/search" ||
    pathname.startsWith("/docs/agents")
  ) {
    return pathname;
  }

  return "/projects";
}

export function ProductShell({
  children,
  currentWorkspace = workspaceSummary,
  workspaces = [],
  shellCounts = {
    myTasks: primaryNav.find((item) => item.href === "/my-tasks")?.count ?? "0",
    projects: primaryNav.find((item) => item.href === "/projects")?.count ?? "0",
    members: primaryNav.find((item) => item.href === "/members")?.count ?? "0",
    queues: secondaryNav.find((item) => item.href === "/queue")?.count ?? "0"
  },
  activeTaskHref = "/projects",
  deployment
}: {
  children: ReactNode;
  currentWorkspace?: WorkspaceSummary;
  workspaces?: WorkspaceOption[];
  shellCounts?: ShellCounts;
  activeTaskHref?: string;
  deployment?: DeploymentMetadata;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const sectionLabel = getSectionLabel(pathname);
  const activeTaskLabel = activeTaskHref.startsWith("/tasks/") || activeTaskHref.includes("/tasks/")
    ? "Open active task"
    : activeTaskHref === "/projects"
      ? "Open projects"
      : activeTaskHref === "/manage-workspace"
        ? "Manage workspace"
        : "Open workspace";
  const primaryItems = primaryNav.map((item) => ({
    ...item,
    count:
      item.href === "/my-tasks"
        ? shellCounts.myTasks
        : item.href === "/projects"
          ? shellCounts.projects
          : item.href === "/members"
            ? shellCounts.members
            : item.count
  }));
  const secondaryItems = secondaryNav
    .filter((item) => item.href !== "/sign-in")
    .map((item) => ({
      ...item,
      count: item.href === "/queue" ? shellCounts.queues : item.count
    }));

  function handleSignOut() {
    startTransition(async () => {
      await fetch("/api/auth/sign-out", {
        method: "POST"
      });

      router.replace("/sign-in");
      router.refresh();
    });
  }

  function handleWorkspaceChange(slug: string) {
    if (slug === currentWorkspace.slug) {
      return;
    }

    startTransition(async () => {
      await fetch("/api/workspaces/active", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ slug })
      });

      const nextPath = getWorkspaceDestination(pathname);

      router.replace(nextPath);
      router.refresh();
    });
  }

  return (
    <div className="product-app">
      <div className="product-bg-orb product-bg-orb-a" />
      <div className="product-bg-orb product-bg-orb-b" />
      <div className="product-bg-orb product-bg-orb-c" />

      <div className="product-layout">
        <aside className="product-sidebar product-sidebar-fixed">
          <div className="sidebar-brand">
            <div className="sidebar-brand-mark">
              <SparkIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="sidebar-brand-title">Mission Control</p>
              <p className="sidebar-brand-subtitle">Workspace operations</p>
            </div>
          </div>

          <div className="sidebar-workspace-block">
            {workspaces.length ? (
              <div>
                <label className="sidebar-select-label" htmlFor="workspace-switcher">
                  Workspace
                </label>
                <div className="workspace-select-wrap">
                  <select
                    id="workspace-switcher"
                    className="workspace-select"
                    value={currentWorkspace.slug ?? workspaces[0]?.slug ?? ""}
                    onChange={(event) => handleWorkspaceChange(event.target.value)}
                    disabled={isPending}
                  >
                    {workspaces.map((workspace) => (
                      <option key={workspace.slug} value={workspace.slug}>
                        {workspace.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/46" />
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <p className="sidebar-section-label">Core navigation</p>
            <nav className="mt-3 space-y-1">
              {primaryItems.map((item) => {
                const active = matchesPath(pathname, item.href);
                return (
                  <Link key={item.href} href={item.href} className={`nav-item ${active ? "nav-item-active" : "nav-item-idle"}`}>
                    <span className="inline-flex items-center gap-3">
                      <span className="nav-icon">{iconFor(item.icon)}</span>
                      <span>{item.label}</span>
                    </span>
                    {item.count ? <span className="nav-count">{item.count}</span> : null}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-6">
            <p className="sidebar-section-label">Operations</p>
            <nav className="mt-3 space-y-1">
              {secondaryItems.map((item) => {
                const active = matchesPath(pathname, item.href);
                return (
                  <Link key={item.href} href={item.href} className={`nav-item ${active ? "nav-item-active" : "nav-item-idle"}`}>
                    <span className="inline-flex items-center gap-3">
                      <span className="nav-icon">{iconFor(item.icon)}</span>
                      <span>{item.label}</span>
                    </span>
                    {item.count ? <span className="nav-count">{item.count}</span> : null}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="sidebar-footer">
            <div className="sidebar-footer-badge">
              <SparkIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="sidebar-footer-title">Automation ready</p>
              <p className="sidebar-footer-text">{shellCounts.queues} queued items in the active workspace</p>
            </div>
          </div>
        </aside>

        <main className="product-main">
          <div className="product-utilitybar-shell">
            <div className="product-utilitybar">
              <div className="utilitybar-location">
                <span className="utilitybar-location-section">{sectionLabel}</span>
                {deployment ? (
                  <div className="utilitybar-deploy">
                    <span className="utilitybar-deploy-pill utilitybar-deploy-pill-strong">{deployment.version}</span>
                    {deployment.branch ? <span className="utilitybar-deploy-pill">{deployment.branch}</span> : null}
                    {deployment.shortCommit ? <span className="utilitybar-deploy-pill">{deployment.shortCommit}</span> : null}
                  </div>
                ) : null}
              </div>

              <div className="utilitybar-controls">
                <div className="utilitybar-search">
                  <GlobalSearchBar />
                </div>
                <button type="button" className="chrome-button" aria-label="Notifications">
                  <BellIcon className="h-4 w-4" />
                </button>
                <AppButton tone="ghost" className="utilitybar-link-button" disabled={isPending} onClick={handleSignOut}>
                  {isPending ? "Signing out..." : "Sign out"}
                </AppButton>
                <Link href={activeTaskHref}>
                  <AppButton tone="primary" className="utilitybar-primary-button">
                    {activeTaskLabel}
                  </AppButton>
                </Link>
              </div>
            </div>
          </div>
          <div className="product-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
