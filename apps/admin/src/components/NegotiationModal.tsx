import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  PaperPlaneRight,
  CheckCircle,
  Motorcycle,
  Bicycle,
  Car,
  PersonSimpleWalk,
  Star,
  Clock,
  NavigationArrow,
  Tag,
} from '@phosphor-icons/react';
import {
  type OrderQuote,
  type OrderMessage,
  getQuoteMessages,
  sendQuoteMessage,
  acceptOrderQuote,
} from 'api-client';
import toast from 'react-hot-toast';
import { formatTime } from '../utils/formatDate';
import { useSocketStore } from '../store/socket.store';

interface NegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  quote: OrderQuote;
  onQuoteAccepted?: () => void;
}

export const NegotiationModal: React.FC<NegotiationModalProps> = ({
  isOpen,
  onClose,
  orderId,
  quote,
  onQuoteAccepted,
}) => {
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState('');
  const [counterFee, setCounterFee] = useState<string>(
    quote.counterFee ? String(quote.counterFee) : ''
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocketStore();

  // Read latest quotes list from cache/server so this modal updates reactively when quote_updated arrives
  const { data: quotes = [] } = useQuery<OrderQuote[]>({
    queryKey: ['quotes', orderId],
    enabled: isOpen && !!orderId,
  });

  const currentQuote = quotes.find((q) => q.id === quote.id) || quote;

  // Fetch messages for this quote
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<OrderMessage[]>({
    queryKey: ['messages', currentQuote.id],
    queryFn: () => getQuoteMessages(orderId, currentQuote.id),
    enabled: isOpen && !!currentQuote.id,
    refetchInterval: 4000,
  });

  // Socket listener for new messages & quote updates
  useEffect(() => {
    if (!socket || !isOpen) return;

    const handleNewMessage = (data: any) => {
      if (data?.quoteId === currentQuote.id || data?.message?.quoteId === currentQuote.id) {
        queryClient.invalidateQueries({ queryKey: ['messages', currentQuote.id] });
      }
    };

    const handleQuoteUpdated = (data: any) => {
      const targetOrderId = data?.orderId || data?.quote?.orderId;
      if (targetOrderId === orderId) {
        queryClient.invalidateQueries({ queryKey: ['quotes', orderId] });
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('quote_updated', handleQuoteUpdated);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('quote_updated', handleQuoteUpdated);
    };
  }, [socket, isOpen, currentQuote.id, orderId, queryClient]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Mutation: Send message & optional counter offer
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const parsedCounter = counterFee ? parseFloat(counterFee) : undefined;
      return sendQuoteMessage(orderId, currentQuote.id, {
        message: messageText.trim(),
        counterFee: !isNaN(parsedCounter as number) && (parsedCounter as number) > 0 ? parsedCounter : undefined,
      });
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messages', currentQuote.id] });
      queryClient.invalidateQueries({ queryKey: ['quotes', orderId] });
      toast.success('Mensaje enviado al repartidor');
    },
    onError: () => {
      toast.error('Error al enviar el mensaje');
    },
  });

  // Mutation: Accept quote
  const acceptMutation = useMutation({
    mutationFn: () => acceptOrderQuote(orderId, currentQuote.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['quotes', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`Propuesta de ${currentQuote.rider?.name || 'repartidor'} aceptada`);
      onQuoteAccepted?.();
      onClose();
    },
    onError: () => {
      toast.error('No se pudo aceptar la propuesta');
    },
  });

  if (!isOpen) return null;

  const isAgreed = Boolean(
    currentQuote.counterFee &&
    currentQuote.proposedFee === currentQuote.counterFee
  );

  const priceDisplay = currentQuote.counterFee
    ? isAgreed
      ? `Precio acordado: C$ ${Number(currentQuote.proposedFee).toFixed(2)}`
      : `Propuesta: C$ ${Number(currentQuote.proposedFee).toFixed(2)} · Contrapropuesta: C$ ${Number(currentQuote.counterFee).toFixed(2)}`
    : `Propuesta: C$ ${Number(currentQuote.proposedFee).toFixed(2)}`;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() && !counterFee) return;
    sendMessageMutation.mutate();
  };

  const getVehicleIcon = (type?: string) => {
    const t = (type || 'MOTO').toUpperCase();
    if (t === 'BICICLETA') return <Bicycle size={16} />;
    if (t === 'CARRO') return <Car size={16} />;
    if (t === 'A_PIE') return <PersonSimpleWalk size={16} />;
    return <Motorcycle size={16} />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-800 shadow-xs">
              {getVehicleIcon(currentQuote.rider?.vehicleType)}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <span>Negociación con {currentQuote.rider?.name || 'Repartidor'}</span>
                {currentQuote.rider?.rating && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                    <Star size={11} weight="fill" className="text-amber-500" />
                    {Number(currentQuote.rider.rating).toFixed(1)}
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500">
                {currentQuote.rider?.vehicleType || 'Moto'} {currentQuote.rider?.vehicleColor ? `· ${currentQuote.rider.vehicleColor}` : ''} {currentQuote.rider?.vehiclePlate ? `· ${currentQuote.rider.vehiclePlate}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Banner de Precio arriba del Chat */}
        <div className="px-5 py-3 border-b border-gray-100 bg-white space-y-2">
          <div
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
              isAgreed
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {isAgreed ? (
                <CheckCircle size={16} className="text-emerald-600 shrink-0" weight="fill" />
              ) : (
                <Tag size={16} className="text-amber-600 shrink-0" weight="duotone" />
              )}
              <span>{priceDisplay}</span>
            </div>

            {isAgreed ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                Acordado
              </span>
            ) : (
              <div className="flex items-center gap-2.5 text-[11px] font-medium text-gray-500">
                {currentQuote.distanceToBusinessKm !== null && currentQuote.distanceToBusinessKm !== undefined && (
                  <span className="flex items-center gap-1">
                    <NavigationArrow size={12} className="text-gray-400" />
                    {Number(currentQuote.distanceToBusinessKm).toFixed(1)} km
                  </span>
                )}
                {currentQuote.etaToBusinessMin !== null && currentQuote.etaToBusinessMin !== undefined && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="text-gray-400" />
                    ~{currentQuote.etaToBusinessMin} min
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat / Historial de Mensajes */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F9FAFB] min-h-[220px] max-h-[320px]">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-32 text-xs text-gray-400 animate-pulse">
              Cargando mensajes...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400 space-y-1">
              <p className="text-xs font-medium text-gray-600">No hay mensajes previos</p>
              <p className="text-[11px] text-gray-400 max-w-xs">
                Escribe un mensaje o envía una contrapropuesta de tarifa para acordar el precio con el repartidor.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isEncargado =
                msg.senderRole === 'ENCARGADO' ||
                msg.senderRole === 'ADMIN' ||
                msg.senderRole === 'SUPERADMIN';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isEncargado ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-baseline gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-semibold text-gray-700">
                      {isEncargado ? 'Tú (Negocio)' : msg.sender?.name || currentQuote.rider?.name || 'Repartidor'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      isEncargado
                        ? 'bg-gray-900 text-white rounded-tr-xs shadow-xs'
                        : 'bg-white text-gray-900 border border-gray-200/80 rounded-tl-xs shadow-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form & Acciones */}
        <form onSubmit={handleSend} className="p-4 border-t border-gray-100 bg-white space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {/* Contrapropuesta de precio */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 block">
                Contraoferta (C$)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                  C$
                </span>
                <input
                  type="number"
                  step="any"
                  placeholder="Ej. 80"
                  value={counterFee}
                  onChange={(e) => setCounterFee(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Mensaje */}
            <div className="col-span-2 space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 block">
                Mensaje <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej. El cliente paga C$80, ¿aceptás?"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 focus:bg-white transition-colors"
                />
                <button
                  type="submit"
                  disabled={sendMessageMutation.isPending || (!messageText.trim() && !counterFee)}
                  className="px-3 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                  title="Enviar mensaje"
                >
                  <PaperPlaneRight size={15} weight="fill" />
                </button>
              </div>
            </div>
          </div>

          {/* Botón de Confirmar y Asignar */}
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <button
              type="button"
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0F0F0F] hover:bg-gray-800 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <CheckCircle size={16} weight="fill" className="text-emerald-400" />
              <span>
                Confirmar — Asignar a {currentQuote.rider?.name || 'repartidor'} por C$ {Number(currentQuote.proposedFee).toFixed(2)}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
