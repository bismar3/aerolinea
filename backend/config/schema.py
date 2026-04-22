import graphene
import seguridad.schema as seguridad_schema

class Query(
    seguridad_schema.Query,
    graphene.ObjectType
):
    pass

class Mutation(
    seguridad_schema.Mutation,
    graphene.ObjectType
):
    pass

schema = graphene.Schema(query=Query, mutation=Mutation)