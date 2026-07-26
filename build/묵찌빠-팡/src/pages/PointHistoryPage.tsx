import React, { useState } from 'react';
import { Coins, ArrowLeft, ArrowUpRight, ArrowDownRight, Tag } from 'lucide-react';
import { useGame } from '../context/GameContext';

type LogCategoryFilter = 'all' | 'match' | 'tournament' | 'ad' | 'shop' | 'admin';

export const PointHistoryPage: React.FC = () => {
  const { goBack, user, pointLogs } = useGame();
  const [filter, setFilter] = useState<LogCategoryFilter>('all');

  const filteredLogs = pointLogs.filter((log) => {
    if (filter === 'all') return true;
    if (filter === 'ad' && log.category === 'charge') return true;
    return log.category === filter;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'match':
        return <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded text-[10px] font-bold">대전</span>;
      case 'tournament':
        return <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded text-[10px] font-bold">토너먼트</span>;
      case 'ad':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-bold">광고 보상</span>;
      case 'shop':
        return <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded text-[10px] font-bold">아이템</span>;
      case 'admin':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-bold">운영 보상</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">무료 충전</span>;
    }
  };

  const filterButtons: { key: LogCategoryFilter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'match', label: '대전' },
    { key: 'tournament', label: '토너먼트' },
    { key: 'ad', label: '광고 보상' },
    { key: 'shop', label: '아이템' },
    { key: 'admin', label: '운영 보상' },
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

        <span className="text-xs font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
          현재 잔액: {user.points.toLocaleString()} P
        </span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-400" />
          포인트 이용 로그 및 내역
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">날짜, 구분, 획득, 사용, 상세 내용 및 잔액 거래 기록</p>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
              filter === btn.key
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Logs Table / Cards */}
      <div className="space-y-2.5">
        {filteredLogs.map((log) => {
          const isGain = log.type === 'earn';
          return (
            <div
              key={log.id}
              className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black shrink-0 ${
                    isGain
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {isGain ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    {getCategoryBadge(log.category)}
                    <span className="font-extrabold text-white text-sm">{log.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">일시: {log.date}</span>
                </div>
              </div>

              {/* Amounts & Balance Breakdown */}
              <div className="flex items-center justify-between sm:flex-col sm:items-end border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400">
                    {isGain ? '획득:' : '사용:'}
                  </span>
                  <span
                    className={`font-black text-sm ${
                      isGain ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isGain ? `+${log.amount.toLocaleString()}` : log.amount.toLocaleString()}{' '}
                    {log.currency === 'tickets' ? '장' : 'P'}
                  </span>
                </div>

                <span className="text-[10px] text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 mt-0.5">
                  거래 후 잔액:{' '}
                  {log.balance.toLocaleString()} {log.currency === 'tickets' ? '장' : 'P'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
