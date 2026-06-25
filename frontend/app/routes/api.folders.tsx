import { type ActionFunctionArgs, json } from "@remix-run/node";
import { createFolder, deleteFolder, moveFolder, renameFolder } from "~/lib/api/folders.server";
import { moveNote } from "~/lib/api/notes.server";
import { requireAuth } from "~/lib/session.server";

export async function action({ request }: ActionFunctionArgs) {
  const { token } = await requireAuth(request);
  const form = await request.formData();
  const intent = form.get("intent") as string;

  if (intent === "create") {
    const name = form.get("name") as string;
    const parentId = (form.get("parentId") as string | null) || null;
    await createFolder(token, { name, parentId });
    return json({ ok: true });
  }

  if (intent === "rename") {
    const id = form.get("id") as string;
    const name = form.get("name") as string;
    await renameFolder(token, id, name);
    return json({ ok: true });
  }

  if (intent === "delete") {
    const id = form.get("id") as string;
    await deleteFolder(token, id);
    return json({ ok: true });
  }

  if (intent === "moveNote") {
    const noteId = form.get("noteId") as string;
    const folderId = (form.get("folderId") as string | null) || null;
    await moveNote(token, noteId, folderId);
    return json({ ok: true });
  }

  if (intent === "moveFolder") {
    const id = form.get("id") as string;
    const parentId = (form.get("parentId") as string | null) || null;
    await moveFolder(token, id, parentId);
    return json({ ok: true });
  }

  return json({ ok: false, error: "Unknown intent" }, { status: 400 });
}
