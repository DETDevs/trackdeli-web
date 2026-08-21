export const RatingForm = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-center font-semibold">¿Cómo estuvo la entrega?</h3>
      <div className="flex justify-center gap-2 text-3xl">
        <span>⭐</span><span>⭐</span><span>⭐</span><span>⭐</span><span>⭐</span>
      </div>
      <textarea className="w-full bg-secondary p-3 rounded" placeholder="Deja un comentario..."></textarea>
      <button className="w-full bg-primary py-3 rounded-lg font-semibold">Enviar calificación</button>
    </div>
  );
};
