import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { GET_RUTAS, GET_AEROPUERTOS } from '../graphql/queries'
import { CREAR_RUTA_MUTATION, ELIMINAR_RUTA_MUTATION } from '../graphql/mutations'

interface Aeropuerto {
  idAeropuerto: string
  nombre: string
  codigo: string
  ciudad: string
  latitud: string | null
  longitud: string | null
}

interface Ruta {
  idRuta: string
  distanciaKm: number
  duracionHr: number
  tipo: string
  estado: string
  idAeropuertoOrigen: Aeropuerto
  idAeropuertoDestino: Aeropuerto
}

interface CrearRutaRes {
  crearRuta: { ok: boolean; mensaje: string; distanciaKm: number; duracionHr: number; ruta: Ruta }
}
interface EliminarRutaRes {
  eliminarRuta: { ok: boolean; mensaje: string }
}

function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R    = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a    = Math.sin(dLat / 2) ** 2 +
               Math.cos((lat1 * Math.PI) / 180) *
               Math.cos((lat2 * Math.PI) / 180) *
               Math.sin(dLon / 2) ** 2
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function calcularDuracion(distanciaKm: number): number {
  return Math.round((distanciaKm / 850 + 0.5) * 10) / 10
}

const RutasPage = () => {
  const [modo, setModo]       = useState<'lista' | 'nuevo'>('lista')
  const [mensaje, setMensaje] = useState('')
  const [error, setError]     = useState('')
  const [form, setForm]       = useState({
    idAeropuertoOrigen: '', idAeropuertoDestino: '', tipo: 'nacional'
  })
  const [preview, setPreview] = useState<{ distanciaKm: number; duracionHr: number } | null>(null)

  const { data: dataRutas, refetch } = useQuery<{ rutas: Ruta[] }>(GET_RUTAS, { fetchPolicy: 'network-only' })
  const { data: dataAeropuertos }    = useQuery<{ aeropuertos: Aeropuerto[] }>(GET_AEROPUERTOS, { fetchPolicy: 'network-only' })
  const [crearRuta]    = useMutation<CrearRutaRes>(CREAR_RUTA_MUTATION)
  const [eliminarRuta] = useMutation<EliminarRutaRes>(ELIMINAR_RUTA_MUTATION)

  const limpiar = () => { setMensaje(''); setError('') }
  const mostrar = (ok: boolean, msg: string) => {
    if (ok) { setMensaje('✅ ' + msg); setError('') }
    else    { setError('❌ ' + msg);   setMensaje('') }
  }

  useEffect(() => {
    if (!form.idAeropuertoOrigen || !form.idAeropuertoDestino) { setPreview(null); return }
    const aeropuertos = dataAeropuertos?.aeropuertos || []
    const origen  = aeropuertos.find(a => a.idAeropuerto === form.idAeropuertoOrigen)
    const destino = aeropuertos.find(a => a.idAeropuerto === form.idAeropuertoDestino)
    if (origen?.latitud && origen?.longitud && destino?.latitud && destino?.longitud) {
      const dist = calcularDistancia(
        parseFloat(origen.latitud), parseFloat(origen.longitud),
        parseFloat(destino.latitud), parseFloat(destino.longitud)
      )
      setPreview({ distanciaKm: dist, duracionHr: calcularDuracion(dist) })
    } else {
      setPreview(null)
    }
  }, [form.idAeropuertoOrigen, form.idAeropuertoDestino, dataAeropuertos])

  const handleCrear = async () => {
    limpiar()
    if (!form.idAeropuertoOrigen || !form.idAeropuertoDestino)
      return mostrar(false, 'Selecciona origen y destino')
    if (form.idAeropuertoOrigen === form.idAeropuertoDestino)
      return mostrar(false, 'Origen y destino no pueden ser iguales')
    try {
      const { data: res } = await crearRuta({
        variables: {
          idAeropuertoOrigen:  parseInt(form.idAeropuertoOrigen),
          idAeropuertoDestino: parseInt(form.idAeropuertoDestino),
          tipo: form.tipo,
        }
      })
      if (res?.crearRuta.ok) {
        mostrar(true, res.crearRuta.mensaje)
        setForm({ idAeropuertoOrigen: '', idAeropuertoDestino: '', tipo: 'nacional' })
        setPreview(null)
        setModo('lista')
        refetch()
      } else {
        mostrar(false, res?.crearRuta.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleEliminar = async (idRuta: string) => {
    if (!confirm('¿Eliminar esta ruta?')) return
    limpiar()
    try {
      const { data: res } = await eliminarRuta({ variables: { idRuta: parseInt(idRuta) } })
      if (res?.eliminarRuta.ok) {
        mostrar(true, res.eliminarRuta.mensaje)
        refetch()
      } else {
        mostrar(false, res?.eliminarRuta.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  const aeropuertos = dataAeropuertos?.aeropuertos || []

  const sinCoordenadas = (id: string) => {
    const a = aeropuertos.find(x => x.idAeropuerto === id)
    return a && (!a.latitud || !a.longitud)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rutas</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de rutas de vuelo</p>
        </div>
        {modo === 'lista' && (
          <button onClick={() => { setModo('nuevo'); limpiar() }}
            className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
            + Nueva Ruta
          </button>
        )}
        {modo === 'nuevo' && (
          <button onClick={() => { setModo('lista'); limpiar() }}
            className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-semibold transition">
            ← Volver a lista
          </button>
        )}
      </div>

      {mensaje && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{mensaje}</div>}
      {error   && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* NUEVO */}
      {modo === 'nuevo' && (
        <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Nueva Ruta</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Origen *</label>
              <select value={form.idAeropuertoOrigen}
                onChange={e => setForm({ ...form, idAeropuertoOrigen: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Seleccionar --</option>
                {aeropuertos.map(a => (
                  <option key={a.idAeropuerto} value={a.idAeropuerto}>
                    {a.codigo} - {a.ciudad}{!a.latitud ? ' ⚠️' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Destino *</label>
              <select value={form.idAeropuertoDestino}
                onChange={e => setForm({ ...form, idAeropuertoDestino: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Seleccionar --</option>
                {aeropuertos.filter(a => a.idAeropuerto !== form.idAeropuertoOrigen).map(a => (
                  <option key={a.idAeropuerto} value={a.idAeropuerto}>
                    {a.codigo} - {a.ciudad}{!a.latitud ? ' ⚠️' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="nacional">Nacional</option>
                <option value="internacional">Internacional</option>
              </select>
            </div>

            {/* Preview distancia/duración */}
            {preview && (
              <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3 grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">Distancia estimada</div>
                  <div className="text-lg font-bold text-blue-800">{preview.distanciaKm} km</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">Duración estimada</div>
                  <div className="text-lg font-bold text-blue-800">{preview.duracionHr} hrs</div>
                </div>
                <div className="col-span-2 text-xs text-slate-400 text-center">
                  Calculado automáticamente · Velocidad crucero 850 km/h + 30 min maniobras
                </div>
              </div>
            )}

            {/* Aviso sin coordenadas */}
            {(sinCoordenadas(form.idAeropuertoOrigen) || sinCoordenadas(form.idAeropuertoDestino)) && (
              <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                ⚠️ Uno o más aeropuertos no tienen coordenadas. La distancia y duración no se calcularán automáticamente. Edita el aeropuerto para agregar coordenadas.
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={handleCrear}
              className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition">
              Guardar
            </button>
            <button onClick={() => setModo('lista')}
              className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-6 py-2 rounded-lg text-sm transition">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* LISTA */}
      {modo === 'lista' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3">Destino</th>
                <th className="px-4 py-3">Distancia</th>
                <th className="px-4 py-3">Duración</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(dataRutas?.rutas || []).map(r => (
                <tr key={r.idRuta} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    <span className="font-mono text-blue-800 font-semibold">{r.idAeropuertoOrigen.codigo}</span>
                    <span className="text-slate-500 ml-1">— {r.idAeropuertoOrigen.ciudad}</span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <span className="font-mono text-blue-800 font-semibold">{r.idAeropuertoDestino.codigo}</span>
                    <span className="text-slate-500 ml-1">— {r.idAeropuertoDestino.ciudad}</span>
                  </td>
                  <td className="px-4 py-3">
                    {r.distanciaKm
                      ? `${r.distanciaKm} km`
                      : <span className="text-amber-500 text-xs">Sin datos</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.duracionHr
                      ? `${r.duracionHr} hrs`
                      : <span className="text-amber-500 text-xs">Sin datos</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      r.tipo === 'internacional'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>{r.tipo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleEliminar(r.idRuta)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold transition">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {(dataRutas?.rutas || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-sm">
                    No hay rutas registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default RutasPage