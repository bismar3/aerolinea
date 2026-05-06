import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { LOGIN_MUTATION, LOGIN_PASAJERO_MUTATION } from '../graphql/mutations'

interface LoginTrabajadorResponse {
  loginUsuario: {
    ok: boolean
    mensaje: string
    permisos: string[]
    usuario: {
      idUsuario: string
      nombreCompleto: string
      username: string
      correo: string
      estado: string
      idRol: { idRol: string; nombre: string } | null
    }
  }
}

interface LoginPasajeroResponse {
  loginPasajero: {
    ok: boolean
    mensaje: string
    pasajero: {
      idPasajero: string
      nombre: string
      apellidoPaterno: string
      correo: string
    }
    usuario: {
      idUsuario: string
      username: string
      correo: string
    }
  }
}

interface LoginPageProps {
  onLoginTrabajadorExitoso: (usuario: any, permisos: string[]) => void
  onLoginPasajeroExitoso: (pasajero: any) => void
}

const LoginPage = ({ onLoginTrabajadorExitoso, onLoginPasajeroExitoso }: LoginPageProps) => {
  const [tipo, setTipo]         = useState<'trabajador' | 'pasajero'>('trabajador')
  const [username, setUsername] = useState('')
  const [correo, setCorreo]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')

  const [loginTrabajador, { loading: loadingT }] = useMutation<LoginTrabajadorResponse>(LOGIN_MUTATION)
  const [loginPasajero,   { loading: loadingP }] = useMutation<LoginPasajeroResponse>(LOGIN_PASAJERO_MUTATION)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (tipo === 'trabajador') {
        const { data } = await loginTrabajador({
          variables: { username, password }
        })
        if (data?.loginUsuario.ok) {
          onLoginTrabajadorExitoso(data.loginUsuario.usuario, data.loginUsuario.permisos)
        } else {
          setError(data?.loginUsuario.mensaje || 'Error desconocido')
        }
      } else {
        const { data } = await loginPasajero({
          variables: { correo, password }
        })
        if (data?.loginPasajero.ok) {
          onLoginPasajeroExitoso(data.loginPasajero.pasajero)
        } else {
          setError(data?.loginPasajero.mensaje || 'Error desconocido')
        }
      }
    } catch {
      setError('Error al conectar con el servidor')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-800">✈️ BOA</h1>
          <p className="text-slate-500 text-sm mt-1">Aerolínea Boliviana de Aviación</p>
        </div>

        {/* Selector tipo */}
        <div className="flex rounded-lg overflow-hidden border border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => { setTipo('trabajador'); setError('') }}
            className={`flex-1 py-2 text-sm font-medium transition ${
              tipo === 'trabajador'
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            👔 Trabajador
          </button>
          <button
            type="button"
            onClick={() => { setTipo('pasajero'); setError('') }}
            className={`flex-1 py-2 text-sm font-medium transition ${
              tipo === 'pasajero'
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            🧳 Pasajero
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tipo === 'trabajador' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                required
                className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico</label>
              <input
                type="email"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                placeholder="correo@ejemplo.com"
                required
                className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loadingT || loadingP}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
          >
            {loadingT || loadingP ? 'Verificando...' : 'Ingresar'}
          </button>

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
  )
}

export default LoginPage