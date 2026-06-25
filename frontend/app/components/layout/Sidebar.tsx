import { Form, NavLink, useFetcher, useNavigate, useRevalidator } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { SearchBar } from "~/components/SearchBar";
import { FolderTree, SidebarTreeProvider, type SidebarTreeValue } from "~/components/layout/SidebarTree";
import type { Folder, SidebarNote } from "~/types";

interface Props {
  notes: SidebarNote[];
  folders: Folder[];
  email: string;
  open: boolean;
  imeEnabled: boolean;
  onToggleIme: () => void;
}

const NAV_LINKS = [
  {
    to: "/search",
    label: "Search",
    icon: (
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    to: "/search?view=orphans",
    label: "Unlinked",
    icon: (
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    to: "/import",
    label: "Import",
    icon: (
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
      </svg>
    ),
  },
  {
    to: "/trash",
    label: "Trash",
    icon: (
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
  },
  {
    to: "/settings",
    label: "Settings",
    icon: (
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function Sidebar({ notes, folders, email, open, imeEnabled, onToggleIme }: Props) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const folderFetcher = useFetcher();

  const [sortOrder, setSortOrder] = useState<"created" | "alpha" | "updated">("created");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(folders.map((f) => f.id)) // start all expanded
  );
  const [creatingFolder, setCreatingFolder] = useState<string | null>(null); // parentId | "root"
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Drag-and-drop folder re-parenting.
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  function beginFolderDrag(id: string) {
    setDraggingFolderId(id);
  }
  function endFolderDrag() {
    setDraggingFolderId(null);
    setDragOverTarget(null);
  }
  function moveFolder(id: string, parentId: string | null) {
    const fd = new FormData();
    fd.set("intent", "moveFolder");
    fd.set("id", id);
    if (parentId) fd.set("parentId", parentId);
    folderFetcher.submit(fd, { method: "post", action: "/api/folders" });
    if (parentId) setExpandedFolders((p) => new Set([...p, parentId]));
  }

  // Multi-select mode for bulk delete-to-trash.
  const [selecting, setSelecting] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const selectedCount = selectedNotes.size + selectedFolders.size;

  function toggleSelectNote(id: string) {
    setSelectedNotes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleSelectFolder(id: string) {
    setSelectedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function exitSelectMode() {
    setSelecting(false);
    setSelectedNotes(new Set());
    setSelectedFolders(new Set());
  }
  function deleteSelected() {
    if (selectedCount === 0) return;
    const fd = new FormData();
    fd.set("intent", "delete");
    selectedNotes.forEach((id) => fd.append("noteIds", id));
    selectedFolders.forEach((id) => fd.append("folderIds", id));
    folderFetcher.submit(fd, { method: "post", action: "/api/trash" });
    exitSelectMode();
  }

  // Re-fetch sidebar after folder/note mutations.
  useEffect(() => {
    if (folderFetcher.state === "idle" && folderFetcher.data) {
      revalidator.revalidate();
    }
  }, [folderFetcher.state, folderFetcher.data]);

  // Auto-focus the create/rename inputs when they appear.
  useEffect(() => {
    if (creatingFolder !== null) newFolderInputRef.current?.focus();
  }, [creatingFolder]);
  useEffect(() => {
    if (renamingId !== null) renameInputRef.current?.focus();
  }, [renamingId]);

  // Build folder-tree lookup maps.
  const childrenByParent = new Map<string | null, Folder[]>();
  const notesByFolder = new Map<string | null, SidebarNote[]>();
  for (const folder of folders) {
    const key = folder.parentId ?? null;
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(folder);
  }
  for (const note of notes) {
    const key = note.folderId ?? null;
    if (!notesByFolder.has(key)) notesByFolder.set(key, []);
    notesByFolder.get(key)!.push(note);
  }

  function sortNotes(list: SidebarNote[]) {
    if (sortOrder === "alpha")
      return [...list].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    return list;
  }

  function toggleFolder(id: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submitNewFolder(parentId: string | null) {
    const name = newFolderInputRef.current?.value ?? "";
    if (!name.trim()) {
      setCreatingFolder(null);
      return;
    }
    const fd = new FormData();
    fd.set("intent", "create");
    fd.set("name", name.trim());
    if (parentId) fd.set("parentId", parentId);
    folderFetcher.submit(fd, { method: "post", action: "/api/folders" });
    setCreatingFolder(null);
    if (parentId) setExpandedFolders((p) => new Set([...p, parentId]));
  }

  function submitRename(id: string) {
    const name = renameInputRef.current?.value ?? "";
    if (!name.trim()) {
      setRenamingId(null);
      return;
    }
    const fd = new FormData();
    fd.set("intent", "rename");
    fd.set("id", id);
    fd.set("name", name.trim());
    folderFetcher.submit(fd, { method: "post", action: "/api/folders" });
    setRenamingId(null);
  }

  function deleteFolder(id: string) {
    const fd = new FormData();
    fd.set("intent", "delete");
    fd.set("id", id);
    folderFetcher.submit(fd, { method: "post", action: "/api/folders" });
  }

  function deleteNote(note: SidebarNote) {
    if (confirm(`Move "${note.title || "Untitled"}" to the trash?`)) {
      const fd = new FormData();
      fd.set("intent", "delete");
      fd.set("id", note.id);
      folderFetcher.submit(fd, { method: "post", action: "/api/notes" });
    }
  }

  const treeValue: SidebarTreeValue = {
    childrenByParent,
    notesByFolder,
    expandedFolders,
    creatingFolder,
    renamingId,
    newFolderInputRef,
    renameInputRef,
    toggleFolder,
    submitNewFolder,
    submitRename,
    moveFolder,
    deleteFolder,
    deleteNote,
    setCreatingFolder,
    setRenamingId,
    sortNotes,
    navigate,
    selecting,
    selectedNotes,
    selectedFolders,
    toggleSelectNote,
    toggleSelectFolder,
    draggingFolderId,
    dragOverTarget,
    setDragOverTarget,
    beginFolderDrag,
    endFolderDrag,
  };

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 w-60 shrink-0 bg-notion-surface border-r border-notion-border flex flex-col overflow-hidden transition-transform duration-200
        md:static md:translate-x-0
        ${open ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <NavLink
          to="/"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md mb-1 hover:bg-notion-hover transition-colors"
        >
          <div className="w-5 h-5 bg-emerald-600 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            SB
          </div>
          <span className="text-[13px] font-semibold text-notion-text truncate">Second Brain</span>
        </NavLink>

        {/* Search — sidebar placement, shown on small screens only.
            On large screens the search lives in the top navbar instead. */}
        <SearchBar className="mt-1 md:hidden" />
      </div>

      {/* Nav actions */}
      <div className="px-2 shrink-0 mb-1">
        <NavLink
          to="/notes/new"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-notion-muted hover:bg-notion-hover hover:text-notion-text transition-colors w-full"
        >
          <span className="text-notion-faint text-base leading-none">+</span>
          New Page
        </NavLink>

        <NavLink
          to="/notes/daily"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-notion-muted hover:bg-notion-hover hover:text-notion-text transition-colors w-full"
        >
          <svg className="w-3.5 h-3.5 text-notion-faint shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Today
        </NavLink>

        <button
          type="button"
          onClick={() => setCreatingFolder("root")}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-notion-muted hover:bg-notion-hover hover:text-notion-text transition-colors w-full"
        >
          <span className="text-notion-faint text-base leading-none">+</span>
          New Folder
        </button>

        {NAV_LINKS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors w-full ${
                isActive
                  ? "bg-notion-hover text-notion-text"
                  : "text-notion-muted hover:bg-notion-hover hover:text-notion-text"
              }`
            }
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </div>

      {/* Divider + label + sort */}
      <div className="px-4 pt-2 pb-1 shrink-0 flex items-center justify-between">
        <span className="text-[11px] font-medium text-notion-faint uppercase tracking-wider">
          Workspace
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (selecting ? exitSelectMode() : setSelecting(true))}
            className="text-[10px] text-notion-faint hover:text-notion-muted transition-colors"
            title="Select multiple to delete"
          >
            {selecting ? "Cancel" : "Select"}
          </button>
          {!selecting && (
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "created" | "alpha" | "updated")}
              className="text-[10px] text-notion-faint bg-transparent focus:outline-none cursor-pointer hover:text-notion-muted transition-colors"
              title="Sort notes"
            >
              <option value="created">Newest</option>
              <option value="alpha">A–Z</option>
            </select>
          )}
        </div>
      </div>

      {/* Bulk-delete action bar (multi-select mode) */}
      {selecting && (
        <div className="px-3 pb-2 shrink-0">
          <button
            type="button"
            onClick={deleteSelected}
            disabled={selectedCount === 0}
            className="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded-md text-[12px] bg-red-900/40 text-red-300 hover:bg-red-900/60 transition-colors disabled:opacity-40 disabled:hover:bg-red-900/40"
          >
            🗑️ Move {selectedCount > 0 ? `${selectedCount} ` : ""}to trash
          </button>
        </div>
      )}

      {/* Arabic IME global toggle */}
      <div className="px-3 pb-2 shrink-0">
        <button
          type="button"
          onClick={onToggleIme}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
            imeEnabled
              ? "bg-emerald-800 text-emerald-200"
              : "text-notion-muted hover:bg-notion-hover hover:text-notion-text"
          }`}
        >
          <span className="text-base leading-none shrink-0">ع</span>
          Arabic IME {imeEnabled ? "on" : "off"}
        </button>
      </div>

      {/* Folder tree + note list */}
      <SidebarTreeProvider value={treeValue}>
        <FolderTree />
      </SidebarTreeProvider>

      {/* User / Logout */}
      <div className="px-3 py-2 shrink-0 border-t border-notion-border">
        <Form method="post" action="/auth/logout">
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-notion-faint hover:bg-notion-hover hover:text-notion-text transition-colors group"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="truncate">{email}</span>
          </button>
        </Form>
      </div>
    </aside>
  );
}
