import React from 'react';
import { Ticket, Plus } from 'lucide-react';
import { useGame } from '../context/GameContext';

interface TicketBadgeProps {
  tickets: number;
  onClick?: () => void;
  showAddBtn?: boolean;
}

export const TicketBadge: React.FC<TicketBadgeProps> = ({ tickets, onClick, showAddBtn = true }) => {
  const { navigateTo } = useGame();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigateTo('item_shop');
    }
  };

  return (
    <div
      onClick={handleClick}
      className="group flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 hover:border-cyan-400 rounded-full px-2.5 py-1 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-cyan-500/20 active:scale-95"
      id="ticket-badge"
    >
      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-300 to-blue-600 flex items-center justify-center text-slate-950 shadow-inner font-bold text-xs">
        <Ticket className="w-3.5 h-3.5 text-cyan-950 fill-cyan-200" />
      </div>
      <span className="text-xs font-bold text-cyan-300 tracking-tight">
        {tickets}
        <span className="text-[10px] text-cyan-400/80 ml-0.5">장</span>
      </span>
      {showAddBtn && (
        <div className="w-4 h-4 rounded-full bg-cyan-500/20 group-hover:bg-cyan-500 text-cyan-300 group-hover:text-slate-950 flex items-center justify-center transition-colors ml-0.5">
          <Plus className="w-3 h-3 stroke-[3]" />
        </div>
      )}
    </div>
  );
};
