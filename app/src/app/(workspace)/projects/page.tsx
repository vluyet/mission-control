import { getProjectsForUi } from "@/lib/server-data";
import { EmptyState, PageHeader, ProjectGrid } from "@/components/product/workspace-ui";
import { AppButton } from "@/components/ui/primitives";

export default async function ProjectsPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const includeArchived = searchParams?.scope === "all" || searchParams?.scope === "archived";
  const projectList = await getProjectsForUi({ includeArchived });
  const filteredProjects =
    searchParams?.scope === "archived"
      ? projectList.filter((project) => project.lifecycle === "Archived")
      : searchParams?.scope === "all"
        ? projectList
        : projectList.filter((project) => project.lifecycle !== "Archived");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Projects"
        title="Projects"
        actions={
          <>
            <AppButton tone="secondary" href="/projects">
              Active
            </AppButton>
            <AppButton tone="secondary" href="/projects?scope=archived">
              Archived
            </AppButton>
            <AppButton tone="secondary" href="/projects?scope=all">
              All projects
            </AppButton>
            <AppButton tone="primary" href="/projects/new">
              New project
            </AppButton>
          </>
        }
      />
      {filteredProjects.length ? (
        <ProjectGrid items={filteredProjects} />
      ) : (
        <EmptyState
          title="No projects"
          description="Create the first project when you are ready to organize work."
          action={
            <AppButton tone="primary" href="/projects/new">
              Create first project
            </AppButton>
          }
        />
      )}
    </div>
  );
}
