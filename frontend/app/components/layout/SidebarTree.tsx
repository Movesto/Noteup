import { createContext, useContext } from "react";
import { NavLink } from "@remix-run/react";
import type { useNavigate } from "@remix-run/react";
import type { Folder, SidebarNote } from "~/types";
import { FileIcon, FolderIcon, PencilIcon, TrashIcon } from "~/components/icons";

type NavigateFn = ReturnType<typeof useNavigate>;

/**
 * Shared state + actions for the recursive folder tree. Provided once by the
 * Sidebar and consumed by FolderNode/NoteItem at any depth, so the recursion
 * doesn't have to thread a dozen props through every level.
 */
export interface SidebarTreeValue {
  childrenByParent: Map<string | null, Folder[]>;
  notesByFolder: Map<string | null, SidebarNote[]>;
  expandedFolders: Set<string>;
  creatingFolder: string | null;
  renamingId: string | null;
  newFolderInputRef: React.RefObject<HTMLInputElement>;
  renameInputRef: React.RefObject<HTMLInputElement>;
  toggleFolder: (id: string) => void;
  submitNewFolder: (parentId: string | null) => void;
  submitRename: (id: string) => void;
  moveFolder: (id: string, parentId: string | null) => void;
  deleteFolder: (id: string) => void;
  deleteNote: (note: SidebarNote) => void;
  setCreatingFolder: (id: string | null) => void;
  setRenamingId: (id: string | null) => void;
  sortNotes: (list: SidebarNote[]) => SidebarNote[];
  navigate: NavigateFn;
  // Multi-select mode (for bulk delete to trash)
  selecting: boolean;
  selectedNotes: Set<string>;
  selectedFolders: Set<string>;
  toggleSelectNote: (id: string) => void;
  toggleSelectFolder: (id: string) => void;
  // Drag-and-drop folder re-parenting.
  draggingFolderId: string | null;
  dragOverTarget: string | null; // folder id, "root", or null
  setDragOverTarget: (target: string | null) => void;
  beginFolderDrag: (id: string) => void;
  endFolderDrag: () => void;
}

/** True when `targetId` is `folderId` itself or any folder nested inside it. */
function isWithinSubtree(
  childrenByParent: Map<string | null, Folder[]>,
  folderId: string,
  targetId: string,
): boolean {
  if (folderId === targetId) return true;
  const stack = [...(childrenByParent.get(folderId) ?? [])];
  while (stack.length) {
    const f = stack.pop()!;
    if (f.id === targetId) return true;
    stack.push(...(childrenByParent.get(f.id) ?? []));
  }
  return false;
}

const SidebarTreeContext = createContext<SidebarTreeValue | null>(null);

function useTree(): SidebarTreeValue {
  const ctx = useContext(SidebarTreeContext);
  if (!ctx) throw new Error("SidebarTree components must be used within <SidebarTreeProvider>");
  return ctx;
}

export function SidebarTreeProvider({
  value,
  children,
}: {
  value: SidebarTreeValue;
  children: React.ReactNode;
}) {
  return <SidebarTreeContext.Provider value={value}>{children}</SidebarTreeContext.Provider>;
}

function NoteItem({ note, depth = 0 }: { note: SidebarNote; depth?: number }) {
  const { deleteNote, selecting, selectedNotes, toggleSelectNote } = useTree();
  const pl = depth * 12 + 8;

  // Selection mode: the whole row is a checkbox toggle, no navigation.
  if (selecting) {
    const checked = selectedNotes.has(note.id);
    return (
      <button
        type="button"
        onClick={() => toggleSelectNote(note.id)}
        style={{ paddingLeft: pl + 4 }}
        className="w-full flex items-center gap-2 py-1.5 pr-2 text-[13px] text-notion-muted hover:bg-notion-hover rounded-md transition-colors min-w-0"
      >
        <input
          type="checkbox"
          checked={checked}
          readOnly
          tabIndex={-1}
          className="accent-emerald-600 shrink-0 pointer-events-none"
        />
        <span className="text-notion-faint text-[11px] shrink-0">&#9632;</span>
        <span className="truncate text-left">{note.title || "Untitled"}</span>
      </button>
    );
  }

  return (
    <div className="group relative flex items-center rounded-md hover:bg-notion-hover transition-colors">
      <NavLink
        to={`/notes/${note.id}`}
        style={{ paddingLeft: pl + 20 }}
        className={({ isActive }) =>
          `flex-1 flex items-center gap-2 py-1.5 text-[13px] transition-colors min-w-0 truncate ${
            isActive ? "text-notion-text" : "text-notion-muted group-hover:text-notion-text"
          }`
        }
      >
        <span className="text-notion-faint text-[11px] shrink-0">&#9632;</span>
        <span className="truncate">{note.title || "Untitled"}</span>
      </NavLink>
      <button
        type="button"
        title="Delete note"
        onClick={(e) => {
          e.preventDefault();
          deleteNote(note);
        }}
        className="hidden group-hover:flex items-center justify-center w-5 h-5 mr-1 shrink-0 rounded text-notion-faint hover:text-red-400 hover:bg-notion-border transition-colors text-[10px]"
      >
        <TrashIcon className="w-3 h-3" />
      </button>
    </div>
  );
}

