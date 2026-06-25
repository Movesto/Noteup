import { type ActionFunctionArgs, json } from "@remix-run/node";
import { deleteFolders, purgeFolders, restoreFolders } from "~/lib/api/folders.server";
import { deleteNotes, purgeNotes, restoreNotes } from "~/lib/api/notes.server";
import { emptyTrash } from "~/lib/api/trash.server";
import { requireAuth } from "~/lib/session.server";

/**
 * Single endpoint for every trash mutation. Each request carries an `intent`
 * plus the selected `noteIds` / `folderIds` (repeated form fields), so the
 * sidebar's bulk delete and the trash page's restore/purge/empty all post here.
 */
export async function action({ request }: ActionFunctionArgs) {
  const { token } = await requireAuth(request);
  const form = await request.formData();
  const intent = form.get("intent") as string;
  const noteIds = form.getAll("noteIds") as string[];
  const folderIds = form.getAll("folderIds") as string[];

  switch (intent) {
    case "delete": // soft delete → move to trash
      await Promise.all([
        noteIds.length ? deleteNotes(token, noteIds) : null,
        folderIds.length ? deleteFolders(token, folderIds) : null,
      ]);
      return json({ ok: true });

    case "restore":
      await Promise.all([
        noteIds.length ? restoreNotes(token, noteIds) : null,
        folderIds.length ? restoreFolders(token, folderIds) : null,
      ]);
      return json({ ok: true });

    case "purge": // permanent delete
      await Promise.all([
        noteIds.length ? purgeNotes(token, noteIds) : null,
        folderIds.length ? purgeFolders(token, folderIds) : null,
      ]);
      return json({ ok: true });

    case "empty":
      await emptyTrash(token);
      return json({ ok: true });

    default:
      return json({ ok: false, error: "Unknown intent" }, { status: 400 });
  }
}
