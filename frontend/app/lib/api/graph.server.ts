import { graphql } from "~/gql";
import { request } from "~/lib/graphql-client";
import type { GraphData } from "~/types";

const GetGraphDocument = graphql(`
  query GetGraph {
    graphData {
      nodes { id name nodeType val }
      links { source target edgeType }
    }
  }
`);
export function getGraph(token: string): Promise<GraphData> {
  return request(GetGraphDocument, {}, token).then((d) => d.graphData);
}

const GetFolderGraphDocument = graphql(`
  query GetFolderGraph($id: ID!) {
    folderGraph(id: $id) {
      nodes { id name nodeType val }
      links { source target edgeType }
    }
  }
`);
export function getFolderGraph(token: string, id: string): Promise<GraphData | null> {
  return request(GetFolderGraphDocument, { id }, token).then((d) => d.folderGraph ?? null);
}
