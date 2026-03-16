"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";

export function ProjectCreateForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      startDate: String(formData.get("startDate") ?? ""),
      endDate: String(formData.get("endDate") ?? ""),
      visibility: String(formData.get("visibility") ?? "workspace")
    };

    if (!payload.name.trim()) {
      setError("Project name is required.");
      return;
    }

    setError(null);

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.data?.project?.slug) {
      setError("Project could not be created.");
      return;
    }

    startTransition(() => {
      router.push(`/projects/${result.data.project.slug}`);
      router.refresh();
    });
  }

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow="Create project"
        title="Start a new operational container"
        description="Keep it simple: define the project, add a short context summary, and let tasks inherit the rest later."
      />
      <form onSubmit={handleSubmit} className="grid gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1.2fr),minmax(280px,0.8fr)]">
        <div className="space-y-4">
          <div>
            <label className="section-eyebrow">Project name</label>
            <input name="name" className="input-control mt-2" placeholder="Mission Control Expansion" />
          </div>
          <div>
            <label className="section-eyebrow">Description</label>
            <textarea
              name="description"
              className="input-control mt-2 min-h-[160px] resize-none"
              placeholder="Describe the purpose, expected output, and what this project should optimize for."
            />
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
          <div>
            <label className="section-eyebrow">Start date</label>
            <input name="startDate" type="date" className="input-control mt-2" />
          </div>
          <div>
            <label className="section-eyebrow">End date</label>
            <input name="endDate" type="date" className="input-control mt-2" />
          </div>
          <div>
            <label className="section-eyebrow">Visibility</label>
            <select name="visibility" className="input-control mt-2" defaultValue="workspace">
              <option value="workspace">Visible to workspace</option>
              <option value="project_members">Visible to project members only</option>
            </select>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4 text-sm leading-7 text-[var(--text-muted)]">
            New projects start with a lightweight context block so tasks can inherit a stable working frame without adding extra ceremony. Visibility stays simple and can be tightened later from project settings.
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {error ? <span className="text-sm text-rose-600">{error}</span> : <span className="text-sm text-[var(--text-dim)]">Saved into the default workspace.</span>}
            <AppButton type="submit" tone="primary" className={isPending ? "opacity-70" : ""}>
              {isPending ? "Creating..." : "Create project"}
            </AppButton>
          </div>
        </div>
      </form>
    </Panel>
  );
}
