import {
  AssetType,
  CatalogStatus,
  InventoryItemType,
  Prisma,
  ShopItemCategory,
  WalletTransactionReason,
  WalletTransactionType,
} from '@prisma/client';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { applyWalletMutation } from '../../lib/wallet.js';
import { toTransactionResponse, toWalletResponse } from '../wallet/service.js';

type PurchaseKind = 'SHOP_ITEM' | 'AVATAR';

function categoryType(category: ShopItemCategory) {
  if (category === ShopItemCategory.TICKET) return 'ticket';
  if (category === ShopItemCategory.BOOSTER) return 'booster';
  if (category === ShopItemCategory.COUPON) return 'coupon';
  return 'decoration';
}

export async function listShopItems(userId: string) {
  const [items, inventory] = await Promise.all([
    prisma.shopItem.findMany({
      where: { status: CatalogStatus.ACTIVE },
      orderBy: [{ category: 'asc' }, { pricePoints: 'asc' }],
    }),
    prisma.inventory.findMany({
      where: { userId, itemType: InventoryItemType.SHOP_ITEM },
    }),
  ]);
  const owned = new Map(inventory.map((entry) => [entry.itemId, entry]));
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description ?? '',
    icon: item.icon ?? '🎁',
    price: item.pricePoints || item.priceTickets,
    currency: item.priceTickets > 0 ? 'tickets' : 'points',
    pricePoints: item.pricePoints,
    priceTickets: item.priceTickets,
    type: categoryType(item.category),
    category: item.category.toLowerCase(),
    quantity: item.quantityGrant,
    isOwned: owned.has(item.id),
    isEquipped: owned.get(item.id)?.equipped ?? false,
  }));
}

