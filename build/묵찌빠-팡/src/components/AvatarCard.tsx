import React from 'react';
import { Lock, Check } from 'lucide-react';
import { AvatarItem } from '../types';
import { useGame } from '../context/GameContext';

interface AvatarCardProps {
  avatar: AvatarItem;
}

export const AvatarCard: React.FC<AvatarCardProps> = ({ avatar }) => {
  const { user, equipAvatar, buyShopItem } = useGame();

  const isEquipped = user.avatar === avatar.emoji;

  const handleAction = () => {
    if (avatar.isUnlocked || avatar.price === 0) {
      equipAvatar(avatar.id, avatar.emoji);
    } else {
      // Prompt buy
      buyShopItem({
        id: avatar.id,
        name: avatar.name,
        description: avatar.description,
        icon: avatar.emoji,
        price: avatar.price,
        currency: avatar.currency,
        type: 'emoji',
      });
    }
  };

  return (
    <div
      onClick={handleAction}
      className={`relative overflow-hidden rounded-3xl p-4 bg-slate-900/90 border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
        isEquipped
          ? 'border-cyan-400 ring-2 ring-cyan-400/50 bg-slate-900'
          : avatar.borderColor
          ? `${avatar.borderColor} hover:border-cyan-400`
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Top Header Badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
            avatar.category === 'legendary'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : avatar.category === 'rare'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
          }`}
        >
          {avatar.category}
        </span>

        {isEquipped && (
          <span className="flex items-center gap-0.5 text-[10px] font-black bg-cyan-500 text-slate-950 px-2 py-0.5 rounded-full shadow">
            <Check className="w-3 h-3 stroke-[3]" /> 장착 중
          </span>
        )}
      </div>

      {/* Avatar Emoji Box */}
      <div className="my-3 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform">
          {avatar.emoji}
        </div>
        <h4 className="font-extrabold text-sm text-slate-100 mt-2 text-center">{avatar.name}</h4>
        <p className="text-[11px] text-slate-400 text-center mt-1 line-clamp-2">{avatar.description}</p>
      </div>

      {/* Footer Action Button */}
      <div className="mt-2 pt-2 border-t border-slate-800/80">
        {isEquipped ? (
          <button className="w-full py-1.5 text-xs font-extrabold text-cyan-400 bg-cyan-950/60 border border-cyan-500/40 rounded-xl">
            사용 중
          </button>
        ) : avatar.isUnlocked || avatar.price === 0 ? (
          <button className="w-full py-1.5 text-xs font-extrabold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl shadow-md transition-colors">
            장착하기
          </button>
        ) : (
          <button className="w-full py-1.5 text-xs font-extrabold text-amber-300 bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 rounded-xl flex items-center justify-center gap-1 transition-colors">
            <Lock className="w-3 h-3 text-amber-400" />
            {avatar.price.toLocaleString()} {avatar.currency === 'points' ? 'P' : '장'} 해금
          </button>
        )}
      </div>
    </div>
  );
};
