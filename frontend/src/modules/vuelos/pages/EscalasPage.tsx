import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { GET_RUTAS, GET_ESCALAS, GET_AEROPUERTOS } from '../graphql/queries'
import { CREAR_ESCALA_MUTATION, ELIMINAR_ESCALA_MUTATION } from '../graphql/mutations'

interface Aeropuerto {
  idAeropuerto: string
  nombre: string
  codigo: string
  ciudad: string
}

interface Ruta {
  idRuta: string
  tipo: string
  idAeropuertoOrigen: Aeropuerto
  idAeropuertoDestino: Aeropuerto
}

interface Escala {
  idEscala: string
  ciudad: string
  orden: number
  tiempoDuracion: number
  aeropuerto: Aeropuerto
  idRuta: { idRuta: string }
}

interface CrearEscalaRes   { crearEscala:   { ok: boolean; mensaje: string; escala: Escala } }
interface EliminarEscalaRes { eliminarEscala: { ok: boolean; mensaje: string } }

const EscalasPage = () => {
  const [rutaSeleccionada, setRutaSeleccionada] = useState<Ruta | null>(null)
  const [mensaje, setMensaje]                   = useState('')
  const [error, setError]                       = useState('')
  const [form, setForm]                         = useState({
    idAeropuerto: '', tiempoDuracion: '30'
  })

  const { data: dataRutas }       = useQuery<{ rutas: Ruta[] }>(GET_RUTAS, { fetchPolicy: 'network-only' })
  const { data: dataAeropuertos } = useQuery<{ aeropuertos: Aeropuerto[] }>(GET_AEROPUERTOS, { fetchPolicy: 'network-only' })

  const { data: dataEscalas, refetch: refetchEscalas } = useQuery<{ escalas: Escala[] }>(
    GET_ESCALAS,
    {
      variables: { idRuta: rutaSeleccionada ? parseInt(rutaSeleccionada.idRuta) : null },
      skip: !rutaSeleccionada,
      fetchPolicy: 'network-only',
    }
  )

  const [crearEscala]   = useMutation<CrearEscalaRes>(CREAR_ESCALA_MUTATION)
  const [eliminarEscala] = useMutation<EliminarEscalaRes>(ELIMINAR_ESCALA_MUTATION)

  const limpiar = () => { setMensaje(''); setError('') }
  const mostrar = (ok: boolean, msg: string) => {
    if (ok) { setMensaje('✅ ' + msg); setError('') }
    else    { setError('❌ ' + msg);   setMensaje('') }
  }

  // Escalas ordenadas de la ruta seleccionada
  const escalas = [...(dataEscalas?.escalas || [])].sort((a, b) => a.orden - b.orden)

  // Siguiente orden automático
  const siguienteOrden = escalas.length > 0
    ? Math.max(...escalas.map(e => e.orden)) + 1
    : 1

  // Aeropuertos disponibles: excluir origen, destino y los ya usados como escala
  const aeropuertosDisponibles = (dataAeropuertos?.aeropuertos || []).filter(a => {
    if (!rutaSeleccionada) return false
    if (a.idAeropuerto === rutaSeleccionada.idAeropuertoOrigen.idAeropuerto) return false
    if (a.idAeropuerto === rutaSeleccionada.idAeropuertoDestino.idAeropuerto) return false
    if (escalas.some(e => e.aeropuerto.idAeropuerto === a.idAeropuerto)) return false
    return true
  })

  const handleRutaChange = (idRuta: string) => {
    const ruta = dataRutas?.rutas.find(r => r.idRuta === idRuta) || null
    setRutaSeleccionada(ruta)
    setForm({ idAeropuerto: '', tiempoDuracion: '30' })
    limpiar()
  }

  const handleAgregar = async () => {
    limpiar()
    if (!rutaSeleccionada) return mostrar(false, 'Selecciona una ruta')
    if (!form.idAeropuerto) return mostrar(false, 'Selecciona un aeropuerto de escala')

    const aeropuerto = dataAeropuertos?.aeropuertos.find(a => a.idAeropuerto === form.idAeropuerto)
    if (!aeropuerto) return mostrar(false, 'Aeropuerto no encontrado')

    try {
      const { data: res } = await crearEscala({
        variables: {
          idRuta:        parseInt(rutaSeleccionada.idRuta),
          idAeropuerto:  parseInt(form.idAeropuerto),
          ciudad:        aeropuerto.ciudad,
          orden:         siguienteOrden,
          tiempoDuracion: parseInt(form.tiempoDuracion) || 0,
        }
      })
      if (res?.crearEscala.ok) {
        mostrar(true, res.crearEscala.mensaje)
        setForm({ idAeropuerto: '', tiempoDuracion: '30' })
        refetchEscalas()
      } else {
        mostrar(false, res?.crearEscala.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleEliminar = async (idEscala: string) => {
    if (!confirm('¿Eliminar esta escala?')) return
    limpiar()
    try {
      const { data: res } = await eliminarEscala({ variables: { idEscala: parseInt(idEscala) } })
      if (res?.eliminarEscala.ok) {
        mostrar(true, res.eliminarEscala.mensaje)
        refetchEscalas()
      } else {
        mostrar(false, res?.eliminarEscala.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  return (
    <div className="p-6">
      {/* Cabecera */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Escalas</h1>
        <p className="text-slate-500 text-sm mt-1">Gestión de escalas por ruta</p>
      </div>

      {mensaje && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{mensaje}</div>}
      {error   && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Selector de ruta */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Seleccionar Ruta</label>
        <select
          value={rutaSeleccionada?.idRuta || ''}
          onChange={e => handleRutaChange(e.target.value)}
          className="w-full max-w-lg border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Seleccionar ruta --</option>
          {(dataRutas?.rutas || []).map(r => (
            <option key={r.idRuta} value={r.idRuta}>
              {r.idAeropuertoOrigen.codigo} ({r.idAeropuertoOrigen.ciudad}) →{' '}
              {r.idAeropuertoDestino.codigo} ({r.idAeropuertoDestino.ciudad})
            </option>
          ))}
        </select>
      </div>

      {rutaSeleccionada && (
        <>
          {/* Visualización del recorrido */}
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase mb-4">Recorrido completo</h2>
            <div className="flex items-center flex-wrap gap-2">
              {/* Origen */}
              <div className="flex flex-col items-center">
                <div className="bg-blue-800 text-white px-3 py-2 rounded-lg text-sm font-bold">
                  {rutaSeleccionada.idAeropuertoOrigen.codigo}
                </div>
                <div className="text-xs text-slate-500 mt-1">{rutaSeleccionada.idAeropuertoOrigen.ciudad}</div>
                <div className="text-xs text-blue-600 font-medium">Origen</div>
              </div>

              {/* Escalas */}
              {escalas.map((escala, idx) => (
                <div key={escala.idEscala} className="flex items-center gap-2">
                  {/* Flecha */}
                  <div className="flex flex-col items-center">
                    <div className="text-slate-300 text-lg">→</div>
                    <div className="text-xs text-slate-400">{escala.tiempoDuracion} min</div>
                  </div>
                  {/* Nodo escala */}
                  <div className="flex flex-col items-center">
                    <div className="bg-amber-100 border-2 border-amber-400 text-amber-800 px-3 py-2 rounded-lg text-sm font-bold">
                      {escala.aeropuerto.codigo}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{escala.ciudad}</div>
                    <div className="text-xs text-amber-600 font-medium">Escala {idx + 1}</div>
                  </div>
                </div>
              ))}

              {/* Flecha final */}
              <div className="text-slate-300 text-lg">→</div>

              {/* Destino */}
              <div className="flex flex-col items-center">
                <div className="bg-blue-800 text-white px-3 py-2 rounded-lg text-sm font-bold">
                  {rutaSeleccionada.idAeropuertoDestino.codigo}
                </div>
                <div className="text-xs text-slate-500 mt-1">{rutaSeleccionada.idAeropuertoDestino.ciudad}</div>
                <div className="text-xs text-blue-600 font-medium">Destino</div>
              </div>
            </div>

            {escalas.length === 0 && (
              <p className="text-slate-400 text-sm mt-4">Esta ruta no tiene escalas — vuelo directo.</p>
            )}
          </div>

          {/* Formulario agregar escala */}
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Agregar Escala</h2>
            <div className="grid grid-cols-2 gap-4 max-w-lg">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Aeropuerto de escala * <span className="text-slate-400 font-normal">(orden: {siguienteOrden})</span>
                </label>
                <select
                  value={form.idAeropuerto}
                  onChange={e => setForm({ ...form, idAeropuerto: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Seleccionar aeropuerto --</option>
                  {aeropuertosDisponibles.map(a => (
                    <option key={a.idAeropuerto} value={a.idAeropuerto}>
                      {a.codigo} - {a.ciudad}
                    </option>
                  ))}
                </select>
                {aeropuertosDisponibles.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No hay aeropuertos disponibles. Registra más aeropuertos para agregar escalas.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tiempo de parada (min)</label>
                <input
                  type="number" min="0" value={form.tiempoDuracion}
                  onChange={e => setForm({ ...form, tiempoDuracion: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
            <div className="mt-4">
              <button onClick={handleAgregar}
                className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition">
                + Agregar Escala
              </button>
            </div>
          </div>

          {/* Tabla de escalas */}
          {escalas.length > 0 && (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Orden</th>
                    <th className="px-4 py-3">Aeropuerto</th>
                    <th className="px-4 py-3">Ciudad</th>
                    <th className="px-4 py-3">Tiempo parada</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {escalas.map(e => (
                    <tr key={e.idEscala} className="border-t hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded font-bold text-xs">
                          #{e.orden}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-blue-800 font-semibold">{e.aeropuerto.codigo}</td>
                      <td className="px-4 py-3">{e.ciudad}</td>
                      <td className="px-4 py-3">{e.tiempoDuracion} min</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleEliminar(e.idEscala)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold transition">
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!rutaSeleccionada && (
        <div className="bg-white rounded-xl shadow p-12 text-center text-slate-400">
          <div className="text-4xl mb-3">✈️</div>
          <p className="text-sm">Selecciona una ruta para ver y gestionar sus escalas</p>
        </div>
      )}
    </div>
  )
}

export default EscalasPage