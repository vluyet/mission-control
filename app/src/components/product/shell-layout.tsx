"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useTransition } from "react";
import { primaryNav, secondaryNav, ShellCounts, workspaceSummary, WorkspaceOption, WorkspaceSummary } from "@/lib/demo-data";
import type { DeploymentMetadata } from "@/lib/runtime-metadata";
import { ChevronDownIcon, FolderIcon, HomeIcon, InboxIcon, LogOutIcon, SettingsIcon, SparkIcon, StackIcon, UsersIcon } from "@/components/ui/icons";

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
    case "users":
      return <UsersIcon className="h-4 w-4" />;
    case "spark":
      return <SparkIcon className="h-4 w-4" />;
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

function getWorkspaceDestination(pathname: string) {
  if (pathname === "/projects" || pathname === "/members" || pathname === "/my-tasks" || pathname === "/manage-workspace") {
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
  activeTaskHref: _activeTaskHref = "/projects",
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
  const secondaryItems = secondaryNav.filter((item) => item.href !== "/sign-in");

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
            <p className="sidebar-section-label">Navigation</p>
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

          {secondaryItems.length ? (
            <div className="mt-6">
              <p className="sidebar-section-label">Secondary</p>
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
          ) : null}

          <div className="mt-auto pt-6">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isPending}
              className="nav-item nav-item-idle w-full text-left transition hover:border-[rgba(244,63,94,0.24)] hover:bg-[rgba(244,63,94,0.08)] hover:text-rose-700 disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-3">
                <span className="nav-icon">
                  <LogOutIcon className="h-4 w-4" />
                </span>
                <span>{isPending ? "Signing out..." : "Sign out"}</span>
              </span>
            </button>
            {deployment?.version ? <p className="px-2 pt-3 text-[11px] text-white/42">Version {deployment.version}</p> : null}
          </div>
        </aside>

        <main className="product-main">
          <div className="product-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
