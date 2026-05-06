import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './modules/usuarios/pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsuariosPage from './modules/usuarios/pages/UsuariosPage';
import RolesPage from './modules/usuarios/pages/RolesPage';
import PermisosPage from './modules/usuarios/pages/PermisosPage';
import AeropuertosPage from './modules/vuelos/pages/AeropuertosPage';
import AeronavesPge from './modules/vuelos/pages/AeronavesPge';
import RutasPage from './modules/vuelos/pages/RutasPage';
import EscalasPage from './modules/vuelos/pages/EscalasPage';
import ProgramacionPage from './modules/vuelos/pages/ProgramacionPage';
import ClientesPage from './modules/reservas/pages/ClientesPage';
import ReservasPage from './modules/reservas/pages/ReservasPage';
import TicketsPage from './modules/reservas/pages/TicketsPage';
import ConsultarAsientosPage from './modules/reservas/pages/ConsultarAsientosPage';
import Sidebar from './components/Sidebar';
import SalidasPage from './modules/salida/pages/SalidasPage';
import DevolucionesPage from './modules/salida/pages/DevolucionesPage';
import IngresosPage from './modules/finanzas/pages/IngresosPage';
import EgresosPage from './modules/finanzas/pages/EgresosPage';
import TripulacionPage from './modules/vuelos/pages/TripulacionPage';
import ReprogramacionPage from './modules/vuelos/pages/ReprogramacionPage';
import ItinerarioPage from './modules/vuelos/pages/ItinerarioPage';

// ── Tipos ──────────────────────────────────────────
type Paso = 'login' | 'app' | 'pasajero';
type Pagina =
  | 'dashboard'
  | 'usuarios' | 'roles' | 'permisos'
  | 'aeropuertos' | 'aeronaves' | 'rutas' | 'escalas' | 'itinerario' | 'programacion' | 'tripulacion' | 'reprogramacion'
  | 'clientes' | 'tipo_clases' | 'reservas' | 'tickets'
  | 'salidas' | 'devoluciones'
  | 'ingresos' | 'egresos'
  | 'reportes';

interface Usuario {
  idUsuario: string;
  nombreCompleto: string;
  username: string;
  correo: string;
  estado: string;
  idRol: { idRol: string; nombre: string } | null;
}

interface Pasajero {
  idPasajero: string;
  nombre: string;
  apellidoPaterno: string;
  correo: string;
}

// ── Layout ─────────────────────────────────────────
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
            Bienvenido, {pasajero.nombre} {pasajero.apellidoPaterno}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Portal del Pasajero — BOA</p>
        </div>
        <button onClick={onCerrarSesion}
          className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-semibold transition">
          Cerrar Sesión
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { titulo: 'Ver Itinerarios',  desc: 'Consulta vuelos disponibles' },
          { titulo: 'Mis Reservas',     desc: 'Ver y gestionar tus reservas' },
          { titulo: 'Mis Pagos',        desc: 'Historial de pagos realizados' },
          { titulo: 'Mi Perfil',        desc: 'Editar mis datos personales' },
        ].map(item => (
          <div key={item.titulo} className="bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-md transition">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">{item.titulo}</h2>
            <p className="text-slate-500 text-sm">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── Página pendiente ───────────────────────────────
const Pendiente = ({ titulo }: { titulo: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-slate-800">{titulo}</h1>
    <p className="text-slate-500 text-sm mt-1">Próximamente...</p>
  </div>
);

// ── App ────────────────────────────────────────────
const App = () => {
  const [paso, setPaso]                 = useState<Paso>('login');
  const [usuario, setUsuario]           = useState<Usuario | null>(null);
  const [pasajero, setPasajero]         = useState<Pasajero | null>(null);
  const [permisos, setPermisos]         = useState<string[]>([]);
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

  const renderPagina = () => {
    switch (paginaActual) {
      case 'dashboard':      return <DashboardPage usuario={usuario} permisos={permisos} />;
      // Gestión de Usuarios
      case 'usuarios':       return <UsuariosPage />;
      case 'roles':          return <RolesPage />;
      case 'permisos':       return <PermisosPage />;
      // Programación de Vuelos
      case 'aeropuertos':    return <AeropuertosPage />;
      case 'aeronaves':      return <AeronavesPge />;
      case 'rutas':          return <RutasPage />;
      case 'escalas':        return <EscalasPage />;
      case 'programacion':   return <ProgramacionPage />;
      case 'itinerario':     return <ItinerarioPage />;
      case 'tripulacion':    return <TripulacionPage />;
      case 'reprogramacion': return <ReprogramacionPage />;
      // Reservas de Pasajes
case 'clientes':    return <ClientesPage />;
case 'tipo_clases': return <ConsultarAsientosPage />;
case 'tickets':     return <TicketsPage />;
case 'reservas':    return <ReservasPage onNavegar={setPaginaActual} />;
      // Salidas
      case 'salidas':        return <SalidasPage />;
      case 'devoluciones':   return <DevolucionesPage />;
      // Finanzas
      case 'ingresos':       return <IngresosPage />;
      case 'egresos':        return <EgresosPage />;
      // Reportes
      case 'reportes':       return <Pendiente titulo="Reportes" />;
      default:               return <DashboardPage usuario={usuario} permisos={permisos} />;
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
                onNavegar={setPaginaActual}
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