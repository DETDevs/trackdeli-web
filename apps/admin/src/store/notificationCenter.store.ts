import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  apiClient,
  getPosNotificationCenter,
  type MembershipAlertSummary,
  type PosNotificationCenterResponse,
  type SystemNotificationItem,
  type SystemNotificationSeverity,
} from 'api-client';
import { useAuthStore } from './auth.store';
import { formatCurrency } from '../utils/formatters';
import {
  getDaysToExpiry,
  getManaguaTodayYmd,
  isBatchExpiredDate,
  round2,
} from '../utils/batchExpiry';

const SEVERITY_RANK: Record<SystemNotificationSeverity, number> = {
  CRITICAL: 0,
  WARNING: 1,
  INFO: 2,
};

export interface NotificationFetchContext {
  hasPos?: boolean;
  hasCartera?: boolean;
  tracksBatches?: boolean;
}

function getScopeKey(): string {
  const user = useAuthStore.getState().user;
  return `${user?.businessId || 'none'}:${user?.id || 'anon'}`;
}

function getTomorrowSixAmManaguaMs(): number {
  const todayYmd = getManaguaTodayYmd();
  const [y, m, d] = todayYmd.split('-').map(Number);
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
  return tomorrow.getTime();
}

function daysUntilCalendarIso(
  isoStr: string | null | undefined,
  todayYmd: string,
): number | null {
  if (!isoStr) return null;
  const targetYmd = String(isoStr).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetYmd)) return null;
  const [ty, tm, td] = targetYmd.split('-').map(Number);
  const [ny, nm, nd] = todayYmd.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(ny, nm - 1, nd)) / 86400000);
}

