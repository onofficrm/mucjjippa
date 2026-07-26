import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowLeft, Check, Lock, Palette, Smile, ShieldAlert, Award, Frame, Zap, Crown } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { shopService } from '../services/shopService';
import type { Avatar } from '../types';

type CosmeticCategory = 'character' | 'border' | 'entrance' | 'victory' | 'nickname_color' | 'emoticon';

interface CosmeticItemData {
  id: string;
  category: CosmeticCategory;
  name: string;
  preview: string;
  description: string;
  price: number;
  currency: 'points' | 'tickets';
  isDefaultUnlocked?: boolean;
}

const cosmeticCatalog: CosmeticItemData[] = [
  // Characters / Avatars
  { id: 'av_1', category: 'character', name: '라이트닝 볼트', preview: '⚡', description: '기본 지급되는 빠른 판단력의 번개 캐릭터', price: 0, currency: 'points', isDefaultUnlocked: true },
  { id: 'av_2', category: 'character', name: '골드 크라운', preview: '👑', description: '토너먼트 챔피언의 상징 품격 있는 황금 왕관', price: 50000, currency: 'points', isDefaultUnlocked: true },
  { id: 'av_3', category: 'character', name: '네온 닌자', preview: '🥷', description: '상대의 수단을 그림자처럼 파악하는 닌자', price: 20000, currency: 'points', isDefaultUnlocked: true },
  { id: 'av_4', category: 'character', name: '파이어 피스트', preview: '🔥', description: '뜨거운 연승의 열기를 품은 붉은 피닉스', price: 30000, currency: 'points', isDefaultUnlocked: false },
  { id: 'av_5', category: 'character', name: '사이보그 AI', preview: '🤖', description: '확률을 정밀하게 계산하는 미래형 AI', price: 5, currency: 'tickets', isDefaultUnlocked: false },

  // Borders
  { id: 'bd_1', category: 'border', name: '골드 크라운 프레임', preview: '✨', description: '반짝이는 황금빛 고급 프로필 테두리', price: 15000, currency: 'points', isDefaultUnlocked: true },
  { id: 'bd_2', category: 'border', name: '네온 사이버 테두리', preview: '🌀', description: '화려하게 회전하는 네온 블루 테두리', price: 25000, currency: 'points', isDefaultUnlocked: false },
  { id: 'bd_3', category: 'border', name: '불꽃 오라 프레임', preview: '🔥', description: '패기 넘치는 붉은 불꽃 프로필 링', price: 3, currency: 'tickets', isDefaultUnlocked: false },

  // Entrance Effects
  { id: 'ent_1', category: 'entrance', name: '번개 폭발 입장', preview: '🌩️', description: '경기장 진입 시 강렬한 번개가 내리칩니다.', price: 20000, currency: 'points', isDefaultUnlocked: true },
  { id: 'ent_2', category: 'entrance', name: '우주 차원문', preview: '🌌', description: '신비로운 웜홀 공간에서 등장하는 연출', price: 35000, currency: 'points', isDefaultUnlocked: false },
  { id: 'ent_3', category: 'entrance', name: '레드 카펫 화려한 등장', preview: '🎪', description: '화려한 스포트라이트와 레드카펫 입장', price: 4, currency: 'tickets', isDefaultUnlocked: false },

  // Victory Effects
  { id: 'vic_1', category: 'victory', name: '황금 코인 비', preview: '💰', description: '승리 시 금빛 코인이 쏟아지는 축하 연출', price: 25000, currency: 'points', isDefaultUnlocked: true },
  { id: 'vic_2', category: 'victory', name: '화려한 폭죽 쇼', preview: '🎆', description: '화면 전체를 채우는 팡파르 폭죽 피날레', price: 40000, currency: 'points', isDefaultUnlocked: false },
  { id: 'vic_3', category: 'victory', name: '승리의 천사 날개', preview: '🪽', description: '빛나는 성스러운 날개와 찬가 이펙트', price: 5, currency: 'tickets', isDefaultUnlocked: false },

  // Nickname Colors
  { id: 'nc_1', category: 'nickname_color', name: '황금빛 챔피언 옐로우', preview: '🟨', description: '닉네임을 매력적인 황금색으로 변경', price: 10000, currency: 'points', isDefaultUnlocked: true },
  { id: 'nc_2', category: 'nickname_color', name: '네온 핑크 라이트', preview: '🟥', description: '주변의 시선을 사로잡는 마젠타 핑크', price: 20000, currency: 'points', isDefaultUnlocked: false },
  { id: 'nc_3', category: 'nickname_color', name: '사이버 펑크 시안', preview: '🟦', description: '차가운 미래 도시 느낌의 시안 블루', price: 2, currency: 'tickets', isDefaultUnlocked: false },

  // Emoticons
  { id: 'em_1', category: 'emoticon', name: 'VIP 도발 이모티콘 팩', preview: '😎', description: '대전 도중 상대에게 보낼 수 있는 표정 패키지', price: 15000, currency: 'points', isDefaultUnlocked: true },
  { id: 'em_2', category: 'emoticon', name: '매너 굿게임 스티커', preview: '🤝', description: '서로 존중하는 훈훈한 굿게임 메시지 패키지', price: 10000, currency: 'points', isDefaultUnlocked: false },
  { id: 'em_3', category: 'emoticon', name: '멘탈 흔들기 다이내믹 패키지', preview: '🤪', description: '재치 있는 코믹 리액션 이모티콘 8종', price: 3, currency: 'tickets', isDefaultUnlocked: false },
];

