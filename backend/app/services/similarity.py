"""Content-similarity edges for the graph.

Connects notes that cover the same topic based on shared significant terms
(TF-IDF cosine), independent of folders or explicit ``[[wiki-links]]``. This is
what surfaces "these two notes are about the same thing" even when the user
never linked them and they live in different folders.

It runs in pure Python over notes already loaded for the graph — no extra query
and no external service. Term normalization is the *same* rule the search layer
uses (casefold + strip Unicode diacritics/tashkeel), so it works for Arabic and
Latin alike: ``اللَّه`` and ``الله`` count as the same term.
"""

import math
import re
from collections import defaultdict
from typing import List, Tuple

from app.utils.note_search import _normalize, _strip_html

# A "word": runs of letters/digits/underscore, Unicode-aware so Arabic counts.
_TOKEN_RE = re.compile(r"\w+", re.UNICODE)

# --- Tuning knobs -----------------------------------------------------------
MIN_TOKEN_LEN = 2        # ignore single-character tokens
MAX_DF_RATIO = 0.5       # drop terms appearing in >50% of notes (no signal)
MIN_NOTES_FOR_DF_CAP = 8 # ...but only once the corpus is big enough to judge
SIM_THRESHOLD = 0.2      # minimum cosine similarity to draw an edge
TOP_K = 3                # at most this many similar neighbours per note

# Very common words carry no topical signal. TF-IDF already downweights them,
# but dropping them outright keeps small-corpus similarity from being dominated
# by glue words. Stored in normalized (diacritic-free, casefolded) form.
_STOPWORDS = frozenset(
    """
    a an the this that these those it its is are was were be been being am
    of to in on at for and or but with as by from into over out up down off
    not no nor so if then than too very can could should would will shall may
    might must do does did done has have had having i you he she we they them
    me my your his her our their what which who whom whose when where why how
    about above below between through during before after again here there all
    any both each few more most other some such only own same other
    من في على الى إلى عن مع هذا هذه ذلك التي الذي و أو ثم ما لا هو هي هم هن
    كان كانت قد كل بعض مثل عند لكن أن إن لم لن إذا حتى كما بين هناك هنا الى
    """.split()
)


def _tokens(note) -> List[str]:
    text = f"{note.title or ''} {_strip_html(note.content or '')}"
    return [
        t
        for t in _TOKEN_RE.findall(_normalize(text))
        if len(t) >= MIN_TOKEN_LEN and t not in _STOPWORDS
    ]


def similar_pairs(notes) -> List[Tuple]:
    """Return undirected ``(id_a, id_b, score)`` pairs of topically-similar notes.

    Each note keeps at most ``TOP_K`` neighbours scoring at least
    ``SIM_THRESHOLD``; a pair is emitted once (de-duplicated) when either side
    ranks the other among its top matches.
    """
    notes = list(notes)
    n = len(notes)
    if n < 2:
        return []

    # Term frequency per note, and document frequency across the corpus.
    tf: List[dict] = []
    df: dict = defaultdict(int)
    for note in notes:
        counts: dict = defaultdict(int)
        for tok in _tokens(note):
            counts[tok] += 1
        tf.append(counts)
        for term in counts:
            df[term] += 1

    # Only treat "appears in most notes" as noise once there are enough notes;
    # with a handful of notes every shared term still matters.
    df_cap = n + 1
    if n >= MIN_NOTES_FOR_DF_CAP:
        df_cap = max(1, int(MAX_DF_RATIO * n))

    # L2-normalized TF-IDF vector per note (so dot product == cosine).
    vectors: List[dict] = []
    for counts in tf:
        vec: dict = {}
        for term, c in counts.items():
            d = df[term]
            if d > df_cap:
                continue
            idf = math.log((1 + n) / (1 + d)) + 1.0
            vec[term] = c * idf
        norm = math.sqrt(sum(w * w for w in vec.values()))
        vectors.append({t: w / norm for t, w in vec.items()} if norm else {})

    # Inverted index so we accumulate cosine only across pairs that share a term.
    postings: dict = defaultdict(list)
    for i, vec in enumerate(vectors):
        for term, w in vec.items():
            postings[term].append((i, w))

    sims: dict = defaultdict(float)  # (i, j) with i < j -> cosine similarity
    for plist in postings.values():
        if len(plist) < 2:
            continue
        for a in range(len(plist)):
            ia, wa = plist[a]
            for b in range(a + 1, len(plist)):
                ib, wb = plist[b]
                key = (ia, ib) if ia < ib else (ib, ia)
                sims[key] += wa * wb

    # Each note keeps its strongest few neighbours above the threshold.
    neighbours: dict = defaultdict(list)  # i -> list of (score, j)
    for (i, j), score in sims.items():
        if score >= SIM_THRESHOLD:
            neighbours[i].append((score, j))
            neighbours[j].append((score, i))

    kept: set = set()
    for i, lst in neighbours.items():
        lst.sort(reverse=True)
        for _score, j in lst[:TOP_K]:
            kept.add((i, j) if i < j else (j, i))

    return [(notes[i].id, notes[j].id, sims[(i, j)]) for (i, j) in kept]
