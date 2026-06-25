import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textDirection: {
      setTextDirection: (direction: "ltr" | "rtl") => ReturnType;
    };
  }
}

/**
 * Adds a `dir` attribute to paragraphs and headings so Arabic and English
 * can coexist in the same document with correct per-block text direction.
 *
 * When the user hasn't pinned a direction (dir === null) we render `dir="auto"`,
 * which lets the browser pick LTR/RTL from the block's first strong character.
 * This is what makes Arabic paragraphs flip to right-to-left on their own —
 * without it, Arabic typed into an LTR block produces a jumbled bidi caret that
 * feels like the keyboard "stops" after a sentence or two. The LTR/RTL toolbar
 * buttons still write an explicit value that overrides the automatic choice.
 */
export const DirExtension = Extension.create({
  name: "textDirection",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          dir: {
            default: null,
            // Treat a stored "auto" as "no explicit choice" so it round-trips.
            parseHTML: (element) => {
              const dir = element.getAttribute("dir");
              return dir === "auto" ? null : dir;
            },
            renderHTML: (attributes) => {
              // No explicit direction → let the browser decide per block.
              if (!attributes.dir) return { dir: "auto" };
              return { dir: attributes.dir };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextDirection:
        (direction: "ltr" | "rtl") =>
        ({ commands }) =>
          commands.updateAttributes("paragraph", { dir: direction }),
    };
  },
});
