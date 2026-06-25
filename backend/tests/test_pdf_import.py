"""Tests for the PDF importer's pure parsing/splitting logic.

These cover the structure-detection heuristics and text→HTML reflow without
needing a real PDF; the pypdf reading path is exercised manually/in integration.
"""

import base64

import pytest

from app.services.pdf_import import (
    _alpha_ratio,
    _clean_filename_title,
    _heading_sections,
    _looks_like_heading,
    _looks_unrecoverable,
    _page_chunk_sections,
    _text_to_html,
    embed_pdf_as_note,
)

# A minimal valid one-page PDF (generated once), used to exercise embed mode
# without depending on a PDF-generation library at test time.
_TINY_PDF = base64.b64decode(
    "JVBERi0xLjMKJenr8b8KMSAwIG9iago8PAovQ291bnQgMQovS2lkcyBbMyAwIFJdCi9NZWRpYUJv"
    "eCBbMCAwIDU5NS4yOCA4NDEuODldCi9UeXBlIC9QYWdlcwo+PgplbmRvYmoKMiAwIG9iago8PAov"
    "T3BlbkFjdGlvbiBbMyAwIFIgL0ZpdEggbnVsbF0KL1BhZ2VMYXlvdXQgL09uZUNvbHVtbgovUGFn"
    "ZXMgMSAwIFIKL1R5cGUgL0NhdGFsb2cKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL0NvbnRlbnRzIDQg"
    "MCBSCi9QYXJlbnQgMSAwIFIKL1Jlc291cmNlcyA2IDAgUgovVHlwZSAvUGFnZQo+PgplbmRvYmoK"
    "NCAwIG9iago8PAovRmlsdGVyIC9GbGF0ZURlY29kZQovTGVuZ3RoIDYzCj4+CnN0cmVhbQp4nDNS"
    "8OIy0DM1VyjncgpR0HczVDA00jMwUAhJU3ANAQkZG+oZWiiYW5rqmZsrhKQoaHhkaiqEZIFkAXf"
    "eDMkKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8Ci9CYXNlRm9udCAvSGVsdmV0aWNhCi9FbmNv"
    "ZGluZyAvV2luQW5zaUVuY29kaW5nCi9TdWJ0eXBlIC9UeXBlMQovVHlwZSAvRm9udAo+PgplbmRv"
    "YmoKNiAwIG9iago8PAovRm9udCA8PC9GMSA1IDAgUj4+Ci9Qcm9jU2V0IFsvUERGIC9UZXh0IC9J"
    "bWFnZUIgL0ltYWdlQyAvSW1hZ2VJXQo+PgplbmRvYmoKNyAwIG9iago8PAovQ3JlYXRpb25EYXRl"
    "IChEOjIwMjYwNjI0MjMxOTEwWikKPj4KZW5kb2JqCnhyZWYKMCA4CjAwMDAwMDAwMDAgNjU1MzUg"
    "ZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMTAyIDAwMDAwIG4gCjAwMDAwMDAyMDUgMDAw"
    "MDAgbiAKMDAwMDAwMDI4NSAwMDAwMCBuIAowMDAwMDAwNDE5IDAwMDAwIG4gCjAwMDAwMDA1MTYg"
    "MDAwMDAgbiAKMDAwMDAwMDYwMyAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDgKL1Jvb3QgMiAw"
    "IFIKL0luZm8gNyAwIFIKL0lEIFs8OUI1RTVBQzM2MDMxQ0E1QTIyOUQyNjQ2MzYxODFCMEM+PDlC"
    "NUU1QUMzNjAzMUNBNUEyMjlEMjY0NjM2MTgxQjBDPl0KPj4Kc3RhcnR4cmVmCjY1OAolJUVPRgo="
)


def test_clean_filename_title():
    assert _clean_filename_title("My_Weekly_Memo.pdf") == "My Weekly Memo"
    assert _clean_filename_title("Desktop Resume.docx.pdf") == "Desktop Resume"
    assert _clean_filename_title("/home/x/Report.PDF") == "Report"
    assert _clean_filename_title(".pdf") == "Imported PDF"


