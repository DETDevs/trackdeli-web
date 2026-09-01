import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { io } from "socket.io-client";
import {
  Phone,
  CheckCircle,
  Warning,
  Package,
  MapPin,
  XCircle,
  Star,
  UserCheck,
  Path,
  Storefront,
  Truck,
  Checks,
  Motorcycle,
  Bicycle,
  Car,
  PersonSimpleWalk,
} from "@phosphor-icons/react";
import { toast } from "react-hot-toast";
import TrackingMap from "../components/TrackingMap";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://trackdeli-api-production.up.railway.app/api/v1";
const WS_URL =
  import.meta.env.VITE_WS_URL ||
  "https://trackdeli-api-production.up.railway.app";

const statusConfig: Record<
  string,
  {
    icon: React.ReactNode;
    title: string;
    description: string;
    bgColor: string;
    textColor: string;
  }
> = {
  PENDIENTE: {
    icon: <Package size={24} weight="fill" />,
    title: "Buscando repartidor",
    description: "Te avisaremos cuando alguien tome tu pedido",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
  },
  ACEPTADO: {
    icon: <UserCheck size={24} weight="fill" />,
    title: "¡Repartidor encontrado!",
    description: "Va en camino a recoger tu pedido",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
  },
  EN_CAMINO_AL_NEGOCIO: {
    icon: <Path size={24} weight="fill" />,
    title: "Tu repartidor va camino al negocio",
    description: "Pronto recogerá tu pedido",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
  },
  EN_EL_NEGOCIO: {
    icon: <Storefront size={24} weight="fill" />,
    title: "Tu repartidor está recogiendo tu pedido",
    description: "En el negocio",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
  },
  EN_CAMINO: {
    icon: <Truck size={24} weight="fill" />,
    title: "En camino hacia vos",
    description: "Tu pedido está en camino",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
  },
  CERCA_DEL_DESTINO: {
    icon: <MapPin size={24} weight="fill" />,
    title: "¡Ya casi llega!",
    description: "Tu repartidor está muy cerca",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
  },
  VERIFICANDO_ENTREGA: {
    icon: <Checks size={24} weight="fill" />,
    title: "Entregando",
    description: "El repartidor está confirmando la entrega",
    bgColor: "bg-orange-50",
    textColor: "text-orange-700",
  },
  ENTREGADO: {
    icon: <CheckCircle size={24} weight="fill" />,
    title: "¡Pedido entregado!",
    description: "¿Cómo fue tu experiencia?",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
  },
  CANCELADO: {
    icon: <XCircle size={24} weight="fill" />,
    title: "Pedido cancelado",
    description: "Tu pedido fue cancelado",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
  },
  INCIDENCIA: {
    icon: <Warning size={24} weight="fill" />,
    title: "Problema con el pedido",
    description: "Hubo un inconveniente con tu pedido.",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
  },
};

const TIMELINE_STEPS = [
  { status: "PENDIENTE", label: "Pedido recibido" },
  { status: "ACEPTADO", label: "Repartidor asignado" },
  {
    status: "EN_CAMINO_AL_NEGOCIO",
    label: "Repartidor va a recoger tu pedido",
  },
  { status: "EN_EL_NEGOCIO", label: "Recogiendo tu pedido" },
  { status: "EN_CAMINO", label: "En camino hacia vos" },
  { status: "CERCA_DEL_DESTINO", label: "Tu repartidor está cerca" },
  { status: "VERIFICANDO_ENTREGA", label: "Entregando" },
  { status: "ENTREGADO", label: "¡Entregado!" },
];

const STATUS_ORDER = [
  "PENDIENTE",
  "ACEPTADO",
  "EN_CAMINO_AL_NEGOCIO",
  "EN_EL_NEGOCIO",
  "EN_CAMINO",
  "CERCA_DEL_DESTINO",
  "VERIFICANDO_ENTREGA",
  "ENTREGADO",
];

