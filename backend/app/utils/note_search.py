import re
import unicodedata
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Note

# Splits on . ! ? ؟ (Arabic question mark) ۔ (Arabic full stop) followed by whitespace.
# Lookbehind keeps the punctuation attached to the preceding sentence.
SENTENCE_SPLITTER = re.compile(r'(?<=[.!?؟۔])\s+')

# Strips HTML tags so we search plain text, not markup
HTML_TAG_RE = re.compile(r'<[^>]+>')


def _strip_html(html: str) -> str:
    return HTML_TAG_RE.sub(' ', html).strip()


def _normalize(text: str) -> str:
    """Casefold and strip Unicode nonspacing marks (diacritics/tashkeel).

    This is what makes search diacritic-insensitive: ``اللَّه`` and ``الله`` both
    normalize to the same string, as do ``Café`` and ``cafe``.
    """
    return "".join(
        c for c in unicodedata.normalize("NFD", text.casefold())
        if unicodedata.category(c) != "Mn"
    )


def _matching_sentences(text: str, kw_norm: str) -> List[str]:
    """Sentences whose normalized form contains the (already normalized) keyword."""
    results = []
    for s in SENTENCE_SPLITTER.split(text.strip()):
        s = s.strip()
        if s and kw_norm in _normalize(s):
            results.append(s)
    return results


async def keyword_search(keyword: str, session: AsyncSession, user_id=None) -> List[dict]:
    """Diacritic-insensitive keyword search over the user's notes.

    Title and content are matched ignoring case and Unicode diacritics/tashkeel,
    so the seed and the per-sentence match use the *same* rule — the old SQL
    ``ilike`` seed was diacritic-sensitive and silently dropped notes that only
    differed by tashkeel. A single scan replaces the previous seed + link BFS
    (which only ever surfaced notes containing the keyword anyway).

    Returns ``{note_id, note_title, sentences}`` per matching note, where
    ``sentences`` are the content sentences containing the keyword (empty when
    only the title matched). Trashed notes are excluded.
    """
    kw_norm = _normalize(keyword).strip()
    if not kw_norm:
        return []

    # Scope to the caller's own notes when authenticated, or to unowned
    # (user_id IS NULL) notes when anonymous — the same rule as the canonical
    # scope_listing helper, so anonymous search never spans every user's notes.
    q = select(Note).where(Note.deleted_at == None)  # noqa: E711 — trashed notes aren't searchable
    q = q.where(Note.user_id == user_id) if user_id else q.where(Note.user_id == None)  # noqa: E711
    notes = (await session.execute(q)).scalars().all()

    results = []
    for note in notes:
        sentences = _matching_sentences(_strip_html(note.content), kw_norm)
        title_match = kw_norm in _normalize(note.title or "")
        if sentences or title_match:
            results.append({
                "note_id": str(note.id),
                "note_title": note.title,
                "sentences": sentences,
            })

    return results
