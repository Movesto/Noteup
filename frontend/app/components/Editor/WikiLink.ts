import { InputRule, Mark, mergeAttributes, markPasteRule } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const WIKI_SUGGEST_KEY = new PluginKey("wikiSuggest");

export const WikiLink = Mark.create({
  name: "wikiLink",

  addAttributes() {
    return {
      target: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-wiki-target"),
        renderHTML: (attrs) => ({
          "data-wiki-target": attrs.target,
          class: "wiki-link",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-wiki-target]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[\[([^\]]+)\]\]$/,
        handler: ({ state, range, match }) => {
          const target = match[1];
          const mark = this.type.create({ target });
          state.tr
            .delete(range.from, range.to)
            .insert(range.from, state.schema.text(match[0], [mark]));
        },
      }),
    ];
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: /\[\[([^\]]+)\]\]/g,
        type: this.type,
        getAttributes: (match) => ({ target: match[1] }),
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: WIKI_SUGGEST_KEY,
        view() {
          return {
            update(view) {
              const { from } = view.state.selection;
              const $pos = view.state.doc.resolve(from);
              const textBefore = $pos.parent.textContent.slice(0, $pos.parentOffset);
              const match = textBefore.match(/\[\[([^\]]*)$/);
              const editorEl = view.dom;
              if (match) {
                const coords = view.coordsAtPos(from);
                editorEl.dispatchEvent(
                  new CustomEvent("wiki-suggest", {
                    bubbles: true,
                    detail: {
                      query: match[1],
                      x: coords.left,
                      y: coords.bottom,
                      from: from - match[1].length - 2,
                      to: from,
                    },
                  })
                );
              } else {
                editorEl.dispatchEvent(
                  new CustomEvent("wiki-suggest", { bubbles: true, detail: null })
                );
              }
            },
          };
        },
      }),
    ];
  },
});

export function wrapWikiLinks(html: string): string {
  if (html.includes("data-wiki-target")) return html;
  return html.replace(
    /\[\[([^\]]+)\]\]/g,
    '<span class="wiki-link" data-wiki-target="$1">[[$1]]</span>'
  );
}
