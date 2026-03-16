"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";

export function ProjectGovernanceForm({
  projectSlug,
  projectName,
  initialStatus,
  initialVisibility
}: {
  projectSlug: string;
  projectName: string;
  initialStatus: "active" | "archived";
  initialVisibility: "workspace" | "project_members";
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch(`/api/projects/${projectSlug}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status,
        visibility
      })
    });

    if (!response.ok) {
      setError("Project settings could not be updated.");
      return;
    }

    startTransition(() => {
      router.push(`/projects/${projectSlug}`);
      router.refresh();
    });
  }

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow="Project governance"
        title={`${projectName} settings`}
        description="Keep project access rules and lifecycle states explicit without turning governance into an admin maze."
      />
      <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
        <div className="space-y-4">
          <div>
            <label className="section-eyebrow">Visibility</label>
            <select value={visibility} onChange={(event) => setVisibility(event.target.value as "workspace" | "project_members")} className="input-control mt-2">
              <option value="workspace">Visible to workspace</option>
              <option value="project_members">Visible to project members only</option>
            </select>
            <p className="mt-2 text-sm text-[var(--text-dim)]">
              Workspace-visible projects appear to the whole workspace. Project-members-only projects are intended for scoped work.
            </p>
          </div>

          <div>
            <label className="section-eyebrow">Lifecycle</label>
            <select value={status} onChange={(event) => setStatus(event.target.value as "active" | "archived")} className="input-control mt-2">
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
            <p className="mt-2 text-sm text-[var(--text-dim)]">
              Archived projects stay accessible directly, but they drop out of the default active project list so current work stays focused.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4 text-sm leading-7 text-[var(--text-muted)]">
          Project roles stay lightweight: leads steer the project, members can own work, and observers can follow without owning tasks.
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {error ? <span className="text-sm text-rose-600">{error}</span> : <span className="text-sm text-[var(--text-dim)]">These controls are intentionally simple and API-first.</span>}
          <AppButton type="submit" tone="primary" className={isPending ? "opacity-70" : ""}>
            {isPending ? "Saving..." : "Save settings"}
          </AppButton>
        </div>
      </form>
    </Panel>
  );
}
