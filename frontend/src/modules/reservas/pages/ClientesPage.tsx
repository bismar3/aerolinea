import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { GET_CLIENTES, BUSCAR_CLIENTE } from '../graphql/queries'
import { CREAR_CLIENTE_MUTATION, ACTUALIZAR_CLIENTE_MUTATION } from '../graphql/mutations'
import { useLazyQuery } from '@apollo/client/react'

interface Cliente {
  idCliente: string
  nombreCompleto: string
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  tipoDocumento: string
  nroDocumento: string
  correo: string
  telefono: string
  nacionalidad: string
  fechaNacimiento: string
}

interface GetClientesRes    { clientes: Cliente[] }
interface BuscarClienteRes  { buscarCliente: Cliente | null }
interface CrearClienteRes   { crearCliente:    { ok: boolean; mensaje: string; cliente: Cliente } }
interface ActualizarClienteRes { actualizarCliente: { ok: boolean; mensaje: string; cliente: Cliente } }

const DOCS = [
  { value: 'ci',        label: 'Cédula de Identidad' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'otro',      label: 'Otro' },
]

const ClientesPage = () => {
  const [modo, setModo]         = useState<'lista' | 'nuevo' | 'editar'>('lista')
  const [sel, setSel]           = useState<Cliente | null>(null)
  const [mensaje, setMensaje]   = useState('')
  const [error, setError]       = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [busqDoc, setBusqDoc]   = useState('')

  const [form, setForm] = useState({
    nombre: '', apellidoPaterno: '', apellidoMaterno: '',
    tipoDocumento: 'ci', nroDocumento: '',
    correo: '', telefono: '', nacionalidad: 'boliviana', fechaNacimiento: ''
  })
  const [formEditar, setFormEditar] = useState({
    nombre: '', apellidoPaterno: '', apellidoMaterno: '',
    correo: '', telefono: '', nacionalidad: ''
  })

  const { data, refetch }          = useQuery<GetClientesRes>(GET_CLIENTES, { fetchPolicy: 'network-only' })
  const [buscarCliente, { data: dataBusq, loading: buscando }] = useLazyQuery<BuscarClienteRes>(BUSCAR_CLIENTE)
  const [crearCliente]             = useMutation<CrearClienteRes>(CREAR_CLIENTE_MUTATION)
  const [actualizarCliente]        = useMutation<ActualizarClienteRes>(ACTUALIZAR_CLIENTE_MUTATION)

  const limpiar = () => { setMensaje(''); setError('') }
  const mostrar = (ok: boolean, msg: string) => {
    if (ok) { setMensaje('✅ ' + msg); setError('') }
    else    { setError('❌ ' + msg);   setMensaje('') }
  }

  const clientesFiltrados = (data?.clientes || []).filter(c =>
    c.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.nroDocumento.includes(busqueda)
  )

  const handleCrear = async () => {
    limpiar()
    if (!form.nombre || !form.apellidoPaterno || !form.nroDocumento) {
      return mostrar(false, 'Nombre, apellido y documento son requeridos')
    }
    try {
      const { data: res } = await crearCliente({
        variables: {
          ...form,
          fechaNacimiento: form.fechaNacimiento || null,
          correo:   form.correo   || null,
          telefono: form.telefono || null,
        }
      })
      if (res?.crearCliente.ok) {
        mostrar(true, res.crearCliente.mensaje)
        setForm({ nombre: '', apellidoPaterno: '', apellidoMaterno: '', tipoDocumento: 'ci', nroDocumento: '', correo: '', telefono: '', nacionalidad: 'boliviana', fechaNacimiento: '' })
        setModo('lista')
        refetch()
      } else {
        mostrar(false, res?.crearCliente.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleEditar = (c: Cliente) => {
    setSel(c)
    setFormEditar({
      nombre: c.nombre, apellidoPaterno: c.apellidoPaterno,
      apellidoMaterno: c.apellidoMaterno, correo: c.correo || '',
      telefono: c.telefono || '', nacionalidad: c.nacionalidad || ''
    })
    setModo('editar'); limpiar()
  }

  const handleActualizar = async () => {
    if (!sel) return
    limpiar()
    try {
      const { data: res } = await actualizarCliente({
        variables: { idCliente: parseInt(sel.idCliente), ...formEditar }
      })
      if (res?.actualizarCliente.ok) {
        mostrar(true, res.actualizarCliente.mensaje)
        setModo('lista'); refetch()
      } else {
        mostrar(false, res?.actualizarCliente.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleBuscarDoc = () => {
    if (busqDoc.trim()) buscarCliente({ variables: { nroDocumento: busqDoc.trim() } })
  }

  const docLabel = (tipo: string) => DOCS.find(d => d.value === tipo)?.label || tipo

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
          <p className="text-slate-500 text-sm mt-1">Registro y gestión de clientes</p>
        </div>
        {modo === 'lista' && (
          <button onClick={() => { setModo('nuevo'); limpiar() }}
            className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
            + Nuevo Cliente
          </button>
        )}
        {(modo === 'nuevo' || modo === 'editar') && (
          <button onClick={() => { setModo('lista'); setSel(null); limpiar() }}
            className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-semibold transition">
            ← Volver a lista
          </button>
        )}
      </div>

      {mensaje && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{mensaje}</div>}
      {error   && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* ── NUEVO ─────────────────────────────────────────────────────────── */}
      {modo === 'nuevo' && (
        <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Nuevo Cliente</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input type="text" value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Apellido Paterno *</label>
              <input type="text" value={form.apellidoPaterno}
                onChange={e => setForm({ ...form, apellidoPaterno: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Apellido Materno</label>
              <input type="text" value={form.apellidoMaterno}
                onChange={e => setForm({ ...form, apellidoMaterno: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo Documento *</label>
              <select value={form.tipoDocumento}
                onChange={e => setForm({ ...form, tipoDocumento: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {DOCS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nro. Documento *</label>
              <input type="text" value={form.nroDocumento}
                onChange={e => setForm({ ...form, nroDocumento: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Nacimiento</label>
              <input type="date" value={form.fechaNacimiento}
                onChange={e => setForm({ ...form, fechaNacimiento: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo</label>
              <input type="email" value={form.correo}
                onChange={e => setForm({ ...form, correo: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input type="text" value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nacionalidad</label>
              <input type="text" value={form.nacionalidad}
                onChange={e => setForm({ ...form, nacionalidad: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
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

      {/* ── EDITAR ────────────────────────────────────────────────────────── */}
      {modo === 'editar' && sel && (
        <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">
            Editando: <span className="text-blue-800">{sel.nombreCompleto}</span>
          </h2>
          <p className="text-slate-400 text-xs mb-4">{docLabel(sel.tipoDocumento)}: {sel.nroDocumento}</p>
          <div className="grid grid-cols-2 gap-4">
            {([
              { label: 'Nombre',           key: 'nombre' },
              { label: 'Apellido Paterno', key: 'apellidoPaterno' },
              { label: 'Apellido Materno', key: 'apellidoMaterno' },
              { label: 'Correo',           key: 'correo' },
              { label: 'Teléfono',         key: 'telefono' },
              { label: 'Nacionalidad',     key: 'nacionalidad' },
            ] as const).map(({ label, key }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <input type="text" value={formEditar[key]}
                  onChange={e => setFormEditar({ ...formEditar, [key]: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
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

      {/* ── LISTA ─────────────────────────────────────────────────────────── */}
      {modo === 'lista' && (
        <div className="space-y-4">
          {/* Buscar por documento */}
          <div className="bg-white rounded-xl shadow p-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Buscar por nombre o documento</label>
              <input type="text" value={busqueda} placeholder="Nombre o número de documento..."
                onChange={e => setBusqueda(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Búsqueda exacta por documento</label>
              <div className="flex gap-2">
                <input type="text" value={busqDoc} placeholder="Nro. documento exacto"
                  onChange={e => setBusqDoc(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={handleBuscarDoc}
                  className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
                  Buscar
                </button>
              </div>
              {dataBusq?.buscarCliente && (
                <p className="text-green-600 text-xs mt-1">
                  ✅ Encontrado: {dataBusq.buscarCliente.nombreCompleto}
                </p>
              )}
              {dataBusq && !dataBusq.buscarCliente && !buscando && (
                <p className="text-red-500 text-xs mt-1">No encontrado</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Tipo Doc.</th>
                  <th className="px-4 py-3">Nro. Documento</th>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Nacionalidad</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map(c => (
                  <tr key={c.idCliente} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{c.nombreCompleto}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">{docLabel(c.tipoDocumento)}</span>
                    </td>
                    <td className="px-4 py-3">{c.nroDocumento}</td>
                    <td className="px-4 py-3 text-slate-500">{c.correo || '—'}</td>
                    <td className="px-4 py-3">{c.telefono || '—'}</td>
                    <td className="px-4 py-3">{c.nacionalidad || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleEditar(c)}
                        className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1 rounded text-xs font-semibold transition">
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {clientesFiltrados.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400 text-sm">No hay clientes registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientesPage