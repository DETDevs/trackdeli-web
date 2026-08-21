import { Outlet, Link } from 'react-router-dom';

export const AppLayout = () => {
  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 bg-surface p-4 flex flex-col">
        <div className="text-xl font-bold mb-8 text-primary">Trackdeli Admin</div>
        <nav className="flex-1 space-y-2">
          <Link to="/dashboard" className="block p-2 hover:bg-secondary rounded">📦 Dashboard</Link>
          <Link to="/orders" className="block p-2 hover:bg-secondary rounded">📋 Pedidos</Link>
          <Link to="/orders/new" className="block p-2 hover:bg-secondary rounded">➕ Nuevo Pedido</Link>
          <Link to="/staff" className="block p-2 hover:bg-secondary rounded">👥 Repartidores</Link>
          <Link to="/reports" className="block p-2 hover:bg-secondary rounded">📊 Reportes</Link>
        </nav>
        <button className="p-2 text-left hover:bg-secondary rounded mt-auto text-red-500">Cerrar sesión</button>
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="bg-surface p-4 flex justify-between items-center shadow">
          <div className="font-semibold">Mi Negocio</div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">A</div>
        </header>
        <div className="p-6 flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
