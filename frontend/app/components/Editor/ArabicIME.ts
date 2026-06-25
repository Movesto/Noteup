import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { getImeMap } from "~/lib/arabicIme";

const arabicIMEKey = new PluginKey("arabicIME");

export const ArabicIME = Extension.create({
  name: "arabicIME",

  addStorage() {
    return { enabled: false };
  },

  addProseMirrorPlugins() {
    const storage = this.storage as { enabled: boolean };

    return [
      new Plugin({
        key: arabicIMEKey,
        props: {
          handleKeyDown(view, event) {
            if (!storage.enabled) return false;
            // Never hijack editor/OS shortcuts (Ctrl+A, Ctrl+Z, Cmd+B, …) —
            // those keys are also letters in the map, so without this guard the
            // IME would swallow undo/select-all/copy and insert Arabic instead.
            if (event.ctrlKey || event.metaKey || event.altKey) return false;
            // Read live from localStorage so settings changes take effect immediately.
            const map = getImeMap();
            const arabic = map[event.key];
            if (!arabic) return false;
            event.preventDefault();
            // Insert as plain text via a transaction (replacing any selection).
            // This is the same path native typing uses and avoids the HTML-parse
            // round-trip of insertContent, which could choke on repeated calls.
            const { from, to } = view.state.selection;
            view.dispatch(view.state.tr.insertText(arabic, from, to).scrollIntoView());
            return true;
          },
        },
      }),
    ];
  },
});
