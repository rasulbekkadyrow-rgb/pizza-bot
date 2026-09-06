/* ═══════════════════════════════════════════════════════════════
   Ilova bo'ylab umumiy tiplar + Telegram WebApp SDK deklaratsiyasi
   ═══════════════════════════════════════════════════════════════ */

// ── Domen modellari (backend DTO'lari bilan bir xil) ───────────

export interface Category {
  slug: string;
  title: string;
  emoji: string | null;
}

export interface Product {
  id: number;
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl: string | null;
  price: number;
  oldPrice: number | null;
  discountPercent: number;
  ingredients: string[];
  badges: string[];
  weightGrams: number | null;
  kcal: number | null;
  isBestseller: boolean;
  isAddon: boolean;
  isAvailable: boolean;
  category: Category | null;
}

export interface Story {
  id: number;
  title: string;
  coverUrl: string;
  imageUrl: string;
  body: string;
  ctaLabel: string | null;
  ctaTarget: string | null;
  accent: string;
}

export interface CatalogSettings {
  currency: string;
  currencySymbol: string;
  deliveryFee: number;
  freeDeliveryFrom: number;
}

export interface CatalogResponse {
  categories: Category[];
  products: Product[];
  addons: Product[];
  settings: CatalogSettings;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PAID'
  | 'PREPARING'
  | 'DELIVERING'
  | 'COMPLETED'
  | 'CANCELLED';

export interface OrderItem {
  id: number;
  productId: number | null;
  title: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface Order {
  id: number;
  publicNo: string;
  status: OrderStatus;
  statusLabel: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  customerName: string;
  phone: string;
  address: string;
  comment: string | null;
  paymentMethod: 'CARD' | 'CASH';
  createdAt: string;
  items: OrderItem[];
}

export interface Me {
  id: number;
  telegramId: number;
  firstName: string;
  lastName: string | null;
  username: string | null;
  photoUrl: string | null;
  phone: string | null;
  fullName: string;
  isAdmin: boolean;
  stats: { ordersCount: number; spent: number };
}

// ── Savat ──────────────────────────────────────────────────────

export interface CartLine {
  productId: number;
  slug: string;
  title: string;
  imageUrl: string;
  unitPrice: number;
  oldPrice: number | null;
  quantity: number;
}

export interface CheckoutPayload {
  items: { productId: number; quantity: number }[];
  customerName: string;
  phone: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  comment?: string | null;
  paymentMethod: 'CARD' | 'CASH';
}

// ── API konverti ───────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

// ── Telegram WebApp SDK ────────────────────────────────────────

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

export interface TelegramThemeParams {
  bg_color?: string;
  secondary_bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  header_bg_color?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { user?: TelegramUser; query_id?: string; auth_date?: number; hash?: string };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  ready(): void;
  expand(): void;
  close(): void;
  enableClosingConfirmation(): void;
  disableVerticalSwipes?(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  openTelegramLink(url: string): void;
  openLink(url: string, options?: { try_instant_view?: boolean }): void;
  sendData(data: string): void;
  showAlert(message: string, callback?: () => void): void;
  showConfirm(message: string, callback?: (confirmed: boolean) => void): void;
  showPopup(
    params: { title?: string; message: string; buttons?: { id?: string; type?: string; text?: string }[] },
    callback?: (buttonId: string) => void
  ): void;
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
  MainButton: {
    text: string;
    isVisible: boolean;
    isActive: boolean;
    show(): void;
    hide(): void;
    enable(): void;
    disable(): void;
    setText(text: string): void;
    showProgress(leaveActive?: boolean): void;
    hideProgress(): void;
    onClick(cb: () => void): void;
    offClick(cb: () => void): void;
    setParams(params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }): void;
  };
  BackButton: {
    isVisible: boolean;
    show(): void;
    hide(): void;
    onClick(cb: () => void): void;
    offClick(cb: () => void): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}
