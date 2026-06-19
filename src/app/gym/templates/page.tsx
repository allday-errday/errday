import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { listWorkoutTemplates } from "@/lib/db/gym";
import { TemplateForm } from "./template-form";

export default async function GymTemplatesPage() {
  const { supabase, user } = await requireUser();
  const templates = await listWorkoutTemplates(supabase, user.id);

  return (
    <div>
      <PageHeader
        subtitle="Save repeatable workout structures."
        title="Templates"
      />

      <section className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Create Template
        </h2>
        <TemplateForm />
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
        <h2 className="text-lg font-semibold text-white">Your Templates</h2>
        {templates.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            No templates yet. Create one now and add full builders later.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {templates.map((template) => (
              <article
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-4"
                key={template.id}
              >
                <h3 className="font-bold text-white">{template.name}</h3>
                {template.description ? (
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {template.description}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
