import { EmptyState, PageHeader, ProjectGrid, TaskTable } from "@/components/product/workspace-ui";
import { Panel, PanelHeader } from "@/components/ui/primitives";
import { searchWorkspaceForUi } from "@/lib/server-data";

export default async function SearchPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const queryValue = Array.isArray(searchParams?.q) ? searchParams?.q[0] : searchParams?.q;
  const query = queryValue?.trim() ?? "";
  const results = query ? await searchWorkspaceForUi(query) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Search"
        title={query ? `Results for "${query}"` : "Search tasks and projects"}
        description={query ? `${results?.total ?? 0} results` : undefined}
      />

      {!query ? (
        <EmptyState title="Search" description="Enter a task ID, task title, or project name." />
      ) : results && results.total === 0 ? (
        <EmptyState title="No results" description="Try another search term." />
      ) : (
        <div className="space-y-5">
          {results && results.projects.length ? (
            <div className="space-y-4">
              <Panel className="overflow-hidden">
                <PanelHeader eyebrow="Projects" title={`${results.projects.length} matching projects`} />
              </Panel>
              <ProjectGrid items={results.projects} />
            </div>
          ) : null}

          {results && results.tasks.length ? (
            <TaskTable
              items={results.tasks}
              title={`${results.tasks.length} matching tasks`}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
