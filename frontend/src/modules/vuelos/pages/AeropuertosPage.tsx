import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { GET_AEROPUERTOS } from '../graphql/queries'
import {
  CREAR_AEROPUERTO_MUTATION,
  ACTUALIZAR_AEROPUERTO_MUTATION,
  ELIMINAR_AEROPUERTO_MUTATION,
} from '../graphql/mutations'

interface Aeropuerto {
  idAeropuerto: string
  nombre: string
  ciudad: string
  codigo: string
  tipo: string
  estado: string
  latitud: string | null
  longitud: string | null
}

interface NominatimResult {
  place_id: number
  display_name: string
  name: string
  lat: string
  lon: string
  address: {
    aerodrome?: string
    airport?: string
    city?: string
    town?: string
    village?: string
    municipality?: string
    state?: string
    country?: string
  }
}

interface FormState {
  nombre: string
  ciudad: string
  codigo: string
  tipo: string
  latitud: number | null
  longitud: number | null
}

interface CrearAeropuertoRes {
  crearAeropuerto: { ok: boolean; mensaje: string; aeropuerto: Aeropuerto }
}
interface ActualizarAeropuertoRes {
  actualizarAeropuerto: { ok: boolean; mensaje: string; aeropuerto: Aeropuerto }
}
interface EliminarAeropuertoRes {
  eliminarAeropuerto: { ok: boolean; mensaje: string }
}

const FORM_INICIAL: FormState = {
  nombre: '', ciudad: '', codigo: '', tipo: 'nacional', latitud: null, longitud: null
}

