"""GraphQL queries — thin resolvers that own the session and delegate to services."""

from typing import List, Optional

import strawberry
from strawberry.types import Info

from app import database
from app.graphql.types import (
    FolderType,
    GraphData,
    GraphEdge,
    GraphNode,
    NoteStub,
    SearchResult,
    NoteType,
    TrashData,
    folder_to_gql,
    get_user_id,
    note_to_gql,
)
from app.services import folders as folders_service
from app.services import graph as graph_service
from app.services import notes as notes_service
from app.services import search as search_service
from app.services import similarity as similarity_service
from app.services.common import parse_uuid


def _node_val(base: int, cnt: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, base + cnt))


def _link_counts(links) -> dict:
    counts: dict = {}
    for lnk in links:
        counts[lnk.source_id] = counts.get(lnk.source_id, 0) + 1
        counts[lnk.target_id] = counts.get(lnk.target_id, 0) + 1
    return counts


@strawberry.type
class Query:
    @strawberry.field
    async def note_stubs(self, info: Info) -> List[NoteStub]:
        user_id = get_user_id(info)
        async with database.AsyncSessionLocal() as session:
            rows = await notes_service.list_note_stubs(session, user_id)
        return [
            NoteStub(
                id=strawberry.ID(str(r.id)),
                title=r.title or "Untitled",
                aliases=r.aliases or [],
            )
            for r in rows
        ]

    @strawberry.field
    async def backlinks(self, info: Info, id: strawberry.ID) -> List[NoteType]:
        user_id = get_user_id(info)
        note_id = parse_uuid(id)
        if note_id is None:
            return []
        async with database.AsyncSessionLocal() as session:
            rows = await notes_service.get_backlinks(session, user_id, note_id)
        return [note_to_gql(n) for n in rows]

    @strawberry.field
    async def notes(self, info: Info) -> List[NoteType]:
        user_id = get_user_id(info)
        async with database.AsyncSessionLocal() as session:
            rows = await notes_service.list_notes(session, user_id)
        return [note_to_gql(n) for n in rows]

    @strawberry.field
    async def note(self, info: Info, id: strawberry.ID) -> Optional[NoteType]:
        user_id = get_user_id(info)
        note_id = parse_uuid(id)
        if note_id is None:
            return None
        async with database.AsyncSessionLocal() as session:
            note = await notes_service.get_note(session, user_id, note_id)
        return note_to_gql(note) if note else None

    @strawberry.field
    async def folders(self, info: Info) -> List[FolderType]:
        user_id = get_user_id(info)
        async with database.AsyncSessionLocal() as session:
            rows = await folders_service.list_folders(session, user_id)
        return [folder_to_gql(f) for f in rows]

    @strawberry.field
    async def search(self, info: Info, keyword: str) -> List[SearchResult]:
        user_id = get_user_id(info)
        async with database.AsyncSessionLocal() as session:
            raw = await search_service.search_notes(session, user_id, keyword)
        return [
            SearchResult(
                note_id=strawberry.ID(r["note_id"]),
                note_title=r["note_title"],
                sentences=r["sentences"],
            )
            for r in raw
        ]

    @strawberry.field
    async def orphans(self, info: Info) -> List[NoteType]:
        user_id = get_user_id(info)
        async with database.AsyncSessionLocal() as session:
            rows = await notes_service.list_orphans(session, user_id)
        return [note_to_gql(n) for n in rows]

    @strawberry.field
    async def graph_data(self, info: Info) -> GraphData:
        user_id = get_user_id(info)
        async with database.AsyncSessionLocal() as session:
            notes, folders, wiki_links = await graph_service.fetch_graph(session, user_id)

        link_counts = _link_counts(wiki_links)
        folder_ids = {f.id for f in folders}

        nodes: List[GraphNode] = []
        for folder in folders:
            nodes.append(GraphNode(
                id=strawberry.ID(str(folder.id)),
                name=folder.name, node_type="folder", val=8,
            ))
        for note in notes:
            nodes.append(GraphNode(
                id=strawberry.ID(str(note.id)),
                name=note.title, node_type="note",
                val=_node_val(4, link_counts.get(note.id, 0), 4, 10),
            ))

        edges: List[GraphEdge] = []
        for note in notes:
            if note.folder_id and note.folder_id in folder_ids:
                edges.append(GraphEdge(
                    source=strawberry.ID(str(note.folder_id)),
                    target=strawberry.ID(str(note.id)),
                    edge_type="structural",
                ))
        for folder in folders:
            if folder.parent_id and folder.parent_id in folder_ids:
                edges.append(GraphEdge(
                    source=strawberry.ID(str(folder.parent_id)),
                    target=strawberry.ID(str(folder.id)),
                    edge_type="structural",
                ))
        for lnk in wiki_links:
            edges.append(GraphEdge(
                source=strawberry.ID(str(lnk.source_id)),
                target=strawberry.ID(str(lnk.target_id)),
                edge_type="wikilink",
            ))

        # "Similar topic" edges: notes whose content overlaps (TF-IDF), even with
        # no wiki-link and in different folders. Skip any pair that already has a
        # wiki-link so we don't draw two edges between the same two notes.
        linked_pairs = {
            frozenset((lnk.source_id, lnk.target_id)) for lnk in wiki_links
        }
        for src, tgt, _score in similarity_service.similar_pairs(notes):
            if frozenset((src, tgt)) in linked_pairs:
                continue
            edges.append(GraphEdge(
                source=strawberry.ID(str(src)),
                target=strawberry.ID(str(tgt)),
                edge_type="similar",
            ))

        # Folder-to-folder "related" edges: two folders are related when a note in
        # one wiki-links to a note in the other. This surfaces topical connections
        # between folders, distinct from the structural containment edges above.
        note_folder = {n.id: n.folder_id for n in notes}
        related_pairs: set = set()
        for lnk in wiki_links:
            fa = note_folder.get(lnk.source_id)
            fb = note_folder.get(lnk.target_id)
            if fa and fb and fa != fb and fa in folder_ids and fb in folder_ids:
                related_pairs.add(tuple(sorted((fa, fb), key=str)))
        for fa, fb in related_pairs:
            edges.append(GraphEdge(
                source=strawberry.ID(str(fa)),
                target=strawberry.ID(str(fb)),
                edge_type="related",
            ))

        return GraphData(nodes=nodes, links=edges)

    @strawberry.field
    async def folder_graph(self, info: Info, id: strawberry.ID) -> Optional[GraphData]:
        user_id = get_user_id(info)
        folder_uuid = parse_uuid(id)
        if folder_uuid is None:
            return None
        async with database.AsyncSessionLocal() as session:
            data = await graph_service.fetch_folder_graph(session, user_id, folder_uuid)
        if data is None:
            return None

        link_counts = _link_counts(data.links)

        nodes: List[GraphNode] = [
            GraphNode(id=strawberry.ID(str(data.folder.id)), name=data.folder.name,
                      node_type="folder", val=8)
        ]
        for sf in data.subfolders:
            nodes.append(GraphNode(
                id=strawberry.ID(str(sf.id)), name=sf.name, node_type="folder", val=6
            ))
        for note in data.notes:
            nodes.append(GraphNode(
                id=strawberry.ID(str(note.id)), name=note.title, node_type="note",
                val=_node_val(4, link_counts.get(note.id, 0), 4, 10),
            ))
        for note in data.external_notes:
            nodes.append(GraphNode(
                id=strawberry.ID(str(note.id)), name=note.title, node_type="note-external",
                val=_node_val(3, link_counts.get(note.id, 0), 3, 7),
            ))
        for ext_folder in data.external_folders:
            nodes.append(GraphNode(
                id=strawberry.ID(str(ext_folder.id)), name=ext_folder.name,
                node_type="folder-external", val=6,
            ))

        edges: List[GraphEdge] = []
        for note in data.notes:
            edges.append(GraphEdge(
                source=strawberry.ID(str(data.folder.id)),
                target=strawberry.ID(str(note.id)), edge_type="structural",
            ))
        for sf in data.subfolders:
            edges.append(GraphEdge(
                source=strawberry.ID(str(data.folder.id)),
                target=strawberry.ID(str(sf.id)), edge_type="structural",
            ))
        for lnk in data.links:
            edges.append(GraphEdge(
                source=strawberry.ID(str(lnk.source_id)),
                target=strawberry.ID(str(lnk.target_id)), edge_type="wikilink",
            ))

        # "Similar topic" edges among this folder's own notes: TF-IDF overlap,
        # even with no wiki-link between them. Scored over just the folder's
        # notes so both endpoints are always nodes in this view; skip any pair
        # that already has a wiki-link so we don't draw two edges for one pair.
        linked_pairs = {
            frozenset((lnk.source_id, lnk.target_id)) for lnk in data.links
        }
        for src, tgt, _score in similarity_service.similar_pairs(data.notes):
            if frozenset((src, tgt)) in linked_pairs:
                continue
            edges.append(GraphEdge(
                source=strawberry.ID(str(src)),
                target=strawberry.ID(str(tgt)), edge_type="similar",
            ))

        # "Related" edges: this folder links to each folder owning an external note.
        for ext_folder in data.external_folders:
            edges.append(GraphEdge(
                source=strawberry.ID(str(data.folder.id)),
                target=strawberry.ID(str(ext_folder.id)), edge_type="related",
            ))

        return GraphData(nodes=nodes, links=edges)

    @strawberry.field
    async def trash(self, info: Info) -> TrashData:
        """Everything currently in the trash — notes and folders — for the user."""
        user_id = get_user_id(info)
        async with database.AsyncSessionLocal() as session:
            notes = await notes_service.list_trashed_notes(session, user_id)
            folders = await folders_service.list_trashed_folders(session, user_id)
        return TrashData(
            notes=[note_to_gql(n) for n in notes],
            folders=[folder_to_gql(f) for f in folders],
        )

    @strawberry.field
    async def note_by_title(self, info: Info, title: str) -> Optional[NoteType]:
        user_id = get_user_id(info)
        async with database.AsyncSessionLocal() as session:
            note = await notes_service.get_note_by_title(session, user_id, title)
        return note_to_gql(note) if note else None
