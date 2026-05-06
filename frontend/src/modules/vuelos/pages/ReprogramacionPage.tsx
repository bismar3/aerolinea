import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { GET_REPROGRAMACIONES } from '../graphql/queries'
import { ACTUALIZAR_REPROGRAMACION_MUTATION } from '../graphql/mutations'

interface Reprogramacion {
  idReprogramacion: string
  motivo: string
  descripcion: string | null
  estado: string
  nuevaFechaSalida: string | null
  nuevaHoraSalida: string | null
  fechaCreacion: string
  idProgramacion: {
    idProgramacion: string
    codigoVuelo: string
    estado: string
    fechaSalida: string
    horaSalida: string
    motivoCancelacion: string | null
    idRuta: {
      idAeropuertoOrigen: { codigo: string; ciudad: string }
      idAeropuertoDestino: { codigo: string; ciudad: string }
    }
  }
}

interface ActualizarRepRes { actualizarReprogramacion: { ok: boolean; mensaje: string } }

const MOTIVO_LABEL: Record<string, string> = {
  meteorologia:   'Condiciones Meteorológicas',
  falta_cupos:    'Falta de Ocupación Mínima',
  administrativo: 'Decisión Administrativa',
  falla_tecnica:  'Falla Técnica',
  otro:           'Otro Motivo',
}

const motivoColor = (m: string) => ({
  meteorologia:   'bg-blue-100 text-blue-700',
  falta_cupos:    'bg-red-100 text-red-700',
  administrativo: 'bg-purple-100 text-purple-700',
  falla_tecnica:  'bg-orange-100 text-orange-700',
  otro:           'bg-slate-100 text-slate-600',
}[m] || 'bg-slate-100 text-slate-600')

const estadoColor = (e: string) => ({
  pendiente:            'bg-amber-100 text-amber-700',
  reprogramado:         'bg-green-100 text-green-700',
  cancelado_definitivo: 'bg-red-100 text-red-700',
}[e] || 'bg-slate-100 text-slate-600')