const BuscadorAeropuerto = ({
  label,
  valorInicial = '',
  onSelect,
}: {
  label: string
  valorInicial?: string
  onSelect: (data: { nombre: string; ciudad: string; latitud: number; longitud: number }) => void
}) => {
  const [texto, setTexto]           = useState(valorInicial)
  const [resultados, setResultados] = useState<NominatimResult[]>([])
  const [buscando, setBuscando]     = useState(false)
  const [abierto, setAbierto]       = useState(false)
  const timerRef                    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contenedorRef               = useRef<HTMLDivElement>(null)

  useEffect(() => { setTexto(valorInicial) }, [valorInicial])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node))
        setAbierto(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const buscar = async (q: string) => {
    if (q.length < 2) { setResultados([]); setAbierto(false); return }
    setBuscando(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ' aeropuerto airport')}&format=json&addressdetails=1&limit=6&accept-language=es`
      const res  = await fetch(url)
      const data: NominatimResult[] = await res.json()
      const filtrados = data.filter(r =>
        r.display_name.toLowerCase().includes('aeropuerto') ||
        r.display_name.toLowerCase().includes('airport') ||
        r.display_name.toLowerCase().includes('internacional') ||
        r.display_name.toLowerCase().includes('aerodrome')
      )
      setResultados(filtrados.length > 0 ? filtrados : data.slice(0, 5))
      setAbierto(true)
    } catch {
      setResultados([])
    } finally {
      setBuscando(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setTexto(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => buscar(val), 400)
  }

  const handleSelect = (r: NominatimResult) => {
    const addr   = r.address
    const nombre = addr.aerodrome || addr.airport || r.name || r.display_name.split(',')[0]
    const ciudad = addr.city || addr.town || addr.municipality || addr.village || addr.state || ''
    setTexto(nombre)
    setAbierto(false)
    onSelect({ nombre, ciudad, latitud: parseFloat(r.lat), longitud: parseFloat(r.lon) })
  }

  return (
    <div ref={contenedorRef} className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text" value={texto} onChange={handleChange}
          placeholder="Buscar aeropuerto..."
          className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {buscando && (
          <div className="absolute right-2 top-2.5">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {abierto && resultados.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {resultados.map(r => (
            <button key={r.place_id} type="button" onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-slate-100 last:border-0">
              <div className="font-medium text-slate-800 truncate">
                {r.address.aerodrome || r.address.airport || r.name}
              </div>
              <div className="text-xs text-slate-500 truncate">{r.display_name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const AeropuertosPage = () => {
  const [modo, setModo]       = useState<'lista' | 'nuevo' | 'editar'>('lista')
  const [sel, setSel]         = useState<Aeropuerto | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError]     = useState('')
  const [form, setForm]       = useState<FormState>(FORM_INICIAL)
  const [formEditar, setFormEditar] = useState<FormState & { estado: string }>({
    ...FORM_INICIAL, estado: 'activo'
  })

  const { data, refetch }      = useQuery<{ aeropuertos: Aeropuerto[] }>(GET_AEROPUERTOS, { fetchPolicy: 'network-only' })
  const [crearAeropuerto]      = useMutation<CrearAeropuertoRes>(CREAR_AEROPUERTO_MUTATION)
  const [actualizarAeropuerto] = useMutation<ActualizarAeropuertoRes>(ACTUALIZAR_AEROPUERTO_MUTATION)
  const [eliminarAeropuerto]   = useMutation<EliminarAeropuertoRes>(ELIMINAR_AEROPUERTO_MUTATION)

  const limpiar = () => { setMensaje(''); setError('') }
  const mostrar = (ok: boolean, msg: string) => {
    if (ok) { setMensaje('✅ ' + msg); setError('') }
    else    { setError('❌ ' + msg);   setMensaje('') }
  }

  const handleCrear = async () => {
    limpiar()
    if (!form.nombre || !form.ciudad || !form.codigo)
      return mostrar(false, 'Nombre, ciudad y código son obligatorios')
    try {
      const { data: res } = await crearAeropuerto({ variables: form })
      if (res?.crearAeropuerto.ok) {
        mostrar(true, res.crearAeropuerto.mensaje)
        setForm(FORM_INICIAL)
        setModo('lista')
        refetch()
      } else {
        mostrar(false, res?.crearAeropuerto.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleEditar = (a: Aeropuerto) => {
    setSel(a)
    setFormEditar({
      nombre: a.nombre, ciudad: a.ciudad, codigo: a.codigo,
      tipo: a.tipo, estado: a.estado,
      latitud:  a.latitud  ? parseFloat(a.latitud)  : null,
      longitud: a.longitud ? parseFloat(a.longitud) : null,
    })
    setModo('editar')
    limpiar()
  }

  const handleActualizar = async () => {
    if (!sel) return
    limpiar()
    try {
      const { data: res } = await actualizarAeropuerto({
        variables: { idAeropuerto: parseInt(sel.idAeropuerto), ...formEditar }
      })
      if (res?.actualizarAeropuerto.ok) {
        mostrar(true, res.actualizarAeropuerto.mensaje)
        setModo('lista')
        refetch()
      } else {
        mostrar(false, res?.actualizarAeropuerto.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este aeropuerto?')) return
    limpiar()
    try {
      const { data: res } = await eliminarAeropuerto({ variables: { idAeropuerto: parseInt(id) } })
      if (res?.eliminarAeropuerto.ok) {
        mostrar(true, res.eliminarAeropuerto.mensaje)
        refetch()
      } else {
        mostrar(false, res?.eliminarAeropuerto.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Aeropuertos</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de aeropuertos BOA</p>
        </div>
        {modo === 'lista' && (
          <button onClick={() => { setModo('nuevo'); limpiar() }}
            className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
            + Nuevo Aeropuerto
          </button>
        )}
        {modo !== 'lista' && (
          <button onClick={() => { setModo('lista'); setSel(null); limpiar() }}
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
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Nuevo Aeropuerto</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <BuscadorAeropuerto
                label="Buscar aeropuerto *"
                onSelect={({ nombre, ciudad, latitud, longitud }) =>
                  setForm(f => ({ ...f, nombre, ciudad, latitud, longitud }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input type="text" value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad *</label>
              <input type="text" value={form.ciudad}
                onChange={e => setForm({ ...form, ciudad: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código IATA *</label>
              <input type="text" value={form.codigo} maxLength={4}
                onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                placeholder="ej: LPB"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="nacional">Nacional</option>
                <option value="internacional">Internacional</option>
              </select>
            </div>
            {form.latitud && (
              <div className="col-span-2 bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500">
                📍 Coordenadas: {form.latitud.toFixed(6)}, {form.longitud?.toFixed(6)}
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

      {/* EDITAR */}
      {modo === 'editar' && sel && (
        <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Editando: <span className="text-blue-800">{sel.nombre}</span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <BuscadorAeropuerto
                label="Actualizar ubicación"
                valorInicial={sel.nombre}
                onSelect={({ nombre, ciudad, latitud, longitud }) =>
                  setFormEditar(f => ({ ...f, nombre, ciudad, latitud, longitud }))
                }
              />
            </div>
            {([
              { label: 'Nombre', key: 'nombre' },
              { label: 'Ciudad', key: 'ciudad' },
              { label: 'Código IATA', key: 'codigo' },
            ] as const).map(({ label, key }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <input type="text" value={formEditar[key]}
                  onChange={e => setFormEditar({ ...formEditar, [key]: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <select value={formEditar.tipo} onChange={e => setFormEditar({ ...formEditar, tipo: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="nacional">Nacional</option>
                <option value="internacional">Internacional</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
              <select value={formEditar.estado} onChange={e => setFormEditar({ ...formEditar, estado: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
            {formEditar.latitud && (
              <div className="col-span-2 bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500">
                📍 Coordenadas: {formEditar.latitud.toFixed(6)}, {formEditar.longitud?.toFixed(6)}
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleActualizar}
              className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition">
              Guardar Cambios
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
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Ciudad</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Coordenadas</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(data?.aeropuertos || []).map(a => (
                <tr key={a.idAeropuerto} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{a.nombre}</td>
                  <td className="px-4 py-3 font-mono text-blue-800 font-semibold">{a.codigo}</td>
                  <td className="px-4 py-3">{a.ciudad}</td>
                  <td className="px-4 py-3 capitalize">{a.tipo}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {a.latitud
                      ? `${parseFloat(a.latitud).toFixed(4)}, ${parseFloat(a.longitud!).toFixed(4)}`
                      : <span className="text-amber-500">Sin coordenadas</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      a.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}>{a.estado}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEditar(a)}
                        className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1 rounded text-xs font-semibold transition">
                        Editar
                      </button>
                      <button onClick={() => handleEliminar(a.idAeropuerto)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold transition">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(data?.aeropuertos || []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400 text-sm">
                    No hay aeropuertos registrados
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

export default AeropuertosPage