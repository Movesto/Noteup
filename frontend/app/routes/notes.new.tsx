import { type ActionFunctionArgs, type LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useNavigation } from "@remix-run/react";
import { createNote } from "~/lib/api/notes.server";
import { requireAuth } from "~/lib/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuth(request);
  const url = new URL(request.url);
  const folderId = url.searchParams.get("folderId");
  const folderName = url.searchParams.get("folderName");
  return json({ folderId, folderName });
}

export async function action({ request }: ActionFunctionArgs) {
  const { token } = await requireAuth(request);
  const form = await request.formData();
  const title = (form.get("title") as string).trim();
  const aliasesRaw = (form.get("aliases") as string) ?? "";
  const folderId = (form.get("folderId") as string | null) || null;
  const aliases = aliasesRaw
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  const created = await createNote(token, {
    title,
    aliases: aliases.length ? aliases : null,
    folderId,
  });

  return redirect(`/notes/${created.id}`);
}

export default function NewNote() {
  const { folderId, folderName } = useLoaderData<typeof loader>();
  const nav = useNavigation();
  const saving = nav.state === "submitting";

  return (
    <div className="max-w-prose mx-auto px-8 py-12">
      <h1 className="text-2xl font-bold text-notion-text mb-1">New Page</h1>
      {folderName ? (
        <p className="text-[13px] text-notion-faint mb-8">
          Creating in <span className="text-emerald-500">📁 {folderName}</span>
        </p>
      ) : (
        <p className="text-[13px] text-notion-faint mb-8">
          Give your page a title. You can add content after it&apos;s created.
        </p>
      )}

      <Form method="post" className="flex flex-col gap-5">
        {folderId && (
          <input type="hidden" name="folderId" value={folderId} />
        )}

        <div>
          <label className="block text-[12px] font-medium text-notion-muted mb-1.5">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            name="title"
            required
            autoFocus
            className="w-full bg-notion-surface border border-notion-border rounded-md px-3 py-2 text-[14px] text-notion-text placeholder:text-notion-faint focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 transition-all"
            placeholder="e.g. Philosophy"
          />
        </div>

        <div>
          <label className="block text-[12px] font-medium text-notion-muted mb-1.5">
            Aliases{" "}
            <span className="text-notion-faint text-[11px]">
              (comma-separated, e.g. الفلسفة, فلسفة)
            </span>
          </label>
          <input
            name="aliases"
            className="w-full bg-notion-surface border border-notion-border rounded-md px-3 py-2 text-[14px] text-notion-text placeholder:text-notion-faint focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 transition-all"
            placeholder="alias1, alias2"
            dir="auto"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 rounded-md text-sm font-medium text-white transition-colors"
          >
            {saving ? "Creating…" : "Create Page"}
          </button>
        </div>
      </Form>
    </div>
  );
}
