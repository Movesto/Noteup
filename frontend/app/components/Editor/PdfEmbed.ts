import { Node, mergeAttributes } from "@tiptap/core";

/**
 * A whole PDF embedded as a single block in a note.
 *
 * Used by the "Keep as PDF" import mode for documents whose text can't be
 * extracted (e.g. typeset Arabic books with no Unicode font map). The PDF is
 * carried inline as a `data:` URI in `data-pdf-src`, so it round-trips through
 * save/load exactly like the base64 images the editor already stores — no extra
 * file storage. The on-screen view (a toolbar + an <iframe> PDF viewer) is built
 * by the node view; only the lightweight wrapper div is serialized back to HTML.
 */
export const PdfEmbed = Node.create({
  name: "pdfEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-pdf-src"),
        renderHTML: (attrs) => (attrs.src ? { "data-pdf-src": attrs.src } : {}),
      },
      filename: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-pdf-name"),
        renderHTML: (attrs) => (attrs.filename ? { "data-pdf-name": attrs.filename } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-pdf-embed]" }];
  },

  // Serialized form (what getHTML stores): just the wrapper carrying the data
  // URI. The viewer is rebuilt from it on load by addNodeView / parseHTML.
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-pdf-embed": "" })];
  },

  addNodeView() {
    return ({ node }) => {
      const src = (node.attrs.src as string) || "";
      const name = (node.attrs.filename as string) || "document.pdf";

      const dom = document.createElement("div");
      dom.className = "pdf-embed";
      dom.setAttribute("data-pdf-embed", "");
      // It's an atom; keep ProseMirror from trying to edit inside it.
      dom.contentEditable = "false";

      const bar = document.createElement("div");
      bar.className = "pdf-embed-bar";

      const label = document.createElement("span");
      label.className = "pdf-embed-name";
      label.textContent = `📄 ${name}`;

      const actions = document.createElement("span");
      actions.className = "pdf-embed-actions";

      const open = document.createElement("a");
      open.href = src;
      open.target = "_blank";
      open.rel = "noopener noreferrer";
      open.textContent = "Open";

      const download = document.createElement("a");
      download.href = src;
      download.download = name;
      download.textContent = "Download";

      actions.append(open, download);
      bar.append(label, actions);

      const frame = document.createElement("iframe");
      frame.className = "pdf-embed-frame";
      frame.src = src;
      frame.title = name;

      dom.append(bar, frame);
      return { dom };
    };
  },
});
