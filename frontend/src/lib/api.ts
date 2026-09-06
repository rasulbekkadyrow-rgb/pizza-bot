import type {
  ApiResponse,
  CatalogResponse,
  CheckoutPayload,
  Me,
  Order,
  Story,
} from './types';

/**
 * Backend bilan ishlovchi yagona qatlam.
 *
 * Har bir himoyalangan so'rovga `Authorization: tma <initData>` sarlavhasi
 * qo'shiladi — server uni HMAC-SHA256 orqali tekshiradi.
 */

/**
 * API manzili — sukut bo'yicha SHU domen ostidagi `/api`.
 * So'rov Next server orqali backend'ga uzatiladi (`next.config.mjs` → rewrites),
 * shuning uchun tunnel/domen o'zgarsa ham kodni qayta qurish shart emas.
 */
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/+$/, '');

export class ApiRequestError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code = 'UNKNOWN', status = 0, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function getInitData(): string {
  if (typeof window === 'undefined') return '';
  return window.Telegram?.WebApp?.initData ?? '';
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
  timeoutMs?: number;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, timeoutMs = 15_000, headers, ...rest } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const initData = getInitData();
    if (initData) finalHeaders.Authorization = `tma ${initData}`;
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });

    let json: ApiResponse<T>;
    try {
      json = (await res.json()) as ApiResponse<T>;
    } catch {
      throw new ApiRequestError('Serverdan noto‘g‘ri javob keldi', 'BAD_JSON', res.status);
    }

    if (!res.ok || !json.ok) {
      const err = !json.ok ? json.error : undefined;
      throw new ApiRequestError(
        err?.message || 'So‘rovni bajarib bo‘lmadi',
        err?.code || 'HTTP_ERROR',
        res.status,
        err?.details
      );
    }

    return json.data;
  } catch (err) {
    if (err instanceof ApiRequestError) throw err;
    if ((err as Error).name === 'AbortError') {
      throw new ApiRequestError('So‘rov vaqti tugadi. Internetni tekshiring.', 'TIMEOUT');
    }
    throw new ApiRequestError('Serverga ulanib bo‘lmadi', 'NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  /** Katalog — kategoriyalar, mahsulotlar, order-bump qo'shimchalari. */
  getCatalog: () => request<CatalogResponse>('/catalog', { auth: false }),

  /** Bosh sahifadagi storis bloki. */
  getStories: () => request<Story[]>('/stories', { auth: false }),

  /** Joriy foydalanuvchi profili va statistikasi. */
  getMe: () => request<Me>('/me'),

  /** Savatni serverda qayta hisoblash (checkout'dan oldin). */
  validateCart: (items: { productId: number; quantity: number }[]) =>
    request<{
      items: { productId: number; title: string; unitPrice: number; quantity: number; total: number }[];
      subtotal: number;
      deliveryFee: number;
      total: number;
      isFreeDelivery: boolean;
    }>('/cart/validate', { method: 'POST', body: { items } }),

  /** Buyurtmani rasmiylashtirish. */
  createOrder: (payload: CheckoutPayload) =>
    request<{ id: number; publicNo: string; status: string; total: number; createdAt: string }>(
      '/orders',
      { method: 'POST', body: payload }
    ),

  /** Buyurtmalar tarixi. */
  getMyOrders: () => request<Order[]>('/orders'),
};
