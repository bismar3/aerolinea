import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { LOGIN_MUTATION, LOGIN_PASAJERO_MUTATION } from '../graphql/mutations';

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

interface LoginPasajeroResponse {
  loginPasajero: {
    ok: boolean;
    mensaje: string;
    pasajero: {
      id: string;
      nombre: string;
      apellidoPaterno: string;
      correoElectronico: string;
    };
    usuario: {
      id: string;
      userName: string;
    };
  };
}

interface LoginPageProps {
  onLoginTrabajadorExitoso: (usuario: any, permisos: string[]) => void;
  onLoginPasajeroExitoso: (pasajero: any) => void;
}

const LoginPage = ({ onLoginTrabajadorExitoso, onLoginPasajeroExitoso }: LoginPageProps) => {
  const [tipo, setTipo] = useState<'trabajador' | 'pasajero'>('trabajador');
  const [userName, setUserName] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');

  const [login, { loading: loadingTrabajador }] = useMutation<LoginResponse>(LOGIN_MUTATION);
  const [loginPasajero, { loading: loadingPasajero }] = useMutation<LoginPasajeroResponse>(LOGIN_PASAJERO_MUTATION);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (tipo === 'trabajador') {
        const { data } = await login({
          variables: { userName, contrasena }
        });
        if (data?.login.ok) {
          onLoginTrabajadorExitoso(data.login.usuario, data.login.permisos);
        } else {
          setError(data?.login.mensaje || 'Error desconocido');
        }
      } else {
        const { data } = await loginPasajero({
          variables: { correoElectronico: correo, contrasena }
        });
        if (data?.loginPasajero.ok) {
          onLoginPasajeroExitoso(data.loginPasajero.pasajero);
        } else {
          setError(data?.loginPasajero.mensaje || 'Error desconocido');
        }
      }
    } catch {
      setError('Error al conectar con el servidor');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-800">✈️ BOA</h1>
          <p className="text-slate-500 text-sm mt-1">Aerolínea Boliviana de Aviación</p>
        </div>

        {/* Selector tipo de usuario */}
        <div className="flex rounded-lg overflow-hidden border border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => { setTipo('trabajador'); setError(''); }}
            className={`flex-1 py-2 text-sm font-medium transition
              ${tipo === 'trabajador'
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            👔 Trabajador
          </button>
          <button
            type="button"
            onClick={() => { setTipo('pasajero'); setError(''); }}
            className={`flex-1 py-2 text-sm font-medium transition
              ${tipo === 'pasajero'
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            🧳 Pasajero
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Campo usuario o correo según tipo */}
          {tipo === 'trabajador' ? (
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
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="correo@ejemplo.com"
                required
                className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
          )}

          {/* Contraseña */}
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
            disabled={loadingTrabajador || loadingPasajero}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {loadingTrabajador || loadingPasajero ? 'Verificando...' : 'Ingresar'}
          </button>

          {/* Registro pasajero */}
          {tipo === 'pasajero' && (
            <p className="text-center text-sm text-slate-500 mt-2">
              ¿No tienes cuenta?{' '}
              <span className="text-blue-700 cursor-pointer font-medium hover:underline">
                Regístrate aquí
              </span>
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginPage;