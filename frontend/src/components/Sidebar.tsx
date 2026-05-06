import { useState } from 'react';

type Pagina =
  | 'dashboard'
  | 'usuarios' | 'roles' | 'permisos'
  | 'aeropuertos' | 'rutas' | 'programacion' | 'aeronaves' | 'escalas' | 'itinerario' | 'tripulacion' | 'reprogramacion'
  | 'clientes' | 'tipo_clases' | 'reservas' | 'tickets'
  | 'salidas' | 'devoluciones'
  | 'ingresos' | 'egresos'
  | 'reportes';

interface MenuItem {
  id: Pagina;
  label: string;
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
  { id: 'usuarios',       label: 'Usuarios',           permiso: 'Gestión de Usuarios',    grupo: 'Gestión de Usuarios' },
  { id: 'roles',          label: 'Roles',              permiso: 'Gestión de Usuarios',    grupo: 'Gestión de Usuarios' },
  { id: 'permisos',       label: 'Permisos',           permiso: 'Gestión de Usuarios',    grupo: 'Gestión de Usuarios' },
  { id: 'aeropuertos',    label: 'Aeropuertos',        permiso: 'Programación de Vuelos', grupo: 'Programación de Vuelos' },
  { id: 'aeronaves',      label: 'Aeronaves',          permiso: 'Programación de Vuelos', grupo: 'Programación de Vuelos' },
  { id: 'rutas',          label: 'Rutas',              permiso: 'Programación de Vuelos', grupo: 'Programación de Vuelos' },
  { id: 'escalas',        label: 'Escalas',            permiso: 'Programación de Vuelos', grupo: 'Programación de Vuelos' },
  { id: 'programacion',   label: 'Programación',       permiso: 'Programación de Vuelos', grupo: 'Programación de Vuelos' },
  { id: 'itinerario',     label: 'Itinerario',         permiso: 'Programación de Vuelos', grupo: 'Programación de Vuelos' },
  { id: 'tripulacion',    label: 'Tripulación',        permiso: 'Programación de Vuelos', grupo: 'Programación de Vuelos' },
  { id: 'reprogramacion', label: 'Reprogramación',     permiso: 'Programación de Vuelos', grupo: 'Programación de Vuelos' },
  { id: 'clientes',       label: 'Clientes',           permiso: 'Reservas de Pasajes',    grupo: 'Reservas de Pasajes' },
  { id: 'tipo_clases',    label: 'Consultar Asientos', permiso: 'Reservas de Pasajes',    grupo: 'Reservas de Pasajes' },
  { id: 'reservas',       label: 'Reservas',           permiso: 'Reservas de Pasajes',    grupo: 'Reservas de Pasajes' },
  { id: 'tickets',        label: 'Tickets',            permiso: 'Reservas de Pasajes',    grupo: 'Reservas de Pasajes' },
  { id: 'salidas',        label: 'Salidas',            permiso: 'Salidas',                grupo: 'Salidas' },
  { id: 'devoluciones',   label: 'Devoluciones',       permiso: 'Salidas',                grupo: 'Salidas' },
  { id: 'ingresos',       label: 'Ingresos',           permiso: 'Finanzas',               grupo: 'Finanzas' },
  { id: 'egresos',        label: 'Egresos',            permiso: 'Finanzas',               grupo: 'Finanzas' },
  { id: 'reportes',       label: 'Reportes',           permiso: 'Reportes',               grupo: 'Reportes' },
];

const grupos = [
  'Gestión de Usuarios',
  'Programación de Vuelos',
  'Reservas de Pasajes',
  'Salidas',
  'Finanzas',
  'Reportes',
];

