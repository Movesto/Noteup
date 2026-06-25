"""Print the GraphQL schema as SDL.

The backend Strawberry schema is the single source of truth for the API
contract. Run this to regenerate the committed SDL the frontend codegen reads:

    python -m scripts.export_schema > ../frontend/schema.graphql
"""

import strawberry

from app.graphql.mutations import Mutation
from app.graphql.queries import Query


def schema_sdl() -> str:
    return strawberry.Schema(query=Query, mutation=Mutation).as_str()


if __name__ == "__main__":
    print(schema_sdl())
