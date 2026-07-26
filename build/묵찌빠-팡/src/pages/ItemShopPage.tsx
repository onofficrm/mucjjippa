import React, { useState } from 'react';
import { ShoppingBag, ArrowLeft, Shield, Zap, Ticket, Coins, TicketPercent, CheckCircle2, QrCode, Copy, X } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { mockShopItems, mockCoupons } from '../data/mockData';
import { CouponItem, ShopItem } from '../types';

type ShopCategory = 'all' | 'cosmetic' | 'ticket' | 'booster' | 'coupon';

interface IssuedCoupon {
  id: string;
  title: string;
  brand: string;
  barcode: string;
  pinCode: string;
  issuedAt: string;
  image: string;
}

export const ItemShopPage: React.FC = () => {
  const { goBack, user, buyShopItem, spendPoints } = useGame();
  const [activeCategory, setActiveCategory] = useState<ShopCategory>('all');
  const [issuedCoupons, setIssuedCoupons] = useState<IssuedCoupon[]>([]);
  const [selectedCouponModal, setSelectedCouponModal] = useState<IssuedCoupon | null>(null);
  const [showMyCoupons, setShowMyCoupons] = useState(false);

  const handleExchangeCoupon = (coupon: CouponItem) => {
    if (user.points < coupon.pricePoints) {
      alert('포인트가 부족합니다! [포인트 충전]에서 무료 포인트 미션을 수행해 보세요.');
      return;
    }

    const success = spendPoints(coupon.pricePoints, `[쿠폰 교환] ${coupon.title}`);
    if (success) {
      const barcodeStr = `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const pinStr = `${Math.floor(100000 + Math.random() * 900000)}`;
      const newCoupon: IssuedCoupon = {
        id: `icp_${Date.now()}`,
        title: coupon.title,
        brand: coupon.brand,
        barcode: barcodeStr,
        pinCode: pinStr,
        issuedAt: new Date().toLocaleString(),
        image: coupon.image,
      };

      setIssuedCoupons((prev) => [newCoupon, ...prev]);
      setSelectedCouponModal(newCoupon);
    }
  };

  const filteredShopItems = mockShopItems.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const categoryTabs: { key: ShopCategory; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'cosmetic', label: '꾸미기' },
    { key: 'ticket', label: '티켓' },
    { key: 'booster', label: '부스터/실드' },
    { key: 'coupon', label: '기프티콘/쿠폰 교환' },
  ];

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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMyCoupons(true)}
            className="text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/50 px-3 py-1 rounded-full flex items-center gap-1"
          >
            <TicketPercent className="w-3.5 h-3.5 text-emerald-400" />
            내 쿠폰함 ({issuedCoupons.length})
          </button>
          <span className="text-xs font-bold text-amber-400 bg-slate-900 border border-amber-500/40 px-3 py-1 rounded-full">
            {user.points.toLocaleString()} P
          </span>
          <span className="text-xs font-bold text-cyan-400 bg-slate-900 border border-cyan-500/40 px-3 py-1 rounded-full">
            {user.tickets} 장
          </span>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-cyan-400" />
          아케이드 포인트 상점 & 실물 쿠폰 교환소
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">게임 부스터, 참가 티켓 및 모바일 기프티콘 교환</p>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800">
        {categoryTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveCategory(tab.key)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
              activeCategory === tab.key
                ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Standard Items or Coupons */}
      {activeCategory === 'coupon' ? (
        <div className="space-y-3">
          <div className="bg-amber-950/60 border border-amber-500/30 p-3 rounded-2xl text-xs text-amber-300 font-bold flex items-center gap-2">
            <span>🎁 게임에서 획득한 포인트로 기프티콘/모바일 상품권을 실시간 발급받아 사용할 수 있습니다.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {mockCoupons.map((coupon) => (
              <div
                key={coupon.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 p-4 rounded-3xl transition-all shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-3xl shrink-0 shadow-inner">
                      {coupon.image}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        {coupon.brand}
                      </span>
                      <h3 className="font-extrabold text-sm text-white mt-1">{coupon.title}</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">잔여 수량: {coupon.stock}개 남음</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="font-black text-sm text-amber-400 flex items-center gap-1">
                    <Coins className="w-4 h-4 fill-amber-400" />
                    {coupon.pricePoints.toLocaleString()} P
                  </span>

                  <button
                    onClick={() => handleExchangeCoupon(coupon)}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                  >
                    쿠폰 교환하기
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredShopItems.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 p-4 rounded-3xl transition-all shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow-inner">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">{item.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="font-black text-sm text-amber-400 flex items-center gap-1">
                  {item.currency === 'points' ? <Coins className="w-4 h-4 fill-amber-400" /> : <Ticket className="w-4 h-4 text-cyan-400" />}
                  {item.price.toLocaleString()} {item.currency === 'points' ? 'P' : '티켓'}
                </span>

                <button
                  onClick={() => buyShopItem(item)}
                  className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
                  id={`buy-item-btn-${item.id}`}
                >
                  구매하기
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Barcode Coupon Popup Modal */}
      {selectedCouponModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl text-center relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedCouponModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 text-4xl flex items-center justify-center">
              {selectedCouponModal.image}
            </div>

            <div>
              <span className="text-[10px] font-black text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                {selectedCouponModal.brand}
              </span>
              <h3 className="text-base font-black text-white mt-1">{selectedCouponModal.title}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">교환 완료일: {selectedCouponModal.issuedAt}</p>
            </div>

            {/* Simulated Barcode */}
            <div className="bg-white p-4 rounded-2xl space-y-2 text-slate-950 shadow-inner">
              <div className="h-12 bg-slate-900 rounded flex items-center justify-center tracking-widest font-mono text-white text-xs select-all">
                |||| | ||||| || |||| ||| ||||
              </div>
              <div className="text-xs font-mono font-black tracking-wider text-slate-900">
                {selectedCouponModal.barcode}
              </div>
              <div className="text-[10px] text-slate-500 font-bold">
                PIN 번호: {selectedCouponModal.pinCode}
              </div>
            </div>

            <button
              onClick={() => {
                alert('바코드 번호가 복사되었습니다!');
                setSelectedCouponModal(null);
              }}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md"
            >
              <Copy className="w-4 h-4" /> 바코드 번호 복사
            </button>
          </div>
        </div>
      )}

      {/* My Coupons Slide-Over Drawer */}
      {showMyCoupons && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl max-w-md w-full space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <TicketPercent className="w-5 h-5 text-emerald-400" />
                내 발급 쿠폰 보관함
              </h3>
              <button
                onClick={() => setShowMyCoupons(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {issuedCoupons.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs font-bold">
                아직 발급받은 쿠폰이 없습니다. 포인트를 모아 쿠폰으로 교환해보세요!
              </div>
            ) : (
              <div className="space-y-3">
                {issuedCoupons.map((icp) => (
                  <div
                    key={icp.id}
                    onClick={() => {
                      setSelectedCouponModal(icp);
                      setShowMyCoupons(false);
                    }}
                    className="p-3.5 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-2xl flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{icp.image}</span>
                      <div>
                        <div className="text-xs font-extrabold text-white">{icp.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{icp.barcode}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950 px-2 py-1 rounded border border-emerald-800">
                      보기
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
