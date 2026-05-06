import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import {
  GET_TRIPULANTES, GET_GRUPOS_TRIPULACION, GET_ASIGNACIONES_GRUPO, GET_PROGRAMACIONES
} from '../graphql/queries'
import {
  CREAR_TRIPULANTE_MUTATION, ACTUALIZAR_TRIPULANTE_MUTATION, ELIMINAR_TRIPULANTE_MUTATION,
  CREAR_GRUPO_MUTATION, AGREGAR_TRIPULANTE_GRUPO_MUTATION, QUITAR_TRIPULANTE_GRUPO_MUTATION, ELIMINAR_GRUPO_MUTATION,
  ASIGNAR_GRUPO_VUELO_MUTATION, LIBERAR_GRUPO_VUELO_MUTATION,
} from '../graphql/mutations'

// ── Interfaces ────────────────────────────────────────────────────────────────
interface Tripulante {
  idTripulante: string; nombre: string; apellido: string; ci: string; cargo: string; estado: string
}
interface Grupo {
  idGrupo: string; nombre: string; estado: string; totalTripulantes: number
  tripulantes: Tripulante[]
}
interface Programacion {
  idProgramacion: string; codigoVuelo: string; estado: string
  idRuta: { idAeropuertoOrigen: { codigo: string; ciudad: string }; idAeropuertoDestino: { codigo: string; ciudad: string } }
}
interface Asignacion {
  idAsignacion: string; estado: string; fechaAsignacion: string
  idGrupo: { idGrupo: string; nombre: string; estado: string }
  idProgramacion: Programacion
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const CARGO_LABEL: Record<string, string> = {
  piloto: 'Piloto', copiloto: 'Copiloto', auxiliar: 'Auxiliar'
}
const cargoColor = (c: string) => ({
  piloto:   'bg-blue-100 text-blue-700',
  copiloto: 'bg-purple-100 text-purple-700',
  auxiliar: 'bg-teal-100 text-teal-700',
}[c] || 'bg-slate-100 text-slate-600')

const estadoTripColor = (e: string) => ({
  libre:             'bg-green-100 text-green-700',
  asignado:          'bg-amber-100 text-amber-700',
  en_vuelo:          'bg-blue-100 text-blue-700',
  fuera_de_servicio: 'bg-red-100 text-red-600',
}[e] || 'bg-slate-100 text-slate-600')

const estadoGrupoColor = (e: string) => ({
  disponible: 'bg-green-100 text-green-700',
  asignado:   'bg-amber-100 text-amber-700',
  en_vuelo:   'bg-blue-100 text-blue-700',
}[e] || 'bg-slate-100 text-slate-600')

type Tab = 'tripulantes' | 'grupos' | 'asignaciones'

// ── Componente principal ──────────────────────────────────────────────────────
const TripulacionPage = () => {
  const [tab, setTab]         = useState<Tab>('tripulantes')
  const [mensaje, setMensaje] = useState('')
  const [error, setError]     = useState('')

  const limpiar = () => { setMensaje(''); setError('') }
  const mostrar = (ok: boolean, msg: string) => {
    if (ok) { setMensaje('✅ ' + msg); setError('') }
    else    { setError('❌ ' + msg);   setMensaje('') }
    setTimeout(() => { setMensaje(''); setError('') }, 4000)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Tripulación</h1>
        <p className="text-slate-500 text-sm mt-1">Gestión de tripulantes, grupos y asignaciones</p>
      </div>

      {mensaje && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{mensaje}</div>}
      {error   && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        {([
          { key: 'tripulantes',  label: 'Tripulantes' },
          { key: 'grupos',       label: 'Grupos' },
          { key: 'asignaciones', label: 'Asignaciones a Vuelos' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); limpiar() }}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-all ${
              tab === t.key
                ? 'border-blue-800 text-blue-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tripulantes' && <TabTripulantes mostrar={mostrar} />}
      {tab === 'grupos'      && <TabGrupos      mostrar={mostrar} />}
      {tab === 'asignaciones' && <TabAsignaciones mostrar={mostrar} />}
    </div>
  )
}

// ── TAB TRIPULANTES ───────────────────────────────────────────────────────────
const TabTripulantes = ({ mostrar }: { mostrar: (ok: boolean, msg: string) => void }) => {
  const [modo, setModo]   = useState<'lista' | 'nuevo' | 'editar'>('lista')
  const [sel, setSel]     = useState<Tripulante | null>(null)
  const [form, setForm]   = useState({ nombre: '', apellido: '', ci: '', cargo: 'piloto' })
  const [formE, setFormE] = useState({ nombre: '', apellido: '', ci: '', cargo: '', estado: '' })

  const { data, refetch } = useQuery<{ tripulantes: Tripulante[] }>(GET_TRIPULANTES, { fetchPolicy: 'network-only' })
  const [crearT]      = useMutation<{ crearTripulante:    { ok: boolean; mensaje: string } }>(CREAR_TRIPULANTE_MUTATION)
  const [actualizarT] = useMutation<{ actualizarTripulante: { ok: boolean; mensaje: string } }>(ACTUALIZAR_TRIPULANTE_MUTATION)
  const [eliminarT]   = useMutation<{ eliminarTripulante:  { ok: boolean; mensaje: string } }>(ELIMINAR_TRIPULANTE_MUTATION)

  const handleCrear = async () => {
    if (!form.nombre || !form.apellido || !form.ci) return mostrar(false, 'Todos los campos son obligatorios')
    try {
      const { data: res } = await crearT({ variables: form })
      if (res?.crearTripulante.ok) { mostrar(true, res.crearTripulante.mensaje); setForm({ nombre: '', apellido: '', ci: '', cargo: 'piloto' }); setModo('lista'); refetch() }
      else mostrar(false, res?.crearTripulante.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleActualizar = async () => {
    if (!sel) return
    try {
      const { data: res } = await actualizarT({ variables: { idTripulante: parseInt(sel.idTripulante), ...formE } })
      if (res?.actualizarTripulante.ok) { mostrar(true, res.actualizarTripulante.mensaje); setModo('lista'); refetch() }
      else mostrar(false, res?.actualizarTripulante.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este tripulante?')) return
    try {
      const { data: res } = await eliminarT({ variables: { idTripulante: parseInt(id) } })
      if (res?.eliminarTripulante.ok) { mostrar(true, res.eliminarTripulante.mensaje); refetch() }
      else mostrar(false, res?.eliminarTripulante.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  const tripulantes = data?.tripulantes || []

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">{tripulantes.length} tripulante{tripulantes.length !== 1 ? 's' : ''} registrado{tripulantes.length !== 1 ? 's' : ''}</p>
        {modo === 'lista' && (
          <button onClick={() => setModo('nuevo')}
            className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
            + Nuevo Tripulante
          </button>
        )}
        {modo !== 'lista' && (
          <button onClick={() => { setModo('lista'); setSel(null) }}
            className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-semibold transition">
            ← Volver
          </button>
        )}
      </div>

      {/* Formulario Nuevo */}
      {modo === 'nuevo' && (
        <div className="bg-white rounded-xl shadow p-6 mb-6 max-w-2xl">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Nuevo Tripulante</h3>
          <div className="grid grid-cols-2 gap-4">
            {([{ label: 'Nombre *', key: 'nombre' }, { label: 'Apellido *', key: 'apellido' }, { label: 'CI *', key: 'ci' }] as const).map(({ label, key }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <input type="text" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cargo *</label>
              <select value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="piloto">Piloto</option>
                <option value="copiloto">Copiloto</option>
                <option value="auxiliar">Auxiliar de Vuelo</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCrear} className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition">Guardar</button>
            <button onClick={() => setModo('lista')} className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-6 py-2 rounded-lg text-sm transition">Cancelar</button>
          </div>
        </div>
      )}

      {/* Formulario Editar */}
      {modo === 'editar' && sel && (
        <div className="bg-white rounded-xl shadow p-6 mb-6 max-w-2xl">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Editando: <span className="text-blue-800">{sel.nombre} {sel.apellido}</span></h3>
          <div className="grid grid-cols-2 gap-4">
            {([{ label: 'Nombre', key: 'nombre' }, { label: 'Apellido', key: 'apellido' }, { label: 'CI', key: 'ci' }] as const).map(({ label, key }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <input type="text" value={formE[key]} onChange={e => setFormE({ ...formE, [key]: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
              <select value={formE.cargo} onChange={e => setFormE({ ...formE, cargo: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="piloto">Piloto</option>
                <option value="copiloto">Copiloto</option>
                <option value="auxiliar">Auxiliar de Vuelo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
              <select value={formE.estado} onChange={e => setFormE({ ...formE, estado: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="libre">Libre</option>
                <option value="asignado">Asignado</option>
                <option value="en_vuelo">En Vuelo</option>
                <option value="fuera_de_servicio">Fuera de Servicio</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleActualizar} className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition">Guardar Cambios</button>
            <button onClick={() => setModo('lista')} className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-6 py-2 rounded-lg text-sm transition">Cancelar</button>
          </div>
        </div>
      )}

      {/* Tabla */}
      {modo === 'lista' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">CI</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tripulantes.map(t => (
                <tr key={t.idTripulante} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{t.apellido}, {t.nombre}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{t.ci}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${cargoColor(t.cargo)}`}>
                      {CARGO_LABEL[t.cargo] || t.cargo}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${estadoTripColor(t.estado)}`}>
                      {t.estado.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setSel(t); setFormE({ nombre: t.nombre, apellido: t.apellido, ci: t.ci, cargo: t.cargo, estado: t.estado }); setModo('editar') }}
                        className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1 rounded text-xs font-semibold transition">
                        Editar
                      </button>
                      <button onClick={() => handleEliminar(t.idTripulante)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold transition">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tripulantes.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">No hay tripulantes registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── TAB GRUPOS ────────────────────────────────────────────────────────────────
const TabGrupos = ({ mostrar }: { mostrar: (ok: boolean, msg: string) => void }) => {
  const [grupoSel, setGrupoSel]   = useState<Grupo | null>(null)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [tripulanteAgregar, setTripulanteAgregar] = useState('')

  const { data: dataGrupos, refetch: refetchGrupos } = useQuery<{ gruposTripulacion: Grupo[] }>(GET_GRUPOS_TRIPULACION, { fetchPolicy: 'network-only' })
  const { data: dataTripulantes } = useQuery<{ tripulantes: Tripulante[] }>(GET_TRIPULANTES, { fetchPolicy: 'network-only' })

  const [crearGrupo]   = useMutation<{ crearGrupo:  { ok: boolean; mensaje: string } }>(CREAR_GRUPO_MUTATION)
  const [agregarTrip]  = useMutation<{ agregarTripulanteGrupo: { ok: boolean; mensaje: string } }>(AGREGAR_TRIPULANTE_GRUPO_MUTATION)
  const [quitarTrip]   = useMutation<{ quitarTripulanteGrupo:  { ok: boolean; mensaje: string } }>(QUITAR_TRIPULANTE_GRUPO_MUTATION)
  const [eliminarGrupo] = useMutation<{ eliminarGrupo: { ok: boolean; mensaje: string } }>(ELIMINAR_GRUPO_MUTATION)

  const grupos = dataGrupos?.gruposTripulacion || []

  const handleCrearGrupo = async () => {
    if (!nuevoNombre.trim()) return mostrar(false, 'El nombre del grupo es obligatorio')
    try {
      const { data: res } = await crearGrupo({ variables: { nombre: nuevoNombre.trim() } })
      if (res?.crearGrupo.ok) { mostrar(true, res.crearGrupo.mensaje); setNuevoNombre(''); setMostrarForm(false); refetchGrupos() }
      else mostrar(false, res?.crearGrupo.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleAgregarTripulante = async () => {
    if (!grupoSel || !tripulanteAgregar) return mostrar(false, 'Selecciona un tripulante')
    try {
      const { data: res } = await agregarTrip({ variables: { idGrupo: parseInt(grupoSel.idGrupo), idTripulante: parseInt(tripulanteAgregar) } })
      if (res?.agregarTripulanteGrupo.ok) {
        mostrar(true, res.agregarTripulanteGrupo.mensaje)
        setTripulanteAgregar('')
        refetchGrupos()
        // Actualizar grupo seleccionado
        const updated = dataGrupos?.gruposTripulacion.find(g => g.idGrupo === grupoSel.idGrupo)
        if (updated) setGrupoSel(updated)
      } else mostrar(false, res?.agregarTripulanteGrupo.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleQuitarTripulante = async (idTripulante: string) => {
    if (!grupoSel) return
    try {
      const { data: res } = await quitarTrip({ variables: { idGrupo: parseInt(grupoSel.idGrupo), idTripulante: parseInt(idTripulante) } })
      if (res?.quitarTripulanteGrupo.ok) { mostrar(true, res.quitarTripulanteGrupo.mensaje); refetchGrupos() }
      else mostrar(false, res?.quitarTripulanteGrupo.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleEliminarGrupo = async (idGrupo: string) => {
    if (!confirm('¿Eliminar este grupo?')) return
    try {
      const { data: res } = await eliminarGrupo({ variables: { idGrupo: parseInt(idGrupo) } })
      if (res?.eliminarGrupo.ok) { mostrar(true, res.eliminarGrupo.mensaje); if (grupoSel?.idGrupo === idGrupo) setGrupoSel(null); refetchGrupos() }
      else mostrar(false, res?.eliminarGrupo.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  // Tripulantes disponibles para agregar al grupo seleccionado
  const tripulantesDisponibles = (dataTripulantes?.tripulantes || []).filter(
    t => !grupoSel?.tripulantes.some(gt => gt.idTripulante === t.idTripulante)
  )

  // Sync grupoSel con datos frescos
  const grupoSelFresh = grupos.find(g => g.idGrupo === grupoSel?.idGrupo) || grupoSel

  return (
    <div className="flex gap-6">
      {/* Lista de grupos */}
      <div className="w-72 shrink-0">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold text-slate-700">Grupos</span>
          <button onClick={() => setMostrarForm(!mostrarForm)}
            className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition">
            + Nuevo
          </button>
        </div>

        {mostrarForm && (
          <div className="bg-white rounded-xl shadow p-4 mb-3">
            <label className="block text-xs font-medium text-slate-700 mb-1">Nombre del grupo</label>
            <input type="text" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
              placeholder="ej: Grupo Alpha"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" />
            <div className="flex gap-2">
              <button onClick={handleCrearGrupo} className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1.5 rounded text-xs font-semibold transition">Guardar</button>
              <button onClick={() => { setMostrarForm(false); setNuevoNombre('') }} className="border border-slate-300 text-slate-600 px-3 py-1.5 rounded text-xs transition">Cancelar</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {grupos.map(g => (
            <div key={g.idGrupo}
              onClick={() => setGrupoSel(g)}
              className={`bg-white rounded-xl shadow p-4 cursor-pointer transition border-2 ${
                grupoSel?.idGrupo === g.idGrupo ? 'border-blue-800' : 'border-transparent hover:border-slate-200'
              }`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{g.nombre}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{g.totalTripulantes} tripulante{g.totalTripulantes !== 1 ? 's' : ''}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${estadoGrupoColor(g.estado)}`}>
                  {g.estado}
                </span>
              </div>
              <button onClick={e => { e.stopPropagation(); handleEliminarGrupo(g.idGrupo) }}
                className="mt-2 text-xs text-red-500 hover:text-red-700 transition">
                Eliminar grupo
              </button>
            </div>
          ))}
          {grupos.length === 0 && (
            <div className="bg-white rounded-xl shadow p-6 text-center text-slate-400 text-sm">
              No hay grupos creados
            </div>
          )}
        </div>
      </div>

      {/* Detalle del grupo seleccionado */}
      <div className="flex-1">
        {grupoSelFresh ? (
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{grupoSelFresh.nombre}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${estadoGrupoColor(grupoSelFresh.estado)}`}>
                  {grupoSelFresh.estado}
                </span>
              </div>
              <span className="text-sm text-slate-500">{grupoSelFresh.totalTripulantes} tripulantes</span>
            </div>

            {/* Agregar tripulante */}
            <div className="flex gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
              <select value={tripulanteAgregar} onChange={e => setTripulanteAgregar(e.target.value)}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Agregar tripulante --</option>
                {tripulantesDisponibles.map(t => (
                  <option key={t.idTripulante} value={t.idTripulante}>
                    {t.apellido}, {t.nombre} — {CARGO_LABEL[t.cargo]}
                  </option>
                ))}
              </select>
              <button onClick={handleAgregarTripulante}
                className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
                Agregar
              </button>
            </div>

            {/* Lista de tripulantes del grupo */}
            {grupoSelFresh.tripulantes.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2">Tripulante</th>
                    <th className="px-3 py-2">Cargo</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {grupoSelFresh.tripulantes.map(t => (
                    <tr key={t.idTripulante} className="border-t hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{t.apellido}, {t.nombre}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cargoColor(t.cargo)}`}>
                          {CARGO_LABEL[t.cargo]}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${estadoTripColor(t.estado)}`}>
                          {t.estado.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => handleQuitarTripulante(t.idTripulante)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium transition">
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-slate-400 text-sm text-center py-6">Este grupo no tiene tripulantes aún</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow p-12 text-center text-slate-400">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-sm">Selecciona un grupo para ver y gestionar sus tripulantes</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── TAB ASIGNACIONES ──────────────────────────────────────────────────────────
const TabAsignaciones = ({ mostrar }: { mostrar: (ok: boolean, msg: string) => void }) => {
  const [formAsig, setFormAsig] = useState({ idGrupo: '', idProgramacion: '' })

  const { data: dataAsig, refetch }   = useQuery<{ asignacionesGrupo: Asignacion[] }>(GET_ASIGNACIONES_GRUPO, { fetchPolicy: 'network-only' })
  const { data: dataGrupos }          = useQuery<{ gruposTripulacion: Grupo[] }>(GET_GRUPOS_TRIPULACION, { fetchPolicy: 'network-only' })
  const { data: dataProg }            = useQuery<{ programaciones: Programacion[] }>(GET_PROGRAMACIONES, { fetchPolicy: 'network-only' })

  const [asignarGrupo]  = useMutation<{ asignarGrupoVuelo:  { ok: boolean; mensaje: string } }>(ASIGNAR_GRUPO_VUELO_MUTATION)
  const [liberarGrupo]  = useMutation<{ liberarGrupoVuelo:  { ok: boolean; mensaje: string } }>(LIBERAR_GRUPO_VUELO_MUTATION)

  const asignaciones = dataAsig?.asignacionesGrupo || []

  // Solo grupos disponibles
  const gruposDisponibles = (dataGrupos?.gruposTripulacion || []).filter(g => g.estado === 'disponible')

  // Solo vuelos sin grupo asignado y en estado programado
  const vuelosSinGrupo = (dataProg?.programaciones || []).filter(p =>
    p.estado === 'programado' &&
    !asignaciones.some(a => a.idProgramacion.idProgramacion === p.idProgramacion && a.estado === 'activo')
  )

  const handleAsignar = async () => {
    if (!formAsig.idGrupo || !formAsig.idProgramacion) return mostrar(false, 'Selecciona grupo y vuelo')
    try {
      const { data: res } = await asignarGrupo({
        variables: { idGrupo: parseInt(formAsig.idGrupo), idProgramacion: parseInt(formAsig.idProgramacion) }
      })
      if (res?.asignarGrupoVuelo.ok) { mostrar(true, res.asignarGrupoVuelo.mensaje); setFormAsig({ idGrupo: '', idProgramacion: '' }); refetch() }
      else mostrar(false, res?.asignarGrupoVuelo.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleLiberar = async (idAsignacion: string) => {
    if (!confirm('¿Liberar este grupo del vuelo?')) return
    try {
      const { data: res } = await liberarGrupo({ variables: { idAsignacion: parseInt(idAsignacion) } })
      if (res?.liberarGrupoVuelo.ok) { mostrar(true, res.liberarGrupoVuelo.mensaje); refetch() }
      else mostrar(false, res?.liberarGrupoVuelo.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  const estadoAsigColor = (e: string) => ({
    activo:     'bg-green-100 text-green-700',
    completado: 'bg-slate-100 text-slate-600',
    cancelado:  'bg-red-100 text-red-600',
  }[e] || 'bg-slate-100 text-slate-600')

  return (
    <div>
      {/* Formulario asignación */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Asignar Grupo a Vuelo</h3>
        <div className="grid grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Grupo disponible *</label>
            <select value={formAsig.idGrupo} onChange={e => setFormAsig({ ...formAsig, idGrupo: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Seleccionar grupo --</option>
              {gruposDisponibles.map(g => (
                <option key={g.idGrupo} value={g.idGrupo}>
                  {g.nombre} ({g.totalTripulantes} tripulantes)
                </option>
              ))}
            </select>
            {gruposDisponibles.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No hay grupos disponibles</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vuelo programado *</label>
            <select value={formAsig.idProgramacion} onChange={e => setFormAsig({ ...formAsig, idProgramacion: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Seleccionar vuelo --</option>
              {vuelosSinGrupo.map(p => (
                <option key={p.idProgramacion} value={p.idProgramacion}>
                  {p.codigoVuelo} — {p.idRuta.idAeropuertoOrigen.codigo} → {p.idRuta.idAeropuertoDestino.codigo}
                </option>
              ))}
            </select>
            {vuelosSinGrupo.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No hay vuelos sin grupo asignado</p>
            )}
          </div>
        </div>
        <button onClick={handleAsignar}
          className="mt-4 bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition">
          Asignar Grupo
        </button>
      </div>

      {/* Tabla de asignaciones */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left text-xs uppercase">
            <tr>
              <th className="px-4 py-3">Grupo</th>
              <th className="px-4 py-3">Vuelo</th>
              <th className="px-4 py-3">Ruta</th>
              <th className="px-4 py-3">Fecha asignación</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {asignaciones.map(a => (
              <tr key={a.idAsignacion} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{a.idGrupo.nombre}</td>
                <td className="px-4 py-3 font-mono text-blue-800 font-semibold">{a.idProgramacion.codigoVuelo}</td>
                <td className="px-4 py-3">
                  {a.idProgramacion.idRuta.idAeropuertoOrigen.codigo} → {a.idProgramacion.idRuta.idAeropuertoDestino.codigo}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {new Date(a.fechaAsignacion).toLocaleDateString('es-BO')}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${estadoAsigColor(a.estado)}`}>
                    {a.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {a.estado === 'activo' && (
                    <button onClick={() => handleLiberar(a.idAsignacion)}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded text-xs font-semibold transition">
                      Liberar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {asignaciones.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-sm">No hay asignaciones registradas</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TripulacionPage