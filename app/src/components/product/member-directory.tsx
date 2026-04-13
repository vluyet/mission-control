import { Member } from "@/lib/demo-data";
import Link from "next/link";
import { Panel, PanelHeader } from "@/components/ui/primitives";
import { AgentEnabledToggle } from "@/components/product/agent-enabled-toggle";

function MemberTypeBadge({ type }: { type: Member["type"] }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
        type === "Agent"
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      {type}
    </span>
  );
}

function MemberStateBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      {active ? "Enabled" : "Disabled"}
    </span>
  );
}

export function MemberDirectory({ items }: { items: Member[] }) {
  const humanCount = items.filter((member) => member.type === "Human").length;
  const agentCount = items.filter((member) => member.type === "Agent").length;

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow="Directory"
        title="Workspace members"
        description={`Compact member directory with ${humanCount} human${humanCount === 1 ? "" : "s"} and ${agentCount} agent${agentCount === 1 ? "" : "s"}.`}
      />
      {!items.length ? (
        <div className="border-t border-[var(--line)] px-5 py-5">
          <div className="rounded-3xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-subtle)] p-5">
            <h3 className="text-sm font-semibold text-[var(--text-strong)]">No members yet</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
              Add people or sync agents before assigning work. Once members exist, this page becomes the quickest way to scan who is available.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/manage-workspace"
                className="inline-flex items-center rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:border-[var(--line-strong)]"
              >
                Manage workspace
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="task-table-header">
            <span>Member</span>
            <span>Type</span>
            <span>Load</span>
            <span>Projects</span>
            <span>State</span>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {items.map((member) => (
              <div key={member.id} className="task-row">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.name} className="h-10 w-10 rounded-2xl border border-[var(--line)] object-cover" />
                    ) : (
                      <span className={`avatar-chip h-10 w-10 rounded-2xl ${member.type === "Agent" ? "avatar-chip-agent" : ""}`}>
                        {member.name.slice(0, 2)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-[var(--text-strong)]">{member.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-dim)]">
                        <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-1">
                          {member.role}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-start">
                  <MemberTypeBadge type={member.type} />
                </div>
                <div className="text-sm font-medium text-[var(--text-strong)]">{member.load}</div>
                <div className="flex flex-wrap gap-2 text-xs text-[var(--text-dim)]">
                  {member.projects.length ? (
                    <>
                      {member.projects.slice(0, 2).map((project) => (
                        <span key={project} className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-1">
                          {project}
                        </span>
                      ))}
                      {member.projects.length > 2 ? <span>+{member.projects.length - 2}</span> : null}
                    </>
                  ) : (
                    <span>No projects</span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2">
                  {member.type === "Agent" ? <AgentEnabledToggle memberId={member.id} enabled={member.active} /> : null}
                  <MemberStateBadge active={member.active} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
