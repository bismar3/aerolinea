interface ProtectedRouteProps {
  permiso: string;
  permisos: string[];
  children: React.ReactNode;
}

const ProtectedRoute = ({ permiso, permisos, children }: ProtectedRouteProps) => {
  if (!permisos.includes(permiso)) {
    return null; // invisible si no tiene permiso
  }
  return <>{children}</>;
};

export default ProtectedRoute;