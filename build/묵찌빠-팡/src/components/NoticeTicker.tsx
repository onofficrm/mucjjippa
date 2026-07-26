import React, { useState, useEffect } from 'react';
import { Megaphone, Flame, RefreshCw, Bell, Trophy } from 'lucide-react';

type TickerMode = 'AUTO' | 'RECORD' | 'NOTICE';

interface NoticeItem {
  id: string;
  type: 'record' | 'notice';
  text: string;
}

export const NoticeTicker: React.FC = () => {
  const [mode, setMode] = useState<TickerMode>('AUTO');
  const [currentIndex, setCurrentIndex] = useState(0);

  const items: NoticeItem[] = [
    { id: '1', type: 'record', text: '축하합니다! GemtreeMan님이 12연승을 달성했습니다.' },
    { id: '2', type: 'notice', text: '오늘 밤 9시 슈퍼 토너먼트가 시작됩니다.' },
    { id: '3', type: 'record', text: 'Richard77님이 토너먼트에서 우승했습니다.' },
    { id: '4', type: 'notice', text: '지금 광고를 확인하면 보너스 포인트를 받을 수 있습니다.' },
  ];

  const filteredItems = items.filter((item) => {
    if (mode === 'RECORD') return item.type === 'record';
    if (mode === 'NOTICE') return item.type === 'notice';
    return true; // AUTO
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % filteredItems.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [filteredItems.length]);

  const activeItem = filteredItems[currentIndex % filteredItems.length] || items[0];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 sm:p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shadow-inner">
      {/* Toggle mode pill buttons */}
      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 self-start sm:self-auto">
        <button
          onClick={() => {
            setMode('AUTO');
            setCurrentIndex(0);
          }}
          className={`text-[10px] font-black px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
            mode === 'AUTO'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <RefreshCw className={`w-2.5 h-2.5 ${mode === 'AUTO' ? 'animate-spin' : ''}`} />
          AUTO
        </button>

        <button
          onClick={() => {
            setMode('RECORD');
            setCurrentIndex(0);
          }}
          className={`text-[10px] font-black px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
            mode === 'RECORD'
              ? 'bg-slate-200 text-slate-950 font-black shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-2.5 h-2.5 text-blue-500" />
          게임 기록
        </button>

        <button
          onClick={() => {
            setMode('NOTICE');
            setCurrentIndex(0);
          }}
          className={`text-[10px] font-black px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
            mode === 'NOTICE'
              ? 'bg-amber-400 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bell className="w-2.5 h-2.5 text-amber-700" />
          공지
        </button>
      </div>

      {/* Ticker Display */}
      <div className="flex-1 overflow-hidden relative bg-slate-950/70 border border-slate-800/80 px-3 py-1.5 rounded-xl flex items-center min-h-[34px]">
        {activeItem && (
          <div className="flex items-center gap-2 w-full animate-fadeIn transition-all duration-300">
            {activeItem.type === 'notice' ? (
              <span className="shrink-0 text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Megaphone className="w-3 h-3 text-amber-400" />
                공지
              </span>
            ) : (
              <span className="shrink-0 text-[10px] font-black bg-slate-800 text-slate-100 border border-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Flame className="w-3 h-3 text-red-400" />
                기록
              </span>
            )}

            <span
              className={`text-xs font-bold truncate transition-colors ${
                activeItem.type === 'notice'
                  ? 'text-amber-300 font-extrabold'
                  : 'text-white'
              }`}
            >
              {activeItem.text}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
