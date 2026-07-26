import { Currency } from './wallet';

export type ShopItemType =
  | 'avatar'
  | 'border'
  | 'victory'
  | 'entrance'
  | 'emoji'
  | 'ticket'
  | 'decoration'
  | 'booster'
  | 'shield';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  currency: Currency;
  type: ShopItemType;
  category?: 'cosmetic' | 'ticket' | 'booster' | 'coupon';
  categoryLabel?: string;
  preview?: string;
  quantity?: number;
  isOwned?: boolean;
  isEquipped?: boolean;
}

export interface CosmeticItem {
  id: string;
  category: 'avatar' | 'border' | 'entrance' | 'victory' | 'color' | 'emote' | 'ticket' | 'decoration';
  categoryLabel: string;
  name: string;
  description: string;
  preview: string;
  price: number;
  currency: Currency;
  isOwned: boolean;
  isEquipped: boolean;
}

/** 보유 아이템 (구매 후 인벤토리) */
export interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  type: ShopItemType;
  quantity: number;
  acquiredAt: number;
  isEquipped?: boolean;
}

export interface CouponItem {
  id: string;
  title: string;
  brand: string;
  pricePoints: number;
  image: string;
  stock: number;
}

export interface AdOffer {
  id: string;
  title: string;
  rewardPoints: number;
  rewardTickets: number;
  sponsor: string;
  durationSeconds: number;
  badge: string;
  bannerGradient: string;
}

export interface PurchaseResult {
  success: boolean;
  message: string;
  itemId: string;
  duplicated?: boolean;
}