const Sidebar = ({ paginaActual, permisos, onNavegar, onCerrarSesion }: SidebarProps) => {
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(null);

  const itemsVisibles = menuItems.filter(item => permisos.includes(item.permiso));
  const gruposVisibles = grupos.filter(grupo => itemsVisibles.some(item => item.grupo === grupo));

  const toggleGrupo = (grupo: string) => {
    setGrupoAbierto(prev => prev === grupo ? null : grupo);
  };

  const tieneActivo = (grupo: string) =>
    itemsVisibles.some(item => item.grupo === grupo && item.id === paginaActual);

  return (
    <nav
      style={{ backgroundColor: '#1e3a8a' }}
      className="w-full shadow-md"
      onClick={() => setGrupoAbierto(null)}
    >
      <div
        className="flex items-center px-4 gap-1 flex-wrap"
        style={{ minHeight: '52px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mr-4 py-2">
          <span className="text-2xl">✈</span>
          <div>
            <span className="text-white font-black text-lg tracking-widest">BOA</span>
            <span className="text-blue-300 text-xs block leading-none" style={{ fontSize: '10px' }}>
              Boliviana de Aviación
            </span>
          </div>
        </div>

        <div className="w-px h-8 bg-blue-700 mr-3" />

        <button
          onClick={() => { onNavegar('dashboard'); setGrupoAbierto(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-all"
          style={{
            color: paginaActual === 'dashboard' ? '#ffffff' : '#bfdbfe',
            backgroundColor: paginaActual === 'dashboard' ? 'rgba(255,255,255,0.15)' : 'transparent',
            borderBottom: paginaActual === 'dashboard' ? '2px solid #60a5fa' : '2px solid transparent',
          }}
          onMouseEnter={e => {
            if (paginaActual !== 'dashboard') {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.08)';
              (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
            }
          }}
          onMouseLeave={e => {
            if (paginaActual !== 'dashboard') {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#bfdbfe';
            }
          }}
        >
          Dashboard
        </button>

        {gruposVisibles.map(grupo => {
          const activo = tieneActivo(grupo);
          const abierto = grupoAbierto === grupo;
          return (
            <div key={grupo} className="relative">
              <button
                onClick={() => toggleGrupo(grupo)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-all"
                style={{
                  color: activo || abierto ? '#ffffff' : '#bfdbfe',
                  backgroundColor: abierto ? 'rgba(255,255,255,0.15)' : activo ? 'rgba(255,255,255,0.1)' : 'transparent',
                  borderBottom: activo ? '2px solid #60a5fa' : '2px solid transparent',
                }}
                onMouseEnter={e => {
                  if (!abierto && !activo) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.08)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
                  }
                }}
                onMouseLeave={e => {
                  if (!abierto && !activo) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = '#bfdbfe';
                  }
                }}
              >
                <span>{grupo}</span>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>{abierto ? '▲' : '▼'}</span>
              </button>

              {abierto && (
                <div
                  className="absolute top-full left-0 mt-1 rounded-lg shadow-xl py-1 z-50"
                  style={{ backgroundColor: '#1e2f6e', border: '1px solid rgba(255,255,255,0.1)', minWidth: '180px' }}
                >
                  {itemsVisibles.filter(item => item.grupo === grupo).map(item => (
                    <button
                      key={item.id}
                      onClick={() => { onNavegar(item.id); setGrupoAbierto(null); }}
                      className="w-full text-left px-4 py-2 text-sm transition-all"
                      style={{
                        color: paginaActual === item.id ? '#ffffff' : '#bfdbfe',
                        backgroundColor: paginaActual === item.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                        borderLeft: paginaActual === item.id ? '3px solid #60a5fa' : '3px solid transparent',
                      }}
                      onMouseEnter={e => {
                        if (paginaActual !== item.id) {
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.08)';
                          (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
                        }
                      }}
                      onMouseLeave={e => {
                        if (paginaActual !== item.id) {
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                          (e.currentTarget as HTMLButtonElement).style.color = '#bfdbfe';
                        }
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="ml-auto">
          <button
            onClick={onCerrarSesion}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-all"
            style={{ color: '#fca5a5', border: '1px solid rgba(252,165,165,0.3)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(220,38,38,0.2)';
              (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5';
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;