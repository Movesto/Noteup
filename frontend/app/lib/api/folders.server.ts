import { graphql } from "~/gql";
import { request } from "~/lib/graphql-client";

const ListFoldersDocument = graphql(`
  query ListFolders {
    folders { id name parentId }
  }
`);
export function listFolders(token: string) {
  return request(ListFoldersDocument, {}, token).then((d) => d.folders);
}

const CreateFolderDocument = graphql(`
  mutation CreateFolder($name: String!, $parentId: ID) {
    createFolder(name: $name, parentId: $parentId) { id }
  }
`);
export function createFolder(
  token: string,
  vars: { name: string; parentId?: string | null }
) {
  return request(CreateFolderDocument, { name: vars.name, parentId: vars.parentId ?? null }, token);
}

const RenameFolderDocument = graphql(`
  mutation RenameFolder($id: ID!, $name: String!) {
    renameFolder(id: $id, name: $name) { id }
  }
`);
export function renameFolder(token: string, id: string, name: string) {
  return request(RenameFolderDocument, { id, name }, token);
}

const MoveFolderDocument = graphql(`
  mutation MoveFolder($id: ID!, $parentId: ID) {
    moveFolder(id: $id, parentId: $parentId) { id parentId }
  }
`);
export function moveFolder(token: string, id: string, parentId: string | null) {
  return request(MoveFolderDocument, { id, parentId }, token);
}

const DeleteFolderDocument = graphql(`
  mutation DeleteFolder($id: ID!) {
    deleteFolder(id: $id)
  }
`);
export function deleteFolder(token: string, id: string) {
  return request(DeleteFolderDocument, { id }, token);
}

const DeleteFoldersDocument = graphql(`
  mutation DeleteFolders($ids: [ID!]!) {
    deleteFolders(ids: $ids)
  }
`);
export function deleteFolders(token: string, ids: string[]) {
  return request(DeleteFoldersDocument, { ids }, token);
}

const RestoreFoldersDocument = graphql(`
  mutation RestoreFolders($ids: [ID!]!) {
    restoreFolders(ids: $ids)
  }
`);
export function restoreFolders(token: string, ids: string[]) {
  return request(RestoreFoldersDocument, { ids }, token);
}

const PurgeFoldersDocument = graphql(`
  mutation PurgeFolders($ids: [ID!]!) {
    purgeFolders(ids: $ids)
  }
`);
export function purgeFolders(token: string, ids: string[]) {
  return request(PurgeFoldersDocument, { ids }, token);
}
