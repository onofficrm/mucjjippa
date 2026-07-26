import React from 'react';
import { Coins, Plus } from 'lucide-react';
import { useGame } from '../context/GameContext';

interface PointBadgeProps {
  points: number;
  onClick?: () => void;
  showAddBtn?: boolean;
}

export const PointBadge: React.FC<PointBadgeProps> = ({ points, onClick, showAddBtn = true }) => {
  const { navigateTo } = useGame();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigateTo('point_topup');
    }
  };

  return (
    <div
      onClick={handleClick}
      className="group flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 hover:border-amber-400 rounded-full px-2.5 py-1 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-amber-500/20 active:scale-95"
      id="point-badge"
    >
      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 to-yellow-600 flex items-center justify-center text-slate-950 shadow-inner font-bold text-xs">
        <Coins className="w-3.5 h-3.5 text-slate-950 fill-amber-300" />
      </div>
      <span className="text-xs font-bold text-amber-300 tracking-tight">
        {points.toLocaleString()}
        <span className="text-[10px] text-amber-400/80 ml-0.5">P</span>
      </span>
      {showAddBtn && (
        <div className="w-4 h-4 rounded-full bg-amber-500/20 group-hover:bg-amber-500 text-amber-300 group-hover:text-slate-950 flex items-center justify-center transition-colors ml-0.5">
          <Plus className="w-3 h-3 stroke-[3]" />
        </div>
      )}
    </div>
  );
};
