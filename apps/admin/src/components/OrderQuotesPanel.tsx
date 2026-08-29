import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type OrderQuote,
  getOrderQuotes,
  acceptOrderQuote,
} from 'api-client';
import {
  Motorcycle,
  Bicycle,
  Car,
  PersonSimpleWalk,
  Star,
  Clock,
  NavigationArrow,
  ChatCircleDots,
  CheckCircle,
  Tag,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { NegotiationModal } from './NegotiationModal';

interface OrderQuotesPanelProps {
  orderId: string;
  orderStatus: string;
  onQuoteAccepted?: () => void;
}

export const OrderQuotesPanel: React.FC<OrderQuotesPanelProps> = ({
  orderId,
  orderStatus,
  onQuoteAccepted,
}) => {
  const queryClient = useQueryClient();
  const [selectedQuoteForNegotiation, setSelectedQuoteForNegotiation] = useState<OrderQuote | null>(null);

  // Fetch quotes for this order
  const { data: quotes = [], isLoading, isRefetching } = useQuery<OrderQuote[]>({
    queryKey: ['quotes', orderId],
    queryFn: () => getOrderQuotes(orderId),
    refetchInterval: orderStatus === 'COTIZANDO' ? 4000 : false,
  });

  // Mutation: Accept quote directly from list
  const acceptMutation = useMutation({
    mutationFn: (quoteId: string) => acceptOrderQuote(orderId, quoteId),
    onSuccess: (_, quoteId) => {
      const accepted = quotes.find((q) => q.id === quoteId);
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['quotes', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`¡Propuesta de ${accepted?.rider?.name || 'repartidor'} aceptada!`);
      onQuoteAccepted?.();
    },
    onError: () => {
      toast.error('No se pudo aceptar la propuesta');
    },
  });

  const getVehicleIcon = (type?: string) => {
    const t = (type || 'MOTO').toUpperCase();
    if (t === 'BICICLETA') return <Bicycle size={18} className="text-emerald-600" />;
    if (t === 'CARRO') return <Car size={18} className="text-blue-600" />;
    if (t === 'A_PIE') return <PersonSimpleWalk size={18} className="text-amber-600" />;
    return <Motorcycle size={18} className="text-indigo-600" />;
  };

  // Sort quotes by distance to business (ascending)
  const sortedQuotes = [...quotes].sort((a, b) => {
    const distA = a.distanceToBusinessKm ?? 9999;
    const distB = b.distanceToBusinessKm ?? 9999;
    return distA - distB;
  });

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-violet-50/50 via-white to-white">
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-violet-600" />
          <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
            Propuestas de Precio
          </span>
          {isRefetching && (
            <ArrowsClockwise size={12} className="text-gray-400 animate-spin" />
          )}
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100/80 text-violet-800">
          {quotes.length} {quotes.length === 1 ? 'propuesta recibida' : 'propuestas recibidas'}
        </span>
      </div>

      {/* Content */}
      <div className="p-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : quotes.length === 0 ? (
          <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-3 bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
            <div className="relative flex items-center justify-center">
              <span className="absolute w-12 h-12 bg-violet-400/20 rounded-full animate-ping" />
              <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center relative shadow-xs">
                <Motorcycle size={24} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-800">
                Esperando propuestas de repartidores
              </p>
              <p className="text-xs text-gray-400 max-w-sm">
                Los repartidores cercanos están viendo tu pedido para enviar sus tarifas de entrega. Aparecerán aquí en tiempo real.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedQuotes.map((quote) => {
              const isAccepted = quote.status === 'ACCEPTED';
              const isRejected = quote.status === 'REJECTED' || quote.status === 'CANCELLED';
              const isAgreed = Boolean(quote.counterFee && quote.proposedFee === quote.counterFee);
              const isNegotiating = (quote.status === 'NEGOTIATING' || !!quote.counterFee) && !isAgreed;

              return (
                <div
                  key={quote.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isAccepted
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : isRejected
                      ? 'bg-gray-50/40 border-gray-100 opacity-60'
                      : isAgreed
                      ? 'bg-emerald-50/30 border-emerald-300 shadow-2xs'
                      : isNegotiating
                      ? 'bg-violet-50/30 border-violet-200 shadow-xs'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Rider Info & Vehicle */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 shadow-2xs">
                        {quote.rider?.profilePhotoUrl ? (
                          <img
                            src={quote.rider.profilePhotoUrl}
                            alt={quote.rider.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          getVehicleIcon(quote.rider?.vehicleType)
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">
                            {quote.rider?.name || 'Repartidor'}
                          </span>

                          {quote.rider?.rating && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md">
                              <Star size={12} weight="fill" className="text-amber-500" />
                              {Number(quote.rider.rating).toFixed(1)}
                            </span>
                          )}

                          {isAgreed && !isAccepted && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full inline-flex items-center gap-1">
                              <CheckCircle size={12} weight="fill" />
                              Precio acordado
                            </span>
                          )}

                          {isNegotiating && !isAccepted && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full">
                              En negociación
                            </span>
                          )}

                          {isAccepted && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                              Aceptada
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-500">
                          {quote.rider?.vehicleType || 'Moto'}
                          {quote.rider?.vehicleColor ? ` · ${quote.rider.vehicleColor}` : ''}
                          {quote.rider?.vehiclePlate ? ` · ${quote.rider.vehiclePlate}` : ' · Sin placa'}
                        </p>
                      </div>
                    </div>

                    {/* Pricing & ETA */}
                    <div className="text-right shrink-0">
                      <div
                        className={`text-base font-bold font-mono ${
                          isAgreed ? 'text-emerald-700' : 'text-gray-900'
                        }`}
                      >
                        C$ {Number(quote.proposedFee).toFixed(2)}
                      </div>

                      {quote.counterFee && !isAgreed && (
                        <div className="text-[11px] font-semibold text-violet-700 font-mono">
                          Contraoferta: C$ {Number(quote.counterFee).toFixed(2)}
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 text-[11px] text-gray-500 mt-0.5">
                        {quote.distanceToBusinessKm !== null && quote.distanceToBusinessKm !== undefined && (
                          <span className="flex items-center gap-0.5">
                            <NavigationArrow size={11} className="text-gray-400" />
                            {Number(quote.distanceToBusinessKm).toFixed(1)} km
                          </span>
                        )}
                        {quote.etaToBusinessMin !== null && quote.etaToBusinessMin !== undefined && (
                          <span className="flex items-center gap-0.5">
                            <Clock size={11} className="text-gray-400" />
                            ~{quote.etaToBusinessMin} min
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions (if quote is still open/pending) */}
                  {!isAccepted && !isRejected && orderStatus === 'COTIZANDO' && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedQuoteForNegotiation(quote)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <ChatCircleDots size={14} className="text-gray-500" />
                        <span>Negociar</span>
                        {quote.messages && quote.messages.length > 0 && (
                          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-violet-100 text-violet-800">
                            {quote.messages.length}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => acceptMutation.mutate(quote.id)}
                        disabled={acceptMutation.isPending}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
                      >
                        <CheckCircle size={14} weight="fill" />
                        <span>Aceptar</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Negociación */}
      {selectedQuoteForNegotiation && (
        <NegotiationModal
          isOpen={!!selectedQuoteForNegotiation}
          onClose={() => setSelectedQuoteForNegotiation(null)}
          orderId={orderId}
          quote={selectedQuoteForNegotiation}
          onQuoteAccepted={onQuoteAccepted}
        />
      )}
    </div>
  );
};
