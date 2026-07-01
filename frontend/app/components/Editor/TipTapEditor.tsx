import { BubbleMenu, EditorContent, FloatingMenu, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import FontFamily from "@tiptap/extension-font-family";
import TextStyle from "@tiptap/extension-text-style";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { useFetcher, useNavigate } from "@remix-run/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArabicIME } from "./ArabicIME";
import { DirExtension } from "./DirExtension";
import { PdfEmbed } from "./PdfEmbed";
import { ArabicKeyboard } from "./ArabicKeyboard";
import { HighlightExtension } from "./HighlightExt";
import { WikiLink, wrapWikiLinks } from "./WikiLink";
import { WikiSuggest } from "./WikiSuggest";
import { LinkPreview } from "~/components/LinkPreview";
import { TASHKEEL_GROUPS } from "~/lib/arabicIme";

interface Props {
  content: string;
  onChange: (html: string) => void;
}

interface PreviewState {
  target: string;
  x: number;
  y: number;
}

// ── Font definitions ──────────────────────────────────────────────────────────
const FONTS_EN = [
  { label: "Default", value: "" },
  { label: "Playfair", value: "Playfair Display" },
  { label: "Georgia", value: "Georgia" },
  { label: "Mono", value: "JetBrains Mono" },
];

const FONTS_AR = [
  { label: "Cairo", arabic: "القاهرة", value: "Cairo" },
  { label: "Amiri", arabic: "أميري", value: "Amiri" },
  { label: "Tajawal", arabic: "تجوال", value: "Tajawal" },
  { label: "IBM Plex", arabic: "بلكس", value: "IBM Plex Arabic" },
];

// ── Block type definitions ────────────────────────────────────────────────────
const BLOCK_DEFS = [
  { id: "paragraph", label: "Text", icon: "¶", shortcut: "Ctrl+Alt+0" },
  { id: "h1", label: "Heading 1", icon: "H1", shortcut: "Ctrl+Alt+1" },
  { id: "h2", label: "Heading 2", icon: "H2", shortcut: "Ctrl+Alt+2" },
  { id: "h3", label: "Heading 3", icon: "H3", shortcut: "Ctrl+Alt+3" },
  { id: "bulletList", label: "Bullet list", icon: "•", shortcut: "Ctrl+Shift+8" },
  { id: "orderedList", label: "Numbered list", icon: "1.", shortcut: "Ctrl+Shift+7" },
  { id: "taskList", label: "To-do list", icon: "☐", shortcut: "Ctrl+Shift+9" },
  { id: "blockquote", label: "Quote", icon: '"', shortcut: "Ctrl+Shift+B" },
  { id: "codeBlock", label: "Code block", icon: "</>", shortcut: "Ctrl+Alt+C" },
] as const;

type BlockId = typeof BLOCK_DEFS[number]["id"];

export function TipTapEditor({ content, onChange }: Props) {
  const [arabicEnabled, setArabicEnabled] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("arabic_ime_enabled") === "true"
  );
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [highlightColor, setHighlightColor] = useState("#facc15");
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showTashkeel, setShowTashkeel] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const blockMenuRef = useRef<HTMLDivElement>(null);
  const fontMenuRef = useRef<HTMLDivElement>(null);
  const tashkeelMenuRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const previewFetcher = useFetcher<{ sentences: string[] }>();
  const navigate = useNavigate();
  const [navigating, setNavigating] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      ArabicIME,
      DirExtension,
      HighlightExtension,
      PdfEmbed,
      WikiLink,
    ],
    content: wrapWikiLinks(content),
    editorProps: {
      attributes: { class: "ProseMirror" },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const file = files[0];
        if (!file.type.startsWith("image/")) return false;
        event.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          const src = reader.result as string;
          const { schema } = view.state;
          const node = schema.nodes.image.create({ src });
          const tr = view.state.tr.replaceSelectionWith(node);
          view.dispatch(tr);
        };
        reader.readAsDataURL(file);
        return true;
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
      const text = editor.getText();
      setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
    },
  });

  const setIme = useCallback((enabled: boolean) => {
    if (!editor) return;
    const ime = editor.extensionManager.extensions.find((e) => e.name === "arabicIME");
    if (ime) (ime.storage as { enabled: boolean }).enabled = enabled;
    setArabicEnabled(enabled);
  }, [editor]);

  useEffect(() => {
    if (editor) setIme(localStorage.getItem("arabic_ime_enabled") === "true");
    const handler = (e: Event) => setIme((e as CustomEvent<{ enabled: boolean }>).detail.enabled);
    window.addEventListener("arabic-ime-change", handler);
    return () => window.removeEventListener("arabic-ime-change", handler);
  }, [editor, setIme]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!blockMenuRef.current?.contains(e.target as Node)) setShowBlockMenu(false);
      if (!fontMenuRef.current?.contains(e.target as Node)) setShowFontMenu(false);
      if (!tashkeelMenuRef.current?.contains(e.target as Node)) setShowTashkeel(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleMouseOver(e: React.MouseEvent<HTMLDivElement>) {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-wiki-target]");
    if (!el) return;
    const target = el.getAttribute("data-wiki-target")!;
    clearTimeout(hideTimer.current);
    const rect = el.getBoundingClientRect();
    setPreview({ target, x: rect.left, y: rect.bottom + 6 });
    if (
      previewFetcher.data === undefined ||
      (previewFetcher.data as { target?: string }).target !== target
    ) {
      previewFetcher.load(`/api/preview?title=${encodeURIComponent(target)}`);
    }
  }

  function handleMouseOut(e: React.MouseEvent<HTMLDivElement>) {
    const related = e.relatedTarget as HTMLElement | null;
    if (related?.closest?.(".wiki-preview")) return;
    hideTimer.current = setTimeout(() => setPreview(null), 250);
  }

  // Click a [[wiki-link]] to open the note it points to. The link stores a
  // title (data-wiki-target); we resolve it to a note id — creating the note if
  // it doesn't exist yet — then navigate there.
  async function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-wiki-target]");
    if (!el) return;
    const target = el.getAttribute("data-wiki-target");
    if (!target) return;
    e.preventDefault();
    if (navigating) return;
    setNavigating(true);
    setPreview(null);
    try {
      const fd = new FormData();
      fd.set("title", target);
      const res = await fetch("/api/wiki-resolve", { method: "POST", body: fd });
      if (!res.ok) return;
      const data = (await res.json()) as { id?: string };
      if (data.id) navigate(`/notes/${data.id}`);
    } finally {
      setNavigating(false);
    }
  }

  if (!editor) return null;

  // After the null guard, editor is never null — use alias to satisfy TS
  const ed = editor!;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function getActiveBlock(): BlockId {
    if (ed.isActive("heading", { level: 1 })) return "h1";
    if (ed.isActive("heading", { level: 2 })) return "h2";
    if (ed.isActive("heading", { level: 3 })) return "h3";
    if (ed.isActive("bulletList")) return "bulletList";
    if (ed.isActive("orderedList")) return "orderedList";
    if (ed.isActive("taskList")) return "taskList";
    if (ed.isActive("blockquote")) return "blockquote";
    if (ed.isActive("codeBlock")) return "codeBlock";
    return "paragraph";
  }

  function applyBlock(id: BlockId) {
    const chain = ed.chain().focus();
    switch (id) {
      case "paragraph": chain.setParagraph().run(); break;
      case "h1": chain.toggleHeading({ level: 1 }).run(); break;
      case "h2": chain.toggleHeading({ level: 2 }).run(); break;
      case "h3": chain.toggleHeading({ level: 3 }).run(); break;
      case "bulletList": chain.toggleBulletList().run(); break;
      case "orderedList": chain.toggleOrderedList().run(); break;
      case "taskList": chain.toggleTaskList().run(); break;
      case "blockquote": chain.toggleBlockquote().run(); break;
      case "codeBlock": chain.toggleCodeBlock().run(); break;
    }
    setShowBlockMenu(false);
  }

  function applyFont(value: string) {
    if (value) {
      ed.chain().focus().setFontFamily(value).run();
    } else {
      ed.chain().focus().unsetFontFamily().run();
    }
    setShowFontMenu(false);
  }

  // Insert a raw glyph (harakat, special letter, punctuation, digit) at the
  // cursor. Harakat are combining marks, so they attach to the letter the
  // caret sits after. Keep focus open so several can be added in a row.
  function insertGlyph(glyph: string) {
    ed.chain().focus().insertContent(glyph).run();
  }

  function handleWikiSelect(title: string, from: number, to: number) {
    const safe = title
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    ed.chain()
      .focus()
      .deleteRange({ from, to })
      .insertContent(
        `<span class="wiki-link" data-wiki-target="${safe}">[[${safe}]]</span>`
      )
      .run();
  }

  function handleInsertImage() {
    const url = prompt("Image URL:");
    if (!url) return;
    let parsed: URL;
    try {
      parsed = new URL(url, window.location.href);
    } catch {
      alert("Invalid image URL");
      return;
    }
    if (!["http:", "https:", "data:"].includes(parsed.protocol)) {
      alert("Image URL must use http, https, or data");
      return;
    }
    ed.chain().focus().setImage({ src: url }).run();
  }

  function handleInsertTable() {
    ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  const activeBlock = getActiveBlock();
  const activeDef = BLOCK_DEFS.find((b) => b.id === activeBlock) ?? BLOCK_DEFS[0];
  const currentFont = ed.getAttributes("textStyle").fontFamily as string | undefined ?? "";
  const currentFontLabel =
    [...FONTS_EN, ...FONTS_AR].find((f) => f.value === currentFont)?.label ?? "Font";

  const sep = <span className="w-px h-4 bg-notion-border mx-1 shrink-0" />;

  function tbBtn(
    label: string,
    active: boolean,
    onClick: () => void,
    title?: string,
    extraClass = ""
  ) {
    return (
      <button
        key={label}
        type="button"
        title={title ?? label}
        onClick={onClick}
        className={`px-2 py-1 rounded text-[12px] transition-colors shrink-0 ${extraClass} ${
          active
            ? "bg-notion-hover text-notion-text"
            : "text-notion-muted hover:bg-notion-hover hover:text-notion-text"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="relative">
      {/* ── Fixed toolbar ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 mb-4 pb-2 border-b border-notion-border select-none">

        {/* Block type dropdown */}
        <div ref={blockMenuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowBlockMenu((v) => !v)}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[12px] text-notion-muted hover:bg-notion-hover hover:text-notion-text transition-colors"
          >
            <span className="font-mono text-[11px] text-notion-faint w-5 text-center">{activeDef.icon}</span>
            <span>{activeDef.label}</span>
            <svg className="w-3 h-3 opacity-50" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 8L2 4h8z" />
            </svg>
          </button>

          {showBlockMenu && (
            <div className="absolute top-full left-0 mt-1 z-50 w-60 bg-notion-surface border border-notion-border rounded-lg shadow-xl py-1 overflow-hidden">
              {BLOCK_DEFS.map((def, i) => {
                const showDivider = i === 4 || i === 7;
                return (
                  <div key={def.id}>
                    {showDivider && <div className="my-1 border-t border-notion-border" />}
                    <button
                      type="button"
                      onClick={() => applyBlock(def.id)}
                      title={def.shortcut}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] transition-colors text-left ${
                        activeBlock === def.id
                          ? "bg-notion-hover text-emerald-400"
                          : "text-notion-muted hover:bg-notion-hover hover:text-notion-text"
                      }`}
                    >
                      <span className="font-mono text-[11px] text-notion-faint w-6 shrink-0 text-center">
                        {def.icon}
                      </span>
                      <span className="flex-1">{def.label}</span>
                      <span className="text-[10px] text-notion-faint shrink-0">{def.shortcut}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {sep}

        {/* Inline formatting */}
        {tbBtn("B", ed.isActive("bold"), () => ed.chain().focus().toggleBold().run(), "Bold (Ctrl+B)", "font-bold")}
        {tbBtn("I", ed.isActive("italic"), () => ed.chain().focus().toggleItalic().run(), "Italic (Ctrl+I)", "italic")}
        {tbBtn("U", ed.isActive("underline"), () => ed.chain().focus().toggleUnderline().run(), "Underline (Ctrl+U)", "underline")}
        {tbBtn("S", ed.isActive("strike"), () => ed.chain().focus().toggleStrike().run(), "Strikethrough (Ctrl+Shift+X)", "line-through")}
        {tbBtn("<>", ed.isActive("code"), () => ed.chain().focus().toggleCode().run(), "Inline code (Ctrl+E)", "font-mono text-[11px]")}

        {sep}

        {/* Highlight */}
        <label
          title="Highlight color"
          className="flex items-center gap-1 px-1.5 py-1 rounded cursor-pointer hover:bg-notion-hover transition-colors shrink-0"
        >
          <span
            className="w-3.5 h-3.5 rounded-sm border border-notion-border"
            style={{ background: highlightColor }}
          />
          <input
            type="color"
            value={highlightColor}
            onChange={(e) => setHighlightColor(e.target.value)}
            onInput={(e) =>
              ed.chain().focus().setHighlight({ color: (e.target as HTMLInputElement).value }).run()
            }
            className="sr-only"
          />
        </label>

        {sep}

        {/* Direction */}
        {tbBtn("LTR", false, () => ed.chain().focus().setTextDirection("ltr").run(), "Left to Right")}
        {tbBtn("RTL", false, () => ed.chain().focus().setTextDirection("rtl").run(), "Right to Left")}

        {arabicEnabled && (
          <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-900/60 text-emerald-400 font-medium shrink-0">
            ع
          </span>
        )}

        {/* Tashkeel / Arabic glyph palette */}
        <div ref={tashkeelMenuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowTashkeel((v) => !v)}
            title="Tashkeel & Arabic characters (harakat, hamza, punctuation, digits)"
            className="flex items-center gap-1 px-2 py-1 rounded text-[13px] text-notion-muted hover:bg-notion-hover hover:text-notion-text transition-colors"
          >
            <span>اً</span>
            <svg className="w-3 h-3 opacity-50" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 8L2 4h8z" />
            </svg>
          </button>

          {showTashkeel && (
            <div
              dir="rtl"
              className="absolute top-full right-0 mt-1 z-50 w-72 bg-notion-surface border border-notion-border rounded-lg shadow-xl p-2.5 space-y-2.5"
            >
              {TASHKEEL_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="px-0.5 pb-1 text-[10px] font-semibold text-notion-faint uppercase tracking-wider text-left" dir="ltr">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {group.chars.map((c) => (
                      <button
                        key={c.glyph}
                        type="button"
                        title={c.name}
                        onClick={() => insertGlyph(c.glyph)}
                        className="w-9 h-9 flex items-center justify-center rounded-md border border-notion-border bg-notion-hover hover:border-emerald-600 hover:bg-notion-surface text-[18px] text-notion-text transition-colors"
                      >
                        {/* dotted circle anchors combining harakat so they render */}
                        {group.label === "Harakat" ? `◌${c.glyph}` : c.glyph}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {sep}

        {/* Font picker */}
        <div ref={fontMenuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowFontMenu((v) => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[12px] text-notion-muted hover:bg-notion-hover hover:text-notion-text transition-colors"
          >
            <span style={{ fontFamily: currentFont || undefined }}>{currentFontLabel}</span>
            <svg className="w-3 h-3 opacity-50" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 8L2 4h8z" />
            </svg>
          </button>

          {showFontMenu && (
            <div className="absolute top-full right-0 mt-1 z-50 w-52 bg-notion-surface border border-notion-border rounded-lg shadow-xl py-1.5 overflow-hidden">
              {/* English */}
              <p className="px-3 py-1 text-[10px] font-semibold text-notion-faint uppercase tracking-wider">English</p>
              {FONTS_EN.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => applyFont(f.value)}
                  className={`w-full text-left px-3 py-1.5 text-[13px] transition-colors ${
                    currentFont === f.value
                      ? "text-emerald-400 bg-notion-hover"
                      : "text-notion-muted hover:bg-notion-hover hover:text-notion-text"
                  }`}
                  style={{ fontFamily: f.value || undefined }}
                >
                  {f.label}
                </button>
              ))}

              <div className="my-1.5 border-t border-notion-border" />

              {/* Arabic */}
              <p className="px-3 py-1 text-[10px] font-semibold text-notion-faint uppercase tracking-wider">Arabic — عربي</p>
              {FONTS_AR.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => applyFont(f.value)}
                  className={`w-full text-left px-3 py-1.5 transition-colors flex items-center justify-between ${
                    currentFont === f.value
                      ? "text-emerald-400 bg-notion-hover"
                      : "text-notion-muted hover:bg-notion-hover hover:text-notion-text"
                  }`}
                >
                  <span className="text-[13px]" style={{ fontFamily: f.value }}>{f.label}</span>
                  <span className="text-[14px]" style={{ fontFamily: f.value }}>{f.arabic}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {sep}

        {/* Image + Table insert */}
        <button
          type="button"
          title="Insert image (URL or drag & drop)"
          onClick={handleInsertImage}
          className="px-2 py-1 rounded text-[12px] text-notion-muted hover:bg-notion-hover hover:text-notion-text transition-colors shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          type="button"
          title="Insert table"
          onClick={handleInsertTable}
          className="px-2 py-1 rounded text-[12px] text-notion-muted hover:bg-notion-hover hover:text-notion-text transition-colors shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M6 3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3z" />
          </svg>
        </button>
      </div>

      {/* ── Floating menu: appears on empty paragraph ─────────────────── */}
      <FloatingMenu
        editor={editor}
        tippyOptions={{ duration: 100, placement: "left" }}
        className="flex items-center gap-0.5 bg-notion-surface border border-notion-border rounded-lg shadow-lg px-1.5 py-1"
      >
        {(["h1", "h2", "h3", "bulletList", "orderedList", "taskList", "blockquote", "codeBlock"] as BlockId[]).map((id) => {
          const def = BLOCK_DEFS.find((b) => b.id === id)!;
          return (
            <button
              key={id}
              type="button"
              title={def.label}
              onClick={() => applyBlock(id)}
              className="px-2 py-1 rounded text-[11px] font-mono text-notion-muted hover:bg-notion-hover hover:text-notion-text transition-colors"
            >
              {def.icon}
            </button>
          );
        })}
      </FloatingMenu>

      {/* ── Bubble menu: appears on text selection ────────────────────── */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100 }}
        className="flex items-center gap-0.5 bg-notion-surface border border-notion-border rounded-lg shadow-lg px-1.5 py-1"
      >
        {[
          { label: "B", title: "Bold", active: ed.isActive("bold"), fn: () => ed.chain().focus().toggleBold().run(), cls: "font-bold" },
          { label: "I", title: "Italic", active: ed.isActive("italic"), fn: () => ed.chain().focus().toggleItalic().run(), cls: "italic" },
          { label: "U", title: "Underline", active: ed.isActive("underline"), fn: () => ed.chain().focus().toggleUnderline().run(), cls: "underline" },
          { label: "S", title: "Strike", active: ed.isActive("strike"), fn: () => ed.chain().focus().toggleStrike().run(), cls: "line-through" },
          { label: "<>", title: "Code", active: ed.isActive("code"), fn: () => ed.chain().focus().toggleCode().run(), cls: "font-mono text-[10px]" },
        ].map(({ label, title, active, fn, cls }) => (
          <button
            key={label}
            type="button"
            title={title}
            onClick={fn}
            className={`px-2 py-1 rounded text-[12px] transition-colors ${cls} ${
              active ? "bg-notion-hover text-notion-text" : "text-notion-muted hover:bg-notion-hover hover:text-notion-text"
            }`}
          >
            {label}
          </button>
        ))}

        <span className="w-px h-4 bg-notion-border mx-0.5" />

        {/* Highlight in bubble menu */}
        <label
          title="Highlight"
          className="flex items-center gap-1 px-1.5 py-1 rounded cursor-pointer hover:bg-notion-hover transition-colors"
        >
          <span className="w-3.5 h-3.5 rounded-sm border border-notion-border" style={{ background: highlightColor }} />
          <input
            type="color"
            value={highlightColor}
            onChange={(e) => setHighlightColor(e.target.value)}
            onInput={(e) =>
              ed.chain().focus().setHighlight({ color: (e.target as HTMLInputElement).value }).run()
            }
            className="sr-only"
          />
        </label>
        <button
          type="button"
          title="Remove highlight"
          onClick={() => ed.chain().focus().unsetHighlight().run()}
          className="px-1.5 py-1 rounded text-[10px] text-notion-faint hover:bg-notion-hover hover:text-notion-text transition-colors"
        >
          ✕HL
        </button>
      </BubbleMenu>

      {/* ── Editor content ──────────────────────────────────────────────── */}
      <div ref={editorContainerRef} onMouseOver={handleMouseOver} onMouseOut={handleMouseOut} onClick={handleClick}>
        <EditorContent editor={editor} />
      </div>

      {/* ── Word count ──────────────────────────────────────────────────── */}
      <div className="mt-3 text-[11px] text-notion-faint text-right select-none">
        {wordCount} {wordCount === 1 ? "word" : "words"}
        {wordCount > 0 && ` · ${Math.max(1, Math.ceil(wordCount / 200))} min read`}
      </div>

      {/* ── [[Link]] autocomplete ────────────────────────────────────────── */}
      <WikiSuggest containerRef={editorContainerRef} onSelect={handleWikiSelect} />

      {/* ── [[Link]] hover preview ──────────────────────────────────────── */}
      {preview && (
        <LinkPreview
          target={preview.target}
          sentences={previewFetcher.data?.sentences ?? null}
          x={preview.x}
          y={preview.y}
          onMouseLeave={() => setPreview(null)}
        />
      )}

      {/* ── On-screen Arabic keyboard (desktop, while IME is on) ──────────── */}
      {arabicEnabled && <ArabicKeyboard onInsert={insertGlyph} />}
    </div>
  );
}
