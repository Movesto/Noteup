import { graphql } from "~/gql";
import { request } from "~/lib/graphql-client";

const GetTrashDocument = graphql(`
  query GetTrash {
    trash {
      notes { id title folderId deletedAt }
      folders { id name parentId deletedAt }
    }
  }
`);
/** Everything currently in the trash — notes and folders — in one round trip. */
export function getTrash(token: string) {
  return request(GetTrashDocument, {}, token).then((d) => d.trash);
}

const EmptyTrashDocument = graphql(`
  mutation EmptyTrash {
    emptyTrash
  }
`);
export function emptyTrash(token: string) {
  return request(EmptyTrashDocument, {}, token);
}
