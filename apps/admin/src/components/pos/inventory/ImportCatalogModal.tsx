import React, { useMemo, useRef, useState } from 'react';
import {
  X,
  UploadSimple,
  DownloadSimple,
  FileCsv,
  ArrowRight,
  WarningCircle,
  CheckCircle,
  Warning,
  Buildings,
  Info,
  CircleNotch,
} from '@phosphor-icons/react';
import {
  analyzePosProductsImport,
  createPosProductField,
  createPosSupplier,
  downloadPosProductsImportTemplate,
  importPosProducts,
  type PosProductImportAnalyzeResponse,
  type PosProductImportResult,
} from 'api-client';

interface ImportCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  businessId?: string;
  userRole?: string;
  activeDynamicFieldsCount?: number;
}

type DynamicFieldType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'LIST' | 'DATE';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const normalizeLabel = (s: unknown) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\*/g, '')
    .trim()
    .toLowerCase();

/**
 * Si el encabezado coincide exactamente con el nombre de un campo, ese campo manda
 * sobre la sugerencia parcial del API.
 */
function fixMappingByExactLabel(
  data: PosProductImportAnalyzeResponse,
): Record<string, { target: string }> {
  const mapping: Record<string, { target: string }> = { ...(data.suggestedMapping || {}) };
  const byLabel = new Map<string, string>();
  data.targets
    .filter((t) => !t.id.endsWith('_id') && !t.label.endsWith('_id'))
    .forEach((t) => {
      byLabel.set(normalizeLabel(t.label), t.id);
      byLabel.set(normalizeLabel(t.id), t.id);
    });

  const aliases: Record<string, string> = {
    'precio etiqueta': 'listPrice',
    'precio de etiqueta': 'listPrice',
    etiqueta: 'listPrice',
    'list price': 'listPrice',
    'margen %': 'markupPct',
    margen: 'markupPct',
    'margen sobre costo': 'markupPct',
    'margen sobre costo (%)': 'markupPct',
    markup: 'markupPct',
    'aplica iva': 'taxable',
    'aplica iva (si/no)': 'taxable',
    'aplica iva si/no': 'taxable',
    iva: 'taxable',
    gravado: 'taxable',
    taxable: 'taxable',
  };

  const exact: Record<string, string> = {};
  data.headers.forEach((h, i) => {
    const norm = normalizeLabel(h);
    const target = byLabel.get(norm) || aliases[norm];
    if (target) exact[`col_${i}`] = target;
  });

  const exactTargets = new Set(Object.values(exact));
  Object.keys(mapping).forEach((k) => {
    if (!exact[k] && exactTargets.has(mapping[k]?.target)) {
      mapping[k] = { target: 'ignore' };
    }
  });
  Object.entries(exact).forEach(([k, target]) => {
    mapping[k] = { target };
  });
  return mapping;
}

function getApiErrorMessage(err: any, fallback: string): string {
  const status = err?.response?.status;
  const data = err?.response?.data;
  let msg: any = data?.message;
  if (msg && typeof msg === 'object') msg = msg.message || JSON.stringify(msg);
  if (Array.isArray(data?.message)) msg = data.message.join(', ');
  if (status === 502 || status === 503 || status === 504) {
    return 'El servidor no pudo procesar el archivo en este momento. Intentá de nuevo en unos segundos; si persiste, guardá el archivo como CSV y volvé a importarlo.';
  }
  if (!err?.response) {
    return err?.code === 'ECONNABORTED'
      ? 'El servidor tardó demasiado en responder. Intentá de nuevo.'
      : 'No se pudo conectar con el servidor. Revisá la conexión e intentá de nuevo.';
  }
  return (typeof msg === 'string' && msg) || fallback;
}

