export const LoginPage = () => {
  return (
    <div className="bg-surface p-8 rounded-lg w-96 shadow-lg">
      <h1 className="text-2xl font-bold mb-4">Iniciar Sesión</h1>
      <p className="text-gray-400 mb-6">Ingresa al panel de administración.</p>
      <div className="space-y-4">
        <input type="email" placeholder="Email" className="w-full p-2 bg-secondary rounded border border-gray-700" />
        <input type="password" placeholder="Password" className="w-full p-2 bg-secondary rounded border border-gray-700" />
        <button className="w-full bg-primary text-white p-2 rounded hover:bg-green-600 transition">Ingresar</button>
      </div>
    </div>
  );
};
