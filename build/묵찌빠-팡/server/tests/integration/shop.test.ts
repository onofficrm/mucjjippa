import { afterAll, describe, expect, it } from 'vitest';
import { CatalogStatus, ShopItemCategory } from '@prisma/client';
import { prisma } from '../../src/lib/prisma.js';
import { cleanupUsers, createTestUser, uniqueSuffix } from '../helpers/fixtures.js';
import { api, closeApp } from '../helpers/http.js';

describe('통합: 상점 구매', () => {
  const userIds: string[] = [];
  let itemId = '';

  afterAll(async () => {
    if (itemId) {
      await prisma.inventory.deleteMany({ where: { itemId } });
      await prisma.shopItem.deleteMany({ where: { id: itemId } });
    }
    await cleanupUsers(userIds);
    await closeApp();
  });

  it('상품 구매 후 포인트 차감·인벤토리 반영', async () => {
    const { user, password, loginId } = await createTestUser({ points: 5000, tickets: 0 });
    userIds.push(user.id);

    const item = await prisma.shopItem.create({
      data: {
        name: `테스트부스터_${uniqueSuffix()}`,
        description: '테스트용',
        category: ShopItemCategory.BOOSTER,
        pricePoints: 100,
        priceTickets: 0,
        quantityGrant: 1,
        status: CatalogStatus.ACTIVE,
      },
    });
    itemId = item.id;

    const login = await api('POST', '/auth/login', {
      body: { loginId, password },
    });
    const token = login.json.data.accessToken as string;
    const txKey = `shop-test-${uniqueSuffix()}`;

    const purchase = await api('POST', '/shop/purchase', {
      token,
      body: { itemId, itemType: 'SHOP_ITEM', transactionKey: txKey },
    });
    expect(purchase.json.success).toBe(true);
    expect(purchase.json.data.duplicated).toBe(false);
    expect(purchase.json.data.wallet.points).toBe(4900);

    const again = await api('POST', '/shop/purchase', {
      token,
      body: { itemId, itemType: 'SHOP_ITEM', transactionKey: txKey },
    });
    expect(again.json.success).toBe(true);
    expect(again.json.data.duplicated).toBe(true);
    expect(again.json.data.wallet.points).toBe(4900);
  });
});
