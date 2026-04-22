import { useState } from 'react';

type Pagina =
  | 'dashboard'
  | 'usuarios' | 'roles' | 'permisos'
  | 'aeropuertos' | 'rutas' | 'programacion'
  | 'reservas' | 'pagos' | 'reportes';

interface MenuItem {
  id: Pagina;
  label: string;
  icono: string;
  permiso: string;
  grupo: string;
}

interface SidebarProps {
  paginaActual: Pagina;
  permisos: string[];
  onNavegar: (pagina: Pagina) => void;
  onCerrarSesion: () => void;
}

const menuItems: MenuItem[] = [
  { id: 'usuarios',     label: 'Usuarios',    icono: '👤', permiso: 'Seguridad', grupo: 'Seguridad' },
  { id: 'roles',        label: 'Roles',        icono: '🔑', permiso: 'Seguridad', grupo: 'Seguridad' },
  { id: 'permisos',     label: 'Permisos',     icono: '🛡️', permiso: 'Seguridad', grupo: 'Seguridad' },
  { id: 'aeropuertos',  label: 'Aeropuertos',  icono: '🏢', permiso: 'Vuelos',    grupo: 'Vuelos' },
  { id: 'rutas',        label: 'Rutas',         icono: '🗺️', permiso: 'Vuelos',    grupo: 'Vuelos' },
  { id: 'programacion', label: 'Programación', icono: '📅', permiso: 'Vuelos',    grupo: 'Vuelos' },
  { id: 'reservas',     label: 'Reservas',     icono: '🎫', permiso: 'Reservas',  grupo: 'Reservas' },
  { id: 'pagos',        label: 'Pagos',         icono: '💳', permiso: 'Pagos',     grupo: 'Pagos' },
  { id: 'reportes',     label: 'Reportes',     icono: '📊', permiso: 'Reportes',  grupo: 'Reportes' },
];

const grupoIconos: Record<string, string> = {
  Seguridad: '🔒',
  Vuelos: '✈️',
  Reservas: '🎫',
  Pagos: '💳',
  Reportes: '📊',
};

const Sidebar = ({ paginaActual, permisos, onNavegar, onCerrarSesion }: SidebarProps) => {
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(null);

  const itemsVisibles = menuItems.filter(item =>
    permisos.includes(item.permiso)
  );

  const gruposVisibles = ['Seguridad', 'Vuelos', 'Reservas', 'Pagos', 'Reportes'].filter(grupo =>
    itemsVisibles.some(item => item.grupo === grupo)
  );

  const toggleGrupo = (grupo: string) => {
    setGrupoAbierto(prev => prev === grupo ? null : grupo);
  };

  return (
    <div className="w-full bg-slate-900 text-white">
      {/* Barra principal */}
      <div className="flex items-center px-4 py-2 border-b border-slate-700">
        {/* Logo */}
        <span className="text-lg font-bold tracking-wide mr-6">✈️ BOA</span>

        {/* Dashboard */}
        <button
          onClick={() => { onNavegar('dashboard'); setGrupoAbierto(null); }}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded transition hover:bg-slate-700 mr-1
            ${paginaActual === 'dashboard' ? 'bg-slate-700 font-semibold' : ''}`}
        >
          🏠 Dashboard
        </button>

        {/* Grupos */}
        {gruposVisibles.map((grupo) => (
          <div key={grupo} className="relative">
            <button
              onClick={() => toggleGrupo(grupo)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded transition hover:bg-slate-700 mr-1
                ${grupoAbierto === grupo ? 'bg-slate-700 font-semibold' : ''}`}
            >
              <span>{grupoIconos[grupo]}</span>
              <span>{grupo}</span>
              <span className="text-slate-400 text-xs ml-1">
                {grupoAbierto === grupo ? '▲' : '▼'}
              </span>
            </button>

            {/* Dropdown items */}
            {grupoAbierto === grupo && (
              <div className="absolute top-full left-0 bg-slate-800 rounded-lg shadow-lg py-1 z-50 min-w-36">
                {itemsVisibles
                  .filter(item => item.grupo === grupo)
                  .map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { onNavegar(item.id); setGrupoAbierto(null); }}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition hover:bg-slate-700
                        ${paginaActual === item.id ? 'bg-slate-700 font-semibold' : ''}`}
                    >
                      <span>{item.icono}</span>
                      <span>{item.label}</span>
                    </button>
                  ))
                }
              </div>
            )}
          </div>
        ))}

        {/* Cerrar sesión */}
        <div className="ml-auto">
          <button
            onClick={onCerrarSesion}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white transition"
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;