export async function listAvatars(userId: string) {
  const [avatars, inventory, user] = await Promise.all([
    prisma.avatar.findMany({
      where: { status: CatalogStatus.ACTIVE },
      orderBy: [{ type: 'asc' }, { price: 'asc' }],
    }),
    prisma.inventory.findMany({
      where: { userId, itemType: InventoryItemType.AVATAR },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
  ]);
  const owned = new Set(inventory.map((entry) => entry.itemId));
  return avatars.map((avatar) => ({
    id: avatar.id,
    name: avatar.name,
    preview: avatar.imageUrl,
    description: `${avatar.type.toLowerCase()} 아바타`,
    price: avatar.price,
    currency: 'points',
    type: avatar.type,
    isOwned: owned.has(avatar.id) || user.avatarId === avatar.id,
    isEquipped: user.avatarId === avatar.id,
  }));
}

export async function listTitles(userId: string) {
  const [titles, inventory, user] = await Promise.all([
    prisma.title.findMany({
      where: { status: CatalogStatus.ACTIVE },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.inventory.findMany({
      where: { userId, itemType: InventoryItemType.TITLE },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
  ]);
  const owned = new Set(inventory.map((entry) => entry.itemId));
    return titles.map((title) => ({
      id: title.id,
      name: title.name,
      description: title.description ?? '',
      requirement: title.unlockCondition ?? '',
      isOwned: owned.has(title.id) || user.titleId === title.id,
      isUnlocked: owned.has(title.id) || user.titleId === title.id,
      isEquipped: user.titleId === title.id,
    }));
  }

export async function getInventory(userId: string) {
  const entries = await prisma.inventory.findMany({
    where: { userId },
    orderBy: { acquiredAt: 'desc' },
  });
  const avatarIds = entries
    .filter((entry) => entry.itemType === InventoryItemType.AVATAR)
    .map((entry) => entry.itemId);
  const titleIds = entries
    .filter((entry) => entry.itemType === InventoryItemType.TITLE)
    .map((entry) => entry.itemId);
  const shopIds = entries
    .filter((entry) => entry.itemType === InventoryItemType.SHOP_ITEM)
    .map((entry) => entry.itemId);
  const [avatars, titles, shopItems] = await Promise.all([
    prisma.avatar.findMany({ where: { id: { in: avatarIds } } }),
    prisma.title.findMany({ where: { id: { in: titleIds } } }),
    prisma.shopItem.findMany({ where: { id: { in: shopIds } } }),
  ]);
  const names = new Map<string, { name: string; preview?: string }>();
  avatars.forEach((item) => names.set(item.id, { name: item.name, preview: item.imageUrl }));
  titles.forEach((item) => names.set(item.id, { name: item.name }));
  shopItems.forEach((item) => names.set(item.id, { name: item.name, preview: item.icon ?? undefined }));
  return entries.map((entry) => ({
    id: entry.id,
    itemId: entry.itemId,
    itemType: entry.itemType,
    name: names.get(entry.itemId)?.name ?? entry.itemId,
    preview: names.get(entry.itemId)?.preview,
    quantity: entry.quantity,
    isEquipped: entry.equipped,
    acquiredAt: entry.acquiredAt.toISOString(),
  }));
}

export async function purchaseItem(input: {
  userId: string;
  itemId: string;
  itemType: PurchaseKind;
  transactionKey: string;
}) {
  return prisma.$transaction(
    async (tx) => {
      const debitKeys = [
        `${input.transactionKey}:point`,
        `${input.transactionKey}:ticket`,
      ];
      const existing = await tx.walletTransaction.findFirst({
        where: { transactionKey: { in: debitKeys } },
      });
      if (existing) {
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: input.userId } });
        return {
          duplicated: true,
          wallet: toWalletResponse(wallet),
          inventory: await getInventoryInTransaction(tx, input.userId),
        };
      }

      let name: string;
      let pricePoints: number;
      let priceTickets: number;
      let quantity: number;
      let inventoryType: InventoryItemType;
      let ticketGrant = 0;
      let stackable = false;

      if (input.itemType === 'AVATAR') {
        const avatar = await tx.avatar.findFirst({
          where: { id: input.itemId, status: CatalogStatus.ACTIVE },
        });
        if (!avatar) throw notFound('아바타를 찾을 수 없습니다');
        name = avatar.name;
        pricePoints = avatar.price;
        priceTickets = 0;
        quantity = 1;
        inventoryType = InventoryItemType.AVATAR;
      } else {
        const item = await tx.shopItem.findFirst({
          where: { id: input.itemId, status: CatalogStatus.ACTIVE },
        });
        if (!item) throw notFound('상점 상품을 찾을 수 없습니다');
        name = item.name;
        pricePoints = item.pricePoints;
        priceTickets = item.priceTickets;
        quantity = item.quantityGrant;
        inventoryType = InventoryItemType.SHOP_ITEM;
        ticketGrant = item.category === ShopItemCategory.TICKET ? item.quantityGrant : 0;
        stackable = item.category === ShopItemCategory.BOOSTER;
      }

      const owned = await tx.inventory.findUnique({
        where: {
          userId_itemType_itemId: {
            userId: input.userId,
            itemType: inventoryType,
            itemId: input.itemId,
          },
        },
      });
      if (owned && !stackable) {
        throw conflict('이미 보유한 상품입니다', { code: 'ALREADY_OWNED' });
      }

      const ledger = [];
      if (pricePoints > 0) {
        ledger.push(
          (
            await applyWalletMutation(tx, {
              userId: input.userId,
              transactionKey: debitKeys[0],
              assetType: AssetType.POINT,
              transactionType: WalletTransactionType.DEBIT,
              reason: WalletTransactionReason.SHOP_PURCHASE,
              amount: pricePoints,
              referenceType: input.itemType.toLowerCase(),
              referenceId: input.itemId,
              description: `${name} 구매`,
            })
          ).transaction
        );
      }
      if (priceTickets > 0) {
        ledger.push(
          (
            await applyWalletMutation(tx, {
              userId: input.userId,
              transactionKey: debitKeys[1],
              assetType: AssetType.TICKET,
              transactionType: WalletTransactionType.DEBIT,
              reason: WalletTransactionReason.SHOP_PURCHASE,
              amount: priceTickets,
              referenceType: input.itemType.toLowerCase(),
              referenceId: input.itemId,
              description: `${name} 구매`,
            })
          ).transaction
        );
      }

      if (ticketGrant > 0) {
        ledger.push(
          (
            await applyWalletMutation(tx, {
              userId: input.userId,
              transactionKey: `${input.transactionKey}:grant`,
              assetType: AssetType.TICKET,
              transactionType: WalletTransactionType.CREDIT,
              reason: WalletTransactionReason.ITEM_REWARD,
              amount: ticketGrant,
              referenceType: 'shop_item',
              referenceId: input.itemId,
              description: `${name} 지급`,
            })
          ).transaction
        );
      } else {
        await tx.inventory.upsert({
          where: {
            userId_itemType_itemId: {
              userId: input.userId,
              itemType: inventoryType,
              itemId: input.itemId,
            },
          },
          update: stackable ? { quantity: { increment: quantity } } : {},
          create: {
            userId: input.userId,
            itemType: inventoryType,
            itemId: input.itemId,
            quantity,
          },
        });
      }

      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: input.userId } });
      return {
        duplicated: false,
        wallet: toWalletResponse(wallet),
        transactions: ledger.map(toTransactionResponse),
        inventory: await getInventoryInTransaction(tx, input.userId),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  ).then(async (result) => {
    if (!result.duplicated) {
      const { afterPurchase } = await import('../progression/after-match.js');
      void afterPurchase(input.userId).catch(() => undefined);
    }
    return result;
  });
}

async function getInventoryInTransaction(tx: Prisma.TransactionClient, userId: string) {
  return tx.inventory.findMany({ where: { userId }, orderBy: { acquiredAt: 'desc' } });
}

export async function equipItem(input: {
  userId: string;
  itemType: 'AVATAR' | 'TITLE';
  itemId: string;
}) {
  const itemType =
    input.itemType === 'AVATAR' ? InventoryItemType.AVATAR : InventoryItemType.TITLE;
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: input.userId } });
    const currentlyEquipped =
      input.itemType === 'AVATAR' ? user.avatarId === input.itemId : user.titleId === input.itemId;
    const owned = await tx.inventory.findUnique({
      where: {
        userId_itemType_itemId: {
          userId: input.userId,
          itemType,
          itemId: input.itemId,
        },
      },
    });
    if (!owned && !currentlyEquipped) {
      throw badRequest('보유한 아이템만 장착할 수 있습니다', { code: 'ITEM_NOT_OWNED' });
    }

    if (input.itemType === 'AVATAR') {
      const catalog = await tx.avatar.findFirst({
        where: { id: input.itemId, status: CatalogStatus.ACTIVE },
      });
      if (!catalog) throw notFound('아바타를 찾을 수 없습니다');
    } else {
      const catalog = await tx.title.findFirst({
        where: { id: input.itemId, status: CatalogStatus.ACTIVE },
      });
      if (!catalog) throw notFound('칭호를 찾을 수 없습니다');
    }

    await tx.inventory.updateMany({
      where: { userId: input.userId, itemType, equipped: true },
      data: { equipped: false },
    });
    if (owned) {
      await tx.inventory.update({ where: { id: owned.id }, data: { equipped: true } });
    }
    const updated = await tx.user.update({
      where: { id: input.userId },
      data:
        input.itemType === 'AVATAR'
          ? { avatarId: input.itemId }
          : { titleId: input.itemId },
      include: { avatar: true, title: true, wallet: true },
    });
    return {
      avatarId: updated.avatarId,
      avatar: updated.avatar?.imageUrl ?? '✊',
      titleId: updated.titleId,
      title: updated.title?.name ?? '새싹 플레이어',
    };
  });
}