async function buildWebClientFallbackItems(
  ctx: NotificationFetchContext,
): Promise<SystemNotificationItem[]> {
  const user: any = useAuthStore.getState().user;
  if (!user) return [];

  const role = String(user.role || '').toUpperCase();
  const isManager = role === 'SUPERADMIN' || role === 'ENCARGADO';
  const hasPos = ctx.hasPos ?? Boolean(user.business?.hasPOS ?? true);
  const hasCartera = ctx.hasCartera ?? Boolean(user.business?.hasCarteraCobro ?? false);
  const tracksBatches = ctx.tracksBatches ?? Boolean(user.business?.tracksBatches ?? false);
  const todayYmd = getManaguaTodayYmd();

  const items: SystemNotificationItem[] = [];
  const expiredQtyByProduct = new Map<string, number>();

  if (!isManager) {
    if (hasPos && ['CAJERO', 'VENDEDOR'].includes(role)) {
      try {
        const qRes = await apiClient.get('/pos/quotes', {
          params: { status: 'SENT', limit: 50 },
        });
        const quotesList: any[] =
          qRes.data?.data || (Array.isArray(qRes.data) ? qRes.data : []);
        const soonLimit = Date.now() + 3 * 24 * 60 * 60 * 1000;
        const expiringQuotes = quotesList.filter((q) => {
          if (!q.expiresAt) return false;
          const expMs = new Date(q.expiresAt).getTime();
          return expMs > Date.now() && expMs <= soonLimit;
        });
        if (expiringQuotes.length > 0) {
          items.push({
            id: 'QUOTES_EXPIRING_SOON',
            fingerprint: `QUOTES_EXPIRING_SOON:${expiringQuotes.length}:${expiringQuotes[0].id}`,
            category: 'OPERATIONS',
            severity: 'INFO',
            title: `${expiringQuotes.length} ${expiringQuotes.length === 1 ? 'proforma emitida por vencer' : 'proformas emitidas por vencer'}`,
            body: 'Vencen en los próximos 3 días. Podés darles seguimiento antes de que expiren.',
            count: expiringQuotes.length,
            highlights: expiringQuotes
              .slice(0, 3)
              .map((q) => `${q.quoteNumber} · ${q.customerName || 'Sin cliente'}`),
            redirect: {
              route: '/quotes',
              state: { statusFilter: 'SENT' },
              actionLabel: 'Ver proformas emitidas',
            },
          });
        }
      } catch {
        // Silencioso en fallback
      }
    }
    return items;
  }

  const [productsRes, expiringRes, creditRes, payablesRes, quotesRes] =
    await Promise.allSettled([
      hasPos ? apiClient.get('/pos/products') : Promise.resolve({ data: [] }),
      hasPos && tracksBatches
        ? apiClient.get('/pos/inventory/batches/expiring?days=30')
        : Promise.resolve({ data: { items: [] } }),
      hasCartera
        ? apiClient.get('/pos/reports/credit-summary', {
            params: { page: 1, limit: 200 },
          })
        : Promise.resolve({ data: null }),
      hasCartera
        ? apiClient.get('/pos/payables/summary')
        : Promise.resolve({ data: null }),
      hasPos
        ? apiClient.get('/pos/quotes', { params: { status: 'SENT', limit: 50 } })
        : Promise.resolve({ data: { data: [] } }),
    ]);

  if (expiringRes.status === 'fulfilled' && hasPos && tracksBatches) {
    const rawBatches: any[] =
      expiringRes.value.data?.items || expiringRes.value.data?.batches || [];
    let expCount = 0;
    let expUnits = 0;
    let expLoss = 0;
    const expHighlights: string[] = [];
    let critCount = 0;
    let critRisk = 0;
    const critHighlights: string[] = [];
    let noDateCount = 0;
    const noDateHighlights: string[] = [];

    for (const b of rawBatches) {
      const qty = Number(b.currentQuantity ?? b.quantity ?? 0);
      if (qty <= 0) continue;
      const prodName = b.product?.name || 'Producto';
      const prodId = b.productId || b.product?.id;
      const cost = Number(b.unitCost ?? b.cost ?? b.product?.cost ?? 0);
      const val = round2(qty * cost);

      if (!b.expiryDate) {
        noDateCount++;
        if (noDateHighlights.length < 3) {
          noDateHighlights.push(`${prodName} (${b.batchNumber})`);
        }
        continue;
      }

      const days = getDaysToExpiry(b.expiryDate);
      if (isBatchExpiredDate(b.expiryDate)) {
        expCount++;
        expUnits += qty;
        expLoss = round2(expLoss + val);
        if (prodId) {
          expiredQtyByProduct.set(
            prodId,
            (expiredQtyByProduct.get(prodId) || 0) + qty,
          );
        }
        if (expHighlights.length < 3) {
          expHighlights.push(`${prodName} · Lote ${b.batchNumber} (${qty} UND)`);
        }
      } else if (days !== null && days <= 30) {
        critCount++;
        critRisk = round2(critRisk + val);
        if (critHighlights.length < 3) {
          critHighlights.push(
            `${prodName} · Lote ${b.batchNumber} (${days === 0 ? 'hoy' : `en ${days} d`})`,
          );
        }
      }
    }

    if (expCount > 0) {
      items.push({
        id: 'BATCH_EXPIRED',
        fingerprint: `BATCH_EXPIRED:${expCount}:${expUnits}:${expLoss}`,
        category: 'EXPIRY',
        severity: 'CRITICAL',
        title: `${expCount} ${expCount === 1 ? 'lote vencido en inventario' : 'lotes vencidos en inventario'} · ${formatCurrency(expLoss)}`,
        body: `Hay ${Math.round(expUnits * 100) / 100} unidades vencidas en stock contable que no se pueden vender y representan pérdida directa.`,
        count: expCount,
        amount: expLoss,
        currency: 'NIO',
        highlights: expHighlights,
        redirect: {
          route: '/reports',
          state: { tab: 'batches', subTab: 'losses' },
          actionLabel: 'Ver pérdidas y dar de baja',
        },
      });
    }

    if (critCount > 0) {
      items.push({
        id: 'BATCH_EXPIRING_30D',
        fingerprint: `BATCH_EXPIRING_30D:${critCount}:${critRisk}`,
        category: 'EXPIRY',
        severity: 'WARNING',
        title: `${critCount} ${critCount === 1 ? 'lote crítico por vencer (≤30 d)' : 'lotes críticos por vencer (≤30 d)'}`,
        body: `Capital en riesgo: ${formatCurrency(critRisk)}. Priorizá su rotación antes de que venza.`,
        count: critCount,
        amount: critRisk,
        currency: 'NIO',
        highlights: critHighlights,
        redirect: {
          route: '/reports',
          state: {
            tab: 'batches',
            subTab: 'expirations',
            statusFilter: 'CRITICAL',
          },
          actionLabel: 'Ver alertas de lotes',
        },
      });
    }

    if (noDateCount > 0) {
      items.push({
        id: 'BATCH_NO_DATE',
        fingerprint: `BATCH_NO_DATE:${noDateCount}`,
        category: 'EXPIRY',
        severity: 'INFO',
        title: `${noDateCount} ${noDateCount === 1 ? 'lote sin fecha de vencimiento' : 'lotes sin fecha de vencimiento'}`,
        body: 'Completá la fecha para activar las alertas y prioridad FEFO.',
        count: noDateCount,
        highlights: noDateHighlights,
        redirect: {
          route: '/reports',
          state: {
            tab: 'batches',
            subTab: 'expirations',
            statusFilter: 'NO_DATE',
          },
          actionLabel: 'Completar fechas',
        },
      });
    }
  }

  if (productsRes.status === 'fulfilled' && hasPos) {
    const prodList: any[] = Array.isArray(productsRes.value.data)
      ? productsRes.value.data
      : [];
    const outList: string[] = [];
    const lowList: string[] = [];
    const nearLowList: string[] = [];
    const noCostList: string[] = [];

    for (const p of prodList) {
      if (p.isActive === false || p.type === 'SERVICE' || p.isService) continue;
      if (!p.isRecipe && (p.cost === null || Number(p.cost) <= 0)) {
        noCostList.push(p.name);
      }
      if (p.trackStock === false) continue;

      const rawStock = Number(p.stock || 0);
      const expiredQty = Number(
        p.expiredQty ?? expiredQtyByProduct.get(p.id) ?? 0,
      );
      const sellable = Math.max(0, rawStock - expiredQty);
      const min = Number(p.minStock || 0);
      const unit = p.unit || 'UND';

      if (sellable <= 0) {
        outList.push(
          `${p.name} (${expiredQty > 0 && rawStock > 0 ? '100% vencido' : `0 ${unit}`})`,
        );
      } else if (min > 0 && sellable <= min) {
        lowList.push(`${p.name} (${sellable}/${min} ${unit})`);
      } else if (
        min > 0 &&
        sellable > min &&
        sellable <= Math.max(min + 2, Math.ceil(min * 1.35))
      ) {
        nearLowList.push(`${p.name} · ${sellable} (mín. ${min})`);
      }
    }

    if (outList.length > 0) {
      items.push({
        id: 'STOCK_OUT',
        fingerprint: `STOCK_OUT:${outList.length}:${outList.slice(0, 3).join(',')}`,
        category: 'INVENTORY',
        severity: 'CRITICAL',
        title: `${outList.length} ${outList.length === 1 ? 'producto agotado' : 'productos agotados'}`,
        body: 'Sin existencias disponibles para la venta en punto de venta.',
        count: outList.length,
        highlights: outList.slice(0, 3),
        redirect: {
          route: '/products',
          state: { filter: 'OUT' },
          actionLabel: 'Ver productos agotados',
        },
      });
    }
    if (lowList.length > 0) {
      items.push({
        id: 'STOCK_LOW',
        fingerprint: `STOCK_LOW:${lowList.length}`,
        category: 'INVENTORY',
        severity: 'WARNING',
        title: `${lowList.length} ${lowList.length === 1 ? 'producto con stock bajo' : 'productos con stock bajo'}`,
        body: 'Alcanzaron o bajaron del stock mínimo configurado. Planificá reabastecimiento.',
        count: lowList.length,
        highlights: lowList.slice(0, 3),
        redirect: {
          route: '/products',
          state: { filter: 'LOW' },
          actionLabel: 'Ver stock bajo',
        },
      });
    }
    if (nearLowList.length > 0) {
      items.push({
        id: 'STOCK_NEAR_LOW',
        fingerprint: `STOCK_NEAR_LOW:${nearLowList.length}`,
        category: 'INVENTORY',
        severity: 'INFO',
        title: `${nearLowList.length} ${nearLowList.length === 1 ? 'producto próximo a stock mínimo' : 'productos próximos a stock mínimo'}`,
        body: 'A punto de entrar en alerta de bajo stock. Podés anticipar la compra.',
        count: nearLowList.length,
        highlights: nearLowList.slice(0, 3),
        redirect: {
          route: '/products',
          state: { filter: 'NEAR_LOW' },
          actionLabel: 'Ver próximos a mínimo',
        },
      });
    }
    if (noCostList.length > 0) {
      items.push({
        id: 'PRODUCT_NO_COST',
        fingerprint: `PRODUCT_NO_COST:${noCostList.length}`,
        category: 'INVENTORY',
        severity: 'INFO',
        title: `${noCostList.length} ${noCostList.length === 1 ? 'producto sin costo registrado' : 'productos sin costo registrado'}`,
        body: 'Completá el costo unitario para calcular ganancias reales y pérdidas exactas.',
        count: noCostList.length,
        highlights: noCostList.slice(0, 3),
        redirect: {
          route: '/products',
          state: { filter: 'NO_COST' },
          actionLabel: 'Completar costos',
        },
      });
    }
  }

  if (creditRes.status === 'fulfilled' && creditRes.value.data && hasCartera) {
    const breakdown: any[] = creditRes.value.data.breakdownByCustomer || [];
    const overdueCusts = breakdown.filter(
      (c) => c.hasOverdue && Number(c.overdueDebt || 0) > 0,
    );
    if (overdueCusts.length > 0) {
      const totalOverdue = round2(
        overdueCusts.reduce((s, c) => s + Number(c.overdueDebt || 0), 0),
      );
      items.push({
        id: 'CREDIT_OVERDUE',
        fingerprint: `CREDIT_OVERDUE:${overdueCusts.length}:${totalOverdue}`,
        category: 'RECEIVABLES',
        severity: 'CRITICAL',
        title: `${overdueCusts.length} ${overdueCusts.length === 1 ? 'cliente moroso' : 'clientes morosos'} · ${formatCurrency(totalOverdue)}`,
        body: `${overdueCusts[0].customer?.name || 'Cliente'} mantiene saldo vencido por cobrar.`,
        count: overdueCusts.length,
        amount: totalOverdue,
        currency: 'NIO',
        highlights: overdueCusts
          .slice(0, 3)
          .map(
            (c) =>
              `${c.customer?.name || 'Cliente'} (${formatCurrency(Number(c.overdueDebt || 0))})`,
          ),
        redirect: {
          route: '/finances',
          state: { tab: 'receivables', filter: 'OVERDUE' },
          actionLabel: 'Ver clientes morosos',
        },
      });
    }

    const dueSoonCusts: Array<{ name: string; amount: number; minDays: number }> = [];
    for (const c of breakdown) {
      const accs: any[] = c.accounts || [];
      let custSoonAmt = 0;
      let custMinDays = 999;
      for (const a of accs) {
        const d = daysUntilCalendarIso(a.dueDate, todayYmd);
        if (d !== null && d >= 0 && d <= 5 && Number(a.balance || 0) > 0) {
          custSoonAmt = round2(custSoonAmt + Number(a.balance || 0));
          custMinDays = Math.min(custMinDays, d);
        }
      }
      if (custSoonAmt > 0) {
        dueSoonCusts.push({
          name: c.customer?.name || 'Cliente',
          amount: custSoonAmt,
          minDays: custMinDays,
        });
      }
    }
    if (dueSoonCusts.length > 0) {
      const totalSoon = round2(dueSoonCusts.reduce((s, c) => s + c.amount, 0));
      items.push({
        id: 'CREDIT_DUE_SOON',
        fingerprint: `CREDIT_DUE_SOON:${dueSoonCusts.length}:${totalSoon}`,
        category: 'RECEIVABLES',
        severity: 'WARNING',
        title: `${dueSoonCusts.length} ${dueSoonCusts.length === 1 ? 'crédito próximo a vencer' : 'créditos próximos a vencer'}`,
        body: `${formatCurrency(totalSoon)} por vencer en los próximos 5 días. Anticipá el recordatorio de pago.`,
        count: dueSoonCusts.length,
        amount: totalSoon,
        currency: 'NIO',
        highlights: dueSoonCusts
          .slice(0, 3)
          .map(
            (c) =>
              `${c.name} (${c.minDays === 0 ? 'vence hoy' : `en ${c.minDays} d`} · ${formatCurrency(c.amount)})`,
          ),
        redirect: {
          route: '/finances',
          state: { tab: 'receivables', filter: 'DUE_SOON' },
          actionLabel: 'Ver próximos cobros',
        },
      });
    }
  }

  if (payablesRes.status === 'fulfilled' && payablesRes.value.data && hasCartera) {
    const pSum = payablesRes.value.data;
    const overdueAmt = round2(Number(pSum.totalOverdue || 0));
    const dueNext7Amt = round2(Number(pSum.dueNext7Days || 0));
    if (overdueAmt > 0) {
      items.push({
        id: 'PAYABLE_OVERDUE',
        fingerprint: `PAYABLE_OVERDUE:fallback:${overdueAmt}`,
        category: 'PAYABLES',
        severity: 'CRITICAL',
        title: `Cuentas por pagar vencidas · ${formatCurrency(overdueAmt)}`,
        body: 'Comprobantes de crédito con proveedores fuera de fecha límite de pago.',
        amount: overdueAmt,
        currency: 'NIO',
        redirect: {
          route: '/finances',
          state: { tab: 'payables', onlyOverdue: true },
          actionLabel: 'Ver cuentas vencidas',
        },
      });
    }
    if (dueNext7Amt > 0) {
      items.push({
        id: 'PAYABLE_DUE_SOON',
        fingerprint: `PAYABLE_DUE_SOON:fallback:${dueNext7Amt}`,
        category: 'PAYABLES',
        severity: 'WARNING',
        title: `Pagos a proveedores en ≤ 7 días · ${formatCurrency(dueNext7Amt)}`,
        body: 'Revisá tus compromisos próximos con proveedores.',
        amount: dueNext7Amt,
        currency: 'NIO',
        redirect: {
          route: '/finances',
          state: { tab: 'payables', onlyOverdue: false },
          actionLabel: 'Ver próximos pagos',
        },
      });
    }
  }

  if (quotesRes.status === 'fulfilled' && hasPos) {
    const qList: any[] =
      quotesRes.value.data?.data ||
      (Array.isArray(quotesRes.value.data) ? quotesRes.value.data : []);
    const soonLimit = Date.now() + 3 * 24 * 60 * 60 * 1000;
    const expiringQuotes = qList.filter((q) => {
      if (!q.expiresAt) return false;
      const expMs = new Date(q.expiresAt).getTime();
      return expMs > Date.now() && expMs <= soonLimit;
    });
    if (expiringQuotes.length > 0) {
      items.push({
        id: 'QUOTES_EXPIRING_SOON',
        fingerprint: `QUOTES_EXPIRING_SOON:${expiringQuotes.length}:${expiringQuotes[0].id}`,
        category: 'OPERATIONS',
        severity: 'INFO',
        title: `${expiringQuotes.length} ${expiringQuotes.length === 1 ? 'proforma emitida por vencer' : 'proformas emitidas por vencer'}`,
        body: 'Vencen en los próximos 3 días. Podés darles seguimiento antes de que expiren.',
        count: expiringQuotes.length,
        highlights: expiringQuotes
          .slice(0, 3)
          .map((q) => `${q.quoteNumber} · ${q.customerName || 'Sin cliente'}`),
        redirect: {
          route: '/quotes',
          state: { statusFilter: 'SENT' },
          actionLabel: 'Ver proformas emitidas',
        },
      });
    }
  }

  return items;
}

