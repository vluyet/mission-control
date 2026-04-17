import { getProjectsForUi } from "@/lib/server-data";
import { EmptyState, PageHeader, ProjectGrid } from "@/components/product/workspace-ui";
import { AppButton } from "@/components/ui/primitives";
import { getRequestI18n } from "@/lib/i18n/server";

export default async function ProjectsPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const { t } = await getRequestI18n();
  const includeArchived = searchParams?.scope === "all" || searchParams?.scope === "archived";
  const projectList = await getProjectsForUi({ includeArchived });
  const filteredProjects =
    searchParams?.scope === "archived"
      ? projectList.filter((project) => project.rawLifecycle === "archived")
      : searchParams?.scope === "all"
        ? projectList
        : projectList.filter((project) => project.rawLifecycle !== "archived");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("nav.projects")}
        title={t("nav.projects")}
        description={t("projectsPage.description")}
        actions={
          <>
            <AppButton tone="secondary" href="/projects">
              {t("projectsPage.active")}
            </AppButton>
            <AppButton tone="secondary" href="/projects?scope=all">
              {t("projectsPage.all")}
            </AppButton>
            <AppButton tone="secondary" href="/projects?scope=archived">
              {t("projectForms.archived")}
            </AppButton>
            <AppButton tone="primary" href="/projects/new">
              {t("projectsPage.newProject")}
            </AppButton>
          </>
        }
      />
      {filteredProjects.length ? (
        <ProjectGrid items={filteredProjects} />
      ) : (
        <EmptyState
          title={t("projectsPage.noProjects")}
          description={t("projectsPage.noProjectsDescription")}
          action={
            <AppButton tone="primary" href="/projects/new">
              {t("projectsPage.createFirstProject")}
            </AppButton>
          }
        />
      )}
    </div>
  );
}