export const AvatarPage: React.FC = () => {
  const { goBack, user, equipAvatar } = useGame();
  const [serverAvatars, setServerAvatars] = useState<Avatar[]>([]);
  const [activeTab, setActiveTab] = useState<CosmeticCategory>('character');
  const [equippedItems, setEquippedItems] = useState<Record<CosmeticCategory, string>>({
    character: user.avatar || '👑',
    border: user.equippedBorder || '골드 크라운 프레임',
    entrance: user.equippedEntrance || '번개 폭발 입장',
    victory: user.equippedVictory || '황금 코인 비',
    nickname_color: user.equippedNicknameColor || '황금빛 챔피언 옐로우',
    emoticon: user.equippedEmote || 'VIP 도발 이모티콘 팩',
  });

  const [unlockedIds, setUnlockedIds] = useState<string[]>(user.ownedCosmetics || []);

  useEffect(() => {
    shopService
      .getAvatars()
      .then((avatars) => {
        setServerAvatars(avatars);
        setUnlockedIds((current) => [
          ...new Set([...current, ...avatars.filter((avatar) => avatar.isUnlocked).map((avatar) => avatar.id)]),
        ]);
      })
      .catch(() => setServerAvatars([]));
  }, []);

  const handleEquip = (item: CosmeticItemData) => {
    setEquippedItems((prev) => ({
      ...prev,
      [item.category]: item.name,
    }));

    if (item.category === 'character') {
      equipAvatar(item.id, item.preview);
    }
  };

  const handleUnlock = async (item: CosmeticItemData) => {
    if (item.category !== 'character') {
      alert('이 꾸미기 항목은 아직 서버 상점에 연결되지 않았습니다.');
      return;
    }
    if (user.points < item.price && item.currency === 'points') {
      alert('포인트가 부족합니다! 충전소에서 포인트 보상을 무료로 받으실 수 있습니다.');
      return;
    }
    const avatar = serverAvatars.find((candidate) => candidate.id === item.id);
    if (!avatar) return;
    const outcome = await shopService.purchaseAvatar(avatar);
    if (outcome.status !== 'success') {
      alert(outcome.message);
      return;
    }
    setUnlockedIds((prev) => [...new Set([...prev, item.id])]);
    setEquippedItems((prev) => ({
      ...prev,
      [item.category]: item.name,
    }));
    if (item.category === 'character') {
      equipAvatar(item.id, item.preview);
    }
  };

  const avatarCatalog: CosmeticItemData[] = serverAvatars.map((avatar) => ({
    id: avatar.id,
    category: 'character',
    name: avatar.name,
    preview: avatar.emoji,
    description: avatar.description,
    price: avatar.price,
    currency: avatar.currency,
    isDefaultUnlocked: avatar.isUnlocked,
  }));
  const filteredItems =
    activeTab === 'character'
      ? avatarCatalog
      : cosmeticCatalog.filter((item) => item.category === activeTab);

  const tabs = [
    { key: 'character', label: '캐릭터', icon: Crown },
    { key: 'border', label: '프로필 테두리', icon: Frame },
    { key: 'entrance', label: '입장 연출', icon: Zap },
    { key: 'victory', label: '승리 연출', icon: Award },
    { key: 'nickname_color', label: '닉네임 색상', icon: Palette },
    { key: 'emoticon', label: '이모티콘', icon: Smile },
  ] as const;

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

        <span className="text-xs font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/50 px-3 py-1 rounded-full flex items-center gap-1.5">
          <span>장착 중:</span>
          <span className="text-sm">{equippedItems.character}</span>
        </span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              아바타 & 커스텀 꾸미기
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">나만의 특별한 연출과 테두리로 대전 상대를 압도해 보세요.</p>
          </div>
        </div>

        {/* Purely Cosmetic Policy Banner */}
        <div className="mt-3 bg-cyan-950/70 border border-cyan-500/30 p-2.5 rounded-2xl flex items-center gap-2 text-[11px] text-cyan-300 font-bold">
          <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>모든 아이템은 순수 꾸미기 요소로, 게임 승패 및 승률에 직접적인 영향을 주지 않습니다.</span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Grid of Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredItems.map((item) => {
          const isUnlocked = unlockedIds.includes(item.id) || item.isDefaultUnlocked;
          const isEquipped = equippedItems[item.category] === item.name;

          return (
            <div
              key={item.id}
              className={`bg-slate-900/90 border rounded-3xl p-4 flex flex-col justify-between transition-all shadow-xl ${
                isEquipped
                  ? 'border-2 border-amber-400 shadow-amber-500/20'
                  : isUnlocked
                  ? 'border-slate-800 hover:border-slate-700'
                  : 'border-slate-800/60 opacity-85'
              }`}
            >
              <div>
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-3xl shadow-inner shrink-0">
                    {item.preview}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm text-white">{item.name}</h3>
                      {isEquipped && (
                        <span className="text-[9px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-md">
                          장착 중
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">{item.description}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                {!isUnlocked && (
                  <span className="font-extrabold text-xs text-amber-400">
                    {item.price.toLocaleString()} {item.currency === 'points' ? 'P' : '티켓'}
                  </span>
                )}

                {isEquipped ? (
                  <span className="text-xs font-black text-amber-400 flex items-center gap-1 ml-auto">
                    <Check className="w-4 h-4 stroke-[3]" /> 사용 중
                  </span>
                ) : isUnlocked ? (
                  <button
                    onClick={() => handleEquip(item)}
                    className="ml-auto px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md active:scale-95 transition-all"
                  >
                    장착하기
                  </button>
                ) : (
                  <button
                    onClick={() => handleUnlock(item)}
                    className="ml-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-extrabold text-xs border border-amber-500/30 flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <Lock className="w-3.5 h-3.5" /> 해금하기
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
