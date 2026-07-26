import {
  Avatar,
  CouponItem,
  InventoryItem,
  ShopItem,
  Title,
} from '../types';
import { apiClient } from '../api';
import { walletStore } from '../stores/walletStore';
import { walletService } from './walletService';

export type PurchaseOutcome =
  | { status: 'success'; message: string }
  | { status: 'insufficient_funds'; message: string }
  | { status: 'failed'; message: string };

export interface ShopService {
  getItems: () => Promise<ShopItem[]>;
  getCoupons: () => Promise<CouponItem[]>;
  getAvatars: () => Promise<Avatar[]>;
  getTitles: () => Promise<Title[]>;
  getInventory: () => Promise<InventoryItem[]>;
  purchaseItem: (item: ShopItem) => Promise<PurchaseOutcome>;
  purchaseAvatar: (avatar: Avatar) => Promise<PurchaseOutcome>;
  exchangeCoupon: (coupon: CouponItem) => Promise<PurchaseOutcome>;
}

interface PurchaseResponse {
  duplicated: boolean;
  wallet: { points: number; tickets: number };
}

function purchaseKey(itemId: string) {
  return `shop-purchase:${itemId}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

class ShopServiceImpl implements ShopService {
  public async getItems(): Promise<ShopItem[]> {
    return apiClient.get<ShopItem[]>('/shop/items');
  }

  public async getCoupons(): Promise<CouponItem[]> {
    return apiClient.get<CouponItem[]>('/shop/coupons');
  }

  public async getAvatars(): Promise<Avatar[]> {
    const rows = await apiClient.get<Array<{
      id: string;
      name: string;
      preview: string;
      description: string;
      price: number;
      currency: 'points';
      type: 'BASIC' | 'RARE' | 'LEGENDARY' | 'EVENT';
      isOwned: boolean;
    }>>('/shop/avatars');
    return rows.map((avatar) => ({
      id: avatar.id,
      name: avatar.name,
      emoji: avatar.preview,
      category: avatar.type === 'BASIC' ? 'basic' : avatar.type === 'RARE' ? 'rare' : 'legendary',
      price: avatar.price,
      currency: avatar.currency,
      isUnlocked: avatar.isOwned,
      description: avatar.description,
      borderColor: 'border-cyan-500',
      type: 'avatar',
    }));
  }

  public async getTitles(): Promise<Title[]> {
    const rows = await apiClient.get<Array<{
      id: string;
      name: string;
      requirement: string;
      isOwned: boolean;
    }>>('/shop/titles');
    return rows.map((title) => ({
      id: title.id,
      name: title.name,
      requirement: title.requirement,
      isUnlocked: title.isOwned,
      tagColor: 'from-amber-400 to-orange-500 text-slate-950',
    }));
  }

  public async getInventory(): Promise<InventoryItem[]> {
    const rows = await apiClient.get<Array<{
      id: string;
      itemId: string;
      itemType: string;
      name: string;
      quantity: number;
      isEquipped: boolean;
      acquiredAt: string;
    }>>('/users/me/inventory');
    return rows.map((item) => ({
      id: item.id,
      itemId: item.itemId,
      name: item.name,
      type:
        item.itemType === 'AVATAR'
          ? 'avatar'
          : item.itemType === 'BOOSTER'
            ? 'booster'
            : 'decoration',
      quantity: item.quantity,
      acquiredAt: Date.parse(item.acquiredAt),
      isEquipped: item.isEquipped,
    }));
  }

  private async purchase(itemId: string, itemType: 'SHOP_ITEM' | 'AVATAR') {
    try {
      const result = await apiClient.post<PurchaseResponse>('/shop/purchase', {
        itemId,
        itemType,
        transactionKey: purchaseKey(itemId),
      });
      walletStore.applyServerState(result.wallet);
      await walletService.getTransactions();
      return {
        status: 'success' as const,
        message: result.duplicated ? '이미 처리된 구매입니다.' : '구매가 완료되었습니다.',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '구매에 실패했습니다.';
      const insufficient = message.includes('balance') || message.includes('잔액');
      return {
        status: insufficient ? ('insufficient_funds' as const) : ('failed' as const),
        message: insufficient ? '잔액이 부족합니다.' : message,
      };
    }
  }

  public async purchaseItem(item: ShopItem): Promise<PurchaseOutcome> {
    return this.purchase(item.id, 'SHOP_ITEM');
  }

  public async purchaseAvatar(avatar: Avatar): Promise<PurchaseOutcome> {
    return this.purchase(avatar.id, 'AVATAR');
  }

  public async exchangeCoupon(coupon: CouponItem): Promise<PurchaseOutcome> {
    return this.purchase(coupon.id, 'SHOP_ITEM');
  }
}

export const shopService = new ShopServiceImpl();
