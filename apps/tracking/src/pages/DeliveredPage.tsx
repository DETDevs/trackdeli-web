import { useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://trackdeli-api-production.up.railway.app/api/v1";

const StarRating = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="text-4xl transition-transform hover:scale-110 px-1"
        >
          <span
            className={
              star <= (hover || value) ? "text-amber-400" : "text-gray-200"
            }
          >
            ★
          </span>
        </button>
      ))}
    </div>
  );
};

export const DeliveredPage = () => {
  const { token } = useParams<{ token: string }>();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (stars === 0) return;
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE}/tracking/${token}/rating`, {
        stars,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
    } catch (e) {
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="w-full max-w-[430px] mx-auto bg-white min-h-screen flex flex-col shadow-sm pb-12">
        {/* Header simple */}
        <div className="px-6 py-4 flex items-center gap-3 border-b border-gray-100">
          <div className="w-8 h-8 bg-gray-900 text-white rounded-md flex items-center justify-center font-bold text-xs">
            TD
          </div>
          <div className="font-semibold text-sm text-gray-900">TrackDeli</div>
        </div>

        <div className="px-6 pt-10 pb-6 text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            ¡Tu pedido fue entregado!
          </h1>
          <p className="text-sm text-gray-500">
            Gracias por preferir usar TrackDeli
          </p>
        </div>

        <div className="flex-1 flex flex-col px-6">
          {submitted ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-100 mt-4">
              <div className="text-4xl mb-3">🙏</div>
              <p className="text-base font-semibold text-gray-900">
                ¡Gracias por tu calificación!
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Tu opinión ayuda a mejorar el servicio
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 text-center mt-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-6">
                ¿Cómo fue tu experiencia?
              </h2>

              <div className="mb-6">
                <StarRating value={stars} onChange={setStars} />
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Dejá un comentario (opcional)..."
                className="w-full h-24 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-gray-400 outline-none resize-none mb-6"
              />

              <button
                onClick={handleSubmit}
                disabled={stars === 0 || isLoading}
                className="w-full bg-gray-900 text-white rounded-xl py-3.5 text-sm font-semibold disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
              >
                {isLoading ? "Enviando..." : "Enviar calificación"}
              </button>
            </div>
          )}

          {/* Propina */}
          <div className="mt-8 text-center pt-8 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-900 mb-2">
              ¿Querés dejar propina al repartidor?
            </p>
            <p className="text-xs text-gray-400 mb-6">
              Toda la propina va directo a tu repartidor
            </p>
            <button className="px-6 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Dejar propina →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
