import { graphql } from "~/gql";
import { request } from "~/lib/graphql-client";

const GetNoteDocument = graphql(`
  query GetNote($id: ID!) {
    note(id: $id) { id title content aliases folderId coverUrl }
  }
`);
export function getNote(token: string, id: string) {
  return request(GetNoteDocument, { id }, token).then((d) => d.note);
}

const ListNoteStubsDocument = graphql(`
  query ListNoteStubs {
    noteStubs { id title aliases }
  }
`);
export function listNoteStubs(token: string) {
  return request(ListNoteStubsDocument, {}, token).then((d) => d.noteStubs);
}

const BacklinksDocument = graphql(`
  query Backlinks($id: ID!) {
    backlinks(id: $id) { id title }
  }
`);
export function getBacklinks(token: string, id: string) {
  return request(BacklinksDocument, { id }, token).then((d) => d.backlinks);
}

const PreviewDocument = graphql(`
  query Preview($title: String!) {
    noteByTitle(title: $title) { id title content }
  }
`);
export function getNoteByTitle(token: string | undefined, title: string) {
  return request(PreviewDocument, { title }, token).then((d) => d.noteByTitle);
}

const CreateNoteDocument = graphql(`
  mutation CreateNote($title: String!, $content: String!, $aliases: [String!], $folderId: ID) {
    createNote(title: $title, content: $content, aliases: $aliases, folderId: $folderId) { id }
  }
`);
export function createNote(
  token: string,
  vars: { title: string; content?: string; aliases?: string[] | null; folderId?: string | null }
) {
  return request(
    CreateNoteDocument,
    {
      title: vars.title,
      content: vars.content ?? "",
      aliases: vars.aliases ?? null,
      folderId: vars.folderId ?? null,
    },
    token
  ).then((d) => d.createNote);
}

const UpdateNoteDocument = graphql(`
  mutation UpdateNote($id: ID!, $title: String, $content: String) {
    updateNote(id: $id, title: $title, content: $content) { id }
  }
`);
export function updateNoteContent(
  token: string,
  id: string,
  vars: { title: string | null; content: string | null }
) {
  return request(UpdateNoteDocument, { id, title: vars.title, content: vars.content }, token);
}

const UpdateCoverDocument = graphql(`
  mutation UpdateCover($id: ID!, $coverUrl: String) {
    updateNote(id: $id, coverUrl: $coverUrl) { id }
  }
`);
export function updateNoteCover(token: string, id: string, coverUrl: string | null) {
  return request(UpdateCoverDocument, { id, coverUrl }, token);
}

const UpdateAliasesDocument = graphql(`
  mutation UpdateAliases($id: ID!, $aliases: [String!]) {
    updateNote(id: $id, aliases: $aliases) { id }
  }
`);
export function updateNoteAliases(token: string, id: string, aliases: string[]) {
  return request(UpdateAliasesDocument, { id, aliases }, token);
}

const MoveNoteDocument = graphql(`
  mutation MoveNote($id: ID!, $folderId: ID) {
    moveNote(id: $id, folderId: $folderId) { id }
  }
`);
export function moveNote(token: string, id: string, folderId: string | null) {
  return request(MoveNoteDocument, { id, folderId }, token);
}

const DeleteNoteDocument = graphql(`
  mutation DeleteNote($id: ID!) {
    deleteNote(id: $id)
  }
`);
export function deleteNote(token: string, id: string) {
  return request(DeleteNoteDocument, { id }, token);
}

const DeleteNotesDocument = graphql(`
  mutation DeleteNotes($ids: [ID!]!) {
    deleteNotes(ids: $ids)
  }
`);
export function deleteNotes(token: string, ids: string[]) {
  return request(DeleteNotesDocument, { ids }, token);
}

const RestoreNotesDocument = graphql(`
  mutation RestoreNotes($ids: [ID!]!) {
    restoreNotes(ids: $ids)
  }
`);
export function restoreNotes(token: string, ids: string[]) {
  return request(RestoreNotesDocument, { ids }, token);
}

const PurgeNotesDocument = graphql(`
  mutation PurgeNotes($ids: [ID!]!) {
    purgeNotes(ids: $ids)
  }
`);
export function purgeNotes(token: string, ids: string[]) {
  return request(PurgeNotesDocument, { ids }, token);
}
