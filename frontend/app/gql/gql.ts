/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query ListFolders {\n    folders { id name parentId }\n  }\n": typeof types.ListFoldersDocument,
    "\n  mutation CreateFolder($name: String!, $parentId: ID) {\n    createFolder(name: $name, parentId: $parentId) { id }\n  }\n": typeof types.CreateFolderDocument,
    "\n  mutation RenameFolder($id: ID!, $name: String!) {\n    renameFolder(id: $id, name: $name) { id }\n  }\n": typeof types.RenameFolderDocument,
    "\n  mutation MoveFolder($id: ID!, $parentId: ID) {\n    moveFolder(id: $id, parentId: $parentId) { id parentId }\n  }\n": typeof types.MoveFolderDocument,
    "\n  mutation DeleteFolder($id: ID!) {\n    deleteFolder(id: $id)\n  }\n": typeof types.DeleteFolderDocument,
    "\n  mutation DeleteFolders($ids: [ID!]!) {\n    deleteFolders(ids: $ids)\n  }\n": typeof types.DeleteFoldersDocument,
    "\n  mutation RestoreFolders($ids: [ID!]!) {\n    restoreFolders(ids: $ids)\n  }\n": typeof types.RestoreFoldersDocument,
    "\n  mutation PurgeFolders($ids: [ID!]!) {\n    purgeFolders(ids: $ids)\n  }\n": typeof types.PurgeFoldersDocument,
    "\n  query GetGraph {\n    graphData {\n      nodes { id name nodeType val }\n      links { source target edgeType }\n    }\n  }\n": typeof types.GetGraphDocument,
    "\n  query GetFolderGraph($id: ID!) {\n    folderGraph(id: $id) {\n      nodes { id name nodeType val }\n      links { source target edgeType }\n    }\n  }\n": typeof types.GetFolderGraphDocument,
    "\n  query GetNote($id: ID!) {\n    note(id: $id) { id title content aliases folderId coverUrl }\n  }\n": typeof types.GetNoteDocument,
    "\n  query ListNoteStubs {\n    noteStubs { id title aliases }\n  }\n": typeof types.ListNoteStubsDocument,
    "\n  query Backlinks($id: ID!) {\n    backlinks(id: $id) { id title }\n  }\n": typeof types.BacklinksDocument,
    "\n  query Preview($title: String!) {\n    noteByTitle(title: $title) { id title content }\n  }\n": typeof types.PreviewDocument,
    "\n  mutation CreateNote($title: String!, $content: String!, $aliases: [String!], $folderId: ID) {\n    createNote(title: $title, content: $content, aliases: $aliases, folderId: $folderId) { id }\n  }\n": typeof types.CreateNoteDocument,
    "\n  mutation UpdateNote($id: ID!, $title: String, $content: String) {\n    updateNote(id: $id, title: $title, content: $content) { id }\n  }\n": typeof types.UpdateNoteDocument,
    "\n  mutation UpdateCover($id: ID!, $coverUrl: String) {\n    updateNote(id: $id, coverUrl: $coverUrl) { id }\n  }\n": typeof types.UpdateCoverDocument,
    "\n  mutation UpdateAliases($id: ID!, $aliases: [String!]) {\n    updateNote(id: $id, aliases: $aliases) { id }\n  }\n": typeof types.UpdateAliasesDocument,
    "\n  mutation MoveNote($id: ID!, $folderId: ID) {\n    moveNote(id: $id, folderId: $folderId) { id }\n  }\n": typeof types.MoveNoteDocument,
    "\n  mutation DeleteNote($id: ID!) {\n    deleteNote(id: $id)\n  }\n": typeof types.DeleteNoteDocument,
    "\n  mutation DeleteNotes($ids: [ID!]!) {\n    deleteNotes(ids: $ids)\n  }\n": typeof types.DeleteNotesDocument,
    "\n  mutation RestoreNotes($ids: [ID!]!) {\n    restoreNotes(ids: $ids)\n  }\n": typeof types.RestoreNotesDocument,
    "\n  mutation PurgeNotes($ids: [ID!]!) {\n    purgeNotes(ids: $ids)\n  }\n": typeof types.PurgeNotesDocument,
    "\n  query Search($keyword: String!) {\n    search(keyword: $keyword) { noteId noteTitle sentences }\n  }\n": typeof types.SearchDocument,
    "\n  query ListOrphans {\n    orphans { id title aliases }\n  }\n": typeof types.ListOrphansDocument,
    "\n  query GetSidebarData {\n    notes { id title folderId }\n    folders { id name parentId }\n  }\n": typeof types.GetSidebarDataDocument,
    "\n  query GetTrash {\n    trash {\n      notes { id title folderId deletedAt }\n      folders { id name parentId deletedAt }\n    }\n  }\n": typeof types.GetTrashDocument,
    "\n  mutation EmptyTrash {\n    emptyTrash\n  }\n": typeof types.EmptyTrashDocument,
};
const documents: Documents = {
    "\n  query ListFolders {\n    folders { id name parentId }\n  }\n": types.ListFoldersDocument,
    "\n  mutation CreateFolder($name: String!, $parentId: ID) {\n    createFolder(name: $name, parentId: $parentId) { id }\n  }\n": types.CreateFolderDocument,
    "\n  mutation RenameFolder($id: ID!, $name: String!) {\n    renameFolder(id: $id, name: $name) { id }\n  }\n": types.RenameFolderDocument,
    "\n  mutation MoveFolder($id: ID!, $parentId: ID) {\n    moveFolder(id: $id, parentId: $parentId) { id parentId }\n  }\n": types.MoveFolderDocument,
    "\n  mutation DeleteFolder($id: ID!) {\n    deleteFolder(id: $id)\n  }\n": types.DeleteFolderDocument,
    "\n  mutation DeleteFolders($ids: [ID!]!) {\n    deleteFolders(ids: $ids)\n  }\n": types.DeleteFoldersDocument,
    "\n  mutation RestoreFolders($ids: [ID!]!) {\n    restoreFolders(ids: $ids)\n  }\n": types.RestoreFoldersDocument,
    "\n  mutation PurgeFolders($ids: [ID!]!) {\n    purgeFolders(ids: $ids)\n  }\n": types.PurgeFoldersDocument,
    "\n  query GetGraph {\n    graphData {\n      nodes { id name nodeType val }\n      links { source target edgeType }\n    }\n  }\n": types.GetGraphDocument,
    "\n  query GetFolderGraph($id: ID!) {\n    folderGraph(id: $id) {\n      nodes { id name nodeType val }\n      links { source target edgeType }\n    }\n  }\n": types.GetFolderGraphDocument,
    "\n  query GetNote($id: ID!) {\n    note(id: $id) { id title content aliases folderId coverUrl }\n  }\n": types.GetNoteDocument,
    "\n  query ListNoteStubs {\n    noteStubs { id title aliases }\n  }\n": types.ListNoteStubsDocument,
    "\n  query Backlinks($id: ID!) {\n    backlinks(id: $id) { id title }\n  }\n": types.BacklinksDocument,
    "\n  query Preview($title: String!) {\n    noteByTitle(title: $title) { id title content }\n  }\n": types.PreviewDocument,
    "\n  mutation CreateNote($title: String!, $content: String!, $aliases: [String!], $folderId: ID) {\n    createNote(title: $title, content: $content, aliases: $aliases, folderId: $folderId) { id }\n  }\n": types.CreateNoteDocument,
    "\n  mutation UpdateNote($id: ID!, $title: String, $content: String) {\n    updateNote(id: $id, title: $title, content: $content) { id }\n  }\n": types.UpdateNoteDocument,
    "\n  mutation UpdateCover($id: ID!, $coverUrl: String) {\n    updateNote(id: $id, coverUrl: $coverUrl) { id }\n  }\n": types.UpdateCoverDocument,
    "\n  mutation UpdateAliases($id: ID!, $aliases: [String!]) {\n    updateNote(id: $id, aliases: $aliases) { id }\n  }\n": types.UpdateAliasesDocument,
    "\n  mutation MoveNote($id: ID!, $folderId: ID) {\n    moveNote(id: $id, folderId: $folderId) { id }\n  }\n": types.MoveNoteDocument,
    "\n  mutation DeleteNote($id: ID!) {\n    deleteNote(id: $id)\n  }\n": types.DeleteNoteDocument,
    "\n  mutation DeleteNotes($ids: [ID!]!) {\n    deleteNotes(ids: $ids)\n  }\n": types.DeleteNotesDocument,
    "\n  mutation RestoreNotes($ids: [ID!]!) {\n    restoreNotes(ids: $ids)\n  }\n": types.RestoreNotesDocument,
    "\n  mutation PurgeNotes($ids: [ID!]!) {\n    purgeNotes(ids: $ids)\n  }\n": types.PurgeNotesDocument,
    "\n  query Search($keyword: String!) {\n    search(keyword: $keyword) { noteId noteTitle sentences }\n  }\n": types.SearchDocument,
    "\n  query ListOrphans {\n    orphans { id title aliases }\n  }\n": types.ListOrphansDocument,
    "\n  query GetSidebarData {\n    notes { id title folderId }\n    folders { id name parentId }\n  }\n": types.GetSidebarDataDocument,
    "\n  query GetTrash {\n    trash {\n      notes { id title folderId deletedAt }\n      folders { id name parentId deletedAt }\n    }\n  }\n": types.GetTrashDocument,
    "\n  mutation EmptyTrash {\n    emptyTrash\n  }\n": types.EmptyTrashDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ListFolders {\n    folders { id name parentId }\n  }\n"): (typeof documents)["\n  query ListFolders {\n    folders { id name parentId }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateFolder($name: String!, $parentId: ID) {\n    createFolder(name: $name, parentId: $parentId) { id }\n  }\n"): (typeof documents)["\n  mutation CreateFolder($name: String!, $parentId: ID) {\n    createFolder(name: $name, parentId: $parentId) { id }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RenameFolder($id: ID!, $name: String!) {\n    renameFolder(id: $id, name: $name) { id }\n  }\n"): (typeof documents)["\n  mutation RenameFolder($id: ID!, $name: String!) {\n    renameFolder(id: $id, name: $name) { id }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MoveFolder($id: ID!, $parentId: ID) {\n    moveFolder(id: $id, parentId: $parentId) { id parentId }\n  }\n"): (typeof documents)["\n  mutation MoveFolder($id: ID!, $parentId: ID) {\n    moveFolder(id: $id, parentId: $parentId) { id parentId }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteFolder($id: ID!) {\n    deleteFolder(id: $id)\n  }\n"): (typeof documents)["\n  mutation DeleteFolder($id: ID!) {\n    deleteFolder(id: $id)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteFolders($ids: [ID!]!) {\n    deleteFolders(ids: $ids)\n  }\n"): (typeof documents)["\n  mutation DeleteFolders($ids: [ID!]!) {\n    deleteFolders(ids: $ids)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RestoreFolders($ids: [ID!]!) {\n    restoreFolders(ids: $ids)\n  }\n"): (typeof documents)["\n  mutation RestoreFolders($ids: [ID!]!) {\n    restoreFolders(ids: $ids)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PurgeFolders($ids: [ID!]!) {\n    purgeFolders(ids: $ids)\n  }\n"): (typeof documents)["\n  mutation PurgeFolders($ids: [ID!]!) {\n    purgeFolders(ids: $ids)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetGraph {\n    graphData {\n      nodes { id name nodeType val }\n      links { source target edgeType }\n    }\n  }\n"): (typeof documents)["\n  query GetGraph {\n    graphData {\n      nodes { id name nodeType val }\n      links { source target edgeType }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetFolderGraph($id: ID!) {\n    folderGraph(id: $id) {\n      nodes { id name nodeType val }\n      links { source target edgeType }\n    }\n  }\n"): (typeof documents)["\n  query GetFolderGraph($id: ID!) {\n    folderGraph(id: $id) {\n      nodes { id name nodeType val }\n      links { source target edgeType }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetNote($id: ID!) {\n    note(id: $id) { id title content aliases folderId coverUrl }\n  }\n"): (typeof documents)["\n  query GetNote($id: ID!) {\n    note(id: $id) { id title content aliases folderId coverUrl }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ListNoteStubs {\n    noteStubs { id title aliases }\n  }\n"): (typeof documents)["\n  query ListNoteStubs {\n    noteStubs { id title aliases }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Backlinks($id: ID!) {\n    backlinks(id: $id) { id title }\n  }\n"): (typeof documents)["\n  query Backlinks($id: ID!) {\n    backlinks(id: $id) { id title }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Preview($title: String!) {\n    noteByTitle(title: $title) { id title content }\n  }\n"): (typeof documents)["\n  query Preview($title: String!) {\n    noteByTitle(title: $title) { id title content }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateNote($title: String!, $content: String!, $aliases: [String!], $folderId: ID) {\n    createNote(title: $title, content: $content, aliases: $aliases, folderId: $folderId) { id }\n  }\n"): (typeof documents)["\n  mutation CreateNote($title: String!, $content: String!, $aliases: [String!], $folderId: ID) {\n    createNote(title: $title, content: $content, aliases: $aliases, folderId: $folderId) { id }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateNote($id: ID!, $title: String, $content: String) {\n    updateNote(id: $id, title: $title, content: $content) { id }\n  }\n"): (typeof documents)["\n  mutation UpdateNote($id: ID!, $title: String, $content: String) {\n    updateNote(id: $id, title: $title, content: $content) { id }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateCover($id: ID!, $coverUrl: String) {\n    updateNote(id: $id, coverUrl: $coverUrl) { id }\n  }\n"): (typeof documents)["\n  mutation UpdateCover($id: ID!, $coverUrl: String) {\n    updateNote(id: $id, coverUrl: $coverUrl) { id }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateAliases($id: ID!, $aliases: [String!]) {\n    updateNote(id: $id, aliases: $aliases) { id }\n  }\n"): (typeof documents)["\n  mutation UpdateAliases($id: ID!, $aliases: [String!]) {\n    updateNote(id: $id, aliases: $aliases) { id }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MoveNote($id: ID!, $folderId: ID) {\n    moveNote(id: $id, folderId: $folderId) { id }\n  }\n"): (typeof documents)["\n  mutation MoveNote($id: ID!, $folderId: ID) {\n    moveNote(id: $id, folderId: $folderId) { id }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteNote($id: ID!) {\n    deleteNote(id: $id)\n  }\n"): (typeof documents)["\n  mutation DeleteNote($id: ID!) {\n    deleteNote(id: $id)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteNotes($ids: [ID!]!) {\n    deleteNotes(ids: $ids)\n  }\n"): (typeof documents)["\n  mutation DeleteNotes($ids: [ID!]!) {\n    deleteNotes(ids: $ids)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RestoreNotes($ids: [ID!]!) {\n    restoreNotes(ids: $ids)\n  }\n"): (typeof documents)["\n  mutation RestoreNotes($ids: [ID!]!) {\n    restoreNotes(ids: $ids)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PurgeNotes($ids: [ID!]!) {\n    purgeNotes(ids: $ids)\n  }\n"): (typeof documents)["\n  mutation PurgeNotes($ids: [ID!]!) {\n    purgeNotes(ids: $ids)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Search($keyword: String!) {\n    search(keyword: $keyword) { noteId noteTitle sentences }\n  }\n"): (typeof documents)["\n  query Search($keyword: String!) {\n    search(keyword: $keyword) { noteId noteTitle sentences }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ListOrphans {\n    orphans { id title aliases }\n  }\n"): (typeof documents)["\n  query ListOrphans {\n    orphans { id title aliases }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetSidebarData {\n    notes { id title folderId }\n    folders { id name parentId }\n  }\n"): (typeof documents)["\n  query GetSidebarData {\n    notes { id title folderId }\n    folders { id name parentId }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetTrash {\n    trash {\n      notes { id title folderId deletedAt }\n      folders { id name parentId deletedAt }\n    }\n  }\n"): (typeof documents)["\n  query GetTrash {\n    trash {\n      notes { id title folderId deletedAt }\n      folders { id name parentId deletedAt }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation EmptyTrash {\n    emptyTrash\n  }\n"): (typeof documents)["\n  mutation EmptyTrash {\n    emptyTrash\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;