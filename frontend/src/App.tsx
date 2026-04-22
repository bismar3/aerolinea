import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './modules/seguridad/pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import Sidebar from './components/Sidebar';

type Paso = 'login' | 'app';
type Pagina =
  | 'dashboard'
  | 'usuarios' | 'roles' | 'permisos'
  | 'aeropuertos' | 'rutas' | 'programacion'
  | 'reservas' | 'pagos';

interface Usuario {
  id: string;
  userName: string;
  correoElectronico: string;
  estado: string;
}

interface LayoutProps {
  paginaActual: Pagina;
  permisos: string[];
  onNavegar: (pagina: Pagina) => void;
  onCerrarSesion: () => void;
  children: React.ReactNode;
}

const Layout = ({ paginaActual, permisos, onNavegar, onCerrarSesion, children }: LayoutProps) => (
  <div className="flex h-screen bg-slate-100">
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

const App = () => {
  const [paso, setPaso] = useState<Paso>('login');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [paginaActual, setPaginaActual] = useState<Pagina>('dashboard');

  const handleLoginExitoso = (usuarioData: Usuario, permisosData: string[]) => {
    setUsuario(usuarioData);
    setPermisos(permisosData);
    setPaso('app');
  };

  const handleCerrarSesion = () => {
    setUsuario(null);
    setPermisos([]);
    setPaginaActual('dashboard');
    setPaso('login');
  };

  const renderPagina = () => {
    switch (paginaActual) {
      case 'dashboard': return <DashboardPage usuario={usuario} permisos={permisos} />;
      default: return <DashboardPage usuario={usuario} permisos={permisos} />;
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            paso === 'login' ? (
              <LoginPage onLoginExitoso={handleLoginExitoso} />
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