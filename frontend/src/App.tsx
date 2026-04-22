import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './modules/seguridad/pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsuariosPage from './modules/seguridad/pages/UsuariosPage';
import RolesPage from './modules/seguridad/pages/RolesPage';
import PermisosPage from './modules/seguridad/pages/PermisosPage';
import AeropuertosPage from './modules/vuelos/pages/AeropuertosPage';
import Sidebar from './components/Sidebar';

// ── Tipos ──────────────────────────────────────────
type Paso = 'login' | 'app' | 'pasajero';
type Pagina =
  | 'dashboard'
  | 'usuarios' | 'roles' | 'permisos'
  | 'aeropuertos' | 'rutas' | 'programacion'
  | 'reservas' | 'pagos' | 'reportes';

interface Usuario {
  id: string;
  userName: string;
  correoElectronico: string;
  estado: string;
}

interface Pasajero {
  id: string;
  nombre: string;
  apellidoPaterno: string;
  correoElectronico: string;
}

// ── Layout trabajador ──────────────────────────────
interface LayoutProps {
  paginaActual: Pagina;
  permisos: string[];
  onNavegar: (pagina: Pagina) => void;
  onCerrarSesion: () => void;
  children: React.ReactNode;
}

const Layout = ({ paginaActual, permisos, onNavegar, onCerrarSesion, children }: LayoutProps) => (
  <div className="flex flex-col h-screen bg-slate-100">
    <Sidebar
      paginaActual={paginaActual}
      permisos={permisos}
      onNavegar={onNavegar}
      onCerrarSesion={onCerrarSesion}
    />
    <main className="flex-1 overflow-y-auto">
      {children}
    </main>
  </div>
);

// ── Portal pasajero temporal ───────────────────────
const PortalPasajero = ({ pasajero, onCerrarSesion }: { pasajero: Pasajero; onCerrarSesion: () => void }) => (
  <div className="min-h-screen bg-slate-100 p-6">
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow p-6 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            ✈️ Bienvenido, {pasajero.nombre} {pasajero.apellidoPaterno}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Portal del Pasajero — BOA</p>
        </div>
        <button
          onClick={onCerrarSesion}
          className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          🚪 Cerrar Sesión
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-md transition">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">🗓️ Ver Itinerarios</h2>
          <p className="text-slate-500 text-sm">Consulta vuelos disponibles</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-md transition">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">🎫 Mis Reservas</h2>
          <p className="text-slate-500 text-sm">Ver y gestionar tus reservas</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-md transition">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">💳 Mis Pagos</h2>
          <p className="text-slate-500 text-sm">Historial de pagos realizados</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-md transition">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">👤 Mi Perfil</h2>
          <p className="text-slate-500 text-sm">Editar mis datos personales</p>
        </div>
      </div>
    </div>
  </div>
);

// ── App ────────────────────────────────────────────
const App = () => {
  const [paso, setPaso] = useState<Paso>('login');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [pasajero, setPasajero] = useState<Pasajero | null>(null);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [paginaActual, setPaginaActual] = useState<Pagina>('dashboard');

  const handleLoginTrabajadorExitoso = (usuarioData: Usuario, permisosData: string[]) => {
    setUsuario(usuarioData);
    setPermisos(permisosData);
    setPaso('app');
  };

  const handleLoginPasajeroExitoso = (pasajeroData: Pasajero) => {
    setPasajero(pasajeroData);
    setPaso('pasajero');
  };

  const handleCerrarSesion = () => {
    setUsuario(null);
    setPasajero(null);
    setPermisos([]);
    setPaginaActual('dashboard');
    setPaso('login');
  };

  const handleNavegar = (pagina: Pagina) => {
    setPaginaActual(pagina);
  };

  const renderPagina = () => {
    switch (paginaActual) {
      case 'dashboard':    return <DashboardPage usuario={usuario} permisos={permisos} />;
      case 'usuarios':     return <UsuariosPage />;
      case 'roles':        return <RolesPage />;
      case 'permisos':     return <PermisosPage />;
      case 'aeropuertos':  return <AeropuertosPage />;
      case 'rutas':        return <div className="p-6"><h1 className="text-2xl font-bold text-slate-800">🗺️ Rutas</h1><p className="text-slate-500 text-sm mt-1">Próximamente...</p></div>;
      case 'programacion': return <div className="p-6"><h1 className="text-2xl font-bold text-slate-800">📅 Programación</h1><p className="text-slate-500 text-sm mt-1">Próximamente...</p></div>;
      case 'reservas':     return <div className="p-6"><h1 className="text-2xl font-bold text-slate-800">🎫 Reservas</h1><p className="text-slate-500 text-sm mt-1">Próximamente...</p></div>;
      case 'pagos':        return <div className="p-6"><h1 className="text-2xl font-bold text-slate-800">💳 Pagos</h1><p className="text-slate-500 text-sm mt-1">Próximamente...</p></div>;
      case 'reportes':     return <div className="p-6"><h1 className="text-2xl font-bold text-slate-800">📊 Reportes</h1><p className="text-slate-500 text-sm mt-1">Próximamente...</p></div>;
      default:             return <DashboardPage usuario={usuario} permisos={permisos} />;
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            paso === 'login' ? (
              <LoginPage
                onLoginTrabajadorExitoso={handleLoginTrabajadorExitoso}
                onLoginPasajeroExitoso={handleLoginPasajeroExitoso}
              />
            ) : paso === 'pasajero' ? (
              <PortalPasajero
                pasajero={pasajero!}
                onCerrarSesion={handleCerrarSesion}
              />
            ) : (
              <Layout
                paginaActual={paginaActual}
                permisos={permisos}
                onNavegar={handleNavegar}
                onCerrarSesion={handleCerrarSesion}
              >
                {renderPagina()}
              </Layout>
            )
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;