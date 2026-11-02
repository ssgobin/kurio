import type { Nft, Network } from '../mocks/data';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'NETWORK_ERROR'
  | 'SESSION_EXPIRED'
  | 'QUOTE_STALE'
  | 'OUT_OF_STOCK'
  | 'ORDER_TIMEOUT'
  | 'IDEMPOTENCY_CONFLICT';

export type ApiErrorBody = { message: string; code: ApiErrorCode; fields?: Record<string, string> };

export type SessionUser = { id: string; email: string; username: string };
export type SessionResponse = { user: SessionUser; expiresAt: string; sessionId: string };

export type NftListResponse = {
  items: Nft[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CartItem = {
  id: string;
  nftId: string;
  edition: string;
  quantity: number;
  priceSnapshot: string;
  nftVersion: number;
  nft: Nft;
  changed: boolean;
};

export type CartResponse = { items: CartItem[]; promoCode: string | null; updatedAt: string };

export type QuoteResponse = {
  id: string;
  cartVersion: string;
  subtotal: string;
  discount: string;
  networkFee: string;
  total: string;
  promo: null | { code: string; label: string; discountBasisPoints: number };
  items: Array<{
    cartItemId: string;
    nftId: string;
    quantity: number;
    unitPrice: string;
    available: number;
    nftVersion: number;
  }>;
  stale: boolean;
  expiresAt: string;
};

export type OrderStatus = 'pending' | 'confirmed' | 'rejected';
export type OrderReceiptItem = {
  nftId: string;
  name: string;
  edition: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};
export type OrderResponse = {
  id: string;
  status: OrderStatus;
  version: number;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  walletId: string;
  network: Network;
  provider: string;
  tx: string | null;
  rejectionReason?: string;
  resolveAt?: string;
  resolution?: 'confirmed' | 'rejected';
  receipt: {
    items: OrderReceiptItem[];
    subtotal: string;
    discount: string;
    networkFee: string;
    total: string;
    promoCode: string | null;
  };
};

export type RealtimeEvent<T> = {
  eventId: string;
  resourceId: string;
  version: number;
  occurredAt: string;
  sessionId: string | null;
  userId: string | null;
  payload: T;
};

export type NftUpdatedPayload = { price: string; available: number; edition: string };
export type OrderUpdatedPayload = { status: OrderStatus; tx: string | null; rejectionReason?: string };

export type MockScenario =
  | 'default'
  | 'slow'
  | 'out-of-order'
  | 'empty-market'
  | 'favorite-failure'
  | 'expired-session'
  | 'price-change'
  | 'order-timeout'
  | 'payment-rejected'|'network-error'|'wallet-rejected';
