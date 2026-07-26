import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useGame } from '../context/GameContext';

export const SoundToggle: React.FC = () => {
  const { soundMuted, toggleSound } = useGame();

  return (
    <button
      onClick={toggleSound}
      className={`p-2 rounded-full border transition-all duration-200 active:scale-90 ${
        soundMuted
          ? 'bg-slate-900/80 border-slate-700 text-slate-500 hover:text-slate-300'
          : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-400 shadow-sm shadow-cyan-500/30'
      }`}
      title={soundMuted ? '음소거 해제' : '음소거'}
      id="sound-toggle-btn"
    >
      {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
    </button>
  );
};
