export const ExpiredPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="w-full max-w-[430px] mx-auto bg-white min-h-screen flex flex-col items-center justify-center px-6 text-center">

        {/* Logo */}
        <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center mb-8">
          <span className="text-white text-sm font-semibold">TD</span>
        </div>

        {/* Ícono */}
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        </div>

        <h1 className="text-lg font-semibold text-gray-900 mb-2">
          Este link ya no está disponible
        </h1>
        <p className="text-sm text-gray-400 leading-relaxed">
          El link de tracking expiró o no es válido.<br />
          Si tenés dudas sobre tu pedido, contactá al negocio directamente.
        </p>

        <p className="text-xs text-gray-300 mt-12">TrackDeli</p>
      </div>
    </div>
  );
};
