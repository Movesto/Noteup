import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { NoteGraph, type GraphNode } from "~/components/NoteGraph";
import { getGraph } from "~/lib/api/graph.server";
import { requireAuth } from "~/lib/session.server";
import type { GraphData } from "~/types";

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAuth(request);
  const graph = await getGraph(token).catch((): GraphData => ({ nodes: [], links: [] }));
  return json(graph);
}

export default function Index() {
  const { nodes, links } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  // Empty state — no notes or folders yet
  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="w-16 h-16 rounded-full bg-notion-surface border border-notion-border flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-notion-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="text-[18px] font-semibold text-notion-text mb-2">
          Your second brain is empty
        </h2>
        <p className="text-[13px] text-notion-faint mb-6 max-w-xs">
          Create your first page or folder to start building your knowledge graph.
        </p>
        <div className="flex gap-3">
          <Link
            to="/notes/new"
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-md text-sm font-medium text-white transition-colors"
          >
            + New Page
          </Link>
        </div>
      </div>
    );
  }

  function handleNodeClick(node: GraphNode) {
    if (node.nodeType === "folder") {
      navigate(`/folders/${node.id}`);
    } else {
      navigate(`/notes/${node.id}`);
    }
  }

  return (
    <div className="h-full w-full">
      <NoteGraph nodes={nodes} links={links} onNodeClick={handleNodeClick} />
    </div>
  );
}