const ReprogramacionPage = () => {
  const [sel, setSel]         = useState<Reprogramacion | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError]     = useState('')
  const [form, setForm]       = useState({
    estado: '', nuevaFechaSalida: '', nuevaHoraSalida: '', descripcion: ''
  })

  const { data, refetch } = useQuery<{ reprogramaciones: Reprogramacion[] }>(
    GET_REPROGRAMACIONES, { fetchPolicy: 'network-only' }
  )
  const [actualizarRep] = useMutation<ActualizarRepRes>(ACTUALIZAR_REPROGRAMACION_MUTATION)

  const limpiar = () => { setMensaje(''); setError('') }
  const mostrar = (ok: boolean, msg: string) => {
    if (ok) { setMensaje('✅ ' + msg); setError('') }
    else    { setError('❌ ' + msg);   setMensaje('') }
    setTimeout(() => { setMensaje(''); setError('') }, 4000)
  }

  const handleSeleccionar = (r: Reprogramacion) => {
    setSel(r)
    setForm({
      estado: r.estado,
      nuevaFechaSalida: r.nuevaFechaSalida || '',
      nuevaHoraSalida:  r.nuevaHoraSalida  || '',
      descripcion:      r.descripcion      || '',
    })
    limpiar()
  }

  const handleActualizar = async () => {
    if (!sel) return
    limpiar()
    if (form.estado === 'reprogramado' && (!form.nuevaFechaSalida || !form.nuevaHoraSalida))
      return mostrar(false, 'Para reprogramar debes indicar nueva fecha y hora de salida')
    try {
      const { data: res } = await actualizarRep({
        variables: {
          idReprogramacion: parseInt(sel.idReprogramacion),
          estado: form.estado,
          nuevaFechaSalida: form.nuevaFechaSalida || null,
          nuevaHoraSalida:  form.nuevaHoraSalida  || null,
          descripcion:      form.descripcion      || null,
        }
      })
      if (res?.actualizarReprogramacion.ok) {
        mostrar(true, res.actualizarReprogramacion.mensaje)
        setSel(null); refetch()
      } else mostrar(false, res?.actualizarReprogramacion.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  const reprogramaciones = data?.reprogramaciones || []
  const pendientes   = reprogramaciones.filter(r => r.estado === 'pendiente').length
  const resueltas    = reprogramaciones.filter(r => r.estado !== 'pendiente').length

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Reprogramaciones</h1>
        <p className="text-slate-500 text-sm mt-1">Vuelos cancelados o retrasados pendientes de resolución</p>
      </div>

      {mensaje && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{mensaje}</div>}
      {error   && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{reprogramaciones.length}</div>
          <div className="text-xs text-slate-500 mt-1">Total registros</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-700">{pendientes}</div>
          <div className="text-xs text-amber-600 mt-1">Pendientes</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{resueltas}</div>
          <div className="text-xs text-green-600 mt-1">Resueltas</div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Lista */}
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Vuelo</th>
                  <th className="px-4 py-3">Ruta</th>
                  <th className="px-4 py-3">Salida original</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Nueva salida</th>
                  <th className="px-4 py-3">Acción</th>
                </tr>
              </thead>
              <tbody>
                {reprogramaciones.map(r => (
                  <tr key={r.idReprogramacion}
                    className={`border-t hover:bg-slate-50 cursor-pointer ${sel?.idReprogramacion === r.idReprogramacion ? 'bg-blue-50' : ''}`}
                    onClick={() => handleSeleccionar(r)}>
                    <td className="px-4 py-3 font-medium text-blue-800">{r.idProgramacion.codigoVuelo}</td>
                    <td className="px-4 py-3">
                      {r.idProgramacion.idRuta.idAeropuertoOrigen.codigo} → {r.idProgramacion.idRuta.idAeropuertoDestino.codigo}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {r.idProgramacion.fechaSalida} {r.idProgramacion.horaSalida}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${motivoColor(r.motivo)}`}>
                        {MOTIVO_LABEL[r.motivo] || r.motivo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${estadoColor(r.estado)}`}>
                        {r.estado.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {r.nuevaFechaSalida ? `${r.nuevaFechaSalida} ${r.nuevaHoraSalida || ''}` : <span className="text-amber-500">Sin asignar</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.estado === 'pendiente' && (
                        <button onClick={e => { e.stopPropagation(); handleSeleccionar(r) }}
                          className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1 rounded text-xs font-semibold transition">
                          Gestionar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {reprogramaciones.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">No hay reprogramaciones registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel gestión */}
        {sel && (
          <div className="w-80 shrink-0">
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-base font-semibold text-slate-800">Gestionar</h3>
                <button onClick={() => setSel(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
              </div>

              {/* Info del vuelo */}
              <div className="bg-slate-50 rounded-lg p-3 mb-4 text-xs space-y-1">
                <div className="font-semibold text-blue-800">{sel.idProgramacion.codigoVuelo}</div>
                <div className="text-slate-600">{sel.idProgramacion.idRuta.idAeropuertoOrigen.ciudad} → {sel.idProgramacion.idRuta.idAeropuertoDestino.ciudad}</div>
                <div className="text-slate-500">Salida original: {sel.idProgramacion.fechaSalida} {sel.idProgramacion.horaSalida}</div>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${motivoColor(sel.motivo)}`}>
                  {MOTIVO_LABEL[sel.motivo]}
                </span>
                {sel.descripcion && <div className="text-slate-500 italic mt-1">{sel.descripcion}</div>}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Resolución</label>
                  <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="pendiente">Pendiente</option>
                    <option value="reprogramado">Reprogramar vuelo</option>
                    <option value="cancelado_definitivo">Cancelar definitivamente</option>
                  </select>
                </div>

                {form.estado === 'reprogramado' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nueva fecha salida *</label>
                      <input type="date" value={form.nuevaFechaSalida} onChange={e => setForm({ ...form, nuevaFechaSalida: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nueva hora salida *</label>
                      <input type="time" value={form.nuevaHoraSalida} onChange={e => setForm({ ...form, nuevaHoraSalida: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notas adicionales</label>
                  <textarea rows={2} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>

                <button onClick={handleActualizar}
                  className="w-full bg-blue-800 hover:bg-blue-900 text-white py-2 rounded-lg text-sm font-semibold transition">
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReprogramacionPage