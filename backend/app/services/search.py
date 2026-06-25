"""Full-text + graph search.

Thin wrapper over the BFS keyword search so the GraphQL layer depends on a
clearly-named service.
"""

from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.note_search import keyword_search


async def search_notes(session: AsyncSession, user_id, keyword: str) -> List[dict]:
    """Return matching notes with their keyword-containing sentences."""
    return await keyword_search(keyword, session, user_id=user_id)
