import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  json,
} from "@remix-run/node";
import { Link, useLoaderData, useFetcher, useRevalidator, useNavigate } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { TipTapEditor } from "~/components/Editor/TipTapEditor";
import { CoverPicker, type UnsplashPhoto } from "~/components/CoverPicker";
import { listFolders } from "~/lib/api/folders.server";
import {
  deleteNote,
  getBacklinks,
  getNote,
  moveNote,
  updateNoteAliases,
  updateNoteContent,
  updateNoteCover,
} from "~/lib/api/notes.server";
import { requireAuth } from "~/lib/session.server";
import type { Folder, NoteSummary } from "~/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, (_, t) => `# ${t}\n`)
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, (_, t) => `## ${t}\n`)
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, (_, t) => `### ${t}\n`)
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, (_, t) => `**${t}**`)
    .replace(/<b[^>]*>(.*?)<\/b>/gi, (_, t) => `**${t}**`)
    .replace(/<em[^>]*>(.*?)<\/em>/gi, (_, t) => `*${t}*`)
    .replace(/<i[^>]*>(.*?)<\/i>/gi, (_, t) => `*${t}*`)
    .replace(/<u[^>]*>(.*?)<\/u>/gi, (_, t) => `__${t}__`)
    .replace(/<s[^>]*>(.*?)<\/s>/gi, (_, t) => `~~${t}~~`)
    .replace(/<code[^>]*>(.*?)<\/code>/gi, (_, t) => `\`${t}\``)
    .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, t) => `\`\`\`\n${t}\n\`\`\`\n`)
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, t) =>
      t.trim().split("\n").map((l: string) => `> ${l}`).join("\n") + "\n"
    )
    .replace(/<li[^>]*>(.*?)<\/li>/gi, (_, t) => `- ${t.replace(/<[^>]+>/g, "")}\n`)
    .replace(/<p[^>]*>(.*?)<\/p>/gi, (_, t) => `${t}\n`)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { token } = await requireAuth(request);
  if (!params.id || !UUID_RE.test(params.id)) {
    throw new Response("Not Found", { status: 404 });
  }
  const [note, folders, backlinks] = await Promise.all([
    getNote(token, params.id),
    listFolders(token).catch(() => [] as Folder[]),
    getBacklinks(token, params.id).catch(() => [] as NoteSummary[]),
  ]);
  if (!note) throw new Response("Not Found", { status: 404 });
  return json({ note, folders, backlinks });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { token } = await requireAuth(request);
  const form = await request.formData();
  const intent = form.get("intent") as string | null;

  const id = params.id!;

  if (intent === "moveFolder") {
    const folderId = (form.get("folderId") as string | null) || null;
    await moveNote(token, id, folderId);
    return json({ ok: true });
  }

  if (intent === "cover") {
    const coverUrl = (form.get("coverUrl") as string | null) || null;
    await updateNoteCover(token, id, coverUrl);
    return json({ ok: true });
  }

  if (intent === "aliases") {
    const aliases = JSON.parse((form.get("aliases") as string) || "[]") as string[];
    await updateNoteAliases(token, id, aliases);
    return json({ ok: true });
  }

  if (intent === "delete") {
    await deleteNote(token, id);
    return json({ deleted: true });
  }

  // Default: update content + title
  const content = form.get("content") as string | null;
  const title = form.get("title") as string | null;

  await updateNoteContent(token, id, { title, content });
  return json({ ok: true });
}

