/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** Date with time (isoformat) */
  DateTime: { input: string; output: string; }
};

export type FolderType = {
  __typename?: 'FolderType';
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  parentId?: Maybe<Scalars['ID']['output']>;
};

export type GraphData = {
  __typename?: 'GraphData';
  links: Array<GraphEdge>;
  nodes: Array<GraphNode>;
};

export type GraphEdge = {
  __typename?: 'GraphEdge';
  edgeType: Scalars['String']['output'];
  source: Scalars['ID']['output'];
  target: Scalars['ID']['output'];
};

export type GraphNode = {
  __typename?: 'GraphNode';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  nodeType: Scalars['String']['output'];
  val: Scalars['Int']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createFolder: FolderType;
  createNote: NoteType;
  deleteFolder: Scalars['Boolean']['output'];
  deleteFolders: Scalars['Int']['output'];
  deleteNote: Scalars['Boolean']['output'];
  deleteNotes: Scalars['Int']['output'];
  emptyTrash: Scalars['Boolean']['output'];
  moveFolder?: Maybe<FolderType>;
  moveNote?: Maybe<NoteType>;
  purgeFolders: Scalars['Int']['output'];
  purgeNotes: Scalars['Int']['output'];
  renameFolder?: Maybe<FolderType>;
  restoreFolders: Scalars['Int']['output'];
  restoreNotes: Scalars['Int']['output'];
  updateNote?: Maybe<NoteType>;
};


