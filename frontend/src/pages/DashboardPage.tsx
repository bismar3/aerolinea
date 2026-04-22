interface DashboardPageProps {
  usuario: any;
  permisos: string[];
}

const DashboardPage = ({ usuario, permisos }: DashboardPageProps) => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">
        Bienvenido, {usuario?.userName}
      </h1>
      <p className="text-slate-500 text-sm mb-6">
        Aerolínea Boliviana de Aviación
      </p>

      {/* Permisos del usuario */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          🔑 Tus permisos
        </h2>
        <div className="flex flex-wrap gap-2">
          {permisos.map((permiso, index) => (
            <span
              key={index}
              className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium"
            >
              {permiso}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;