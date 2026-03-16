import { PageHeader } from "@/components/product/workspace-ui";
import { ProjectCreateForm } from "@/components/product/project-create-form";

export default function NewProjectPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="New project"
        title="Create a project with just enough structure."
        description="Projects are the operational container between workspace context and task execution. Keep the framing simple and clear."
      />
      <ProjectCreateForm />
    </div>
  );
}
