import React from "react";
import {
  Plus,
  Minus,
  Package,
  Wrench,
  Sparkle,
  Stack,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { type PosProductItem } from "api-client";
import { formatCurrency } from "../../../utils/formatters";
import { formatCatalogStockWithForms } from "../../../utils/presentationHelpers";

interface ProductCardProps {
  product: PosProductItem;
  quantityInCart: number;
  onAdd: (product: PosProductItem) => void;
  onDecrement?: (product: PosProductItem) => void;
  disabled?: boolean;
  useListPrice?: boolean;
  onOpenVariantSelector?: (product: PosProductItem) => void;
  onOpenPresentationSelector?: (product: PosProductItem) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantityInCart,
  onAdd,
  onDecrement,
  disabled,
  useListPrice = false,
  onOpenVariantSelector,
  onOpenPresentationSelector,
}) => {
  const isService = product.type === "SERVICE";
  const isRecipe = Boolean(product.isRecipe);
  const isVariantParent = Boolean(product.isVariantParent);
  const activePresentations = (product.presentations || []).filter(
    (p) => p.isActive !== false,
  );
  const hasPresentations = activePresentations.length > 0;
  const trackStock =
    product.trackInventory !== false && !isService && !isVariantParent;
  const stock = typeof product.stock === "number" ? product.stock : 0;
  const isOutOfStock = trackStock && stock <= 0;
  const hasBatches = Boolean(
    product.hasBatches ||
    product.tracksBatches ||
    (typeof product.batchesCount === "number" && product.batchesCount > 0),
  );

  const wholesalePrice = product.wholesalePrice ?? product.wholesale_price;
  const wholesaleMinQty = product.wholesaleMinQty ?? product.wholesale_min_qty;
  const hasWholesale = Boolean(
    wholesalePrice &&
    wholesaleMinQty &&
    wholesaleMinQty >= 2 &&
    wholesalePrice < product.price,
  );
  const hasListDisc = Boolean(
    useListPrice &&
    product.listPrice &&
    Number(product.listPrice) > Number(product.price),
  );
  const rawPromo = product.promoDiscountPct ?? product.promo_discount_pct;
  const promoPct =
    !hasListDisc &&
    rawPromo != null &&
    Number(rawPromo) > 0 &&
    Number(rawPromo) < 100
      ? Number(rawPromo)
      : null;
  const promoPrice = promoPct
    ? Math.round(Number(product.price) * (1 - promoPct / 100) * 100) / 100
    : null;
  const displayPrice = promoPrice !== null ? promoPrice : Number(product.price);

  const vibrateLight = () => {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(15);
      }
    } catch {
      // ignore
    }
  };

  const handleCardAdd = () => {
    if (disabled || isOutOfStock) return;
    vibrateLight();
    if (isVariantParent && onOpenVariantSelector) {
      onOpenVariantSelector(product);
      return;
    }
    if (hasPresentations && onOpenPresentationSelector) {
      onOpenPresentationSelector(product);
      return;
    }
    onAdd(product);
  };

  const handleDecrementClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    vibrateLight();
    onDecrement?.(product);
  };

  const handleIncrementClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || isOutOfStock) return;
    vibrateLight();
    if (isVariantParent && onOpenVariantSelector) {
      onOpenVariantSelector(product);
      return;
    }
    if (hasPresentations && onOpenPresentationSelector) {
      onOpenPresentationSelector(product);
      return;
    }
    onAdd(product);
  };

  const isInteractiveDisabled = Boolean(disabled || isOutOfStock);

  return (
    <div
      role="button"
      tabIndex={isInteractiveDisabled ? -1 : 0}
      aria-disabled={isInteractiveDisabled}
      title={product.name}
      onClick={handleCardAdd}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isInteractiveDisabled) {
          e.preventDefault();
          handleCardAdd();
        }
      }}
      className={`group relative text-left p-2.5 sm:p-3 rounded-2xl border transition-all select-none h-full flex flex-row min-[360px]:flex-col justify-between gap-2.5 min-[360px]:gap-2 ${
        isOutOfStock
          ? "bg-gray-100/80 border-gray-200 opacity-70 cursor-not-allowed"
          : quantityInCart > 0
            ? "bg-emerald-50/40 border-emerald-500 shadow-xs cursor-pointer"
            : "bg-white border-gray-200/90 hover:border-gray-300 shadow-2xs hover:shadow-xs cursor-pointer active:scale-[0.99]"
      }`}
    >
      {/* Bloque superior / izquierdo: Insignias + Nombre completo */}
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        {/* Fila superior de insignias (siempre en su propia línea sin superponerse al nombre) */}
        <div className="flex flex-wrap items-center gap-1">
          {isService ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200/70">
              <Wrench size={12} weight="bold" />
              Servicio
            </span>
          ) : isRecipe ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200/70">
              <Sparkle size={12} weight="bold" />
              Receta
            </span>
          ) : trackStock ? (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
                isOutOfStock
                  ? "bg-red-50 text-red-700 border border-red-200/80"
                  : stock <= 5
                    ? "bg-amber-50 text-amber-800 border border-amber-200/80"
                    : "bg-gray-100 text-gray-700"
              }`}
            >
              <Package size={12} weight="bold" />
              {isOutOfStock
                ? "Agotado"
                : hasPresentations
                  ? formatCatalogStockWithForms(stock, product)
                  : `${stock} ${product.unit || "UND"}`}
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
              Producto
            </span>
          )}

          {hasBatches && (
            <span
              title="Producto controlado por lotes"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200/70"
            >
              <Stack size={12} weight="bold" />
              Lotes
            </span>
          )}

          {isVariantParent && (
            <span
              title="Producto con variantes (tallas, colores, etc.)"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-100 text-purple-900 border border-purple-200"
            >
              <SlidersHorizontal size={12} weight="bold" />
              Variantes
            </span>
          )}

          {hasPresentations && (
            <span
              title={`${activePresentations.length} ${activePresentations.length === 1 ? "forma de venta" : "formas de venta"}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-900 border border-indigo-200"
            >
              <Stack size={12} weight="bold" />
              {activePresentations.length}{" "}
              {activePresentations.length === 1 ? "forma" : "formas"}
            </span>
          )}

          {hasWholesale && (
            <span
              title={`Precio por mayor ${formatCurrency(wholesalePrice!)} desde ${wholesaleMinQty} uds.`}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-100 text-purple-900 border border-purple-200"
            >
              Mayor ≥ {wholesaleMinQty}
            </span>
          )}

          {promoPct && (
            <span
              title={`Oferta de catálogo (-${promoPct}%)`}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"
            >
              -{promoPct}%
            </span>
          )}
        </div>

        {/* Nombre completo (hasta 3 líneas, sin recortes por altura fija) */}
        <div className="font-semibold text-xs sm:text-sm text-gray-900 line-clamp-3 leading-snug break-words">
          {product.name}
        </div>

        {/* En pantallas muy angostas (<360px), precio debajo del nombre dentro de la columna izquierda */}
        <div className="min-[360px]:hidden pt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-bold text-sm text-emerald-800 tabular-nums">
            {formatCurrency(displayPrice)}
          </span>
          {promoPrice !== null ? (
            <span
              className="text-xs font-medium text-gray-500 line-through tabular-nums"
              title={`Precio normal: ${formatCurrency(Number(product.price))}`}
            >
              {formatCurrency(Number(product.price))}
            </span>
          ) : (
            hasListDisc && (
              <span
                className="text-xs font-medium text-gray-500 line-through tabular-nums"
                title={`Precio de etiqueta: ${formatCurrency(Number(product.listPrice))}`}
              >
                {formatCurrency(Number(product.listPrice))}
              </span>
            )
          )}
          {hasWholesale && (
            <span
              className="text-xs font-semibold text-purple-800 tabular-nums"
              title={`Precio por mayor: ${formatCurrency(wholesalePrice!)}`}
            >
              Mayor {formatCurrency(wholesalePrice!)}
            </span>
          )}
        </div>
      </div>

      {/* Pie de tarjeta: Precio (en >=360px) y botones de cantidad >= 44x44px */}
      <div className="flex flex-col justify-end min-[360px]:justify-between min-[360px]:pt-2 min-[360px]:border-t min-[360px]:border-gray-100 gap-2 shrink-0">
        {quantityInCart > 0 ? (
          <>
            {/* Precios completos (>=360px) */}
            <div className="hidden min-[360px]:flex flex-col gap-0.5">
              <span className="font-bold text-sm sm:text-base text-emerald-800 tracking-tight tabular-nums leading-tight">
                {formatCurrency(displayPrice)}
              </span>
              {(hasWholesale || promoPrice !== null || hasListDisc) && (
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  {promoPrice !== null ? (
                    <span
                      className="text-xs font-medium text-gray-500 line-through tabular-nums"
                      title={`Precio normal: ${formatCurrency(Number(product.price))}`}
                    >
                      {formatCurrency(Number(product.price))}
                    </span>
                  ) : (
                    hasListDisc && (
                      <span
                        className="text-xs font-medium text-gray-500 line-through tabular-nums"
                        title={`Precio de etiqueta: ${formatCurrency(Number(product.listPrice))}`}
                      >
                        {formatCurrency(Number(product.listPrice))}
                      </span>
                    )
                  )}
                  {hasWholesale && (
                    <span
                      className="text-xs font-semibold text-purple-800 tabular-nums"
                      title={`Precio por mayor: ${formatCurrency(wholesalePrice!)}`}
                    >
                      Mayor {formatCurrency(wholesalePrice!)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Stepper táctil - cantidad + */}
            <div className="flex items-center justify-between gap-1 bg-white border border-emerald-300 rounded-xl p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handleDecrementClick}
                disabled={disabled}
                aria-label={`Quitar uno de ${product.name}`}
                className="min-w-[44px] min-h-[44px] rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <Minus size={16} weight="bold" />
              </button>
              <span
                className="px-1.5 font-bold text-sm text-emerald-900 tabular-nums text-center min-w-[24px]"
                aria-label={`Cantidad en carrito: ${quantityInCart}`}
              >
                {quantityInCart}
              </span>
              <button
                type="button"
                onClick={handleIncrementClick}
                disabled={isInteractiveDisabled}
                aria-label={`Agregar uno más de ${product.name}`}
                className="min-w-[44px] min-h-[44px] rounded-lg bg-gray-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <Plus size={16} weight="bold" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-2">
            {/* Bloque de precios (>=360px): jamás truncado */}
            <div className="hidden min-[360px]:flex flex-col gap-0.5 min-w-0">
              <span className="font-bold text-sm sm:text-base text-emerald-800 tracking-tight tabular-nums leading-tight">
                {formatCurrency(displayPrice)}
              </span>
              {(hasWholesale || promoPrice !== null || hasListDisc) && (
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  {promoPrice !== null ? (
                    <span
                      className="text-xs font-medium text-gray-500 line-through tabular-nums"
                      title={`Precio normal: ${formatCurrency(Number(product.price))}`}
                    >
                      {formatCurrency(Number(product.price))}
                    </span>
                  ) : (
                    hasListDisc && (
                      <span
                        className="text-xs font-medium text-gray-500 line-through tabular-nums"
                        title={`Precio de etiqueta: ${formatCurrency(Number(product.listPrice))}`}
                      >
                        {formatCurrency(Number(product.listPrice))}
                      </span>
                    )
                  )}
                  {hasWholesale && (
                    <span
                      className="text-xs font-semibold text-purple-800 tabular-nums"
                      title={`Precio por mayor: ${formatCurrency(wholesalePrice!)}`}
                    >
                      Mayor {formatCurrency(wholesalePrice!)}
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleIncrementClick}
              disabled={isInteractiveDisabled}
              aria-label={`Agregar ${product.name}`}
              className={`min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                isInteractiveDisabled
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-gray-900 hover:bg-black text-white shadow-2xs cursor-pointer"
              }`}
            >
              <Plus size={18} weight="bold" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