export type MutationCreateFolderArgs = {
  name: Scalars['String']['input'];
  parentId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationCreateNoteArgs = {
  aliases?: InputMaybe<Array<Scalars['String']['input']>>;
  content?: Scalars['String']['input'];
  folderId?: InputMaybe<Scalars['ID']['input']>;
  title: Scalars['String']['input'];
};


export type MutationDeleteFolderArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteFoldersArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationDeleteNoteArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteNotesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationMoveFolderArgs = {
  id: Scalars['ID']['input'];
  parentId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationMoveNoteArgs = {
  folderId?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationPurgeFoldersArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationPurgeNotesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationRenameFolderArgs = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};


export type MutationRestoreFoldersArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationRestoreNotesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationUpdateNoteArgs = {
  aliases?: InputMaybe<Array<Scalars['String']['input']>>;
  content?: InputMaybe<Scalars['String']['input']>;
  coverUrl?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
};

export type NoteStub = {
  __typename?: 'NoteStub';
  aliases: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
};

export type NoteType = {
  __typename?: 'NoteType';
  aliases: Array<Scalars['String']['output']>;
  content: Scalars['String']['output'];
  coverUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  folderId?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type Query = {
  __typename?: 'Query';
  backlinks: Array<NoteType>;
  folderGraph?: Maybe<GraphData>;
  folders: Array<FolderType>;
  graphData: GraphData;
  note?: Maybe<NoteType>;
  noteByTitle?: Maybe<NoteType>;
  noteStubs: Array<NoteStub>;
  notes: Array<NoteType>;
  orphans: Array<NoteType>;
  search: Array<SearchResult>;
  trash: TrashData;
};


export type QueryBacklinksArgs = {
  id: Scalars['ID']['input'];
};


export type QueryFolderGraphArgs = {
  id: Scalars['ID']['input'];
};


export type QueryNoteArgs = {
  id: Scalars['ID']['input'];
};


export type QueryNoteByTitleArgs = {
  title: Scalars['String']['input'];
};


export type QuerySearchArgs = {
  keyword: Scalars['String']['input'];
};

export type SearchResult = {
  __typename?: 'SearchResult';
  noteId: Scalars['ID']['output'];
  noteTitle: Scalars['String']['output'];
  sentences: Array<Scalars['String']['output']>;
};

export type TrashData = {
  __typename?: 'TrashData';
  folders: Array<FolderType>;
  notes: Array<NoteType>;
};

export type ListFoldersQueryVariables = Exact<{ [key: string]: never; }>;


export type ListFoldersQuery = { __typename?: 'Query', folders: Array<{ __typename?: 'FolderType', id: string, name: string, parentId?: string | null }> };

export type CreateFolderMutationVariables = Exact<{
  name: Scalars['String']['input'];
  parentId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CreateFolderMutation = { __typename?: 'Mutation', createFolder: { __typename?: 'FolderType', id: string } };

export type RenameFolderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
}>;


export type RenameFolderMutation = { __typename?: 'Mutation', renameFolder?: { __typename?: 'FolderType', id: string } | null };

export type MoveFolderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  parentId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type MoveFolderMutation = { __typename?: 'Mutation', moveFolder?: { __typename?: 'FolderType', id: string, parentId?: string | null } | null };

export type DeleteFolderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteFolderMutation = { __typename?: 'Mutation', deleteFolder: boolean };

export type DeleteFoldersMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type DeleteFoldersMutation = { __typename?: 'Mutation', deleteFolders: number };

export type RestoreFoldersMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type RestoreFoldersMutation = { __typename?: 'Mutation', restoreFolders: number };

export type PurgeFoldersMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type PurgeFoldersMutation = { __typename?: 'Mutation', purgeFolders: number };

export type GetGraphQueryVariables = Exact<{ [key: string]: never; }>;


export type GetGraphQuery = { __typename?: 'Query', graphData: { __typename?: 'GraphData', nodes: Array<{ __typename?: 'GraphNode', id: string, name: string, nodeType: string, val: number }>, links: Array<{ __typename?: 'GraphEdge', source: string, target: string, edgeType: string }> } };

export type GetFolderGraphQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetFolderGraphQuery = { __typename?: 'Query', folderGraph?: { __typename?: 'GraphData', nodes: Array<{ __typename?: 'GraphNode', id: string, name: string, nodeType: string, val: number }>, links: Array<{ __typename?: 'GraphEdge', source: string, target: string, edgeType: string }> } | null };

export type GetNoteQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetNoteQuery = { __typename?: 'Query', note?: { __typename?: 'NoteType', id: string, title: string, content: string, aliases: Array<string>, folderId?: string | null, coverUrl?: string | null } | null };

export type ListNoteStubsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListNoteStubsQuery = { __typename?: 'Query', noteStubs: Array<{ __typename?: 'NoteStub', id: string, title: string, aliases: Array<string> }> };

export type BacklinksQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type BacklinksQuery = { __typename?: 'Query', backlinks: Array<{ __typename?: 'NoteType', id: string, title: string }> };

export type PreviewQueryVariables = Exact<{
  title: Scalars['String']['input'];
}>;


export type PreviewQuery = { __typename?: 'Query', noteByTitle?: { __typename?: 'NoteType', id: string, title: string, content: string } | null };

export type CreateNoteMutationVariables = Exact<{
  title: Scalars['String']['input'];
  content: Scalars['String']['input'];
  aliases?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  folderId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CreateNoteMutation = { __typename?: 'Mutation', createNote: { __typename?: 'NoteType', id: string } };

export type UpdateNoteMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
  content?: InputMaybe<Scalars['String']['input']>;
}>;


export type UpdateNoteMutation = { __typename?: 'Mutation', updateNote?: { __typename?: 'NoteType', id: string } | null };

export type UpdateCoverMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  coverUrl?: InputMaybe<Scalars['String']['input']>;
}>;


export type UpdateCoverMutation = { __typename?: 'Mutation', updateNote?: { __typename?: 'NoteType', id: string } | null };

export type UpdateAliasesMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  aliases?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
}>;


export type UpdateAliasesMutation = { __typename?: 'Mutation', updateNote?: { __typename?: 'NoteType', id: string } | null };

export type MoveNoteMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  folderId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type MoveNoteMutation = { __typename?: 'Mutation', moveNote?: { __typename?: 'NoteType', id: string } | null };

export type DeleteNoteMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteNoteMutation = { __typename?: 'Mutation', deleteNote: boolean };

export type DeleteNotesMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type DeleteNotesMutation = { __typename?: 'Mutation', deleteNotes: number };

export type RestoreNotesMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type RestoreNotesMutation = { __typename?: 'Mutation', restoreNotes: number };

export type PurgeNotesMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type PurgeNotesMutation = { __typename?: 'Mutation', purgeNotes: number };

export type SearchQueryVariables = Exact<{
  keyword: Scalars['String']['input'];
}>;


export type SearchQuery = { __typename?: 'Query', search: Array<{ __typename?: 'SearchResult', noteId: string, noteTitle: string, sentences: Array<string> }> };

export type ListOrphansQueryVariables = Exact<{ [key: string]: never; }>;


export type ListOrphansQuery = { __typename?: 'Query', orphans: Array<{ __typename?: 'NoteType', id: string, title: string, aliases: Array<string> }> };

export type GetSidebarDataQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSidebarDataQuery = { __typename?: 'Query', notes: Array<{ __typename?: 'NoteType', id: string, title: string, folderId?: string | null }>, folders: Array<{ __typename?: 'FolderType', id: string, name: string, parentId?: string | null }> };

export type GetTrashQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTrashQuery = { __typename?: 'Query', trash: { __typename?: 'TrashData', notes: Array<{ __typename?: 'NoteType', id: string, title: string, folderId?: string | null, deletedAt?: string | null }>, folders: Array<{ __typename?: 'FolderType', id: string, name: string, parentId?: string | null, deletedAt?: string | null }> } };

export type EmptyTrashMutationVariables = Exact<{ [key: string]: never; }>;


export type EmptyTrashMutation = { __typename?: 'Mutation', emptyTrash: boolean };


export const ListFoldersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListFolders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"folders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"parentId"}}]}}]}}]} as unknown as DocumentNode<ListFoldersQuery, ListFoldersQueryVariables>;
export const CreateFolderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateFolder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"parentId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createFolder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"parentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"parentId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateFolderMutation, CreateFolderMutationVariables>;
export const RenameFolderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RenameFolder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"renameFolder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<RenameFolderMutation, RenameFolderMutationVariables>;
export const MoveFolderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MoveFolder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"parentId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moveFolder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"parentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"parentId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"parentId"}}]}}]}}]} as unknown as DocumentNode<MoveFolderMutation, MoveFolderMutationVariables>;
export const DeleteFolderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteFolder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteFolder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteFolderMutation, DeleteFolderMutationVariables>;
export const DeleteFoldersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteFolders"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ids"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteFolders"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ids"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ids"}}}]}]}}]} as unknown as DocumentNode<DeleteFoldersMutation, DeleteFoldersMutationVariables>;
export const RestoreFoldersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RestoreFolders"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ids"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"restoreFolders"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ids"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ids"}}}]}]}}]} as unknown as DocumentNode<RestoreFoldersMutation, RestoreFoldersMutationVariables>;
export const PurgeFoldersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PurgeFolders"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ids"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"purgeFolders"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ids"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ids"}}}]}]}}]} as unknown as DocumentNode<PurgeFoldersMutation, PurgeFoldersMutationVariables>;
export const GetGraphDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGraph"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"graphData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"nodeType"}},{"kind":"Field","name":{"kind":"Name","value":"val"}}]}},{"kind":"Field","name":{"kind":"Name","value":"links"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"edgeType"}}]}}]}}]}}]} as unknown as DocumentNode<GetGraphQuery, GetGraphQueryVariables>;
export const GetFolderGraphDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetFolderGraph"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"folderGraph"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"nodeType"}},{"kind":"Field","name":{"kind":"Name","value":"val"}}]}},{"kind":"Field","name":{"kind":"Name","value":"links"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"edgeType"}}]}}]}}]}}]} as unknown as DocumentNode<GetFolderGraphQuery, GetFolderGraphQueryVariables>;
export const GetNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"aliases"}},{"kind":"Field","name":{"kind":"Name","value":"folderId"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}}]}}]}}]} as unknown as DocumentNode<GetNoteQuery, GetNoteQueryVariables>;
export const ListNoteStubsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListNoteStubs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"noteStubs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"aliases"}}]}}]}}]} as unknown as DocumentNode<ListNoteStubsQuery, ListNoteStubsQueryVariables>;
export const BacklinksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Backlinks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"backlinks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}}]} as unknown as DocumentNode<BacklinksQuery, BacklinksQueryVariables>;
export const PreviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Preview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"noteByTitle"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}}]}}]}}]} as unknown as DocumentNode<PreviewQuery, PreviewQueryVariables>;
export const CreateNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"content"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"aliases"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"folderId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"Argument","name":{"kind":"Name","value":"content"},"value":{"kind":"Variable","name":{"kind":"Name","value":"content"}}},{"kind":"Argument","name":{"kind":"Name","value":"aliases"},"value":{"kind":"Variable","name":{"kind":"Name","value":"aliases"}}},{"kind":"Argument","name":{"kind":"Name","value":"folderId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"folderId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateNoteMutation, CreateNoteMutationVariables>;
export const UpdateNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"content"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"Argument","name":{"kind":"Name","value":"content"},"value":{"kind":"Variable","name":{"kind":"Name","value":"content"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdateNoteMutation, UpdateNoteMutationVariables>;
export const UpdateCoverDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCover"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"coverUrl"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"coverUrl"},"value":{"kind":"Variable","name":{"kind":"Name","value":"coverUrl"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdateCoverMutation, UpdateCoverMutationVariables>;
export const UpdateAliasesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateAliases"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"aliases"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"aliases"},"value":{"kind":"Variable","name":{"kind":"Name","value":"aliases"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdateAliasesMutation, UpdateAliasesMutationVariables>;
export const MoveNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MoveNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"folderId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moveNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"folderId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"folderId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<MoveNoteMutation, MoveNoteMutationVariables>;
export const DeleteNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteNoteMutation, DeleteNoteMutationVariables>;
export const DeleteNotesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteNotes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ids"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteNotes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ids"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ids"}}}]}]}}]} as unknown as DocumentNode<DeleteNotesMutation, DeleteNotesMutationVariables>;
export const RestoreNotesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RestoreNotes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ids"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"restoreNotes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ids"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ids"}}}]}]}}]} as unknown as DocumentNode<RestoreNotesMutation, RestoreNotesMutationVariables>;
export const PurgeNotesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PurgeNotes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ids"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"purgeNotes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ids"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ids"}}}]}]}}]} as unknown as DocumentNode<PurgeNotesMutation, PurgeNotesMutationVariables>;
export const SearchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Search"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"keyword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"search"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"keyword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"keyword"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"noteId"}},{"kind":"Field","name":{"kind":"Name","value":"noteTitle"}},{"kind":"Field","name":{"kind":"Name","value":"sentences"}}]}}]}}]} as unknown as DocumentNode<SearchQuery, SearchQueryVariables>;
export const ListOrphansDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListOrphans"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orphans"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"aliases"}}]}}]}}]} as unknown as DocumentNode<ListOrphansQuery, ListOrphansQueryVariables>;
export const GetSidebarDataDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSidebarData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"folderId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"folders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"parentId"}}]}}]}}]} as unknown as DocumentNode<GetSidebarDataQuery, GetSidebarDataQueryVariables>;
export const GetTrashDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTrash"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"trash"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"folderId"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"folders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"parentId"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetTrashQuery, GetTrashQueryVariables>;
export const EmptyTrashDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EmptyTrash"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"emptyTrash"}}]}}]} as unknown as DocumentNode<EmptyTrashMutation, EmptyTrashMutationVariables>;