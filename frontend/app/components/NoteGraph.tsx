import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@remix-run/react";
import type { GraphEdge, GraphNode } from "~/types";

// Re-exported so existing `import { ..., type GraphNode } from "~/components/NoteGraph"`
// callers keep working; the canonical definition lives in ~/types.
export type { GraphEdge, GraphNode };

interface Props {
  nodes: GraphNode[];
  links: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
}

// Neuron color palette
const NODE_COLOR: Record<string, string> = {
  folder: "#c084fc",         // purple — hub/soma
  note: "#34d399",           // emerald — active neuron
  "note-external": "#6b7280",
  "folder-external": "#8b7bb8", // muted purple — a related folder outside this view
};
const GLOW: Record<string, string | null> = {
  folder: "#c084fc",
  note: "#34d399",
  "note-external": null,
  "folder-external": null,
};

// Edge palette — one base hue per relationship, reused for the line, its
// hover/particle highlight, and the legend so they never drift apart.
const EDGE_HUE: Record<string, string> = {
  related: "#f59e0b",  // amber — related folders
  wikilink: "#34d399", // emerald — wiki-link
  contains: "#c084fc", // purple — structural containment
  similar: "#38bdf8",  // sky — inferred "same topic" (content similarity)
};
// Resting opacity per edge type (8-hex alpha). Deliberately subdued so lines
// stay quiet at a glance; hovering a node is what brings its connections to full
// strength.
const EDGE_REST_ALPHA: Record<string, string> = {
  related: "66",   // ~40%
  wikilink: "55",  // ~33%
  contains: "33",  // ~20%
  similar: "55",   // ~33%
};

const EDGE_LEGEND: { color: string; label: string; dashed?: boolean }[] = [
  { color: EDGE_HUE.related, label: "Related folders" },
  { color: EDGE_HUE.wikilink, label: "Wiki-link" },
  { color: EDGE_HUE.contains, label: "Contains" },
  { color: EDGE_HUE.similar, label: "Similar topic", dashed: true },
];

// A link's endpoints are plain id strings before the simulation runs and node
// objects after it; normalize to the id either way.
function endpointId(end: unknown): string {
  return typeof end === "object" && end !== null
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      String((end as any).id)
    : String(end);
}

