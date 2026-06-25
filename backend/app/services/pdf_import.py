"""Import an arbitrary PDF into the app as a note — or, for a large document, as
a folder of notes split by its structure.

Unlike the Notion importer this has no semantic markup to lean on, so it decides
how to break a PDF up using, in order of preference:

1. the PDF's **outline / bookmarks** (a table of contents) — each top-level
   entry becomes a note inside a folder named after the document;
2. **textual headings** detected in the body (``Chapter 3``, ``2.1 Methods``,
   ALL-CAPS lines …) when the document is long enough to be worth splitting;
3. **page chunks** as a last resort for a long document with no structure at
   all (``Pages 1–8``, ``Pages 9–16`` …).

A short document with none of the above is imported as a single note. The
parsing here is pure and DB-free; persistence is reused from ``notion_import``.
"""

import base64
import io
import re
from dataclasses import dataclass
from typing import List, Optional, Tuple

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.services.notion_import import (
    ParsedExport,
    ParsedFolder,
    ParsedNote,
)

# A document longer than this with no usable structure is page-chunked rather
# than dropped into one enormous note.
_LONG_DOC_PAGES = 12
_PAGES_PER_CHUNK = 8
# Heading detection only kicks in for documents at least this long, so a short
# memo with a couple of bold lines stays a single note.
_HEADING_MIN_PAGES = 4

_KEYWORD_HEADING = re.compile(
    r"^(chapter|section|part|appendix|unit|lesson|module)\b\s*\S",
    re.IGNORECASE,
)
# "1 ", "1. ", "2.3 ", "4.1.2 " followed by a word.
_NUMBERED_HEADING = re.compile(r"^\d+(?:\.\d+)*\.?\s+\S")

# Below this fraction of real letters, the "text" is almost certainly a glyph
# dump from a font with no Unicode map (e.g. "/114/118/77 …" in Arabic books)
# rather than readable content — those PDFs need OCR.
_MIN_ALPHA_RATIO = 0.35
# DPI to rasterize pages at before OCR. Higher is slower but Arabic, especially
# with harakat, reads much better above 200.
_OCR_DPI = 300


@dataclass
class _Section:
    title: str
    text: str


