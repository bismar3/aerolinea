import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { LOGIN_MUTATION } from '../graphql/mutations';

interface LoginResponse {
  login: {
    ok: boolean;
    mensaje: string;
    permisos: string[];
    usuario: {
      id: string;
      userName: string;
      correoElectronico: string;
      estado: string;
    };
  };
}

interface LoginPageProps {
  onLoginExitoso: (usuario: any, permisos: string[]) => void;
}

const LoginPage = ({ onLoginExitoso }: LoginPageProps) => {
  const [userName, setUserName] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');

  const [login, { loading }] = useMutation<LoginResponse>(LOGIN_MUTATION);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await login({
        variables: { userName, contrasena },
      });
      if (data?.login.ok) {
        onLoginExitoso(data.login.usuario, data.login.permisos);
      } else {
        setError(data?.login.mensaje || 'Error desconocido');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">BOA</h1>
          <p className="text-slate-500 text-sm mt-1">Aerolínea Boliviana de Aviación</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Usuario
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Ingresa tu usuario"
              required
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;