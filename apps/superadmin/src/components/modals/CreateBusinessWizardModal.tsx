import React, { useState, useMemo } from 'react';
import {
  Storefront,
  Motorcycle,
  Receipt,
  Wallet,
  CalendarBlank,
  ForkKnife,
  Wrench,
  ShieldCheck,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkle,
  Globe,
  MagnifyingGlass,
  Info,
} from '@phosphor-icons/react';
import apiClient from '../../lib/apiClient';
import { Modal } from '../ui/Modal';
import {
  useCreateBusiness,
  type BusinessType,
  CreateBusinessResult,
} from '../../hooks/useBusinesses';
import { useIndustries, Industry } from '../../hooks/useIndustries';

interface CreateBusinessWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (credentials: { businessName: string; email: string; password?: string }) => void;
}

export const CreateBusinessWizardModal: React.FC<CreateBusinessWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const createMutation = useCreateBusiness();
  const { data: industries = [] } = useIndustries();
  const activeIndustries = useMemo(() => industries.filter((i) => i.isActive), [industries]);

  // Asistente: paso actual (1 a 4)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Paso 1: Negocio
  const [name, setName] = useState('');
  const [industryId, setIndustryId] = useState('');
  const [industrySearch, setIndustrySearch] = useState('');
  const [isIndustryDropdownOpen, setIsIndustryDropdownOpen] = useState(false);
  const [posVertical, setPosVertical] = useState<'RESTAURANTE' | 'RETAIL'>('RESTAURANTE');
  const [salonProfile, setSalonProfile] = useState<'RESTAURANTE' | 'TALLER'>('RESTAURANTE');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [hasCustomizedProfile, setHasCustomizedProfile] = useState(false);

  // Paso 2: Productos contratados (por defecto POS para negocios tipo POS)
  const [hasDelivery, setHasDelivery] = useState(false);
  const [hasPOS, setHasPOS] = useState(true);
  const [hasCarteraCobro, setHasCarteraCobro] = useState(false);
  const [hasCitas, setHasCitas] = useState(false);
  const [hasUserModifiedProducts, setHasUserModifiedProducts] = useState(false);

  // Delivery config
  const [businessType, setBusinessType] = useState<BusinessType>('NEGOCIO');
  const [commissionRate, setCommissionRate] = useState('15');
  const [altCommissionRate, setAltCommissionRate] = useState('12');
  const [altCommissionDistanceKm, setAltCommissionDistanceKm] = useState('40');
  const [dispatchTimeoutMin, setDispatchTimeoutMin] = useState('3');

  // Paso 3: Condiciones y acceso
  // POS
  const [maxDevices, setMaxDevices] = useState('1');
  const [isUnlimitedDevices, setIsUnlimitedDevices] = useState(false);
  const [trialHours, setTrialHours] = useState('');
  const [posMonthlyFee, setPosMonthlyFee] = useState(''); // sugerido: 45.00
  // Acceso Web POS
  const [webAdminEnabled, setWebAdminEnabled] = useState(true);
  const [webBillingEnabled, setWebBillingEnabled] = useState(false);
  const [maxWebDevices, setMaxWebDevices] = useState('2');
  const [isUnlimitedWebDevices, setIsUnlimitedWebDevices] = useState(false);
  const [webBillingMonthlyUsd, setWebBillingMonthlyUsd] = useState('');

  // Tarifas de otros productos
  const [deliveryMonthlyFee, setDeliveryMonthlyFee] = useState('');
  const [carteraMonthlyFee, setCarteraMonthlyFee] = useState('');
  const [citasMonthlyFee, setCitasMonthlyFee] = useState('');

  // Paso 4: Encargado
  const [encargadoName, setEncargadoName] = useState('');
  const [encargadoEmail, setEncargadoEmail] = useState('');
  const [encargadoPassword, setEncargadoPassword] = useState('');

  // Errores de validación por paso
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Industria seleccionada
  const selectedIndustry = useMemo(
    () => activeIndustries.find((i) => i.id === industryId),
    [activeIndustries, industryId]
  );

  // Clasificación del tipo seleccionado
  const industryDeduction = useMemo(() => {
    if (!selectedIndustry) return null;
    const isTaller =
      selectedIndustry.code === 'taller' ||
      selectedIndustry.name.toLowerCase().includes('taller') ||
      selectedIndustry.name.toLowerCase().includes('mecanic') ||
      selectedIndustry.name.toLowerCase().includes('automotriz');

    const isRestaurante =
      selectedIndustry.code === 'restaurante' ||
      selectedIndustry.posVertical === 'RESTAURANTE' ||
      selectedIndustry.name.toLowerCase().includes('restaurante') ||
      selectedIndustry.name.toLowerCase().includes('cafeter') ||
      selectedIndustry.name.toLowerCase().includes('bar') ||
      selectedIndustry.name.toLowerCase().includes('comida');

    const isGeneral = selectedIndustry.code === 'general';

    if (isTaller) {
      return {
        type: 'TALLER' as const,
        posVertical: 'RETAIL' as const,
        salonProfile: 'TALLER' as const,
        label: 'Taller',
        description: 'Bahías de servicio y órdenes automotrices',
        hasClearCorrespondence: true,
      };
    }
    if (isRestaurante) {
      return {
        type: 'RESTAURANTE' as const,
        posVertical: 'RESTAURANTE' as const,
        salonProfile: 'RESTAURANTE' as const,
        label: 'Restaurante',
        description: 'Mesas, comandas y salón comedor',
        hasClearCorrespondence: true,
      };
    }
    if (isGeneral) {
      return {
        type: 'GENERAL' as const,
        posVertical: 'RETAIL' as const,
        salonProfile: 'RESTAURANTE' as const,
        label: 'General',
        description: 'Sin perfil predefinido. Selecciona Restaurante o Taller.',
        hasClearCorrespondence: false,
      };
    }
    // Retail general (farmacia, ferretería, abarrotes, ropa, cosmetiquería)
    return {
      type: 'RETAIL' as const,
      posVertical: (selectedIndustry.posVertical || 'RETAIL') as 'RETAIL' | 'RESTAURANTE',
      salonProfile: 'RESTAURANTE' as const,
      label: 'Retail / Comercio',
      description: 'Punto de venta directo (mostrador). Perfil base Restaurante.',
      hasClearCorrespondence: true,
    };
  }, [selectedIndustry]);

  // Selección de tipo de negocio con deducción automática
  const handleSelectIndustry = (ind: Industry) => {
    setIndustryId(ind.id);
    setIsIndustryDropdownOpen(false);
    setIndustrySearch('');

    // Deducir vertical y perfil si el usuario no los personalizó manualmente
    const isTaller =
      ind.code === 'taller' ||
      ind.name.toLowerCase().includes('taller') ||
      ind.name.toLowerCase().includes('mecanic') ||
      ind.name.toLowerCase().includes('automotriz');

    const isRestaurante =
      ind.code === 'restaurante' ||
      ind.posVertical === 'RESTAURANTE' ||
      ind.name.toLowerCase().includes('restaurante') ||
      ind.name.toLowerCase().includes('cafeter');

    if (!hasCustomizedProfile) {
      if (isTaller) {
        setPosVertical('RETAIL');
        setSalonProfile('TALLER');
      } else if (isRestaurante) {
        setPosVertical('RESTAURANTE');
        setSalonProfile('RESTAURANTE');
      } else {
        setPosVertical(ind.posVertical || 'RETAIL');
        setSalonProfile('RESTAURANTE');
      }
    }

    // Preselección de productos: para tipos POS, queda Sistema POS y NO Delivery
    if (!hasUserModifiedProducts) {
      setHasPOS(true);
      setHasDelivery(false);
      setHasCarteraCobro(false);
      setHasCitas(false);
    }

    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.industryId;
      return copy;
    });
  };

  const handleResetToAutomatic = () => {
    if (!industryDeduction) return;
    setPosVertical(industryDeduction.posVertical);
    setSalonProfile(industryDeduction.salonProfile);
    setHasCustomizedProfile(false);
    setIsAdvancedOpen(false);
  };

  // Filtrado de industrias por búsqueda
  const filteredIndustries = useMemo(() => {
    if (!industrySearch.trim()) return activeIndustries;
    const term = industrySearch.toLowerCase();
    return activeIndustries.filter(
      (i) =>
        i.name.toLowerCase().includes(term) ||
        i.code.toLowerCase().includes(term)
    );
  }, [activeIndustries, industrySearch]);

  // Cálculo de total mensual estimado
  const { totalEstimatedUsd, feesList, missingFeesList } = useMemo(() => {
    const list: Array<{ name: string; amount: number }> = [];
    const missing: string[] = [];

    if (hasPOS) {
      if (posMonthlyFee && !isNaN(Number(posMonthlyFee)) && Number(posMonthlyFee) > 0) {
        list.push({ name: 'Sistema POS', amount: Number(posMonthlyFee) });
      } else {
        missing.push('POS (sin tarifa)');
      }

      if (webAdminEnabled && webBillingEnabled) {
        if (
          webBillingMonthlyUsd &&
          !isNaN(Number(webBillingMonthlyUsd)) &&
          Number(webBillingMonthlyUsd) > 0
        ) {
          list.push({ name: 'Facturación Web', amount: Number(webBillingMonthlyUsd) });
        } else {
          missing.push('Facturación Web (sin tarifa adicional)');
        }
      }
    }

    if (hasDelivery) {
      if (businessType === 'NEGOCIO') {
        if (
          deliveryMonthlyFee &&
          !isNaN(Number(deliveryMonthlyFee)) &&
          Number(deliveryMonthlyFee) > 0
        ) {
          list.push({ name: 'TrackDeli (Membresía)', amount: Number(deliveryMonthlyFee) });
        } else {
          missing.push('TrackDeli (sin tarifa)');
        }
      } else {
        missing.push(`TrackDeli Riders (${commissionRate}% comisión)`);
      }
    }

    if (hasCarteraCobro) {
      if (
        carteraMonthlyFee &&
        !isNaN(Number(carteraMonthlyFee)) &&
        Number(carteraMonthlyFee) > 0
      ) {
        list.push({ name: 'Cartera de Cobro', amount: Number(carteraMonthlyFee) });
      } else {
        missing.push('Cartera de Cobro (sin tarifa)');
      }
    }

    if (hasCitas) {
      if (citasMonthlyFee && !isNaN(Number(citasMonthlyFee)) && Number(citasMonthlyFee) > 0) {
        list.push({ name: 'Citas y Reservas', amount: Number(citasMonthlyFee) });
      } else {
        missing.push('Citas y Reservas (sin tarifa)');
      }
    }

    const total = list.reduce((sum, item) => sum + item.amount, 0);
    return { totalEstimatedUsd: total, feesList: list, missingFeesList: missing };
  }, [
    hasPOS,
    posMonthlyFee,
    webAdminEnabled,
    webBillingEnabled,
    webBillingMonthlyUsd,
    hasDelivery,
    businessType,
    deliveryMonthlyFee,
    commissionRate,
    hasCarteraCobro,
    carteraMonthlyFee,
    hasCitas,
    citasMonthlyFee,
  ]);

  // Validaciones por paso
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!name.trim()) {
        newErrors.name = 'Ingresa el nombre del negocio.';
      }
      if (!industryId) {
        newErrors.industryId = 'Selecciona el tipo de negocio.';
      }
    }

    if (step === 2) {
      if (!hasDelivery && !hasPOS && !hasCarteraCobro && !hasCitas) {
        newErrors.products = 'Debes seleccionar al menos un producto contratado.';
      }
      if (hasDelivery && businessType === 'EMPRESA_RIDERS') {
        const comm = Number(commissionRate);
        if (isNaN(comm) || comm <= 0 || comm > 100) {
          newErrors.commissionRate = 'Ingresa un porcentaje de comisión válido (1-100).';
        }
      }
    }

    if (step === 3) {
      if (hasPOS) {
        if (!isUnlimitedDevices) {
          const devs = parseInt(maxDevices, 10);
          if (isNaN(devs) || devs < 1) {
            newErrors.maxDevices = 'Ingresa una cantidad válida de computadoras (mínimo 1).';
          }
        }
        if (trialHours.trim()) {
          const th = parseInt(trialHours, 10);
          if (isNaN(th) || th < 1) {
            newErrors.trialHours = 'Las horas de prueba deben ser un número entero mayor a 0.';
          }
        }
        if (posMonthlyFee.trim()) {
          const pmf = Number(posMonthlyFee);
          if (isNaN(pmf) || pmf < 0) {
            newErrors.posMonthlyFee = 'La tarifa de POS debe ser un número mayor o igual a 0.';
          }
        }
        if (webAdminEnabled && webBillingEnabled) {
          if (!isUnlimitedWebDevices) {
            const wdevs = parseInt(maxWebDevices, 10);
            if (isNaN(wdevs) || wdevs < 0) {
              newErrors.maxWebDevices = 'Los dispositivos web autorizados no pueden ser negativos.';
            }
          }
          if (webBillingMonthlyUsd.trim()) {
            const wbUsd = Number(webBillingMonthlyUsd);
            if (isNaN(wbUsd) || wbUsd < 0) {
              newErrors.webBillingMonthlyUsd = 'La tarifa del módulo no puede ser negativa.';
            }
          }
        }
      }
      if (hasDelivery && businessType === 'NEGOCIO' && deliveryMonthlyFee.trim()) {
        const dmf = Number(deliveryMonthlyFee);
        if (isNaN(dmf) || dmf < 0) {
          newErrors.deliveryMonthlyFee = 'La tarifa de delivery debe ser un número válido.';
        }
      }
      if (hasCarteraCobro && carteraMonthlyFee.trim()) {
        const cmf = Number(carteraMonthlyFee);
        if (isNaN(cmf) || cmf < 0) {
          newErrors.carteraMonthlyFee = 'La tarifa de cartera debe ser un número válido.';
        }
      }
      if (hasCitas && citasMonthlyFee.trim()) {
        const citmf = Number(citasMonthlyFee);
        if (isNaN(citmf) || citmf < 0) {
          newErrors.citasMonthlyFee = 'La tarifa de citas debe ser un número válido.';
        }
      }
    }

    if (step === 4) {
      if (!encargadoName.trim()) {
        newErrors.encargadoName = 'Ingresa el nombre del primer encargado.';
      }
      if (!encargadoEmail.trim()) {
        newErrors.encargadoEmail = 'Ingresa el correo del encargado.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(encargadoEmail.trim())) {
        newErrors.encargadoEmail = 'Ingresa un formato de correo electrónico válido.';
      }
      if (!encargadoPassword) {
        newErrors.encargadoPassword = 'Crea una contraseña temporal inicial.';
      } else if (encargadoPassword.length < 6) {
        newErrors.encargadoPassword = 'La contraseña debe tener al menos 6 caracteres.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(4, prev + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handlePrev = () => {
    setErrors({});
    setCurrentStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3 | 4);
  };

  // Creación del negocio
  const handleFinalSubmit = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);

    const derivedVertical = posVertical;
    const finalMaxDevices = isUnlimitedDevices ? null : parseInt(maxDevices, 10) || 1;
    const finalTrialHours = trialHours.trim() ? parseInt(trialHours, 10) || null : null;
    const finalPosMonthlyFee = posMonthlyFee.trim() ? Number(posMonthlyFee) : undefined;
    const finalDeliveryMonthlyFee =
      hasDelivery && businessType === 'NEGOCIO' && deliveryMonthlyFee.trim()
        ? Number(deliveryMonthlyFee)
        : undefined;
    const finalCarteraMonthlyFee =
      hasCarteraCobro && carteraMonthlyFee.trim() ? Number(carteraMonthlyFee) : undefined;
    const finalCitasMonthlyFee =
      hasCitas && citasMonthlyFee.trim() ? Number(citasMonthlyFee) : undefined;

    const finalWebAdminEnabled = hasPOS ? webAdminEnabled : false;
    const finalWebBillingEnabled = hasPOS ? (webAdminEnabled ? webBillingEnabled : false) : false;
    const finalMaxWebDevices = hasPOS
      ? isUnlimitedWebDevices
        ? null
        : parseInt(maxWebDevices, 10) || 2
      : null;
    const finalWebBillingMonthlyUsd =
      hasPOS && webBillingMonthlyUsd.trim() ? Number(webBillingMonthlyUsd) : null;

    createMutation.mutate(
      {
        name: name.trim(),
        industryId,
        businessType: hasDelivery ? businessType : 'NEGOCIO',
        commissionRate:
          hasDelivery && businessType === 'EMPRESA_RIDERS'
            ? Number(commissionRate) / 100 || 0.15
            : undefined,
        altCommissionRate:
          hasDelivery && businessType === 'EMPRESA_RIDERS'
            ? Number(altCommissionRate) / 100 || 0.12
            : undefined,
        altCommissionDistanceKm:
          hasDelivery && businessType === 'EMPRESA_RIDERS'
            ? Number(altCommissionDistanceKm) || 40
            : undefined,
        dispatchTimeoutMin:
          hasDelivery && businessType === 'EMPRESA_RIDERS'
            ? Number(dispatchTimeoutMin) || 3
            : undefined,
        hasDelivery,
        deliveryMonthlyFee: finalDeliveryMonthlyFee,
        hasPOS,
        posVertical: hasPOS ? derivedVertical : undefined,
        salonProfile: hasPOS ? salonProfile : undefined,
        maxDevices: hasPOS ? finalMaxDevices : undefined,
        trialHours: hasPOS ? finalTrialHours : undefined,
        posMonthlyFee: finalPosMonthlyFee,
        webAdminEnabled: finalWebAdminEnabled,
        webBillingEnabled: finalWebBillingEnabled,
        maxWebDevices: finalMaxWebDevices,
        webBillingMonthlyUsd: finalWebBillingMonthlyUsd,
        hasCarteraCobro,
        carteraMonthlyFee: finalCarteraMonthlyFee,
        hasCitas,
        citasMonthlyFee: finalCitasMonthlyFee,
        encargado: {
          name: encargadoName.trim(),
          email: encargadoEmail.trim(),
          password: encargadoPassword,
        },
      },
      {
        onSuccess: async (data: CreateBusinessResult) => {
          const bizId = data.business.id;

          try {
            const activationPromises: Promise<any>[] = [];

            if (hasDelivery) {
              activationPromises.push(
                apiClient.post(`/businesses/${bizId}/products/DELIVERY/activate`, {
                  deliveryMonthlyFee: finalDeliveryMonthlyFee,
                  commissionRate:
                    businessType === 'EMPRESA_RIDERS'
                      ? Number(commissionRate) / 100 || 0.15
                      : 0.15,
                  altCommissionRate:
                    businessType === 'EMPRESA_RIDERS'
                      ? Number(altCommissionRate) / 100 || 0.12
                      : 0.12,
                  altCommissionDistanceKm:
                    businessType === 'EMPRESA_RIDERS'
                      ? Number(altCommissionDistanceKm) || 40
                      : 40,
                  dispatchTimeoutMin:
                    businessType === 'EMPRESA_RIDERS'
                      ? Number(dispatchTimeoutMin) || 3
                      : 3,
                  reason: 'Activación inicial al crear negocio',
                })
              );
            }

            if (hasPOS) {
              activationPromises.push(
                apiClient.post(`/businesses/${bizId}/products/POS/activate`, {
                  posVertical: derivedVertical,
                  posMonthlyFee: finalPosMonthlyFee,
                  reason: 'Activación inicial al crear negocio',
                })
              );
              activationPromises.push(
                apiClient.patch(`/superadmin/businesses/${bizId}/pos-subscription`, {
                  salonProfile,
                  maxDevices: finalMaxDevices,
                  trialHours: finalTrialHours,
                  webAdminEnabled: finalWebAdminEnabled,
                  webBillingEnabled: finalWebBillingEnabled,
                  maxWebDevices: finalMaxWebDevices,
                  webBillingMonthlyUsd: finalWebBillingMonthlyUsd,
                })
              );
            }

            if (hasCarteraCobro) {
              activationPromises.push(
                apiClient.post(`/businesses/${bizId}/products/CARTERA_COBRO/activate`, {
                  carteraMonthlyFee: finalCarteraMonthlyFee,
                  reason: 'Activación inicial al crear negocio',
                })
              );
            }

            if (hasCitas) {
              activationPromises.push(
                apiClient.post(`/businesses/${bizId}/products/CITAS/activate`, {
                  citasMonthlyFee: finalCitasMonthlyFee,
                  reason: 'Activación inicial al crear negocio',
                })
              );
            }

            if (activationPromises.length > 0) {
              await Promise.all(activationPromises);
            }
          } catch (activateErr) {
            console.error('Error al activar productos tras crear negocio:', activateErr);
          } finally {
            setIsSubmitting(false);
          }

          onSuccess({
            businessName: data.business.name,
            email: data.encargado.email,
            password: data.encargado.temporaryPassword,
          });
        },
        onError: () => {
          // El hook ya dispara toast de error. Mantenemos todos los datos intactos.
          setIsSubmitting(false);
        },
      }
    );
  };

  // Footer fijo al pie con botones
  const modalFooter = (
    <div className="flex items-center justify-between gap-3">
      <div>
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={handlePrev}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <ArrowLeft size={14} />
            <span>Atrás</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {currentStep < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-black transition-colors shadow-xs cursor-pointer"
          >
            <span>Siguiente</span>
            <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={isSubmitting || createMutation.isPending}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSubmitting || createMutation.isPending ? (
              <span>Creando negocio...</span>
            ) : (
              <>
                <Check size={15} weight="bold" />
                <span>Crear negocio</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Crear Nuevo Negocio"
      subtitle="Asistente de configuración paso a paso"
      maxWidth="max-w-2xl"
      footer={modalFooter}
    >
      <div className="space-y-4">
        {/* Barra de progreso de 4 pasos */}
        <div className="pb-3 border-b border-gray-100">
          <div className="grid grid-cols-4 gap-2">
            {[
              { num: 1, label: 'Negocio' },
              { num: 2, label: 'Productos' },
              { num: 3, label: 'Condiciones' },
              { num: 4, label: 'Confirmación' },
            ].map((step) => {
              const isDone = currentStep > step.num;
              const isCurrent = currentStep === step.num;
              return (
                <div key={step.num} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                        isDone
                          ? 'bg-purple-600 text-white'
                          : isCurrent
                          ? 'bg-gray-900 text-white ring-2 ring-purple-100'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {isDone ? <Check size={11} weight="bold" /> : step.num}
                    </div>
                    <span
                      className={`text-[11px] font-semibold truncate ${
                        isCurrent
                          ? 'text-gray-900'
                          : isDone
                          ? 'text-purple-900'
                          : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  <div
                    className={`h-1 w-full rounded-full transition-all ${
                      isDone
                        ? 'bg-purple-600'
                        : isCurrent
                        ? 'bg-gray-900'
                        : 'bg-gray-100'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ============================================================== */}
        {/* PASO 1: NEGOCIO */}
        {/* ============================================================== */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            {/* Nombre del negocio */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nombre del negocio *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.name;
                      return next;
                    });
                  }
                }}
                placeholder="Ej: Pollos El Buen Sabor"
                autoFocus
                className={`w-full h-10 px-3 rounded-lg border text-xs text-gray-900 bg-white focus:outline-none ${
                  errors.name
                    ? 'border-rose-300 focus:border-rose-500'
                    : 'border-gray-200 focus:border-gray-900'
                }`}
              />
              {errors.name && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.name}</p>
              )}
            </div>

            {/* Tipo de negocio (selector con búsqueda) */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tipo de negocio *
              </label>

              {/* Botón selector que abre el desplegable de búsqueda */}
              <button
                type="button"
                onClick={() => setIsIndustryDropdownOpen(!isIndustryDropdownOpen)}
                className={`w-full h-10 px-3 rounded-lg border text-xs text-left flex items-center justify-between transition-all bg-white cursor-pointer ${
                  errors.industryId
                    ? 'border-rose-300'
                    : isIndustryDropdownOpen
                    ? 'border-gray-900 ring-1 ring-gray-900'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Storefront size={16} className="text-gray-400 shrink-0" />
                  <span className={selectedIndustry ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                    {selectedIndustry
                      ? selectedIndustry.name
                      : 'Selecciona o busca un tipo de negocio...'}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold">
                  {isIndustryDropdownOpen ? 'Cerrar' : 'Elegir'}
                </span>
              </button>

              {errors.industryId && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.industryId}</p>
              )}

              {/* Dropdown flotante con buscador */}
              {isIndustryDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-2 space-y-2 animate-fade-in">
                  <div className="relative">
                    <MagnifyingGlass
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={industrySearch}
                      onChange={(e) => setIndustrySearch(e.target.value)}
                      placeholder="Buscar tipo de negocio..."
                      autoFocus
                      className="w-full h-8 pl-8 pr-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900 bg-gray-50/50"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredIndustries.length === 0 ? (
                      <p className="p-3 text-center text-xs text-gray-400">
                        No se encontraron tipos con "{industrySearch}"
                      </p>
                    ) : (
                      filteredIndustries.map((ind) => {
                        const isSelected = ind.id === industryId;
                        const isTaller =
                          ind.code === 'taller' || ind.name.toLowerCase().includes('taller');
                        return (
                          <div
                            key={ind.id}
                            onClick={() => handleSelectIndustry(ind)}
                            className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                              isSelected
                                ? 'bg-purple-50 text-purple-950 font-semibold border border-purple-200'
                                : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isTaller ? (
                                <Wrench size={14} className="text-amber-600 shrink-0" />
                              ) : ind.posVertical === 'RESTAURANTE' ? (
                                <ForkKnife size={14} className="text-purple-600 shrink-0" />
                              ) : (
                                <Storefront size={14} className="text-blue-600 shrink-0" />
                              )}
                              <span>{ind.name}</span>
                            </div>
                            <span className="text-[10px] font-medium text-gray-400">
                              {isTaller ? 'Taller' : ind.posVertical === 'RETAIL' ? 'Retail' : 'Restaurante'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Recuadro de deducción automática */}
            {selectedIndustry && industryDeduction && (
              <div className="space-y-2.5">
                {industryDeduction.hasClearCorrespondence ? (
                  <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700 shrink-0 mt-0.5">
                        <Sparkle size={16} weight="duotone" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-purple-950">
                          Detectamos: {selectedIndustry.name} → Sistema POS, perfil{' '}
                          {salonProfile === 'TALLER' ? 'Taller' : 'Restaurante'}
                        </p>
                        <p className="text-[11px] text-purple-800/80 mt-0.5">
                          {salonProfile === 'TALLER'
                            ? 'Bahías de servicio y órdenes automotrices.'
                            : 'Mesas, comandas y salón comedor.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                      className="text-xs font-semibold text-purple-700 hover:text-purple-900 underline shrink-0 cursor-pointer"
                    >
                      {isAdvancedOpen ? 'Ocultar' : 'Cambiar'}
                    </button>
                  </div>
                ) : (
                  /* Caso sin correspondencia clara (General) */
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 text-xs font-semibold">
                      <Info size={16} className="text-amber-600 shrink-0" />
                      <span>Este tipo de negocio no tiene un perfil de salón predefinido</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Selecciona si operará como restaurante con mesas o como taller automotriz con bahías de servicio:
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSalonProfile('RESTAURANTE');
                          setHasCustomizedProfile(true);
                        }}
                        className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          salonProfile === 'RESTAURANTE'
                            ? 'border-purple-600 bg-white shadow-2xs text-purple-950 font-bold'
                            : 'border-gray-200 bg-white/70 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <ForkKnife size={14} className="text-purple-700" />
                        <span>Perfil Restaurante</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSalonProfile('TALLER');
                          setHasCustomizedProfile(true);
                        }}
                        className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          salonProfile === 'TALLER'
                            ? 'border-purple-600 bg-white shadow-2xs text-purple-950 font-bold'
                            : 'border-gray-200 bg-white/70 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Wrench size={14} className="text-amber-700" />
                        <span>Perfil Taller</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Opciones avanzadas reveladas con "Cambiar" */}
                {isAdvancedOpen && (
                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">
                        Opciones avanzadas de POS
                      </span>
                      <button
                        type="button"
                        onClick={handleResetToAutomatic}
                        className="text-[11px] text-purple-700 hover:text-purple-900 font-medium cursor-pointer"
                      >
                        Restablecer automático
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Vertical de POS
                        </label>
                        <select
                          value={posVertical}
                          onChange={(e) => {
                            setPosVertical(e.target.value as 'RESTAURANTE' | 'RETAIL');
                            setHasCustomizedProfile(true);
                          }}
                          className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                        >
                          <option value="RESTAURANTE">Restaurante / Comedor</option>
                          <option value="RETAIL">Retail / Comercio</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Perfil del salón
                        </label>
                        <select
                          value={salonProfile}
                          onChange={(e) => {
                            setSalonProfile(e.target.value as 'RESTAURANTE' | 'TALLER');
                            setHasCustomizedProfile(true);
                          }}
                          className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                        >
                          <option value="RESTAURANTE">Restaurante (Mesas y comandas)</option>
                          <option value="TALLER">Taller (Bahías y servicios)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* PASO 2: PRODUCTOS CONTRATADOS */}
        {/* ============================================================== */}
        {currentStep === 2 && (
          <div className="space-y-3.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Selecciona los productos contratados *
              </label>
              <span className="text-[11px] text-gray-400">Al menos uno obligatorio</span>
            </div>

            {errors.products && (
              <p className="text-[11px] text-rose-600 font-medium">{errors.products}</p>
            )}

            {/* Grid 2x2 de productos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tarjeta 1: Sistema POS */}
              <div
                onClick={() => {
                  setHasPOS(!hasPOS);
                  setHasUserModifiedProducts(true);
                }}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  hasPOS
                    ? 'border-purple-600 bg-purple-50/50 shadow-2xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        hasPOS ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <Receipt size={17} weight="duotone" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-gray-900 leading-tight">Sistema POS</p>
                      <p className="text-[11px] text-gray-500">Punto de venta y caja</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                      hasPOS ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {hasPOS && <Check size={12} weight="bold" />}
                  </div>
                </div>

                {hasPOS && (
                  <div className="pt-2 border-t border-purple-200/60 text-[11px] text-purple-950 font-medium">
                    Perfil: <span className="font-bold">{salonProfile === 'TALLER' ? 'Taller' : 'Restaurante'}</span> • Acceso web configurable en paso 3
                  </div>
                )}
              </div>

              {/* Tarjeta 2: TrackDeli (Delivery) */}
              <div
                onClick={() => {
                  setHasDelivery(!hasDelivery);
                  setHasUserModifiedProducts(true);
                }}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  hasDelivery
                    ? 'border-amber-500 bg-amber-50/50 shadow-2xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        hasDelivery ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <Motorcycle size={17} weight="duotone" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-gray-900 leading-tight">TrackDeli (Delivery)</p>
                      <p className="text-[11px] text-gray-500">Despacho y pedidos a domicilio</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                      hasDelivery ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {hasDelivery && <Check size={12} weight="bold" />}
                  </div>
                </div>

                {hasDelivery && (
                  <div className="pt-2 border-t border-amber-200/60 text-[11px] text-amber-950 font-medium">
                    Modelo: <span className="font-bold">{businessType === 'EMPRESA_RIDERS' ? 'Empresa de Riders' : 'Comercio Común'}</span>
                  </div>
                )}
              </div>

              {/* Tarjeta 3: Cartera de Cobro */}
              <div
                onClick={() => {
                  setHasCarteraCobro(!hasCarteraCobro);
                  setHasUserModifiedProducts(true);
                }}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  hasCarteraCobro
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        hasCarteraCobro ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <Wallet size={17} weight="duotone" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-gray-900 leading-tight">Cartera de Cobro</p>
                      <p className="text-[11px] text-gray-500">Ventas a crédito y abonos</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                      hasCarteraCobro ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {hasCarteraCobro && <Check size={12} weight="bold" />}
                  </div>
                </div>

                {hasCarteraCobro && (
                  <div className="pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-950 font-medium">
                    Módulo activo • Tarifa configurable en paso 3
                  </div>
                )}
              </div>

              {/* Tarjeta 4: Citas y Reservas */}
              <div
                onClick={() => {
                  setHasCitas(!hasCitas);
                  setHasUserModifiedProducts(true);
                }}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  hasCitas
                    ? 'border-sky-600 bg-sky-50/50 shadow-2xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        hasCitas ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <CalendarBlank size={17} weight="duotone" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-gray-900 leading-tight">Citas y Reservas</p>
                      <p className="text-[11px] text-gray-500">Agenda online y reservas</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                      hasCitas ? 'bg-sky-600 border-sky-600 text-white' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {hasCitas && <Check size={12} weight="bold" />}
                  </div>
                </div>

                {hasCitas && (
                  <div className="pt-2 border-t border-sky-200/60 text-[11px] text-sky-950 font-medium">
                    Módulo activo • Tarifa configurable en paso 3
                  </div>
                )}
              </div>
            </div>

            {/* Configuración compacta de Delivery si está marcado */}
            {hasDelivery && (
              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Motorcycle size={15} />
                  <span>Modelo de Operación TrackDeli</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBusinessType('NEGOCIO')}
                    className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      businessType === 'NEGOCIO'
                        ? 'border-amber-600 bg-white shadow-2xs font-semibold text-amber-950'
                        : 'border-gray-200 bg-white/70 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-bold">Comercio Común</p>
                    <p className="text-[10px] text-gray-500">Membresía mensual fija</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBusinessType('EMPRESA_RIDERS')}
                    className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      businessType === 'EMPRESA_RIDERS'
                        ? 'border-amber-600 bg-white shadow-2xs font-semibold text-amber-950'
                        : 'border-gray-200 bg-white/70 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-bold">Empresa de Riders</p>
                    <p className="text-[10px] text-gray-500">Comisión por carrera</p>
                  </button>
                </div>

                {businessType === 'EMPRESA_RIDERS' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-amber-200/60">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                        Comisión (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={commissionRate}
                        onChange={(e) => setCommissionRate(e.target.value)}
                        placeholder="15"
                        className="w-full h-8 px-2 rounded-md border border-gray-200 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                        Distancia Larga (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={altCommissionRate}
                        onChange={(e) => setAltCommissionRate(e.target.value)}
                        placeholder="12"
                        className="w-full h-8 px-2 rounded-md border border-gray-200 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                        Distancia (km)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={altCommissionDistanceKm}
                        onChange={(e) => setAltCommissionDistanceKm(e.target.value)}
                        placeholder="40"
                        className="w-full h-8 px-2 rounded-md border border-gray-200 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                        Timeout (min)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={dispatchTimeoutMin}
                        onChange={(e) => setDispatchTimeoutMin(e.target.value)}
                        placeholder="3"
                        className="w-full h-8 px-2 rounded-md border border-gray-200 text-xs bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* PASO 3: CONDICIONES Y ACCESO */}
        {/* ============================================================== */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fade-in">
            {/* Sección POS */}
            {hasPOS && (
              <div className="p-3.5 rounded-xl bg-purple-50/40 border border-purple-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950 uppercase tracking-wider">
                  <Receipt size={16} className="text-purple-700" />
                  <span>Condiciones y Acceso Web — Sistema POS</span>
                </div>

                {/* Computadoras y Prueba */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-gray-700">
                        Computadoras permitidas *
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer text-xs select-none">
                        <input
                          type="checkbox"
                          checked={isUnlimitedDevices}
                          onChange={(e) => {
                            setIsUnlimitedDevices(e.target.checked);
                            if (e.target.checked) setMaxDevices('');
                            else setMaxDevices('1');
                          }}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-3 h-3"
                        />
                        <span className="text-[10px] font-semibold text-gray-600">Sin límite</span>
                      </label>
                    </div>
                    <input
                      type="number"
                      min="1"
                      disabled={isUnlimitedDevices}
                      value={isUnlimitedDevices ? '' : maxDevices}
                      onChange={(e) => setMaxDevices(e.target.value)}
                      placeholder={isUnlimitedDevices ? 'Sin límite' : '1'}
                      className={`w-full h-8 px-2.5 rounded-lg border text-xs bg-white ${
                        isUnlimitedDevices ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
                      }`}
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5">Equipos de escritorio autorizados</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Prueba en horas (opcional)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={trialHours}
                      onChange={(e) => setTrialHours(e.target.value)}
                      placeholder="Ej: 24 (vacío = sin prueba)"
                      className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs bg-white"
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Empieza a contar en el primer inicio de sesión
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Tarifa mensual POS en USD
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={posMonthlyFee}
                        onChange={(e) => setPosMonthlyFee(e.target.value)}
                        placeholder="45.00"
                        className="w-full h-8 pl-6 pr-2.5 rounded-lg border border-gray-200 text-xs bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Tarifa sugerida: $45.00</p>
                  </div>
                </div>

                {/* Subsección: Acceso Web */}
                <div className="pt-3 border-t border-purple-200/60 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                    <Globe size={15} className="text-purple-700" />
                    <span>Niveles de Acceso Web</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Interruptor 1: Web Admin Básico */}
                    <div className="p-3 rounded-xl border bg-white border-purple-200/80 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-bold text-gray-900">
                            Web admin básico (reportes y consulta)
                          </span>
                        </div>
                        <p className="text-[10px] text-purple-800/80 leading-tight">
                          Incluido en la membresía. Acceso a reportes y métricas.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const next = !webAdminEnabled;
                          if (!next && webBillingEnabled) {
                            if (
                              window.confirm(
                                'Al desactivar el Web Admin básico, también se apagará la facturación web. ¿Deseas continuar?'
                              )
                            ) {
                              setWebAdminEnabled(false);
                              setWebBillingEnabled(false);
                            }
                          } else {
                            setWebAdminEnabled(next);
                          }
                        }}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          webAdminEnabled ? 'bg-purple-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            webAdminEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Interruptor 2: Facturar desde la web */}
                    <div
                      className={`p-3 rounded-xl border bg-white flex items-center justify-between gap-3 transition-all ${
                        !webAdminEnabled ? 'opacity-50 border-gray-200 bg-gray-50' : 'border-purple-200/80'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-bold text-gray-900">
                            Facturar desde la web (módulo adicional)
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-tight">
                          {!webAdminEnabled
                            ? 'Requiere Web admin básico activo.'
                            : 'Permite a los cajeros cobrar desde navegador o celular.'}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={!webAdminEnabled}
                        onClick={() => {
                          if (!webAdminEnabled) return;
                          setWebBillingEnabled(!webBillingEnabled);
                        }}
                        className={`relative inline-flex h-5 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          !webAdminEnabled
                            ? 'bg-gray-200 cursor-not-allowed'
                            : webBillingEnabled
                            ? 'bg-purple-600 cursor-pointer'
                            : 'bg-gray-200 cursor-pointer'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            webBillingEnabled && webAdminEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Configuración de facturación web si está activa */}
                  {webAdminEnabled && webBillingEnabled && (
                    <div className="p-3 rounded-xl bg-white border border-purple-200 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-gray-700">
                            Dispositivos web autorizados *
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer text-xs select-none">
                            <input
                              type="checkbox"
                              checked={isUnlimitedWebDevices}
                              onChange={(e) => {
                                setIsUnlimitedWebDevices(e.target.checked);
                                if (e.target.checked) setMaxWebDevices('');
                                else setMaxWebDevices('2');
                              }}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-3 h-3"
                            />
                            <span className="text-[10px] font-semibold text-gray-600">Ilimitado</span>
                          </label>
                        </div>
                        <input
                          type="number"
                          min="0"
                          disabled={isUnlimitedWebDevices}
                          value={isUnlimitedWebDevices ? '' : maxWebDevices}
                          onChange={(e) => setMaxWebDevices(e.target.value)}
                          placeholder={isUnlimitedWebDevices ? 'Ilimitado' : '2'}
                          className={`w-full h-8 px-2.5 rounded-lg border text-xs bg-white ${
                            isUnlimitedWebDevices ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
                          }`}
                        />
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Por defecto: 2 teléfonos/navegadores simultáneos
                        </p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Tarifa mensual del módulo en USD (opcional)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={webBillingMonthlyUsd}
                            onChange={(e) => setWebBillingMonthlyUsd(e.target.value)}
                            placeholder="15.00"
                            className="w-full h-8 pl-6 pr-2.5 rounded-lg border border-gray-200 text-xs bg-white"
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Cuota adicional por emitir cobros desde la web
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Condiciones de Delivery si está contratado */}
            {hasDelivery && businessType === 'NEGOCIO' && (
              <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 uppercase tracking-wider">
                  <Motorcycle size={16} className="text-amber-700" />
                  <span>Condiciones TrackDeli (Delivery)</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Tarifa mensual Delivery en USD (opcional)
                  </label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={deliveryMonthlyFee}
                      onChange={(e) => setDeliveryMonthlyFee(e.target.value)}
                      placeholder="35.00"
                      className="w-full h-8 pl-6 pr-2.5 rounded-lg border border-gray-200 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Condiciones Cartera de Cobro */}
            {hasCarteraCobro && (
              <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  <Wallet size={16} className="text-emerald-700" />
                  <span>Condiciones Cartera de Cobro</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Tarifa mensual Cartera en USD (opcional)
                  </label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={carteraMonthlyFee}
                      onChange={(e) => setCarteraMonthlyFee(e.target.value)}
                      placeholder="29.99"
                      className="w-full h-8 pl-6 pr-2.5 rounded-lg border border-gray-200 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Condiciones Citas */}
            {hasCitas && (
              <div className="p-3.5 rounded-xl bg-sky-50/40 border border-sky-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950 uppercase tracking-wider">
                  <CalendarBlank size={16} className="text-sky-700" />
                  <span>Condiciones Citas y Reservas</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Tarifa mensual Citas en USD (opcional)
                  </label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={citasMonthlyFee}
                      onChange={(e) => setCitasMonthlyFee(e.target.value)}
                      placeholder="25.00"
                      className="w-full h-8 pl-6 pr-2.5 rounded-lg border border-gray-200 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* PASO 4: ENCARGADO Y CONFIRMACIÓN */}
        {/* ============================================================== */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-fade-in">
            {/* Formulario del encargado */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 uppercase tracking-wider">
                <ShieldCheck size={16} className="text-purple-700" />
                <span>Primer Encargado del Negocio</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={encargadoName}
                    onChange={(e) => setEncargadoName(e.target.value)}
                    placeholder="Ej: Carlos López"
                    className={`w-full h-9 px-2.5 rounded-lg border text-xs bg-white ${
                      errors.encargadoName ? 'border-rose-400' : 'border-gray-200'
                    }`}
                  />
                  {errors.encargadoName && (
                    <p className="text-[10px] text-rose-600 mt-0.5">{errors.encargadoName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Correo electrónico *
                  </label>
                  <input
                    type="email"
                    value={encargadoEmail}
                    onChange={(e) => setEncargadoEmail(e.target.value)}
                    placeholder="carlos@demo.com"
                    className={`w-full h-9 px-2.5 rounded-lg border text-xs bg-white ${
                      errors.encargadoEmail ? 'border-rose-400' : 'border-gray-200'
                    }`}
                  />
                  {errors.encargadoEmail && (
                    <p className="text-[10px] text-rose-600 mt-0.5">{errors.encargadoEmail}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Contraseña temporal *
                  </label>
                  <input
                    type="password"
                    value={encargadoPassword}
                    onChange={(e) => setEncargadoPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={`w-full h-9 px-2.5 rounded-lg border text-xs bg-white ${
                      errors.encargadoPassword ? 'border-rose-400' : 'border-gray-200'
                    }`}
                  />
                  {errors.encargadoPassword && (
                    <p className="text-[10px] text-rose-600 mt-0.5">{errors.encargadoPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tarjeta de Resumen antes de guardar */}
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/80 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-purple-200/60">
                <span className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                  Resumen de Contratación
                </span>
                <span className="text-[11px] font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-md">
                  Listo para crear
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Negocio
                  </span>
                  <p className="font-bold text-gray-900 truncate">{name || 'Sin nombre'}</p>
                  <p className="text-[11px] text-gray-500">{selectedIndustry?.name}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Productos Activos
                  </span>
                  <div className="flex items-center gap-1 flex-wrap mt-0.5">
                    {hasPOS && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-900 border border-purple-200">
                        POS
                      </span>
                    )}
                    {hasDelivery && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                        Delivery
                      </span>
                    )}
                    {hasCarteraCobro && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-200">
                        Cartera
                      </span>
                    )}
                    {hasCitas && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-900 border border-sky-200">
                        Citas
                      </span>
                    )}
                  </div>
                </div>

                {hasPOS && (
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Perfil & Equipos
                    </span>
                    <p className="font-semibold text-gray-900">
                      Perfil {salonProfile === 'TALLER' ? 'Taller' : 'Restaurante'}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {isUnlimitedDevices ? 'Equipos ilimitados' : `${maxDevices || 1} equipo(s)`} •{' '}
                      {trialHours.trim() ? `${trialHours}h prueba` : 'Sin prueba'}
                    </p>
                  </div>
                )}

                {hasPOS && (
                  <div className="sm:col-span-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Acceso Web POS
                    </span>
                    <p className="font-semibold text-gray-900">
                      {webAdminEnabled ? 'Web Admin básico: Activo' : 'Web Admin: Desactivado'}
                      {' • '}
                      {webBillingEnabled && webAdminEnabled
                        ? `Facturación Web: Activa (${
                            isUnlimitedWebDevices ? 'Ilimitada' : `${maxWebDevices || 2} disp.`
                          })`
                        : 'Facturación Web: Desactivada'}
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Primer Encargado
                  </span>
                  <p className="font-bold text-gray-900 truncate">{encargadoName || '—'}</p>
                  <p className="text-[11px] text-gray-500 truncate">{encargadoEmail || '—'}</p>
                </div>
              </div>

              {/* Total mensual estimado en USD */}
              <div className="pt-3 border-t border-purple-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                    Total Mensual Estimado
                  </span>
                  {feesList.length > 0 ? (
                    <p className="text-[11px] text-gray-600">
                      {feesList.map((f) => `${f.name}: $${f.amount.toFixed(2)}`).join(' + ')}
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-500">Sin cuotas fijas mensuales registradas</p>
                  )}
                  {missingFeesList.length > 0 && (
                    <p className="text-[10px] text-gray-400 italic">
                      * Estimado. No incluye: {missingFeesList.join(', ')}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-base sm:text-lg font-black text-purple-950 font-mono">
                    ${totalEstimatedUsd.toFixed(2)}{' '}
                    <span className="text-xs font-semibold text-purple-700">USD/mes</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
