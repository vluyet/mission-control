import { getActivityFeedForUi } from "@/lib/server-data";
import { ActivityPanel, EmptyState, PageHeader } from "@/components/product/workspace-ui";
import { AppButton } from "@/components/ui/primitives";

export default async function ActivityPage() {
  const items = await getActivityFeedForUi(16);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Activity" title="Activity" />
      {items.length ? (
        <ActivityPanel items={items} />
      ) : (
        <EmptyState
          title="No activity yet"
          description="Task changes, comments, uploads, and agent actions will appear here."
          action={
            <AppButton tone="secondary" href="/projects">
              Open projects
            </AppButton>
          }
        />
      )}
    </div>
  );
}