export function NoteGraph({ nodes, links, onNodeClick }: Props) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [Graph, setGraph] = useState<React.ComponentType<any> | null>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphInstanceRef = useRef<any>(null);
  const [graphSearch, setGraphSearch] = useState("");
  // Id of the node currently under the cursor; drives connection highlighting.
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Undirected adjacency (nodeId -> set of directly-connected nodeIds) so a
  // hovered node can light up exactly its neighbours and the edges between them.
  const adjacency = useMemo(() => {
    const adj = new Map<string, Set<string>>();
    for (const l of links) {
      const s = endpointId(l.source);
      const t = endpointId(l.target);
      (adj.get(s) ?? adj.set(s, new Set()).get(s)!).add(t);
      (adj.get(t) ?? adj.set(t, new Set()).get(t)!).add(s);
    }
    return adj;
  }, [links]);

  useEffect(() => {
    import("react-force-graph-2d")
      .then((mod) => setGraph(() => mod.default))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() =>
      setDims({ width: el.offsetWidth, height: el.offsetHeight })
    );
    obs.observe(el);
    setDims({ width: el.offsetWidth, height: el.offsetHeight });
    return () => obs.disconnect();
  }, []);

  const setGraphRef = useCallback((instance: unknown) => {
    graphInstanceRef.current = instance;
    if (!instance) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = instance as any;
    setTimeout(() => {
      try {
        g.d3Force("charge")?.strength(-350);
        g.d3Force("link")?.distance(90).strength(0.4);
        g.d3Force("collision") && g.d3Force("collision").radius(20);
        g.d3ReheatSimulation?.();
      } catch { /* not ready */ }
    }, 80);
  }, []);

  function zoomIn() { graphInstanceRef.current?.zoom(graphInstanceRef.current.zoom() * 1.4, 300); }
  function zoomOut() { graphInstanceRef.current?.zoom(graphInstanceRef.current.zoom() / 1.4, 300); }
  function center() { graphInstanceRef.current?.zoomToFit(400, 40); }

  function handleGraphSearch(q: string) {
    setGraphSearch(q);
    if (!q.trim()) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const liveNodes: any[] = graphInstanceRef.current?.graphData()?.nodes ?? [];
    const match = liveNodes.find((n) =>
      (n.name as string).toLowerCase().includes(q.toLowerCase())
    );
    if (match?.x != null && match?.y != null) {
      graphInstanceRef.current?.centerAt(match.x, match.y, 500);
      graphInstanceRef.current?.zoom(3, 500);
    }
  }

  const highlightedIds = graphSearch.trim()
    ? new Set(nodes.filter((n) => n.name.toLowerCase().includes(graphSearch.toLowerCase())).map((n) => n.id))
    : null;

  const isHovering = hoverId !== null;
  // Something is "focused" when a search is active or a node is hovered; only
  // then do we dim everything outside the focus.
  const hasFocus = highlightedIds !== null || isHovering;

  // A node is in focus if it matches the search, or (on hover) is the hovered
  // node or one of its direct neighbours.
  function nodeInFocus(id: string): boolean {
    if (highlightedIds) return highlightedIds.has(id);
    if (isHovering) return id === hoverId || adjacency.get(hoverId!)?.has(id) === true;
    return true;
  }

  // A link is in focus only while hovering, when it touches the hovered node.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function linkTouchesHover(l: any): boolean {
    return isHovering &&
      (endpointId(l.source) === hoverId || endpointId(l.target) === hoverId);
  }

  function handleNodeHover(node: unknown) {
    const id = node ? String((node as GraphNode).id) : null;
    setHoverId(id);
    const el = containerRef.current;
    if (el) el.style.cursor = id ? "pointer" : "default";
  }

  function paintNode(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    node: any,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) {
    const x: number = node.x ?? 0;
    const y: number = node.y ?? 0;
    const nodeType: string = node.nodeType ?? "note";
    const r: number = nodeType === "folder" ? 7 : 5;
    const isDimmed = hasFocus && !nodeInFocus(node.id as string);
    const color = isDimmed ? "#2a2a2a" : (NODE_COLOR[nodeType] ?? "#34d399");
    const glowColor = isDimmed ? null : GLOW[nodeType];
    const isFocused = hasFocus && !isDimmed;

    // The glow is the dominant per-frame cost with hundreds of nodes: a radial
    // gradient + shadowBlur on every node every frame froze weak devices. Now
    // the expensive shadowBlur is reserved for highlighted nodes while hovering;
    // at rest each node draws just a cheap faint halo disc (no gradient/shadow).
    if (glowColor && isFocused) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 16;
    } else if (glowColor) {
      ctx.beginPath();
      ctx.arc(x, y, r * 1.8, 0, 2 * Math.PI);
      ctx.fillStyle = `${glowColor}22`;
      ctx.fill();
    }

    // Core circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Label
    const label: string = node.name ?? "";
    const fontSize = Math.max(3, Math.min(11, 10 / globalScale));
    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const alpha = isDimmed ? 0.08 : Math.min(1, Math.max(0.15, globalScale * 0.8));
    ctx.fillStyle = nodeType === "note-external" || isDimmed
      ? `rgba(107,114,128,${alpha})`
      : `rgba(220,220,220,${alpha})`;
    ctx.fillText(label, x, y + r + 2);
  }

  function handleNodeClick(node: unknown) {
    const n = node as GraphNode;
    if (onNodeClick) { onNodeClick(n); return; }
    if (n.nodeType.startsWith("folder")) navigate(`/folders/${n.id}`);
    else navigate(`/notes/${n.id}`);
  }

  // Built once per nodes/links change and kept stable across re-renders. If this
  // were rebuilt every render, each hover/click (which updates state) would hand
  // the force-graph fresh objects, making it reheat the simulation and jump the
  // layout — the "glitch on every click". Hover highlighting works purely through
  // the colour/width accessors, so the data identity can stay put.
  const graphData = useMemo(
    () => ({
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((l) => ({ ...l })),
    }),
    [nodes, links]
  );

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Graph search */}
      {Graph && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-56">
          <input
            data-no-ime
            value={graphSearch}
            onChange={(e) => handleGraphSearch(e.target.value)}
            placeholder="Find node…"
            className="w-full bg-notion-surface/80 border border-notion-border rounded-md px-3 py-1.5 text-[12px] text-notion-text placeholder:text-notion-faint focus:outline-none focus:border-emerald-700 backdrop-blur-sm transition-all"
          />
        </div>
      )}

      {/* Edge legend overlay */}
      {Graph && (
        <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 rounded-md bg-notion-surface/80 border border-notion-border px-3 py-2 backdrop-blur-sm">
          {EDGE_LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className="inline-block w-5"
                style={
                  item.dashed
                    ? { borderTop: `2px dashed ${item.color}` }
                    : { height: "2px", borderRadius: "9999px", backgroundColor: item.color }
                }
              />
              <span className="text-[11px] text-notion-muted">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Zoom controls overlay */}
      {Graph && (
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1">
          <button
            type="button"
            onClick={zoomIn}
            title="Zoom in"
            className="w-8 h-8 flex items-center justify-center rounded-md bg-notion-surface/80 border border-notion-border text-notion-muted hover:text-notion-text hover:bg-notion-hover backdrop-blur-sm transition-colors text-lg leading-none"
          >+</button>
          <button
            type="button"
            onClick={zoomOut}
            title="Zoom out"
            className="w-8 h-8 flex items-center justify-center rounded-md bg-notion-surface/80 border border-notion-border text-notion-muted hover:text-notion-text hover:bg-notion-hover backdrop-blur-sm transition-colors text-lg leading-none"
          >−</button>
          <button
            type="button"
            onClick={center}
            title="Fit to screen"
            className="w-8 h-8 flex items-center justify-center rounded-md bg-notion-surface/80 border border-notion-border text-notion-muted hover:text-notion-text hover:bg-notion-hover backdrop-blur-sm transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      )}
      {Graph ? (
        <Graph
          ref={setGraphRef}
          graphData={graphData}
          backgroundColor="#050510"
          width={dims.width}
          height={dims.height}
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode="replace"
          nodePointerAreaPaint={(node: unknown, color: string, ctx: CanvasRenderingContext2D) => {
            const n = node as GraphNode & { x: number; y: number };
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(n.x, n.y, 12, 0, 2 * Math.PI);
            ctx.fill();
          }}
          linkColor={(l: unknown) => {
            const e = l as GraphEdge;
            const hue = EDGE_HUE[e.edgeType] ?? EDGE_HUE.contains;
            if (isHovering) {
              // Light up the hovered node's own edges; fade the rest right back.
              return linkTouchesHover(l) ? hue : "#5b5b6e16";
            }
            return `${hue}${EDGE_REST_ALPHA[e.edgeType] ?? "40"}`;
          }}
          linkWidth={(l: unknown) => {
            const e = l as GraphEdge;
            // Thin and minimal at rest; the hovered node's edges thicken to read.
            if (linkTouchesHover(l)) return e.edgeType === "related" ? 3 : 2.2;
            return e.edgeType === "related" ? 1.5 : e.edgeType === "contains" ? 0.8 : 1;
          }}
          // Dashed = inferred connection (content similarity); solid = explicit
          // links and structure. Lets you tell "the app guessed this" apart at a
          // glance from links you actually made.
          linkLineDash={(l: unknown) =>
            (l as GraphEdge).edgeType === "similar" ? [4, 3] : null
          }
          // Straight lines — cleanest read of the structure.
          linkCurvature={0}
          // No particle motion at all: the edges are completely static so nothing
          // animates the canvas. Hovering a node reads through the instant
          // brighten + thicken of its edges (and dimming of the rest) above —
          // no moving dots to chase or click through.
          linkDirectionalParticles={0}
          // Fewer synchronous warmup ticks so a large graph doesn't block the
          // main thread on mount; the remaining cooldown ticks settle it visibly.
          warmupTicks={30}
          cooldownTicks={50}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          nodeLabel={(n: unknown) => (n as GraphNode).name}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-notion-faint text-sm">
          Loading graph…
        </div>
      )}
    </div>
  );
}