def test_looks_like_heading():
    assert _looks_like_heading("Chapter 3")
    assert _looks_like_heading("2.1 Methods")
    assert _looks_like_heading("INTRODUCTION")
    assert _looks_like_heading("Appendix A")
    # Body prose and long lines are not headings.
    assert not _looks_like_heading("This is an ordinary sentence that runs on for a while.")
    assert not _looks_like_heading("the quick brown fox")


def test_text_to_html_reflows_paragraphs_and_headings():
    text = (
        "Chapter 1\n"
        "This sentence is wrapped\n"
        "across two lines.\n"
        "\n"
        "A second paragraph here."
    )
    html = _text_to_html(text)
    assert "<h3>Chapter 1</h3>" in html
    # Wrapped lines are rejoined into one paragraph (ended by the period).
    assert "<p>This sentence is wrapped across two lines.</p>" in html
    assert "<p>A second paragraph here.</p>" in html


def test_text_to_html_escapes_markup():
    assert "<p>a &lt;b&gt; &amp; c.</p>" == _text_to_html("a <b> & c.")


def test_heading_sections_splits_on_headings():
    pages = [
        "Chapter 1 Intro\nSome opening text here.\n"
        "Chapter 2 Body\nThe main content follows.\n"
        "Chapter 3 End\nClosing remarks."
    ]
    sections = _heading_sections(pages)
    assert sections is not None
    assert [s.title for s in sections] == [
        "Chapter 1 Intro",
        "Chapter 2 Body",
        "Chapter 3 End",
    ]
    assert "opening text" in sections[0].text


def test_heading_sections_returns_none_without_real_sections():
    # No heading-like lines -> can't split.
    assert _heading_sections(["just some plain prose with no structure at all"]) is None


def test_detects_glyph_dump_as_unrecoverable():
    # What pypdf emits for a font with no Unicode map (real sample shape).
    garbage = ["/71/98 /114/118/118/33 /110/118/118/37 /114/82 /110/118/118/74"]
    assert _alpha_ratio(garbage) < 0.1
    assert _looks_unrecoverable(garbage) is True


def test_real_text_is_recoverable():
    good = ["Praise be to God. This is an ordinary English paragraph with words."]
    assert _alpha_ratio(good) > 0.7
    assert _looks_unrecoverable(good) is False
    # Arabic letters count as alphabetic too.
    arabic = ["الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين"]
    assert _looks_unrecoverable(arabic) is False


def test_embed_pdf_as_note_builds_single_viewer_note():
    parsed = embed_pdf_as_note(_TINY_PDF, "My_Book.pdf")
    assert parsed.folders == []
    assert len(parsed.notes) == 1
    note = parsed.notes[0]
    assert note.title == "My Book"
    assert note.folder_path is None
    assert "data-pdf-embed" in note.content_html
    assert 'data-pdf-src="data:application/pdf;base64,' in note.content_html
    assert 'data-pdf-name="My_Book.pdf"' in note.content_html
    # The original bytes are recoverable from the embedded data URI.
    b64 = note.content_html.split("base64,", 1)[1].split('"', 1)[0]
    assert base64.b64decode(b64) == _TINY_PDF


def test_embed_pdf_rejects_non_pdf():
    with pytest.raises(ValueError):
        embed_pdf_as_note(b"this is not a pdf", "x.pdf")
    with pytest.raises(ValueError):
        embed_pdf_as_note(b"", "x.pdf")


def test_page_chunk_sections_labels_ranges():
    pages = [f"page {i} text." for i in range(1, 20)]  # 19 pages
    sections = _page_chunk_sections(pages)
    assert [s.title for s in sections] == ["Pages 1–8", "Pages 9–16", "Pages 17–19"]
    assert "page 1 text" in sections[0].text
