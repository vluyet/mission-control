import { Member } from "@/lib/demo-data";
import Link from "next/link";
import { Panel, PanelHeader } from "@/components/ui/primitives";
import { AgentEnabledToggle } from "@/components/product/agent-enabled-toggle";

export function MemberDirectory({ items }: { items: Member[] }) {
  const humanMembers = items.filter((member) => member.type === "Human");
  const agentMembers = items.filter((member) => member.type === "Agent");

  return (
    <div className="space-y-4">
      <Panel className="overflow-hidden">
        <PanelHeader eyebrow="Directory" title="Workspace members" description="A simple list of people and agents in the active workspace." />
        <div className="grid gap-3 px-5 py-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
            <p className="section-eyebrow">Total</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">{items.length}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
            <p className="section-eyebrow">Humans</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">{humanMembers.length}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
            <p className="section-eyebrow">Agents</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">{agentMembers.length}</p>
          </div>
        </div>
        {!items.length ? (
          <div className="border-t border-[var(--line)] px-5 py-5">
            <div className="rounded-3xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-subtle)] p-5">
              <h3 className="text-sm font-semibold text-[var(--text-strong)]">No members yet</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
                Add people or sync agents before assigning work. Once members exist, this page becomes the quickest way to check who is active and what they can handle.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/manage-workspace"
                  className="inline-flex items-center rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:border-[var(--line-strong)]"
                >
                  Open workspace settings
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </Panel>

      {[
        { title: "Human members", items: humanMembers, eyebrow: "Humans" },
        { title: "Agent members", items: agentMembers, eyebrow: "Agents" }
      ].map((group) => (
        <Panel key={group.title} className="overflow-hidden">
          <PanelHeader eyebrow={group.eyebrow} title={group.title} />
          <div className="grid gap-3 px-5 py-4 2xl:grid-cols-2">
            {group.items.length ? group.items.map((member) => (
              <div key={member.id} className="rounded-3xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.name} className="h-12 w-12 rounded-[18px] border border-[var(--line)] object-cover" />
                    ) : (
                      <span className={`avatar-chip h-12 w-12 rounded-[18px] ${member.type === "Agent" ? "avatar-chip-agent" : ""}`}>
                        {member.name.slice(0, 2)}
                      </span>
                    )}
                    <div>
                      <h3 className="text-base font-semibold text-[var(--text-strong)]">{member.name}</h3>
                      <p className="text-sm text-[var(--text-muted)]">
                        {member.role} · {member.type}
                      </p>
                    </div>
                  </div>
                  {member.type === "Agent" ? (
                    <AgentEnabledToggle memberId={member.id} enabled={member.active} />
                  ) : (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        member.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {member.active ? "Enabled" : "Disabled"}
                    </span>
                  )}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-dim)]">Contact</p>
                    <p className="mt-2 text-sm font-medium text-[var(--text-strong)]">
                      {member.email ?? "Agent member"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-dim)]">Current load</p>
                    <p className="mt-2 text-sm font-medium text-[var(--text-strong)]">{member.load}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {member.projects.map((project) => (
                    <span key={project} className="rounded-full border border-[var(--line)] bg-white/80 px-3 py-1.5 text-xs text-[var(--text-dim)]">
                      {project}
                    </span>
                  ))}
                </div>

                {member.capabilities?.length ? (
                  <div className="mt-4 border-t border-[var(--line)] pt-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-dim)]">Capabilities</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {member.capabilities.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-dim)]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 rounded-2xl border border-dashed border-[var(--line)] bg-white/70 px-3 py-3 text-sm text-[var(--text-dim)]">
                  Advanced member controls live in Settings.
                </div>
              </div>
            )) : (
              <div className="rounded-3xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-subtle)] p-5 text-sm text-[var(--text-dim)]">
                No {group.eyebrow.toLowerCase()} added yet.
              </div>
            )}
          </div>
        </Panel>
      ))}
    </div>
  );
}
