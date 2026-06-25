import type { CodegenConfig } from "@graphql-codegen/cli";

// Generates typed GraphQL documents + result types from the backend's committed
// SDL (schema.graphql, exported by backend/scripts/export_schema.py). The output
// in app/gql/ is the single source of truth the data layer builds on.
const config: CodegenConfig = {
  schema: "./schema.graphql",
  documents: ["app/**/*.{ts,tsx}", "!app/gql/**/*"],
  ignoreNoDocuments: true,
  generates: {
    "app/gql/": {
      preset: "client",
      presetConfig: { fragmentMasking: false },
      config: {
        useTypeImports: true,
        scalars: { DateTime: "string" },
      },
    },
  },
};

export default config;
