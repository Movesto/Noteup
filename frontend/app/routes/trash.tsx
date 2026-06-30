import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { useFetcher, useLoaderData, useRevalidator } from "@remix-run/react";
import { type ReactNode, useEffect, useState } from "react";
import { getTrash } from "~/lib/api/trash.server";
import { requireAuth } from "~/lib/session.server";
import type { TrashFolder, TrashNote } from "~/types";
import { FileIcon, FolderIcon, TrashIcon } from "~/components/icons";

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAuth(request);
  const trash: { notes: TrashNote[]; folders: TrashFolder[] } = await getTrash(token).catch(
    () => ({ notes: [], folders: [] })
  );
  return json(trash);
}

type Selection = { notes: Set<string>; folders: Set<string> };

export default function Trash() {
  const { notes, folders } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  const [sel, setSel] = useState<Selection>({ notes: new Set(), folders: new Set() });
  const empty = notes.length === 0 && folders.length === 0;
  const selectedCount = sel.notes.size + sel.folders.size;
  const busy = fetcher.state !== "idle";

  // Refresh the list (and clear the selection) after any mutation lands.
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      setSel({ notes: new Set(), folders: new Set() });
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data]);

  function toggle(kind: "notes" | "folders", id: string) {
    setSel((prev) => {
      const next = new Set(prev[kind]);
      next.has(id) ? next.delete(id) : next.add(id);
      return { ...prev, [kind]: next };
    });
  }

  function toggleAll() {
    if (selectedCount > 0) {
      setSel({ notes: new Set(), folders: new Set() });
    } else {
      setSel({
        notes: new Set(notes.map((n) => n.id)),
        folders: new Set(folders.map((f) => f.id)),
      });
    }
  }

  function submit(intent: "restore" | "purge", selection: Selection) {
    if (intent === "purge" && !confirm("Permanently delete the selected items? This cannot be undone.")) {
      return;
    }
    const fd = new FormData();
    fd.set("intent", intent);
    selection.notes.forEach((id) => fd.append("noteIds", id));
    selection.folders.forEach((id) => fd.append("folderIds", id));
    fetcher.submit(fd, { method: "post", action: "/api/trash" });
  }

  function emptyTrash() {
    if (!confirm("Permanently delete everything in the trash? This cannot be undone.")) return;
    const fd = new FormData();
    fd.set("intent", "empty");
    fetcher.submit(fd, { method: "post", action: "/api/trash" });
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-[20px] font-semibold text-notion-text flex items-center gap-2">
<TrashIcon className="w-5 h-5" /> Trash
        </h1>
        {!empty && (
          <button
            type="button"
            onClick={emptyTrash}
            disabled={busy}
            className="text-[12px] px-3 py-1.5 rounded-md text-red-400 hover:bg-notion-hover transition-colors disabled:opacity-50"
          >
            Empty trash
          </button>
        )}
      </div>
      <p className="text-[13px] text-notion-faint mb-5">
        Deleted notes and folders are kept here. Restore them, or delete them permanently.
        Deleting a folder also trashes everything inside it.
      </p>

      {empty ? (
        <div className="text-center py-16 text-notion-faint text-[13px]">Trash is empty.</div>
      ) : (
        <>
          {/* Selection toolbar */}
          <div className="flex items-center gap-3 mb-3 sticky top-0 bg-notion-bg py-2 z-10">
            <label className="flex items-center gap-2 text-[12px] text-notion-muted cursor-pointer">
              <input
                type="checkbox"
                checked={selectedCount > 0 && selectedCount === notes.length + folders.length}
                ref={(el) => {
                  if (el) el.indeterminate = selectedCount > 0 && selectedCount < notes.length + folders.length;
                }}
                onChange={toggleAll}
                className="accent-emerald-600"
              />
              {selectedCount > 0 ? `${selectedCount} selected` : "Select all"}
            </label>
            <div className="flex-1" />
            <button
              type="button"
              disabled={selectedCount === 0 || busy}
              onClick={() => submit("restore", sel)}
              className="text-[12px] px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white transition-colors disabled:opacity-40 disabled:hover:bg-emerald-700"
            >
              Restore
            </button>
            <button
              type="button"
              disabled={selectedCount === 0 || busy}
              onClick={() => submit("purge", sel)}
              className="text-[12px] px-3 py-1.5 rounded-md text-red-400 hover:bg-notion-hover transition-colors disabled:opacity-40"
            >
              Delete permanently
            </button>
          </div>

          <ul className="border border-notion-border rounded-lg overflow-hidden divide-y divide-notion-border">
            {folders.map((f) => (
              <TrashRow
                key={f.id}
                icon={<FolderIcon className="w-3.5 h-3.5" />}
                label={f.name}
                hint="folder · contents included"
                checked={sel.folders.has(f.id)}
                onToggle={() => toggle("folders", f.id)}
                onRestore={() => submit("restore", { notes: new Set(), folders: new Set([f.id]) })}
                onPurge={() => submit("purge", { notes: new Set(), folders: new Set([f.id]) })}
              />
            ))}
            {notes.map((n) => (
              <TrashRow
                key={n.id}
                icon={<FileIcon className="w-3.5 h-3.5" />}
                label={n.title || "Untitled"}
                hint="note"
                checked={sel.notes.has(n.id)}
                onToggle={() => toggle("notes", n.id)}
                onRestore={() => submit("restore", { notes: new Set([n.id]), folders: new Set() })}
                onPurge={() => submit("purge", { notes: new Set([n.id]), folders: new Set() })}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function TrashRow({
  icon, label, hint, checked, onToggle, onRestore, onPurge,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  onToggle: () => void;
  onRestore: () => void;
  onPurge: () => void;
}) {
  return (
    <li className="group flex items-center gap-3 px-3 py-2 hover:bg-notion-hover transition-colors">
      <input type="checkbox" checked={checked} onChange={onToggle} className="accent-emerald-600 shrink-0" />
      <span className="text-notion-faint shrink-0 w-4 inline-flex items-center justify-center">{icon}</span>
      <span className="flex-1 text-[13px] text-notion-text truncate">{label}</span>
      <span className="text-[11px] text-notion-faint shrink-0">{hint}</span>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onRestore} title="Restore"
          className="text-[11px] px-2 py-1 rounded text-emerald-400 hover:bg-notion-border transition-colors">
          Restore
        </button>
        <button type="button" onClick={onPurge} title="Delete permanently"
          className="text-[11px] px-2 py-1 rounded text-red-400 hover:bg-notion-border transition-colors">
          Delete
        </button>
      </div>
    </li>
  );
}
