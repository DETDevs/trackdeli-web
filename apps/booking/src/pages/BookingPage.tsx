import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  WarningCircle,
} from '@phosphor-icons/react';
import { BookingHeader } from '../components/BookingHeader';
import { ServiceSelector } from '../components/ServiceSelector';
import { DateTimeSelector } from '../components/DateTimeSelector';
import { CustomerForm } from '../components/CustomerForm';
import { BookingSummaryModal } from '../components/BookingSummaryModal';
import { BookingSuccess } from '../components/BookingSuccess';
import {
  useBusinessInfo,
  usePublicServices,
  useAvailability,
  useCreateAppointment,
} from '../hooks/useBooking';
import type {
  AppointmentDetail,
  AvailableSlot,
  BookingServiceItem,
} from '../types/booking';

export const BookingPage: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();

  // Wizard Steps: 1 = Servicio, 2 = Fecha/Hora, 3 = Datos
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [selectedService, setSelectedService] = useState<BookingServiceItem | null>(null);

  // Default date: today in YYYY-MM-DD (local time)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
  });
  const [formErrors, setFormErrors] = useState<
    Partial<Record<'customerName' | 'customerPhone' | 'customerEmail', string>>
  >({});

  // Summary & Success Modal State
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState<AppointmentDetail | null>(null);

  // API Queries
  const {
    data: business,
    isLoading: isLoadingBusiness,
  } = useBusinessInfo(businessId);

  const {
    data: services = [],
    isLoading: isLoadingServices,
    isError: isServicesError,
  } = usePublicServices(businessId);

  const {
    data: availabilityData,
    isLoading: isLoadingSlots,
  } = useAvailability(businessId, selectedService?.id, selectedDate);

  // Mutation
  const createAppointmentMutation = useCreateAppointment(businessId || '');

  // Step 1 -> 2
  const handleSelectService = (service: BookingServiceItem) => {
    setSelectedService(service);
    setSelectedSlot(null); // Reset slot al cambiar servicio
  };

  // Step 2 Date change
  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  // Step 3 Form change
  const handleFormChange = (
    field: 'customerName' | 'customerPhone' | 'customerEmail',
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateStep3 = () => {
    const errors: typeof formErrors = {};
    if (!formData.customerName.trim()) {
      errors.customerName = 'Por favor ingresá tu nombre completo.';
    }
    if (!formData.customerPhone.trim()) {
      errors.customerPhone = 'Por favor ingresá tu número de WhatsApp.';
    }
    if (
      formData.customerEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail.trim())
    ) {
      errors.customerEmail = 'El formato del correo electrónico no es válido.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open confirmation summary
  const handleReviewBooking = () => {
    if (!validateStep3()) return;
    setIsSummaryOpen(true);
  };

  // Final Submit
  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedSlot) return;

    try {
      const result = await createAppointmentMutation.mutateAsync({
        serviceId: selectedService.id,
        scheduledAt: selectedSlot.scheduledAt,
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        customerEmail: formData.customerEmail.trim() || undefined,
      });

      setIsSummaryOpen(false);
      setCreatedAppointment(result);
    } catch {
      // Los errores (403, 409, etc.) se manejan directamente en el onError del hook
      setIsSummaryOpen(false);
    }
  };

  const handleResetFlow = () => {
    setCreatedAppointment(null);
    setCurrentStep(1);
    setSelectedService(null);
    setSelectedSlot(null);
    setFormData({ customerName: '', customerPhone: '', customerEmail: '' });
  };

  if (!businessId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <WarningCircle size={36} className="text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold text-gray-100">Enlace de reserva incompleto</h2>
          <p className="text-xs text-gray-400">
            Falta el identificador del negocio en la dirección web.
          </p>
        </div>
      </div>
    );
  }

  // Si ya se creó la cita, mostrar pantalla de éxito
  if (createdAppointment) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <BookingHeader business={business} isLoading={isLoadingBusiness} />
        <main className="flex-1 flex items-center justify-center p-4">
          <BookingSuccess
            appointment={createdAppointment}
            business={business}
            onReset={handleResetFlow}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col selection:bg-brand-500 selection:text-black">
      {/* Header */}
      <BookingHeader business={business} isLoading={isLoadingBusiness} />

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Error si el negocio no existe o no tiene CITAS */}
        {isServicesError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <WarningCircle size={18} className="shrink-0" />
            <p>
              El servicio de reservas online no está disponible actualmente para este negocio.
              Por favor contactá directamente al local.
            </p>
          </div>
        )}

        {/* Stepper Indicator */}
        <div className="grid grid-cols-3 gap-2 pb-2">
          {/* Paso 1 */}
          <button
            type="button"
            onClick={() => currentStep > 1 && setCurrentStep(1)}
            disabled={currentStep < 1}
            className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all ${
              currentStep === 1
                ? 'bg-gray-800 border-brand-500/60 text-brand-400'
                : currentStep > 1
                ? 'bg-gray-800/40 border-gray-700 text-gray-300 hover:text-white'
                : 'bg-gray-900 border-gray-800 text-gray-600 opacity-60'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep > 1
                  ? 'bg-brand-500 text-black font-bold'
                  : currentStep === 1
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'bg-gray-800 text-gray-500'
              }`}
            >
              1
            </span>
            <span className="truncate">Servicio</span>
          </button>

          {/* Paso 2 */}
          <button
            type="button"
            onClick={() => selectedService && currentStep > 2 && setCurrentStep(2)}
            disabled={!selectedService}
            className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all ${
              currentStep === 2
                ? 'bg-gray-800 border-brand-500/60 text-brand-400'
                : currentStep > 2
                ? 'bg-gray-800/40 border-gray-700 text-gray-300 hover:text-white'
                : 'bg-gray-900 border-gray-800 text-gray-600 opacity-60'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep > 2
                  ? 'bg-brand-500 text-black font-bold'
                  : currentStep === 2
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'bg-gray-800 text-gray-500'
              }`}
            >
              2
            </span>
            <span className="truncate">Fecha y Hora</span>
          </button>

          {/* Paso 3 */}
          <div
            className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold ${
              currentStep === 3
                ? 'bg-gray-800 border-brand-500/60 text-brand-400'
                : 'bg-gray-900 border-gray-800 text-gray-600 opacity-60'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 3
                  ? 'bg-brand-500/20 text-brand-400 font-bold'
                  : 'bg-gray-800 text-gray-500'
              }`}
            >
              3
            </span>
            <span className="truncate">Tus Datos</span>
          </div>
        </div>

        {/* STEP 1: Seleccionar Servicio */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-gray-100">
                Seleccioná el servicio que deseás reservar
              </h2>
              <p className="text-xs text-gray-400">
                Elegí entre los servicios disponibles para ver los días y horarios de atención.
              </p>
            </div>

            <ServiceSelector
              services={services}
              selectedService={selectedService}
              onSelectService={handleSelectService}
              isLoading={isLoadingServices}
            />

            {selectedService && (
              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-black text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  Continuar a fecha y horario
                  <ArrowRight size={15} weight="bold" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Seleccionar Fecha y Horario */}
        {currentStep === 2 && selectedService && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-brand-400 uppercase tracking-wider">
                  Servicio seleccionado
                </span>
                <h2 className="text-base font-bold text-gray-100">
                  {selectedService.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-gray-400 hover:text-white underline underline-offset-2 transition-colors"
              >
                Cambiar
              </button>
            </div>

            <DateTimeSelector
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              slots={availabilityData?.availableSlots || []}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              isLoadingSlots={isLoadingSlots}
            />

            <div className="pt-4 flex items-center justify-between border-t border-gray-800">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white bg-gray-800/60 hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                Atrás
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                disabled={!selectedSlot}
                className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-black text-xs font-bold transition-all shadow-md disabled:opacity-40 flex items-center gap-2"
              >
                Continuar a tus datos
                <ArrowRight size={15} weight="bold" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Datos del Cliente */}
        {currentStep === 3 && selectedService && selectedSlot && (
          <div className="space-y-6">
            <div className="p-3.5 rounded-xl bg-gray-800/50 border border-gray-800 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                  Turno elegido
                </span>
                <span className="font-bold text-gray-100 truncate block">
                  {selectedService.name} • {selectedDate} a las {selectedSlot.startTime}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-xs text-brand-400 hover:underline shrink-0"
              >
                Cambiar turno
              </button>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-gray-100">
                Completá tus datos de contacto
              </h2>
              <p className="text-xs text-gray-400">
                El negocio usará estos datos para notificarte y coordinar tu turno.
              </p>
            </div>

            <CustomerForm
              formData={formData}
              onChange={handleFormChange}
              errors={formErrors}
            />

            <div className="pt-4 flex items-center justify-between border-t border-gray-800">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white bg-gray-800/60 hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                Atrás
              </button>

              <button
                type="button"
                onClick={handleReviewBooking}
                className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-black text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                Revisar y confirmar
                <ArrowRight size={15} weight="bold" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modal Resumen antes de confirmar */}
      {selectedService && selectedSlot && (
        <BookingSummaryModal
          isOpen={isSummaryOpen}
          onClose={() => setIsSummaryOpen(false)}
          onConfirm={handleConfirmBooking}
          isSubmitting={createAppointmentMutation.isPending}
          business={business}
          service={selectedService}
          slot={selectedSlot}
          customerName={formData.customerName}
          customerPhone={formData.customerPhone}
          customerEmail={formData.customerEmail}
        />
      )}
    </div>
  );
};
