import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowLeft, Lock, Check } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { shopService } from '../services/shopService';
import type { Title } from '../types';

export const TitlePage: React.FC = () => {
  const { goBack, user, equipTitle } = useGame();
  const [titles, setTitles] = useState<Title[]>([]);

  useEffect(() => {
    shopService.getTitles().then(setTitles).catch(() => setTitles([]));
  }, []);

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

        <span className="text-xs font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
          장착 중: {user.title}
        </span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          보유 칭호 및 도전과제
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">업적 달성으로 얻은 명예로운 칭호를 선택해 보세요.</p>
      </div>

      {/* Title List */}
      <div className="space-y-2.5">
        {titles.map((t) => {
          const isEquipped = user.title === t.name;

          return (
            <div
              key={t.id}
              className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                isEquipped
                  ? 'bg-slate-900 border-2 border-amber-400/80 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-black px-2.5 py-1 rounded-full bg-gradient-to-r ${t.tagColor}`}
                >
                  {t.name}
                </span>

                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-300">{t.requirement}</span>
                  <span className="text-[10px] text-slate-500">
                    {t.isUnlocked ? '해금 완료' : '미달성'}
                  </span>
                </div>
              </div>

              {isEquipped ? (
                <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                  <Check className="w-4 h-4" /> 장착 중
                </span>
              ) : t.isUnlocked ? (
                <button
                  onClick={() => equipTitle(t.id, t.name)}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs"
                >
                  장착
                </button>
              ) : (
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> 잠김
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
