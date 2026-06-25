import { graphql } from "~/gql";
import { request } from "~/lib/graphql-client";

const GetSidebarDataDocument = graphql(`
  query GetSidebarData {
    notes { id title folderId }
    folders { id name parentId }
  }
`);

/** The note + folder data the global sidebar tree needs, in one round trip. */
export function getSidebarData(token: string) {
  return request(GetSidebarDataDocument, {}, token);
}