function FolderNode({ folder, depth }: { folder: Folder; depth: number }) {
  const t = useTree();
  const expanded = t.expandedFolders.has(folder.id);
  const subFolders = t.childrenByParent.get(folder.id) ?? [];
  const folderNotes = t.notesByFolder.get(folder.id) ?? [];
  const pl = depth * 12 + 8;
  const isRenaming = t.renamingId === folder.id;

  // Drag-and-drop: a folder can be dragged onto another to re-parent it, as long
  // as the target isn't the folder itself or one of its own descendants.
  const isDragging = t.draggingFolderId === folder.id;
  const isValidDropTarget =
    t.draggingFolderId !== null &&
    !isWithinSubtree(t.childrenByParent, t.draggingFolderId, folder.id);
  const isDropOver = t.dragOverTarget === folder.id && isValidDropTarget;

  return (
    <>
      {/* Folder row */}
      <div
        draggable={!isRenaming && !t.selecting}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", folder.id);
          t.beginFolderDrag(folder.id);
        }}
        onDragEnd={t.endFolderDrag}
        onDragOver={(e) => {
          if (!isValidDropTarget) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";
          if (t.dragOverTarget !== folder.id) t.setDragOverTarget(folder.id);
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          if (t.dragOverTarget === folder.id) t.setDragOverTarget(null);
        }}
        onDrop={(e) => {
          if (!isValidDropTarget || t.draggingFolderId === null) return;
          e.preventDefault();
          e.stopPropagation();
          t.moveFolder(t.draggingFolderId, folder.id);
          t.endFolderDrag();
        }}
        className={`group flex items-center gap-1 py-1 rounded-md transition-colors cursor-pointer ${
          isDropOver ? "ring-1 ring-emerald-600 bg-emerald-900/20" : "hover:bg-notion-hover"
        } ${isDragging ? "opacity-40" : ""}`}
        style={{ paddingLeft: pl }}
      >
        {/* Expand/collapse */}
        <button
          type="button"
          onClick={() => t.toggleFolder(folder.id)}
          className="shrink-0 w-4 h-4 flex items-center justify-center text-notion-faint hover:text-notion-muted transition-colors"
        >
          <span className="text-[10px]">{expanded ? "▾" : "▸"}</span>
        </button>

        {/* Selection checkbox (multi-select mode) */}
        {t.selecting && (
          <input
            type="checkbox"
            checked={t.selectedFolders.has(folder.id)}
            readOnly
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              t.toggleSelectFolder(folder.id);
            }}
            className="accent-emerald-600 shrink-0"
          />
        )}

        {/* Folder icon */}
        <FolderIcon className="w-3.5 h-3.5 shrink-0 text-notion-faint" />

        {/* Name (or rename input) */}
        {isRenaming ? (
          <input
            ref={t.renameInputRef}
            defaultValue={folder.name}
            onKeyDown={(e) => {
              if (e.key === "Enter") t.submitRename(folder.id);
              if (e.key === "Escape") t.setRenamingId(null);
            }}
            onBlur={() => t.submitRename(folder.id)}
            className="flex-1 text-[13px] bg-notion-hover border border-emerald-700 rounded px-1 focus:outline-none"
          />
        ) : (
          <span
            className="flex-1 text-[13px] text-notion-muted group-hover:text-notion-text transition-colors truncate cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (t.selecting) t.toggleSelectFolder(folder.id);
              else t.navigate(`/folders/${folder.id}`);
            }}
          >
            {folder.name}
          </span>
        )}

        {/* Hover actions */}
        {!isRenaming && !t.selecting && (
          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 mr-1">
            {/* Add note to folder */}
            <button
              type="button"
              title="New note in folder"
              onClick={(e) => {
                e.stopPropagation();
                t.navigate(`/notes/new?folderId=${folder.id}&folderName=${encodeURIComponent(folder.name)}`);
              }}
              className="w-5 h-5 flex items-center justify-center rounded text-notion-faint hover:text-notion-text hover:bg-notion-border transition-colors text-[10px]"
            >
              <FileIcon className="w-3 h-3" />
            </button>
            {/* Add subfolder */}
            <button
              type="button"
              title="New subfolder"
              onClick={(e) => {
                e.stopPropagation();
                t.setCreatingFolder(folder.id);
              }}
              className="w-5 h-5 flex items-center justify-center rounded text-notion-faint hover:text-notion-text hover:bg-notion-border transition-colors text-[11px]"
            >
              +
            </button>
            {/* Rename */}
            <button
              type="button"
              title="Rename"
              onClick={(e) => {
                e.stopPropagation();
                t.setRenamingId(folder.id);
              }}
              className="w-5 h-5 flex items-center justify-center rounded text-notion-faint hover:text-notion-text hover:bg-notion-border transition-colors text-[10px]"
            >
              <PencilIcon className="w-3 h-3" />
            </button>
            {/* Delete */}
            <button
              type="button"
              title="Delete folder"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Move folder "${folder.name}" and everything inside it to the trash?`)) {
                  t.deleteFolder(folder.id);
                }
              }}
              className="w-5 h-5 flex items-center justify-center rounded text-notion-faint hover:text-red-400 hover:bg-notion-border transition-colors text-[10px]"
            >
              <TrashIcon className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Inline new-subfolder input */}
      {t.creatingFolder === folder.id && (
        <div className="flex items-center gap-1 py-1" style={{ paddingLeft: pl + 20 }}>
          <FolderIcon className="w-3.5 h-3.5 shrink-0 text-notion-faint" />
          <input
            ref={t.newFolderInputRef}
            defaultValue=""
            onKeyDown={(e) => {
              if (e.key === "Enter") t.submitNewFolder(folder.id);
              if (e.key === "Escape") t.setCreatingFolder(null);
            }}
            onBlur={() => t.submitNewFolder(folder.id)}
            placeholder="Folder name…"
            className="flex-1 text-[12px] bg-notion-hover border border-emerald-700 rounded px-2 py-0.5 focus:outline-none text-notion-text placeholder:text-notion-faint"
          />
        </div>
      )}

      {/* Children (expanded) */}
      {expanded && (
        <>
          {subFolders.map((child) => (
            <FolderNode key={child.id} folder={child} depth={depth + 1} />
          ))}
          {folderNotes.map((note) => (
            <NoteItem key={note.id} note={note} depth={depth + 1} />
          ))}
        </>
      )}
    </>
  );
}

/** The scrollable workspace tree: root folders, then unfiled notes. */
export function FolderTree() {
  const t = useTree();
  const rootFolders = t.childrenByParent.get(null) ?? [];
  const unfiledNotes = t.sortNotes(t.notesByFolder.get(null) ?? []);

  return (
    <nav className="flex-1 overflow-y-auto px-2 pb-4">
      {/* Root drop zone — appears while dragging a folder, to move it to the top level. */}
      {t.draggingFolderId && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (t.dragOverTarget !== "root") t.setDragOverTarget("root");
          }}
          onDragLeave={() => {
            if (t.dragOverTarget === "root") t.setDragOverTarget(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (t.draggingFolderId) t.moveFolder(t.draggingFolderId, null);
            t.endFolderDrag();
          }}
          className={`mb-1 mx-1 rounded-md border border-dashed px-2 py-1.5 text-[11px] text-center transition-colors ${
            t.dragOverTarget === "root"
              ? "border-emerald-600 bg-emerald-900/20 text-emerald-300"
              : "border-notion-border text-notion-faint"
          }`}
        >
          Move to top level
        </div>
      )}

      {/* New root folder input */}
      {t.creatingFolder === "root" && (
        <div className="flex items-center gap-1 py-1 px-2 mb-1">
          <FolderIcon className="w-3.5 h-3.5 shrink-0 text-notion-faint" />
          <input
            ref={t.newFolderInputRef}
            defaultValue=""
            onKeyDown={(e) => {
              if (e.key === "Enter") t.submitNewFolder(null);
              if (e.key === "Escape") t.setCreatingFolder(null);
            }}
            onBlur={() => t.submitNewFolder(null)}
            placeholder="Folder name…"
            className="flex-1 text-[12px] bg-notion-hover border border-emerald-700 rounded px-2 py-0.5 focus:outline-none text-notion-text placeholder:text-notion-faint"
          />
        </div>
      )}

      {/* Folder tree */}
      {rootFolders.map((folder) => (
        <FolderNode key={folder.id} folder={folder} depth={0} />
      ))}

      {/* Unfiled notes */}
      {unfiledNotes.length > 0 && (
        <>
          {rootFolders.length > 0 && (
            <div className="px-2 pt-3 pb-1">
              <span className="text-[10px] font-medium text-notion-faint uppercase tracking-wider">
                Unfiled
              </span>
            </div>
          )}
          {unfiledNotes.map((note) => (
            <NoteItem key={note.id} note={note} depth={0} />
          ))}
        </>
      )}

      {/* Empty state */}
      {rootFolders.length === 0 && unfiledNotes.length === 0 && (
        <p className="text-[12px] text-notion-faint px-2 py-1">No pages yet</p>
      )}
    </nav>
  );
}
