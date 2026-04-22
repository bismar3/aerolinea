import { useState } from 'react';

type Pagina =
  | 'dashboard'
  | 'usuarios' | 'roles' | 'permisos'
  | 'aeropuertos' | 'rutas' | 'programacion'
  | 'reservas' | 'pagos';

interface MenuItem {
  id: Pagina;
  label: string;
  icono: string;
  permiso: string;
}

interface SidebarProps {
  paginaActual: Pagina;
  permisos: string[];
  onNavegar: (pagina: Pagina) => void;
  onCerrarSesion: () => void;
}

const menuItems: MenuItem[] = [
  { id: 'usuarios',     label: 'Usuarios',      icono: '👤', permiso: 'Usuarios' },
  { id: 'roles',        label: 'Roles',          icono: '🔑', permiso: 'Roles' },
  { id: 'permisos',     label: 'Permisos',       icono: '🛡️', permiso: 'Permisos' },
  { id: 'aeropuertos',  label: 'Aeropuertos',    icono: '🏢', permiso: 'Vuelos' },
  { id: 'rutas',        label: 'Rutas',          icono: '✈️', permiso: 'Vuelos' },
  { id: 'programacion', label: 'Programación',   icono: '📅', permiso: 'Vuelos' },
  { id: 'reservas',     label: 'Reservas',       icono: '🎫', permiso: 'Reservas' },
  { id: 'pagos',        label: 'Pagos',          icono: '💳', permiso: 'Pagos' },
];

const Sidebar = ({ paginaActual, permisos, onNavegar, onCerrarSesion }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  const itemsVisibles = menuItems.filter(item =>
    permisos.includes(item.permiso)
  );

  return (
    <div className={`h-screen bg-slate-900 text-white flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
        {!collapsed && (
          <span className="text-lg font-bold tracking-wide">✈️ BOA</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white transition"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4">
        {/* Dashboard siempre visible */}
        <button
          onClick={() => onNavegar('dashboard')}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-slate-700
            ${paginaActual === 'dashboard' ? 'bg-slate-700 border-r-4 border-white font-semibold' : ''}
          `}
        >
          <span className="text-xl">🏠</span>
          {!collapsed && <span>Dashboard</span>}
        </button>

        {/* Items según permisos */}
        {itemsVisibles.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavegar(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-slate-700
              ${paginaActual === item.id ? 'bg-slate-700 border-r-4 border-white font-semibold' : ''}
            `}
          >
            <span className="text-xl">{item.icono}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Cerrar sesión */}
      <div className="border-t border-slate-700 p-4">
        <button
          onClick={onCerrarSesion}
          className="w-full flex items-center gap-3 px-2 py-2 text-sm text-slate-400 hover:text-white transition"
        >
          <span className="text-xl">🚪</span>
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;