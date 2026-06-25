"""Assembles the Strawberry schema and the FastAPI GraphQL router."""

from typing import Callable

import strawberry
from strawberry.fastapi import GraphQLRouter

from app.graphql.mutations import Mutation
from app.graphql.queries import Query


def build_graphql_router(context_getter: Callable) -> GraphQLRouter:
    schema = strawberry.Schema(query=Query, mutation=Mutation)
    return GraphQLRouter(schema, context_getter=context_getter)