def _esc(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _attr(value: str) -> str:
    """Escape a string for use inside a double-quoted HTML attribute."""
    return _esc(value).replace('"', "&quot;")


def _strip_doc_ext(name: str) -> str:
    """Drop a trailing ``.pdf`` (and an inner ``.docx`` etc. left by converters)."""
    name = re.sub(r"\.pdf$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\.(docx?|pptx?|pages|md)$", "", name, flags=re.IGNORECASE)
    return name


def _clean_filename_title(filename: str) -> str:
    """Turn ``My_Report.docx.pdf`` into a readable ``My Report``."""
    name = filename.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    name = _strip_doc_ext(name).replace("_", " ")
    return re.sub(r"\s+", " ", name).strip() or "Imported PDF"


def _doc_title(reader: PdfReader, filename: str) -> str:
    meta_title = (reader.metadata.title or "").strip() if reader.metadata else ""
    # Notion/Word often leave a junk metadata title (e.g. "Microsoft Word - x");
    # prefer the filename when the metadata looks like that or is empty.
    if meta_title and not meta_title.lower().startswith(("microsoft word", "untitled")):
        return re.sub(r"\s+", " ", _strip_doc_ext(meta_title)).strip()
    return _clean_filename_title(filename)


def _page_texts(reader: PdfReader) -> List[str]:
    out: List[str] = []
    for page in reader.pages:
        try:
            out.append(page.extract_text() or "")
        except Exception:
            out.append("")
    return out


def _alpha_ratio(page_texts: List[str]) -> float:
    """Fraction of non-whitespace characters that are actual letters."""
    text = " ".join(page_texts)
    non_ws = [c for c in text if not c.isspace()]
    if not non_ws:
        return 0.0
    return sum(1 for c in non_ws if c.isalpha()) / len(non_ws)


def _looks_unrecoverable(page_texts: List[str]) -> bool:
    """True when extraction produced text but it's a glyph dump, not language."""
    return _alpha_ratio(page_texts) < _MIN_ALPHA_RATIO


def _ocr_page_texts(data: bytes, dpi: int = _OCR_DPI, langs: str = "ara+eng") -> List[str]:
    """Rasterize each page and OCR it with Tesseract (Arabic + English).

    Imports are deferred so the module (and the fast, non-OCR import path) work
    even where the OCR stack isn't installed; a clear error is raised if OCR is
    requested without it.
    """
    try:
        import io as _io

        import fitz  # PyMuPDF — page rendering
        import pytesseract
        from PIL import Image
    except ImportError as exc:  # pragma: no cover - depends on deploy image
        raise ValueError(
            "OCR support isn't installed on the server. Rebuild the backend image "
            "with Tesseract and pytesseract."
        ) from exc

    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as exc:
        raise ValueError("This file could not be read as a PDF.") from exc

    texts: List[str] = []
    for page in doc:
        pix = page.get_pixmap(dpi=dpi)
        img = Image.open(_io.BytesIO(pix.tobytes("png")))
        try:
            texts.append(pytesseract.image_to_string(img, lang=langs))
        except pytesseract.TesseractNotFoundError as exc:  # pragma: no cover
            raise ValueError(
                "The OCR engine (Tesseract) isn't available on the server."
            ) from exc
        except pytesseract.TesseractError as exc:  # pragma: no cover
            raise ValueError(
                "OCR failed — the Arabic ('ara') language data may be missing on the server."
            ) from exc
    return texts


# ---------------------------------------------------------------------------
# Text -> HTML
# ---------------------------------------------------------------------------

def _looks_like_heading(line: str) -> bool:
    if len(line) > 80:
        return False
    if _KEYWORD_HEADING.match(line) or _NUMBERED_HEADING.match(line):
        return True
    # Short ALL-CAPS line with letters in it (e.g. "INTRODUCTION").
    letters = [c for c in line if c.isalpha()]
    if len(letters) >= 3 and line.upper() == line and any(c.isalpha() for c in line):
        return True
    return False


def _text_to_html(text: str) -> str:
    """Reflow extracted text into <p>/<h3> blocks.

    PDF extraction breaks every visual line, so paragraphs are reconstructed by
    joining lines until one ends a sentence (or a blank line / heading appears).
    """
    paragraphs: List[Tuple[str, str]] = []  # (tag, text)
    buf: List[str] = []

    def flush() -> None:
        if buf:
            joined = " ".join(buf).strip()
            if joined:
                paragraphs.append(("p", joined))
            buf.clear()

    for raw in text.split("\n"):
        line = raw.strip()
        if not line:
            flush()
            continue
        if _looks_like_heading(line):
            flush()
            paragraphs.append(("h3", line))
            continue
        buf.append(line)
        if line[-1] in ".!?:؛؟":  # sentence end (incl. Arabic punctuation)
            flush()
    flush()

    if not paragraphs:
        return "<p></p>"
    return "\n".join(f"<{tag}>{_esc(t)}</{tag}>" for tag, t in paragraphs)


# ---------------------------------------------------------------------------
# Structure detection
# ---------------------------------------------------------------------------

def _outline_sections(reader: PdfReader, page_texts: List[str]) -> Optional[List[_Section]]:
    """Sections from the PDF outline (top-level bookmarks), or None if unusable."""
    try:
        outline = reader.outline
    except Exception:
        return None

    entries: List[Tuple[str, int]] = []  # (title, page_index) — top level only

    def page_of(dest) -> Optional[int]:
        try:
            return reader.get_destination_page_number(dest)
        except Exception:
            return None

    # reader.outline is a list where nested lists are children; we only want the
    # top-level destinations to keep the split coarse and readable.
    for item in outline:
        if isinstance(item, list):
            continue
        title = (getattr(item, "title", "") or "").strip()
        page = page_of(item)
        if title and page is not None:
            entries.append((title, page))

    if len(entries) < 2:
        return None

    sections: List[_Section] = []
    for i, (title, start) in enumerate(entries):
        end = entries[i + 1][1] if i + 1 < len(entries) else len(page_texts)
        end = max(end, start + 1)  # always include at least the start page
        body = "\n".join(page_texts[start:end]).strip()
        sections.append(_Section(title=title, text=body))
    return sections


def _heading_sections(page_texts: List[str]) -> Optional[List[_Section]]:
    """Sections split on textual headings found in the body, or None."""
    lines = "\n".join(page_texts).split("\n")
    sections: List[_Section] = []
    current_title: Optional[str] = None
    buf: List[str] = []

    def push() -> None:
        if current_title is not None:
            sections.append(_Section(title=current_title, text="\n".join(buf).strip()))

    for raw in lines:
        line = raw.strip()
        if line and _looks_like_heading(line):
            push()
            current_title = line
            buf = []
        else:
            buf.append(raw)
    push()

    # Require a couple of real sections, each with some content, before trusting
    # this heuristic — otherwise leave it to the page-chunk / single-note paths.
    real = [s for s in sections if s.text]
    if len(real) >= 2:
        return real
    return None


def _page_chunk_sections(page_texts: List[str]) -> List[_Section]:
    sections: List[_Section] = []
    for start in range(0, len(page_texts), _PAGES_PER_CHUNK):
        end = min(start + _PAGES_PER_CHUNK, len(page_texts))
        body = "\n".join(page_texts[start:end]).strip()
        label = f"Pages {start + 1}–{end}" if end > start + 1 else f"Page {start + 1}"
        sections.append(_Section(title=label, text=body))
    return sections


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def parse_pdf(data: bytes, filename: str, ocr: bool = False) -> ParsedExport:
    """Parse PDF bytes into folders + notes (one note, or a folder of notes).

    With ``ocr=False`` the embedded text layer is read directly (fast). PDFs that
    are scanned, or whose fonts have no Unicode map (so extraction yields a glyph
    dump), raise a ``ValueError`` pointing the user at the OCR option. With
    ``ocr=True`` every page is rasterized and run through Tesseract instead.
    """
    try:
        reader = PdfReader(io.BytesIO(data))
    except (PdfReadError, Exception) as exc:  # noqa: BLE001 — surfaced to caller
        raise ValueError("This file could not be read as a PDF.") from exc

    if reader.is_encrypted:
        try:
            reader.decrypt("")  # many PDFs are "encrypted" with an empty password
        except Exception:
            raise ValueError("This PDF is password-protected and can't be imported.")

    if ocr:
        page_texts = _ocr_page_texts(data)
        if not any(t.strip() for t in page_texts):
            raise ValueError("OCR found no readable text in this PDF.")
    else:
        page_texts = _page_texts(reader)
        if not any(t.strip() for t in page_texts):
            raise ValueError(
                "No selectable text found in this PDF — it looks like a scanned image. "
                "Re-import with the “Run OCR” option ticked to read it."
            )
        if _looks_unrecoverable(page_texts):
            raise ValueError(
                "This PDF's text can't be read directly — its embedded fonts have no "
                "Unicode mapping (common for typeset Arabic books). Re-import with the "
                "“Run OCR” option ticked to extract the text."
            )

    title = _doc_title(reader, filename)
    pages = len(page_texts)

    sections = _outline_sections(reader, page_texts)
    if sections is None and pages >= _HEADING_MIN_PAGES:
        sections = _heading_sections(page_texts)
    if sections is None and pages > _LONG_DOC_PAGES:
        sections = _page_chunk_sections(page_texts)

    # Single-note case: short document, or nothing worth splitting on.
    if not sections:
        html = _text_to_html("\n".join(page_texts))
        return ParsedExport(
            folders=[],
            notes=[ParsedNote(title=title, content_html=html, folder_path=None)],
        )

    # Folder-of-notes case.
    folder_path = (title,)
    folders = [ParsedFolder(path=folder_path, name=title, parent_path=None)]
    notes = [
        ParsedNote(
            title=sec.title[:200] or "Untitled section",
            content_html=_text_to_html(sec.text),
            folder_path=folder_path,
        )
        for sec in sections
        if sec.text
    ]
    if not notes:  # every section was empty — fall back to one note
        html = _text_to_html("\n".join(page_texts))
        return ParsedExport(
            folders=[],
            notes=[ParsedNote(title=title, content_html=html, folder_path=None)],
        )
    return ParsedExport(folders=folders, notes=notes)


def embed_pdf_as_note(data: bytes, filename: str) -> ParsedExport:
    """Import the whole PDF, unmodified, as a single note.

    No text extraction or OCR — the file is carried inline as a ``data:`` URI in
    a ``pdfEmbed`` block the editor renders as an inline viewer. This is the
    right mode for PDFs whose text can't be recovered at all (e.g. typeset Arabic
    books), where the user just wants to read the original document in a note.
    """
    if not data:
        raise ValueError("The PDF is empty.")
    # Validate it really is a PDF so we don't embed arbitrary bytes.
    try:
        PdfReader(io.BytesIO(data))
    except (PdfReadError, Exception) as exc:  # noqa: BLE001 — surfaced to caller
        raise ValueError("This file could not be read as a PDF.") from exc

    title = _clean_filename_title(filename)
    display_name = filename.rsplit("/", 1)[-1].rsplit("\\", 1)[-1] or "document.pdf"
    src = "data:application/pdf;base64," + base64.b64encode(data).decode("ascii")
    # Trailing empty paragraph gives the user a place to type notes under the PDF.
    html = (
        f'<div data-pdf-embed data-pdf-src="{_attr(src)}" '
        f'data-pdf-name="{_attr(display_name)}"></div><p></p>'
    )
    return ParsedExport(
        folders=[],
        notes=[ParsedNote(title=title, content_html=html, folder_path=None)],
    )
