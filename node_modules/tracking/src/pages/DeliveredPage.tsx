import { RatingForm } from '../components/RatingForm';

export const DeliveredPage = () => {
  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center pt-12">
      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-2xl mb-4">✅</div>
      <h1 className="text-2xl font-bold mb-8">¡Tu pedido fue entregado!</h1>
      <div className="w-full max-w-md bg-surface p-6 rounded-xl space-y-6">
        <RatingForm />
        <button className="w-full bg-accent py-3 rounded-lg font-semibold" onClick={() => alert('Link propina')}>
          Dejar Propina ☕
        </button>
      </div>
    </div>
  );
};