function validateFileBeforeUpload(selectedFile: File): string | null {
  const lowerName = selectedFile.name.toLowerCase();
  if (lowerName.endsWith('.xls')) {
    return 'El formato antiguo .xls no es compatible. Guardá el archivo como .xlsx o .csv.';
  }
  if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.csv')) {
    return 'Formato no permitido. Solo podés subir archivos .xlsx o .csv.';
  }
  if (selectedFile.size > MAX_FILE_BYTES) {
    return 'El archivo es demasiado grande. El tamaño máximo permitido es 5 MB.';
  }
  return null;
}

export const ImportCatalogModal: React.FC<ImportCatalogModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  businessId,
  userRole = 'CAJERO',
  activeDynamicFieldsCount = 0,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Paso 2: Mapeo de columnas
  const [analyzeData, setAnalyzeData] = useState<PosProductImportAnalyzeResponse | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headerRow, setHeaderRow] = useState(1);
  const [mapping, setMapping] = useState<Record<string, { target: string }>>({});

  // Paso 3: Vista previa
  const [previewData, setPreviewData] = useState<PosProductImportResult | null>(null);
  const [autoCreateSuppliers, setAutoCreateSuppliers] = useState(true);
  const [isCreatingSuppliers, setIsCreatingSuppliers] = useState(false);

  // Paso 4: Resumen final tras importar
  const [importResult, setImportResult] = useState<PosProductImportResult | null>(null);

  // Mini modal para crear campo dinámico desde paso 2
  const [isCreatingField, setIsCreatingField] = useState<string | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<DynamicFieldType>('TEXT');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [fieldCreationError, setFieldCreationError] = useState<{
    isMaxReached: boolean;
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitLockRef = useRef(false);

  const missingSuppliers = useMemo(() => {
    if (!previewData?.warnings) return [];
    const names = new Set<string>();
    for (const w of previewData.warnings) {
      if (w.column === 'supplierId' || (w.message && w.message.toLowerCase().includes('proveedor'))) {
        const match = w.message.match(/proveedor\s+'([^']+)'\s+no encontrado/i);
        if (match?.[1]?.trim()) {
          names.add(match[1].trim());
        }
      }
    }
    return Array.from(names);
  }, [previewData?.warnings]);

  const resetWizard = () => {
    setStep(1);
    setFile(null);
    setIsDragging(false);
    setErrorMsg(null);
    setAnalyzeData(null);
    setSelectedSheet('');
    setHeaderRow(1);
    setMapping({});
    setPreviewData(null);
    setImportResult(null);
    setIsCreatingField(null);
    setFieldCreationError(null);
    setAutoCreateSuppliers(true);
    setIsCreatingSuppliers(false);
    submitLockRef.current = false;
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (isProcessing || isCreatingSuppliers) return;
    resetWizard();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      const blob = await downloadPosProductsImportTemplate(businessId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-productos.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMsg(getApiErrorMessage(err, 'No se pudo descargar la plantilla de tu negocio.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const performAnalyze = async (
    f: File,
    sheet?: string,
    hr?: number,
    preserveExistingMapping?: Record<string, { target: string }>,
  ) => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const data = await analyzePosProductsImport(f, {
        sheet,
        headerRow: hr,
        businessId,
      });
      const cleanTargets = (data.targets || []).filter(
        (t) => !t.id.endsWith('_id') && !t.label.endsWith('_id'),
      );
      const cleanData: PosProductImportAnalyzeResponse = { ...data, targets: cleanTargets };
      setAnalyzeData(cleanData);
      setSelectedSheet(sheet || cleanData.selectedSheet);
      setHeaderRow(hr ?? cleanData.headerRow);
      setMapping(preserveExistingMapping || fixMappingByExactLabel(cleanData));
      setStep(2);
    } catch (err: any) {
      setErrorMsg(
        getApiErrorMessage(
          err,
          'No se pudo analizar el archivo. Asegurate de que sea un .xlsx o .csv válido.',
        ),
      );
      setFile(null);
      setStep(1);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickedFile = async (selectedFile: File) => {
    const validationErr = validateFileBeforeUpload(selectedFile);
    if (validationErr) {
      setErrorMsg(validationErr);
      setFile(null);
      return;
    }
    setFile(selectedFile);
    await performAnalyze(selectedFile);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    e.target.value = '';
    if (!selectedFile || isProcessing) return;
    await handlePickedFile(selectedFile);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isProcessing) return;
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    await handlePickedFile(droppedFile);
  };

  const handleMappingChange = (colIndex: string, target: string) => {
    if (target === 'CREATE_NEW') {
      const idx = parseInt(colIndex.replace('col_', ''), 10);
      setIsCreatingField(colIndex);
      setNewFieldLabel(analyzeData?.headers[idx] || '');
      setNewFieldType('TEXT');
      setNewFieldOptions('');
      setFieldCreationError(null);
      return;
    }
    setMapping((prev) => ({
      ...prev,
      [colIndex]: { target },
    }));
  };

  const handleCreateFieldSubmit = async () => {
    if (!newFieldLabel.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const payload = {
        label: newFieldLabel.trim(),
        dataType: newFieldType,
        options:
          newFieldType === 'SELECT'
            ? newFieldOptions
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
        allowCreateInline: newFieldType === 'LIST' ? true : undefined,
        required: false,
        searchable: false,
        showInPos: false,
      };
      const created = await createPosProductField(payload, businessId);
      const targetKey = created?.key || created?.id;
      const nextMapping =
        isCreatingField && targetKey
          ? {
              ...mapping,
              [isCreatingField]: { target: targetKey },
            }
          : mapping;
      setMapping(nextMapping);
      setIsCreatingField(null);
      if (file) await performAnalyze(file, selectedSheet, headerRow, nextMapping);
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'No se pudo crear el campo.');
      setFieldCreationError({
        isMaxReached: Boolean(err?.response?.status === 400 && msg.includes('máximo')),
        message: msg,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const canProceedToPreview = () => {
    if (!analyzeData) return false;
    const assignedTargets = Object.values(mapping)
      .map((m) => m.target)
      .filter((t) => t !== 'ignore' && t !== 'append_description');
    if (new Set(assignedTargets).size !== assignedTargets.length) return false;

    const requiredTargets = analyzeData.targets.filter((t) => t.required).map((t) => t.id);
    for (const req of requiredTargets) {
      if (!assignedTargets.includes(req)) return false;
    }
    return true;
  };

  const handlePreview = async () => {
    if (!file || !canProceedToPreview() || isProcessing) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await importPosProducts({
        file,
        mapping,
        sheet: selectedSheet,
        headerRow,
        dryRun: true,
        businessId,
      });
      setPreviewData(res);
      setStep(3);
    } catch (err: any) {
      setErrorMsg(getApiErrorMessage(err, 'No se pudo generar la vista previa.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateSuppliersNow = async () => {
    if (!missingSuppliers.length || !file || isCreatingSuppliers) return;
    setIsCreatingSuppliers(true);
    setErrorMsg(null);
    try {
      for (const name of missingSuppliers) {
        try {
          await createPosSupplier({ name }, businessId);
        } catch {
          // Continuar si el proveedor ya existía o falló uno individual
        }
      }
      const res = await importPosProducts({
        file,
        mapping,
        sheet: selectedSheet,
        headerRow,
        dryRun: true,
        businessId,
      });
      setPreviewData(res);
    } catch (err: any) {
      setErrorMsg(getApiErrorMessage(err, 'No se pudieron crear los proveedores automáticamente.'));
    } finally {
      setIsCreatingSuppliers(false);
    }
  };

  const handleConfirm = async () => {
    if (!file || !previewData || submitLockRef.current || isProcessing) return;
    if (previewData.errors.length > 0) return;
    if (previewData.created === 0 && previewData.updated === 0) return;

    submitLockRef.current = true;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      if (autoCreateSuppliers && missingSuppliers.length > 0) {
        for (const name of missingSuppliers) {
          try {
            await createPosSupplier({ name }, businessId);
          } catch {
            // Ignorar conflicto si ya existe
          }
        }
      }

      const finalRes = await importPosProducts({
        file,
        mapping,
        sheet: selectedSheet,
        headerRow,
        dryRun: false,
        businessId,
      });
      setImportResult(finalRes);
      setStep(4);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(getApiErrorMessage(err, 'No se pudo completar la importación.'));
    } finally {
      submitLockRef.current = false;
      setIsProcessing(false);
    }
  };

  const downloadErrorsCsv = () => {
    if (!previewData || previewData.errors.length === 0) return;
    let csvContent = 'Fila,Columna,Error\n';
    previewData.errors.forEach((e) => {
      let msg = e.message.replace(/"/g, '""');
      if (['=', '+', '-', '@'].includes(msg[0])) {
        msg = "'" + msg;
      }
      csvContent += `${e.row},"${e.column || ''}","${msg}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'errores_importacion.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const canCreateFields = userRole === 'SUPERADMIN' || userRole === 'ENCARGADO';
  const recordsToImport = (previewData?.created || 0) + (previewData?.updated || 0);
  const isImportBlocked =
    isProcessing ||
    isCreatingSuppliers ||
    !previewData ||
    previewData.errors.length > 0 ||
    recordsToImport === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-4xl max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Encabezado */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Asistente de importación
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-gray-600">
              <span className={step === 1 ? 'font-bold text-gray-900' : ''}>1. Archivo</span>
              <span>·</span>
              <span className={step === 2 ? 'font-bold text-gray-900' : ''}>2. Columnas</span>
              <span>·</span>
              <span className={step === 3 ? 'font-bold text-gray-900' : ''}>3. Vista previa</span>
              <span>·</span>
              <span className={step === 4 ? 'font-bold text-gray-900' : ''}>4. Resumen</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing || isCreatingSuppliers}
            aria-label="Cerrar asistente"
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-start gap-2">
              <WarningCircle size={18} className="shrink-0 mt-0.5" weight="fill" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isProcessing) setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={handleDrop}
                className={`text-center py-8 px-4 border-2 border-dashed rounded-xl transition-colors ${
                  isDragging
                    ? 'border-purple-500 bg-purple-50/70'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <FileCsv size={44} className="mx-auto text-gray-400 mb-3" />
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  Subí tu archivo Excel o CSV
                </h3>
                <p className="text-xs text-gray-600 mb-4">
                  Arrastralo acá o seleccionalo (.xlsx o .csv, máximo 5 MB y 5,000 filas)
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-4 py-2.5 bg-gray-900 text-white text-xs sm:text-sm font-medium rounded-xl hover:bg-black transition-colors disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <CircleNotch size={16} className="animate-spin" />
                      <span>Analizando...</span>
                    </>
                  ) : (
                    <>
                      <UploadSimple size={16} weight="bold" />
                      <span>Seleccionar archivo</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                <DownloadSimple size={20} className="text-blue-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-blue-900">¿No tenés una plantilla?</h4>
                  <p className="text-xs text-blue-800 mb-2 mt-0.5">
                    Descargá nuestra plantilla precargada con las columnas básicas y los campos configurados para tu negocio.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    disabled={isProcessing}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline disabled:opacity-50 cursor-pointer"
                  >
                    Descargar plantilla de mi negocio
                  </button>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs text-gray-700">
                <h4 className="font-semibold text-gray-900 flex items-center gap-1.5">
                  <Info size={16} className="text-gray-600 shrink-0" />
                  <span>Columnas de la plantilla y ayuda de importación</span>
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Podés importar tu archivo con los encabezados estándar o asignar las columnas en el siguiente paso:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-1">
                  <div className="p-3 bg-white rounded-lg border border-gray-200/80 space-y-1">
                    <span className="font-semibold text-gray-900 block">Columnas básicas:</span>
                    <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                      <li><strong>Nombre del producto *</strong>: nombre del artículo o servicio</li>
                      <li><strong>Precio *</strong>: precio de venta (o costo + margen %)</li>
                      <li><strong>Costo</strong>: costo unitario de compra</li>
                      <li><strong>Existencia (Stock)</strong>: cantidad inicial en inventario</li>
                      <li><strong>Categoría</strong>: se crea si no existe</li>
                      <li><strong>Código de barras / SKU</strong>: códigos identificadores</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-gray-200/80 space-y-1">
                    <span className="font-semibold text-blue-900 block">Precios e impuestos:</span>
                    <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                      <li><strong>Precio etiqueta</strong>: precio de lista o referencia</li>
                      <li><strong>Margen %</strong>: margen sobre costo (ej. 25 para 25 %)</li>
                      <li><strong>Aplica IVA (SI/NO)</strong>: SI para gravados (15 %), NO para exentos</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && analyzeData && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">Mapear columnas</h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-700">
                  {analyzeData.sheets.length > 1 && (
                    <select
                      value={selectedSheet}
                      onChange={(e) => {
                        if (file) void performAnalyze(file, e.target.value, headerRow);
                      }}
                      className="border border-gray-200 rounded-lg py-1.5 pl-2.5 pr-7 text-xs bg-white"
                    >
                      {analyzeData.sheets.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  )}
                  <label className="flex items-center gap-2">
                    <span>Fila de encabezados:</span>
                    <input
                      type="number"
                      min={1}
                      value={headerRow}
                      onChange={(e) => {
                        const hr = parseInt(e.target.value, 10) || 1;
                        if (file) void performAnalyze(file, selectedSheet, hr);
                      }}
                      className="w-16 border border-gray-200 rounded-lg py-1.5 px-2 text-xs"
                    />
                  </label>
                </div>
              </div>

              {/* Vista escritorio (md+): tabla */}
              <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold text-gray-700">Columna en tu archivo</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-700 w-2/5">Destino en el sistema</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-600">Ejemplos de valores</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {analyzeData.headers.map((header, i) => {
                      const colKey = `col_${i}`;
                      const currentTarget = mapping[colKey]?.target || 'ignore';
                      const sampleValues = analyzeData.sampleRows
                        .map((r) => r[i])
                        .filter((v) => v !== undefined && v !== null && v !== '')
                        .slice(0, 3);
                      const isDuplicate =
                        currentTarget !== 'ignore' &&
                        currentTarget !== 'append_description' &&
                        Object.entries(mapping).filter(
                          ([k, m]) => k !== colKey && m.target === currentTarget,
                        ).length > 0;

                      return (
                        <tr key={colKey} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">
                            {header}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={currentTarget}
                              onChange={(e) => handleMappingChange(colKey, e.target.value)}
                              className={`w-full border rounded-lg px-2.5 py-2 text-xs outline-hidden ${
                                isDuplicate
                                  ? 'border-red-400 bg-red-50'
                                  : 'border-gray-200 focus:border-gray-900 bg-white'
                              }`}
                            >
                              <option value="ignore">Ignorar</option>
                              <option value="append_description">-- Añadir a la descripción --</option>
                              <optgroup label="Campos básicos">
                                {analyzeData.targets
                                  .filter((t) => t.kind === 'core')
                                  .map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.label} {t.required ? '*' : ''}
                                    </option>
                                  ))}
                              </optgroup>
                              <optgroup label="Campos de tu negocio">
                                {analyzeData.targets
                                  .filter(
                                    (t) =>
                                      t.kind === 'dynamic' &&
                                      !t.id.endsWith('_id') &&
                                      !t.label.endsWith('_id'),
                                  )
                                  .map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.label} {t.required ? '*' : ''}
                                    </option>
                                  ))}
                              </optgroup>
                              {canCreateFields && (
                                <optgroup label="Nuevo">
                                  <option value="CREATE_NEW">+ Crear campo nuevo...</option>
                                </optgroup>
                              )}
                            </select>
                            {isDuplicate && (
                              <p className="text-xs text-red-600 mt-1">Destino duplicado</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 italic max-w-[200px] truncate">
                            {sampleValues.length > 0 ? sampleValues.join(', ') : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vista móvil (< md, óptima a 375 px): tarjetas apiladas */}
              <div className="md:hidden space-y-2.5">
                {analyzeData.headers.map((header, i) => {
                  const colKey = `col_${i}`;
                  const currentTarget = mapping[colKey]?.target || 'ignore';
                  const sampleValues = analyzeData.sampleRows
                    .map((r) => r[i])
                    .filter((v) => v !== undefined && v !== null && v !== '')
                    .slice(0, 3);
                  const isDuplicate =
                    currentTarget !== 'ignore' &&
                    currentTarget !== 'append_description' &&
                    Object.entries(mapping).filter(
                      ([k, m]) => k !== colKey && m.target === currentTarget,
                    ).length > 0;

                  return (
                    <div
                      key={colKey}
                      className="rounded-xl border border-gray-200 p-3 bg-white space-y-2 text-xs"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-gray-900 break-words">{header}</span>
                        {sampleValues.length > 0 && (
                          <span className="text-gray-500 italic truncate max-w-[160px]">
                            {sampleValues.join(', ')}
                          </span>
                        )}
                      </div>
                      <select
                        aria-label={`Destino para ${header}`}
                        value={currentTarget}
                        onChange={(e) => handleMappingChange(colKey, e.target.value)}
                        className={`w-full border rounded-lg px-2.5 py-2 text-xs outline-hidden ${
                          isDuplicate
                            ? 'border-red-400 bg-red-50'
                            : 'border-gray-200 focus:border-gray-900 bg-white'
                        }`}
                      >
                        <option value="ignore">Ignorar</option>
                        <option value="append_description">-- Añadir a la descripción --</option>
                        <optgroup label="Campos básicos">
                          {analyzeData.targets
                            .filter((t) => t.kind === 'core')
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.label} {t.required ? '*' : ''}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Campos de tu negocio">
                          {analyzeData.targets
                            .filter(
                              (t) =>
                                t.kind === 'dynamic' &&
                                !t.id.endsWith('_id') &&
                                !t.label.endsWith('_id'),
                            )
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.label} {t.required ? '*' : ''}
                              </option>
                            ))}
                        </optgroup>
                        {canCreateFields && (
                          <optgroup label="Nuevo">
                            <option value="CREATE_NEW">+ Crear campo nuevo...</option>
                          </optgroup>
                        )}
                      </select>
                      {isDuplicate && <p className="text-xs text-red-600">Destino duplicado</p>}
                    </div>
                  );
                })}
              </div>

              {(() => {
                const assignedTargets = Object.values(mapping).map((m) => m.target);
                const missingRequired = analyzeData.targets.filter(
                  (t) => t.required && !assignedTargets.includes(t.id),
                );
                if (missingRequired.length > 0) {
                  return (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 rounded-xl flex items-center gap-2">
                      <WarningCircle size={16} className="shrink-0 text-amber-700" />
                      <span>
                        Faltan campos obligatorios: {missingRequired.map((t) => t.label).join(', ')}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              <p className="text-xs text-gray-600">
                Las columnas marcadas como Ignorar no se importarán. Las asignadas a "Añadir a la descripción" se incluirán en la descripción del producto.
              </p>
            </div>
          )}

          {step === 3 && previewData && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">Vista previa</h3>
                <span className="text-xs text-gray-600 font-medium">
                  Total de filas analizadas: {previewData.totalRows}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums">
                    {previewData.created}
                  </p>
                  <p className="text-xs font-medium text-emerald-800">Por crear</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-2xl font-bold text-blue-700 tabular-nums">
                    {previewData.updated}
                  </p>
                  <p className="text-xs font-medium text-blue-800">Por actualizar</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="text-2xl font-bold text-gray-700 tabular-nums">
                    {previewData.unchanged}
                  </p>
                  <p className="text-xs font-medium text-gray-600">Sin cambios</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-2xl font-bold text-red-700 tabular-nums">
                    {previewData.errors.length}
                  </p>
                  <p className="text-xs font-medium text-red-800">Errores</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 col-span-2 sm:col-span-1">
                  <p className="text-2xl font-bold text-amber-700 tabular-nums">
                    {previewData.warnings.length}
                  </p>
                  <p className="text-xs font-medium text-amber-800">Advertencias</p>
                </div>
              </div>

              {previewData.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-red-800 flex items-center gap-1.5">
                    <WarningCircle size={16} weight="fill" />
                    <span>Corregí estos errores antes de importar:</span>
                  </h4>
                  <div className="bg-red-50 border border-red-200 rounded-xl max-h-48 overflow-y-auto p-3 space-y-1.5">
                    {previewData.errors.map((e, i) => (
                      <div
                        key={i}
                        className="text-xs text-red-800 border-b border-red-100 pb-1.5 last:border-0 last:pb-0"
                      >
                        <span className="font-semibold">
                          Fila {e.row}
                          {e.column ? ` (${e.column})` : ''}:
                        </span>{' '}
                        {e.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {missingSuppliers.length > 0 && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Buildings size={18} weight="bold" className="text-amber-700 shrink-0" />
                      <h4 className="text-sm font-semibold text-amber-950">
                        Proveedores no registrados ({missingSuppliers.length})
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateSuppliersNow}
                      disabled={isCreatingSuppliers || isProcessing}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 self-start sm:self-auto cursor-pointer"
                    >
                      {isCreatingSuppliers && <CircleNotch size={14} className="animate-spin" />}
                      <span>
                        {isCreatingSuppliers ? 'Creando proveedores...' : 'Crear ahora y revalidar'}
                      </span>
                    </button>
                  </div>
                  <p className="text-xs text-amber-900">
                    Los siguientes proveedores no existen en el sistema. Podés crearlos automáticamente con su nombre para vincularlos al importar:
                  </p>
                  <div className="flex flex-wrap gap-1.5 bg-white border border-amber-200 rounded-lg p-2.5">
                    {missingSuppliers.map((name) => (
                      <span
                        key={name}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-900 border border-amber-200"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-xs font-medium text-amber-950 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCreateSuppliers}
                      onChange={(e) => setAutoCreateSuppliers(e.target.checked)}
                      className="rounded border-amber-300"
                    />
                    <span>Crear automáticamente al confirmar la importación</span>
                  </label>
                </div>
              )}

              {previewData.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                    <Warning size={16} />
                    <span>Advertencias ({previewData.warnings.length})</span>
                  </h4>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl max-h-36 overflow-y-auto p-3 space-y-1.5">
                    {previewData.warnings.map((w, i) => (
                      <div
                        key={i}
                        className="text-xs text-amber-900 border-b border-amber-100 pb-1 last:border-0 last:pb-0"
                      >
                        <span className="font-semibold">
                          Fila {w.row}
                          {w.column ? ` (${w.column})` : ''}:
                        </span>{' '}
                        {w.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 4 && importResult && (
            <div className="py-4 space-y-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle size={28} weight="fill" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">Importación completada</h3>
                <p className="text-xs text-gray-600">
                  El catálogo de productos se actualizó correctamente.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums">
                    {importResult.created}
                  </p>
                  <p className="text-xs font-medium text-emerald-800">Creados</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-2xl font-bold text-blue-700 tabular-nums">
                    {importResult.updated}
                  </p>
                  <p className="text-xs font-medium text-blue-800">Actualizados</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="text-2xl font-bold text-gray-700 tabular-nums">
                    {importResult.unchanged}
                  </p>
                  <p className="text-xs font-medium text-gray-600">Sin cambios</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-end gap-2.5 shrink-0">
          {step < 4 && (
            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessing || isCreatingSuppliers}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
            >
              Cancelar
            </button>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={resetWizard}
                disabled={isProcessing}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <UploadSimple size={16} />
                <span>Cambiar archivo</span>
              </button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={isProcessing || !canProceedToPreview()}
                className="px-4 py-2 bg-gray-900 text-white text-xs sm:text-sm font-medium rounded-xl hover:bg-black transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <CircleNotch size={16} className="animate-spin" />
                    <span>Validando...</span>
                  </>
                ) : (
                  <>
                    <span>Continuar</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={isProcessing || isCreatingSuppliers}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-40 cursor-pointer"
              >
                Volver
              </button>
              {previewData && previewData.errors.length > 0 && (
                <button
                  type="button"
                  onClick={downloadErrorsCsv}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-white border border-red-200 text-red-700 text-xs sm:text-sm font-medium rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Descargar errores
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isImportBlocked}
                className="px-4 py-2 bg-emerald-600 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:bg-emerald-300 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <CircleNotch size={16} className="animate-spin" />
                    <span>Importando...</span>
                  </>
                ) : (
                  <>
                    <span>Importar {recordsToImport} registros</span>
                    <CheckCircle size={16} />
                  </>
                )}
              </button>
            </>
          )}

          {step === 4 && (
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2 bg-gray-900 hover:bg-black text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>

      {/* Mini modal para crear campo dinámico */}
      {isCreatingField && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Crear nuevo campo dinámico</h3>
            <p className="text-xs text-gray-600">
              Este campo se agregará al catálogo de tu negocio permanentemente ({activeDynamicFieldsCount} de 15 usados) y podrás usarlo para mapear esta columna.
            </p>

            {fieldCreationError ? (
              <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-xs text-red-700 space-y-2">
                <div className="flex items-start gap-1.5 font-medium">
                  <WarningCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{fieldCreationError.message}</span>
                </div>
                {fieldCreationError.isMaxReached && (
                  <div className="pl-5 pt-1 space-y-2">
                    <p>Sugerencia: podés ignorar esta columna o añadirla a la descripción general.</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingField(null);
                          setMapping((prev) => ({
                            ...prev,
                            [isCreatingField]: { target: 'ignore' },
                          }));
                          setFieldCreationError(null);
                        }}
                        className="px-2.5 py-1 bg-white border border-red-200 hover:bg-red-50 rounded text-xs cursor-pointer"
                      >
                        Ignorar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingField(null);
                          setMapping((prev) => ({
                            ...prev,
                            [isCreatingField]: { target: 'append_description' },
                          }));
                          setFieldCreationError(null);
                        }}
                        className="px-2.5 py-1 bg-white border border-red-200 hover:bg-red-50 rounded text-xs cursor-pointer"
                      >
                        Añadir a desc.
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nombre visible
                  </label>
                  <input
                    type="text"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-hidden focus:border-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tipo de dato
                  </label>
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value as DynamicFieldType)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-hidden focus:border-gray-900"
                  >
                    <option value="TEXT">Texto corto</option>
                    <option value="NUMBER">Número</option>
                    <option value="BOOLEAN">Sí/No (casilla)</option>
                    <option value="SELECT">Lista opciones</option>
                    <option value="LIST">Lista administrable (catálogo)</option>
                    <option value="DATE">Fecha</option>
                  </select>
                </div>
                {newFieldType === 'SELECT' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Opciones (separadas por coma)
                    </label>
                    <input
                      type="text"
                      value={newFieldOptions}
                      onChange={(e) => setNewFieldOptions(e.target.value)}
                      placeholder="Ej. Rojo, Verde, Azul"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-hidden focus:border-gray-900"
                    />
                  </div>
                )}
              </>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingField(null);
                  setMapping((prev) => ({
                    ...prev,
                    [isCreatingField]: { target: 'ignore' },
                  }));
                  setFieldCreationError(null);
                }}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              {!fieldCreationError?.isMaxReached && (
                <button
                  type="button"
                  onClick={handleCreateFieldSubmit}
                  disabled={isProcessing || !newFieldLabel.trim()}
                  className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-black disabled:bg-gray-400 cursor-pointer"
                >
                  Crear campo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
