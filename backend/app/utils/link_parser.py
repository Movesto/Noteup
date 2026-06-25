import re
from typing import List

# Matches [[Anything Here]] — non-greedy so nested brackets don't merge
LINK_RE = re.compile(r'\[\[(.+?)\]\]')


def extract_links(content: str) -> List[str]:
    """Return every [[target]] found in a note's content string.

    Targets are trimmed so ``[[ Philosophy ]]`` resolves to the note titled
    ``Philosophy`` — surrounding whitespace is incidental, and link resolution
    matches titles/aliases exactly. Targets that are blank after trimming (e.g.
    ``[[   ]]``) are dropped.
    """
    return [t for t in (m.strip() for m in LINK_RE.findall(content)) if t]
