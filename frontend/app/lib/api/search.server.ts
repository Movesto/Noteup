import { graphql } from "~/gql";
import { request } from "~/lib/graphql-client";

const SearchDocument = graphql(`
  query Search($keyword: String!) {
    search(keyword: $keyword) { noteId noteTitle sentences }
  }
`);
export function searchNotes(token: string, keyword: string) {
  return request(SearchDocument, { keyword }, token).then((d) => d.search);
}

const ListOrphansDocument = graphql(`
  query ListOrphans {
    orphans { id title aliases }
  }
`);
export function listOrphans(token: string) {
  return request(ListOrphansDocument, {}, token).then((d) => d.orphans);
}
