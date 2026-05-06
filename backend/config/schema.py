import graphene
from usuarios.schema      import Query as UsuariosQuery,      Mutation as UsuariosMutation
from vuelos.schema        import Query as VuelosQuery,        Mutation as VuelosMutation
from reservas.schema      import Query as ReservasQuery,      Mutation as ReservasMutation
from salida.schema        import Query as SalidaQuery,        Mutation as SalidaMutation
from finanzas.schema      import Query as FinanzasQuery,      Mutation as FinanzasMutation
from notificaciones.schema import Query as NotificacionesQuery, Mutation as NotificacionesMutation


class Query(
    UsuariosQuery,
    VuelosQuery,
    ReservasQuery,
    SalidaQuery,
    FinanzasQuery,
    NotificacionesQuery,
    graphene.ObjectType
):
    pass


class Mutation(
    UsuariosMutation,
    VuelosMutation,
    ReservasMutation,
    SalidaMutation,
    FinanzasMutation,
    NotificacionesMutation,
    graphene.ObjectType
):
    pass


schema = graphene.Schema(query=Query, mutation=Mutation)