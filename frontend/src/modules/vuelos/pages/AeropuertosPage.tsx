import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_AEROPUERTOS } from '../graphql/queries';
import { CREAR_AEROPUERTO_MUTATION, ELIMINAR_AEROPUERTO_MUTATION } from '../graphql/mutations';

interface Aeropuerto {
  id: string;
  nombre: string;
  codigo: string;
  ciudad: string;
  tipo: string;
}

interface GetAeropuertosResponse {
  allAeropuertos: Aeropuerto[];
}

interface CrearAeropuertoResponse {
  crearAeropuerto: { ok: boolean; mensaje: string; aeropuerto: Aeropuerto };
}

interface EliminarAeropuertoResponse {
  eliminarAeropuerto: { ok: boolean; mensaje: string };
}

const AeropuertosPage = () => {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [form, setForm] = useState({
    nombre: '', codigo: '', ciudad: '', tipo: ''
  });

  const { data, loading, refetch } = useQuery<GetAeropuertosResponse>(GET_AEROPUERTOS);
  const [crearAeropuerto] = useMutation<CrearAeropuertoResponse>(CREAR_AEROPUERTO_MUTATION, {
    refetchQueries: [{ query: GET_AEROPUERTOS }]
  });
  const [eliminarAeropuerto] = useMutation<EliminarAeropuertoResponse>(ELIMINAR_AEROPUERTO_MUTATION, {
    refetchQueries: [{ query: GET_AEROPUERTOS }]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await crearAeropuerto({
        variables: {
          nombre: form.nombre,
          codigo: form.codigo,
          ciudad: form.ciudad,
          tipo: form.tipo
        }
      });
      if (data?.crearAeropuerto.ok) {
        setMensaje('✅ Aeropuerto creado correctamente');
        setForm({ nombre: '', codigo: '', ciudad: '', tipo: '' });
        setMostrarForm(false);
        refetch();
      } else {
        setError(data?.crearAeropuerto.mensaje || 'Error');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este aeropuerto?')) return;
    await eliminarAeropuerto({ variables: { id: parseInt(id) } });
    refetch();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🏢 Aeropuertos</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de aeropuertos</p>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          + Nuevo Aeropuerto
        </button>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {mensaje}
        </div>
      )}

      {/* Formulario */}
      {mostrarForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Nuevo Aeropuerto</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
              <input
                type="text"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad</label>
              <input
                type="text"
                value={form.ciudad}
                onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar</option>
                <option value="nacional">Nacional</option>
                <option value="internacional">Internacional</option>
              </select>
            </div>
            {error && <p className="md:col-span-2 text-red-500 text-sm">{error}</p>}
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => { setMostrarForm(false); setError(''); }}
                className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-6 py-2 rounded-lg text-sm font-semibold transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500 text-sm">Cargando aeropuertos...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Ciudad</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data?.allAeropuertos?.map((a: Aeropuerto) => (
                <tr key={a.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{a.nombre}</td>
                  <td className="px-4 py-3">{a.codigo}</td>
                  <td className="px-4 py-3">{a.ciudad}</td>
                  <td className="px-4 py-3">{a.tipo || '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleEliminar(a.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold transition"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AeropuertosPage;