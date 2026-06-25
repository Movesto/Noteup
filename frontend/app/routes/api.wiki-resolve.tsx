import { type ActionFunctionArgs, json } from "@remix-run/node";
import { createNote, getNoteByTitle } from "~/lib/api/notes.server";
import { requireAuth } from "~/lib/session.server";

/**
 * Resolves a wiki-link target (a note *title*) to a note id so the editor can
 * navigate to it. If no note with that title exists yet, one is created on the
 * spot (Obsidian-style "click to create") and the new id is returned.
 */
export async function action({ request }: ActionFunctionArgs) {
  const { token } = await requireAuth(request);
  const form = await request.formData();
  const title = ((form.get("title") as string | null) ?? "").trim();
  if (!title) return json({ error: "missing title" }, { status: 400 });

  const existing = await getNoteByTitle(token, title);
  if (existing?.id) return json({ id: existing.id, created: false });

  const created = await createNote(token, { title });
  return json({ id: created.id, created: true });
}
