"""Content-similarity edges: topically-overlapping notes get paired, unrelated
ones don't, and Arabic is matched diacritic-insensitively."""

import uuid
from types import SimpleNamespace

from app.services.similarity import similar_pairs


def _note(title, content=""):
    # similar_pairs only reads .id/.title/.content, so a stub is enough.
    return SimpleNamespace(id=uuid.uuid4(), title=title, content=content)


def _pair_set(pairs):
    return {frozenset((a, b)) for a, b, _ in pairs}


def test_topically_similar_notes_are_paired():
    a = _note("Tawhid", "tawhid is the oneness of God, the very core of faith")
    b = _note("Oneness of God", "the oneness of God — tawhid — sits at the heart of faith")
    c = _note("Sourdough", "how to bake sourdough bread with flour, water and salt")
    pairs = _pair_set(similar_pairs([a, b, c]))
    assert frozenset((a.id, b.id)) in pairs        # share tawhid/oneness/god/faith
    assert frozenset((a.id, c.id)) not in pairs     # nothing topical in common
    assert frozenset((b.id, c.id)) not in pairs


def test_unrelated_notes_have_no_edges():
    a = _note("Gardening", "prune roses in early spring for healthy summer blooms")
    b = _note("Networking", "configure the subnet mask and default gateway on the router")
    assert similar_pairs([a, b]) == []


def test_arabic_match_ignores_tashkeel():
    # Same content, one written with tashkeel — they must still be paired.
    a = _note("التوحيد", "<p>التوحيد هو الإيمان بوحدانية الله وأنه لا شريك له</p>")
    b = _note("الوحدانية", "<p>الإيمان بوحدانية اللَّه أساس التوحيد ولا شريك له</p>")
    pairs = _pair_set(similar_pairs([a, b]))
    assert frozenset((a.id, b.id)) in pairs


def test_single_note_returns_no_pairs():
    assert similar_pairs([_note("Alone", "solitary content")]) == []
