import React, { useEffect, useState } from 'react';
import { Ticket, ArrowLeft, Coins, Check } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { shopService } from '../services/shopService';
import type { ShopItem } from '../types';

export const PointExchangePage: React.FC = () => {
  const { goBack, user, buyShopItem } = useGame();
  const [coupons, setCoupons] = useState<ShopItem[]>([]);

  const refreshCoupons = () =>
    shopService
      .getItems()
      .then((items) => setCoupons(items.filter((item) => item.category === 'coupon')))
      .catch(() => setCoupons([]));

  useEffect(() => {
    void refreshCoupons();
  }, []);

  const handleExchange = async (coupon: ShopItem) => {
    if (await buyShopItem(coupon)) await refreshCoupons();
  };

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로가기
        </button>

        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
          보유: {user.points.toLocaleString()} P
        </span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <Ticket className="w-5 h-5 text-amber-400" />
          모바일 쿠폰 교환소
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">게임으로 모은 포인트로 실제 카페, 편의점 쿠폰을 교환하세요.</p>
      </div>

      {/* Coupons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {coupons.map((cp) => (
          <div
            key={cp.id}
            className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl shadow-xl flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-3xl shrink-0">
                {cp.icon}
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-400">묵찌빠 팡</span>
                <h3 className="font-extrabold text-xs text-white leading-snug">{cp.name}</h3>
                <span className="text-[10px] text-slate-500 mt-0.5 block">{cp.description}</span>
              </div>
            </div>

            <div className="flex flex-col items-end shrink-0">
              <span className="font-black text-xs text-amber-400 mb-2">
                {cp.price.toLocaleString()} P
              </span>
              <button
                onClick={() => handleExchange(cp)}
                disabled={cp.isOwned}
                className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md active:scale-95 transition-all"
                id={`exchange-coupon-btn-${cp.id}`}
              >
                {cp.isOwned ? '교환 완료' : '교환하기'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