interface NotificationCenterState {
  items: SystemNotificationItem[];
  membership: MembershipAlertSummary | null;
  isLoading: boolean;
  lastFetchedAt: number | null;
  lastContext: NotificationFetchContext;
  isDrawerOpen: boolean;
  isMembershipModalOpen: boolean;

  readByScope: Record<string, Record<string, number>>;
  snoozedByScope: Record<string, Record<string, number>>;
  bannerDismissedDayByScope: Record<string, string>;

  fetchNotifications: (force?: boolean, ctx?: NotificationFetchContext) => Promise<void>;
  markAsRead: (fingerprint: string) => void;
  markAllAsRead: () => void;
  snoozeForToday: (fingerprint: string) => void;
  dismissMembershipBannerToday: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  openMembershipModal: () => void;
  closeMembershipModal: () => void;
  reset: () => void;
}

export const useNotificationCenterStore = create<NotificationCenterState>()(
  persist(
    (set, get) => ({
      items: [],
      membership: null,
      isLoading: false,
      lastFetchedAt: null,
      lastContext: {},
      isDrawerOpen: false,
      isMembershipModalOpen: false,
      readByScope: {},
      snoozedByScope: {},
      bannerDismissedDayByScope: {},

      fetchNotifications: async (force = false, ctx?: NotificationFetchContext) => {
        const auth = useAuthStore.getState();
        if (!auth.isAuthenticated || !auth.user) return;

        const mergedCtx: NotificationFetchContext = ctx
          ? { ...get().lastContext, ...ctx }
          : get().lastContext;

        const nowMs = Date.now();
        if (!force && get().isLoading) return;
        if (
          !force &&
          get().lastFetchedAt &&
          nowMs - (get().lastFetchedAt || 0) < 30000
        ) {
          return;
        }

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          set({ isLoading: false, lastContext: mergedCtx });
          return;
        }

        set({ isLoading: true, lastContext: mergedCtx });

        try {
          let serverItems: SystemNotificationItem[] = [];
          let membership: MembershipAlertSummary | null = null;

          try {
            const data: PosNotificationCenterResponse =
              await getPosNotificationCenter();
            serverItems = Array.isArray(data?.items) ? data.items : [];
            membership = data?.membership ?? null;
          } catch (err: any) {
            const status = err?.response?.status;
            if (!status || status === 404 || status >= 500) {
              serverItems = await buildWebClientFallbackItems(mergedCtx);
            } else {
              throw err;
            }
          }

          const sorted = [...serverItems].sort(
            (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
          );

          set({
            items: sorted,
            membership,
            isLoading: false,
            lastFetchedAt: Date.now(),
          });
        } catch (err) {
          console.warn(
            '[NotificationCenterStore] Error cargando notificaciones:',
            err,
          );
          set({ isLoading: false });
        }
      },

      markAsRead: (fingerprint: string) => {
        const scope = getScopeKey();
        set((state) => ({
          readByScope: {
            ...state.readByScope,
            [scope]: {
              ...(state.readByScope[scope] || {}),
              [fingerprint]: Date.now(),
            },
          },
        }));
      },

      markAllAsRead: () => {
        const scope = getScopeKey();
        const now = Date.now();
        const updates: Record<string, number> = {
          ...(get().readByScope[scope] || {}),
        };
        for (const item of get().items) {
          updates[item.fingerprint] = now;
        }
        set((state) => ({
          readByScope: {
            ...state.readByScope,
            [scope]: updates,
          },
        }));
      },

      snoozeForToday: (fingerprint: string) => {
        const scope = getScopeKey();
        const untilMs = getTomorrowSixAmManaguaMs();
        const now = Date.now();
        set((state) => ({
          snoozedByScope: {
            ...state.snoozedByScope,
            [scope]: {
              ...(state.snoozedByScope[scope] || {}),
              [fingerprint]: untilMs,
            },
          },
          readByScope: {
            ...state.readByScope,
            [scope]: {
              ...(state.readByScope[scope] || {}),
              [fingerprint]: now,
            },
          },
        }));
      },

      dismissMembershipBannerToday: () => {
        const scope = getScopeKey();
        const today = getManaguaTodayYmd();
        set((state) => ({
          bannerDismissedDayByScope: {
            ...state.bannerDismissedDayByScope,
            [scope]: today,
          },
        }));
      },

      openDrawer: () => {
        set({ isDrawerOpen: true });
        get().fetchNotifications(true).catch(() => {});
      },
      closeDrawer: () => set({ isDrawerOpen: false }),
      openMembershipModal: () => set({ isMembershipModalOpen: true }),
      closeMembershipModal: () => set({ isMembershipModalOpen: false }),

      reset: () =>
        set({
          items: [],
          membership: null,
          isLoading: false,
          lastFetchedAt: null,
          lastContext: {},
          isDrawerOpen: false,
          isMembershipModalOpen: false,
        }),
    }),
    {
      name: 'trackdeli-web-notifications-v1',
      partialize: (state) => ({
        readByScope: state.readByScope,
        snoozedByScope: state.snoozedByScope,
        bannerDismissedDayByScope: state.bannerDismissedDayByScope,
      }),
    },
  ),
);
