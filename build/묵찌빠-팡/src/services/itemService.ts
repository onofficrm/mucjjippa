import { ShopItem } from '../types';
import { mockItems } from '../data/mockData';

export interface ItemService {
  getShopItems: () => Promise<ShopItem[]>;
  buyItem: (itemId: string) => Promise<{ success: boolean; message: string }>;
}

class MockItemService implements ItemService {
  private items: ShopItem[] = [...mockItems];

  public async getShopItems(): Promise<ShopItem[]> {
    await new Promise((res) => setTimeout(res, 100));
    return [...this.items];
  }

  public async buyItem(itemId: string): Promise<{ success: boolean; message: string }> {
    await new Promise((res) => setTimeout(res, 200));
    const item = this.items.find((i) => i.id === itemId);
    if (!item) {
      return { success: false, message: '아이템을 찾을 수 없습니다.' };
    }
    item.isOwned = true;
    return { success: true, message: `${item.name} 구매가 완료되었습니다!` };
  }
}

export const itemService = new MockItemService();
