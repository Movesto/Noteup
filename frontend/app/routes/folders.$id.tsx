import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData, useNavigate, useFetcher, useRevalidator } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { NoteGraph, type GraphNode } from "~/components/NoteGraph";
import { getFolderGraph } from "~/lib/api/graph.server";
import { requireAuth } from "~/lib/session.server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { token } = await requireAuth(request);
  const id = params.id!;
  if (!UUID_RE.test(id)) throw new Response("Not Found", { status: 404 });

  const folderGraph = await getFolderGraph(token, id);
  if (!folderGraph) throw new Response("Not Found", { status: 404 });

  return json({ id, nodes: folderGraph.nodes, links: folderGraph.links });
}

export default function FolderPage() {
  const { id, nodes, links } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const folderFetcher = useFetcher();
  const revalidator = useRevalidator();
  const [showNewFolder, setShowNewFolder] = useState(false);
  const newFolderRef = useRef<HTMLInputElement>(null);

  const folderNode = nodes.find((n) => n.nodeType === "folder" && n.id === id);
  const folderName = folderNode?.name ?? "Folder";
  const itemCount = nodes.filter((n) => !n.nodeType.endsWith("-external") && n.id !== id).length;

  useEffect(() => {
    if (folderFetcher.state === "idle" && folderFetcher.data) {
      revalidator.revalidate();
      setShowNewFolder(false);
    }
  }, [folderFetcher.state, folderFetcher.data]);

  useEffect(() => {
    if (showNewFolder) newFolderRef.current?.focus();
  }, [showNewFolder]);

  function handleNodeClick(node: GraphNode) {
    if (node.nodeType.startsWith("folder")) {
      navigate(`/folders/${node.id}`);
    } else {
      navigate(`/notes/${node.id}`);
    }
  }

  function submitNewSubfolder(name: string) {
    if (!name.trim()) {
      setShowNewFolder(false);
      return;
    }
    const fd = new FormData();
    fd.set("intent", "create");
    fd.set("name", name.trim());
    fd.set("parentId", id);
    folderFetcher.submit(fd, { method: "post", action: "/api/folders" });
  }

  const isEmpty = nodes.filter((n) => n.id !== id && !n.nodeType.endsWith("-external")).length === 0;

  return (
    <div className="h-full flex flex-col">
      {/* ── Top bar ── */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-notion-border bg-notion-bg">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-notion-faint hover:text-notion-muted transition-colors text-lg leading-none"
          title="Go back"
        >
          ←
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-base">📁</span>
          <span className="text-[14px] font-semibold text-notion-text truncate">
            {folderName}
          </span>
          {itemCount > 0 && (
            <span className="text-[11px] text-notion-faint shrink-0">
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate(`/notes/new?folderId=${id}&folderName=${encodeURIComponent(folderName)}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-md text-[12px] font-medium text-white transition-colors"
          >
            + Note
          </button>
          <button
            type="button"
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-notion-hover hover:bg-notion-border rounded-md text-[12px] font-medium text-notion-muted hover:text-notion-text transition-colors"
          >
            + Subfolder
          </button>
        </div>
      </div>

      {/* ── New subfolder input ── */}
      {showNewFolder && (
        <div className="shrink-0 px-6 py-2 border-b border-notion-border bg-notion-surface flex items-center gap-2">
          <span className="text-[12px] text-notion-faint shrink-0">Subfolder name:</span>
          <input
            ref={newFolderRef}
            className="flex-1 max-w-xs bg-notion-hover border border-emerald-700 rounded px-2 py-1 text-[12px] text-notion-text placeholder:text-notion-faint focus:outline-none"
            placeholder="My Subfolder"
            onKeyDown={(e) => {
              if (e.key === "Enter") submitNewSubfolder(e.currentTarget.value);
              if (e.key === "Escape") setShowNewFolder(false);
            }}
            onBlur={(e) => submitNewSubfolder(e.currentTarget.value)}
          />
        </div>
      )}

      {/* ── Graph / empty state ── */}
      <div className="flex-1 overflow-hidden">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <p className="text-[13px] text-notion-faint mb-4">
              This folder is empty — no pages yet.
            </p>
            <button
              type="button"
              onClick={() => navigate(`/notes/new?folderId=${id}&folderName=${encodeURIComponent(folderName)}`)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-md text-sm font-medium text-white transition-colors"
            >
              + Create a page here
            </button>
          </div>
        ) : (
          <NoteGraph key={nodes.map(n=>n.id).join(",")} nodes={nodes} links={links} onNodeClick={handleNodeClick} />
        )}
      </div>
    </div>
  );
}