export default function NotePage() {
  const { note, folders, backlinks } = useLoaderData<typeof loader>();
  const saveFetcher = useFetcher();
  const moveFetcher = useFetcher();
  const coverFetcher = useFetcher();
  const aliasFetcher = useFetcher();
  const deleteFetcher = useFetcher<{ deleted?: boolean }>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [coverUrl, setCoverUrl] = useState<string | null>(note.coverUrl ?? null);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [coverHovered, setCoverHovered] = useState(false);
  const [addingCover, setAddingCover] = useState(false);
  const [aliases, setAliases] = useState<string[]>(note.aliases ?? []);
  const [aliasInput, setAliasInput] = useState("");
  const aliasInputRef = useRef<HTMLInputElement>(null);

  const titleRef = useRef(title);
  const submitRef = useRef(saveFetcher.submit);
  const pendingContent = useRef(note.content);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const folderPickerRef = useRef<HTMLDivElement>(null);
  const coverAreaRef = useRef<HTMLDivElement>(null);
  const isDirty = useRef(false);

  useEffect(() => { titleRef.current = title; });
  useEffect(() => { submitRef.current = saveFetcher.submit; });

  // Warn before closing tab with unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty.current) { e.preventDefault(); }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Revalidate sidebar after folder move
  useEffect(() => {
    if (moveFetcher.state === "idle" && moveFetcher.data) {
      revalidator.revalidate();
    }
  }, [moveFetcher.state, moveFetcher.data]);

  // Close folder picker on outside click
  useEffect(() => {
    if (!showFolderPicker) return;
    function handler(e: MouseEvent) {
      if (!folderPickerRef.current?.contains(e.target as Node)) {
        setShowFolderPicker(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFolderPicker]);

  function scheduleSave() {
    isDirty.current = true;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      submitRef.current(
        { content: pendingContent.current, title: titleRef.current },
        { method: "post" }
      );
      isDirty.current = false;
    }, 1200);
  }

  function handleContentChange(html: string) {
    pendingContent.current = html;
    scheduleSave();
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    titleRef.current = e.target.value;
    scheduleSave();
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      document.querySelector<HTMLElement>(".ProseMirror")?.focus();
    }
  }

  function moveToFolder(folderId: string | null) {
    const fd = new FormData();
    fd.set("intent", "moveFolder");
    if (folderId) fd.set("folderId", folderId);
    moveFetcher.submit(fd, { method: "post" });
    setShowFolderPicker(false);
  }

  function persistCover(url: string | null) {
    const fd = new FormData();
    fd.set("intent", "cover");
    if (url) fd.set("coverUrl", url);
    coverFetcher.submit(fd, { method: "post" });
  }

  async function handleAddCover() {
    setAddingCover(true);
    try {
      const res = await fetch("/api/unsplash?action=random");
      const data: { photos: UnsplashPhoto[]; error?: string } = await res.json();
      if (data.photos?.[0]) {
        const url = data.photos[0].url;
        setCoverUrl(url);
        persistCover(url);
      }
    } finally {
      setAddingCover(false);
    }
  }

  function handleSelectCover(photo: UnsplashPhoto) {
    setCoverUrl(photo.url);
    persistCover(photo.url);
    setShowCoverPicker(false);
  }

  function handleRemoveCover() {
    setCoverUrl(null);
    persistCover(null);
    setShowCoverPicker(false);
  }

  // Redirect home after delete
  useEffect(() => {
    if (deleteFetcher.state === "idle" && deleteFetcher.data?.deleted) {
      revalidator.revalidate();
      navigate("/");
    }
  }, [deleteFetcher.state, deleteFetcher.data]);

  function persistAliases(next: string[]) {
    const fd = new FormData();
    fd.set("intent", "aliases");
    fd.set("aliases", JSON.stringify(next));
    aliasFetcher.submit(fd, { method: "post" });
  }

  function addAlias() {
    const value = aliasInput.trim();
    if (!value || aliases.includes(value)) { setAliasInput(""); return; }
    const next = [...aliases, value];
    setAliases(next);
    setAliasInput("");
    persistAliases(next);
  }

  function removeAlias(alias: string) {
    const next = aliases.filter((a) => a !== alias);
    setAliases(next);
    persistAliases(next);
  }

  function handleAliasKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addAlias(); }
    if (e.key === "Backspace" && aliasInput === "" && aliases.length > 0) {
      removeAlias(aliases[aliases.length - 1]);
    }
  }

  function handleDeleteNote() {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const fd = new FormData();
    fd.set("intent", "delete");
    deleteFetcher.submit(fd, { method: "post" });
  }

  function handleExport() {
    const md = htmlToMarkdown(pendingContent.current);
    const full = `# ${title}\n\n${md}`;
    const blob = new Blob([full], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "note"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isSaving = saveFetcher.state !== "idle";
  const currentFolder = folders.find((f) => f.id === note.folderId);

  function buildFolderOptions(
    parentId: string | null,
    depth: number
  ): { folder: Folder; depth: number }[] {
    const children = folders.filter((f) => (f.parentId ?? null) === parentId);
    return children.flatMap((f) => [
      { folder: f, depth },
      ...buildFolderOptions(f.id, depth + 1),
    ]);
  }
  const folderOptions = buildFolderOptions(null, 0);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Top bar: folder breadcrumb + save indicator + delete ── */}
      <div className="shrink-0 flex items-center justify-between px-8 pt-3 pb-1">
        <div className="relative" ref={folderPickerRef}>
          <button
            type="button"
            onClick={() => setShowFolderPicker((v) => !v)}
            className="flex items-center gap-1 text-[12px] text-notion-faint hover:text-notion-muted transition-colors"
          >
            {currentFolder ? (
              <><span>📁</span><span>{currentFolder.name}</span></>
            ) : (
              <span>+ Add to folder</span>
            )}
          </button>

          {showFolderPicker && (
            <div className="absolute top-full left-0 mt-1 z-50 w-52 bg-notion-surface border border-notion-border rounded-lg shadow-xl py-1">
              {note.folderId && (
                <button
                  type="button"
                  onClick={() => moveToFolder(null)}
                  className="w-full text-left px-3 py-1.5 text-[12px] text-notion-muted hover:bg-notion-hover hover:text-notion-text transition-colors"
                >
                  Remove from folder
                </button>
              )}
              {folderOptions.length === 0 && !note.folderId && (
                <p className="px-3 py-2 text-[12px] text-notion-faint">No folders yet</p>
              )}
              {folderOptions.map(({ folder, depth }) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => moveToFolder(folder.id)}
                  className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${
                    folder.id === note.folderId
                      ? "text-emerald-400 bg-notion-hover"
                      : "text-notion-muted hover:bg-notion-hover hover:text-notion-text"
                  }`}
                  style={{ paddingLeft: 12 + depth * 12 }}
                >
                  📁 {folder.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-[11px] transition-colors ${isSaving ? "text-emerald-500" : "text-notion-faint"}`}>
            {isSaving ? "saving…" : "saved"}
          </span>
          <button
            type="button"
            onClick={handleExport}
            title="Export as Markdown"
            className="flex items-center gap-1 text-[12px] text-notion-faint hover:text-notion-muted transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button
            type="button"
            onClick={handleDeleteNote}
            disabled={deleteFetcher.state !== "idle"}
            title="Delete note"
            className="flex items-center gap-1 text-[12px] text-notion-faint hover:text-red-400 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Cover image ── */}
        {coverUrl ? (
          <div
            ref={coverAreaRef}
            className="relative w-full"
            onMouseEnter={() => setCoverHovered(true)}
            onMouseLeave={() => setCoverHovered(false)}
          >
            <img
              src={coverUrl}
              alt="Cover"
              className="w-full object-cover"
              style={{ height: 240 }}
              onError={() => { setCoverUrl(null); persistCover(null); }}
            />
            {/* Gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 pointer-events-none" />

            {/* Cover controls (always visible on desktop for discoverability) */}
            <div className="absolute top-3 right-3 flex gap-1.5">
              {/* Change cover — opens picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCoverPicker((v) => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-black/50 hover:bg-black/70 text-white text-[12px] font-medium backdrop-blur-sm transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Change cover
                </button>

                {/* Cover picker panel */}
                {showCoverPicker && (
                  <div className="absolute right-0 top-full mt-1 w-[520px] z-50">
                    <CoverPicker
                      onSelect={handleSelectCover}
                      onClose={() => setShowCoverPicker(false)}
                    />
                  </div>
                )}
              </div>

              {/* Remove cover */}
              <button
                type="button"
                onClick={handleRemoveCover}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-black/50 hover:bg-black/70 text-white text-[12px] font-medium backdrop-blur-sm transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Remove
              </button>
            </div>
          </div>
        ) : null}

        {/* ── Note content ── */}
        <div className="max-w-prose mx-auto px-8 pb-16">
          {/* "Add cover" button — visible on hover when no cover */}
          {!coverUrl && (
            <div className="group flex items-center gap-3 mt-4 mb-1">
              <button
                type="button"
                onClick={handleAddCover}
                disabled={addingCover}
                className="flex items-center gap-1.5 text-[12px] text-notion-faint hover:text-notion-muted transition-all"
              >
                {addingCover ? (
                  <div className="w-3.5 h-3.5 border border-notion-faint border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                Add cover
              </button>
            </div>
          )}

          {/* ── Aliases editor ── */}
          <div className="flex flex-wrap items-center gap-1.5 mt-4 mb-1 min-h-[24px]">
            {aliases.map((alias) => (
              <span
                key={alias}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-notion-hover border border-notion-border text-[11px] text-notion-muted"
              >
                {alias}
                <button
                  type="button"
                  onClick={() => removeAlias(alias)}
                  className="text-notion-faint hover:text-red-400 transition-colors leading-none"
                  aria-label={`Remove alias ${alias}`}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              ref={aliasInputRef}
              data-no-ime
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              onKeyDown={handleAliasKeyDown}
              onBlur={addAlias}
              placeholder={aliases.length === 0 ? "Add alias…" : "+"}
              className="text-[11px] text-notion-muted bg-transparent focus:outline-none placeholder:text-notion-faint min-w-[70px] max-w-[160px]"
            />
          </div>

          <input
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled"
            className="w-full text-[40px] font-bold text-notion-text bg-transparent focus:outline-none placeholder:text-notion-faint mt-6 mb-3 leading-tight"
          />

          <TipTapEditor
            key={note.id}
            content={note.content}
            onChange={handleContentChange}
          />

          {/* ── Backlinks ─────────────────────────────────────────────── */}
          {backlinks.length > 0 && (
            <div className="mt-12 pt-6 border-t border-notion-border">
              <p className="text-[11px] font-semibold text-notion-faint uppercase tracking-wider mb-3">
                Linked from ({backlinks.length})
              </p>
              <div className="space-y-0.5">
                {backlinks.map((bl) => (
                  <Link
                    key={bl.id}
                    to={`/notes/${bl.id}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-notion-hover transition-colors group"
                  >
                    <span className="text-notion-faint text-[10px] shrink-0">&#9632;</span>
                    <span className="text-[13px] text-notion-muted group-hover:text-notion-text transition-colors">
                      {bl.title || "Untitled"}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
