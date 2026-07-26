import React from 'react';
import { useGame } from '../context/GameContext';

export const LoadingOverlay: React.FC = () => {
  const { loadingOverlay } = useGame();

  if (!loadingOverlay) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in text-center">
      <div className="relative w-24 h-24 flex items-center justify-center mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 border-r-purple-500 animate-spin" />
        <div className="text-4xl animate-bounce">
          ✊
        </div>
      </div>

      <h3 className="text-xl font-black text-white">{loadingOverlay.message}</h3>
      {loadingOverlay.subMessage && (
        <p className="text-xs text-cyan-400 font-semibold mt-2 animate-pulse">
          {loadingOverlay.subMessage}
        </p>
      )}
    </div>
  );
};