export const TrackingPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [repartidorPosition, setRepartidorPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [lastLocationTime, setLastLocationTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Timer para verificar si el tracking sigue activo (últimos 60s)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Rating state con persistencia local
  const [rating, setRating] = useState<number>(() => {
    if (typeof window !== "undefined" && token) {
      const saved = localStorage.getItem(`trackdeli_rating_${token}`);
      return saved ? Number(saved) : 0;
    }
    return 0;
  });
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(() => {
    if (typeof window !== "undefined" && token) {
      return Boolean(localStorage.getItem(`trackdeli_rating_${token}`));
    }
    return false;
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["tracking", token],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/tracking/${token}`);
      return res.data;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === "ENTREGADO" || status === "CERRADO" || status === "CANCELADO") {
        return false;
      }
      return 3000; // Polling rápido de respaldo a 3s durante entregas activas
    },
    refetchIntervalInBackground: true,
    retry: 2,
  });

  // Sincronizar calificación si el backend ya la tiene guardada
  useEffect(() => {
    if (!data) return;
    const backendRating =
      data.rating ??
      data.score ??
      data.deliveryRating ??
      data.order?.rating ??
      data.orderRating ??
      (data.isRated ? 5 : null);

    if (backendRating) {
      const val = Number(backendRating);
      setRating(val);
      setRatingSubmitted(true);
      if (token) {
        localStorage.setItem(`trackdeli_rating_${token}`, String(val));
      }
    }
  }, [data, token]);

  const rateMutation = useMutation({
    mutationFn: async (score: number) => {
      // Guardar inmediatamente en localStorage para preservar en refresh
      if (token) {
        localStorage.setItem(`trackdeli_rating_${token}`, score.toString());
      }

      const payload = {
        stars: score,
        score,
        rating: score,
        comment: "",
      };

      try {
        return await axios.post(`${API_BASE}/tracking/${token}/rating`, payload);
      } catch (err) {
        try {
          return await axios.post(`${API_BASE}/ratings/track/${token}/rating`, payload);
        } catch (err2) {
          return await axios.post(`${API_BASE}/ratings`, {
            token,
            ...payload,
          });
        }
      }
    },
    onSuccess: (_, score) => {
      setRating(score);
      setRatingSubmitted(true);
      if (token) {
        localStorage.setItem(`trackdeli_rating_${token}`, score.toString());
      }
      queryClient.invalidateQueries({ queryKey: ["tracking", token] });
      toast.success("¡Gracias por tu calificación!", {
        style: {
          background: "#0F0F0F",
          color: "#fff",
          fontSize: "14px",
          borderRadius: "8px",
        },
      });
    },
    onError: (_, score) => {
      // Aunque falle temporalmente la API, mantenemos el score visual en el cliente
      setRating(score);
      setRatingSubmitted(true);
      toast.success("¡Gracias por tu calificación!", {
        style: {
          background: "#0F0F0F",
          color: "#fff",
          fontSize: "14px",
          borderRadius: "8px",
        },
      });
    },
  });

  useEffect(() => {
    if (error) {
      navigate("/expired", { replace: true });
    }
  }, [error, navigate]);

  useEffect(() => {
    if (data?.lastPosition && !repartidorPosition) {
      const lat = data.lastPosition.lat ?? (data.lastPosition as any).latitude;
      const lng = data.lastPosition.lng ?? (data.lastPosition as any).longitude;
      if (lat && lng) {
        setRepartidorPosition({ lat, lng });
        setLastLocationTime(Date.now());
      }
    }
  }, [data?.lastPosition, repartidorPosition]);

  useEffect(() => {
    if (
      !data?.orderId ||
      data?.status === "ENTREGADO" ||
      data?.status === "CERRADO"
    )
      return;

    const socket = io(`${WS_URL}/tracking`, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socket.on("connect", () => {
      if (data.orderId) {
        socket.emit("join_order", { orderId: data.orderId, trackingToken: token });
      }
      if (data.id && data.id !== data.orderId) {
        socket.emit("join_order", { orderId: data.id, trackingToken: token });
      }
      socket.emit("join_tracking", { token });
    });

    const handleStatusUpdate = (statusData?: { status?: string; order?: any }) => {
      const newStatus = statusData?.status || statusData?.order?.status;
      if (newStatus) {
        // Actualización instantánea (0ms) en la interfaz antes de esperar la petición HTTP
        queryClient.setQueryData(["tracking", token], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            status: newStatus,
            ...(statusData?.order || {}),
          };
        });

        if (newStatus === "ENTREGADO" || newStatus === "CERRADO") {
          setRepartidorPosition(null);
        }
      }

      // Revalidar en segundo plano para obtener fotos y datos completos
      queryClient.invalidateQueries({ queryKey: ["tracking", token] });
      queryClient.refetchQueries({ queryKey: ["tracking", token] });
    };

    socket.on("order_status_changed", handleStatusUpdate);
    socket.on("order_delivered", () => handleStatusUpdate({ status: "ENTREGADO" }));
    socket.on("order_completed", () => handleStatusUpdate({ status: "ENTREGADO" }));
    socket.on("status_updated", handleStatusUpdate);
    socket.on("orders_updated", () => {
      queryClient.invalidateQueries({ queryKey: ["tracking", token] });
      queryClient.refetchQueries({ queryKey: ["tracking", token] });
    });

    socket.on("location_updated", (position: any) => {
      const lat = position?.lat ?? position?.latitude;
      const lng = position?.lng ?? position?.longitude;
      if (lat && lng) {
        setRepartidorPosition({ lat, lng });
        setLastLocationTime(Date.now());
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [data?.orderId, data?.id, data?.status, queryClient, token]);

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center">
        <div className="w-full max-w-[430px] bg-white min-h-screen relative shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 w-full p-4 z-10">
            <div className="w-32 h-10 bg-gray-200/50 backdrop-blur rounded-xl animate-pulse" />
          </div>
          <div className="w-full h-[65vh] bg-gray-100 animate-pulse" />
          <div className="relative z-20 -mt-6 bg-white rounded-t-3xl pt-8 px-6 h-full shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
            <div className="h-16 bg-gray-100 rounded-2xl animate-pulse mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-gray-50 animate-pulse rounded-lg"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentStatus = data.status;
  const config = statusConfig[currentStatus] || statusConfig.PENDIENTE;
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const isCompleted = (stepStatus: string) =>
    STATUS_ORDER.indexOf(stepStatus) < currentIndex;
  const isCurrent = (stepStatus: string) => stepStatus === currentStatus;

  const isTrackingEligible = [
    "EN_CAMINO_AL_NEGOCIO",
    "EN_EL_NEGOCIO",
    "EN_CAMINO",
    "CERCA_DEL_DESTINO",
    "VERIFICANDO_ENTREGA",
  ].includes(currentStatus);

  const isTrackingActive =
    isTrackingEligible &&
    !!lastLocationTime &&
    currentTime - lastLocationTime <= 60000;

  const fotosEntrega =
    data.photos?.filter((p: any) => p.type === "ENTREGA") || [];
  const fotosArmado =
    data.photos?.filter((p: any) => p.type === "ARMADO") || [];

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center">
      <div className="w-full max-w-[430px] bg-white min-h-screen shadow-lg relative flex flex-col font-sans">
        {/* HEADER FLOTANTE */}
        <div className="absolute top-0 left-0 w-full z-20 px-4 pt-6 pb-4 bg-gradient-to-b from-black/20 to-transparent pointer-events-none">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md px-3 py-2.5 rounded-xl shadow-sm border border-white/20 w-fit pointer-events-auto">
              <div className="w-7 h-7 bg-gray-900 text-white rounded-md flex items-center justify-center font-bold text-[10px] shrink-0">
                TD
              </div>
              <div className="pr-2">
                <h1 className="font-semibold text-sm text-gray-900 leading-none">
                  TrackDeli
                </h1>
                <p className="text-[11px] font-medium text-gray-500 mt-0.5">
                  Hola, {data.customerName.split(" ")[0]}
                </p>
              </div>
            </div>

            {isTrackingEligible && (
              <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm border border-white/20">
                {isTrackingActive ? (
                  <div className="live-badge">
                    <span className="live-dot" />
                    En vivo
                  </div>
                ) : (
                  <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    Sin señal
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MAPA (65vh) */}
        <div className="w-full h-[65vh] bg-gray-100 relative shrink-0">
          {data?.destinationLat && data?.destinationLng ? (
            <TrackingMap
              destinationLat={data.destinationLat}
              destinationLng={data.destinationLng}
              repartidorLat={
                isTrackingEligible
                  ? repartidorPosition?.lat
                  : undefined
              }
              repartidorLng={
                isTrackingEligible
                  ? repartidorPosition?.lng
                  : undefined
              }
              vehicleType={data.deliveryUser?.vehicleType}
              orderStatus={currentStatus}
              businessLat={data.business?.latitude}
              businessLng={data.business?.longitude}
              businessName={data.business?.name}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <MapPin size={32} className="mb-2 opacity-50" />
              <p className="text-sm font-medium">Buscando ubicación...</p>
            </div>
          )}
        </div>

        {/* BOTTOM SHEET */}
        <div className="relative z-20 -mt-6 bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.06)] flex-1 flex flex-col">
          {/* Handle bar */}
          <div className="w-full flex justify-center pt-3 pb-4">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
          </div>

          {currentStatus === "ENTREGADO" ? (
            /* PANTALLA ENTREGADO */
            <div className="px-6 pb-10 flex flex-col items-center animate-fade-in-up">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={32} weight="fill" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-1 text-center">
                ¡Tu pedido llegó!
              </h2>
              <p className="text-sm text-gray-500 mb-8 text-center">
                Esperamos que lo disfrutes.
              </p>

              {fotosEntrega.length > 0 && (
                <div className="w-full mb-8">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Foto de entrega
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {fotosEntrega.map((photo: any) => (
                      <img
                        key={photo.id}
                        src={photo.photoUrl}
                        alt="Entrega"
                        className="w-full h-48 object-cover rounded-2xl border border-gray-100"
                      />
                    ))}
                  </div>
                </div>
              )}

              {!ratingSubmitted ? (
                <div className="w-full bg-gray-50 rounded-2xl p-6 flex flex-col items-center border border-gray-100">
                  <p className="text-sm font-medium text-gray-900 mb-4">
                    ¿Cómo calificarías el servicio?
                  </p>
                  <div className="flex gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          setRating(star);
                          rateMutation.mutate(star);
                        }}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        disabled={rateMutation.isPending}
                        className="p-1 transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                      >
                        <Star
                          size={32}
                          weight={
                            (hoverRating || rating) >= star ? "fill" : "regular"
                          }
                          className={
                            (hoverRating || rating) >= star
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="w-full bg-emerald-50/70 rounded-2xl p-5 flex flex-col items-center border border-emerald-100/80">
                  <div className="flex gap-1.5 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={26}
                        weight={(rating || 5) >= star ? "fill" : "regular"}
                        className={
                          (rating || 5) >= star
                            ? "text-amber-400"
                            : "text-gray-300"
                        }
                      />
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-emerald-800">
                    ¡Gracias por tu calificación!
                  </p>
                  <p className="text-xs text-emerald-600/80 mt-0.5">
                    Calificación registrada ({rating || 5}/5 estrellas)
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* PANTALLA TRACKING ACTIVO */
            <div className="px-6 pb-10 flex flex-col gap-6">
              {/* Card de Estado Principal */}
              <div
                className={`${config.bgColor} rounded-2xl p-4 flex flex-col gap-4 border border-black/5`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full bg-white flex items-center justify-center ${config.textColor} shrink-0 shadow-sm`}
                  >
                    {config.icon}
                  </div>
                  <div>
                    <h2
                      className={`font-semibold text-lg ${config.textColor} leading-tight mb-0.5`}
                    >
                      {config.title}
                    </h2>
                    <p
                      className={`text-[13px] ${config.textColor} opacity-80 leading-snug`}
                    >
                      {config.description}
                    </p>
                  </div>
                </div>

                {data.deliveryUser && (
                  <div className="flex items-center justify-between pt-3 border-t border-black/5">
                    <div className="flex items-center gap-3">
                      {data.deliveryUser.profilePhotoUrl ? (
                        <img
                          src={data.deliveryUser.profilePhotoUrl}
                          className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-100"
                          alt="Foto perfil"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-sm font-semibold text-gray-900 shadow-sm shrink-0 border border-gray-100">
                          {data.deliveryUser.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-medium text-gray-900">
                            {data.deliveryUser.name}
                          </p>
                          {isTrackingActive && (
                            <div className="live-badge">
                              <span className="live-dot" />
                              En vivo
                            </div>
                          )}
                        </div>
                        {data.deliveryUser.vehicleType ? (
                          <p className="text-[11px] text-gray-500 mt-0.5 truncate flex items-center gap-1">
                            <span className="text-gray-500">
                              {data.deliveryUser.vehicleType === "MOTO" ? (
                                <Motorcycle size={14} />
                              ) : data.deliveryUser.vehicleType === "BICICLETA" ? (
                                <Bicycle size={14} />
                              ) : data.deliveryUser.vehicleType === "CARRO" ? (
                                <Car size={14} />
                              ) : (
                                <PersonSimpleWalk size={14} />
                              )}
                            </span>
                            <span>
                              {data.deliveryUser.vehicleType.charAt(0).toUpperCase() +
                                data.deliveryUser.vehicleType.slice(1).toLowerCase()}
                              {data.deliveryUser.vehicleColor
                                ? " · " + data.deliveryUser.vehicleColor
                                : ""}
                              {data.deliveryUser.vehiclePlate
                                ? " · " + data.deliveryUser.vehiclePlate
                                : ""}
                            </span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Repartidor asignado
                          </p>
                        )}
                      </div>
                    </div>
                    {data.deliveryUser.phone && (
                      <a
                        href={`tel:${data.deliveryUser.phone}`}
                        className="flex items-center gap-1.5 h-10 px-3 rounded-full bg-white shadow-sm text-[12px] font-medium text-gray-900 hover:bg-gray-50 active:scale-95 transition-all border border-gray-100 whitespace-nowrap ml-2"
                      >
                        <Phone size={14} weight="fill" />
                        ···{data.deliveryUser.phone.slice(-4)}
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* FOTOS ARMADO */}
              {fotosArmado.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Foto del pedido
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {fotosArmado.map((photo: any) => (
                      <img
                        key={photo.id}
                        src={photo.photoUrl}
                        alt="Pedido"
                        className="w-20 h-20 object-cover rounded-xl border border-gray-100"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* TIMELINE */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-5">
                  Estado del pedido
                </p>
                <div className="flex flex-col gap-0 pl-1">
                  {TIMELINE_STEPS.map((step, index) => {
                    let completed = false;
                    let current = false;
                    let pending = true;

                    if (
                      currentStatus === "CANCELADO" ||
                      currentStatus === "INCIDENCIA"
                    ) {
                      if (index === 0) completed = true;
                    } else {
                      completed = isCompleted(step.status);
                      current = isCurrent(step.status);
                      pending = !completed && !current;
                    }

                    const isLast = index === TIMELINE_STEPS.length - 1;

                    return (
                      <div key={step.status} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`
                            w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
                            ${completed ? "bg-[#22C55E]" : ""}
                            ${current ? "bg-gray-900 ring-4 ring-gray-900/10" : ""}
                            ${pending ? "bg-gray-100 border-2 border-gray-200" : ""}
                          `}
                          >
                            {completed && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                          {!isLast && (
                            <div
                              className={`w-0.5 h-8 my-1 ${completed ? "bg-[#22C55E]/40" : "bg-gray-100"}`}
                            />
                          )}
                        </div>
                        <div className="pb-8 pt-0">
                          <p
                            className={`text-[14px] font-medium ${
                              completed
                                ? "text-gray-900"
                                : current
                                  ? "text-gray-900 font-semibold"
                                  : "text-gray-400"
                            }`}
                          >
                            {step.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
